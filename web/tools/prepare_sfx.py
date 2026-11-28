"""Prepare the chase mix from the listed CC0 BigSoundBank recordings."""

import argparse
import json
from pathlib import Path
import subprocess

import imageio_ffmpeg
import numpy as np
from scipy.signal import butter, sosfilt


OUTPUT = Path(__file__).resolve().parents[1] / "public" / "audio"
RATE = 32000
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
# Source, in/out seconds, channels, loop crossfade seconds, high/low pass Hz, peak level
CLIPS = {
    "rain": ("rain", 5, 22, 2, 1.1, 130, 9500, .69),
    "wind": ("wind", 4, 13, 1, .65, 80, 4550, .64),
    "drone": ("drone", 8.08, 10.74, 1, .27, 95, 3550, .74),
    "hoof-a": ("hooves", .031, .179, 1, 0, 57, 9050, .84),
    "hoof-b": ("hooves", .265, .411, 1, 0, 57, 9050, .84),
    "hoof-c": ("hooves", .547, .706, 1, 0, 57, 9050, .85),
    "hoof-d": ("hooves", 1.198, 1.354, 1, 0, 57, 9050, .84),
    "glass": ("glass", .055, 1.15, 1, 0, 120, 11400, .83),
    "splash": ("splash", .093, 1.08, 1, 0, 83, 8600, .74),
    "skid": ("skid", 4.38, 6.42, 1, 0, 120, 7800, .76),
    "boom": ("explosion", 0, .33, 1, 0, 34, 7250, .89),
    "whoosh": ("whoosh", 2.40, 2.84, 1, 0, 78, 8550, .80),
    "metal": ("metal", 4.89, 5.77, 1, 0, 100, 9400, .81),
    "alert": ("alert", .124, .555, 1, 0, 160, 5700, .71),
    "signal": ("signal", 0, .42, 1, 0, 140, 4800, .69),
    "maglev": ("maglev", .55, 6.04, 1, 0, 44, 7200, .79),
    "wake": ("wake", .17, 2.18, 1, 0, 82, 9400, .81),
}


def prepare(source, name, start, end, channels, seam, high, low, level):
    data = subprocess.check_output([
        FFMPEG, "-v", "error", "-ss", str(start), "-i", str(source), "-t", str(end - start),
        "-ac", str(channels), "-ar", str(RATE), "-f", "f32le", "-",
    ])
    samples = np.frombuffer(data, dtype="<f4").reshape(-1, channels)
    filters = butter(3, (high, low), fs=RATE, btype="bandpass", output="sos")
    samples = sosfilt(filters, samples, axis=0).astype("<f4")
    if seam:
        length = int(RATE * seam)
        blend = np.linspace(0, 1, length, dtype=np.float32)[:, None]
        samples = np.concatenate((samples[-length:] * (1 - blend) + samples[:length] * blend, samples[length:-length]))
    else:
        first = int(.004 * RATE)
        last = min(len(samples) // 3, int(.067 * RATE))
        samples[:first] *= np.linspace(0, 1, first)[:, None]
        samples[-last:] *= np.linspace(1, 0, last)[:, None]
    samples *= level / max(np.max(np.abs(samples)), .001)
    subprocess.run([
        FFMPEG, "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", str(channels), "-i", "-",
        "-codec:a", "libmp3lame", "-b:a", "112k" if channels == 2 else "64k", str(OUTPUT / f"{name}.mp3"),
    ], input=samples.tobytes(), check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", type=Path, help="Directory containing the original recordings and sources.json.")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source_list = json.loads((args.sources / "sources.json").read_text(encoding="utf-8-sig"))
    sources = {entry["Name"]: entry for entry in source_list}
    entries = []
    for name, (origin, *params) in CLIPS.items():
        record = sources[origin]
        source = args.sources / f"{origin}{Path(record['Media']).suffix}"
        prepare(source, name, *params)
        entries.append({
            "asset": f"{name}.mp3", "source": record["Page"], "download": record["Media"],
            "source_sha256": record["Hash"], "trim_seconds": params[:2], "loop_crossfade_seconds": params[3],
        })
    manifest = {
        "publisher": "BigSoundBank / LaSonothèque, Joseph Sardin", "license": "CC0-1.0",
        "license_url": "https://bigsoundbank.com/licenses.html",
        "preparation": "Trim, equalize, level-match, crossfade loops and encode as MP3. See web/tools/prepare_sfx.py.",
        "sounds": entries,
    }
    manifest_path = OUTPUT / "sources.json"
    if manifest_path.exists():
        previous = json.loads(manifest_path.read_text(encoding="utf8"))
        if "additional_sounds" in previous:
            manifest["additional_sounds"] = previous["additional_sounds"]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8", newline="\n")


if __name__ == "__main__":
    main()
