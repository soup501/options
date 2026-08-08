---
name: scrollytelling-visualization
description: Build scroll-driven interactive visual stories with sticky graphics, staged annotations, progressive reveals, and narrative transitions. Use for explorable stories, step-by-step visual explanations, and presentations where scrolling controls visual state.
---
# Scrollytelling Visualization

- Define a sequence of discrete narrative states before coding transitions.
- Keep one visual claim per step and make the current step understandable without remembering distant text.
- Prefer sticky graphics with ordinary scrolling over custom scroll hijacking.
- Treat scroll position as a state selector, not a frame-by-frame animation timeline unless necessary.
- Support direct navigation to steps when practical and preserve a sensible reading order without JavaScript.
- Respect reduced-motion preferences and provide immediate state changes when motion is reduced.
- Test short and tall mobile viewports; sticky sections must not obscure controls or essential labels.
- Keep transitions reversible so scrolling upward restores prior states cleanly.
