#!/usr/bin/env python3
"""Ornate confirm tablet + compact wood bars with real calligraphy."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

UI = Path("/workspace/public/ui")
FONT = Path("/workspace/public/fonts/MaShanZheng-Regular.ttf")


def wood(size, seed, dark=True):
    w, h = size
    rng = np.random.default_rng(seed)
    yy = np.linspace(0, 16 * np.pi, h)[:, None]
    xx = np.linspace(0, 3.2 * np.pi, w)[None, :]
    wave = np.sin(yy * 0.45 + 0.35 * np.sin(xx * 2.2)) * 0.5 + 0.5
    grain = rng.normal(0, 1, (h, max(8, w // 20)))
    grain = np.repeat(grain, w // grain.shape[1] + 1, axis=1)[:, :w]
    field = 0.6 * wave + 0.22 * (grain * 0.08 + 0.5) + rng.normal(0, 0.05, (h, w))
    field = (field - field.min()) / (field.max() - field.min() + 1e-6)
    if dark:
        r = 42 + field * 48
        g = 28 + field * 30
        b = 16 + field * 16
    else:
        r = 92 + field * 70
        g = 62 + field * 42
        b = 34 + field * 22
    return Image.fromarray(np.stack([r, g, b], axis=-1).clip(0, 255).astype(np.uint8), "RGB")


def vignette(im, strength=0.42):
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    y, x = np.ogrid[:h, :w]
    nx = (x - w / 2) / (w * 0.52)
    ny = (y - h / 2) / (h * 0.52)
    fall = np.clip((nx * nx + ny * ny - 0.12) / 1.2, 0, 1)
    a *= (1 - fall * strength)[..., None]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGB")


def tablet():
    w, h = 980, 720
    base = vignette(wood((w, h), 9, dark=True), 0.5)
    rgba = base.convert("RGBA")
    d = ImageDraw.Draw(rgba)
    gold = (196, 158, 82, 230)
    # outer frame
    d.rounded_rectangle([10, 10, w - 11, h - 11], radius=28, outline=(18, 12, 8, 255), width=10)
    d.rounded_rectangle([22, 22, w - 23, h - 23], radius=22, outline=(120, 88, 44, 200), width=3)
    d.rounded_rectangle([32, 32, w - 33, h - 33], radius=18, outline=gold, width=3)
    # inner writing well
    well = wood((w - 120, h - 140), 14, dark=True)
    well = vignette(well, 0.28).convert("RGBA")
    rgba.paste(well, (60, 70), well)
    d.rounded_rectangle([58, 68, w - 59, h - 71], radius=14, outline=(168, 132, 68, 180), width=2)
    # corner clouds
    for cx, cy in ((78, 78), (w - 78, 78), (78, h - 78), (w - 78, h - 78)):
        d.ellipse([cx - 28, cy - 16, cx + 10, cy + 16], outline=gold, width=3)
        d.ellipse([cx - 10, cy - 28, cx + 22, cy + 8], outline=gold, width=3)
    rgba.save(UI / "tablet-confirm.png", "PNG")
    print("tablet-confirm", rgba.size)


def bar(name: str, text: str, seed: int):
    w, h = 760, 118
    base = vignette(wood((w, h), seed, dark=False), 0.22).convert("RGBA")
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([2, 2, w - 3, h - 3], radius=10, outline=(48, 32, 16, 220), width=3)
    d.rounded_rectangle([8, 8, w - 9, h - 9], radius=8, outline=(196, 158, 82, 160), width=2)
    font = ImageFont.truetype(str(FONT), size=52)
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) / 2 - bbox[0]
    y = h * 0.50 - th / 2 - bbox[1]
    d.text((x + 2, y + 2), text, font=font, fill=(40, 26, 12, 180))
    d.text((x, y), text, font=font, fill=(244, 228, 186, 255))
    # oval-ish alpha so corners aren't sharp boxes
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, w - 1, h - 1], radius=16, fill=255)
    base.putalpha(mask)
    path = UI / name
    base.save(path, "PNG")
    print(name, text, base.size)


def main():
    tablet()
    bar("slip-keep.png", "留下", 21)
    bar("slip-restart.png", "重新問道", 27)


if __name__ == "__main__":
    main()
