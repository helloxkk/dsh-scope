/**
 * Formatting helpers for the usage-stats panel.
 *
 * Ported from ZCode (`packages/ui/src/settings/usage-stats/usageStatsUiParts.tsx`
 * and `packages/ui/src/lib/tokenNumberFormat.ts`, Apache-2.0) and reduced to
 * what this plugin renders. The locale argument drives Intl, so zh renders
 * 万/亿 while en renders K/M/B — matching ZCode's behavior.
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

/** Six-series palette. Indexes wrap, matching ZCode's palette helper. */
export function chartColor(index) {
  return `var(--dcl-chart-${(index % 6) + 1})`
}
