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

/* ---- usage stats panel ---- */
/* Six model series colors, mixed from the design-platform aliases so light
   and dark both stay correct without a media query or a second palette. */
.dcl-stats{--dcl-chart-1:var(--dsw-alias-state-business-primary);--dcl-chart-2:var(--dsw-alias-state-success-primary);--dcl-chart-3:color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,var(--dsw-alias-state-success-primary));--dcl-chart-4:var(--dsw-alias-state-error-primary);--dcl-chart-5:var(--dsw-alias-state-warn-primary);--dcl-chart-6:var(--dsw-alias-label-tertiary)}

.dcl-summary{display:flex;align-items:stretch;border-radius:10px;background:var(--dsw-alias-fill-l1,var(--dsw-alias-interactive-bg-hover));overflow:hidden}
/* Each cell owns its leading hairline, so the divider count always matches
   the metric count without the caller interleaving separators. */
.dcl-summary-cell{display:flex;align-items:stretch;flex:1;min-width:0}
.dcl-summary-item{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:9px 6px}
.dcl-summary-div{width:1px;background:var(--dsw-alias-border-l2);margin:8px 0;flex:none}
.dcl-summary-value{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600;line-height:19px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.dcl-summary-label{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}

.dcl-sectioncard{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-fill-l1,var(--dsw-alias-interactive-bg-hover))}
.dcl-sectionhead{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.dcl-sectiontitle{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:500;line-height:18px}

.dcl-tabs{display:inline-flex;align-items:center;gap:2px;height:24px;padding:2px;border-radius:999px;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));flex:none}
.dcl-tab{height:20px;padding:0 9px;border:none;border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;line-height:20px;cursor:pointer;white-space:nowrap}
.dcl-tab:hover{color:var(--dsw-alias-label-secondary)}
.dcl-tab[data-active]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-weight:500;box-shadow:var(--dsw-shadow-lv1,0 1px 2px rgba(0,0,0,.08))}

/* Square cells on a 1fr column track, so the whole year always fits the
   popover width instead of introducing a second horizontal scrollbar. */
.dcl-hm{display:flex;flex-direction:column;gap:4px}
.dcl-hm-months{display:grid;gap:3px;height:13px;margin-left:22px}
.dcl-hm-month{font-size:9px;line-height:13px;color:var(--dsw-alias-label-caption);white-space:nowrap;overflow:visible}
.dcl-hm-body{display:flex;gap:3px}
.dcl-hm-days{display:flex;flex-direction:column;gap:3px;width:19px;flex:none;justify-content:space-between}
.dcl-hm-day{font-size:9px;line-height:1;color:var(--dsw-alias-label-caption);height:0;display:flex;align-items:center}
.dcl-hm-cols{display:grid;gap:3px;flex:1;min-width:0}
.dcl-hm-col{display:flex;flex-direction:column;gap:3px;min-width:0}
.dcl-hm-cell{width:100%;aspect-ratio:1;min-width:0;border-radius:3px;border:1px solid transparent;padding:0;cursor:pointer;background:var(--dsw-alias-interactive-bg-hover)}
.dcl-hm-cell[data-has-usage]{border-color:var(--dsw-alias-border-l2)}
.dcl-hm-cell:hover{outline:1.5px solid var(--dsw-alias-label-secondary);outline-offset:-1px}
.dcl-hm-cell[data-selected]{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dcl-hm-l0{background:var(--dsw-alias-interactive-bg-hover)}
.dcl-hm-l1{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 25%,var(--dsw-alias-interactive-bg-hover))}
.dcl-hm-l2{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 50%,var(--dsw-alias-interactive-bg-hover))}
.dcl-hm-l3{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 75%,var(--dsw-alias-interactive-bg-hover))}
.dcl-hm-l4{background:var(--dsw-alias-state-business-primary)}

.dcl-chart{width:100%;height:190px}
.dcl-chart-lg{width:100%;height:200px}
.dcl-legend{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;padding:2px 0}
.dcl-legend-item{display:inline-flex;align-items:center;gap:5px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);max-width:100%}
.dcl-legend-dot{width:7px;height:7px;border-radius:50%;flex:none}
.dcl-legend-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Donut beside a ranked list; the list keeps its own column so long model
   names truncate instead of reflowing the chart. */
.dcl-donut{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr);gap:10px;align-items:center}
.dcl-donut-wrap{position:relative;width:100%;height:150px}
.dcl-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;pointer-events:none;text-align:center;padding:0 18px}
.dcl-donut-total{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:17px;font-variant-numeric:tabular-nums;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcl-donut-unit{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:13px}
.dcl-modellist2{display:flex;flex-direction:column;min-width:0}
.dcl-modelitem{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:2px 7px;padding:5px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dcl-modelitem:last-child{border-bottom:none}
.dcl-modelitem-dot{width:8px;height:8px;border-radius:2px;flex:none}
.dcl-modelitem-name{color:var(--dsw-alias-label-primary);font-size:11px;line-height:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-font-mono,ui-monospace,monospace)}
.dcl-modelitem-pct{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px;font-variant-numeric:tabular-nums;text-align:right}
.dcl-modelitem-tokens{grid-column:2;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.dcl-refresh{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dcl-refresh:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}
.dcl-refresh:disabled{opacity:.55;cursor:default}
/* Header variant: shorter, borderless chrome that reads as a title-row action. */
.dcl-refresh-head{height:24px;padding:0 8px;border-color:transparent;background:transparent;font-size:11px;gap:4px}
.dcl-refresh-head:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:transparent}
.dcl-empty{display:flex;flex-direction:column;align-items:center;gap:4px;padding:24px 14px;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;text-align:center}
.dcl-empty-title{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:500;line-height:18px}
.dcl-empty-desc{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}

/* Recharts renders inline SVG; these keep grid/axis on theme tokens. */
.dcl-chart .recharts-cartesian-grid line{stroke:var(--dsw-alias-border-l2)}
.dcl-chart .recharts-cartesian-axis-line,.dcl-chart .recharts-cartesian-axis-tick-line{stroke:var(--dsw-alias-border-l2)}
.dcl-chart .recharts-text{fill:var(--dsw-alias-label-caption);font-size:10px}
.dcl-tip{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.16));padding:6px 9px;font-size:11px;line-height:16px}
.dcl-tip-label{color:var(--dsw-alias-label-tertiary);margin-bottom:3px}
.dcl-tip-row{display:flex;align-items:center;gap:6px;justify-content:space-between}
.dcl-tip-name{display:inline-flex;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);min-width:0}
.dcl-tip-dot{width:7px;height:7px;border-radius:50%;flex:none}
.dcl-tip-val{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:500}
`
