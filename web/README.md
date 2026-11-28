# Continuum Chase on the web

Each 13.9 km lap takes Stan and Zebra through twenty-two stages. Stages run 606–672 m, with the tunnel and the districts beyond the terminal each running 624 m. After The Rusty Horseshoe, the route continues through the Garden of Unfinished Things, Backlot of Bad Takes, Original Training Archive, Redline Freight Yard, and Curator Uplink. The Uplink loops back to Cinema Row with carried bottles, distance, and score. Later laps bring a faster bike and more frequent rockets. Restart checkpoint is available from the pause and results screens. Setup on the home screen controls sound.

Zebra cruises at 88 km/h on three fixed lanes. Each left or right input moves one lane. Jump over parked cars and cargo, slide under overhead obstacles and sentry pulses, and leave the red target circle to dodge an incoming rocket. Queue your next jump or slide during the current move to start it as soon as Zebra is ready. Traffic often fills two lanes. Line up with a lit ramp to run onto a bus or train and collect the rooftop bottles. You can also jump onto the roof. Jump or change lanes around the maglev wakes. Press Burst once to spend the full available charge. More charge makes it last longer.

The bottle badge shows the bottles you’re carrying. A hit spills them all, and a hit with an empty stash ends the run. The score keeps the points earned from pickups and distance. Consecutive bottles raise the active multiplier up to ×5. Miss a bottle or take a hit and the streak starts over. Collect every bottle in a lap without taking a hit for a 10,000-point perfect-lap bonus. Restarts restore score and carried bottles at the checkpoint and reset that lap’s perfect attempt. The best score is saved in the current browser.

Cork Magnet pulls in bottles from adjoining lanes for eight seconds. Bubble Wrap absorbs one hit within twelve seconds. Double Pour doubles point gains for eight seconds and stacks with the streak multiplier.

One active pursuer chases at a time. The bike stays in view behind Zebra in the street sections and gives way to the drone in its attack sectors. Fire a bottle when the targeting brackets appear around a drone or sentry. When the bike lines up, Wine turns amber and reads “Bike close.” Drop the slick and hold your line long enough for the bike’s tire to cross it. Both attacks dim while recharging and reset at a checkpoint.

| Input | Change lanes | Jump | Slide | Fire | Wine slick | Burst |
| --- | --- | --- | --- | --- | --- | --- |
| Keyboard | A / D or arrows | W / Up / Space | S / Down | Q | E | Shift |
| Xbox-layout controller | Stick or D-pad left / right | Stick or D-pad up | Stick or D-pad down | A | X | B |
| Touch | Swipe left / right or tap either side of the road | Swipe up | Swipe down | Fire (right) | Wine (center) | Burst (left) |

Start a local development server with `npm ci` and `npm run dev` in `web/`. Build the static release with `npm run build` and serve it on a local HTTP server with `npm run preview`. WebGL 2 is required.

## Models and effects

The browser assets in `public/models/` derive from the paid Tripo outputs documented in [HERO_ASSETS.json](../docs/HERO_ASSETS.json). They retain Stan's separate humanoid skeleton and Zebra's equine skeleton. The runtime mounts Stan at the saddle and solves the equine gait, rider pose, and rein positions together. The browser streams sections of the city and renders live planar reflections through animated puddles. The falling green glyphs use an original atlas and depth layers. Reflections and rain scale with device performance and respect reduced-motion settings.

Roadside billboards and district marquees play four silent, full-screen parody ads. Each loops in 2.8 seconds and holds its headline for the full duration. Ad Exchange alternates screens on both sides of the road at roughly ten-foot intervals. The screens share one locally hosted video, with a still frame for reduced-motion settings. The [artwork manifest](ads.manifest.json) records their source and how to regenerate the video.

The audio mix uses edited CC0 field recordings and foley from BigSoundBank. Rain, wind, and drone rotors run as mixed loops. Hoof sounds follow the gait, and actions, impacts, skids, train passes, wakes, and checkpoints have dedicated cues. See the [audio credits](public/audio/sources.json) for sources and edit ranges.

Zebra’s slide uses “Slowdown.” Sound Effect by [freesound_community](https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=92003) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=92003). [Pixabay sound effects library](https://pixabay.com/sound-effects/search/bullet-time/)

The street kit uses [Poly Haven’s Hidden Alley collection](https://polyhaven.com/collections/hidden_alley) under [CC0](https://polyhaven.com/license). Apartment and factory façades keep their textured brickwork, window trim, and recessed entries. The game streams those detailed models near the camera and uses lower-cost silhouettes farther away. The [façade records](public/environment/facades/sources.json), [street-prop credits](public/environment/street/README.md), and [night lighting source](public/environment/lighting/source.json) document the prepared files and their artists.

Cinema Row, the Continuum, and Ad Exchange use glazed commercial modules from the free Standard edition of [Quaternius’s Downtown City MegaKit](https://quaternius.com/packs/downtowncitymegakit.html), also CC0. The [downtown asset record](public/environment/downtown/sources.json) documents the adapted modules. The street dressing adds opening storefronts, illuminated signs, skybridges, side streets, hover taxis, and pedestrians under umbrellas.

The maglev trains use an original streamlined body, wraparound glass, and CC0 surface maps recorded in the [terminal material credits](public/environment/maglev/sources.json). A train pass pushes a curling wake across the flooded lane and leaves drifting foam and spray. Zebra’s hooves send out droplets and ripples from their actual contact points, with stronger splashes after jumps.

The extended route adds rolling glyph walls, a pink storm channel, an illuminated gallery, animated furnace machinery, and a bridge traced in blue light. The spillway reuses the CC0 Quaternius city modules. The [course material credits](public/environment/course/sources.json) record the prepared CC0 concrete, marble, and corrugated iron textures from Poly Haven. Zebra goes almost broadside and spreads all four hooves to slide. Stan vaults over the low obstacle, spins 360 degrees with his glass upright, and lands back on the saddle. The skidding hooves leave trails and throw spray on wet roads.

The five districts beyond the Grid add a glass aquarium tunnel with animated water and jellyfish, neon roof markets, a salvage yard for retired machines, a sunrise suspension bridge with a rideable train, and Zebra’s pub with a marquee for Kevin’s poetry set. Sunbreak Causeway has three flybys by an original twin-fan patrol craft with sweeping searchlights. The Rainmarket reuses the downtown modules, and the Horseshoe reuses the Hidden Alley facades.

Beyond the Horseshoe, the conservatory has procedural foliage and luminous blossoms. The backlot uses moving painted scenery and camera rigs, and the archive has illuminated manuscript stacks. The freight yard adds stacked containers, cargo cranes, and two rideable trains. Antennas rise over the skyline in Curator Uplink. The extended Transit Tunnel adds inspection bays and a third train. The museum, factory, graveyard, and Causeway add gallery lighting, furnace details, salvaged machinery, and detailed window façades.

To regenerate the web GLBs, make sure the original hero models have been pulled with Git LFS and Pillow is installed. Run `python web/tools/export_hero_models.py` from the repository root. The optimized browser models are stored directly in Git so static deployments can build from a standard checkout.

## Release checks

- Start at the Cinema Row mount and reach all twenty-one checkpoints in a lap.
- Verify stick, D-pad, keyboard, and swipe jumps and slides. Jump over a car and slide under an overhead obstruction. Verify that a hit empties carried bottles and a hit without bottles ends the run. Check that Stan clears the beam, keeps his glass level through the full turn, and lands on Zebra again.
- Chain a slide into a jump and a jump into a slide. Listen for one Slowdown cue per slide.
- Run up a bus ramp and a train ramp, collect their roof bottles, and run off the front. Verify that jumping onto a roof still works. Check that the high score survives reload and a clean sweep earns the perfect-lap bonus.
- Verify each lane input moves only one slot. Collect each power-up and verify its effect and expiration.
- Fight a sentry in the extended subway. Verify that the lane pulse counts as a hit and an aimed bottle can disable the sentry.
- Hit a bike with wine, down a drone with a bottle, and use Burst to pull away.
- Dodge a drone rocket, then let one connect. Verify the explosion follows the actual point of impact and the bike stays offscreen during the drone encounter.
- Verify the cabernet spill, the scripted bike crash, Kevin’s cameo, the maglev checkpoint, the trains at Sunbreak Causeway and Redline Freight Yard, and the transition into another lap after Curator Uplink.
- Verify that a train wake counts as a hit and can be jumped or steered around.
- Confirm pause freezes progress, a failed run can retry its checkpoint, and a finished run can start over.
- Confirm the four screen channels play silently, pause with the chase, and show a still when reduced motion is enabled.
- Check touch controls, puddle reflections, and green rain in mobile WebKit and measure frame time through a full desktop run.
