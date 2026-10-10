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
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  HEATMAP_MODES,
  RANGE_DAYS,
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

/** Fetch the aggregated payload once per open panel; `load` re-runs it. */
function useUsageData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    return (
      <div className="dcl-stats">
        <SummaryStrip t={t} locale={locale} summary={null} />
        <EmptyState title={t('stats.loadingTitle')} description={t('stats.loadingDescription')} />
      </div>
    )
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
    >
      <RefreshIcon />
      {loading ? t('heat.loading') : t('heat.refresh')}
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
          <LineChart data={data} margin={{ top: 6, right: 14, left: 0, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={interval} minTickGap={6} tickMargin={6} />
            <YAxis tickLine={false} axisLine={false} width={44} tickMargin={4} tickFormatter={(value) => formatCompactTokens(locale, value)} />
            <Tooltip content={<TrendTip locale={locale} />} cursor={{ stroke: 'var(--dsw-alias-border-l1)' }} />
            {models.map((model, index) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                name={model}
                stroke={`var(--dcl-chart-${(index % 6) + 1})`}
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
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="var(--dsw-alias-bg-base)"
              strokeWidth={2}
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
