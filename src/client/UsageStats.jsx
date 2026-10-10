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
 * The usage page's natural height, remembered at module scope.
 *
 * It is the height the whole panel is held to, across pages and across opens.
 * Keeping it here (rather than in component state) is what makes the panel
 * open at full size even when the last page viewed was the short one: the
 * anchor survives the unmount, so the balance page pins to the same height
 * the usage page had.
 */
let usageHeightRef = { current: null }

/**
 * @param props - `wide` from the sidebar shell + `t` from the slot runtime.
 */
export function UsageStats({ wide, t }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(lastPage)
  // The visible page reports its refresh control here.
  const [refresh, setRefresh] = useState(null)
  const rootRef = useRef(null)
  const contentRef = useRef(null)

  /**
   * The body height is anchored on the usage page, the panel's primary and
   * tallest view. Anchoring on "whatever page is showing" instead meant that
   * reopening on the short balance page locked the panel low, and switching
   * to usage then made it jump to full height.
   *
   * The usage page is only measurable while it is mounted, so its height is
   * remembered at module scope: it survives the switch to balance (whose
   * wrapper then pins to the remembered value) and to the next open.
   */
  const heightsRef = useRef({})
  const [bodyHeight, setBodyHeight] = useState(usageHeightRef.current)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => { document.removeEventListener('pointerdown', close) }
  }, [open])

  // Measure the mounted page. Only the usage page's height is recorded as the
  // anchor; a shorter page never lowers it, and a taller one is not expected.
  useEffect(() => {
    if (!open) return
    const el = contentRef.current
    if (!el) return
    const measure = () => {
      const pageEl = el.firstElementChild
      const target = pageEl ?? el
      const height = target.getBoundingClientRect().height
      if (!(height > 0)) return
      const rounded = Math.ceil(height)
      if (page === 'usage' && rounded !== usageHeightRef.current) {
        usageHeightRef.current = rounded
        setBodyHeight(rounded)
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [open, page])

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
            {/* The wrapper carries the locked height; the page inside keeps its
                natural height, so measuring it stays honest. */}
            <div
              ref={contentRef}
              className="dcl-heatcontent"
              style={bodyHeight !== null ? { minHeight: bodyHeight } : undefined}
            >
              {page === 'usage'
                ? <AppUsagePanel t={t} locale={locale} onRefreshState={setRefresh} />
                : <BalancePanel t={t} locale={locale} onRefreshState={setRefresh} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
