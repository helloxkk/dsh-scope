/**
 * AppUsagePanel — the usage-statistics surface.
 *
 * Reads one payload from the host half and renders, in order:
 *   1. a lifetime summary strip
 *   2. the rolling activity grid, in daily / weekly / cumulative modes
 *   3. the window switch that drives the two charts below
 *   4. a per-model daily trend
 *   5. per-model shares as a donut with a ranked list
 *
 * All derivation lives in `statsModel.js`; this file is presentation plus the
 * single fetch. The refresh control is reported upward so the panel header
 * can host it beside the title.
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
  DAYS_IN_WEEK,
  HEATMAP_MODES,
  RANGE_DAYS,
  WEEKS_IN_GRID,
  buildHeatmapColumns,
  buildModelShares,
  buildMonthSpans,
  buildTrend,
  buildWeeks,
} from './statsModel.js'
import {
  formatCompactTokens,
  formatDuration,
  formatFullDay,
  formatMonth,
  formatPercent,
  formatShortDay,
  formatSummaryTokens,
} from './statsFormat.js'

const DAYS_PATH = '/api/dsh-scope/days'
const RANGES = Object.keys(RANGE_DAYS)
/**
 * A refresh against the fold cache often resolves in ~20ms, which would make
 * the spinner flash for a single frame and read as "nothing happened". Hold
 * the busy state for at least this long so the feedback is perceptible — and
 * because the request is already done, the wait costs the user nothing.
 */
const MIN_BUSY_MS = 450

/**
 * Last successful payload, kept for the life of the page.
 *
 * The panel unmounts when it closes, so without this every reopen would replay
 * the loading state and the panel would grow from a stub into its full height
 * — a visible jump on every open. With the cache, only the very first open has
 * to show a placeholder; later opens paint real content immediately and refresh
 * behind it.
 */
let lastPayload = null

/** Fetch the aggregated payload once per open panel; `load` re-runs it. */
function useUsageData() {
  const [data, setData] = useState(lastPayload)
  const [loading, setLoading] = useState(lastPayload === null)
  const [error, setError] = useState(null)
  // Guards against a slow first response overwriting a newer one.
  const requestRef = useRef(0)

  const load = useCallback(() => {
    const request = ++requestRef.current
    const startedAt = Date.now()
    setLoading(true)
    setError(null)

    // Hold the busy state to the floor before applying the outcome.
    const settle = (apply) => {
      const remaining = Math.max(0, MIN_BUSY_MS - (Date.now() - startedAt))
      setTimeout(() => {
        if (request !== requestRef.current) return
        apply()
        setLoading(false)
      }, remaining)
    }

    fetch(DAYS_PATH, { headers: { accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((payload) => {
        if (payload?.ok === false) throw new Error(payload.message ?? payload.error ?? 'request failed')
        settle(() => {
          lastPayload = payload
          setData(payload)
        })
      })
      .catch((reason) => {
        settle(() => setError(String(reason?.message ?? reason)))
      })
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, load }
}

/**
 * @param props - `t` and `locale` from the slot runtime, plus `onRefreshState`
 *   which reports `{ loading, refresh }` so the header can render the control.
 */
export function AppUsagePanel({ t, locale, onRefreshState }) {
  const { data, loading, error, load } = useUsageData()
  const [range, setRange] = useState('7d')
  const [mode, setMode] = useState('daily')

  useEffect(() => {
    onRefreshState?.({ loading, refresh: load })
  }, [onRefreshState, loading, load])

  const days = data?.days ?? []
  const summary = data?.summary
  const rangeDays = RANGE_DAYS[range]

  const weeks = useMemo(() => buildWeeks(days), [days])
  const grid = useMemo(() => buildHeatmapColumns(weeks, mode), [weeks, mode])
  const months = useMemo(() => buildMonthSpans(grid.columns, (date) => formatMonth(locale, date)), [grid.columns, locale])
  const trend = useMemo(() => buildTrend(days, rangeDays), [days, rangeDays])
  const donut = useMemo(() => buildModelShares(days, rangeDays), [days, rangeDays])
  const hasUsage = days.some((day) => day.tokens > 0)

  if (loading && data === null) {
    return <PanelSkeleton t={t} />
  }

  return (
    <div className="dcl-stats">
      <SummaryStrip t={t} locale={locale} summary={summary} />

      {error !== null ? (
        <div className="dcl-heaterror">
          <span>{t('heat.error')}: {error}</span>
          <button type="button" className="dcl-retry" onClick={load}>{t('heat.retry')}</button>
        </div>
      ) : null}

      {hasUsage && grid.columns.length > 0 ? (
        <section className="dcl-card">
          <SectionHead
            title={t('stats.tokenActivity')}
            options={HEATMAP_MODES}
            value={mode}
            onChange={setMode}
            labelOf={(option) => t(`stats.mode${option[0].toUpperCase()}${option.slice(1)}`)}
          />
          <ActivityGrid t={t} locale={locale} columns={grid.columns} months={months} mode={mode} />
        </section>
      ) : null}

      <div className="dcl-card-head">
        <div className="dcl-card-title">{t('stats.rangeTitle')}</div>
        <Tabs
          options={RANGES}
          value={range}
          onChange={setRange}
          labelOf={(option) => t(`stats.range${option}`)}
        />
      </div>

      {!hasUsage ? (
        <EmptyState title={t('stats.emptyTitle')} description={t('stats.emptyDescription')} />
      ) : (
        <>
          <section className="dcl-card">
            <div className="dcl-card-title">{t('stats.dailyTrend')}</div>
            <TrendChart t={t} locale={locale} rows={trend.rows} models={trend.models} />
          </section>
          <section className="dcl-card">
            <div className="dcl-card-title">{t('stats.modelUsage')}</div>
            <ModelDonut t={t} locale={locale} slices={donut.slices} total={donut.total} />
          </section>
        </>
      )}
    </div>
  )
}

/** Header refresh control; the panel header owns its placement. */
export function RefreshButton({ t, loading, onClick }) {
  return (
    <button
      type="button"
      className="dcl-refresh dcl-refresh-head"
      onClick={onClick}
      disabled={loading}
      title={t('heat.refresh')}
      aria-label={t('heat.refresh')}
      // The label never changes on click — the spinning icon is the whole
      // progress signal, so the button keeps its width and the row stays put.
      aria-busy={loading || undefined}
    >
      <RefreshIcon />
      {t('heat.refresh')}
    </button>
  )
}

/** Segmented control used for both the mode and range switches. */
function Tabs({ options, value, onChange, labelOf }) {
  return (
    <div className="dcl-tabs" role="tablist">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          className="dcl-tab"
          data-active={value === option ? '' : undefined}
          onClick={() => onChange(option)}
        >
          {labelOf(option)}
        </button>
      ))}
    </div>
  )
}

/** Section title with an optional trailing control. */
function SectionHead({ title, options, value, onChange, labelOf }) {
  return (
    <div className="dcl-card-head">
      <div className="dcl-card-title">{title}</div>
      {options ? <Tabs options={options} value={value} onChange={onChange} labelOf={labelOf} /> : null}
    </div>
  )
}

/** Five lifetime metrics separated by hairlines. */
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
        <div key={item.key} className="dcl-summary-cell">
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

/**
 * Placeholder shown only on the very first open, before any payload exists.
 *
 * It mirrors the loaded layout block for block and reuses the same layout
 * classes, so the panel opens at its final size and the content later fills in
 * place. A shorter stub here would make the panel grow the moment data landed
 * — the jump this exists to prevent.
 */
function PanelSkeleton({ t }) {
  const columns = `repeat(${WEEKS_IN_GRID},minmax(0,1fr))`
  return (
    <div className="dcl-stats" aria-busy="true" aria-live="polite">
      <section className="dcl-summary">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="dcl-summary-cell">
            {index > 0 ? <div className="dcl-summary-div" aria-hidden="true" /> : null}
            <div className="dcl-summary-item">
              <div className="dcl-skel dcl-skel-summary-value" />
              <div className="dcl-skel dcl-skel-summary-label" />
            </div>
          </div>
        ))}
      </section>

      <section className="dcl-card">
        <div className="dcl-card-head">
          <div className="dcl-card-title">{t('stats.tokenActivity')}</div>
          <div className="dcl-skel dcl-skel-tabs" />
        </div>
        {/* A real grid of empty cells: its height is then exactly the height
            the loaded grid will take, at whatever width the panel has. */}
        <div className="dcl-hm">
          <div className="dcl-hm-months" style={{ gridTemplateColumns: columns }} />
          <div className="dcl-hm-body">
            <div className="dcl-hm-days" aria-hidden="true" />
            <div className="dcl-hm-cols" style={{ gridTemplateColumns: columns }}>
              {Array.from({ length: WEEKS_IN_GRID }, (_, column) => (
                <div className="dcl-hm-col" key={column}>
                  {Array.from({ length: DAYS_IN_WEEK }, (_, row) => (
                    <div className="dcl-hm-cell dcl-hm-l0" key={row} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="dcl-card-head">
        <div className="dcl-card-title">{t('stats.rangeTitle')}</div>
        <div className="dcl-skel dcl-skel-tabs" />
      </div>

      <section className="dcl-card">
        <div className="dcl-card-title">{t('stats.dailyTrend')}</div>
        <div className="dcl-legend">
          <div className="dcl-skel dcl-skel-legend" />
        </div>
        <div className="dcl-chart">
          <div className="dcl-skel dcl-skel-fill" />
        </div>
      </section>

      <section className="dcl-card">
        <div className="dcl-card-title">{t('stats.modelUsage')}</div>
        <div className="dcl-donut">
          <div className="dcl-donut-wrap">
            <div className="dcl-skel-ring" />
          </div>
          <div className="dcl-skel dcl-skel-list" />
        </div>
      </section>
    </div>
  )
}

/**
 * The activity grid. Cells are square and share the row width, so the whole
 * window always fits without a second horizontal scrollbar inside the popover.
 */
function ActivityGrid({ t, locale, columns, months, mode }) {
  const [selected, setSelected] = useState(null)

  const cellTitle = (column, cell) => {
    if (mode !== 'daily') {
      return t(mode === 'weekly' ? 'stats.heatmapWeeklyCell' : 'stats.heatmapCumulativeCell', {
        date: formatFullDay(locale, column.monthDate),
        tokens: formatCompactTokens(locale, column.tokens),
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
      <div className="dcl-hm-months" style={{ gridTemplateColumns: `repeat(${columns.length},minmax(0,1fr))` }}>
        {months.map((month) => (
          <div key={month.key} className="dcl-hm-month" style={{ gridColumn: `span ${month.span}` }}>
            {/* A single-column month has no room for a label, and a partial
                edge month is withheld when its name repeats at the far end. */}
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
            <div key={column.key} className="dcl-hm-col">
              {column.cells.map((cell) => (
                <button
                  key={cell.date}
                  type="button"
                  className={`dcl-hm-cell dcl-hm-l${cell.level}`}
                  data-has-usage={cell.tokens > 0 ? '' : undefined}
                  data-selected={selected === cell.date ? '' : undefined}
                  title={cellTitle(column, cell)}
                  aria-label={cellTitle(column, cell)}
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

/** Tooltip body for the trend chart: one row per model with a non-zero value. */
function TrendTip({ active, payload, label, locale }) {
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

/** Daily token trend, one line per model, with a legend that wraps. */
function TrendChart({ t, locale, rows, models }) {
  if (rows.length === 0 || models.length === 0) {
    return <EmptyState title={t('stats.emptyTitle')} description={t('stats.emptyDescription')} />
  }
  const data = rows.map((row) => ({ ...row, label: formatShortDay(locale, row.date) }))
  // Thin the axis labels as the window grows so they never collide.
  const interval = data.length <= 14 ? 0 : data.length > 45 ? 6 : 4

  return (
    <>
      <div className="dcl-legend">
        {models.map((model, index) => (
          <span className="dcl-legend-item" key={model}>
            <span className="dcl-legend-dot" style={{ background: `var(--dcl-chart-${(index % 6) + 1})` }} />
            <span className="dcl-legend-text" title={model}>{model}</span>
          </span>
        ))}
      </div>
      <div className="dcl-chart">
        <ResponsiveContainer width="100%" height="100%">
          {/* Right margin leaves room for the last x-label and the end of the
              line; the y-axis gets a real width so its labels never clip. */}
          <LineChart data={data} margin={{ top: 6, right: 16, left: 0, bottom: 2 }}>
            {/* Horizontal rules only, and few of them: vertical lines would
                fence every day and compete with the data. */}
            <CartesianGrid strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={interval}
              minTickGap={8}
              tickMargin={7}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={42}
              tickMargin={4}
              tickCount={4}
              tickFormatter={(value) => (value === 0 ? '0' : formatCompactTokens(locale, value))}
            />
            <Tooltip
              content={<TrendTip locale={locale} />}
              cursor={{ stroke: 'var(--dsw-alias-border-l1)', strokeDasharray: '2 3' }}
            />
            {models.map((model, index) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                name={model}
                stroke={`var(--dcl-chart-${(index % 6) + 1})`}
                strokeWidth={2}
                strokeLinecap="round"
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

/** Share donut with the window total in the middle and a ranked list beside it. */
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
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={slices.length > 1 ? 1.5 : 0}
              stroke="var(--dsw-alias-fill-l1,var(--dsw-alias-bg-base))"
              strokeWidth={2}
              /* Start at 12 o'clock: a share chart should begin where the eye
                 expects the first slice, not at 3 o'clock. */
              startAngle={90}
              endAngle={-270}
            >
              {slices.map((slice) => <Cell key={slice.model} fill={slice.color} />)}
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
