"""Build the Hidden Alley facade GLBs with Python, NumPy, Pillow, and Shapely 2.1+."""

from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import hashlib
import io
import json
from pathlib import Path
import struct
import tempfile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

import numpy as np
from PIL import Image
import shapely


OUTPUT = Path(__file__).resolve().parents[1] / "public" / "environment" / "facades"
CACHE = Path(tempfile.gettempdir()) / "zebra-polyhaven-prep"
API_AGENT = "ZebraContinuumAssetPrep/1.0"
LICENSE = "https://polyhaven.com/license"


def facade_row(*tiles):
    """Place source tiles by their right edge, across a centered 9 m shell."""
    assembled = []
    right_edge = -4.5
    for width, pieces in tiles:
        right_edge += width
        assembled.extend((piece, right_edge, y) for piece, y in pieces)
    if right_edge != 4.5:
        raise ValueError("Facade rows must be 9 m wide")
    return assembled


def apartment_entry(door, window):
    return 3, [
        (f"wall_door_{door}", 0),
        (f"door_{door}", 0),
        (f"dado_door_{door}", .005),
        ("cornice_standard_standard_01", 2.79),
    ] if door else [
        (f"wall_window_{window}", 0),
        (f"window_{window}", 0),
        ("dado_standard_standard_01", .005),
        ("cornice_standard_standard_01", 2.79),
    ]


def apartment_upper(window):
    return 3, [
        (f"wall_window_{window}", 0),
        (f"window_{window}", 0),
        ("cornice_standard_standard_01", 2.79),
    ]


def factory_entry(door, width=3, dado=None):
    return width, [
        (f"wall_door_{door}", 0),
        (f"door_{door}", 0),
        (dado or f"dado_door_{door}", .002),
    ]


def factory_upper(window, lower=False):
    pieces = [(f"wall_window_{window}", 0), (f"window_{window}", 0)]
    if lower:
        pieces.append(("dado_standard_standard_01", .002))
    pieces.append(("cornice01_standard_standard_01", 2.82))
    return 3, pieces


APARTMENTS = {
    "ApartmentEntry": facade_row(
        apartment_entry(None, "centered_large_01"),
        apartment_entry("centered_large_01", None),
        apartment_entry(None, "centered_small_01"),
    ),
    "ApartmentEntryAlt": facade_row(
        apartment_entry("offset_small_01", None),
        apartment_entry(None, "centered_double_01"),
        apartment_entry("centered_small_02", None),
    ),
    "ApartmentUpper": facade_row(
        apartment_upper("centered_small_01"),
        apartment_upper("centered_double_01"),
        apartment_upper("centered_small_02"),
    ),
    "ApartmentUpperAlt": facade_row(
        apartment_upper("offset_small_01"),
        apartment_upper("centered_large_01"),
        apartment_upper("centered_small_01"),
    ),
    "ApartmentCrown": facade_row(*[(3, [("crown_standard_standard_01", 0)])] * 3),
}

FACTORY = {
    "FactoryEntry": facade_row(
        factory_entry("recessed_small_01"),
        factory_upper("centered_large_01", lower=True),
        factory_entry("centered_large_01"),
    ),
    "FactoryLoading": facade_row(
        factory_entry("garage_door_01", 6, "dado_garage_door_01"),
        factory_entry("recessed_large_01"),
    ),
    "FactoryUpper": facade_row(
        factory_upper("tall_large_01"),
        factory_upper("tall_small_01"),
        factory_upper("tall_large_02"),
    ),
    "FactoryUpperAlt": facade_row(
        factory_upper("centered_medium_01"),
        factory_upper("centered_double_01"),
        factory_upper("centered_large_02"),
    ),
    "FactoryCrown": facade_row(*[(3, [("crown_standard_standard_01", 0)])] * 3),
}


def read_url(url, domain):
    parts = urlsplit(url)
    if parts.scheme != "https" or parts.netloc != domain:
        raise ValueError(f"Unexpected source URL: {url}")
    with urlopen(Request(url, headers={"User-Agent": API_AGENT}), timeout=40) as response:
        redirected = urlsplit(response.url)
        if (redirected.scheme, redirected.netloc) != ("https", domain):
            raise ValueError("Unexpected redirect outside Poly Haven")
        return response.read()


def asset_file(path, meta):
    def valid(data):
        return len(data) == meta["size"] and hashlib.md5(data).hexdigest() == meta["md5"]

    if path.is_file() and valid(data := path.read_bytes()):
        return data
    data = read_url(meta["url"], "dl.polyhaven.org")
    if not valid(data):
        raise ValueError(f"Poly Haven checksum mismatch for {path.name}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return data


class Source:
    def __init__(self, slug):
        self.slug = slug
        self.folder = CACHE / slug
        api = json.loads(read_url(f"https://api.polyhaven.com/files/{slug}", "api.polyhaven.com"))
        self.gltf_info = api["gltf"]["1k"]["gltf"]
        self.document = json.loads(asset_file(self.folder / f"{slug}.gltf", self.gltf_info))
        self.includes = self.gltf_info["include"]
        buffer = self.document["buffers"][0]["uri"]
        parts = list(dict.fromkeys([buffer] + [img["uri"] for img in self.document["images"]]))
        with ThreadPoolExecutor(max_workers=6) as pool:
            loaded = dict(zip(parts, pool.map(self.include, parts)))
        self.binary = loaded[buffer]
        self.images = [loaded[img["uri"]] for img in self.document["images"]]
        self.nodes = {node["name"]: node for node in self.document["nodes"]}
        self.primitives = {}

    def include(self, name):
        path = (self.folder / name).resolve()
        if not path.is_relative_to(self.folder.resolve()):
            raise ValueError(f"Unexpected asset path: {name}")
        return asset_file(path, self.includes[name])

    def accessor(self, index):
        item = self.document["accessors"][index]
        view = self.document["bufferViews"][item["bufferView"]]
        dtype = np.dtype({5123: "<u2", 5125: "<u4", 5126: "<f4"}[item["componentType"]])
        columns = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[item["type"]]
        offset = view.get("byteOffset", 0) + item.get("byteOffset", 0)
        rows = item["count"]
        stride = view.get("byteStride", dtype.itemsize * columns)
        return np.ndarray(
            (rows, columns), dtype=dtype, buffer=self.binary, offset=offset,
            strides=(stride, dtype.itemsize),
        )

    def mesh(self, name):
        if name not in self.primitives:
            node = self.nodes[name]
            mesh = self.document["meshes"][node["mesh"]]
            self.primitives[name] = []
            for primitive in mesh["primitives"]:
                attributes = primitive["attributes"]
                positions = self.accessor(attributes["POSITION"])
                normals = self.accessor(attributes["NORMAL"])
                uvs = self.accessor(attributes["TEXCOORD_0"])
                indices = self.accessor(primitive["indices"]).reshape(-1)
                if name.startswith("wall_"):
                    positions, normals, uvs, indices = simplify_wall(positions, normals, uvs, indices)
                self.primitives[name].append((primitive["material"], positions, normals, uvs, indices))
        return self.primitives[name]


def simplify_wall(positions, normals, uvs, indices):
    """Remove invisible planar subdivisions while retaining holes and original UVs."""
    original = positions, normals, uvs, indices
    if len(positions) < 60 or np.ptp(positions[:, 2]) > 1e-5 or not np.allclose(normals, (0, 0, 1)):
        return original
    xy = positions[:, :2]
    xy1 = np.column_stack((xy, np.ones(len(xy))))
    coefficients, *_ = np.linalg.lstsq(xy1, uvs, rcond=None)
    if not np.allclose(xy1 @ coefficients, uvs, atol=1e-5):
        return original

    surfaces = shapely.polygons(np.round(xy[indices.reshape(-1, 3)], 5))
    outline = shapely.union_all(surfaces).simplify(1e-5, preserve_topology=True)
    triangles = shapely.get_parts(shapely.constrained_delaunay_triangles(outline))
    if len(triangles) * 3 >= indices.size:
        return original
    triangles = shapely.orient_polygons(triangles)
    coordinates = shapely.get_coordinates(triangles).reshape(-1, 4, 2)[:, :3, :]
    vertices, new_indices = np.unique(coordinates.reshape(-1, 2), axis=0, return_inverse=True)
    new_positions = np.column_stack((vertices, np.full(len(vertices), positions[0, 2])))
    new_normals = np.broadcast_to((0, 0, 1), new_positions.shape)
    new_uvs = np.column_stack((vertices, np.ones(len(vertices)))) @ coefficients
    return new_positions, new_normals, new_uvs, new_indices


def resize_map(source, role):
    dimension, quality, subsampling = {
        "diffuse": (512, 88, 2),
        "normal": (384, 92, 0),
        "arm": (384, 88, 0),
    }[role]
    payload = io.BytesIO()
    with Image.open(io.BytesIO(source)) as image:
        image.thumbnail((dimension, dimension), Image.Resampling.LANCZOS)
        image.save(payload, "JPEG", optimize=True, quality=quality, subsampling=subsampling)
    return payload.getvalue()


class FacadeFile:
    def __init__(self, source):
        self.source = source
        self.binary = bytearray()
        self.texture_refs = {}
        self.material_refs = {}
        self.document = {
            "asset": {
                "version": "2.0",
                "generator": "ZEBRA!! facade preparation",
                "extras": {"source": f"https://polyhaven.com/a/{source.slug}", "author": "James Ray Cock", "license": "CC0-1.0"},
            },
            "scene": 0,
            "scenes": [{"nodes": []}],
            "nodes": [],
            "meshes": [],
            "accessors": [],
            "bufferViews": [],
            "materials": [],
            "images": [],
            "textures": [],
            "samplers": [{"minFilter": 9987, "magFilter": 9729, "wrapS": 10497, "wrapT": 10497}],
        }

    def add(self, collection, item):
        index = len(self.document[collection])
        self.document[collection].append(item)
        return index

    def view(self, data, target=None):
        self.binary.extend(b"\0" * (-len(self.binary) % 4))
        view = {"buffer": 0, "byteOffset": len(self.binary), "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        self.binary.extend(data)
        return self.add("bufferViews", view)

    def accessor(self, arrays, dtype, bounds=False, is_index=False):
        values = np.concatenate(arrays).astype(dtype)
        size = {1: "SCALAR", 2: "VEC2", 3: "VEC3"}[1 if values.ndim == 1 else values.shape[1]]
        accessor = {
            "bufferView": self.view(values.tobytes(), 34963 if is_index else 34962),
            "componentType": {"<u2": 5123, "<u4": 5125, "<f4": 5126}[dtype],
            "count": len(values),
            "type": size,
        }
        if bounds:
            accessor["min"] = values.min(axis=0).tolist()
            accessor["max"] = values.max(axis=0).tolist()
        return self.add("accessors", accessor)

    def texture(self, reference, role):
        index = self.source.document["textures"][reference["index"]]["source"]
        path = self.source.document["images"][index]["uri"]
        key = (path, role)
        if key not in self.texture_refs:
            image = self.add("images", {
                "bufferView": self.view(resize_map(self.source.images[index], role)),
                "mimeType": "image/jpeg",
            })
            self.texture_refs[key] = self.add("textures", {"source": image, "sampler": 0})
        return {"index": self.texture_refs[key]}

    def material(self, index):
        if index in self.material_refs:
            return self.material_refs[index]
        original = self.source.document["materials"][index]
        pbr = original["pbrMetallicRoughness"]
        arm = self.texture(pbr["metallicRoughnessTexture"], "arm")
        material = {
            "name": original["name"],
            "doubleSided": True,
            "normalTexture": self.texture(original["normalTexture"], "normal"),
            "occlusionTexture": {**arm, "strength": .8},
            "pbrMetallicRoughness": {
                "baseColorTexture": self.texture(pbr["baseColorTexture"], "diffuse"),
                "metallicFactor": pbr.get("metallicFactor", 1),
                "metallicRoughnessTexture": arm,
            },
        }
        if original.get("alphaMode") == "BLEND":
            # Opaque reflective glass avoids cross-storey transparent sorting artifacts.
            material["pbrMetallicRoughness"]["baseColorFactor"] = [.73, .8, .81, 1]
        self.material_refs[index] = self.add("materials", material)
        return self.material_refs[index]

    def module(self, name, pieces):
        sections = defaultdict(list)
        for part, x, y in pieces:
            for mat, pos, norm, uv, ix in self.source.mesh(part):
                sections[mat].append((pos + (x, y, 0), norm, uv, ix))
        primitives = []
        triangles = 0
        global_min = np.full(3, np.inf)
        global_max = np.full(3, -np.inf)
        for mat, geometry in sections.items():
            positions, normals, uvs, indices = zip(*geometry)
            offsets = np.cumsum([0] + [len(pos) for pos in positions[:-1]], dtype=np.int64)
            index_data = [ix.astype(np.int64) + offset for ix, offset in zip(indices, offsets)]
            triangles += sum(len(ix) // 3 for ix in indices)
            vertex_count = sum(map(len, positions))
            global_min = np.minimum(global_min, np.min([pos.min(axis=0) for pos in positions], axis=0))
            global_max = np.maximum(global_max, np.max([pos.max(axis=0) for pos in positions], axis=0))
            primitives.append({
                "attributes": {
                    "POSITION": self.accessor(positions, "<f4", bounds=True),
                    "NORMAL": self.accessor(normals, "<f4"),
                    "TEXCOORD_0": self.accessor(uvs, "<f4"),
                },
                "indices": self.accessor(index_data, "<u2" if vertex_count <= 65536 else "<u4", is_index=True),
                "material": self.material(mat),
            })
        mesh = self.add("meshes", {"name": name, "primitives": primitives})
        bounds = np.round([global_min, global_max], 4).tolist()
        details = {"bounds": bounds, "triangles": triangles, "width": 9, "storyHeight": 0 if name.endswith("Crown") else 3}
        node = self.add("nodes", {"name": name, "mesh": mesh, "extras": details})
        self.document["scenes"][0]["nodes"].append(node)
        print(f"  {name} {triangles:5d} tris {bounds}")
        return details

    def write(self, path):
        self.document["buffers"] = [{"byteLength": len(self.binary)}]
        data = json.dumps(self.document, separators=(",", ":")).encode()
        data += b" " * (-len(data) % 4)
        self.binary.extend(b"\0" * (-len(self.binary) % 4))
        full_size = 28 + len(data) + len(self.binary)
        with path.open("wb") as file:
            file.write(struct.pack("<4sIII4s", b"glTF", 2, full_size, len(data), b"JSON"))
            file.write(data)
            file.write(struct.pack("<I4s", len(self.binary), b"BIN\0"))
            file.write(self.binary)
        return full_size


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    provenance = {}
    for key, slug, modules in (
        ("apartments", "modular_urban_apartments_facade", APARTMENTS),
        ("factory", "modular_factory_facade", FACTORY),
    ):
        source = Source(slug)
        output = FacadeFile(source)
        print(f"{key}.glb")
        variants = {name: output.module(name, pieces) for name, pieces in modules.items()}
        size = output.write(OUTPUT / f"{key}.glb")
        provenance[key] = {
            "author": "James Ray Cock",
            "asset": f"https://polyhaven.com/a/{slug}",
            "sourceGltf": source.gltf_info["url"],
            "sourceMd5": source.gltf_info["md5"],
            "license": "CC0-1.0",
            "licenseUrl": LICENSE,
            "estimatedGroundPlane": "Y=0; outward street-facing normal +Z; centered around X=0",
            "variants": variants,
            "bytes": size,
        }
        print(f"  {size / 2**20:.2f} MiB")
    (OUTPUT / "sources.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
