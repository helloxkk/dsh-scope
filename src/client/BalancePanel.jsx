/**
 * BalancePanel — the account page: the signed-in DeepSeek wallet balance.
 *
 * Reads one payload from the host half, which asks the account platform for
 * the sanitized wallet summary. The panel never sees a credential, and the
 * host endpoint is loopback-fenced like the usage one.
 */
import { useEffect } from 'react'
import { formatCurrency, sumWallets } from './statsFormat.js'
import { useRemote } from './useRemote.js'

const BALANCE_PATH = '/api/dsh-scope/balance'
/** Survives remounts so reopening the panel does not replay the placeholder. */
const balanceCache = { value: null }

/**
 * @param props - `t`/`locale` from the slot runtime plus `onRefreshState`,
 *   which reports the refresh control up to the panel header.
 */
export function BalancePanel({ t, locale, onRefreshState }) {
  const { data, loading, error, load } = useRemote(BALANCE_PATH, balanceCache)

  useEffect(() => {
    onRefreshState?.({ loading, refresh: load })
  }, [onRefreshState, loading, load])

  if (loading && data === null) return <BalanceSkeleton t={t} />

  const status = error !== null ? 'failed' : (data?.status ?? 'failed')

  if (status === 'signed-out') {
    return <Notice title={t('balance.emptyTitle')} description={t('balance.emptyDesc')} />
  }
  if (status === 'unavailable') {
    return <Notice title={t('balance.unavailableTitle')} description={t('balance.unavailableDesc')} />
  }
  if (status !== 'ready') {
    return (
      <Notice title={t('balance.failedTitle')} description={t('balance.failedDesc')}>
        <button type="button" className="dcl-link" onClick={load}>{t('heat.retry')}</button>
      </Notice>
    )
  }

  const normal = sumWallets(data.wallets ?? [])
  const bonus = sumWallets(data.bonusWallets ?? [])
  // The headline figure is the spendable total across every wallet, in the
  // account's primary currency. Every wallet is then itemized below, so the
  // sum is never the only thing you see.
  const primaryCurrency = normal[0]?.currency ?? bonus[0]?.currency
  const primaryAmount = normal
    .filter((w) => w.currency === primaryCurrency)
    .reduce((sum, w) => sum + w.amount, 0)
  const breakdown = [
    ...normal.map((w) => ({ ...w, label: w.currency === primaryCurrency ? t('balance.normal') : w.currency })),
    ...bonus.map((w) => ({ ...w, label: t('balance.bonus') })),
  ]

  if (primaryCurrency === undefined) {
    return (
      <div className="dcl-stats">
        <Notice title={t('balance.failedTitle')} description={t('balance.failedDesc')} />
      </div>
    )
  }

  // Unacknowledged bonus grants from the platform, each with its expiry. The
  // summary endpoint cannot provide this, so it arrives separately and may be
  // absent — grants the user has already acknowledged on the platform are not
  // in the list, which is the platform's behaviour, not a failure here.
  const grants = Array.isArray(data?.bonusGrants) ? data.bonusGrants : null

  return (
    <div className="dcl-stats">
      <section className="dcl-card">
        <div className="dcl-balance-hero">
          <div className="dcl-card-title">{t('balance.title')}</div>
          <div className="dcl-balance-amount">
            {formatCurrency(locale, primaryAmount, primaryCurrency)}
          </div>
          <div className="dcl-balance-amount-note">{t('balance.available')}</div>
        </div>

        {breakdown.length > 0 && (
          <div className="dcl-balance-rows">
            {breakdown.map((wallet) => (
              <div className="dcl-balance-row" key={`${wallet.label}-${wallet.currency}`}>
                <span className="dcl-balance-row-label">{wallet.label}</span>
                <span className="dcl-balance-row-value">
                  {formatCurrency(locale, wallet.amount, wallet.currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Deduction order. It is what decides whether the bonus balance is
            worth watching: it is spent first, so it goes before the cash. */}
        <div className="dcl-orderhint">{t('balance.orderHint')}</div>

        {grants !== null && grants.length > 0 && (
          <div className="dcl-grants">
            <div className="dcl-grants-title">{t('balance.grantsTitle')}</div>
            {grants.map((grant) => {
              const expiry = expiryOf(grant.expiresAt, t)
              return (
                <div className="dcl-grant" key={grant.campaign + String(grant.expiresAt)}>
                  <span className="dcl-grant-label">
                    {grant.campaign || t('balance.bonus')}
                    {expiry !== null ? (
                      <span className="dcl-grant-expiry" data-soon={expiry.soon || undefined}>
                        {' '}{expiry.text}
                      </span>
                    ) : null}
                  </span>
                  <span className="dcl-grant-value">
                    {formatCurrency(locale, grant.amount, grant.currency)}
                  </span>
                </div>
              )
            })}
            <div className="dcl-grants-note">{t('balance.grantsNote')}</div>
          </div>
        )}

        <div className="dcl-balance-note">{t('balance.note')}</div>
      </section>
    </div>
  )
}

/**
 * Describe a bonus expiry in days, so the reader can tell at a glance whether
 * it needs acting on. Within a week it says so explicitly and is flagged, and
 * anything already past is reported as expired rather than as a negative
 * number of days.
 * @param expiresAt - ISO timestamp from the platform, or null.
 * @param t - translator, for the relative-day phrasing.
 */
function expiryOf(expiresAt, t) {
  if (typeof expiresAt !== 'string' || expiresAt.length === 0) return null
  const ms = Date.parse(expiresAt)
  if (Number.isNaN(ms)) return null
  const days = Math.ceil((ms - Date.now()) / 86_400_000)
  if (days < 0) return { text: t('balance.expired'), soon: true }
  if (days === 0) return { text: t('balance.expiresToday'), soon: true }
  if (days <= 7) return { text: t('balance.expiresSoon', { n: days }), soon: true }
  return { text: t('balance.expiresIn', { n: days }), soon: false }
}

/** Empty/blocked states share one shape: a title, an explanation, an optional action. */
function Notice({ title, description, children }) {
  return (
    <div className="dcl-stats">
      <div className="dcl-empty">
        <div className="dcl-empty-title">{title}</div>
        <div className="dcl-empty-desc">{description}</div>
        {children}
      </div>
    </div>
  )
}

/**
 * First-open placeholder. Kept close to the loaded height so the panel does
 * not resize the moment the balance arrives.
 */
function BalanceSkeleton({ t }) {
  return (
    <div className="dcl-stats" aria-busy="true" aria-live="polite">
      <section className="dcl-card">
        <div className="dcl-card-title">{t('balance.title')}</div>
        <div className="dcl-balance-hero">
          <div className="dcl-skel dcl-skel-balance-amount" />
          <div className="dcl-skel dcl-skel-balance-note" />
        </div>
        <div className="dcl-balance-rows">
          <div className="dcl-balance-row">
            <div className="dcl-skel dcl-skel-balance-row" />
          </div>
        </div>
      </section>
    </div>
  )
}
