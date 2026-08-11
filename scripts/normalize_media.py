#!/usr/bin/env python3
"""Transcode encounter media to compact, web-friendly formats and size limits."""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTENSIONS = {".avif", ".bmp", ".gif", ".heic", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}
AUDIO_EXTENSIONS = {".aac", ".aif", ".aiff", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav", ".wma"}
VIDEO_EXTENSIONS = {".avi", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".webm"}
# Decimal units match common web-hosting/file-manager displays and make the
# guarantees strictly smaller than 500 KB, 1 MB, and 2 MB respectively.
LIMITS = {"image": 500_000, "audio": 1_000_000, "video": 2_000_000}
TARGET_FRACTION = 0.96


def run(command: list[str], *, quiet: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        check=True,
        stdout=subprocess.PIPE if quiet else None,
        stderr=subprocess.PIPE if quiet else None,
        text=True,
    )


def duration(path: Path) -> float:
    result = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "json", str(path),
    ])
    value = float(json.loads(result.stdout)["format"]["duration"])
    if not math.isfinite(value) or value <= 0:
        raise ValueError("duration could not be determined")
    return value


def encode_image(source: Path, destination: Path, limit: int) -> None:
    # Try progressively lower quality, then progressively smaller dimensions.
    for max_width in (2560, 1920, 1600, 1280, 1024, 800, 640, 480):
        for quality in (72, 62, 52, 42, 32, 24, 16, 10):
            run([
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(source),
                "-map_metadata", "-1", "-frames:v", "1",
                "-vf", f"scale='min({max_width},iw)':-2:force_original_aspect_ratio=decrease",
                "-c:v", "libwebp", "-quality", str(quality), "-compression_level", "6",
                str(destination),
            ])
            if destination.stat().st_size <= limit * TARGET_FRACTION:
                return
    raise RuntimeError("could not reach the image size limit")


def encode_audio(source: Path, destination: Path, limit: int) -> None:
    seconds = duration(source)
    # Leave room for container overhead; speech remains intelligible at the floor.
    calculated = int(limit * TARGET_FRACTION * 8 / seconds / 1000)
    bitrate = max(12, min(64, calculated))
    for channels in (2, 1):
        for rate in range(bitrate, 11, -4):
            run([
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(source),
                "-map_metadata", "-1", "-vn", "-c:a", "libopus",
                "-b:a", f"{rate}k", "-vbr", "on", "-ac", str(channels),
                "-ar", "48000", str(destination),
            ])
            if destination.stat().st_size <= limit * TARGET_FRACTION:
                return
    raise RuntimeError("could not reach the audio size limit; shorten or split the recording")


def encode_video(source: Path, destination: Path, limit: int) -> None:
    seconds = duration(source)
    audio_kbps = 24
    total_kbps = int(limit * TARGET_FRACTION * 8 / seconds / 1000)
    initial_video_kbps = max(24, total_kbps - audio_kbps - 8)

    for max_width in (1280, 960, 720, 540, 480, 360, 240):
        for fraction in (1.0, 0.88, 0.76, 0.64, 0.52):
            video_kbps = max(20, int(initial_video_kbps * fraction))
            run([
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(source),
                "-map_metadata", "-1",
                "-vf", f"scale='min({max_width},iw)':-2:force_original_aspect_ratio=decrease",
                "-c:v", "libvpx-vp9", "-b:v", f"{video_kbps}k",
                "-maxrate", f"{video_kbps}k", "-bufsize", f"{video_kbps * 2}k",
                "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1",
                "-c:a", "libopus", "-b:a", f"{audio_kbps}k", "-ac", "1",
                str(destination),
            ])
            if destination.stat().st_size <= limit * TARGET_FRACTION:
                return
    raise RuntimeError("could not reach the video size limit; shorten or trim the clip")


def kind_for(path: Path) -> str | None:
    extension = path.suffix.lower()
    if extension in IMAGE_EXTENSIONS:
        return "image"
    if extension in AUDIO_EXTENSIONS:
        return "audio"
    if extension in VIDEO_EXTENSIONS:
        return "video"
    return None


def formatted_size(size: int) -> str:
    return f"{size / 1024:.0f} KiB"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", type=Path, default=ROOT / "media")
    parser.add_argument(
        "--output-dir", type=Path,
        help="write copies elsewhere instead of replacing files below the input directory",
    )
    parser.add_argument("--overwrite", action="store_true", help="replace outputs in --output-dir")
    args = parser.parse_args()

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        parser.error("ffmpeg and ffprobe must be installed and available on PATH")

    source_root = args.input.resolve()
    output_root = args.output_dir.resolve() if args.output_dir else source_root
    in_place = output_root == source_root
    if not source_root.is_dir():
        parser.error(f"input directory does not exist: {source_root}")
    if not in_place and source_root in output_root.parents:
        parser.error("--output-dir must be outside the input directory")

    files = sorted(
        path for path in source_root.rglob("*")
        if path.is_file()
        and not path.name.startswith(".")
        and kind_for(path)
        and "placeholders" not in path.relative_to(source_root).parts
    )
    if not files:
        print("No supported media files found.")
        return 0

    failures = 0
    extensions = {"image": ".webp", "audio": ".webm", "video": ".webm"}
    for source in files:
        kind = kind_for(source)
        assert kind is not None
        relative = source.relative_to(source_root).with_suffix(extensions[kind])
        destination = output_root / relative
        if in_place and source == destination and source.stat().st_size <= LIMITS[kind]:
            print(f"skip  {relative} (already normalized and below limit)")
            continue
        if not in_place and destination.exists() and not args.overwrite:
            print(f"skip  {relative} (already exists; use --overwrite)")
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_name(f".{destination.stem}.tmp{destination.suffix}")
        try:
            original_size = source.stat().st_size
            {"image": encode_image, "audio": encode_audio, "video": encode_video}[kind](
                source, temporary, LIMITS[kind]
            )
            temporary.replace(destination)
            if in_place and source != destination:
                source.unlink()
            print(
                f"{kind:5} {source.relative_to(source_root)} -> {relative} "
                f"({formatted_size(original_size)} -> {formatted_size(destination.stat().st_size)})"
            )
        except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
            temporary.unlink(missing_ok=True)
            failures += 1
            detail = error.stderr.strip().splitlines()[-1] if isinstance(error, subprocess.CalledProcessError) and error.stderr else str(error)
            print(f"error {source.relative_to(source_root)}: {detail}", file=sys.stderr)

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
