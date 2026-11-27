# CC0 street kit

These runtime derivatives were prepared from the official Poly Haven assets. Poly Haven releases these assets under the CC0 1.0 public-domain dedication. [Poly Haven asset license](https://polyhaven.com/license) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)

| Runtime file | Original asset and artist | Placement at metre scale |
| --- | --- | --- |
| `aircon.glb` | Monsta3D, [Exterior Aircon Unit](https://polyhaven.com/a/exterior_aircon_unit) | 0.80 m wide, 0.93 m tall including the bracket and cable, and 0.374 m deep. Place the origin on the wall at the bottom of the bracket. The fan faces +Z. |
| `fire-escape.glb` | Juniix, [Modular Fire Escape](https://polyhaven.com/a/modular_fire_escape) | 4.79 m wide. Lower deck at y=0, upper deck at y≈3.36, railing top at y≈4.33. Railings project to z=1.54. The wall sits at z=0, with a stair bracket extending into it by 0.16 m. |
| `trash-can.glb` | GurJas Studios, [Metal Trash Can](https://polyhaven.com/a/metal_trash_can) | Floor origin. 0.68 m wide across the handles, 0.55 m deep, and 0.97 m tall. |
| `utility-box.glb` | James Ray Cock, [Utility Box 02](https://polyhaven.com/a/utility_box_02) | Floor origin. 0.92 m wide, 1.12 m tall, and 0.432 m deep. The cabinet doors face +Z. |
| `manhole.glb` | Raunox, [Water Manhole Cover](https://polyhaven.com/a/water_manhole_cover) | 0.691 m diameter. Top at y≈0.039. Place the pivot slightly below street level. |
| `worn-asphalt-*.webp` | Amal Kumar, [Worn Asphalt](https://polyhaven.com/a/worn_asphalt) | 2 × 2 m repeat. |
| `floor-pavement-*.webp` | Charlotte Baglioni and Dario Barresi, [Floor Pavement](https://polyhaven.com/a/floor_pavement) | 2 × 2 m repeat. |

Use sRGB for the `*-color.webp` maps and linear sampling for the `*-normal.webp` and `*-roughness.webp` maps. The normal maps use the OpenGL Y convention. Color maps are 1024 × 1024, and normal and roughness maps are 512 × 512. Both roughness maps represent dry material and can be modulated by the scene's wetness.

The five GLBs and six textures total 2.81 MiB. Run `python web/tools/prepare_street.py` from the repository root to regenerate them with Pillow. That preparation script accesses Poly Haven's API and file CDN. The game serves the prepared files locally.
