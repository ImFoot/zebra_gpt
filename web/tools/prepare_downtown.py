"""Package frontages from Quaternius's free Standard ZIP. Pass the ZIP as an argument."""

from collections import defaultdict
from functools import lru_cache
import hashlib
import io
import json
import math
from pathlib import Path
import struct
import sys
import zipfile

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "public" / "environment" / "downtown"
SOURCE = "https://quaternius.com/packs/downtowncitymegakit.html"
DOWNLOAD = "https://quaternius.itch.io/downtown-city-megakit"
LICENSE = "https://creativecommons.org/publicdomain/zero/1.0/"
EXPORT_FOLDER = "Exports/glTF (Godot)"


def panel_row(names, window_styles):
    return [
        (name, (x * 1.8, 0, 0), (.9, 1, 1), 0, style)
        for name, x, style in zip(names, [-2, -1, 0, 1, 2], window_styles)
    ]


ENTRY = panel_row(
    ["Metal_Window_Half", "Metal_FirstFloor_Window", "DoorFrame_Metal_Single", "Metal_FirstFloor_Window", "Metal_Window_Half"],
    ["Warm", "Warm", "Cool", "Cool", "Dim"],
) + [
    ("Door_2", (0, 0, .029), (.77, 1.015, .82), 0, "Cool"),
    ("Door_3", (0, 0, .029), (-.77, 1.015, .82), 0, "Cool"),
    ("Metal_Column_Bottom", (-4.21, 0, -.04), (1, 1, 1), 0, None),
    ("Metal_Column_Bottom", (4.21, 0, -.04), (1, 1, 1), 0, None),
]
UPPER = panel_row(
    ["Metal_FullWindow", "Metal_Window_Half", "Metal_FullWindow", "Metal_Window_Half", "Metal_FullWindow"],
    ["Dim", "Cool", "Dim", "Warm", "Cool"],
) + [
    ("Cornice_Metal_Center", (x * 1.8, 2.78, .008), (.9, .22, .55), 0, None)
    for x in [-2, -1, 0, 1, 2]
]
VARIANTS = {
    "DowntownEntry": ENTRY,
    "DowntownUpper": UPPER,
    "DowntownCorner": ENTRY + [
        ("Metal_FullWindow", (4.48, 0, -.99), (1, 1, 1), math.pi / 2, "Warm"),
        ("Metal_Column_Center", (4.22, 0, -1.89), (.94, 1, .94), 0, None),
    ],
    "DowntownPlanter": [("Prop_Planter_Single", (0, 0, 0), (1, 1, 1), 0, None)],
}
LABELS = {
    "MI_Trim_Dark": ("Steel plinth", "T_Trim", [.46, .54, .61, 1], .64, .79),
    "MI_Trim_MetalConcrete": ("Metal composite", "T_MetalConcrete", [.62, .71, .78, 1], .82, .74),
    "MI_Dirt": ("Planter soil", "T_Dirt", [.69, .66, .61, 1], 0, 1),
}
GLASS = {
    "Warm": ("T_lit_interior_2.png", [.84, .7, .46], [.27, .18, .07]),
    "Cool": ("T_lit_interior_1.png", [.46, .76, .82], [.08, .23, .27]),
    "Dim": ("T_dark_interior.png", [.23, .35, .44], [.014, .024, .033]),
}


def attribute(document, data, index):
    item = document["accessors"][index]
    view = document["bufferViews"][item["bufferView"]]
    dtype = np.dtype({5123: "<u2", 5125: "<u4", 5126: "<f4"}[item["componentType"]])
    columns = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[item["type"]]
    offset = view.get("byteOffset", 0) + item.get("byteOffset", 0)
    return np.ndarray(
        (item["count"], columns), dtype=dtype, buffer=data, offset=offset,
        strides=(view.get("byteStride", columns * dtype.itemsize), dtype.itemsize),
    )


def read_source(archive, name):
    document = json.loads(archive.read(f"{EXPORT_FOLDER}/{name}.gltf"))
    data = archive.read(f"{EXPORT_FOLDER}/{document['buffers'][0]['uri']}")
    result = []
    for primitive in document["meshes"][0]["primitives"]:
        material = document["materials"][primitive["material"]]["name"]
        if material not in LABELS and material != "MI_Glass":
            continue
        attrs = primitive["attributes"]
        positions = attribute(document, data, attrs["POSITION"])
        uv = attribute(document, data, attrs["TEXCOORD_0"])
        if material == "MI_Glass":
            xy = positions[:, :2]
            uv = (xy - xy.min(axis=0)) / np.maximum(np.ptp(xy, axis=0), .001)
            uv[:, 1] = 1 - uv[:, 1]
        result.append((
            material, positions, attribute(document, data, attrs["NORMAL"]),
            uv, attribute(document, data, primitive["indices"]).reshape(-1),
        ))
    return result


class DowntownPackage:
    def __init__(self, archive):
        self.archive = archive
        self.data = bytearray()
        self.source = lru_cache(maxsize=None)(lambda name: read_source(archive, name))
        self.document = {
            "asset": {"version": "2.0", "generator": "ZEBRA!! downtown preparation", "extras": {
                "author": "Quaternius", "asset": "Downtown City MegaKit (free Standard)",
                "license": "CC0-1.0", "licenseUrl": LICENSE, "source": SOURCE,
            }},
            "scene": 0, "scenes": [{"nodes": []}], "nodes": [], "meshes": [],
            "bufferViews": [], "accessors": [], "materials": [], "images": [], "textures": [],
            "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
        }
        self.textures = {}
        self.materials = {}

    def add(self, key, item):
        index = len(self.document[key])
        self.document[key].append(item)
        return index

    def buffer_view(self, data, target=None):
        self.data.extend(b"\0" * (-len(self.data) % 4))
        view = {"buffer": 0, "byteOffset": len(self.data), "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        self.data.extend(data)
        return self.add("bufferViews", view)

    def accessor(self, data, dtype, kind, bounds=False):
        array = np.concatenate(data).astype(dtype)
        attribute_type = {"<f4": 5126, "<u2": 5123, "<u4": 5125}[dtype]
        record = {
            "bufferView": self.buffer_view(array.tobytes(), 34963 if kind == "SCALAR" else 34962),
            "type": kind, "componentType": attribute_type, "count": len(array),
        }
        if bounds:
            record.update(min=array.min(axis=0).tolist(), max=array.max(axis=0).tolist())
        return self.add("accessors", record)

    def texture(self, name, size, quality, subsampling):
        if name not in self.textures:
            with Image.open(io.BytesIO(self.archive.read(f"{EXPORT_FOLDER}/{name}"))) as source:
                image = source.convert("RGB")
                image.thumbnail((size, size), Image.Resampling.LANCZOS)
                payload = io.BytesIO()
                image.save(payload, "JPEG", quality=quality, subsampling=subsampling, optimize=True)
            source = self.add("images", {
                "bufferView": self.buffer_view(payload.getvalue()), "mimeType": "image/jpeg",
            })
            self.textures[name] = self.add("textures", {"sampler": 0, "source": source})
        return {"index": self.textures[name]}

    def material(self, key):
        if key in self.materials:
            return self.materials[key]
        if key in GLASS:
            image, tint, glow = GLASS[key]
            map_info = self.texture(image, 256, 87, 2)
            item = {"name": f"{key} glazing", "emissiveFactor": glow, "emissiveTexture": map_info,
                    "pbrMetallicRoughness": {"baseColorFactor": [*tint, 1], "baseColorTexture": map_info,
                                             "metallicFactor": .34, "roughnessFactor": .25}}
        else:
            label, prefix, tint, metal, rough = LABELS[key]
            orm = self.texture(f"{prefix}_ORM.png", 384, 88, 0)
            item = {
                "name": label, "normalTexture": self.texture(f"{prefix}_Normal.png", 512, 92, 0),
                "occlusionTexture": {**orm, "strength": .74},
                "pbrMetallicRoughness": {
                    "baseColorFactor": tint, "baseColorTexture": self.texture(f"{prefix}_BaseColor.png", 768, 88, 2),
                    "metallicRoughnessTexture": orm, "metallicFactor": metal, "roughnessFactor": rough,
                },
            }
        self.materials[key] = self.add("materials", item)
        return self.materials[key]

    def add_variant(self, name, parts):
        by_material = defaultdict(list)
        min_xyz = np.full(3, np.inf)
        max_xyz = np.full(3, -np.inf)
        for source, offset, scale, rotation, glass in parts:
            cosine, sine = math.cos(rotation), math.sin(rotation)
            transform = np.array([[cosine, 0, sine], [0, 1, 0], [-sine, 0, cosine]])
            for key, positions, normals, uvs, indices in self.source(source):
                mat = glass if key == "MI_Glass" else key
                xyz = (positions * scale) @ transform.T + offset
                normal = (normals / scale) @ transform.T
                normal /= np.linalg.norm(normal, axis=1)[:, None]
                if math.prod(scale) < 0:
                    indices = indices.reshape(-1, 3)[:, [0, 2, 1]].reshape(-1)
                min_xyz = np.minimum(min_xyz, xyz.min(axis=0))
                max_xyz = np.maximum(max_xyz, xyz.max(axis=0))
                by_material[mat].append((xyz, normal, uvs, indices))

        primitives = []
        triangles = 0
        for key, parts in by_material.items():
            position, normal, uv, index = zip(*parts)
            offsets = np.cumsum([0] + [len(p) for p in position[:-1]], dtype=np.int64)
            triangles += sum(len(i) for i in index) // 3
            primitives.append({
                "attributes": {
                    "POSITION": self.accessor(position, "<f4", "VEC3", bounds=True),
                    "NORMAL": self.accessor(normal, "<f4", "VEC3"),
                    "TEXCOORD_0": self.accessor(uv, "<f4", "VEC2"),
                },
                "indices": self.accessor([i + off for i, off in zip(index, offsets)], "<u2", "SCALAR"),
                "material": self.material(key),
            })
        mesh = self.add("meshes", {"name": name, "primitives": primitives})
        info = {"bounds": np.round([min_xyz, max_xyz], 4).tolist(), "triangles": triangles}
        self.document["scenes"][0]["nodes"].append(
            self.add("nodes", {"name": name, "mesh": mesh, "extras": info}),
        )
        return info

    def write(self, path):
        self.document["buffers"] = [{"byteLength": len(self.data)}]
        document = json.dumps(self.document, separators=(",", ":")).encode()
        document += b" " * (-len(document) % 4)
        self.data.extend(b"\0" * (-len(self.data) % 4))
        with path.open("wb") as file:
            file.write(struct.pack("<4sIII4s", b"glTF", 2, 28 + len(document) + len(self.data), len(document), b"JSON"))
            file.write(document)
            file.write(struct.pack("<I4s", len(self.data), b"BIN\0"))
            file.write(self.data)


def main(zip_path):
    ROOT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        if b"CC0 1.0 Universal" not in archive.read("License_Standard.txt"):
            raise ValueError("Provide the free CC0 Downtown City MegaKit Standard ZIP")
        package = DowntownPackage(archive)
        variants = {key: package.add_variant(key, parts) for key, parts in VARIANTS.items()}
        output = ROOT / "downtown.glb"
        package.write(output)
    with zip_path.open("rb") as input_file:
        sha256 = hashlib.file_digest(input_file, "sha256").hexdigest()
    metadata = {
        **package.document["asset"]["extras"], "download": DOWNLOAD, "standardZipSha256": sha256,
        "axes": "X centered; ground at Y=0; street face +Z", "variants": variants, "bytes": output.stat().st_size,
    }
    (ROOT / "sources.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
