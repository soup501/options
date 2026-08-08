---
name: d3-svg-visualization
description: Create bespoke interactive charts and graph visualizations using SVG, D3, or equivalent browser primitives. Use when custom axes, annotations, labels, transitions, brushing, zooming, or data-driven geometry are central to the visualization.
---
# D3 and SVG Visualization

- Start from the analytical question and choose the simplest truthful visual encoding.
- Prefer SVG for labeled, inspectable, moderate-size marks; use Canvas only when mark count or redraw frequency demands it.
- Use scales consistently and show units. Avoid truncated domains unless clearly intentional and labeled.
- Prefer direct labels and annotations over detached legends where space allows.
- Keep core values visible without hover; tooltips should add detail, not carry the whole story.
- Support resize with a viewBox or explicit responsive recomputation.
- For interaction, define selected, hovered/focused, filtered, empty, and reset states.
- If using D3, let D3 own geometry/scales and the host framework own application state unless a simpler pattern is obvious.
- Validate missing values, sorting, aggregation, time zones, and numeric parsing before rendering.
