/**
 * AppUsagePanel — the usage-statistics surface, a 1:1 port of ZCode's
 * 「使用统计 · 应用用量」 page (zai-org/ZCode, Apache-2.0; see NOTICE).
 *
 * Layout, in ZCode's order:
 *   1. lifetime summary strip (tokens / peak / longest session / streaks)
 *   2. Token activity heatmap with daily | weekly | cumulative modes
 *   3. time-range switch (last 7d | last 30d)
 *   4. daily token trend, one line per model
 *   5. model usage donut with a percentage list
 *   6. a refresh button at the bottom right
 *
 * Data comes from this plugin's own host endpoint, which already returns
 * per-day totals plus per-day per-model buckets, so every view derives from
 * one payload with no extra round trips.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  chartColor,
  formatCompactTokens,
  formatDuration,
  formatFullDay,
  formatMonth,
  formatPercent,
  formatShortDay,
  formatSummaryTokens,
} from './statsFormat.js'

const DAYS_PATH = '/api/dsh-scope/days'
const DAY_MS = 86_400_000
/** ZCode shows a fixed 52-week window regardless of the selected range. */
const HEATMAP_WEEKS = 52
const HEATMAP_DAYS = 7
const RANGES = ['7d', '30d']
const MODES = ['daily', 'weekly', 'cumulative']

/** UTC day index for a `YYYY-MM-DD` key, or null when unparseable. */
function dayIndexOf(dateKey) {
  const ms = Date.parse(`${dateKey}T00:00:00.000Z`)
  return Number.isNaN(ms) ? null : Math.floor(ms / DAY_MS)
}

/** `YYYY-MM-DD` for a UTC day index. */
function dateKeyOf(dayIndex) {
  return new Date(dayIndex * DAY_MS).toISOString().slice(0, 10)
}

/** Five-step color bucket for a value against the window max. */
function levelFor(value, max) {
  if (value <= 0 || max <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)))
}

/**
 * Build the 52×7 grid, oldest column first, each column a Sunday-start week.
 * Days without a record are filled as zero cells so the grid never shrinks —
 * the same padding ZCode applies for short histories.
 */
function buildWeeks(days) {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const indices = days.map((day) => dayIndexOf(day.date)).filter((index) => index !== null)
  if (indices.length === 0) return []
  const endIndex = Math.max(...indices)
  // Pad forward to the end of the current week so the newest column is whole.
  const endWeekStart = endIndex - new Date(endIndex * DAY_MS).getUTCDay()
  const startIndex = endWeekStart - (HEATMAP_WEEKS - 1) * HEATMAP_DAYS

  return Array.from({ length: HEATMAP_WEEKS }, (_, week) => {
    const cells = Array.from({ length: HEATMAP_DAYS }, (_, offset) => {
      const index = startIndex + week * HEATMAP_DAYS + offset
      const date = dateKeyOf(index)
      const entry = byDate.get(date)
      return {
        date,
        tokens: entry?.tokens ?? 0,
        turns: entry?.turns ?? 0,
        tools: entry?.tools ?? 0,
        models: entry?.models ?? [],
        sessions: entry?.sessions ?? 0,
      }
    })
    // ZCode anchors a column's month label on the 1st when the week contains
    // it, so the ruler reads as calendar months rather than week starts.
    const firstOfMonth = cells.find((cell) => cell.date.endsWith('-01'))
    return { cells, monthDate: firstOfMonth?.date ?? cells[0].date }
  })
}

/** Rows for the last `rangeDays` days, oldest first, including empty days. */
function buildTrendRows(days, rangeDays) {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const indices = days.map((day) => dayIndexOf(day.date)).filter((index) => index !== null)
  if (indices.length === 0) return { rows: [], models: [] }
  const end = Math.max(...indices)
  const rows = []
  const totals = new Map()
  for (let offset = rangeDays - 1; offset >= 0; offset -= 1) {
    const index = end - offset
    const date = dateKeyOf(index)
    const entry = byDate.get(date)
    // Only models used inside the window appear as series.
    for (const model of entry?.models ?? []) {
      totals.set(model.model, (totals.get(model.model) ?? 0) + model.tokens)
    }
    rows.push({ date, entry })
  }
  const models = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([model]) => model)
  const data = rows.map(({ date, entry }) => {
    const row = { date, label: formatShortDay('en-US', date) }
    let sum = 0
    for (const model of models) {
      const tokens = entry?.models.find((m) => m.model === model)?.tokens ?? 0
      row[model] = tokens
      sum += tokens
    }
    row.total = sum
    return row
  })
  return { rows: data, models }
}

/** Aggregate a window of days into per-model totals for the donut. */
function buildModelTotals(days, rangeDays) {
  const indices = days.map((day) => dayIndexOf(day.date)).filter((index) => index !== null)
  if (indices.length === 0) return { slices: [], total: 0 }
  const end = Math.max(...indices)
  const cutoff = end - rangeDays + 1
  const totals = new Map()
  for (const day of days) {
    const index = dayIndexOf(day.date)
    if (index === null || index < cutoff || index > end) continue
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
      color: chartColor(index),
    }))
  return { slices, total }
}

/** Tooltip body for the trend chart: one row per visible model series. */
function ChartTip({ active, payload, label, locale }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((item) => Number(item.value) > 0)
  if (rows.length === 0) return null
  return (
    <div className="dcl-tip">
      <div className="dcl-tip-label">{label}</div>
      {rows.map((item) => (
        <div className="dcl-tip-row" key={item.dataKey ?? item.name}>
          <span className="dcl-tip-name">
            <span className="dcl-tip-dot" style={{ background: item.color ?? item.stroke }} />
            {item.name}
          </span>
          <span className="dcl-tip-val">{formatCompactTokens(locale, Number(item.value))}</span>
        </div>
      ))}
    </div>
  )
}

export function AppUsagePanel({ t, locale }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [range, setRange] = useState('7d')
  const [mode, setMode] = useState('daily')
  const [hovered, setHovered] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(DAYS_PATH, { headers: { accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((payload) => {
        if (payload?.ok === false) throw new Error(payload.message ?? payload.error ?? 'request failed')
        setData(payload)
        setLoading(false)
      })
      .catch((reason) => {
        setError(String(reason?.message ?? reason))
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  const days = data?.days ?? []
  const summary = data?.summary
  const weeks = useMemo(() => buildWeeks(days), [days])
  const rangeDays = range === '7d' ? 7 : 30
  const trend = useMemo(() => buildTrendRows(days, rangeDays), [days, rangeDays])
  const donut = useMemo(() => buildModelTotals(days, rangeDays), [days, rangeDays])

  // Heatmap values per mode. Weekly sums each column; cumulative runs a
  // total across columns; daily keeps per-cell values (ZCode's semantics).
  const heatmap = useMemo(() => {
    if (weeks.length === 0) return { columns: [], max: 0 }
    const weekly = weeks.map((week) => week.cells.reduce((sum, cell) => sum + cell.tokens, 0))
    let running = 0
    const cumulative = weekly.map((value) => (running += value))
    const values = mode === 'weekly' ? weekly : mode === 'cumulative' ? cumulative : null
    const max = values === null
      ? Math.max(0, ...weeks.flatMap((week) => week.cells.map((cell) => cell.tokens)))
      : Math.max(0, ...values)

    const columns = weeks.map((week, index) => {
      const value = values === null ? 0 : values[index]
      const level = values === null ? 0 : levelFor(value, max)
      // Weekly/cumulative fills the column bottom-up so the bar height reads
      // as magnitude; daily colors each cell on its own value.
      const filledRows = values === null ? 0 : value <= 0 || max <= 0 ? 0 : Math.min(HEATMAP_DAYS, Math.max(1, Math.ceil((value / max) * HEATMAP_DAYS)))
      return {
        key: `w-${index}`,
        monthDate: week.monthDate,
        value,
        level,
        filledRows,
        cells: week.cells.map((cell, rowIndex) => ({
          ...cell,
          level: values === null ? levelFor(cell.tokens, max) : rowIndex >= HEATMAP_DAYS - filledRows ? level : 0,
        })),
      }
    })
    return { columns, max }
  }, [weeks, mode])

  const hasUsage = days.some((day) => day.tokens > 0)

  if (loading && data === null) {
    return (
      <div className="dcl-stats" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SummaryStrip t={t} locale={locale} summary={null} />
        <EmptyState title={t('stats.loadingTitle')} description={t('stats.loadingDescription')} />
      </div>
    )
  }

  return (
    <div className="dcl-stats" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SummaryStrip t={t} locale={locale} summary={summary} />

      {error !== null ? (
        <div className="dcl-heaterror">
          <span>{t('heat.error')}: {error}</span>
          <button type="button" className="dcl-retry" onClick={load}>{t('heat.retry')}</button>
        </div>
      ) : null}

      {hasUsage && heatmap.columns.length > 0 ? (
        <section className="dcl-sectioncard">
          <div className="dcl-sectionhead">
            <div className="dcl-sectiontitle">{t('stats.tokenActivity')}</div>
            <div className="dcl-tabs" role="tablist">
              {MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={mode === option}
                  className="dcl-tab"
                  data-active={mode === option ? '' : undefined}
                  onClick={() => setMode(option)}
                >
                  {t(`stats.mode${option[0].toUpperCase()}${option.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
          <Heatmap t={t} locale={locale} columns={heatmap.columns} mode={mode} hovered={hovered} onHover={setHovered} />
        </section>
      ) : null}

      <div className="dcl-sectionhead">
        <div className="dcl-sectiontitle">{t('stats.rangeTitle')}</div>
        <div className="dcl-tabs" role="tablist">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={range === option}
              className="dcl-tab"
              data-active={range === option ? '' : undefined}
              onClick={() => setRange(option)}
            >
              {t(`stats.range${option}`)}
            </button>
          ))}
        </div>
      </div>

      {!hasUsage ? (
        <EmptyState title={t('stats.emptyTitle')} description={t('stats.emptyDescription')} />
      ) : (
        <>
          <section className="dcl-sectioncard">
            <div className="dcl-sectiontitle">{t('stats.dailyTrend')}</div>
            <TrendChart t={t} locale={locale} rows={trend.rows} models={trend.models} />
          </section>
          <section className="dcl-sectioncard">
            <div className="dcl-sectiontitle">{t('stats.modelUsage')}</div>
            <ModelDonut t={t} locale={locale} slices={donut.slices} total={donut.total} />
          </section>
        </>
      )}

      <div className="dcl-footer">
        <button type="button" className="dcl-refresh" onClick={load} disabled={loading}>
          <RefreshIcon />
          {loading ? t('heat.loading') : t('heat.refresh')}
        </button>
      </div>
    </div>
  )
}

/** Lifetime summary strip: five centered metrics separated by hairlines. */
function SummaryStrip({ t, locale, summary }) {
  const items = [
    { key: 'stats.lifetimeTotal', value: summary ? formatSummaryTokens(locale, summary.totalTokens) : '--' },
    { key: 'stats.lifetimePeak', value: summary ? formatSummaryTokens(locale, summary.peakDayTokens) : '--' },
    { key: 'stats.longestSession', value: summary ? formatDuration(t, summary.longestSessionMs) : '--' },
    { key: 'stats.currentStreak', value: summary ? `${summary.currentStreakDays}${t('stats.day')}` : '--' },
    { key: 'stats.longestStreak', value: summary ? `${summary.longestStreakDays}${t('stats.day')}` : '--' },
  ]
  return (
    <section className="dcl-summary">
      {items.map((item, index) => (
        <div key={item.key} style={{ display: 'contents' }}>
          {index > 0 ? <div className="dcl-summary-div" aria-hidden="true" /> : null}
          <div className="dcl-summary-item">
            <div className="dcl-summary-value" title={item.value}>{item.value}</div>
            <div className="dcl-summary-label" title={t(item.key)}>{t(item.key)}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="dcl-empty">
      <div className="dcl-empty-title">{title}</div>
      <div className="dcl-empty-desc">{description}</div>
    </div>
  )
}

/** 52-week grid. Cells are aspect-square on a 1fr track so the year always fits. */
function Heatmap({ t, locale, columns, mode, hovered, onHover }) {
  const [selected, setSelected] = useState(null)
  const monthRowRef = useRef(null)

  // One month label per month, spanning the columns it covers.
  const months = useMemo(() => {
    const out = []
    for (const column of columns) {
      const label = formatMonth(locale, column.monthDate)
      const last = out[out.length - 1]
      if (last !== undefined && last.label === label) last.span += 1
      else out.push({ key: column.monthDate, label, span: 1 })
    }
    // Leading partial month reads better as a blank than a clipped label.
    return out
  }, [columns, locale])

  const tooltip = (column, cell) => {
    if (mode !== 'daily') {
      const id = mode === 'weekly' ? 'stats.heatmapWeeklyCell' : 'stats.heatmapCumulativeCell'
      return t(id, {
        date: formatFullDay(locale, column.monthDate),
        tokens: formatCompactTokens(locale, column.value),
        turns: formatCompactTokens(locale, column.turns),
        tools: formatCompactTokens(locale, column.tools),
      })
    }
    return t('stats.heatmapCell', {
      date: formatFullDay(locale, cell.date),
      tokens: formatCompactTokens(locale, cell.tokens),
      turns: formatCompactTokens(locale, cell.turns),
      tools: formatCompactTokens(locale, cell.tools),
    })
  }

  return (
    <div className="dcl-hm">
      <div
        className="dcl-hm-months"
        ref={monthRowRef}
        style={{ gridTemplateColumns: `repeat(${columns.length},minmax(0,1fr))` }}
      >
        {months.map((month) => (
          <div key={month.key} className="dcl-hm-month" style={{ gridColumn: `span ${month.span}` }}>
            {month.span >= 2 ? month.label : ''}
          </div>
        ))}
      </div>
      <div className="dcl-hm-body">
        <div className="dcl-hm-days" aria-hidden="true">
          <span className="dcl-hm-day">{t('heat.mon')}</span>
          <span className="dcl-hm-day">{t('heat.wed')}</span>
          <span className="dcl-hm-day">{t('heat.fri')}</span>
        </div>
        <div
          className="dcl-hm-cols"
          style={{ gridTemplateColumns: `repeat(${columns.length},minmax(0,1fr))` }}
          role="img"
          aria-label={t('heat.gridLabel')}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className="dcl-hm-col"
              onMouseEnter={() => onHover(column.key)}
              onMouseLeave={() => onHover(null)}
            >
              {column.cells.map((cell) => (
                <button
                  key={cell.date}
                  type="button"
                  className={`dcl-hm-cell dcl-hm-l${cell.level}`}
                  data-has-usage={cell.tokens > 0 ? '' : undefined}
                  data-selected={selected === cell.date ? '' : undefined}
                  title={tooltip(column, cell)}
                  onClick={() => setSelected(selected === cell.date ? null : cell.date)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Daily token trend: one line per model, with a wrapping legend. */
function TrendChart({ t, locale, rows, models }) {
  if (rows.length === 0 || models.length === 0) {
    return <EmptyState title={t('stats.emptyTitle')} description={t('stats.emptyDescription')} />
  }
  const label = (date) => formatShortDay(locale, date)
  const data = rows.map((row) => ({ ...row, label: label(row.date) }))
  // Keep the axis readable on a 30-day window the way ZCode does.
  const interval = data.length <= 14 ? 0 : data.length > 45 ? 6 : 4
  return (
    <>
      <div className="dcl-legend">
        {models.map((model, index) => (
          <span className="dcl-legend-item" key={model}>
            <span className="dcl-legend-dot" style={{ background: chartColor(index) }} />
            <span className="dcl-legend-text" title={model}>{model}</span>
          </span>
        ))}
      </div>
      <div className="dcl-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 10, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={interval} minTickGap={4} />
            <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value) => formatCompactTokens(locale, value)} />
            <Tooltip content={<ChartTip locale={locale} t={t} />} />
            {models.map((model, index) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                name={model}
                stroke={chartColor(index)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

/** Model usage donut with a percentage list beside it. */
function ModelDonut({ t, locale, slices, total }) {
  if (total <= 0 || slices.length === 0) {
    return <EmptyState title={t('stats.emptyTitle')} description={t('stats.emptyDescription')} />
  }
  return (
    <div className="dcl-donut">
      <div className="dcl-donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="tokens"
              nameKey="model"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="var(--dsw-alias-bg-base)"
              strokeWidth={2}
            >
              {slices.map((slice) => (
                <Cell key={slice.model} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const slice = payload[0].payload
                return (
                  <div className="dcl-tip">
                    <div className="dcl-tip-row">
                      <span className="dcl-tip-name">
                        <span className="dcl-tip-dot" style={{ background: slice.color }} />
                        {slice.model}
                      </span>
                      <span className="dcl-tip-val">
                        {formatCompactTokens(locale, slice.tokens)} · {formatPercent(locale, slice.share)}
                      </span>
                    </div>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="dcl-donut-center">
          <div className="dcl-donut-total" title={formatCompactTokens(locale, total)}>
            {formatCompactTokens(locale, total)}
          </div>
          <div className="dcl-donut-unit">{t('stats.tokenUnit')}</div>
        </div>
      </div>
      <div className="dcl-modellist2" role="list">
        {slices.map((slice) => (
          <div className="dcl-modelitem" key={slice.model} role="listitem">
            <span className="dcl-modelitem-dot" style={{ background: slice.color }} />
            <span className="dcl-modelitem-name" title={slice.model}>{slice.model}</span>
            <span className="dcl-modelitem-pct">{formatPercent(locale, slice.share)}</span>
            <span className="dcl-modelitem-tokens">
              {formatCompactTokens(locale, slice.tokens)} {t('stats.tokenUnit')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}
