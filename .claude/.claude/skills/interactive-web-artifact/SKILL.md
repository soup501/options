---
name: interactive-web-artifact
description: Build interactive browser artifacts, demos, simulators, explainers, and lightweight apps with HTML/CSS/JavaScript or the repository's existing React/Next.js stack. Use for concept visualizations and interactive prototypes that are not primarily charts, diagrams, or 3D scenes.
---
# Interactive Web Artifact

Build the interaction first, then polish.

- Reuse the host project's framework, components, and package manager when present.
- For standalone output, prefer one self-contained HTML file with embedded CSS and JavaScript unless dependencies materially help.
- Model explicit state: inputs, derived values, selected object, playback state, reset state, and error state.
- Provide direct-manipulation controls when useful: sliders, toggles, drag, scrub, play/pause, reset.
- Keep the main explanatory object above secondary controls on narrow screens.
- Use semantic HTML and visible focus states; do not make hover the only path to information.
- For simulations, separate model math from rendering and make timestep/units explicit.
- Add a deterministic default state so the artifact is meaningful immediately on load.
- Prefer CSS/SVG/Canvas over image assets when geometry can be generated cleanly.
