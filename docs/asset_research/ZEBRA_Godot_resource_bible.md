# ZEBRA!! — Godot Free Asset Resource Bible

**Research date:** 2026-11-19 | **Source:** expanded film treatment + concept archive.

## Production guidance

### Adaptation scope

Proposed, not part of the film canon: a 30-45 minute linear stylized 3D PC game in Godot 4.x (start with 4.6-compatible stable releases). Keyboard/mouse and Xbox-style gamepad. Third-person chase and short exploration/dialogue rooms; not an open world, shooter simulator, or photorealistic recreation. Use 2D stills for transitions only after clearance.

### Art direction

Use IMG-01 as silhouette and palette reference, not as a 3D asset. Low-poly geometry with dark leather-like materials, green emissive code, chrome-looking robots, wet road highlights, warm amber workshop and bar. Keep the joke in the earnest cinematic presentation; do not chase film-level fidelity.

### Priority conventions

P0 = needed for a first playable slice; P1 = production polish or secondary scenes; P2 = optional/alternative. Choose one environment kit and one robot pack for the slice; do not ingest every library.

### Free vs licensed

All catalog entries have a free access route identified at publisher level, but some are free subsets or donation/name-your-price downloads. CC0 allows modification and commercial use without required credit; MIT code requires copyright/license preservation; CC BY 4.0 music requires attribution and change notices. Sonniss is not CC0: production-use only, no AI training or raw redistribution. Keep license copies and per-file provenance. A free price does not imply public domain.

### IP clearance

The treatment and its 63 images are visual development materials, not blanket rights clearance. Use original character and robot designs, original glyphs and posters, original music and voices. Avoid movie actor likenesses, franchise names/logos, ripped models, exact costumes or copied soundtracks. Parody does not automatically authorize every asset. Clear any art intended for shipping, including supplied image references; ask counsel if needed.

### Known exclusions

A paid CC0 animal pack that contains both owl and zebra was excluded because checkout requires payment. The exact humanoid owl, adult rideable zebra with matching animations, film-like robot motorcycles, and original hero props were not verified as free ready-to-use assets. Native camera (Camera3D + SpringArm3D + AnimationPlayer) preferred; Phantom Camera repository has an explicit AI/LLM policy, so it is not recommended for an AI-driven workflow without clarification.

### Verification boundary

Public publisher pages and licenses were reviewed on 2026-11-19. No third-party archives were downloaded, files inspected, import tested or benchmarked. Counts for free subsets, precise file names and engine compatibility may vary; confirm each package on download. This is a procurement and integration bible, not a shipped asset bundle.

### Audio and accessibility

Use AudioStreamPlayer3D for world sound, separate Music/SFX/Dialogue/UI buses, WAV for short effects and Ogg Vorbis for music loops. Normalize with headroom; implement subtitles, volume sliders, reduced camera shake and reduced flashes. Keep dialogue readable, especially during chase.

### Import workflow

Download only the free package; save original archive and license outside the Godot project. Prefer GLB/glTF 2.0. Blender can re-export FBX/BLEND as GLB; OBJ cannot carry rig/animation. Import into an isolated test project; check textures, scale, skeleton, loop flags, root motion, collision and material settings. Create inherited/wrapper scenes and external material overrides so reimport does not wipe edits.

### Rendering targets

Start desktop Forward+ at 1080p / 60 fps as a target, not a measured guarantee. Use 1K/2K textures, baked/static lighting where viable, limited shadow-casting lights, simple collision, pooled particles and projectiles, MultiMeshInstance3D for repeated street props, LOD and visibility ranges. Use SSR only if budget allows; rain puddles can use reflection probes. Test on lower settings too.

### Mounted movement

Zebra is a CharacterBody3D with a collision capsule, AnimationTree or AnimationPlayer; mount point Marker3D or BoneAttachment3D drives Hoot. One motion authority for gameplay, synchronize visual horse stride to speed and blend upper-body rider gestures independently. Add short scripted jumps; do not implement full horse physics. Chase: Path3D with lane offset, deterministic obstacles, checkpoint reset and camera easing.

### Scene architecture

Reuse city block and corridor modular scenes. NavigationRegion3D for simple enemies; Area3D for story triggers; PathFollow3D for drone/bike actors; Control nodes for HUD; AnimationPlayer for intro/outro and glass break. Art and behavior separated, each scene assembled from candidate IDs. Use native camera and JSON or Resource-based dialogue initially.

### Ingestion ledger

For each actual file, record AS-ID, exact source URL, publisher, downloaded date, version, original archive filename, license text file, sha256, derived paths, changes, assigned G/scene IDs, Godot version, test results and approval. Store raw assets outside repo if not needed; never commit restricted raw audio to a shared repo. Track missing assets and substitutions instead of silently using them.

### Build order

Gate A: city street, placeholder rider and horse, one robot, one obstacle, working chase camera and input. Gate B: recognizable Hoot/Zebra, stride sync, robot encounter and glass-break beat. Gate C: Museum, Kevin dialogue and final drawing choice. Gate D: link intro, factory/garden montage, finale and bar; polish audio, performance, credits and accessibility. Finish one 5-minute slice before building all levels.

### AI handoff

Use this JSON alongside ZEBRA_complete_treatment.json and ZEBRA_complete_artwork.zip. Do not treat concept_image_ids as downloadable game meshes. Resolve AS IDs against assets; C IDs describe original work. Agent should propose a small acquisition list, ask before accepting restricted EULAs, then fill ingestion ledger and implement one scene at a time. Never replace canonical story or artwork silently.

## Scene-to-resource matrix

### G01 — Rocket cold open

1-2 min; on-rails cinematic, no separate flight system.

Rocket silhouette, cape, glass, moon, space backdrop, thought bubble; brief title smash.

Treatment: S11, S35 | Concept art: IMG-02, IMG-03, IMG-04, IMG-05, IMG-06

Candidate IDs: AS-002, AS-019, AS-020, AS-025, AS-026, AS-029, AS-032, AS-034

### G02 — An ordinary Tuesday / final cinema

3-5 min; walk, inspect, dialogue, scripted ambush.

Apartment, movie screen, theater seats, Director, robot threat, original parody posters.

Treatment: S12, S13, S14 | Concept art: none assigned

Candidate IDs: AS-001, AS-003, AS-005, AS-006, AS-007, AS-008, AS-009, AS-010, AS-012, AS-016, AS-017, AS-018, AS-021, AS-026, AS-027, AS-028, AS-029, AS-030, AS-031, AS-032, AS-035, AS-036, AS-037

### G03 — Zebra chase

5-8 min; lane dodge, jump, obstacles, scripted camera shots.

Hoot on Zebra, wet city, red-eyed robots, motorcycles or hover-bikes, drones, billboard faces, explosions.

Treatment: S16 | Concept art: IMG-01, IMG-29, IMG-30, IMG-31, IMG-32, IMG-34, IMG-35, IMG-37, IMG-38, IMG-39, IMG-40, IMG-62

Candidate IDs: AS-003, AS-004, AS-006, AS-008, AS-009, AS-010, AS-013, AS-018, AS-020, AS-021, AS-022, AS-026, AS-027, AS-028, AS-029, AS-030, AS-032, AS-036

### G04 — Kevin / Museum of Everything

4-6 min; interact with Kevin, select the child drawing.

Tunnel bench, poet robot, framed originals and repeated paintings, museum corridor, crude drawing.

Treatment: S17, S18 | Concept art: IMG-16, IMG-17, IMG-18, IMG-19, IMG-20, IMG-21, IMG-22, IMG-23, IMG-24, IMG-25, IMG-26, IMG-27, IMG-28, IMG-54, IMG-59

Candidate IDs: AS-005, AS-006, AS-007, AS-013, AS-016, AS-023, AS-032, AS-034, AS-035, AS-037

### G05 — Factory / Garden of Unfinished Things

4-6 min; light puzzle and conversation, optional montage.

Conveyor props, fake emotional backstory terminals, warm workshop, handmade chair and tools.

Treatment: S19, S20 | Concept art: IMG-14

Candidate IDs: AS-001, AS-007, AS-011, AS-013, AS-014, AS-015, AS-016, AS-023, AS-024, AS-027, AS-029, AS-031, AS-032, AS-033, AS-037

### G06 — Origin / Curator offer

3-4 min; dialogue and reject/accept prompt (canonical rejection).

Prompt screen, luxury room, wine, books, recurring thought bubble.

Treatment: S22, S23 | Concept art: IMG-01, IMG-03

Candidate IDs: AS-002, AS-016, AS-017, AS-024, AS-027, AS-031, AS-037

### G07 — Final Draft assault / rescue

5-8 min; traverse corridor, evade robots, rescue Zebra, glass breaks.

Tower, bridge chunks, robot squad, drone, Kevin poetry event, shader disruption, breakable glass.

Treatment: S24, S25 | Concept art: IMG-01, IMG-07, IMG-08, IMG-09, IMG-10, IMG-11, IMG-12, IMG-13

Candidate IDs: AS-003, AS-004, AS-005, AS-006, AS-007, AS-008, AS-009, AS-010, AS-011, AS-013, AS-014, AS-020, AS-023, AS-026, AS-028, AS-029, AS-030, AS-032, AS-033, AS-036

### G08 — Last Original Thought / final confrontation

3-4 min; draw/choose an imperfect zebra and disable optimization.

Wood table, paper, pencil, Curator terminal, imperfect and perfect drawings.

Treatment: S26, S27 | Concept art: none assigned

Candidate IDs: AS-007, AS-013, AS-016, AS-027, AS-028, AS-029, AS-031, AS-037

### G09 — Epilogue / rocket / post-credits

2-3 min; bar vignette and in-engine or illustrated end scene.

Bar, drawing, Kevin poetry, rocket, robot terminal and final gag.

Treatment: S28, S29, S30 | Concept art: IMG-01, IMG-04

Candidate IDs: AS-002, AS-003, AS-006, AS-012, AS-013, AS-016, AS-017, AS-019, AS-020, AS-024, AS-025, AS-026, AS-027, AS-029, AS-031, AS-032, AS-034, AS-035, AS-037

## Asset catalog

### AS-001 — Universal Base Characters

[Quaternius](https://quaternius.com/packs/universalbasecharacters.html) | Character & animation | P0 | CC0

**Access:** Free Standard subset | **Formats:** glTF / FBX

Humanoid rig for Hoot and Director; customize silhouette, feathers, coat and boots.

**Caveat:** Not an owl or finished costume; paid Source project and extra models excluded.

Treatment: S04, S08, S12, S20

### AS-002 — Cute Pets & Wildlife FREE Sample

[Vuena](https://vuena.itch.io/blocky-pets-free) | Character & animation | P0 | CC0

**Access:** Free sample; choose zero-price download | **Formats:** GLB / FBX

Owl head design starter; eyes, beak and simple facial motion reference.

**Caveat:** Quadruped/bird-style toy rig, not a humanoid. Only the free sample; transplant head geometry in Blender or use as a placeholder.

Treatment: S04, S11, S22, S29

### AS-003 — LowPoly Animated Animals

[Quaternius](https://quaternius.itch.io/lowpoly-animated-animals) | Character & animation | P0 | CC0

**Access:** Name your own price; zero available | **Formats:** FBX / BLEND

Horse base for Zebra: repaint stripes, add muzzle details, mane, aviators and saddle. Use walk/run/jump clips.

**Caveat:** Not a verified finished zebra; inspect the horse rig and create gallop and rider synchronization if needed.

Treatment: S05, S14, S16, S25, S29

### AS-004 — Ultimate Animated Animal Pack

[Quaternius](https://quaternius.com/packs/ultimateanimatedanimals.html) | Character & animation | P1 | CC0

**Access:** Free download | **Formats:** GLTF / FBX / BLEND

Alternative quadruped animation source and animal NPCs; pack advertises gallop among its actions.

**Caveat:** Confirm which clips belong to candidate animal before selecting. Do not retarget humanoid clips onto a quadruped.

Treatment: S05, S16, S25

### AS-005 — Universal Animation Library

[Quaternius](https://quaternius.com/packs/universalanimationlibrary.html) | Character & animation | P0 | CC0

**Access:** Free Standard subset | **Formats:** GLB / FBX

Humanoid locomotion, combat, emotes; retarget to Hoot and human NPCs.

**Caveat:** Full library and Blender source are not guaranteed free. Mounted, smoking, drinking, and rescue poses require custom animation.

Treatment: S04, S08, S14, S17, S24, S25

### AS-006 — Cyberpunk Game Kit

[Quaternius](https://quaternius.com/packs/cyberpunkgamekit.html) | Character & animation | P0 | CC0

**Access:** Free download | **Formats:** GLTF / FBX / BLEND

Animated enemies, turrets, sci-fi obstacles and modular platforms; Kevin and opposing robots.

**Caveat:** Original robots, not licensed Terminator replicas. Recolor Kevin, add distinct chest panel and expressive eye emissives.

Treatment: S07, S09, S14, S16, S17, S24, S30

### AS-007 — Sci-Fi Essentials Kit

[Quaternius](https://quaternius.com/packs/scifiessentialskit) | Character & animation | P1 | CC0

**Access:** Free Standard subset | **Formats:** GLTF / FBX / OBJ

Alternative robot enemies, equipment, screens, crates and futuristic weapons for game props.

**Caveat:** Custom Godot shaders and prepared source projects are paid-tier features; rebuild any needed effects.

Treatment: S06, S07, S14, S17, S19, S24, S27

### AS-008 — Downtown City MegaKit

[Quaternius](https://quaternius.com/packs/downtowncitymegakit.html) | City & environments | P0 | CC0

**Access:** Free Standard subset | **Formats:** GLTF / FBX

Detailed modular city facades and street components for a single reusable city block.

**Caveat:** Free subset only. Source window shader and collisions not included as a promise; create own.

Treatment: S09, S12, S14, S16, S24, S32

### AS-009 — City Kit (Commercial)

[Kenney](https://kenney.nl/assets/city-kit-commercial) | City & environments | P1 | CC0

**Access:** Free download | **Formats:** 3D models; inspect archive

Alternative quick skyline and office towers, distant silhouettes.

**Caveat:** Choose either this or Downtown as primary geometry; avoid visibly mixed scale and style.

Treatment: S09, S12, S16, S24

### AS-010 — City Kit (Roads)

[Kenney](https://kenney.nl/assets/city-kit-roads) | City & environments | P0 | CC0

**Access:** Free download | **Formats:** 3D models; inspect archive

Intersections, roads, signs and traffic-light props for chase blockout.

**Caveat:** Align tile scale to city kit; override materials for wet streets.

Treatment: S09, S14, S16, S24

### AS-011 — City Kit (Industrial)

[Kenney](https://kenney.nl/assets/city-kit-industrial) | City & environments | P1 | CC0

**Access:** Free download | **Formats:** 3D models; inspect archive

Warehouses and industrial silhouettes for factory district.

**Caveat:** Exterior assets, not a finished interior.

Treatment: S19, S24, S32

### AS-012 — Retro Urban Kit

[Kenney](https://kenney.nl/assets/retro-urban-kit) | City & environments | P2 | CC0

**Access:** Free download | **Formats:** 3D models; inspect archive

Secondary retro neighborhood and cinema facade if a PS1-style aesthetic is chosen.

**Caveat:** Use as alternative, not as a second unrelated art style.

Treatment: S12, S13, S28

### AS-013 — Modular Sci-Fi Megakit

[Quaternius](https://quaternius.com/packs/modularscifimegakit.html) | City & environments | P0 | CC0

**Access:** Free Standard subset | **Formats:** GLTF / FBX / OBJ

One corridor kit serves tunnel, factory, tower, archive approach, military post-credits.

**Caveat:** Free models only; add your own collisions, navigation, color masks and lights.

Treatment: S16, S17, S19, S24, S25, S26, S27, S30

### AS-014 — Factory Kit

[Kenney](https://kenney.nl/assets/factory-kit) | City & environments | P1 | CC0

**Access:** Free download | **Formats:** 3D models / animations; inspect archive

Conveyors, industrial equipment and assembly-line satire.

**Caveat:** Use as dressing; animation and interactions still need integration.

Treatment: S19, S24

### AS-015 — Stylized Nature MegaKit

[Quaternius](https://quaternius.com/packs/stylizednaturemegakit.html) | City & environments | P2 | CC0

**Access:** Free Standard subset | **Formats:** GLTF / FBX / OBJ

Trees, flowers, stones and vegetation for the Garden of Unfinished Things.

**Caveat:** Garden can be a single warm workshop with a few plants; wind shader in Source is paid.

Treatment: S20, S33

### AS-016 — Furniture Kit

[Kenney](https://kenney.nl/assets/furniture-kit) | Props & vehicles | P0 | CC0

**Access:** Free download | **Formats:** 3D models; inspect archive

Tables, seating and domestic dressing for apartment, cinema, museum, archive and bar.

**Caveat:** Specific theater rows, ornate frames and woodworking tools may need custom meshes.

Treatment: S12, S13, S18, S20, S23, S26, S28

### AS-017 — Food Kit

[Kenney](https://kenney.nl/assets/food-kit) | Props & vehicles | P1 | CC0

**Access:** Free download | **Formats:** 3D models; inspect archive

Bar and kitchen clutter, food and drink-related dressing.

**Caveat:** Wine glass and bottle availability not confirmed; critical glass is a custom mesh.

Treatment: S12, S23, S28

### AS-018 — Car Kit

[Kenney](https://kenney.nl/assets/car-kit) | Props & vehicles | P1 | CC0

**Access:** Free download | **Formats:** 3D models; inspect archive

Traffic obstacles, wrecked vehicles and street dressing.

**Caveat:** Motorcycle model not confirmed; use scripted hover-bikes or custom simple motorcycle mesh.

Treatment: S09, S14, S16

### AS-019 — Space Kit

[Kenney](https://kenney.nl/assets/space-kit) | Props & vehicles | P1 | CC0

**Access:** Free download | **Formats:** glTF / FBX / OBJ / others

Spaceport objects and ships for the rocket opening and finale; turret/ship geometry may serve as drone base.

**Caveat:** Exact red-and-silver rocket and civilian drone silhouette are custom.

Treatment: S11, S29, S35

### AS-020 — Ultimate Space Kit

[Quaternius](https://quaternius.com/packs/ultimatespacekit.html) | Props & vehicles | P2 | CC0

**Access:** Free download | **Formats:** GLTF / FBX / BLEND

Alternate craft, planets and enemies for drones, orbit and cosmic gags.

**Caveat:** Pick one space style; confirm individual model inventory.

Treatment: S09, S11, S16, S24, S29

### AS-021 — Clean Asphalt

[Poly Haven](https://polyhaven.com/a/clean_asphalt) | Materials & VFX | P0 | CC0

**Access:** Free asset | **Formats:** PBR image maps

Road material; lower roughness selectively with puddle masks, not uniformly.

**Caveat:** Download 1K/2K maps; source material is not inherently wet.

Treatment: S09, S14, S16, S32

### AS-022 — Asphalt 01

[Poly Haven](https://polyhaven.com/a/asphalt_01) | Materials & VFX | P2 | CC0

**Access:** Free asset | **Formats:** PBR image maps

Alternative distressed asphalt and debris zones.

**Caveat:** Do not combine high-resolution maps indiscriminately. Use normal GL map and test tiling.

Treatment: S09, S16, S32

### AS-023 — Poly Haven texture library

[Poly Haven](https://polyhaven.com/textures) | Materials & VFX | P1 | CC0

**Access:** Free library | **Formats:** PBR maps

Search for leather, brushed metal, concrete and wood; apply a cohesive color palette.

**Caveat:** Library, not a selection of specific downloaded files. Pick and log exact asset URLs.

Treatment: S04, S05, S09, S18, S19, S20, S24, S32, S33

### AS-024 — Poly Haven HDRIs

[Poly Haven](https://polyhaven.com/hdris) | Materials & VFX | P1 | CC0

**Access:** Free library | **Formats:** HDR / EXR

Choose neutral industrial or dusk light for reflections; warm workshop environment.

**Caveat:** Use low-res HDRI for reflections; choose exact HDRI at ingestion.

Treatment: S09, S20, S23, S28

### AS-025 — Skyboxes Space

[Kenney](https://kenney.nl/assets/skyboxes-space) | Materials & VFX | P1 | CC0

**Access:** Free download | **Formats:** Skybox textures

Space background for opening and closing; add original planet and moon meshes.

**Caveat:** Check cubemap layout; convert to panorama if needed.

Treatment: S11, S29, S35

### AS-026 — Particle Pack

[Kenney](https://kenney.nl/assets/particle-pack) | Materials & VFX | P0 | CC0

**Access:** Free download | **Formats:** 2D particle textures

Smoke, muzzle flashes, sparks, flames, rain splash and wine droplets via particle billboards.

**Caveat:** Textures only, not complete VFX. Build GPUParticles3D scenes and pool emitters.

Treatment: S04, S11, S14, S16, S24, S25, S29

### AS-027 — UI Pack - Sci-Fi

[Kenney](https://kenney.nl/assets/ui-pack-sci-fi) | UI & audio | P1 | CC0

**Access:** Free download | **Formats:** 2D UI images

Terminal panels, satirical warnings, Curator interface, pause menu.

**Caveat:** Custom typography and layout required; avoid fake platform/browser UI.

Treatment: S06, S13, S16, S19, S23, S27, S30

### AS-028 — Input Prompts

[Kenney](https://kenney.nl/assets/input-prompts) | UI & audio | P0 | CC0

**Access:** Free download | **Formats:** PNG / SVG

Keyboard and Xbox/controller tutorials, interact and dodge hints.

**Caveat:** Detect input device and swap glyphs. Platform branding may have separate policies.

Treatment: S14, S16, S24, S25, S27

### AS-029 — Sci-fi Sounds

[Kenney](https://kenney.nl/assets/sci-fi-sounds) | UI & audio | P0 | CC0

**Access:** Free download | **Formats:** OGG

Thrusters, weapon sounds, mechanical beeps and explosions.

**Caveat:** Layer and mix for impact; not dialogue or music.

Treatment: S11, S14, S16, S19, S24, S27, S30

### AS-030 — Impact Sounds

[Kenney](https://kenney.nl/assets/impact-sounds) | UI & audio | P0 | CC0

**Access:** Free download | **Formats:** Audio; inspect archive

Collision, hoof-contact placeholders, hits and breaking glass candidates.

**Caveat:** Check exact clips; record foley if sound does not match.

Treatment: S14, S16, S24, S25

### AS-031 — Interface Sounds

[Kenney](https://kenney.nl/assets/interface-sounds) | UI & audio | P1 | CC0

**Access:** Free download | **Formats:** Audio; inspect archive

Approval pings, subscription errors, Curator notices and menus.

**Caveat:** Use short nonrepetitive cues; separate UI bus.

Treatment: S06, S13, S19, S23, S27, S30

### AS-032 — GDC 2026 Game Audio Bundle

[Sonniss](https://gdc.sonniss.com/) | UI & audio | P2 | Custom media-production EULA

**Access:** Free; 7.47 GB+ bundle | **Formats:** Audio; inspect archive

Optional high-quality ambience, mechanical motion, Foley and impacts; shortlist from track list.

**Caveat:** No AI/ML training; no raw redistribution. Read https://sonniss.com/gdc-bundle-license/ before copying to repository or sharing with third parties.

Treatment: S09, S11, S14, S16, S18, S19, S24, S25, S28

### AS-033 — Industrial Revolution

[Kevin MacLeod / Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100811) | UI & audio | P1 | CC BY 4.0

**Access:** Free with attribution | **Formats:** Music audio

Industrial orchestral action cue, especially during factory or final assault.

**Caveat:** Credit title, artist, source, license and changes; edit loop manually.

Treatment: S19, S24

### AS-034 — Space Jazz

[Kevin MacLeod / Incompetech](https://www.incompetech.com/music/royalty-free/music.html) | UI & audio | P1 | CC BY 4.0

**Access:** Free with attribution | **Formats:** Music audio

Search page for Space Jazz (ISRC USUAN2100030); relaxed absurdist jazz cue.

**Caveat:** Credit title, artist, source, license and changes; check loop and loudness.

Treatment: S11, S17, S28, S29

### AS-035 — Walking Along

[Kevin MacLeod / Incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100020) | UI & audio | P2 | CC BY 4.0

**Access:** Free with attribution | **Formats:** Music audio

Alternative lounge jazz for Kevin, apartment and bar.

**Caveat:** Credit title, artist, source, license and changes.

Treatment: S12, S17, S28

### AS-036 — Starter Kit 3D Platformer

[Kenney](https://github.com/KenneyNL/Starter-Kit-3D-Platformer) | Godot tools | P0 | MIT code / CC0 art & SFX

**Access:** Free repository | **Formats:** Godot project / GDScript

Starting reference for controller, camera and gamepad; replace coin and platform logic.

**Caveat:** Published README targets Godot 4.6; pin compatible revision. Keep MIT notice; inspect separate font licenses.

Treatment: S14, S16, S24, S25

### AS-037 — Dialogue Manager

[Nathan Hoad](https://store.godotengine.org/asset/nathanhoad/dialogue-manager/) | Godot tools | P1 | MIT

**Access:** Free addon | **Formats:** Godot addon

Branching conversations and satirical choice prompts.

**Caveat:** Store listing minimum Godot 4.6 and currently labels displayed build unstable; choose compatible stable release or use native dialogue data.

Treatment: S13, S17, S18, S20, S22, S23, S26, S27, S28

## Custom work

### C01 — Hoot hero (P0)

Create owl head, humanoid rig, coat, glasses, feather silhouette, boots and hand/beak sockets; idle, run, mount, lean, drink and cigarette poses.

**Acceptance:** Export a single rigged GLB with named clips. Recognizable silhouette at gameplay camera; no obvious skinning errors.

Base: AS-001, AS-002, AS-005 | Treatment: S04, S11, S14, S16, S22, S25, S29

### C02 — Zebra mount (P0)

Repaint horse black-and-ivory stripes; custom aviators, reins, saddle and mane. Author gallop if missing; attach Hoot to saddle socket.

**Acceptance:** Test four gaits, left/right lane change, jump, stop, mounted pose and rescue. No leg sliding at target speed.

Base: AS-003, AS-004 | Treatment: S05, S14, S16, S25, S29

### C03 — Kevin and Curator (P0)

Customize original robot mesh, red eyes, chest markings and poetry gestures; Curator uses original abstract face/terminal.

**Acceptance:** No branded Terminator model or actor likeness; distinctive friendly Kevin silhouette.

Base: AS-006, AS-007 | Treatment: S06, S07, S17, S24, S27, S30

### C04 — Wine, cigarette, rocket (P0)

Model lathed wine glass, wine surface, bottle, cylinder cigarette with ember and smoke, red-nosed rocket.

**Acceptance:** Socket attachments follow animation; scripted glass break, no real-time fluid simulation.

Base: AS-019, AS-026 | Treatment: S04, S11, S16, S25, S29

### C05 — Motorbike and drone (P1)

Build simple bike or hover-bike from cylinders and fairing, and drone from hull, arms and rotors.

**Acceptance:** Script PathFollow3D enemies; use cheap collision proxies, not real vehicle physics.

Base: AS-018, AS-019, AS-020 | Treatment: S14, S16, S24

### C06 — Digital rain and holograms (P0)

Original glyph atlas and scrolling shader on building planes; green code, billboard originals, sparks, rain and glitch transitions.

**Acceptance:** No copied Matrix symbols/screens or recognizable actor faces. Reduced-motion / flashing toggle.

Base: AS-021, AS-026, AS-027 | Treatment: S09, S16, S24, S27, S32

### C07 — Museum art and drawing (P0)

Create crude child drawing, imperfect zebra and perfect substitute, original sunflower studies and fake posters.

**Acceptance:** Use original game art or independently cleared public domain files; narrative choice uses distinct texture IDs.

Base: AS-016 | Treatment: S18, S26, S28

### C08 — Workshop / archive / bar (P1)

Create pencil, paper, picture frames, basic hand tools, bar sign, chair and books if missing.

**Acceptance:** One reused room kit; warm palette, simple interaction volumes.

Base: AS-015, AS-016, AS-017 | Treatment: S20, S23, S26, S28

### C09 — Voices, hoofbeats and ambience (P1)

Use subtitles first; optionally record original character voices and hoof sounds.

**Acceptance:** No imitation of identifiable performers without consent. Create captions, different audio buses and volume controls.

Base: AS-029, AS-030, AS-031 | Treatment: S04, S05, S06, S07, S08, S16, S25

### C10 — Gameplay systems (P0)

Native controller, mount sync, chase checkpoints, triggers, projectiles, encounter states, dialogue and final choice.

**Acceptance:** Assets do not supply a game. Ship functioning prototype before polishing visuals.

Base: AS-036, AS-037 | Treatment: S14, S16, S18, S24, S25, S26, S27

## Source and license references

- [Godot supported import formats](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html)

- [Godot scene importer](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/index.html)

- [Godot license obligations](https://github.com/godotengine/godot-docs/blob/master/about/complying_with_licenses.rst)

- [Poly Haven asset license](https://polyhaven.com/license)

- [CC0 full license](https://creativecommons.org/publicdomain/zero/1.0/)

- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

- [Sonniss specific EULA](https://sonniss.com/gdc-bundle-license/)

- [Excluded AI-policy addon reference](https://github.com/ramokz/phantom-camera)

- [Excluded paid animal pack](https://riclmbr.itch.io/low-poly-animal-pack-50-rigged-animated-blocky-animals)
