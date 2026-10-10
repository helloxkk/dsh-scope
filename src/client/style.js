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
.dcl-head{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;padding:0 8px 0 16px;flex:none}
.dcl-head-lead{display:flex;align-items:center;gap:10px;min-width:0}
/* The page title carries size; the tabs beside it stay quiet. Negative
   tracking at this size, tightening toward zero as it grows. */
.dcl-title{color:var(--dsw-alias-label-primary);font-size:var(--dcl-fs-title);font-weight:600;line-height:26px;letter-spacing:-0.02em;white-space:nowrap}

/* Page switcher: borderless pills where only the active one is filled, so the
   row reads as navigation rather than as a second control strip. */
.dcl-headtabs{display:inline-flex;align-items:center;gap:2px;flex:none;min-width:0}
.dcl-headtab{height:24px;padding:0 11px;border:none;border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;font-weight:500;line-height:24px;cursor:pointer;white-space:nowrap;transition:color 120ms ease-out,background-color 120ms ease-out}
.dcl-headtab:hover{color:var(--dsw-alias-label-primary)}
.dcl-headtab:active{transform:scale(.96)}
.dcl-headtab[data-active]{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);font-weight:600}
@media (prefers-reduced-motion:reduce){ .dcl-headtab:active{transform:none} }
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
.dcl-footnote{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px;margin:4px 0 0}

/* ---- sidebar footer usage trigger + panel ---- */
.dcl-heatwrap{position:relative;width:100%;display:flex}
.dcl-heatbadge{width:100%;height:34px;display:inline-flex;align-items:center;gap:8px;padding:0 8px 0 6px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer;overflow:hidden;transition:background-color 120ms ease-out}
.dcl-heatbadge:hover,.dcl-heatbadge[data-open]{background:var(--dsw-alias-interactive-bg-hover-solid)}
/* Feedback on press, not release. */
.dcl-heatbadge:active{transform:scale(.985)}
.dcl-heatbadge-label{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden;text-align:left}
.dcl-heatbadge-rail{width:36px;height:36px;justify-content:center;gap:0;padding:0;border-radius:50%;flex:none}

/* The panel is a floating surface, not a dialog: it anchors to the trigger it
   came from and enters along the axis it will leave along, so the spatial
   relationship between button and content stays obvious.
   Sizing is content-driven and clamped to the viewport, so a tall window
   shows every section at once and a short one scrolls — no fixed height to
   outgrow and no media queries to maintain.
   The background is opaque. A translucent material reads well over uniform
   chrome, but this panel floats over arbitrary chat content, and text over a
   varying blurred backdrop loses contrast — legibility wins over the effect. */
.dcl-heatpanel{
  position:fixed;
  left:12px;
  bottom:96px;
  z-index:40;
  /* Grows with the window up to a comfortable reading measure. */
  width:clamp(400px,54vw,860px);
  max-width:calc(100vw - 24px);
  /* Use every pixel of vertical space between the top of the window and the
     trigger. An arbitrary hard cap here is what forced scrolling on tall
     windows — the viewport already knows how much room there is. */
  max-height:calc(100vh - 108px);
  display:flex;
  flex-direction:column;
  /* Type ramp. Each step is a visible jump, and nothing in the body sits
     below micro: small type bought vertical space and cost more legibility
     than the space was worth. Defined on the panel root so the header and the
     page share one scale. */
  --dcl-fs-title:20px;
  --dcl-fs-section:14px;
  --dcl-fs-value:13px;
  --dcl-fs-caption:12px;
  --dcl-fs-micro:11px;
  border:1px solid var(--dsw-alias-border-l1);
  border-radius:14px;
  background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base));
  box-shadow:0 1px 1px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.14),0 24px 56px rgba(0,0,0,.12);
  overflow:hidden;
  transform-origin:0 100%;
  /* Critically damped: nothing here was flicked, so no overshoot. */
  animation:dcl-panel-in 220ms cubic-bezier(.32,.72,0,1) both;
}
@keyframes dcl-panel-in{
  from{opacity:0;transform:scale(.97) translateY(8px)}
  to{opacity:1;transform:none}
}
/* Bright top edge: light catching the top face of the surface. */
.dcl-heatpanel::before{
  content:"";
  position:absolute;
  inset:0 0 auto;
  height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.5) 20%,rgba(255,255,255,.5) 80%,transparent);
  pointer-events:none;
}
/* flex:1 plus min-height:0 lets the body take exactly the height its content
   needs and only shrink (and scroll) when the panel hits its viewport cap.
   A fixed max-height here was what forced scrolling on tall windows. */
.dcl-heatbody{
  flex:1 1 auto;
  min-height:0;
  padding:12px 16px 14px;
  overflow-y:auto;
  overscroll-behavior:contain;
  display:flex;
  flex-direction:column;
  gap:12px;
  /* Fade content at the scroll edge instead of a hard cutoff under the
     header, so the panel reads as one continuous surface. */
  mask-image:linear-gradient(to bottom,transparent 0,#000 12px);
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 12px);
  --dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);
}
/* The height-locked wrapper: JS pins a min-height to it so switching pages
   never resizes the panel. Pages that need less simply leave space below. */
.dcl-heatcontent{display:flex;flex-direction:column;gap:var(--dcl-gap)}
.dcl-heaterror{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:9px;background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);font-size:var(--dcl-fs-caption);line-height:18px}
.dcl-retry{border:none;background:none;color:inherit;font:inherit;font-size:var(--dcl-fs-caption);font-weight:600;cursor:pointer;flex:none;padding:0;text-decoration:underline}

@media (prefers-reduced-motion:reduce){
  /* Cross-fade, no scale or travel. */
  .dcl-heatpanel{animation:dcl-panel-fade 160ms ease-out both}
  @keyframes dcl-panel-fade{from{opacity:0}to{opacity:1}}
  .dcl-heatbadge:active{transform:none}
}





/* ---- usage stats panel ---- */
/* One palette source and one type/spacing scale for the whole panel.
   Every size below comes from these variables: the previous version had
   accumulated one-off values between 9px and 12px, and that absence of a
   real ramp is what made the panel read as cramped rather than considered. */
.dcl-stats{
  --dcl-chart-1:var(--dsw-alias-state-business-primary);
  --dcl-chart-2:var(--dsw-alias-state-success-primary);
  --dcl-chart-3:color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,var(--dsw-alias-state-success-primary));
  --dcl-chart-4:var(--dsw-alias-state-error-primary);
  --dcl-chart-5:var(--dsw-alias-state-warn-primary);
  --dcl-chart-6:var(--dsw-alias-label-tertiary);
  /* Spacing. Comfortable by default; when the panel runs out of window it
     scrolls rather than compressing the type to fit. */
  --dcl-gap:14px;
  --dcl-pad:16px;
  --dcl-radius:12px;
  display:flex;
  flex-direction:column;
  gap:var(--dcl-gap);
  /* Tabular figures throughout: these numbers are compared column to
     column, and proportional digits make them jitter as values change. */
  font-variant-numeric:tabular-nums;
}

/* A grouping surface: one fill groups a section, so no border is needed and
   nothing draws a box around every part of a box. */
.dcl-card{
  display:flex;
  flex-direction:column;
  gap:12px;
  padding:var(--dcl-pad);
  border-radius:var(--dcl-radius);
  background:var(--dsw-alias-fill-l1,var(--dsw-alias-interactive-bg-hover));
  border:1px solid var(--dsw-alias-border-l2);
}
.dcl-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;min-height:28px}
/* Size and weight together: the section title is clearly larger than the
   data beneath it, which is what separates a heading from its content. */
.dcl-card-title{color:var(--dsw-alias-label-primary);font-size:var(--dcl-fs-section);font-weight:600;line-height:20px;letter-spacing:-0.01em}

/* ---- summary ---- */
.dcl-summary{display:flex;align-items:stretch;border-radius:var(--dcl-radius);background:var(--dsw-alias-fill-l1,var(--dsw-alias-interactive-bg-hover));border:1px solid var(--dsw-alias-border-l2);overflow:hidden}
/* Each cell owns its leading hairline, so the divider count always matches
   the metric count without the caller interleaving separators. */
.dcl-summary-cell{display:flex;align-items:stretch;flex:1;min-width:0}
/* The headline metric takes extra width; the four supporting facts stay
   equal, so the row reads as one headline plus four details rather than as
   five peers. It also gives the longer Chinese labels room on one line. */
.dcl-summary-cell:first-child{flex:1.35}
.dcl-summary-item{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:14px 6px}
.dcl-summary-div{width:1px;background:var(--dsw-alias-border-l2);margin:12px 0;flex:none}
.dcl-summary-value{color:var(--dsw-alias-label-primary);font-size:17px;font-weight:600;line-height:22px;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.dcl-summary-cell:first-child .dcl-summary-value{font-size:21px;letter-spacing:-0.03em}
/* Labels stay on one line: wrapping in a row of five would stagger the
   baselines and break the row rhythm. */
.dcl-summary-label{color:var(--dsw-alias-label-tertiary);font-size:var(--dcl-fs-caption);line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}

/* ---- segmented control (in-panel filters) ---- */
.dcl-tabs{display:inline-flex;align-items:center;gap:2px;height:28px;padding:3px;border-radius:999px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);flex:none}
.dcl-tab{height:22px;padding:0 12px;border:none;border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:var(--dcl-fs-caption);font-weight:500;line-height:22px;cursor:pointer;white-space:nowrap;transition:color 120ms ease-out,background-color 120ms ease-out}
.dcl-tab:hover{color:var(--dsw-alias-label-primary)}
/* Feedback on press, not on release. */
.dcl-tab:active{transform:scale(.96)}
.dcl-tab[data-active]{background:var(--dsw-alias-interactive-bg-hover-solid,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-primary);font-weight:600}

/* ---- activity grid ---- */
.dcl-hm{display:flex;flex-direction:column;gap:6px}
/* The ruler spans exactly the column track, offset by the weekday gutter, so
   labels sit over the columns they name. */
.dcl-hm-months{display:grid;gap:3px;height:15px;margin-left:25px}
.dcl-hm-month{font-size:var(--dcl-fs-micro);line-height:15px;color:var(--dsw-alias-label-caption);white-space:nowrap;overflow:visible}
.dcl-hm-body{display:flex;gap:3px}
.dcl-hm-days{display:flex;flex-direction:column;justify-content:space-between;width:22px;flex:none;padding:1px 0}
.dcl-hm-day{font-size:var(--dcl-fs-micro);line-height:12px;color:var(--dsw-alias-label-caption);display:flex;align-items:center}
.dcl-hm-cols{display:grid;gap:3px;flex:1;min-width:0}
.dcl-hm-col{display:flex;flex-direction:column;gap:3px;min-width:0}
.dcl-hm-cell{width:100%;aspect-ratio:1;min-width:0;border-radius:3px;border:1px solid transparent;padding:0;cursor:pointer;background:var(--dsw-alias-interactive-bg-hover);transition:transform 120ms ease-out}
/* Scale on hover rather than an outline: an outline on a small cell reads as
   a border change and shifts perceived weight across the row. */
.dcl-hm-cell:hover{transform:scale(1.16);border-color:var(--dsw-alias-label-secondary)}
.dcl-hm-cell[data-selected]{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}
.dcl-hm-l0{background:var(--dsw-alias-interactive-bg-hover)}
.dcl-hm-l1{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 25%,var(--dsw-alias-interactive-bg-hover))}
.dcl-hm-l2{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 50%,var(--dsw-alias-interactive-bg-hover))}
.dcl-hm-l3{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 75%,var(--dsw-alias-interactive-bg-hover))}
.dcl-hm-l4{background:var(--dsw-alias-state-business-primary)}

/* ---- charts ---- */
.dcl-chart{width:100%;height:clamp(168px,20vh,240px)}
.dcl-legend{display:flex;flex-wrap:wrap;gap:6px 16px;justify-content:center;padding:0 0 2px}
.dcl-legend-item{display:inline-flex;align-items:center;gap:7px;font-size:var(--dcl-fs-caption);line-height:16px;color:var(--dsw-alias-label-secondary);max-width:100%}
.dcl-legend-dot{width:10px;height:2px;border-radius:1px;flex:none}
.dcl-legend-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-font-mono,ui-monospace,monospace)}

/* Donut beside a ranked list; the list keeps its own column so long model
   names truncate instead of reflowing the chart. */
.dcl-donut{display:grid;grid-template-columns:minmax(0,clamp(128px,13vw,172px)) minmax(0,1fr);gap:22px;align-items:center}
.dcl-donut-wrap{position:relative;width:100%;height:clamp(128px,13vw,172px)}
.dcl-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none;text-align:center;padding:0 30px}
.dcl-donut-total{color:var(--dsw-alias-label-primary);font-size:18px;font-weight:600;line-height:22px;letter-spacing:-0.02em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcl-donut-unit{color:var(--dsw-alias-label-tertiary);font-size:var(--dcl-fs-micro);line-height:14px;text-transform:uppercase;letter-spacing:0.06em}
.dcl-modellist2{display:flex;flex-direction:column;min-width:0}
.dcl-modelitem{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:baseline;gap:2px 10px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dcl-modelitem:last-child{border-bottom:none}
.dcl-modelitem-dot{width:9px;height:9px;border-radius:2px;flex:none;align-self:center}
.dcl-modelitem-name{color:var(--dsw-alias-label-primary);font-size:var(--dcl-fs-value);line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-font-mono,ui-monospace,monospace)}
.dcl-modelitem-pct{color:var(--dsw-alias-label-primary);font-size:var(--dcl-fs-value);font-weight:600;line-height:18px;text-align:right}
.dcl-modelitem-tokens{grid-column:2;color:var(--dsw-alias-label-tertiary);font-size:var(--dcl-fs-caption);line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ---- controls & states ---- */
.dcl-refresh{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:var(--dcl-fs-caption);cursor:pointer;transition:color 120ms ease-out,background-color 120ms ease-out}
.dcl-refresh:hover{color:var(--dsw-alias-label-primary)}
.dcl-refresh:active{transform:scale(.97)}
.dcl-refresh:disabled{opacity:.5;cursor:default}
/* Header variant: an icon-only target. The header already carries a title and
   the page tabs, and a third labelled control competes with both. */
.dcl-refresh-head{width:30px;height:30px;padding:0;justify-content:center;border-color:transparent;background:transparent}
.dcl-refresh-head:hover{background:var(--dsw-alias-interactive-bg-hover)}
/* The spinning icon is the entire progress signal: no label changes, so the
   header row never reflows mid-request. */
.dcl-refresh-head[aria-busy] svg{animation:dcl-spin 900ms linear infinite}
@keyframes dcl-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .dcl-refresh-head[aria-busy] svg{animation:none;opacity:.5}
  .dcl-tab:active,.dcl-refresh:active{transform:none}
  .dcl-hm-cell{transition:none}
  .dcl-hm-cell:hover{transform:none}
}

.dcl-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:32px 20px;border:1px dashed var(--dsw-alias-border-l2);border-radius:var(--dcl-radius);text-align:center}
.dcl-empty-title{color:var(--dsw-alias-label-primary);font-size:var(--dcl-fs-value);font-weight:600;line-height:19px}
.dcl-empty-desc{color:var(--dsw-alias-label-tertiary);font-size:var(--dcl-fs-caption);line-height:18px;max-width:36ch}

/* ---- first-open skeleton ---- */
/* Occupies the same boxes as the loaded panel so it opens at its final size.
   A gentle pulse reads as working without a shimmer sweeping across 364
   grid cells. */
.dcl-skel{background:var(--dsw-alias-interactive-bg-hover);border-radius:4px;animation:dcl-skel-pulse 1500ms ease-in-out infinite}
@keyframes dcl-skel-pulse{0%,100%{opacity:.5}50%{opacity:.95}}
.dcl-skel-summary-value{height:22px;width:58%}
.dcl-skel-summary-label{height:16px;width:78%}
.dcl-skel-tabs{height:28px;width:146px;border-radius:999px;flex:none}
.dcl-skel-legend{height:16px;width:200px;margin:0 auto;border-radius:8px}
.dcl-skel-fill{width:100%;height:100%;border-radius:8px}
.dcl-skel-list{width:100%;height:88px;border-radius:8px;align-self:center}
/* A ring, not a disc: it stands in for the donut. */
.dcl-skel-ring{width:100%;height:100%;border-radius:50%;border:16px solid var(--dsw-alias-interactive-bg-hover);animation:dcl-skel-pulse 1500ms ease-in-out infinite}
/* Balance placeholders, sized to the type they stand in for. */
.dcl-skel-balance-amount{height:44px;width:52%;border-radius:6px}
.dcl-skel-balance-note{height:17px;width:34%}
.dcl-skel-balance-row{height:19px;width:70%}
@media (prefers-reduced-motion:reduce){
  .dcl-skel,.dcl-skel-ring{animation:none;opacity:.7}
}

/* Recharts renders inline SVG; these keep grid and axis on theme tokens. */
.dcl-chart .recharts-cartesian-grid line{stroke:var(--dsw-alias-border-l2)}
.dcl-chart .recharts-cartesian-axis-line,.dcl-chart .recharts-cartesian-axis-tick-line{stroke:transparent}
.dcl-chart .recharts-text{fill:var(--dsw-alias-label-caption);font-size:var(--dcl-fs-micro)}
.dcl-chart .recharts-curve.recharts-tooltip-cursor{stroke:var(--dsw-alias-border-l1)}

/* Opaque: the tooltip covers chart lines and labels, and a blurred backdrop
   under small text costs more legibility than the material is worth. */
.dcl-tip{
  border:1px solid var(--dsw-alias-border-l1);
  border-radius:9px;
  background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));
  box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.16));
  padding:8px 11px;
  font-size:var(--dcl-fs-caption);
  line-height:18px;
}
.dcl-tip-label{color:var(--dsw-alias-label-tertiary);margin-bottom:5px;font-size:var(--dcl-fs-micro)}
.dcl-tip-row{display:flex;align-items:center;gap:10px;justify-content:space-between}
.dcl-tip-name{display:inline-flex;align-items:center;gap:7px;color:var(--dsw-alias-label-secondary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:var(--dcl-fs-micro)}
.dcl-tip-dot{width:8px;height:8px;border-radius:50%;flex:none}
.dcl-tip-val{color:var(--dsw-alias-label-primary);font-weight:600}

/* ---- balance page ---- */
/* The headline figure is the point of the page, so it gets the only
   display-sized type in the panel. */
.dcl-balance-hero{display:flex;flex-direction:column;gap:6px}
.dcl-balance-amount{color:var(--dsw-alias-label-primary);font-size:40px;font-weight:600;line-height:44px;letter-spacing:-0.03em}
.dcl-balance-amount-note{color:var(--dsw-alias-label-tertiary);font-size:var(--dcl-fs-caption);line-height:17px}
.dcl-balance-rows{display:flex;flex-direction:column;margin-top:4px}
.dcl-balance-row{display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:7px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:var(--dcl-fs-value);line-height:19px}
.dcl-balance-row:last-child{border-bottom:none}
.dcl-balance-row-label{color:var(--dsw-alias-label-secondary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcl-balance-row-value{color:var(--dsw-alias-label-primary);font-weight:600;white-space:nowrap}
.dcl-balance-note{color:var(--dsw-alias-label-caption);font-size:var(--dcl-fs-micro);line-height:16px;margin-top:4px}
/* Deduction order. It is the one fact that makes the bonus balance actionable
   — it is spent first — so it sits directly under the amounts it explains. */
.dcl-orderhint{
  margin-top:12px;
  padding:9px 12px;
  border-radius:9px;
  background:var(--dsw-alias-interactive-bg-hover);
  border-left:2px solid var(--dsw-alias-state-warn-primary);
  color:var(--dsw-alias-label-secondary);
  font-size:var(--dcl-fs-caption);
  line-height:18px;
}
/* Unacknowledged bonus grants, each with its expiry. A near expiry is amber
   and carries the amber over to the date, where the eye checks first. */
.dcl-grants{display:flex;flex-direction:column;gap:2px;margin-top:4px}
.dcl-grants-title{color:var(--dsw-alias-label-secondary);font-size:var(--dcl-fs-caption);font-weight:600;line-height:18px;padding-bottom:2px}
.dcl-grant{display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:6px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:var(--dcl-fs-value);line-height:19px}
.dcl-grant:last-of-type{border-bottom:none}
.dcl-grant-label{color:var(--dsw-alias-label-primary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcl-grant-expiry{color:var(--dsw-alias-label-tertiary);font-size:var(--dcl-fs-micro);white-space:nowrap}
.dcl-grant-expiry[data-soon]{color:var(--dsw-alias-state-warn-primary);font-weight:600}
.dcl-grant-value{color:var(--dsw-alias-label-primary);font-weight:600;white-space:nowrap}
.dcl-grants-note{color:var(--dsw-alias-label-caption);font-size:var(--dcl-fs-micro);line-height:15px;padding-top:4px}
.dcl-link{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 13px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:var(--dcl-fs-caption);text-decoration:none;cursor:pointer;transition:color 120ms ease-out}
.dcl-link:hover{color:var(--dsw-alias-label-primary)}
`