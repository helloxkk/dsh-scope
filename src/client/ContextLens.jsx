/**
 * ContextLens — session-header entry that visualizes the official token-meter
 * projections for the current session: window occupancy with a segmented
 * system/tools/messages bar, per-bucket session totals, and the KV-cache hit
 * rate. Targets Codex's `/context` visibility: know what fills the window
 * before compaction decides for you.
 */
import { useEffect, useRef, useState } from 'react'

/** fmt: 58123 → "58.1K", 1234567 → "1.23M". */
function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** pct for a filled ratio row; keeps 0 when the part is empty. */
function pct(part, total) {
  if (!total || part <= 0) return 0
  return Math.max(1, Math.round((100 * part) / total))
}

/**
 * The header trigger + popover panel.
 * @param props - session standard kit (sessionId, useProjection) + locale.
 */
export function ContextLens({ useProjection, t }) {
  const usage = useProjection('tokenUsage')
  const pressure = useProjection('contextPressure')
  const breakdown = useProjection('contextBreakdown')
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const hasData = usage !== undefined || pressure !== undefined || breakdown !== undefined

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => { document.removeEventListener('pointerdown', close) }
  }, [open])

  // Occupancy math: pressure (input-side) is the window-occupancy figure;
  // projected adds the pending response estimate — never sum them.
  const window_ = pressure?.contextWindow
  const used = pressure?.pressureTokens
  const usedPct = window_ && used !== undefined ? Math.min(100, (100 * used) / window_) : undefined

  // Composition (heuristic): system + tools + messages ≈ the next request.
  const sys = breakdown?.systemTokens ?? 0
  const tools = breakdown?.toolsTokens ?? 0
  const msgs = breakdown?.messageTokens ?? 0
  const compTotal = sys + tools + msgs

  // Session totals (provider-reported, whole durable log).
  const inTok = usage?.uncachedInputTokens ?? 0
  const crTok = usage?.cacheReadTokens ?? 0
  const cwTok = usage?.cacheWriteTokens ?? 0
  const outTok = usage?.outputTokens ?? 0
  // Same formula as the heatmap's day detail (usage.js cacheHitRate): hits
  // over the whole prompt side — uncached input + cache read + cache write —
  // so both views agree on the number for the same underlying data.
  const promptTok = inTok + crTok + cwTok
  const hit = promptTok > 0 ? (100 * crTok) / promptTok : undefined

  const triggerLabel = usedPct !== undefined ? `${Math.round(usedPct)}%` : t('lens.title')

  return (
    <div className="dcl-wrap" ref={rootRef}>
      <button
        type="button"
        className="dcl-trigger"
        data-open={open || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setOpen((v) => !v) }}
        title={t('lens.title')}
      >
        <Ring value={usedPct} />
        <span className="dcl-trigger-text">{triggerLabel}</span>
      </button>

      {open && (
        <div className="dcl-panel" role="dialog" aria-label={t('lens.title')}>
          <header className="dcl-head">
            <span className="dcl-title">{t('lens.title')}</span>
          </header>

          {!hasData && <p className="dcl-hint">{t('lens.empty')}</p>}
          {hasData && usage === undefined && <p className="dcl-hint">{t('lens.absent')}</p>}

          {hasData && (
            <div className="dcl-body">
              {window_ !== undefined && used !== undefined && (
                <section className="dcl-section">
                  <div className="dcl-rowhead">
                    <span>{t('lens.window')}</span>
                    <span className="dcl-num">
                      {t('lens.windowOf', { used: fmt(used), total: fmt(window_) })}
                    </span>
                  </div>
                  <div className="dcl-track" role="img" aria-label={`${Math.round(usedPct)}%`}>
                    <span className="dcl-seg dcl-seg-system" style={{ width: `${pct(sys, window_)}%` }} />
                    <span className="dcl-seg dcl-seg-tools" style={{ width: `${pct(tools, window_)}%` }} />
                    <span className="dcl-seg dcl-seg-messages" style={{ width: `${pct(msgs, window_)}%` }} />
                  </div>
                </section>
              )}

              {compTotal > 0 && (
                <section className="dcl-section">
                  <div className="dcl-rowhead"><span>{t('lens.composition')}</span></div>
                  <CompRow label={t('lens.system')} dot="dcl-dot-system" value={sys} total={compTotal} />
                  <CompRow label={t('lens.tools')} dot="dcl-dot-tools" value={tools} total={compTotal} />
                  <CompRow label={t('lens.messages')} dot="dcl-dot-messages" value={msgs} total={compTotal} />
                  <p className="dcl-footnote">{t('lens.approx')}</p>
                </section>
              )}

              {usage !== undefined && (
                <section className="dcl-section">
                  <div className="dcl-rowhead"><span>{t('lens.sessionTotal')}</span></div>
                  <div className="dcl-stat"><span className="dcl-stat-label">{t('lens.input')}</span><span className="dcl-num">{fmt(inTok)}</span></div>
                  <div className="dcl-stat"><span className="dcl-stat-label">{t('lens.cacheRead')}</span><span className="dcl-num">{fmt(crTok)}</span></div>
                  <div className="dcl-stat"><span className="dcl-stat-label">{t('lens.cacheWrite')}</span><span className="dcl-num">{fmt(cwTok)}</span></div>
                  <div className="dcl-stat"><span className="dcl-stat-label">{t('lens.output')}</span><span className="dcl-num">{fmt(outTok)}</span></div>
                  {hit !== undefined && (
                    <div className="dcl-hitblock">
                      <div className="dcl-rowhead">
                        <span>{t('lens.cacheHit')}</span>
                        <span className="dcl-num">{hit.toFixed(0)}%</span>
                      </div>
                      <div className="dcl-track">
                        <span className="dcl-seg dcl-seg-hit" style={{ width: `${Math.max(1, Math.round(hit))}%` }} />
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** 12px occupancy ring on the trigger; hollow until pressure is known. */
function Ring({ value }) {
  const r = 5
  const c = 2 * Math.PI * r
  const filled = value === undefined ? 0 : Math.min(1, value / 100)
  return (
    <svg className="dcl-ring" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r={r} className="dcl-ring-bg" />
      {filled > 0 && (
        <circle cx="7" cy="7" r={r} className="dcl-ring-fg"
          strokeDasharray={`${c * filled} ${c}`} strokeLinecap="round"
          transform="rotate(-90 7 7)" />
      )}
    </svg>
  )
}

/** One composition row: color dot + label + share bar + tokens. */
function CompRow({ label, dot, value, total }) {
  return (
    <div className="dcl-comp">
      <span className={`dcl-dot ${dot}`} />
      <span className="dcl-comp-label">{label}</span>
      <div className="dcl-comp-track">
        <span className="dcl-comp-fill" style={{ width: `${pct(value, total)}%` }} />
      </div>
      <span className="dcl-comp-value">{fmt(value)}</span>
      <span className="dcl-comp-pct">{pct(value, total)}%</span>
    </div>
  )
}
