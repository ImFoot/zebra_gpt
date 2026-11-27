"""Prepare the CC0 street kit from the official Poly Haven API with Pillow."""

import hashlib
import io
import json
import struct
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from PIL import Image


OUTPUT = Path(__file__).resolve().parents[1] / "public" / "environment" / "street"
USER_AGENT = "ZebraContinuumChaseStreetPrep/1.0"
CDN = "dl.polyhaven.org"
API = "https://api.polyhaven.com"


def request(url):
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname not in {"api.polyhaven.com", CDN}:
        raise ValueError(f"Unexpected asset host for {url}")
    with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=25) as response:
        if urlsplit(response.url).hostname != parsed.hostname:
            raise ValueError(f"Unexpected redirect for {url}")
        return response.read()


def download(entry):
    data = request(entry["url"])
    checksum = hashlib.md5(data, usedforsecurity=False).hexdigest()
    if len(data) != entry["size"] or checksum != entry["md5"].lower():
        raise ValueError(f"Poly Haven checksum mismatch for {entry['url']}")
    return data


def files(asset):
    return json.loads(request(f"{API}/files/{asset}"))


def decode(data, mode, size):
    with Image.open(io.BytesIO(data)) as original:
        image = original.convert(mode)
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    return image


def jpeg(image, quality):
    blob = io.BytesIO()
    image.save(blob, "JPEG", quality=quality, subsampling=0, optimize=True)
    return blob.getvalue()


def pad(data, fill=b"\x00"):
    return data + fill * (-len(data) % 4)


class Model:
    def __init__(self, asset, label, package):
        metadata = package["gltf"]["1k"]["gltf"]
        self.source = json.loads(download(metadata))
        self.files = metadata["include"]
        self.binary = download(self.files[self.source["buffers"][0]["uri"]])
        self.package = package
        self.maps_by_uri = {}
        self.index_by_key = {}
        self.data = bytearray()
        self.document = {
            "asset": {"version": "2.0", "generator": "ZEBRA street preparation",
                      "extras": {"source": f"https://polyhaven.com/a/{asset}", "license": "CC0-1.0"}},
            "scene": 0, "scenes": [{"name": label, "nodes": []}], "nodes": [], "meshes": [],
            "materials": [], "textures": [], "images": [], "accessors": [], "bufferViews": [],
            "samplers": self.source.get("samplers", []),
        }

    def append(self, table, value):
        self.document[table].append(value)
        return len(self.document[table]) - 1

    def buffer_view(self, payload, **fields):
        offset = len(self.data)
        self.data.extend(pad(payload))
        return self.append("bufferViews", dict(buffer=0, byteOffset=offset, byteLength=len(payload), **fields))

    def accessor(self, index):
        if ("accessor", index) not in self.index_by_key:
            accessor = deepcopy(self.source["accessors"][index])
            view_number = accessor["bufferView"]
            key = ("view", view_number)
            if key not in self.index_by_key:
                source_view = self.source["bufferViews"][view_number]
                start = source_view.get("byteOffset", 0)
                end = start + source_view["byteLength"]
                fields = {field: source_view[field] for field in ("byteStride", "target") if field in source_view}
                self.index_by_key[key] = self.buffer_view(self.binary[start:end], **fields)
            accessor["bufferView"] = self.index_by_key[key]
            self.index_by_key["accessor", index] = self.append("accessors", accessor)
        return self.index_by_key["accessor", index]

    def alpha_texture(self, uri):
        opacity = decode(download(self.files[uri]), "L", 384)
        # Poly Haven's glTF uses a standalone opacity map as the grille color.
        # Recover the companion rusty steel color before packing the actual alpha channel.
        diffuse = self.package["rusted_02_diff"]["1k"]["jpg"]
        colored = decode(download(diffuse), "RGB", 384)
        colored.putalpha(opacity.resize(colored.size, Image.Resampling.LANCZOS))
        colored = colored.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        blob = io.BytesIO()
        colored.save(blob, "PNG", optimize=True)
        return blob.getvalue(), "image/png"

    def texture(self, index):
        key = ("texture", index)
        if key not in self.index_by_key:
            texture = deepcopy(self.source["textures"][index])
            uri = self.source["images"][texture["source"]]["uri"]
            if uri not in self.maps_by_uri:
                if "_opacity_" in uri:
                    payload, mime = self.alpha_texture(uri)
                else:
                    detail_map = "_diff_" not in uri
                    image = decode(download(self.files[uri]), "RGB", 384 if detail_map else 512)
                    payload, mime = jpeg(image, 85 if "_nor_" in uri else 82), "image/jpeg"
                view = self.buffer_view(payload)
                self.maps_by_uri[uri] = self.append("images", {"bufferView": view, "mimeType": mime})
            texture["source"] = self.maps_by_uri[uri]
            self.index_by_key[key] = self.append("textures", texture)
        return self.index_by_key[key]

    def material(self, index):
        key = ("material", index)
        if key not in self.index_by_key:
            material = deepcopy(self.source["materials"][index])
            pbr = material["pbrMetallicRoughness"]
            for field in ("baseColorTexture", "metallicRoughnessTexture"):
                pbr[field]["index"] = self.texture(pbr[field]["index"])
            material["normalTexture"]["index"] = self.texture(material["normalTexture"]["index"])
            material["occlusionTexture"] = {"index": pbr["metallicRoughnessTexture"]["index"], "strength": .70}
            if material.get("alphaMode") == "BLEND":
                material["alphaMode"] = "MASK"
                material["alphaCutoff"] = .45
            self.index_by_key[key] = self.append("materials", material)
        return self.index_by_key[key]

    def add_node(self, name, translation=None, rotation=None):
        node = deepcopy(next(item for item in self.source["nodes"] if item["name"] == name))
        mesh = deepcopy(self.source["meshes"][node["mesh"]])
        for primitive in mesh["primitives"]:
            primitive["attributes"] = {key: self.accessor(i) for key, i in primitive["attributes"].items()}
            primitive["indices"] = self.accessor(primitive["indices"])
            primitive["material"] = self.material(primitive["material"])
        node["mesh"] = self.append("meshes", mesh)
        if translation is not None:
            node["translation"] = translation
        if rotation is not None:
            node["rotation"] = rotation
        self.document["scenes"][0]["nodes"].append(self.append("nodes", node))

    def save(self, filename):
        self.document["buffers"] = [{"byteLength": len(self.data)}]
        body = pad(json.dumps(self.document, separators=(",", ":")).encode(), b" ")
        size = 28 + len(body) + len(self.data)
        with (OUTPUT / filename).open("wb") as target:
            target.write(struct.pack("<4sII", b"glTF", 2, size))
            target.write(struct.pack("<I4s", len(body), b"JSON") + body)
            target.write(struct.pack("<I4s", len(self.data), b"BIN\x00") + self.data)


def prepare_aircon():
    asset = "exterior_aircon_unit"
    model = Model(asset, "Weathered exterior aircon", files(asset))
    model.add_node("exterior_aircon_unit_rusted", [-.00729, .32007, .21597])
    model.save("aircon.glb")


def prepare_fire_escape():
    asset = "modular_fire_escape"
    model = Model(asset, "Two-storey fire escape", files(asset))
    # Pack a mounted run of rails, platforms, and one ladder-free flight.
    # The bottom platform deck is the datum. The stair brackets can embed on the z=0 wall.
    model.add_node("modular_fire_escape_platform_bottom", [-.116, -.06, .90])
    model.add_node("modular_fire_escape_railing_bottom", [0, .668, 1.207])
    model.add_node("modular_fire_escape_stairs", [0, 2.125, .98])
    model.add_node("modular_fire_escape_platform_middle", [-.078, 3.292, .90])
    model.add_node("modular_fire_escape_railing_middle", [0, 3.984, 1.21])
    model.add_node("modular_fire_escape_platform_railing", [.54, 4.194, 1.058])
    model.save("fire-escape.glb")


def prepare_trash_can():
    asset = "metal_trash_can"
    model = Model(asset, "Weathered steel trash can", files(asset))
    prefix = "metal_trash_can_rust"
    model.add_node(prefix, [0, 0, 0])
    model.add_node(prefix + "_handle_left", [-.273, .64971, -.00020])
    model.add_node(prefix + "_handle_right", [.273, .64971, -.00020])
    model.add_node(prefix + "_lid", [0, .890, 0], [0, 0, 0, 1])
    model.save("trash-can.glb")


def prepare_ground_props():
    asset = "utility_box_02"
    utility = Model(asset, "Steel utility cabinet", files(asset))
    utility.add_node(asset)
    utility.save("utility-box.glb")
    asset = "water_manhole_cover"
    manhole = Model(asset, "Cast-iron water cover", files(asset))
    manhole.add_node(asset)
    manhole.add_node(asset + "_frame")
    manhole.save("manhole.glb")


def prepare_textures(asset):
    package = files(asset)
    stem = asset.replace("_", "-")
    maps = (
        ("Diffuse", "color", "RGB", 1024, 86),
        ("nor_gl", "normal", "RGB", 512, 88),
        ("Rough", "roughness", "L", 512, 79),
    )
    for source, label, mode, size, quality in maps:
        original = download(package[source]["1k"]["jpg"])
        image = decode(original, mode, size)
        image.save(OUTPUT / f"{stem}-{label}.webp", "WEBP", method=6, quality=quality)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    jobs = (
        prepare_aircon, prepare_fire_escape, prepare_trash_can, prepare_ground_props,
        lambda: prepare_textures("worn_asphalt"), lambda: prepare_textures("floor_pavement"),
    )
    with ThreadPoolExecutor(max_workers=3) as pool:
        for job in [pool.submit(job) for job in jobs]:
            job.result()


if __name__ == "__main__":
    main()
