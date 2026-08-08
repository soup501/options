---
name: diagram-visualization
description: Visualize software architecture, data flows, processes, state machines, entity relationships, timelines, and node-link systems. Use for architecture diagrams, C4/UML-like views, sequence flows, dependency graphs, process maps, and system explainers.
---
# Diagram Visualization

- Choose diagram grammar from the question: boxes/arrows, sequence lanes, state machine, ERD, hierarchy/tree, dependency graph, or timeline.
- Prefer Mermaid/D2/DOT when a textual diagram is sufficient and editable; use custom SVG/HTML when richer interaction is required.
- Make edge direction and semantics explicit. Label relationships instead of relying on line style alone.
- Keep node labels short; move details into expandable panels or tooltips.
- For large graphs, provide filtering, search, grouping, zoom-to-fit, and stable layout.
- Avoid hairball force layouts when hierarchy, lanes, or clustering can communicate structure more clearly.
- Preserve a readable static state for screenshots and exports.
- For architecture, distinguish runtime flow, ownership boundaries, storage, external systems, and trust/security boundaries when known.
