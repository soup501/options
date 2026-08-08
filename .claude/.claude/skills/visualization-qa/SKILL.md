---
name: visualization-qa
description: Review and test interactive visualizations for correctness, usability, accessibility, responsiveness, performance, and misleading encodings. Use before finishing any interactive chart, dashboard, diagram, simulation, or visual explainer.
---
# Visualization QA

Perform a final pass across correctness, interaction, accessibility, and resilience.

- Verify numbers, units, domains, ordering, aggregation, labels, and simulated-vs-real provenance.
- Test initial, selected, reset, empty, invalid, loading, and error states.
- Confirm essential information is available without hover and keyboard focus is visible.
- Check color contrast and ensure meaning is not encoded by color alone.
- Test narrow mobile portrait and a large desktop viewport; check touch targets and overflow.
- Check resize behavior, long labels, large/small values, missing data, and zero/negative values where applicable.
- For animation, test pause/reset, reduced motion, tab visibility, and runaway render loops.
- For shareable state, reload copied URLs and verify the same state is restored.
- Prefer a small number of high-value tests over brittle pixel-perfect assertions.
- Do not declare completion while console errors, broken controls, clipped labels, or misleading scales remain.
