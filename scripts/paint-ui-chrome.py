#!/usr/bin/env python3
"""Paint event UI chrome from procedural wood/silk — never from photos.

Cropping title-bg / event landscapes into these plates is how
龍者迪文 calligraphy leaked into the choice panel.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

OUT = Path("/workspace/public/ui")
OUT.mkdir(parents=True, exist_ok=True)


def grade(im, brightness=1.0, color=1.0, contrast=1.0, tint=(0, 0, 0), tint_a=0.0):
    im = ImageEnhance.Brightness(im).enhance(brightness)
    im = ImageEnhance.Color(im).enhance(color)
    im = ImageEnhance.Contrast(im).enhance(contrast)
    if tint_a > 0:
        overlay = Image.new("RGB", im.size, tint)
        im = Image.blend(im, overlay, tint_a)
    return im


def grain(im, amount=8, seed=7):
    arr = np.asarray(im).astype(np.int16)
    rng = np.random.default_rng(seed)
    noise = rng.integers(-amount, amount + 1, arr.shape, dtype=np.int16)
    return Image.fromarray((arr + noise).clip(0, 255).astype(np.uint8))


def wood_texture(size, seed=3):
    w, h = size
    rng = np.random.default_rng(seed)
    yy = np.linspace(0, 18 * np.pi, h)[:, None]
    xx = np.linspace(0, 2.4 * np.pi, w)[None, :]
    wave = np.sin(yy + 0.35 * np.sin(xx * 3.0)) * 0.5 + 0.5
    noise = rng.normal(0, 0.08, (h, w))
    grain_n = rng.normal(0, 1, (h, max(8, w // 18)))
    grain_n = np.repeat(grain_n, w // grain_n.shape[1] + 1, axis=1)[:, :w]
    field = 0.55 * wave + 0.25 * (grain_n * 0.08 + 0.5) + noise
    field = (field - field.min()) / (field.max() - field.min() + 1e-6)
    r = 28 + field * 38
    g = 18 + field * 24
    b = 10 + field * 14
    return Image.fromarray(np.stack([r, g, b], axis=-1).clip(0, 255).astype(np.uint8))


def silk_texture(size, seed=5):
    w, h = size
    rng = np.random.default_rng(seed)
    xx = np.linspace(0, 10 * np.pi, w)
    band = 0.55 + 0.45 * np.sin(xx)
    field = np.repeat(band[None, :], h, axis=0) + rng.normal(0, 0.04, (h, w))
    field = np.clip(field, 0, 1)
    r = 168 + field * 52
    g = 140 + field * 40
    b = 96 + field * 28
    return Image.fromarray(np.stack([r, g, b], axis=-1).clip(0, 255).astype(np.uint8))


def gold_frame(rgba, inset=5, gold=(196, 158, 82, 220), thick=2, arm=28):
    w, h = rgba.size
    d = ImageDraw.Draw(rgba)
    d.rectangle([0, 0, w - 1, h - 1], outline=(8, 6, 4, 235), width=4)
    d.rectangle([inset, inset, w - inset - 1, h - inset - 1], outline=(120, 92, 46, 170), width=2)
    d.rectangle([inset + 5, inset + 5, w - inset - 6, h - inset - 6], outline=gold, width=thick)
    for x0, y0, dx, dy in (
        (inset + 4, inset + 4, 1, 1),
        (w - inset - 5, inset + 4, -1, 1),
        (inset + 4, h - inset - 5, 1, -1),
        (w - inset - 5, h - inset - 5, -1, -1),
    ):
        d.line([(x0, y0), (x0 + dx * arm, y0)], fill=gold, width=3)
        d.line([(x0, y0), (x0, y0 + dy * arm)], fill=gold, width=3)
    return rgba


def draw_panel(size):
    base = grain(grade(wood_texture(size, 11), 0.72, 0.85, 1.2, (12, 8, 6), 0.35), 8, 11)
    arr = np.asarray(base).astype(np.float32)
    h, w = arr.shape[:2]
    y, x = np.ogrid[:h, :w]
    mx = np.clip((np.minimum(x, w - 1 - x) - 24) / (w * 0.38), 0, 1)
    my = np.clip((np.minimum(y, h - 1 - y) - 24) / (h * 0.38), 0, 1)
    fall = np.minimum(mx, my) ** 1.15
    arr *= (1 - fall * 0.55)[..., None]
    return gold_frame(Image.fromarray(arr.clip(0, 255).astype(np.uint8)).convert("RGBA"), inset=6, arm=40)


def draw_plaque(size, hover=False):
    base = grain(grade(wood_texture(size, 19 if hover else 17), 0.82 if hover else 0.68, 0.8, 1.18, (18, 12, 8), 0.28), 7)
    return gold_frame(
        base.convert("RGBA"),
        inset=4,
        gold=(214, 176, 96, 235) if hover else (196, 158, 82, 210),
        arm=22,
    )


def draw_banner(size):
    base = grain(grade(silk_texture(size, 23), 0.88, 0.7, 1.08, (200, 176, 130), 0.22), 6, 23)
    rgba = gold_frame(base.convert("RGBA"), inset=3, gold=(168, 128, 62, 230), thick=2, arm=18)
    d = ImageDraw.Draw(rgba)
    w, h = size
    d.rectangle([0, 0, 16, h], fill=(36, 24, 12, 245))
    d.rectangle([w - 17, 0, w, h], fill=(36, 24, 12, 245))
    d.line([(16, 2), (16, h - 3)], fill=(196, 158, 82, 230), width=2)
    d.line([(w - 17, 2), (w - 17, h - 3)], fill=(196, 158, 82, 230), width=2)
    return rgba


def draw_frame(size):
    w, h = size
    border = 26
    rgba = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(rgba)
    d.rectangle([0, 0, w - 1, h - 1], fill=(28, 20, 12, 245))
    d.rectangle([4, 4, w - 5, h - 5], outline=(168, 132, 68, 230), width=3)
    d.rectangle([9, 9, w - 10, h - 10], outline=(92, 70, 36, 200), width=2)
    d.rectangle([border, border, w - border - 1, h - border - 1], fill=(0, 0, 0, 0))
    gold = (214, 176, 96, 240)
    arm = 34
    for x0, y0, dx, dy in (
        (6, 6, 1, 1),
        (w - 7, 6, -1, 1),
        (6, h - 7, 1, -1),
        (w - 7, h - 7, -1, -1),
    ):
        d.line([(x0, y0), (x0 + dx * arm, y0)], fill=gold, width=4)
        d.line([(x0, y0), (x0, y0 + dy * arm)], fill=gold, width=4)
    return rgba


def main():
    draw_plaque((960, 168), False).save(OUT / "choice-slip.png", optimize=True)
    draw_plaque((960, 168), True).save(OUT / "choice-slip-hover.png", optimize=True)
    # JPEG so the panel cannot smuggle a 1.5MB photo with calligraphy
    draw_panel((780, 980)).convert("RGB").save(OUT / "event-panel.jpg", quality=82, optimize=True)
    draw_frame((640, 860)).save(OUT / "portrait-frame.png", optimize=True)
    draw_banner((1100, 160)).save(OUT / "title-banner.png", optimize=True)
    for p in sorted(OUT.iterdir()):
        print("wrote", p.name, p.stat().st_size)


if __name__ == "__main__":
    main()
