"""Build browser GLBs from the Godot hero assets with Python 3 and Pillow."""

import io
import json
from pathlib import Path
import struct

from PIL import Image


WEB_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = WEB_DIR.parent / "game" / "assets" / "heroes"
OUTPUT_DIR = WEB_DIR / "public" / "models"

# Preserve the normal and ORM channels at full chroma resolution.
TEXTURE_SETTINGS = {
    "color": (2048, 86, 2),
    "normal": (1024, 95, 0),
    "orm": (1024, 87, 0),
}


def read_glb(path):
    source = path.read_bytes()
    magic, version, file_size = struct.unpack_from("<4sII", source)
    json_size, json_type = struct.unpack_from("<I4s", source, 12)
    json_end = 20 + json_size
    binary_size, binary_type = struct.unpack_from("<I4s", source, json_end)
    binary_start = json_end + 8
    if (
        (magic, version, file_size) != (b"glTF", 2, len(source))
        or (json_type, binary_type) != (b"JSON", b"BIN\0")
        or binary_start + binary_size != file_size
    ):
        raise ValueError(f"Expected a glTF 2.0 file with JSON and BIN chunks: {path}")
    document = json.loads(source[20:json_end])
    buffers = document["buffers"]
    if len(buffers) != 1 or "uri" in buffers[0]:
        raise ValueError(f"Expected a single embedded buffer: {path}")
    return document, source[binary_start:]


def texture_roles(document):
    roles = {}
    for material in document["materials"]:
        pbr = material["pbrMetallicRoughness"]
        texture_references = (
            (pbr.get("baseColorTexture"), "color"),
            (material.get("normalTexture"), "normal"),
            (pbr.get("metallicRoughnessTexture"), "orm"),
            (material.get("occlusionTexture"), "orm"),
        )
        for reference, role in texture_references:
            if reference is None:
                continue
            image_index = document["textures"][reference["index"]]["source"]
            if roles.setdefault(image_index, role) != role:
                raise ValueError("Texture uses conflicting image settings")
    return roles


def recompress_texture(source, role):
    max_dimension, quality, subsampling = TEXTURE_SETTINGS[role]
    output = io.BytesIO()
    with Image.open(io.BytesIO(source)) as image:
        if image.mode != "RGB" or image.info.get("transparency") is not None:
            raise ValueError(f"Expected an opaque RGB {role} texture")
        image.thumbnail(
            (max_dimension, max_dimension), Image.Resampling.LANCZOS, reducing_gap=3.0
        )
        image.save(output, format="JPEG", quality=quality, subsampling=subsampling, optimize=True)
    return output.getvalue()


def write_glb(path, document, binary):
    json_bytes = json.dumps(document, separators=(",", ":")).encode("utf-8")
    json_bytes += b" " * (-len(json_bytes) % 4)
    binary.extend(b"\0" * (-len(binary) % 4))
    file_size = 28 + len(json_bytes) + len(binary)
    with path.open("wb") as output:
        output.write(struct.pack("<4sIII4s", b"glTF", 2, file_size, len(json_bytes), b"JSON"))
        output.write(json_bytes)
        output.write(struct.pack("<I4s", len(binary), b"BIN\0"))
        output.write(binary)


def export_hero(name):
    source = SOURCE_DIR / f"{name}_chase.glb"
    output = OUTPUT_DIR / f"{name}.glb"
    document, original_binary = read_glb(source)
    views = document["bufferViews"]
    replacement_textures = {}
    for image_index, role in texture_roles(document).items():
        image = document["images"][image_index]
        view_index = image["bufferView"]
        view = views[view_index]
        offset = view.get("byteOffset", 0)
        encoded = original_binary[offset:offset + view["byteLength"]]
        replacement_textures[view_index] = recompress_texture(encoded, role)
        image["mimeType"] = "image/jpeg"

    # Repack the buffer without altering any mesh, skin, or animation payload.
    binary = bytearray()
    for view_index, view in enumerate(views):
        offset = view.get("byteOffset", 0)
        payload = replacement_textures.get(view_index)
        if payload is None:
            payload = original_binary[offset:offset + view["byteLength"]]
        binary.extend(b"\0" * (-len(binary) % 4))
        view["byteOffset"] = len(binary)
        view["byteLength"] = len(payload)
        binary.extend(payload)

    document["buffers"][0]["byteLength"] = len(binary)
    write_glb(output, document, binary)
    print(f"{name}: {source.stat().st_size / 2**20:.2f} MiB -> {output.stat().st_size / 2**20:.2f} MiB")


if __name__ == "__main__":
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for hero in ("stan", "zebra"):
        export_hero(hero)
