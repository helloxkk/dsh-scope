/**
 * UsageHeatmap — sidebar footer action: a GitHub-style 53-week token-usage
 * contribution grid fed by the host half's `/api/dsh-scope/days` endpoint.
 * Clicking a day pins a detail card (four token buckets, cache hit rate,
 * session count, model ranking). Differences from the single-month
 * alternatives: the full rolling year reads at a glance, colors ride the
 * harness theme aliases (light/dark both correct), and the discrete
 * five-level scale keeps neighbor days comparable.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

const DAYS_PATH = '/api/dsh-scope/days'
const WEEKS = 53
const MS_DAY = 86_400_000

/** fmt for summary chips. */
function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Local `YYYY-MM-DD` for a Date. */
function keyOf(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Parse `YYYY-MM-DD` into a local Date at midnight. */
function dateOf(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Build the 53-week grid: columns of 7 days (Mon..Sun), ending on the week
 * that contains today. Cells outside the range stay null.
 */
function buildGrid(byKey, today) {
  const endOfWeek = new Date(today)
  endOfWeek.setDate(endOfWeek.getDate() + ((7 - ((endOfWeek.getDay() + 6) % 7) - 1) % 7 + 1) - 1)
  // Align: last column's Sunday.
  const lastSunday = new Date(today)
  lastSunday.setDate(lastSunday.getDate() + (7 - ((lastSunday.getDay() + 6) % 7 + 1) + 7) % 7)
  const columns = []
  let max = 0
  for (let w = WEEKS - 1; w >= 0; w -= 1) {
    const col = []
    for (let d = 0; d < 7; d += 1) {
      const day = new Date(lastSunday)
      day.setDate(lastSunday.getDate() - w * 7 - (6 - d))
      const future = day > today
      if (future) { col.push(null); continue }
      const entry = byKey.get(keyOf(day))
      const tokens = entry?.tokens ?? 0
      if (tokens > max) max = tokens
      col.push({ key: keyOf(day), day, tokens, entry })
    }
    columns.push(col)
  }
  return { columns, max }
}

/** Discrete level 0–4 for a token count against the window max. */
function levelOf(tokens, max) {
  if (tokens <= 0) return 0
  if (max <= 0) return 1
  const ratio = tokens / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

/** Month labels: one per column where the month changes inside the grid. */
function monthMarks(columns, locale) {
  const marks = []
  let seen = -1
  columns.forEach((col, i) => {
    const first = col.find((cell) => cell !== null)
    if (first === undefined) return
    const m = first.day.getMonth()
    if (m !== seen) {
      if (i > 0 || m !== new Date().getMonth()) {
        marks.push({ col: i, label: first.day.toLocaleDateString(locale, { month: 'short' }) })
      }
      seen = m
    }
  })
  return marks
}

/**
 * Sidebar footer entry: icon when the sidebar is a rail, label row when wide;
 * opens the heatmap popover.
 * @param props - `wide` from the sidebar shell + `t` from the slot runtime.
 */
export function UsageHeatmap({ wide, t }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)      // { generatedAt, days: [...] }
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open || data !== null || error !== null) return
    let alive = true
    fetch(DAYS_PATH, { headers: { accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((body) => { if (alive && body?.ok) setData(body); else if (alive) throw new Error(body?.error ?? 'bad payload') })
      .catch((e) => { if (alive) setError(String(e)) })
    return () => { alive = false }
  }, [open, data, error])

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => { document.removeEventListener('pointerdown', close) }
  }, [open])

  const refresh = () => { setData(null); setError(null); setSelected(null) }

  const byKey = useMemo(() => {
    const map = new Map()
    if (data?.days) for (const day of data.days) map.set(day.date, day)
    return map
  }, [data])

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [data])

  const grid = useMemo(() => buildGrid(byKey, today), [byKey, today])
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en'
  const marks = useMemo(() => monthMarks(grid.columns, locale), [grid, locale])

  // Summary chips over the same window.
  const summary = useMemo(() => {
    if (!data?.days) return null
    const t0 = today.getTime()
    const sumFrom = (ms) => {
      let tokens = 0
      for (const day of data.days) {
        if (dateOf(day.date).getTime() >= t0 - ms) tokens += day.tokens
      }
      return tokens
    }
    const total = data.days.reduce((acc, day) => acc + day.tokens, 0)
    return { today: byKey.get(keyOf(today))?.tokens ?? 0, w1: sumFrom(7 * MS_DAY), y1: sumFrom(365 * MS_DAY), total }
  }, [data, byKey, today])

  const sel = selected !== null ? byKey.get(selected) : undefined

  return (
    <div className="dcl-heatwrap" ref={rootRef}>
      <button
        type="button"
        className={wide ? 'dcl-heatbadge' : 'dcl-heatbadge dcl-heatbadge-rail'}
        data-open={open || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setOpen((v) => !v) }}
        title={t('heat.title')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="2" width="3" height="3" rx="1" className="dcl-cell-l2" />
          <rect x="6" y="2" width="3" height="3" rx="1" className="dcl-cell-l0" />
          <rect x="11" y="2" width="3" height="3" rx="1" className="dcl-cell-l3" />
          <rect x="1" y="7" width="3" height="3" rx="1" className="dcl-cell-l0" />
          <rect x="6" y="7" width="3" height="3" rx="1" className="dcl-cell-l4" />
          <rect x="11" y="7" width="3" height="3" rx="1" className="dcl-cell-l1" />
          <rect x="1" y="12" width="3" height="3" rx="1" className="dcl-cell-l1" />
          <rect x="6" y="12" width="3" height="3" rx="1" className="dcl-cell-l3" />
          <rect x="11" y="12" width="3" height="3" rx="1" className="dcl-cell-l2" />
        </svg>
        {wide && <span className="dcl-heatbadge-label">{t('heat.title')}</span>}
      </button>

      {open && (
        <div className="dcl-heatpanel" role="dialog" aria-label={t('heat.title')}>
          <header className="dcl-head">
            <span className="dcl-title">{t('heat.title')}</span>
            <button type="button" className="dcl-iconbtn" onClick={refresh} aria-label={t('heat.refresh')} title={t('heat.refresh')}>
              <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" className="dcl-refresh">
                <path d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M13.9 1.6v3h-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </header>

          <div className="dcl-heatbody">
            {error !== null && (
              <div className="dcl-heaterror">
                <span>{t('heat.error')}</span>
                <button type="button" className="dcl-retry" onClick={refresh}>{t('heat.retry')}</button>
              </div>
            )}
            {error === null && data === null && <p className="dcl-hint">{t('heat.loading')}</p>}

            {data !== null && (
              <>
                {summary && (
                  <div className="dcl-chips">
                    <Chip label={t('heat.today')} value={fmt(summary.today)} />
                    <Chip label={t('heat.last7')} value={fmt(summary.w1)} />
                    <Chip label={t('heat.year')} value={fmt(summary.y1)} />
                    <Chip label={t('heat.total')} value={fmt(summary.total)} />
                  </div>
                )}

                <div className="dcl-gridscroll">
                  <div className="dcl-monthrow" aria-hidden="true">
                    {marks.map((m) => (
                      <span key={m.col} className="dcl-monthmark" style={{ gridColumnStart: m.col + 2 }}>{m.label}</span>
                    ))}
                  </div>
                  <div className="dcl-gridrows">
                    <div className="dcl-weekdays" aria-hidden="true">
                      <span style={{ gridRow: 2 }}>{t('heat.mon')}</span>
                      <span style={{ gridRow: 4 }}>{t('heat.wed')}</span>
                      <span style={{ gridRow: 6 }}>{t('heat.fri')}</span>
                    </div>
                    <div className="dcl-grid" role="group" aria-label={t('heat.gridLabel')}>
                      {grid.columns.map((col, i) => (
                        <div key={i} className="dcl-gridcol">
                          {col.map((cell, j) => {
                            if (cell === null) return <span key={j} className="dcl-cell dcl-cell-null" />
                            const lvl = levelOf(cell.tokens, grid.max)
                            const isToday = cell.key === keyOf(today)
                            const tip = cell.entry
                              ? t('heat.dayTip', { date: cell.key, tokens: fmt(cell.tokens), n: cell.entry.sessions })
                              : t('heat.dayTipEmpty', { date: cell.key })
                            return (
                              <button
                                key={j}
                                type="button"
                                className={`dcl-cell dcl-cell-l${lvl}`}
                                data-today={isToday || undefined}
                                data-selected={selected === cell.key || undefined}
                                onClick={() => { setSelected((v) => (v === cell.key ? null : cell.key)) }}
                                title={tip}
                                aria-label={tip}
                              />
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dcl-heatlegend">
                  <span className="dcl-legend-label">{t('heat.less')}</span>
                  {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`dcl-cell dcl-cell-l${l}`} />)}
                  <span className="dcl-legend-label">{t('heat.more')}</span>
                </div>

                {sel === undefined && selected !== null && (
                  <p className="dcl-hint">{t('heat.noData', { date: selected })}</p>
                )}

                {sel !== undefined && (
                  <div className="dcl-daydetail">
                    <div className="dcl-rowhead">
                      <span className="dcl-num">{sel.date}</span>
                      <span className="dcl-daydetail-sessions">{t('heat.sessions', { n: sel.sessions })}</span>
                    </div>
                    <div className="dcl-stat"><span className="dcl-stat-label">{t('heat.totalTokens')}</span><span className="dcl-num">{fmt(sel.tokens)}</span></div>
                    <div className="dcl-stat"><span className="dcl-stat-label">{t('lens.input')}</span><span className="dcl-num">{fmt(sel.inputTokens)}</span></div>
                    <div className="dcl-stat"><span className="dcl-stat-label">{t('lens.cacheRead')}</span><span className="dcl-num">{fmt(sel.cacheReadTokens)}</span></div>
                    <div className="dcl-stat"><span className="dcl-stat-label">{t('lens.cacheWrite')}</span><span className="dcl-num">{fmt(sel.cacheWriteTokens)}</span></div>
                    <div className="dcl-stat"><span className="dcl-stat-label">{t('lens.output')}</span><span className="dcl-num">{fmt(sel.outputTokens)}</span></div>
                    {sel.cacheHitRate !== null && sel.cacheHitRate !== undefined && (
                      <div className="dcl-stat"><span className="dcl-stat-label">{t('lens.cacheHit')}</span><span className="dcl-num">{sel.cacheHitRate.toFixed(1)}%</span></div>
                    )}
                    {sel.models.length > 0 && (
                      <div className="dcl-modellist">
                        {sel.models.map((m) => (
                          <div key={m.model} className="dcl-modelrow">
                            <span className="dcl-modelname" title={m.model}>{m.model}</span>
                            <span className="dcl-num">{fmt(m.tokens)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="dcl-footnote">
                  {data.generatedAt !== undefined
                    ? t('heat.updated', { time: new Date(data.generatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) })
                    : ''}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** One summary chip. */
function Chip({ label, value }) {
  return (
    <div className="dcl-chip">
      <span className="dcl-chip-label">{label}</span>
      <span className="dcl-chip-value">{value}</span>
    </div>
  )
}
