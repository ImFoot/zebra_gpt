# Continuum Chase on the web

Each lap takes Stan and Zebra through five city districts, the transit tunnel, and the Flooded Maglev Terminal. Zebra cruises at 110 km/h. Jump or steer around the barriers and train wakes, and leave the red target circle to dodge an incoming rocket. Press Burst once to spend the full available charge. More charge makes it last longer. The terminal exit loops back to Cinema Row with health and distance carried over. Later laps bring faster bikes and more frequent rockets. Restart checkpoint is available from the pause and results screens.

Throw a bottle when the targeting brackets appear around a drone. Drop a wine slick when a bike is behind you and hold your line long enough for its tire to cross the spill. Both moves recharge during play and reset at a checkpoint. Keyboard, Xbox-format gamepad, and touch controls are available.

Start a local development server with `npm ci` and `npm run dev` in `web/`. Build the static release with `npm run build` and serve it on a local HTTP server with `npm run preview`. WebGL 2 is required.

## Models and effects

The browser assets in `public/models/` derive from the paid Tripo outputs documented in [HERO_ASSETS.json](../docs/HERO_ASSETS.json). They retain Stan's separate humanoid skeleton and Zebra's equine skeleton. The runtime mounts Stan at the saddle and solves the equine gait, rider pose, and rein positions together. The browser streams sections of the city and renders live planar reflections through animated puddles. The falling green glyphs use an original atlas and depth layers. Reflections and rain scale with device performance and respect reduced-motion settings.

Roadside billboards and district marquees play four silent, full-screen parody ads. Each loops in 2.8 seconds and holds its headline for the full duration. Ad Exchange alternates screens on both sides of the road at roughly ten-foot intervals. The screens share one locally hosted video, with a still frame for reduced-motion settings. The [artwork manifest](ads.manifest.json) records their source and how to regenerate the video.

The audio mix uses edited CC0 field recordings and foley from BigSoundBank. Rain, wind, and drone rotors run as mixed loops. Hoof sounds follow the gait, and actions, impacts, skids, train passes, wakes, and checkpoints have dedicated cues. See the [audio credits](public/audio/sources.json) for sources and edit ranges.

The street kit uses [Poly Haven’s Hidden Alley collection](https://polyhaven.com/collections/hidden_alley) under [CC0](https://polyhaven.com/license). Apartment and factory façades keep their textured brickwork, window trim, and recessed entries. The game streams those detailed models near the camera and uses lower-cost silhouettes farther away. The [façade records](public/environment/facades/sources.json), [street-prop credits](public/environment/street/README.md), and [night lighting source](public/environment/lighting/source.json) document the prepared files and their artists.

Cinema Row, the Continuum, and Ad Exchange use glazed commercial modules from the free Standard edition of [Quaternius’s Downtown City MegaKit](https://quaternius.com/packs/downtowncitymegakit.html), also CC0. The [downtown asset record](public/environment/downtown/sources.json) documents the adapted modules. The street dressing adds opening storefronts, illuminated signs, skybridges, side streets, hover taxis, and pedestrians under umbrellas.

To regenerate the web GLBs, make sure the original hero models have been pulled with Git LFS and Pillow is installed. Run `python web/tools/export_hero_models.py` from the repository root. The optimized browser models are stored directly in Git so static deployments can build from a standard checkout.

## Release checks

- Start at the Cinema Row mount and reach all five district checkpoints.
- Hit a bike with wine, down a drone with a bottle, and use Burst to pull away.
- Dodge a drone rocket, then let one connect. Verify the explosion follows the actual point of impact and a direct hit takes health.
- Verify the cabernet spill, the scripted bike crash, Kevin’s cameo, the maglev checkpoint, and the transition into another lap after the terminal.
- Verify a warned train wake takes health when it connects and can be jumped or steered around.
- Confirm pause freezes progress, a failed run can retry its checkpoint, and a finished run can start over.
- Confirm the four screen channels play silently, pause with the chase, and show a still when reduced motion is enabled.
- Check touch controls, puddle reflections, and green rain in mobile WebKit and measure frame time through a full desktop run.
