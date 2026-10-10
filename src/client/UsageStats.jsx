/**
 * UsageStats — the sidebar footer action and its panel.
 *
 * The panel header carries the page title, a small pill switcher between the
 * two pages, and the refresh control for whichever page is showing. Each page
 * owns its own loading, state and refresh; it reports the refresh control up
 * so the header can host it in one stable place.
 *
 * This file owns the trigger, outside-click dismissal, and the page switch.
 */
import { useEffect, useRef, useState } from 'react'
import { AppUsagePanel, RefreshButton } from './AppUsagePanel.jsx'
import { BalancePanel } from './BalancePanel.jsx'

/** Pages, in tab order. */
const PAGES = ['usage', 'balance']

/** Reopening returns to the last page viewed. */
let lastPage = 'usage'

/**
 * @param props - `wide` from the sidebar shell + `t` from the slot runtime.
 */
export function UsageStats({ wide, t }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(lastPage)
  // The visible page reports its refresh control here.
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

  const selectPage = (next) => {
    lastPage = next
    // Clear first: the incoming page reports its own control on mount, and a
    // stale one would spend a frame wired to the outgoing page's data.
    setRefresh(null)
    setPage(next)
  }

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
            <div className="dcl-head-lead">
              <span className="dcl-title">{t('stats.title')}</span>
              <div className="dcl-headtabs" role="tablist">
                {PAGES.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={page === id}
                    className="dcl-headtab"
                    data-active={page === id ? '' : undefined}
                    onClick={() => selectPage(id)}
                  >
                    {t(`tab.${id}`)}
                  </button>
                ))}
              </div>
            </div>
            {refresh !== null ? (
              <RefreshButton t={t} loading={refresh.loading} onClick={refresh.refresh} />
            ) : null}
          </header>
          <div className="dcl-heatbody">
            {page === 'usage'
              ? <AppUsagePanel t={t} locale={locale} onRefreshState={setRefresh} />
              : <BalancePanel t={t} locale={locale} onRefreshState={setRefresh} />}
          </div>
        </div>
      )}
    </div>
  )
}
