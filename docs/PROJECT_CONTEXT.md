# ZEBRA!! — development decisions and handoff context

**Status:** Continuum Chase is playable in Godot. See `docs/CONTINUUM_CHASE.md` for the current build and `docs/HERO_ASSETS.json` for character asset provenance. The original handoff notes below record earlier design decisions.

## Concept and tone

The project began as an image of a wise bespectacled owl on a rocket holding wine, with a thought bubble reading "too much wine." It evolved into an outrageous scene: a human-bodied owl in a leather trench coat riding a sunglasses-wearing ordinary zebra through a rain-soaked, emerald-green cyberpunk city as red-eyed chrome killing machines, motorcycles, aerial drones, holographic advertisements and explosions fill the frame. "Zebra!!" became the new title.

The full treatment **ZEBRA!! — The Last Original Thought** satirizes generative AI, cinematic tropes, derivative art, optimization, consciousness and the future convergence of art and technology. Take the characters and cinematic imagery seriously; let the scenario provide the comedy. The finished film treatment, narrative sections, image IDs and image relations are in the canonical JSON/Markdown/PDF under `docs/treatment/`.

### Main characters

- **Stan**: human body, owl head, round spectacles, black leather coat, cigarette, wine and a world-weary delivery. The mounted chase illustration (IMG-01) is definitive for both heroes, including Stan’s windswept brown and cream feathers, half-lidded eyes, short gold beak, and wire frames. The source treatment calls him Professor Archibald Hoot. Stan needs a humanoid rig and separate owl facial and head controls.
- **Zebra**: ordinary realistic zebra, normal quadrupedal anatomy, aviator sunglasses, expressive behavior and acerbic personality. Intelligent sidekick and mount. Should be rigged with equine locomotion (idle/walk/trot/canter/gallop/turn/jump) and synchronized rider animations.
- **Kevin**: chrome, red-eyed battle robot with workplace burnout and terrible original poetry.
- **The Curator**: AI antagonist that attempts to optimize all artistic output and remove uncertainty.
- **The Director**: maker/artist guiding a resistance of people who still create things themselves.

### Art direction: most recent binding decision

The user explicitly prefers **stylized cinematic semi-realism** over low-poly. Make the visual richness closer to the original image. Strong visual references are **Stray** (intimate streets, texture, animal locomotion, lived-in clutter) and **Cyberpunk 2077** (massive neon city, tech scale, rain, billboards). Palette: emerald green/digital code, dark metal, reflective wet streets, red wine, chrome machines, cinematic mist, warm human-world counterpoint. High-quality PBR materials and coherent atmosphere matter more than extreme polygon counts.

### Technology and pipeline

- Godot 4.x, Forward+ rendering as starting hypothesis; confirm target PC performance as work progresses.
- Blender for topology cleanup, UVs, PBR materials, rigs, retargeting and export.
- User has paid **Tripo API credits** and no practical credit restrictions from their perspective; intends to use Tripo for concept-to-3D mesh and possibly animation, plus Blender, Mixamo and free animation resources. Still inspect commercial-rights and output-quality specifics before distribution.
- Stan and Zebra should be **custom hero assets** with unique silhouette and identity. Supporting city assets, modular environments, mechanical props, robots and VFX should use free or inexpensive packs when visually cohesive.
- Real-time mounted system: independent Stan/Zebra skeletons, mount socket, synchronized locomotion, upper-body layering, IK as useful for reins/stirrups, head/facial expression, optional cloth/feather and wine/cigarette effects.
- Automated Tripo API pipeline is a possible future system: read asset requirements, submit prompts/references, fetch GLB/textures, clean in Blender, evaluate, manifest/version, import into Godot. None of it has been implemented yet.

### Game adaptation planning (proposed, not approved implementation)

A concise (~30–45-minute) linear cinematic 3D action-adventure was proposed. The strongest first **vertical slice** is a 3–5-minute *Continuum Chase*: Stan mounts Zebra in an alley, controls his gait from walk to gallop, fends off the pursuit, spills wine in slow motion and escapes to the maintenance tunnel. Later beats could adapt apartment, Kevin encounter, art museum, factory of suffering, Curator's offer, Final Draft assault and Rusty Horseshoe ending. Avoid treating every film scene as a required feature.

### Asset research snapshot

The older **free-resource bible** lists 37 asset resource candidates, 9 proposed gameplay sequences, and custom-work packages. Its low-poly presentation preference was **superseded** by the later cinematic art-direction research.

The later **cinematic asset bible** prioritizes realistic assets and cheap paid packs. Examples recorded there (availability/pricing must be reconfirmed): Poly Haven Hidden Alley CC0, ambientCG CC0, DEEZL Cyberpunk city pack (~$19.99), Sector 07 industrial sci-fi station (~$9.99), Noduo Robot Crew (~$12.99), plus optional industrial and city-detail packs. An earlier discussion proposed ~$42.97 as a starter combination and ~$75 ceiling; these were examples, not authorized purchases.

### Visual assets

`assets/archives/ZEBRA_complete_artwork.zip` contains 63 numbered unique images and manifests. A user-uploaded `Owl.zip` contributed dozens of additional mood references, and one duplicate of the main zebra scene was consolidated in the curated collection. The PDF treatment embeds the full catalog. Consult named IDs and metadata in the treatment JSON before generative asset work.

### Development interaction

The user works on Windows 11, uses Codex on their desktop for development, and recently created a Codex project named `zebra_gpt`. The existing ChatGPT chat cannot be imported directly as a Codex chat; these files are the project handoff. The original chat can be kept as reference in ChatGPT, separately from Codex's history. This handoff records important decisions but is **not** a verbatim transcript.

### Pending at the original handoff

- No game project or test scene built.
- No purchased marketplace packs.
- No hero meshes generated with Tripo.
- No Mixamo/Tripo animation assets tested or retargeted.
- No Godot rendering benchmarks or performance target validated.
- No legal review of specific commercial license terms.
- No connection or write into the user's local `zebra_gpt` directory from this ChatGPT session.
