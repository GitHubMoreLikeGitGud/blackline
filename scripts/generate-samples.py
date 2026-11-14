#!/usr/bin/env python3
"""Render the fictional specimen pages in src/specimens.json to PNG.

Every glyph on the page comes from that specimen's text. Decoration is
rules and paper colour only, so the picture and the pattern-check text match.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SPECIMENS = ROOT / "src" / "specimens.json"
OUT_DIR = ROOT / "public" / "samples"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def render(specimen: dict[str, str], destination: Path) -> None:
    lines = specimen["text"].split("\n")
    font = ImageFont.truetype(SANS, 22)
    bold = ImageFont.truetype(SANS_BOLD, 26)
    pad_x = 72
    pad_y = 64
    line_h = 36
    width = 980
    height = pad_y * 2 + line_h * max(len(lines), 1)
    image = Image.new("RGB", (width, height), "#f7f3ea")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 18, height), fill="#1b1714")
    y = pad_y
    for index, line in enumerate(lines):
        face = bold if index == 0 else font
        if line:
            length = face.getlength(line)
            limit = width - pad_x - 28
            if length > limit:
                raise SystemExit(f"{specimen['id']} line is too wide ({length:.0f}px): {line}")
            draw.text((pad_x, y), line, fill="#1b1714", font=face)
        y += line_h
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "PNG")


def main() -> None:
    payload = json.loads(SPECIMENS.read_text(encoding="utf-8"))
    for specimen in payload["specimens"]:
        target = OUT_DIR / specimen["filename"]
        render(specimen, target)
        print(target.relative_to(ROOT))


if __name__ == "__main__":
    main()
