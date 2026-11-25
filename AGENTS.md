# Codex project instructions: ZEBRA!!

You are developing **ZEBRA!! — The Last Original Thought**, a Godot-based short cinematic sci-fi action/comedy game based on the supplied film treatment. Read `docs/PROJECT_CONTEXT.md`, then the canonical treatment and the latest asset bible before architecture or art decisions.

## Invariants

- Stan is **a humanoid with a normal human body and an owl head**. Follow the original mounted chase illustration (IMG-01) for his swept brown and cream feathers, half-lidded expression, short gold beak, wire spectacles, black leather trench coat, cigarette and wine glass. The treatment uses his former name, Hoot.
- Zebra is **an anatomically normal, four-legged zebra**, with sunglasses; intelligent comic counterpart, not a humanoid or fantasy hybrid.
- Preferred visual identity: **stylized cinematic, semi-realistic 3D**, faithful to concept artwork; reference the intimate, lived-in streets of *Stray* and scale/atmosphere of *Cyberpunk 2077*. Avoid flat-shaded, blocky low-poly aesthetics as the project's default.
- Comedy should be absurd, self-aware, satirical and delivered with sincere cinematic production value. Preserve the treatment's satire of AI, creativity, art, and automation.
- Target engine: Godot 4.x, **Forward+**, with Blender for mesh, material, rigging and export work. Prefer glTF/GLB imports where practical.
- Stan and Zebra are custom hero assets. User has **paid Tripo API credits**, and intends to combine Tripo, Blender, Mixamo/free animation sources, retargeting, custom rigging/animation as appropriate. Do not assume Tripo has been called or its output is already game-ready.
- Preserve protagonist models as separate skeletons: standard humanoid rig for Stan and equine/quadruped rig for Zebra. Mounted motion requires synchronized gait, body pose, attachment points, and possibly IK.
- The budget for optional purchases is modest, preferably free or cheap, with a previously discussed target around $75 for starter asset packs. **Do not spend money, use paid Tripo credits, call paid APIs, or download untrusted files without explicit user authorization.**
- Treat the film treatment as narrative source material, not a literal game scope commitment. Initial suggested vertical slice: an atmospheric, 3–5-minute mounted chase through the Continuum.

## Workflow

1. Before creating new assets, inspect existing concept art manifest and relevant scene IDs in `docs/treatment/ZEBRA_complete_treatment.json`.
2. Check `docs/asset_research/ZEBRA_cinematic_asset_bible.json` and the earlier free resource bible for external assets. Listings/prices/licenses are research leads, not guarantees; re-verify before acquisition or shipping.
3. For Tripo/AI generation maintain prompt, reference image IDs, model/job metadata, mesh version, license provenance, review status, and cleanup notes in a manifest.
4. Before implementation, propose a small, verifiable vertical slice and its explicit acceptance criteria. Avoid producing whole game mechanics without staged tests.
5. Preserve original artwork and archived files; work on derivatives in separate directories. Use version control for text/code, artifact storage or Git LFS for large binaries.
6. Do not imitate protected *Matrix*, *Terminator*, *Stray* or *Cyberpunk 2077* character designs or copy game assets without licensing. The references are aesthetic and parodic inspirations, not permission to ship proprietary IP.
7. For Godot/Blender code use documented stable APIs and test with available tools. Do not claim imports or animations work without actually verifying them.
8. Ask for approval only for consequential costs, destructive operations, security-sensitive commands or unresolved creative direction; otherwise make incremental progress and document assumptions.

## Source priority

1. Most recent confirmed user decisions in `docs/PROJECT_CONTEXT.md` and current conversation
2. `docs/treatment/ZEBRA_complete_treatment.json` for story canon
3. `docs/asset_research/ZEBRA_cinematic_asset_bible.json` for newer art/asset direction
4. `docs/asset_research/ZEBRA_Godot_resource_bible.json` for broad free asset candidates
5. Archived documents for provenance, not current art direction
