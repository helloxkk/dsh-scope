/** Plugin identity used for the style tag and slot ids. */
export const ID = 'dsh-scope'

/**
 * All classes are `dcl-` prefixed (deepseek context lens) to stay collision
 * free inside the host page. Colors reference the harness design-platform
 * aliases only, so both light and dark themes render correctly with zero
 * media queries: the aliases re-map under body[data-ds-dark-theme].
 *
 * Heatmap cells use color-mix over --dsw-alias-state-business-primary (the
 * theme's brand blue) for the five discrete levels, matching GitHub's
 * contribution-graph look while staying theme-aware.
 */
export const CSS = `
/* ---- session-header lens trigger + panel ---- */
.dcl-wrap{position:relative;display:inline-flex}
.dcl-trigger{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 8px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:16px;cursor:pointer}
.dcl-trigger:hover,.dcl-trigger[data-open]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dcl-trigger-text{font-variant-numeric:tabular-nums;min-width:30px;text-align:left}
.dcl-ring{flex:none}
.dcl-ring-bg{fill:none;stroke:var(--dsw-alias-border-l2);stroke-width:2}
.dcl-ring-fg{fill:none;stroke:var(--dsw-alias-state-business-primary);stroke-width:2;transition:stroke-dasharray .3s ease}

.dcl-panel{position:absolute;top:calc(100% + 6px);right:0;z-index:40;width:340px;max-width:calc(100vw - 24px);display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base));box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.16));overflow:hidden}
.dcl-head{display:flex;align-items:center;justify-content:space-between;min-height:40px;padding:8px 14px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:none}
.dcl-title{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px}
.dcl-body{padding:8px 14px 14px;overflow-y:auto;max-height:60vh;display:flex;flex-direction:column;gap:12px;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}
.dcl-section{display:flex;flex-direction:column;gap:6px}
.dcl-rowhead{display:flex;align-items:baseline;justify-content:space-between;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;gap:8px}
.dcl-num{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-size:12px;font-weight:600}

.dcl-track{position:relative;height:8px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);overflow:hidden;display:flex}
.dcl-seg{height:100%;min-width:1px}
.dcl-seg-system{background:var(--dsw-alias-state-warn-primary)}
.dcl-seg-tools{background:var(--dsw-alias-state-business-primary)}
.dcl-seg-messages{background:var(--dsw-static-deepseek-300,var(--dsw-alias-state-business-primary))}
.dcl-seg-hit{background:var(--dsw-alias-state-success-primary)}

.dcl-comp{display:grid;grid-template-columns:10px 64px 1fr 48px 36px;align-items:center;gap:8px;font-size:12px;line-height:18px}
.dcl-dot{width:8px;height:8px;border-radius:50%;justify-self:center}
.dcl-dot-system{background:var(--dsw-alias-state-warn-primary)}
.dcl-dot-tools{background:var(--dsw-alias-state-business-primary)}
.dcl-dot-messages{background:var(--dsw-static-deepseek-300,var(--dsw-alias-state-business-primary))}
.dcl-comp-label{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcl-comp-track{height:6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);overflow:hidden}
.dcl-comp-fill{height:100%;border-radius:inherit;min-width:2px;background:var(--dsw-alias-label-tertiary)}
.dcl-comp-value{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;text-align:right}
.dcl-comp-pct{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums;text-align:right;font-size:11px}

.dcl-stat{display:flex;justify-content:space-between;font-size:12px;line-height:20px}
.dcl-stat-label{color:var(--dsw-alias-label-secondary)}
.dcl-hitblock{display:flex;flex-direction:column;gap:5px;margin-top:2px}
.dcl-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin:6px 0}
.dcl-footnote{color:var(--dsw-alias-label-caption);font-size:10px;line-height:14px;margin:2px 0 0}

/* ---- sidebar footer heatmap ---- */
.dcl-heatwrap{position:relative;width:100%;display:flex}
.dcl-heatbadge{width:100%;height:34px;display:inline-flex;align-items:center;gap:8px;padding:0 8px 0 6px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer;overflow:hidden}
.dcl-heatbadge:hover,.dcl-heatbadge[data-open]{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dcl-heatbadge-label{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden;text-align:left}
.dcl-heatbadge-rail{width:36px;height:36px;justify-content:center;gap:0;padding:0;border-radius:50%;flex:none}
.dcl-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dcl-iconbtn:hover{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}

.dcl-heatpanel{position:fixed;left:12px;bottom:96px;z-index:40;width:600px;max-width:calc(100vw - 24px);display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base));box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.16));overflow:hidden}
.dcl-heatbody{padding:10px 14px 14px;overflow-y:auto;max-height:70vh;display:flex;flex-direction:column;gap:10px;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}
.dcl-heaterror{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:7px 8px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.dcl-retry{border:none;background:none;color:inherit;font:inherit;cursor:pointer;flex:none;padding:0;text-decoration:underline}

.dcl-chips{display:flex;gap:8px;flex-wrap:wrap}
.dcl-chip{flex:1;min-width:100px;display:flex;flex-direction:column;gap:2px;padding:6px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-fill-l1,transparent)}
.dcl-chip-label{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px}
.dcl-chip-value{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600;line-height:18px;font-variant-numeric:tabular-nums}

.dcl-gridscroll{overflow-x:auto;padding-bottom:2px;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}
.dcl-monthrow{display:grid;grid-template-columns:26px repeat(53,11px);gap:2px;margin-bottom:2px;height:12px}
.dcl-monthmark{grid-row:1;font-size:9px;line-height:12px;color:var(--dsw-alias-label-caption);white-space:nowrap;overflow:visible}
.dcl-gridrows{display:flex;gap:2px}
.dcl-weekdays{display:grid;grid-template-rows:repeat(7,11px);gap:2px;width:24px;font-size:9px;line-height:11px;color:var(--dsw-alias-label-caption)}
.dcl-weekdays span{grid-column:1;text-align:right;padding-right:2px}
.dcl-grid{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,11px);grid-auto-columns:11px;gap:2px}
.dcl-cell{width:11px;height:11px;border-radius:2.5px;border:none;padding:0;cursor:pointer;background:var(--dsw-alias-interactive-bg-hover)}
.dcl-cell-null{background:transparent;cursor:default}
.dcl-cell-l0{background:var(--dsw-alias-interactive-bg-hover)}
.dcl-cell-l1{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 25%,var(--dsw-alias-interactive-bg-hover))}
.dcl-cell-l2{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 50%,var(--dsw-alias-interactive-bg-hover))}
.dcl-cell-l3{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 75%,var(--dsw-alias-interactive-bg-hover))}
.dcl-cell-l4{background:var(--dsw-alias-state-business-primary)}
.dcl-cell:hover{outline:1.5px solid var(--dsw-alias-label-secondary);outline-offset:-1px}
.dcl-cell[data-today]{outline:1.5px solid var(--dsw-alias-state-success-primary);outline-offset:-0.5px}
.dcl-cell[data-selected]{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dcl-cell[data-selected][data-today]{outline-color:var(--dsw-alias-state-business-primary)}

.dcl-heatlegend{display:flex;align-items:center;gap:3px;justify-content:flex-end}
.dcl-heatlegend .dcl-cell{cursor:default}
.dcl-heatlegend .dcl-cell:hover{outline:none}
.dcl-legend-label{color:var(--dsw-alias-label-caption);font-size:9px;line-height:12px;margin:0 4px}

.dcl-daydetail{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-fill-l1,transparent)}
.dcl-daydetail-sessions{color:var(--dsw-alias-label-secondary);font-size:11px}
.dcl-modellist{display:flex;flex-direction:column;gap:2px;margin-top:4px;padding-top:6px;border-top:1px solid var(--dsw-alias-border-l2)}
.dcl-modelrow{display:flex;justify-content:space-between;gap:8px;font-size:11px;line-height:16px}
.dcl-modelname{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-font-mono,ui-monospace,monospace)}
`
