---
name: dashboard-visualization
description: Build operational dashboards, metric explorers, monitoring views, and coordinated multi-chart workspaces. Use when users need KPIs, trends, filters, drill-down, live or periodically refreshed data, alerts, or compact decision-oriented views.
---
# Dashboard Visualization

- Start with the decisions the dashboard supports; do not give every metric equal weight.
- Put headline state, anomalies, and primary trend first; move diagnostics below or behind drill-down.
- Define filter scope and cross-chart selection behavior explicitly.
- Show data freshness and distinguish loading, stale, partial, offline, empty, and error states.
- Preserve selected filters in the URL when sharing/reproducibility matters.
- Prefer tables with inline bars/sparklines for dense comparisons instead of many tiny panels.
- Use consistent time ranges, units, aggregation windows, and color semantics across views.
- Avoid auto-refresh that destroys user context; keep selection/scroll stable when new data arrives.
- On mobile, collapse secondary detail rather than shrinking everything into unreadable tiles.
