/**
 * dsh-scope — pure per-day token-usage aggregation over session event
 * logs. Cordis-free so it stays unit-testable against real logs outside the
 * running harness.
 *
 * Aggregation semantics mirror `dsh-token-meter`'s `tokenUsage` projection:
 * a usage sample rides an `assistant/chunk` (`data.chunk.type === "usage"`)
 * or an `assistant/message` (`data.usage`); a repeated sample for the same
 * (turn, step) REPLACES the earlier value instead of double counting it, and
 * the replacement is re-attributed to the day of the later event.
 *
 * Beyond the totals: each day counts the distinct sessions that produced
 * usage (sessionIds), and keeps per-model buckets so the day detail can show
 * a model ranking. Model attribution follows `assistant/message`'s
 * `data.message.source`, falling back to the last `request/header` config.
 *
 * @module dsh-scope/usage
 */

/** Local-calendar `YYYY-MM-DD` key for a millisecond epoch. */
export function dayKey(timeMs) {
  const date = new Date(timeMs)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Empty token bucket. */
export function zeroBuckets() {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

/** Provider usage → buckets (missing cache fields are absent in some reports). */
export function bucketsOf(usage) {
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    cacheReadTokens: usage.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.cacheWriteTokens ?? 0,
  }
}

/** Total tokens across all buckets. */
export function totalTokens(buckets) {
  return buckets.inputTokens + buckets.outputTokens + buckets.cacheReadTokens + buckets.cacheWriteTokens
}

/** Prompt-side cache hit rate in percent (0–100, one decimal), or null. */
export function cacheHitRate(buckets) {
  const prompt = buckets.inputTokens + buckets.cacheReadTokens + buckets.cacheWriteTokens
  if (prompt <= 0) return null
  return Math.round((buckets.cacheReadTokens / prompt) * 1000) / 10
}

function addInto(target, source) {
  target.inputTokens += source.inputTokens
  target.outputTokens += source.outputTokens
  target.cacheReadTokens += source.cacheReadTokens
  target.cacheWriteTokens += source.cacheWriteTokens
  return target
}

function subtractFrom(target, source) {
  target.inputTokens -= source.inputTokens
  target.outputTokens -= source.outputTokens
  target.cacheReadTokens -= source.cacheReadTokens
  target.cacheWriteTokens -= source.cacheWriteTokens
  return target
}

/** Extract the usage sample an event carries, if any. */
function sampleOf(event) {
  if (event.type === 'assistant/chunk' && event.data?.chunk?.type === 'usage') {
    return { key: `${event.data.turn}:${event.data.step}`, usage: event.data.chunk.usage }
  }
  if (event.type === 'assistant/message' && event.data?.usage !== undefined) {
    return { key: `${event.data.turn}:${event.data.step}`, usage: event.data.usage }
  }
  return undefined
}

/** The `provider/model` attribution key of a usage sample, if known. */
function modelOf(event) {
  const source = event.data?.message?.source
  if (source !== undefined && typeof source.model === 'string') {
    const provider = typeof source.provider === 'string' && source.provider.length > 0 ? source.provider : 'unknown'
    return `${provider}/${source.model}`
  }
  const config = event.data?.header?.config
  if (config !== undefined && typeof config.model === 'string') {
    const provider = typeof config.provider === 'string' && config.provider.length > 0 ? config.provider : 'unknown'
    return `${provider}/${config.model}`
  }
  return undefined
}

/** Day entry: totals, per-model buckets, and the distinct sessions that produced usage. */
function entryOf(byDay, day) {
  let entry = byDay.get(day)
  if (entry === undefined) {
    entry = { totals: zeroBuckets(), models: new Map(), sessionIds: new Set() }
    byDay.set(day, entry)
  }
  return entry
}

/** Drop a day entry whose buckets went fully to zero (post-replacement). */
function pruneIfEmpty(byDay, day) {
  const entry = byDay.get(day)
  if (entry !== undefined && totalTokens(entry.totals) <= 0) byDay.delete(day)
}

/**
 * One session's incremental fold state. `days` holds the already-folded
 * per-day entries; `lastSample`/`currentModel` keep replace-last-sample
 * semantics and model attribution across fold boundaries without replaying
 * the whole log.
 */
export function createUsageState() {
  return { days: new Map(), lastSample: null, currentModel: null, consumed: 0 }
}

/** Reset a state in place (live↔persisted transitions, log rewrites). */
function resetState(state) {
  state.days = new Map()
  state.lastSample = null
  state.currentModel = null
  state.consumed = 0
}

/**
 * Fold a slice of NEW events onto an existing session state (mutating).
 * Replacements for the same (turn, step) subtract the previous sample's
 * buckets from the day/model bucket they were attributed to, so a slice
 * starting mid-step stays exact.
 * @param state - session fold state (mutated in place).
 * @param events - the new events, in seq order, starting after the last fold.
 */
export function applyUsageDelta(state, events) {
  let last = state.lastSample
  let currentModel = state.currentModel
  for (const event of events) {
    if (event.type === 'request/header') {
      const model = modelOf(event)
      if (model !== undefined) currentModel = model
    }
    const sample = sampleOf(event)
    if (sample === undefined) continue
    const buckets = bucketsOf(sample.usage)
    const model = modelOf(event) ?? currentModel ?? 'unknown/unknown'
    const day = dayKey(event.time)
    const entry = entryOf(state.days, day)
    if (last !== null && last.key === sample.key) {
      // Same turn/step re-reported: replace instead of double counting.
      const previous = state.days.get(last.day)
      if (previous !== undefined) {
        subtractFrom(previous.totals, last.buckets)
        const previousModel = previous.models.get(last.model)
        if (previousModel !== undefined) {
          subtractFrom(previousModel, last.buckets)
          if (totalTokens(previousModel) <= 0) previous.models.delete(last.model)
        }
        pruneIfEmpty(state.days, last.day)
      }
    }
    addInto(entry.totals, buckets)
    const modelBuckets = entry.models.get(model) ?? zeroBuckets()
    addInto(modelBuckets, buckets)
    entry.models.set(model, modelBuckets)
    last = { key: sample.key, day, buckets, model }
  }
  state.lastSample = last
  state.currentModel = currentModel
}

/**
 * Merge every session state's days into one byDay map, tagging each entry
 * with the session ids that contributed (for the per-day session count).
 * @param byDay - accumulator Map (day → merged entry), mutated in place.
 * @param days - one session's day map from its fold state.
 * @param sessionId - that session's id.
 */
export function mergeInto(byDay, days, sessionId) {
  for (const [day, entry] of days) {
    const merged = byDay.get(day)
    if (merged === undefined) {
      byDay.set(day, {
        totals: { ...entry.totals },
        models: new Map([...entry.models].map(([model, buckets]) => [model, { ...buckets }])),
        sessionIds: new Set([sessionId]),
      })
    } else {
      addInto(merged.totals, entry.totals)
      for (const [model, buckets] of entry.models) {
        const target = merged.models.get(model) ?? zeroBuckets()
        addInto(target, buckets)
        merged.models.set(model, target)
      }
      merged.sessionIds.add(sessionId)
    }
  }
}

/** Compact wire shape: sorted days with totals, hit rate, session count, models. */
export function renderUsage(byDay, generatedAt) {
  const days = []
  for (const day of [...byDay.keys()].sort()) {
    const entry = byDay.get(day)
    days.push({
      date: day,
      tokens: totalTokens(entry.totals),
      inputTokens: entry.totals.inputTokens,
      outputTokens: entry.totals.outputTokens,
      cacheReadTokens: entry.totals.cacheReadTokens,
      cacheWriteTokens: entry.totals.cacheWriteTokens,
      cacheHitRate: cacheHitRate(entry.totals),
      sessions: entry.sessionIds.size,
      models: [...entry.models.entries()]
        .map(([model, buckets]) => ({ model, tokens: totalTokens(buckets) }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 6),
    })
  }
  return { generatedAt, days }
}
