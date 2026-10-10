/**
 * BalancePanel — the account page: the signed-in DeepSeek wallet balance.
 *
 * Reads one payload from the host half, which asks the account platform for
 * the sanitized wallet summary, account profile, and platform page links.
 * The panel never sees a credential, and the host endpoint is
 * loopback-fenced like the usage one.
 *
 * Layout mirrors the usage page's rhythm:
 *   1. a summary strip (headline total + per-wallet facts)
 *   2. the balance card (wallet breakdown, deduction order, grants)
 *   3. the account card (avatar, name/contact, platform links)
 */
import { useEffect, useState } from 'react'
import { formatCurrency, formatShortTimestamp, sumWallets } from './statsFormat.js'
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
  // account's primary currency: cash plus bonus, because the bonus is spent
  // first and is therefore just as available. Every wallet is then itemized
  // below, so the sum is never the only thing you see.
  const primaryCurrency = normal[0]?.currency ?? bonus[0]?.currency
  const bonusOf = (currency) => bonus.find((w) => w.currency === currency)?.amount ?? 0
  const cashPrimary = normal
    .filter((w) => w.currency === primaryCurrency)
    .reduce((sum, w) => sum + w.amount, 0)
  const primaryAmount = cashPrimary + bonusOf(primaryCurrency)
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

  // Enrichments from the host, each optional and independently absent.
  // profile: account identity for the account card. links: platform pages.
  const profile = (data?.profile !== null && typeof data?.profile === 'object') ? data.profile : null
  const links = (data?.links !== null && typeof data?.links === 'object') ? data.links : null
  // Unacknowledged bonus grants from the platform, each with its expiry. The
  // summary endpoint cannot provide this, so it arrives separately and may be
  // absent — grants the user has already acknowledged on the platform are not
  // in the list, which is the platform's behaviour, not a failure here.
  const grants = Array.isArray(data?.bonusGrants) ? data.bonusGrants : null

  return (
    <div className="dcl-stats">
      <BalanceSummary
        t={t}
        locale={locale}
        currency={primaryCurrency}
        total={primaryAmount}
        bonus={bonusOf(primaryCurrency)}
        cash={cashPrimary}
        grants={grants}
      />

      {error !== null ? (
        <div className="dcl-heaterror">
          <span>{t('heat.error')}: {error}</span>
          <button type="button" className="dcl-retry" onClick={load}>{t('heat.retry')}</button>
        </div>
      ) : null}

      <section className="dcl-card">
        <div className="dcl-card-head">
          <div className="dcl-card-title">{t('balance.title')}</div>
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

      {(profile !== null || links !== null) && (
        <section className="dcl-card">
          <div className="dcl-card-title">{t('balance.accountTitle')}</div>
          {profile !== null && (
            <div className="dcl-account">
              <AccountAvatar url={profile.avatarUrl} />
              <div className="dcl-account-copy">
                <div className="dcl-account-name">{profile.name || t('balance.unnamed')}</div>
                <div className="dcl-account-contact" title={profile.contact ?? undefined}>
                  {profile.contact || t('balance.noContact')}
                </div>
              </div>
            </div>
          )}
          {links !== null && (links.usageUrl || links.topUpUrl) && (
            <div className="dcl-account-links">
              {links.usageUrl && (
                <a className="dcl-link" href={links.usageUrl} target="_blank" rel="noreferrer">
                  {t('balance.usageLink')}
                </a>
              )}
              {links.topUpUrl && (
                <a className="dcl-link" href={links.topUpUrl} target="_blank" rel="noreferrer">
                  {t('balance.topUpLink')}
                </a>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

/**
 * Balance summary strip, in the usage page's summary rhythm: one headline
 * metric plus supporting facts, separated by hairlines.
 */
function BalanceSummary({ t, locale, currency, total, bonus, cash, grants }) {
  const soonExpiring = grants === null
    ? null
    : grants.reduce((soonest, grant) => {
        const ms = Date.parse(grant.expiresAt)
        if (Number.isNaN(ms) || ms < Date.now()) return soonest
        const days = Math.ceil((ms - Date.now()) / 86_400_000)
        return soonest === null || days < soonest ? days : soonest
      }, null)
  const items = [
    { key: 'balance.available', value: formatCurrency(locale, total, currency), headline: true },
    { key: 'balance.bonus', value: formatCurrency(locale, bonus, currency) },
    { key: 'balance.normal', value: formatCurrency(locale, cash, currency) },
    {
      key: 'balance.grantsTitle',
      value: grants === null ? '--' : String(grants.length),
    },
    {
      key: 'balance.soonestExpiry',
      value: soonExpiring === null ? '--' : t('balance.expiresIn', { n: soonExpiring }),
    },
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

/**
 * Account avatar with a fallback: the platform picture when it loads, an
 * inline silhouette while absent or failed. Mirrors the official settings
 * page's treatment (decorative, no referrer, failure falls back silently).
 */
function AccountAvatar({ url }) {
  const [failed, setFailed] = useState(false)
  if (url && !failed) {
    return (
      <span className="dcl-account-avatar">
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => { setFailed(true) }}
        />
      </span>
    )
  }
  return (
    <span className="dcl-account-avatar" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
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
        <div className="dcl-card-title">{t('balance.title')}</div>
        <div className="dcl-balance-rows">
          <div className="dcl-balance-row">
            <div className="dcl-skel dcl-skel-balance-row" />
          </div>
          <div className="dcl-balance-row">
            <div className="dcl-skel dcl-skel-balance-row" />
          </div>
        </div>
      </section>
      <section className="dcl-card">
        <div className="dcl-card-title">{t('balance.accountTitle')}</div>
        <div className="dcl-account">
          <div className="dcl-skel dcl-skel-avatar" />
          <div className="dcl-account-copy">
            <div className="dcl-skel dcl-skel-account-name" />
            <div className="dcl-skel dcl-skel-account-contact" />
          </div>
        </div>
      </section>
    </div>
  )
}
