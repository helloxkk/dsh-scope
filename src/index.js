/**
 * dsh-scope — host half.
 *
 * Registers one read-only, loopback-only endpoint on the web server:
 *   GET /api/dsh-scope/days — per-day token usage across every session
 *
 * The browser half consumes it for the GitHub-style usage heatmap. Usage
 * aggregation is INCREMENTAL: per-session fold state is cached in memory and
 * persisted to `<DSH_HOME>/storages/dsh-scope-cache.json`; each request
 * folds only the events added since the last fold (live sessions fold their
 * in-memory tail; persisted sessions read the delta through the storage
 * backend's opaque revision when available). Steady-state cost stays
 * O(new events) no matter how large the logs grow.
 *
 * @module dsh-scope
 */

import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { applyUsageDelta, createUsageState, mergeInto, renderUsage } from './usage.js'

/** Stable Cordis plugin name. */
export const name = 'dsh-scope'

/** Services required before this plugin activates. */
export const inject = ['webServer', 'sessions', 'sessionPersistence']

const DAYS_PATH = '/api/dsh-scope/days'
const CACHE_VERSION = 1

// ---------------------------------------------------------------- wire utils

/** Write a JSON response. */
function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(value))
}

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

function isLoopbackAddress(address) {
  return typeof address === 'string' && LOOPBACK_ADDRESSES.has(address)
}

function isLoopbackHostHeader(req) {
  const host = req.headers?.host
  if (typeof host !== 'string') return false
  const bare = host.replace(/:\d+$/, '').toLowerCase()
  return LOOPBACK_HOSTNAMES.has(bare)
}

/**
 * Refuse non-loopback callers and non-GET methods before any work. The exact
 * routes bypass the connection plugin's RPC trust fence, so each handler
 * applies its own loopback fence.
 */
function rejectForeignCaller(req, res) {
  if (req.method !== 'GET') {
    json(res, 405, { ok: false, error: 'method-not-allowed' })
    return true
  }
  if (isLoopbackAddress(req.socket?.remoteAddress) && isLoopbackHostHeader(req)) return false
  json(res, 403, { ok: false, error: 'forbidden' })
  return true
}

// -------------------------------------------------------- incremental cache

/** Cache file location under the dsh home. */
function cachePath() {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  return join(home, 'storages', 'dsh-scope-cache.json')
}

let loadedCache = null
let loadPromise = null
let inflight = null

function serializeDayMap(days) {
  const out = {}
  for (const [day, entry] of days) {
    out[day] = {
      totals: entry.totals,
      models: [...entry.models.entries()],
      turns: entry.turns ?? 0,
      tools: entry.tools ?? 0,
    }
  }
  return out
}

function parseDayMap(raw) {
  const days = new Map()
  if (raw === null || typeof raw !== 'object') return days
  for (const [day, entry] of Object.entries(raw)) {
    if (entry === null || typeof entry !== 'object') continue
    days.set(day, {
      totals: {
        inputTokens: entry.totals?.inputTokens ?? 0,
        outputTokens: entry.totals?.outputTokens ?? 0,
        cacheReadTokens: entry.totals?.cacheReadTokens ?? 0,
        cacheWriteTokens: entry.totals?.cacheWriteTokens ?? 0,
      },
      models: new Map(Array.isArray(entry.models) ? entry.models : []),
      turns: typeof entry.turns === 'number' ? entry.turns : 0,
      tools: typeof entry.tools === 'number' ? entry.tools : 0,
    })
  }
  return days
}

function serializeSession(state) {
  return {
    kind: state.kind,
    revision: state.revision,
    consumed: state.consumed,
    lastSeq: state.lastSeq,
    startMs: state.startMs,
    endMs: state.endMs,
    days: serializeDayMap(state.days),
    lastSample: state.lastSample,
    currentModel: state.currentModel,
  }
}

function parseSession(entry) {
  if (entry === null || typeof entry !== 'object') return createUsageState()
  const state = createUsageState()
  state.kind = entry.kind
  state.revision = entry.revision
  state.consumed = typeof entry.consumed === 'number' ? entry.consumed : 0
  if (typeof entry.lastSeq === 'number') state.lastSeq = entry.lastSeq
  if (typeof entry.startMs === 'number') state.startMs = entry.startMs
  if (typeof entry.endMs === 'number') state.endMs = entry.endMs
  state.days = parseDayMap(entry.days)
  state.lastSample = entry.lastSample ?? null
  state.currentModel = entry.currentModel ?? null
  return state
}

/** Load the cache once per process; any corruption degrades to a fresh cache. */
async function loadCache() {
  if (loadedCache !== null) return loadedCache
  loadPromise ??= (async () => {
    const fresh = { version: CACHE_VERSION, sessions: {} }
    try {
      const parsed = JSON.parse(await readFile(cachePath(), 'utf8'))
      if (parsed?.version === CACHE_VERSION && typeof parsed.sessions === 'object' && parsed.sessions !== null) {
        const sessions = {}
        for (const [id, entry] of Object.entries(parsed.sessions)) {
          if (typeof id === 'string' && id.length > 0) sessions[id] = parseSession(entry)
        }
        return { version: CACHE_VERSION, sessions }
      }
    } catch {
      /* first run or corrupt cache */
    }
    return fresh
  })()
  loadedCache = await loadPromise
  return loadedCache
}

/** Persist the cache atomically (temp + rename); failures are logged, never fatal. */
async function saveCache(ctx, cache) {
  try {
    const path = cachePath()
    await mkdir(dirname(path), { recursive: true })
    const serialized = { version: CACHE_VERSION, sessions: {} }
    for (const [id, state] of Object.entries(cache.sessions)) serialized.sessions[id] = serializeSession(state)
    const tmp = `${path}.tmp`
    await writeFile(tmp, JSON.stringify(serialized), 'utf8')
    await rename(tmp, path)
  } catch (error) {
    ctx.logger.warn(`dsh-scope: saving usage cache failed: ${String(error)}`)
  }
}

/** Single-flight guard: concurrent requests share one aggregation run. */
function withLock(run) {
  if (inflight !== null) return inflight
  inflight = run().finally(() => { inflight = null })
  return inflight
}

// --------------------------------------------------------- log read adapter

/** Number of events in a slice (the fold's cursor advances by this much). */
function countEvents(events) {
  return Array.isArray(events) ? events.length : 0
}

/** The `seq` of the last event in a slice, or undefined when it carries none. */
function lastSeqOf(events) {
  if (!Array.isArray(events) || events.length === 0) return undefined
  const seq = events[events.length - 1]?.seq
  return typeof seq === 'number' ? seq : undefined
}

/**
 * Read persisted session events from array offset `from`, across the two
 * persistence shapes dsh has shipped:
 *
 *   - `0.2.x`: `open(id, 'read')` yields a handle whose `read(offset, length)`
 *     returns `{ events, eventState }`, sliced by event index. The handle also
 *     enforces monotonicity itself: it throws when the stored log shrank below
 *     a prefix this handle already observed.
 *   - older builds: `readFrom(id, fromSeq)`, sliced by event seq.
 *
 * The caller decides whether the returned slice is a delta or a rewrite by
 * comparing `seq` values, so an empty slice stays a normal no-op.
 *
 * @param persistence - the `sessionPersistence` service.
 * @param id - session id.
 * @param from - events already folded, as an index (0.2.x) or seq (legacy).
 * @returns the events from `from` onward.
 */
async function readPersistedEvents(persistence, id, from) {
  if (typeof persistence.readFrom === 'function') {
    // Legacy seq-based backend: readFrom is inclusive of `from`.
    const { events } = await persistence.readFrom(id, from)
    return events ?? []
  }
  if (typeof persistence.open !== 'function') {
    throw new Error('sessionPersistence exposes neither open() nor readFrom()')
  }
  // One fresh handle per read: a long-lived handle would pin a log revision
  // and turn every later rewrite into a hard error instead of a refold.
  const handle = await persistence.open(id, 'read')
  try {
    const { events } = await handle.read(from)
    return events ?? []
  } finally {
    await handle.close?.()
  }
}

// ------------------------------------------------------------- aggregation

/** Reset a fold state in place. */
function resetFold(state) {
  state.days = new Map()
  state.lastSample = null
  state.currentModel = null
  state.consumed = 0
  state.lastSeq = null
}

/**
 * Collect per-day usage across live and persisted sessions, incrementally.
 *
 * Live sessions fold only the in-memory events added since the last fold.
 * Persisted sessions skip aggregation when the backend's opaque revision is
 * unchanged; when it changes, the delta must be contiguous with the last
 * folded seq — a gap or a rewrite triggers a full refold. Sessions that
 * vanished are dropped; a session switching between live/persisted is
 * refolded from scratch to stay exact.
 */
export async function collectUsage(ctx) {
  return withLock(async () => {
    const cache = await loadCache()
    let dirty = false
    const live = ctx.get('sessions')
    const attached = new Set()
    if (live !== undefined) {
      for (const session of live.list()) {
        attached.add(session.id)
        const state = cache.sessions[session.id] ?? createUsageState()
        if (state.kind !== 'live') { resetFold(state); dirty = true }
        const liveEvents = Array.isArray(session.events) ? session.events : []
        const count = liveEvents.length
        if ((state.consumed ?? 0) < count) {
          applyUsageDelta(state, liveEvents.slice(state.consumed ?? 0))
          state.consumed = count
          dirty = true
        }
        state.kind = 'live'
        delete state.revision
        cache.sessions[session.id] = state
      }
    }
    const persistence = ctx.get('sessionPersistence')
    const persistedIds = new Set()
    if (persistence !== undefined) {
      // Both shapes end up as a list of `{ header, revision }` snapshots:
      // `listSnapshots()` on backends that expose it, `list()` on 0.2.x where
      // list() itself already returns snapshots rather than bare headers.
      let snapshots = null
      if (typeof persistence.listSnapshots === 'function') {
        try {
          snapshots = await persistence.listSnapshots()
        } catch (error) {
          ctx.logger.warn(`dsh-scope: listSnapshots failed, falling back to list(): ${String(error)}`)
        }
      }
      if (snapshots === null) {
        const listed = await persistence.list()
        // Tolerate a backend whose list() returns bare headers.
        snapshots = listed
          .map((entry) => (entry !== null && typeof entry === 'object' && entry.header !== undefined
            ? entry
            : { header: entry, revision: undefined }))
          .filter((entry) => entry.header !== null && typeof entry.header === 'object' && typeof entry.header.id === 'string')
      }
      const metas = snapshots.map((entry) => entry.header)
      const revisionOf = new Map()
      for (const entry of snapshots) revisionOf.set(entry.header.id, entry.revision)
      for (const meta of metas) {
        persistedIds.add(meta.id)
        if (attached.has(meta.id)) continue
        const state = cache.sessions[meta.id] ?? createUsageState()
        const revision = revisionOf.get(meta.id)
        // Read when the fold kind changed, the backend's opaque revision moved,
        // or no revision is exposed at all (fall back to delta probing).
        const changed = state.kind !== 'persisted' || revision === undefined || revision !== state.revision
        if (changed) {
          try {
            const wasPersisted = state.kind === 'persisted'
            const from = wasPersisted ? (state.consumed ?? 0) : 0
            const events = await readPersistedEvents(persistence, meta.id, from)
            if (!wasPersisted) resetFold(state)
            // No new events is the normal unchanged case — a no-op, NOT a
            // rewrite signal. A gap (first fresh seq past the last folded
            // seq + 1) means the log was truncated or rewritten: refold all.
            const first = events[0]
            const expected = state.lastSeq === undefined ? undefined : state.lastSeq + 1
            const contiguous = first === undefined || expected === undefined || first.seq === expected
            if (!contiguous && (state.consumed ?? 0) > 0) {
              // Log truncated or rewritten: refold the whole log.
              const allEvents = await readPersistedEvents(persistence, meta.id, 0)
              resetFold(state)
              applyUsageDelta(state, allEvents)
              state.consumed = countEvents(allEvents)
              state.lastSeq = lastSeqOf(allEvents)
            } else if (events.length > 0) {
              applyUsageDelta(state, events)
              state.consumed = from + countEvents(events)
              state.lastSeq = lastSeqOf(events) ?? state.lastSeq
            }
            state.kind = 'persisted'
            if (revision !== undefined) state.revision = revision
            else delete state.revision
            dirty = true
          } catch (error) {
            ctx.logger.warn(`dsh-scope: reading persisted session "${meta.id}" failed: ${String(error)}`)
          }
        }
        cache.sessions[meta.id] = state
      }
    }
    for (const id of Object.keys(cache.sessions)) {
      if (!attached.has(id) && !persistedIds.has(id)) {
        delete cache.sessions[id]
        dirty = true
      }
    }
    const byDay = new Map()
    const sessionSpans = []
    for (const [id, state] of Object.entries(cache.sessions)) {
      mergeInto(byDay, state.days, id)
      if (typeof state.startMs === 'number') {
        sessionSpans.push({ id, startMs: state.startMs, endMs: state.endMs ?? state.startMs })
      }
    }
    if (dirty) await saveCache(ctx, cache)
    return renderUsage(byDay, Date.now(), sessionSpans)
  })
}

// ------------------------------------------------------------------- apply

/**
 * Host plugin body: register the loopback-fenced usage endpoint.
 * No Config export: this plugin takes no configuration (the ~standard /
 * schemastery schema machinery stays out of the picture entirely).
 * @param ctx - host root context.
 */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: DAYS_PATH,
    handler: (req, res) => {
      if (rejectForeignCaller(req, res)) return
      collectUsage(ctx)
        .then((result) => { json(res, 200, { ok: true, ...result }) })
        .catch((error) => {
          ctx.logger.warn(`dsh-scope: usage aggregation failed: ${String(error)}`)
          json(res, 500, { ok: false, error: 'internal', message: error instanceof Error ? error.message : String(error) })
        })
    },
  }), 'dsh-scope: days route')
}
