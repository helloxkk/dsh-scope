/**
 * dsh-context-lens — browser client half.
 *
 * Two UI contributions, one data flow each:
 *   1. `conversation.session.header.actions` (session scope) — ContextLens:
 *      live window occupancy, composition, and session totals straight from
 *      the official token-meter projections via `useProjection` (no RPC).
 *   2. `sidebar.footer.action` (root scope) — UsageHeatmap: the GitHub-style
 *      53-week usage grid fed by this plugin's host half endpoint.
 */
import { ContextLens } from './ContextLens.jsx'
import { UsageHeatmap } from './UsageHeatmap.jsx'
import { en, zh, NS } from './locales.js'
import { CSS, ID } from './style.js'

/** Services required for locale registration and slot contributions. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: inject the stylesheet, register the dictionaries, and
 * contribute the header action and the sidebar footer action.
 * @param ctx - client root context.
 */
export function apply(ctx) {
  injectStyle()
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'context-lens: dictionaries')
  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'context-lens',
      // After the job list (order 20): process work reads before context stats.
      order: 30,
      locale: NS,
    }, ContextLens),
  )
  ctx.slots.inject(
    'sidebar.footer.action',
    () => ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'context-lens-heat',
      locale: NS,
    }, UsageHeatmap),
  )
}

/** One <style> tag per load; the loader removes plugin-owned tags on unload. */
function injectStyle() {
  if (typeof document === 'undefined') return
  const tagId = `${ID}/lens.css`
  if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) === null) {
    const tag = document.createElement('style')
    tag.dataset.pluginCss = tagId
    tag.textContent = CSS
    document.head.append(tag)
  }
}
