/**
 * UsageHeatmap — sidebar footer action.
 *
 * The trigger (badge when the sidebar is wide, icon on the rail) opens the
 * usage-statistics panel ported from ZCode; see `AppUsagePanel`. The panel
 * owns its own data loading, range/mode state, and refresh.
 */
import { useEffect, useRef, useState } from 'react'
import { AppUsagePanel, RefreshButton } from './AppUsagePanel.jsx'

/**
 * @param props - `wide` from the sidebar shell + `t` from the slot runtime.
 */
export function UsageHeatmap({ wide, t }) {
  const [open, setOpen] = useState(false)
  // The panel reports its refresh control up so the header can host it.
  const [refresh, setRefresh] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => { document.removeEventListener('pointerdown', close) }
  }, [open])

  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en'

  return (
    <div className="dcl-heatwrap" ref={rootRef}>
      <button
        type="button"
        className={wide ? 'dcl-heatbadge' : 'dcl-heatbadge dcl-heatbadge-rail'}
        data-open={open || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setOpen((v) => !v) }}
        title={t('stats.title')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1" y="2" width="3" height="3" rx="1" className="dcl-hm-l2" />
          <rect x="6" y="2" width="3" height="3" rx="1" className="dcl-hm-l0" />
          <rect x="11" y="2" width="3" height="3" rx="1" className="dcl-hm-l3" />
          <rect x="1" y="7" width="3" height="3" rx="1" className="dcl-hm-l0" />
          <rect x="6" y="7" width="3" height="3" rx="1" className="dcl-hm-l4" />
          <rect x="11" y="7" width="3" height="3" rx="1" className="dcl-hm-l1" />
          <rect x="1" y="12" width="3" height="3" rx="1" className="dcl-hm-l1" />
          <rect x="6" y="12" width="3" height="3" rx="1" className="dcl-hm-l3" />
          <rect x="11" y="12" width="3" height="3" rx="1" className="dcl-hm-l2" />
        </svg>
        {wide && <span className="dcl-heatbadge-label">{t('stats.title')}</span>}
      </button>

      {open && (
        <div className="dcl-heatpanel" role="dialog" aria-label={t('stats.title')}>
          <header className="dcl-head">
            <span className="dcl-title">{t('stats.title')}</span>
            {refresh !== null ? (
              <RefreshButton t={t} loading={refresh.loading} onClick={refresh.refresh} />
            ) : null}
          </header>
          <div className="dcl-heatbody">
            <AppUsagePanel t={t} locale={locale} onRefreshState={setRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
