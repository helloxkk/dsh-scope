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

The port is adapted, not copied verbatim: ZCode's Tailwind utility classes,
`@zcode/shared` types, `next-intl` message formatting, and `--color-usage-*`
tokens are replaced with this project's own `dcl-` CSS classes, plain
JavaScript, and the DeepSeek Harness design-platform aliases (`--dsw-alias-*`).
Data is sourced from this plugin's own host-side aggregation rather than
ZCode's snapshot API.

Licensed under the Apache License, Version 2.0.
See http://www.apache.org/licenses/LICENSE-2.0 for the full license text.

### Recharts

The trend line chart and model donut are rendered with Recharts.

- Source: https://github.com/recharts/recharts
- License: MIT
