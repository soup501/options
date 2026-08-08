---
name: threejs-visualization
description: Build interactive 3D, spatial, physics, particle, or WebGL visualizations with Three.js or equivalent browser rendering. Use when depth, camera movement, spatial relationships, simulation, or GPU-scale rendering carries explanatory value.
---
# Three.js Visualization

Use 3D only when depth or spatial behavior is meaningful.

- Establish world units, coordinate axes, camera, controls, lighting, and object ownership explicitly.
- Separate simulation/model updates from render-loop updates.
- Cap pixel ratio and animation cost for mobile; pause or reduce work when the page is hidden.
- Provide reset-camera and reset-simulation actions.
- Prefer orbit/pan/zoom controls that work with mouse and touch; avoid trapping page scroll unnecessarily.
- Add labels or a 2D overlay for values that must remain legible.
- Make animation speed controllable for explanatory simulations.
- Provide a reduced-motion or static fallback when motion is not essential.
- Dispose geometries, materials, textures, and event listeners when components unmount.
