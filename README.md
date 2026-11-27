# ZEBRA!! — The Last Original Thought

Stan, an owl-headed rider, escapes the Continuum on a sunglasses-wearing zebra while the city's AI tries to remove him from the story.

**Continuum Chase** is an endless Three.js runner through five city districts, a transit tunnel, and the Flooded Maglev Terminal. Zebra cruises at 110 km/h. A/D or the arrow keys steer, Space jumps, and S brakes. Press Shift once to spend your current Burst charge, Q to throw a bottle, or E to drop a wine slick. Hold C for the hero camera, press Esc to pause, or press R to retry the checkpoint. Touch devices have on-screen controls for steering, braking, jumping, burst, and both attacks.

[Play Continuum Chase](https://imfoot.github.io/zebra_gpt/)

### Web showcase

With Node.js 24 installed, run these commands from the repository root.

```sh
npm --prefix web ci
npm --prefix web run dev
```

`npm --prefix web run build` writes a static site to `web/dist/`. The same output works under a GitHub Pages project path and on a standalone static host. The [web notes](web/README.md) describe the browser models and acceptance checks.

### Godot chase

The Godot desktop version is documented in [Continuum Chase](docs/CONTINUUM_CHASE.md). Install Git LFS and run `git lfs pull` for its original hero models, then open `game/project.godot` in Godot 4.7.

<details>
<summary>Original project handoff</summary>

This three-file transfer includes this small **project handoff ZIP**, plus two separately supplied archives: `ZEBRA_complete_artwork.zip` and `Owl.zip`. Download **all three**. The package transfers the **ZEBRA!! creative and production material** from a ChatGPT conversation into a Codex-friendly project folder. It does **not** migrate the ChatGPT conversation itself into Codex's conversation history. See `docs/CHAT_HISTORY_NOTE.md` for retaining the original conversation separately.

## Quick start (Windows 11 / Codex desktop)

1. Locate your **existing** local `zebra_gpt` project directory in Codex. Do not create a second project unless necessary.
2. Extract this handoff ZIP somewhere temporary.
3. Copy the **contents of the extracted `zebra_gpt_handoff` folder** into the existing `zebra_gpt` project directory. Merge folders if prompted; review conflicts before overwriting.
4. Also copy the separately downloaded `ZEBRA_complete_artwork.zip` into `<project>/assets/archives/` and `Owl.zip` into `<project>/archive/original_user_uploads/`. Those two ZIPs are intentionally not inside this smaller handoff ZIP. Verify filenames and destinations against `docs/EXTERNAL_ARCHIVES.json`.
5. Open that local folder in Codex. `AGENTS.md` provides project-specific guidance; `docs/PROJECT_CONTEXT.md` records creative decisions.
6. Run `powershell -ExecutionPolicy Bypass -File .\scripts\expand_artwork.ps1` from the project root to extract the 63 numbered concept art files into `assets/concept_art/images/`.
7. Start a new Codex chat and paste the opening prompt in `docs/CODEX_START_PROMPT.md`.
8. Ask Codex to inspect the JSON resource bibles and image manifests before proposing purchases or asset-generation jobs.

## Canonical sources

- `docs/treatment/ZEBRA_complete_treatment.json` — original feature treatment, scene references and artwork metadata
- `docs/treatment/ZEBRA_complete_treatment.md` — readable machine-friendly version
- `docs/treatment/ZEBRA_complete_illustrated_treatment.pdf` — standalone original illustrated treatment
- `assets/archives/ZEBRA_complete_artwork.zip` — authoritative 63-file concept-art collection, with image manifest
- `docs/asset_research/ZEBRA_cinematic_asset_bible.{json,md,pdf}` — latest visual direction and sourcing recommendations
- `docs/asset_research/ZEBRA_Godot_resource_bible.{json,md,pdf}` — prior free-resource inventory; use together with newer addendum
- `docs/PROJECT_CONTEXT.md` — decisions and context from ChatGPT discussions, not a verbatim conversation export

The older versions, original six generated PNGs, and the original `Owl.zip` upload are in `archive/` for provenance. No asset purchases, Tripo API jobs, or actual Godot integration were performed by this handoff.

## Asset treatment

*Keep image archives, source concepts, and PDFs out of ordinary Git history unless intentionally using Git LFS or another artifact-storage solution.* The `.gitignore` provided here excludes large binaries by default, but includes all text/JSON documentation.

## Integrity

`MANIFEST.json` records paths, sizes and SHA-256 hashes for every file inside this handoff ZIP (apart from MANIFEST.json itself and the outer ZIP). `docs/EXTERNAL_ARCHIVES.json` records expected hashes of the two separately downloaded source archives. Use `python scripts/verify_files.py` in your local project folder to verify the download and extraction.

</details>
