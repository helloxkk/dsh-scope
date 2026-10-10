/**
 * Derivation helpers for the usage panel: raw day records in, view models out.
 *
 * Kept free of React so the windowing, bucketing and ranking rules stay
 * unit-testable and so the components below are only about presentation.
 *
 * Every helper works on UTC day indices rather than local dates. Usage is
 * bucketed by local day on the host, but the panel only ever compares and
 * labels those keys, so pinning the arithmetic to UTC avoids a class of
 * off-by-one bugs around DST without needing a timezone at all.
 *
 * @module dsh-scope/statsModel
 */

const DAY_MS = 86_400_000

/** A single column of the activity grid spans one Sunday-start week. */
export const WEEKS_IN_GRID = 52
export const DAYS_IN_WEEK = 7

/** Selectable windows, in days. */
export const RANGE_DAYS = { '7d': 7, '30d': 30 }

/** Heatmap aggregations: per-day values, per-week sums, or a running total. */
export const HEATMAP_MODES = ['daily', 'weekly', 'cumulative']

/** UTC day index for a `YYYY-MM-DD` key, or null when unparseable. */
function dayIndexOf(dateKey) {
  const ms = Date.parse(`${dateKey}T00:00:00.000Z`)
  return Number.isNaN(ms) ? null : Math.floor(ms / DAY_MS)
}

/** `YYYY-MM-DD` for a UTC day index. */
function dateKeyOf(dayIndex) {
  return new Date(dayIndex * DAY_MS).toISOString().slice(0, 10)
}

/** Ascending UTC day indices for every record that parses. */
function indicesOf(days) {
  return days.map((day) => dayIndexOf(day.date)).filter((index) => index !== null)
}

/** Map a value onto the five-step colour scale (0 = empty). */
export function levelFor(value, max) {
  if (value <= 0 || max <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)))
}

/** The window `[start, end]` of UTC day indices ending at the newest record. */
function windowOf(days, span) {
  const indices = indicesOf(days)
  if (indices.length === 0) return null
  const end = Math.max(...indices)
  return { end, start: end - span + 1 }
}

/**
 * The rolling activity grid.
 *
 * Columns are Sunday-start weeks, oldest first, and the newest column is
 * padded out to a whole week. Padding matters: without it a fresh install
 * would render a stub of a graph that grows sideways as history accumulates,
 * which reads as a rendering bug rather than as "you are new here". Filling
 * the window with empty cells keeps the layout stable from day one.
 *
 * @param days - day records from the host payload.
 * @returns one entry per column: its cells plus the date its month label anchors to.
 */
export function buildWeeks(days) {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const indices = indicesOf(days)
  if (indices.length === 0) return []

  const end = Math.max(...indices)
  const endWeekStart = end - new Date(end * DAY_MS).getUTCDay()
  const start = endWeekStart - (WEEKS_IN_GRID - 1) * DAYS_IN_WEEK

  return Array.from({ length: WEEKS_IN_GRID }, (_, week) => {
    const cells = Array.from({ length: DAYS_IN_WEEK }, (_, offset) => {
      const date = dateKeyOf(start + week * DAYS_IN_WEEK + offset)
      const entry = byDate.get(date)
      return {
        date,
        tokens: entry?.tokens ?? 0,
        turns: entry?.turns ?? 0,
        tools: entry?.tools ?? 0,
        models: entry?.models ?? [],
      }
    })
    // Anchor the month ruler on the 1st when a week contains it, so labels
    // track calendar months instead of drifting with week boundaries.
    const firstOfMonth = cells.find((cell) => cell.date.endsWith('-01'))
    return { cells, monthDate: firstOfMonth?.date ?? cells[0].date }
  })
}

/**
 * Per-mode heatmap values: the column totals to colour by, whether to fill
 * columns bottom-up, and each cell's own level.
 *
 * Daily colours every cell independently. Weekly and cumulative collapse each
 * column to one value and fill from the bottom, so a column reads as a bar
 * whose height is its magnitude — the grid stays legible when a single week
 * dominates the year.
 */
export function buildHeatmapColumns(weeks, mode) {
  if (weeks.length === 0) return { columns: [], max: 0 }

  const weekly = weeks.map((week) => week.cells.reduce((sum, cell) => sum + cell.tokens, 0))
  let running = 0
  const cumulative = weekly.map((value) => (running += value))
  const perColumn = mode === 'weekly' ? weekly : mode === 'cumulative' ? cumulative : null
  const max = perColumn === null
    ? Math.max(0, ...weeks.flatMap((week) => week.cells.map((cell) => cell.tokens)))
    : Math.max(0, ...perColumn)

  const columns = weeks.map((week, index) => {
    const value = perColumn === null ? 0 : perColumn[index]
    const filled = perColumn === null || value <= 0 || max <= 0
      ? 0
      : Math.min(DAYS_IN_WEEK, Math.max(1, Math.ceil((value / max) * DAYS_IN_WEEK)))
    return {
      key: `w-${index}`,
      monthDate: week.monthDate,
      value,
      tokens: week.cells.reduce((sum, cell) => sum + cell.tokens, 0),
      turns: week.cells.reduce((sum, cell) => sum + cell.turns, 0),
      tools: week.cells.reduce((sum, cell) => sum + cell.tools, 0),
      cells: week.cells.map((cell, row) => ({
        ...cell,
        // Bottom-up fill for the collapsed modes; per-cell level for daily.
        level: perColumn === null
          ? levelFor(cell.tokens, max)
          : row >= DAYS_IN_WEEK - filled ? levelFor(value, max) : 0,
      })),
    }
  })
  return { columns, max }
}

/**
 * Chart rows for the trend line, plus the model series to draw.
 *
 * Only models used inside the window become series: a model that has not run
 * for a month would otherwise add a permanently flat line and a legend entry
 * that says nothing.
 */
export function buildTrend(days, rangeDays) {
  const window = windowOf(days, rangeDays)
  if (window === null) return { rows: [], models: [] }

  const byDate = new Map(days.map((day) => [day.date, day]))
  const totals = new Map()
  const rows = []
  for (let index = window.start; index <= window.end; index += 1) {
    const date = dateKeyOf(index)
    const entry = byDate.get(date)
    for (const model of entry?.models ?? []) {
      totals.set(model.model, (totals.get(model.model) ?? 0) + model.tokens)
    }
    rows.push({ date, entry })
  }

  const models = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([model]) => model)
  const data = rows.map(({ date, entry }) => {
    const row = { date }
    let total = 0
    for (const model of models) {
      const tokens = entry?.models.find((item) => item.model === model)?.tokens ?? 0
      row[model] = tokens
      total += tokens
    }
    row.total = total
    return row
  })
  return { rows: data, models }
}

/** Per-model totals inside the window, ranked, with each slice's share. */
export function buildModelShares(days, rangeDays) {
  const window = windowOf(days, rangeDays)
  if (window === null) return { slices: [], total: 0 }

  const totals = new Map()
  for (const day of days) {
    const index = dayIndexOf(day.date)
    if (index === null || index < window.start || index > window.end) continue
    for (const model of day.models ?? []) {
      totals.set(model.model, (totals.get(model.model) ?? 0) + model.tokens)
    }
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0)
  const slices = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([model, tokens], index) => ({
      model,
      tokens,
      share: total > 0 ? tokens / total : 0,
      color: `var(--dcl-chart-${(index % 6) + 1})`,
    }))
  return { slices, total }
}

/** Month labels for the grid ruler: consecutive columns sharing a month merge. */
export function buildMonthSpans(columns, formatMonth) {
  const spans = []
  for (const column of columns) {
    const label = formatMonth(column.monthDate)
    const last = spans[spans.length - 1]
    if (last !== undefined && last.label === label) last.span += 1
    else spans.push({ key: column.monthDate, label, span: 1 })
  }
  return spans
}
