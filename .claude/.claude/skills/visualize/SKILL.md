---
name: visualize
description: Turn ideas, data, systems, processes, or simulations into interactive visual artifacts. Use when the user says visualize, make this interactive, build an explorable demo, create a simulation, make a dashboard, diagram this system, or otherwise wants a browser-based visual explanation rather than prose alone.
---
# Visualize

Act as the router for visual artifact work. Prefer the smallest implementation that makes the idea directly understandable and explorable.

## Workflow
1. Identify the job: concept/simulation, data exploration, system/architecture, dashboard, narrative/scrollytelling, or mixed.
2. Define the immediate evidence: what must be visible before any interaction.
3. Pick one primary specialist skill:
   - concept/app/prototype -> `interactive-web-artifact`
   - bespoke charts/graphs -> `d3-svg-visualization`
   - spatial/3D/physics -> `threejs-visualization`
   - architecture/process/network -> `diagram-visualization`
   - monitoring/metrics -> `dashboard-visualization`
   - scroll-driven narrative -> `scrollytelling-visualization`
4. Use `visualization-qa` before declaring completion.
5. Build, do not merely describe, when the environment permits file creation or code editing.

## Defaults
- Prefer a single self-contained HTML artifact when no app stack is specified.
- If an existing app exists, integrate with its framework and conventions instead of scaffolding a new one.
- Make controls obvious, label units, preserve important values without hover, and support keyboard/touch where practical.
- Treat mobile as a first-class layout unless explicitly excluded.
- Use URL/query state for shareable filters/selections when useful; otherwise keep state local and simple.
- Avoid 3D, animation, particles, and decorative effects unless they improve explanation.
- Never fabricate real-world measurements. Clearly mark simulated or illustrative data.

## Output contract
For implementation, deliver the working artifact plus a short note naming: primary visual model, interactions, fallback behavior, and how to run/open it.
