# Continuum Chase on the web

The route takes Stan and Zebra from Cinema Row to the transit tunnel. Dodge or jump the lit barriers, ride out a drone flyby, and watch Stan lose his cabernet. Three collisions end the run. A retry resumes from the last checkpoint reached.

Start a local development server with `npm ci` and `npm run dev` in `web/`. Build the static release with `npm run build` and serve it on a local HTTP server with `npm run preview`. WebGL 2 is required.

## Models and effects

The browser assets in `public/models/` derive from the paid Tripo outputs documented in [HERO_ASSETS.json](../docs/HERO_ASSETS.json). They retain Stan's separate humanoid skeleton and Zebra's equine skeleton. The runtime mounts Stan at the saddle and solves the equine gait, rider pose, and rein positions together. The city geometry, road textures, billboards, drone, weather effects, and audio are built in the browser.

To regenerate the web GLBs, make sure the original hero models have been pulled with Git LFS and Pillow is installed. Run `python web/tools/export_hero_models.py` from the repository root. The optimized browser models are stored directly in Git so static deployments can build from a standard checkout.

## Release checks

- Start from the title, clear the first barrier with Space, and steer around or jump later barriers.
- Confirm the drone message and flyby, the slow-motion wine spill, and the tunnel finish.
- Confirm pause freezes progress, a failed run can retry, and a finished run can start over.
- Measure frame time through a full chase on desktop. The initial integrated-graphics target is 30 FPS.
