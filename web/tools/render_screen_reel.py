"""Render four short billboard spots into one silent browser video."""

import argparse
from math import cos, pi, sin, tau
from pathlib import Path
from random import Random
import subprocess

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont


WEB = Path(__file__).resolve().parents[1]
ART = WEB / "art" / "billboards"
ADS = WEB / "public" / "ads"
YESTERDAY = WEB.parent / "docs" / "previews" / "yesterday-xr.mp4"
WIDTH, HEIGHT = 1280, 720
TILE = 512, 288
ATLAS = TILE[0] * 2, TILE[1] * 2
FPS, FRAMES = 30, 84
X, Y = np.meshgrid(np.arange(WIDTH, dtype=np.float32), np.arange(HEIGHT, dtype=np.float32))


def title_card(brand, headline, accent, font_dir):
    card = Image.new("RGBA", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(card)
    label_font = ImageFont.truetype(str(font_dir / "ariblk.ttf"), 31)
    draw.rounded_rectangle((70, 168, 91, 192), radius=4, fill=accent)
    draw.text((108, 157), brand, font=label_font, fill="#efeeeb")
    font_path = str(font_dir / "impact.ttf")
    font = ImageFont.truetype(font_path, 118)
    width = max(font.getlength(line) for line in headline)
    if width > 575:
        font = ImageFont.truetype(font_path, int(118 * 575 / width))
    for i, line in enumerate(headline):
        draw.text((65, 228 + i * (font.size + 2)), line, font=font, fill=accent if i else "#efeeeb")
    return card


def lines(mask, points, color, width):
    vertices = np.around(np.asarray(points) * 8).astype(np.int32)
    cv2.polylines(mask, [vertices], False, int(color), width, cv2.LINE_AA, shift=3)


def drop(mask, x, y, radius, value):
    cv2.circle(mask, (round(x * 8), round(y * 8)), round(radius * 8), int(value), -1, cv2.LINE_AA, shift=3)


def field(cx, cy, sx, sy):
    return np.exp(-(((X - cx) / sx) ** 2 + ((Y - cy) / sy) ** 2))


def blank():
    return np.zeros((HEIGHT, WIDTH), np.uint8)


def tint(rgb, mask, color, opacity=1):
    alpha = (mask.astype(np.float32) * (opacity / 255))[..., None]
    rgb *= 1 - alpha
    rgb += alpha * np.asarray(color, dtype=np.float32)


def remap(plate, dx, dy):
    return cv2.remap(plate, X - dx, Y - dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)


def particles(seed, count):
    rng = Random(seed)
    return [tuple(rng.random() for _ in range(4)) for _ in range(count)]


RAIN = particles(106, 48)
SMOKE = particles(96, 29)
DEBRIS = particles(77, 28)
CLOUD = field(930, 137, 191, 97)
UNDER_CLOUD = field(937, 219, 118, 93)
GLASS = field(937, 430, 126, 115)
PUPPET = field(931, 173, 211, 295) * np.clip((645 - Y) / 335, 0, 1)
LIGHTER = field(837, 100, 36, 50)
HAND = np.clip((436 - Y) / 37, 0, 1) * np.clip((X - 838) / 96, 0, 1)
GRASS = field(929, 430, 87, 36)


def hangover(plate, t):
    p = tau * t
    rgb = remap(plate, CLOUD * (9 * sin(p) + 6 * np.sin(Y / 28 + p)), CLOUD * (5 * cos(p) + 3 * np.sin(X / 40 + p)))
    rain = blank()
    for start, spread, speed, weight in RAIN:
        age = (start + t * (2 if speed < .55 else 3)) % 1
        x = 825 + 209 * spread - 13 * age
        y = 199 + 239 * age
        opacity = sin(pi * age) ** .56
        lines(rain, [(x + 3, y - 14 - 21 * speed), (x, y)], (98 + 115 * weight) * opacity, 1 + int(weight > .68))
        splash = (start + t * 3) % 1
        if splash < .35:
            drop(rain, x + 18 * splash * cos(spread * tau), 439 - 59 * sin(pi * splash), 1.8 + 2.4 * weight, 131 * (1 - splash / .35))
    tint(rgb, cv2.GaussianBlur(rain, (0, 0), 2.4), (147, 118, 255), .62)
    tint(rgb, rain, (204, 191, 255), .8)

    strike = max(0, 1 - abs(t - .31) / .092)
    if strike > 0:
        bolt = blank()
        path = [(934, 157), (956, 209), (926, 245), (943, 277), (906, 333), (939, 352), (916, 406), (923, 426)]
        lines(bolt, path, round(210 * strike), 4)
        lines(bolt, [(926, 245), (897, 277), (899, 300), (874, 321)], round(180 * strike), 2)
        rgb += (UNDER_CLOUD * 24 + GLASS * 18)[..., None] * strike * np.array([.54, .49, 1])
        tint(rgb, cv2.GaussianBlur(bolt, (0, 0), 4.1), (156, 93, 255), .9)
        tint(rgb, bolt, (228, 198, 255), .94)
    return rgb


def quit_later(plate, t):
    p = tau * t
    cough = max(0, sin(p * 2 + .47)) ** 8
    dx, dy = 13 * sin(p) - 11 * cough, 4 * cos(p * 2) + 10 * cough
    rgb = remap(plate, dx * PUPPET, dy * PUPPET)
    smoke = blank()
    for start, spread, size, white in SMOKE:
        age = (start + t * (1 + int(white > .64))) % 1
        x = 941 + dx * .82 + 221 * age + 27 * sin(age * 10 - p + spread * 3) * age
        y = 91 + dy * .82 - 59 * age + 53 * sin(age * 5.6 + spread * 3) * age + (spread - .5) * 92 * age
        value = (110 + 59 * white) * sin(pi * age) ** .72
        drop(smoke, x, y, 8 + age * (10 + 23 * size), value)
        mouth_puff = (start + t * 2 + .38) % 1
        if spread < .42:
            x = 943 + dx + 168 * mouth_puff
            y = 271 + dy + 17 * sin(mouth_puff * 6 + size * 3) - 104 * mouth_puff ** 2
            drop(smoke, x, y, 10 + 22 * mouth_puff, (60 + size * 66) * sin(pi * mouth_puff) * (.44 + .56 * cough))
    tint(rgb, cv2.GaussianBlur(smoke, (0, 0), 9), (199, 173, 229), .71)

    flame = blank()
    length = (17 + 7 * sin(p * 9) + 3 * cos(p * 5)) * (1 - .72 * cough)
    x, y = 841 + .79 * dx, 85 + .79 * dy
    flicker = 5 * sin(7 * p) + 4 + 6 * cough
    pts = [(x - 4, y), (x - 6, y - 7), (x + flicker - 2, y - length), (x + 7, y - 6), (x + 4, y)]
    cv2.fillConvexPoly(flame, np.around(np.asarray(pts) * 8).astype(np.int32), 237, cv2.LINE_AA, shift=3)
    rgb += LIGHTER[..., None] * (10 + 4 * sin(p * 9)) * np.array([1, .51, .16])
    tint(rgb, cv2.GaussianBlur(flame, (0, 0), 5.5), (255, 107, 20), .93)
    tint(rgb, flame, (255, 221, 130), .88)
    return rgb


def karma(plate, t):
    p = tau * t
    tap = (.5 + .5 * cos(p * 2 + .7)) ** 2.2
    rgb = remap(plate, HAND * (5 - 11 * tap), HAND * (-25 + 37 * tap) + GRASS * (6 * tap))
    impact = blank()
    for start, angle, speed, weight in DEBRIS:
        age = (start + t * 2) % 1
        x = 927 + (angle - .5) * 143 * age
        y = 408 - (39 + 55 * speed) * sin(pi * age) + 16 * age
        size = 1.1 + weight * 2.9
        drop(impact, x, y, size, 208 * sin(pi * age) * (.4 + .6 * tap))
    rgb += GRASS[..., None] * (6 * tap) * np.array([.54, 1, .1])
    tint(rgb, impact, (213, 254, 120), .9)
    return rgb


def overlay_debits(image, t, font):
    draw = ImageDraw.Draw(image)
    for offset, x, y, amount in [(0, 1050, 416, "−1"), (.51, 723, 343, "−99")]:
        age = (t * 2 + offset) % 1
        y -= 99 * age
        width = int(font.getlength(amount)) + 31
        opacity = sin(pi * age) ** .43
        overlay = Image.new("RGBA", (width, 52))
        box = ImageDraw.Draw(overlay)
        box.rounded_rectangle((0, 0, width - 1, 51), 12, fill=(249, 69, 38, round(244 * opacity)))
        box.text((15, 1), amount, fill=(255, 239, 231, round(255 * opacity)), font=font)
        image.alpha_composite(overlay, (x, round(y)))
    return image


def make_spot(file, brand, headline, accent, animation, font_dir):
    with Image.open(ART / file) as image:
        plate = np.array(image.convert("RGB"))
    card = title_card(brand, headline, accent, font_dir)
    debit_font = ImageFont.truetype(str(font_dir / "ariblk.ttf"), 35) if animation is karma else None

    def frame(t):
        rgb = animation(plate, t)
        image = Image.fromarray(np.uint8(np.clip(rgb, 0, 255))).convert("RGBA")
        if debit_font:
            overlay_debits(image, t, debit_font)
        return Image.alpha_composite(image, card).convert("RGB")

    return frame


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font-dir", type=Path, default=Path("C:/Windows/Fonts"), help="Folder containing Impact and Arial Black.")
    args = parser.parse_args()
    spots = [
        make_spot("instant-hangover.webp", "INSTANT HANGOVER", ("ALL PAIN.", "NO BUZZ."), "#ffc470", hangover, args.font_dir),
        make_spot("quit-later.webp", "QUIT LATER CIGARETTES", ("QUIT", "TOMORROW."), "#dac9ff", quit_later, args.font_dir),
        make_spot("karma-exchange.webp", "REDDIT KARMA EXCHANGE", ("TOUCH GRASS.", "LOSE KARMA."), "#ffb285", karma, args.font_dir),
    ]
    yesterday = cv2.VideoCapture(str(YESTERDAY))
    if not yesterday.isOpened() or yesterday.get(cv2.CAP_PROP_FRAME_COUNT) != FRAMES or yesterday.get(cv2.CAP_PROP_FPS) != FPS:
        raise ValueError("Yesterday XR must be the original 84-frame 30 fps clip.")

    encoder = [
        imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "warning", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{ATLAS[0]}x{ATLAS[1]}", "-r", str(FPS), "-i", "-",
        "-vf", "scale=out_color_matrix=bt709", "-an", "-c:v", "libx264", "-profile:v", "main",
        "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-colorspace", "bt709",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", str(ADS / "street-satire.mp4"),
    ]
    with subprocess.Popen(encoder, stdin=subprocess.PIPE) as process:
        with process.stdin:
            for index in range(FRAMES):
                ok, bgr = yesterday.read()
                if not ok:
                    raise ValueError(f"Could not read Yesterday XR frame {index}.")
                atlas = Image.new("RGB", ATLAS)
                tiles = [Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)), *(spot(index / FRAMES) for spot in spots)]
                for tile, image in enumerate(tiles):
                    atlas.paste(image.resize(TILE, Image.Resampling.LANCZOS), (TILE[0] * (tile % 2), TILE[1] * (tile // 2)))
                process.stdin.write(atlas.tobytes())
                if index == 22:
                    atlas.save(ADS / "street-satire-poster.webp", quality=91)
        if process.wait():
            raise SystemExit("Could not encode the street screen reel.")
    yesterday.release()


if __name__ == "__main__":
    main()
