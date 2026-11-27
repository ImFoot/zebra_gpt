"""Render the Continuum's four silent screen loops into a shared video texture."""

import argparse
from pathlib import Path
import subprocess

import imageio_ffmpeg
import moderngl
from PIL import Image


AD_DIRECTORY = Path(__file__).resolve().parents[1] / "public" / "ads"
SHADER = Path(__file__).with_name("screen_reel.frag")
TILE_WIDTH, TILE_HEIGHT = 512, 288
WIDTH, HEIGHT = TILE_WIDTH * 2, TILE_HEIGHT * 2
FPS, SECONDS = 24, 12
VERTEX = """#version 330
void main() {
    vec2 position = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(position * 2.0 - 1.0, 0, 1);
}
"""


def make_renderer():
    context = moderngl.create_standalone_context(require=330)
    program = context.program(vertex_shader=VERTEX, fragment_shader=SHADER.read_text(encoding="utf8"))
    triangle = context.vertex_array(program, [])
    surface = context.simple_framebuffer((TILE_WIDTH, TILE_HEIGHT))
    surface.use()
    with Image.open(AD_DIRECTORY / "ad-exchange.webp") as image:
        rgb = image.convert("RGB").transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        artwork = context.texture(rgb.size, 3, rgb.tobytes())
    artwork.repeat_x = artwork.repeat_y = False
    artwork.use()
    program["resolution"].value = TILE_WIDTH, TILE_HEIGHT

    def frame(progress):
        atlas = Image.new("RGB", (WIDTH, HEIGHT))
        program["progress"].value = progress
        for channel in range(4):
            program["channel"].value = channel
            triangle.render(moderngl.TRIANGLES, vertices=3)
            tile = Image.frombytes("RGB", surface.size, surface.read(components=3, alignment=1), "raw", "RGB", 0, -1)
            atlas.paste(tile, ((channel % 2) * TILE_WIDTH, (channel // 2) * TILE_HEIGHT))
        return atlas

    return frame


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stills", type=Path, help="Write a few review frames and skip video encoding.")
    args = parser.parse_args()
    frame = make_renderer()
    if args.stills:
        args.stills.mkdir(parents=True, exist_ok=True)
        for progress in (0.02, 0.25, 0.45, 0.65, 0.84):
            frame(progress).save(args.stills / f"{progress:.2f}.png")
        return

    frame(.04).save(AD_DIRECTORY / "street-reel-poster.webp", quality=87)
    encoder = [
        imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "warning", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-",
        "-vf", "scale=out_color_matrix=bt709", "-an", "-c:v", "libx264", "-profile:v", "main",
        "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-colorspace", "bt709",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart",
        str(AD_DIRECTORY / "street-reel.mp4"),
    ]
    with subprocess.Popen(encoder, stdin=subprocess.PIPE) as process:
        with process.stdin:
            for index in range(FPS * SECONDS):
                process.stdin.write(frame(index / (FPS * SECONDS)).tobytes())
        if process.wait():
            raise SystemExit("Could not encode the street screen reel.")


if __name__ == "__main__":
    main()
