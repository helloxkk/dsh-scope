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
  const [primary, ...rest] = normal

  return (
    <div className="dcl-stats">
      <section className="dcl-card">
        <div className="dcl-card-title">{t('balance.title')}</div>

        {primary === undefined ? (
          <Notice title={t('balance.failedTitle')} description={t('balance.failedDesc')} />
        ) : (
          <>
            <div className="dcl-balance-hero">
              <div className="dcl-balance-amount">
                {formatCurrency(locale, primary.amount, primary.currency)}
              </div>
              <div className="dcl-balance-amount-note">{t('balance.normal')}</div>
            </div>

            {(rest.length > 0 || bonus.length > 0) && (
              <div className="dcl-balance-rows">
                {rest.map((wallet) => (
                  <div className="dcl-balance-row" key={`normal-${wallet.currency}`}>
                    <span className="dcl-balance-row-label">{wallet.currency}</span>
                    <span className="dcl-balance-row-value">
                      {formatCurrency(locale, wallet.amount, wallet.currency)}
                    </span>
                  </div>
                ))}
                {bonus.map((wallet) => (
                  <div className="dcl-balance-row" key={`bonus-${wallet.currency}`}>
                    <span className="dcl-balance-row-label">{t('balance.bonus')}</span>
                    <span className="dcl-balance-row-value">
                      {formatCurrency(locale, wallet.amount, wallet.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="dcl-balance-note">{t('balance.note')}</div>
      </section>
    </div>
  )
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
