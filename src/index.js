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
    })
  }
  return days
}

function serializeSession(state) {
  return {
    kind: state.kind,
    revision: state.revision,
    consumed: state.consumed,
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

// ------------------------------------------------------------- aggregation

/** Reset a fold state in place. */
function resetFold(state) {
  state.days = new Map()
  state.lastSample = null
  state.currentModel = null
  state.consumed = 0
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
    const live = ctx.get('sessions')
    const attached = new Set()
    if (live !== undefined) {
      for (const session of live.list()) {
        attached.add(session.id)
        const state = cache.sessions[session.id] ?? createUsageState()
        if (state.kind !== 'live') resetFold(state)
        const count = session.events.length
        if ((state.consumed ?? 0) < count) {
          applyUsageDelta(state, session.events.slice(state.consumed ?? 0))
          state.consumed = count
        }
        state.kind = 'live'
        delete state.revision
        cache.sessions[session.id] = state
      }
    }
    const persistence = ctx.get('sessionPersistence')
    const persistedIds = new Set()
    if (persistence !== undefined) {
      let snapshots = null
      if (typeof persistence.listSnapshots === 'function') {
        try {
          snapshots = await persistence.listSnapshots()
        } catch (error) {
          ctx.logger.warn(`dsh-scope: listSnapshots failed, falling back to list(): ${String(error)}`)
        }
      }
      const metas = snapshots !== null ? snapshots.map((entry) => entry.header) : await persistence.list()
      const revisionOf = new Map()
      if (snapshots !== null) for (const entry of snapshots) revisionOf.set(entry.header.id, entry.revision)
      for (const meta of metas) {
        persistedIds.add(meta.id)
        if (attached.has(meta.id)) continue
        const state = cache.sessions[meta.id] ?? createUsageState()
        const revision = revisionOf.get(meta.id)
        const changed = state.kind !== 'persisted' || (revision !== undefined && revision !== state.revision) || revision === undefined
        if (changed) {
          try {
            const wasPersisted = state.kind === 'persisted'
            const fromSeq = wasPersisted ? state.consumed : 0
            const { events } = await persistence.readFrom(meta.id, fromSeq)
            if (!wasPersisted) resetFold(state)
            const fresh = wasPersisted ? events.filter((event) => event.seq > (state.consumed ?? 0)) : events
            const contiguous = fresh.length === 0 ? state.consumed === 0 : fresh[0].seq === state.consumed + 1
            if (!contiguous && state.consumed > 0) {
              // Log truncated or rewritten: refold the whole log.
              resetFold(state)
              const { events: allEvents } = await persistence.readFrom(meta.id, 0)
              applyUsageDelta(state, allEvents)
              state.consumed = allEvents.length > 0 ? allEvents[allEvents.length - 1].seq : 0
            } else if (fresh.length > 0) {
              applyUsageDelta(state, fresh)
              state.consumed = fresh[fresh.length - 1].seq
            }
            state.kind = 'persisted'
            if (revision !== undefined) state.revision = revision
            else delete state.revision
          } catch (error) {
            ctx.logger.warn(`dsh-scope: reading persisted session "${meta.id}" failed: ${String(error)}`)
          }
        }
        cache.sessions[meta.id] = state
      }
    }
    for (const id of Object.keys(cache.sessions)) {
      if (!attached.has(id) && !persistedIds.has(id)) delete cache.sessions[id]
    }
    const byDay = new Map()
    for (const [id, state] of Object.entries(cache.sessions)) mergeInto(byDay, state.days, id)
    await saveCache(ctx, cache)
    return renderUsage(byDay, Date.now())
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
