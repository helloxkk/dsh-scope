/**
 * Formatting helpers for the usage panel.
 *
 * Everything routes through `Intl`, so zh renders 万/亿 and en renders K/M/B
 * from the same call — no per-locale string tables to keep in sync.
 *
 * @module dsh-scope/statsFormat
 */

/** Compact number via Intl (`1.2万` / `12.3K`), em dash when not finite. */
export function formatCompactNumber(locale, value) {
  if (!Number.isFinite(value)) return '--'
  if (value < 1000) return new Intl.NumberFormat(locale).format(value)
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

/** Compact token count. */
export function formatCompactTokens(locale, value) {
  return formatCompactNumber(locale, value)
}

/**
 * Summary-strip token format: zh compact units sit flush against the digits
 * (`1.2亿`), so a thin space is inserted to match the duration/day items.
 */
export function formatSummaryTokens(locale, value) {
  const formatted = formatCompactTokens(locale, value)
  return locale.startsWith('zh') ? formatted.replace(/(?<=\d)(?=[万亿])/u, ' ') : formatted
}

/** Percentage (`35%`, `3.9%`). */
export function formatPercent(locale, ratio) {
  if (!Number.isFinite(ratio)) return '--'
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: ratio >= 0.1 ? 0 : 1,
  }).format(ratio)
}

/** `M/D` short date for chart axes. Parsed as UTC so the label never shifts a day. */
export function formatShortDay(locale, dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return dateKey
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(date)
}

/** `YYYY年M月D日` full date for tooltips. */
export function formatFullDay(locale, dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return dateKey
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/** Short month label for the heatmap's month ruler. */
export function formatMonth(locale, dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return dateKey.slice(5, 7)
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short' }).format(date)
}

/** `{n}天{h}小时{m}分钟` — zero units are dropped, always at least minutes. */
export function formatDuration(t, durationMs) {
  const totalMinutes = Math.max(0, Math.floor((durationMs ?? 0) / 60_000))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (days > 0) parts.push(`${days}${t('stats.day')}`)
  if (hours > 0) parts.push(`${hours}${t('stats.hour')}`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}${t('stats.minute')}`)
  return parts.join(' ')
}

/** Six-series palette token for a series index; wraps past six. */
export function chartColor(index) {
  return `var(--dcl-chart-${(index % 6) + 1})`
}

/**
 * Format a platform wallet amount: `('zh-CN', '42.5', 'CNY')` → `¥42.50`.
 *
 * The amount arrives as a decimal string, so a non-numeric value is passed
 * through rather than rendered as `NaN`; an unrecognized currency code falls
 * back to a plain `42.50 XXX` instead of throwing out of `Intl`.
 */
export function formatCurrency(locale, amount, currency) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return `${String(amount)} ${String(currency)}`
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${String(currency)}`
  }
}

/** Sum wallet amounts per currency, preserving first-seen order. */
export function sumWallets(wallets) {
  const totals = new Map()
  for (const wallet of wallets) {
    if (wallet === null || typeof wallet !== 'object') continue
    const value = Number(wallet.balance)
    if (!Number.isFinite(value)) continue
    totals.set(wallet.currency, (totals.get(wallet.currency) ?? 0) + value)
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }))
}

/**
 * Short date (`2026/10/1`) for grant lists. Parsed as a whole-second UTC
 * timestamp so the label never shifts a day across timezones.
 */
export function formatShortTimestamp(locale, iso) {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return String(iso)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(ms))
}
