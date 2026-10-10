# NOTICE

dsh-scope
Copyright (c) 2026 Kun Xiao (helloxkk)

## Third-party components

### ZCode — usage statistics UI

The usage-statistics panel in this project is a port of the "Application Usage"
(`应用用量`) surface from ZCode, and the panel's layout, the 52-week Token-activity
heatmap (including its daily / weekly / cumulative modes and month-ruler
alignment), the daily per-model trend chart, the model-usage donut, and the
shared number/date formatting helpers are derived from it.

- Source: https://github.com/zai-org/ZCode
- Copyright: Z.ai (Zhipu AI)
- License: Apache License 2.0

Upstream files this port derives from:

- `packages/ui/src/settings/usage-stats/AppUsagePanel.tsx`
- `packages/ui/src/settings/usage-stats/UsageHeatmap.tsx`
- `packages/ui/src/settings/usage-stats/UsageHeatmapCells.tsx`
- `packages/ui/src/settings/usage-stats/AppUsageDailyModelTrendChart.tsx`
- `packages/ui/src/settings/usage-stats/AppUsageModelUsagePieChart.tsx`
- `packages/ui/src/settings/usage-stats/usageStatsUiParts.tsx`
- `packages/ui/src/settings/usage-stats/appUsageChartPalette.ts`
- `packages/ui/src/lib/tokenNumberFormat.ts`

The derivation is at the level of design and structure, not of files. What
follows upstream: the panel's section order and grouping, the activity
heatmap's three modes and its month-ruler anchoring rule, the trend chart's
one-line-per-model series, and the model donut with its share list.

The implementation is this project's own. Rendering uses plain JavaScript and
`dcl-`-prefixed CSS over the DeepSeek Harness design-platform aliases
(`--dsw-alias-*`); the i18n layer is this plugin's own dictionary rather than
`next-intl`; the chart palette is mixed from the DSH theme tokens instead of
`--color-usage-*`; and the data comes from this plugin's own host-side
aggregation rather than ZCode's snapshot API.

The code is organized differently from upstream — the pure derivations live in
a separate `statsModel.js` with no upstream counterpart — and it is not a
line-for-line port.

Licensed under the Apache License, Version 2.0.
See http://www.apache.org/licenses/LICENSE-2.0 for the full license text.

### Recharts

The trend line chart and model donut are rendered with Recharts.

- Source: https://github.com/recharts/recharts
- License: MIT
