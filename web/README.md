# Continuum Chase on the web

Each 6.6 km lap takes Stan and Zebra through five city districts, the 438 m transit tunnel, Flooded Maglev Terminal, Ghostline Relay, Neon Spillway, the Museum of Everything, the Factory of Artificial Suffering, and the Final Draft Grid. Zebra cruises at 110 km/h. Jump over parked cars and low obstructions, slide under overhead obstacles and sentry pulses, and leave the red target circle to dodge an incoming rocket. City traffic often fills two lanes. Jump toward the illuminated rear of a bus to land on its roof, run over it, and collect the rooftop bottles. Jump or steer around the maglev wakes. Press Burst once to spend the full available charge. More charge makes it last longer. The Final Draft Grid loops back to Cinema Row with health, distance, and score carried over. Later laps bring faster bikes and more frequent rockets. Restart checkpoint is available from the pause and results screens.

Distance and golden wine bottles add points. Consecutive bottles increase the bottle multiplier up to ×5. Miss a bottle or take a hit and the streak starts over. Collect all 262 bottles in a lap without taking damage for a 10,000-point perfect-lap bonus. Restarts restore score and bottle totals at the checkpoint and reset that lap’s perfect attempt. The best score is saved in the current browser.

Fire a bottle when the targeting brackets appear around a drone or sentry. Drop a wine slick when a bike is behind you and hold your line long enough for its tire to cross the spill. Both moves recharge during play and reset at a checkpoint.

| Input | Steer | Jump | Slide | Fire | Wine slick | Burst |
| --- | --- | --- | --- | --- | --- | --- |
| Keyboard | A / D or arrows | W / Up / Space | S / Down | Q | E | Shift |
| Xbox-layout controller | Stick or D-pad left / right | Stick or D-pad up | Stick or D-pad down | A | X | B |
| Touch | Swipe left / right or tap arrows | Swipe up or tap Jump | Swipe down or tap Slide | Fire | Wine | Burst |

Start a local development server with `npm ci` and `npm run dev` in `web/`. Build the static release with `npm run build` and serve it on a local HTTP server with `npm run preview`. WebGL 2 is required.

## Models and effects

The browser assets in `public/models/` derive from the paid Tripo outputs documented in [HERO_ASSETS.json](../docs/HERO_ASSETS.json). They retain Stan's separate humanoid skeleton and Zebra's equine skeleton. The runtime mounts Stan at the saddle and solves the equine gait, rider pose, and rein positions together. The browser streams sections of the city and renders live planar reflections through animated puddles. The falling green glyphs use an original atlas and depth layers. Reflections and rain scale with device performance and respect reduced-motion settings.

Roadside billboards and district marquees play four silent, full-screen parody ads. Each loops in 2.8 seconds and holds its headline for the full duration. Ad Exchange alternates screens on both sides of the road at roughly ten-foot intervals. The screens share one locally hosted video, with a still frame for reduced-motion settings. The [artwork manifest](ads.manifest.json) records their source and how to regenerate the video.

The audio mix uses edited CC0 field recordings and foley from BigSoundBank. Rain, wind, and drone rotors run as mixed loops. Hoof sounds follow the gait, and actions, impacts, skids, train passes, wakes, and checkpoints have dedicated cues. See the [audio credits](public/audio/sources.json) for sources and edit ranges.

The street kit uses [Poly Haven’s Hidden Alley collection](https://polyhaven.com/collections/hidden_alley) under [CC0](https://polyhaven.com/license). Apartment and factory façades keep their textured brickwork, window trim, and recessed entries. The game streams those detailed models near the camera and uses lower-cost silhouettes farther away. The [façade records](public/environment/facades/sources.json), [street-prop credits](public/environment/street/README.md), and [night lighting source](public/environment/lighting/source.json) document the prepared files and their artists.

Cinema Row, the Continuum, and Ad Exchange use glazed commercial modules from the free Standard edition of [Quaternius’s Downtown City MegaKit](https://quaternius.com/packs/downtowncitymegakit.html), also CC0. The [downtown asset record](public/environment/downtown/sources.json) documents the adapted modules. The street dressing adds opening storefronts, illuminated signs, skybridges, side streets, hover taxis, and pedestrians under umbrellas.

The maglev trains use an original streamlined body, wraparound glass, and CC0 surface maps recorded in the [terminal material credits](public/environment/maglev/sources.json). A train pass pushes a curling wake across the flooded lane and leaves drifting foam and spray. Zebra’s hooves send out droplets and ripples from their actual contact points, with stronger splashes after jumps.

The extended route adds rolling glyph walls, a pink storm channel, an illuminated gallery, animated furnace machinery, and a bridge traced in blue light. The spillway reuses the CC0 Quaternius city modules. The [course material credits](public/environment/course/sources.json) record the prepared CC0 concrete, marble, and corrugated iron textures from Poly Haven. Zebra goes almost broadside and spreads all four hooves to slide. Stan vaults over the low obstacle, spins 360 degrees with his glass upright, and lands back on the saddle. The skidding hooves leave trails and throw spray on wet roads.

To regenerate the web GLBs, make sure the original hero models have been pulled with Git LFS and Pillow is installed. Run `python web/tools/export_hero_models.py` from the repository root. The optimized browser models are stored directly in Git so static deployments can build from a standard checkout.

## Release checks

- Start at the Cinema Row mount and reach all eleven checkpoints in a lap.
- Verify stick, D-pad, keyboard, and swipe jumps and slides. Jump over a car and slide under an overhead obstruction. Verify each takes health on contact. Check that Stan clears the beam, keeps his glass level through the full turn, and lands on Zebra again.
- Jump onto a bus, collect its roof bottles, and run off the front. Check that the high score survives reload and a clean sweep of the route earns the perfect-lap bonus.
- Fight a sentry in the extended subway. Verify that the lane pulse takes health and an aimed bottle can disable the sentry.
- Hit a bike with wine, down a drone with a bottle, and use Burst to pull away.
- Dodge a drone rocket, then let one connect. Verify the explosion follows the actual point of impact and a direct hit takes health.
- Verify the cabernet spill, the scripted bike crash, Kevin’s cameo, the maglev checkpoint, and the transition into another lap after the Final Draft Grid.
- Verify a warned train wake takes health when it connects and can be jumped or steered around.
- Confirm pause freezes progress, a failed run can retry its checkpoint, and a finished run can start over.
- Confirm the four screen channels play silently, pause with the chase, and show a still when reduced motion is enabled.
- Check touch controls, puddle reflections, and green rain in mobile WebKit and measure frame time through a full desktop run.
