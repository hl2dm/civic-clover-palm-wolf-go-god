#!/usr/bin/env python3
"""Rewrite shop wood-slip labels with a real calligraphy font on the original wood."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

UI = Path("/workspace/public/ui")
FONT = Path("/workspace/public/fonts/MaShanZheng-Regular.ttf")
SRC = Path("/workspace/tmp-art/shop-slips-src")

JOBS = {
    "slip-buy.png": "購置",
    "slip-pass.png": "作罷",
    "slip-leave.png": "離去",
    "slip-remove.png": "廢功",
}


def wipe_center(im: Image.Image) -> Image.Image:
    """Blend left/right clean wood across the old broken glyphs."""
    arr = np.asarray(im).astype(np.float32)
    h, w = arr.shape[:2]
    left = arr[:, int(w * 0.10) : int(w * 0.22)].mean(axis=1, keepdims=True)
    right = arr[:, int(w * 0.78) : int(w * 0.90)].mean(axis=1, keepdims=True)
    t = np.linspace(0, 1, w, dtype=np.float32)[None, :, None]
    # only wipe the middle 62%
    x = np.linspace(0, 1, w, dtype=np.float32)
    wipe = np.clip((x - 0.18) / 0.10, 0, 1) * np.clip((0.82 - x) / 0.10, 0, 1)
    wipe = wipe[None, :, None]
    fill = left * (1 - t) + right * t
    # keep a hint of original grain
    mixed = fill * 0.78 + arr * 0.22
    out = arr * (1 - wipe) + mixed * wipe
    rgba = Image.fromarray(out.clip(0, 255).astype(np.uint8), "RGBA")
    # soften the wipe seam
    blur = rgba.filter(ImageFilter.GaussianBlur(0.8))
    ba = np.asarray(blur).astype(np.float32)
    seam = np.clip(wipe * 1.15, 0, 1)
    merged = np.asarray(rgba).astype(np.float32) * (1 - seam * 0.35) + ba * (seam * 0.35)
    # preserve original alpha silhouette
    merged[:, :, 3] = arr[:, :, 3]
    return Image.fromarray(merged.clip(0, 255).astype(np.uint8), "RGBA")


def paint(src: Path, dest: Path, text: str) -> None:
    im = wipe_center(Image.open(src).convert("RGBA"))
    w, h = im.size
    draw = ImageDraw.Draw(im)
    font = ImageFont.truetype(str(FONT), size=int(h * 0.46))
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) / 2 - bbox[0]
    y = h * 0.50 - th / 2 - bbox[1]
    draw.text((x + 2, y + 3), text, font=font, fill=(40, 26, 12, 175))
    draw.text((x, y), text, font=font, fill=(244, 228, 186, 255))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")
    print("wrote", dest.name, text, im.size)


def main() -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    for name, text in JOBS.items():
        src = SRC / name
        dest = UI / name
        if not src.exists():
            # first run after rebuild: the dest is already procedural wood.
            # fall back to dest itself (still has the oval alpha).
            src = dest
        paint(src, dest, text)


if __name__ == "__main__":
    main()
