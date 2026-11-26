# Continuum Chase on the web

The 3.36 km route takes Stan and Zebra through Cinema Row, the Continuum, Ad Exchange, the Service District, and Transit Access. Stay ahead of the pursuit, jump or steer around the lit barriers, and use Burst when the pursuit meter rises. The run ends at the transit tunnel. A retry resumes from the latest district checkpoint.

Throw a bottle when the targeting brackets appear around a drone. Drop an oil slick when a bike is behind you and hold your line long enough for its tire to cross the spill. Both moves recharge during play and reset at a checkpoint. Keyboard, Xbox-format gamepad, and touch controls are available.

Start a local development server with `npm ci` and `npm run dev` in `web/`. Build the static release with `npm run build` and serve it on a local HTTP server with `npm run preview`. WebGL 2 is required.

## Models and effects

The browser assets in `public/models/` derive from the paid Tripo outputs documented in [HERO_ASSETS.json](../docs/HERO_ASSETS.json). They retain Stan's separate humanoid skeleton and Zebra's equine skeleton. The runtime mounts Stan at the saddle and solves the equine gait, rider pose, and rein positions together. The browser streams sections of the city and renders live planar reflections through animated puddles. The falling green glyphs use an original atlas and depth layers. Reflections and rain scale with device performance and respect reduced-motion settings.

Ad Exchange alternates motion screens on both sides of the road at roughly ten-foot intervals. Four looping in-world ads share a single animated texture. The [artwork manifest](ads.manifest.json) records the source images and generation prompt used for their photographic layers.

To regenerate the web GLBs, make sure the original hero models have been pulled with Git LFS and Pillow is installed. Run `python web/tools/export_hero_models.py` from the repository root. The optimized browser models are stored directly in Git so static deployments can build from a standard checkout.

## Release checks

- Start at the Cinema Row mount and reach all five district checkpoints.
- Hit a bike with oil, down a drone with a bottle, and use Burst to reduce pursuit pressure.
- Verify the cabernet spill, the scripted bike crash, Kevin’s tunnel cameo, and the finish.
- Confirm pause freezes progress, a failed run can retry its checkpoint, and a finished run can start over.
- Check touch controls, puddle reflections, and green rain in mobile WebKit and measure frame time through a full desktop run.
