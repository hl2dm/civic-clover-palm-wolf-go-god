#!/usr/bin/env python3
"""Rebuild event landscapes + UI chrome from verified-clean sources.

cave.jpg was a leaked title plate (龍者迪文). It is now a freshly generated
clean grotto. cliff / forest / storm / spring are clean Shan shui plates.
Never composite title-bg, og.jpg, or any plate that once carried calligraphy.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path("/workspace/public")
SCENES = ROOT / "scenes"
EVENTS = SCENES / "events"
UI = ROOT / "ui"
W, H = 1920, 1080


def load(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def cover(im: Image.Image, size: tuple[int, int], focus=(0.5, 0.45)) -> Image.Image:
    tw, th = size
    w, h = im.size
    scale = max(tw / w, th / h)
    nw, nh = int(w * scale), int(h * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    cx, cy = int(nw * focus[0]), int(nh * focus[1])
    left = max(0, min(nw - tw, cx - tw // 2))
    top = max(0, min(nh - th, cy - th // 2))
    return im.crop((left, top, left + tw, top + th))


def grade(im, brightness=1.0, color=1.05, contrast=1.08, tint=(0, 0, 0), tint_a=0.0):
    im = ImageEnhance.Brightness(im).enhance(brightness)
    im = ImageEnhance.Color(im).enhance(color)
    im = ImageEnhance.Contrast(im).enhance(contrast)
    if tint_a > 0:
        overlay = Image.new("RGB", im.size, tint)
        im = Image.blend(im, overlay, tint_a)
    return im


def vignette(im, strength=0.58, cx=0.5, cy=0.42):
    arr = np.asarray(im).astype(np.float32)
    h, w = arr.shape[:2]
    y, x = np.ogrid[:h, :w]
    rx, ry = w * 0.74, h * 0.80
    d = ((x - w * cx) / rx) ** 2 + ((y - h * cy) / ry) ** 2
    fall = np.clip((d - 0.32) / 1.15, 0, 1) ** 1.3
    arr *= (1 - fall * strength)[..., None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))


def glow(im, color, center, radius, alpha=0.3):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    for i in range(8, 0, -1):
        r = int(radius * i / 8)
        a = int(alpha * 255 * (i / 8) ** 2)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")


def grain(im, amount=10, seed=7):
    arr = np.asarray(im).astype(np.int16)
    rng = np.random.default_rng(seed)
    noise = rng.integers(-amount, amount + 1, arr.shape, dtype=np.int16)
    return Image.fromarray((arr + noise).clip(0, 255).astype(np.uint8))


def save_jpg(im: Image.Image, dest: Path, quality=86):
    im = im.filter(ImageFilter.UnsharpMask(radius=1.1, percent=24, threshold=3))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=quality, optimize=True)
    print(f"wrote {dest.relative_to(ROOT)}  {dest.stat().st_size}")


def wood_texture(size, seed=3):
    """Procedural dark lacquer — never a photo, so never calligraphy."""
    w, h = size
    rng = np.random.default_rng(seed)
    yy = np.linspace(0, 18 * np.pi, h)[:, None]
    xx = np.linspace(0, 2.4 * np.pi, w)[None, :]
    wave = np.sin(yy + 0.35 * np.sin(xx * 3.0)) * 0.5 + 0.5
    noise = rng.normal(0, 0.08, (h, w))
    # stretch noise along x for grain
    grain_n = rng.normal(0, 1, (h, max(8, w // 18)))
    grain_n = np.repeat(grain_n, w // grain_n.shape[1] + 1, axis=1)[:, :w]
    field = 0.55 * wave + 0.25 * (grain_n * 0.08 + 0.5) + noise
    field = (field - field.min()) / (field.max() - field.min() + 1e-6)
    r = 28 + field * 38
    g = 18 + field * 24
    b = 10 + field * 14
    arr = np.stack([r, g, b], axis=-1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def silk_texture(size, seed=5):
    w, h = size
    rng = np.random.default_rng(seed)
    xx = np.linspace(0, 10 * np.pi, w)
    band = 0.55 + 0.45 * np.sin(xx)
    field = np.repeat(band[None, :], h, axis=0)
    field += rng.normal(0, 0.04, (h, w))
    field = np.clip(field, 0, 1)
    r = 168 + field * 52
    g = 140 + field * 40
    b = 96 + field * 28
    arr = np.stack([r, g, b], axis=-1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def gold_frame(rgba: Image.Image, inset=5, gold=(196, 158, 82, 220), thick=2, arm=28):
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
    base = wood_texture(size, seed=11)
    base = grade(base, 0.72, 0.85, 1.2, (12, 8, 6), 0.35)
    base = grain(base, 8, 11)
    # darken the reading area
    arr = np.asarray(base).astype(np.float32)
    h, w = arr.shape[:2]
    y, x = np.ogrid[:h, :w]
    mx = np.clip((np.minimum(x, w - 1 - x) - 24) / (w * 0.38), 0, 1)
    my = np.clip((np.minimum(y, h - 1 - y) - 24) / (h * 0.38), 0, 1)
    fall = np.minimum(mx, my) ** 1.15
    arr *= (1 - fall * 0.55)[..., None]
    base = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    return gold_frame(base.convert("RGBA"), inset=6, arm=40)


def draw_plaque(size, hover=False):
    base = wood_texture(size, seed=19 if hover else 17)
    base = grade(base, 0.82 if hover else 0.68, 0.8, 1.18, (18, 12, 8), 0.28)
    base = grain(base, 7)
    return gold_frame(base.convert("RGBA"), inset=4, gold=(214, 176, 96, 235) if hover else (196, 158, 82, 210), arm=22)


def draw_banner(size):
    base = silk_texture(size, seed=23)
    base = grade(base, 0.88, 0.7, 1.08, (200, 176, 130), 0.22)
    base = grain(base, 6, 23)
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
    cave = load(SCENES / "cave.jpg")
    forest = load(SCENES / "forest.jpg")
    cliff = load(SCENES / "cliff.jpg")
    storm = load(SCENES / "storm.jpg")

    # Title: clean cliff, dawn grade — no inscriptions
    title = cover(cliff, (W, H), (0.48, 0.38))
    title = grade(title, 0.96, 1.05, 1.12, (40, 28, 16), 0.10)
    title = glow(title, (220, 180, 110), (int(W * 0.62), int(H * 0.22)), 380, 0.18)
    save_jpg(vignette(title, 0.5), ROOT / "title-bg.jpg", 84)

    # Combat arena: storm peaks, colder
    combat = cover(storm, (W, H), (0.52, 0.30))
    combat = grade(combat, 0.82, 0.95, 1.16, (20, 16, 28), 0.16)
    save_jpg(vignette(combat, 0.55), ROOT / "combat-bg.jpg", 84)

    # Spring: forest + jade pool glow (old spring.jpg had calligraphy)
    spring = cover(forest, (W, H), (0.55, 0.62))
    spring = grade(spring, 1.02, 1.12, 1.08, (16, 48, 40), 0.14)
    spring = glow(spring, (70, 180, 150), (int(W * 0.52), int(H * 0.68)), 360, 0.34)
    # unique spring interior is authored separately — do not clobber
    if not (SCENES / "spring.jpg").exists():
        save_jpg(vignette(spring, 0.42), SCENES / "spring.jpg", 84)
    else:
        print("keep scenes/spring.jpg")
        spring = load(SCENES / "spring.jpg")

    # Event landscapes — unique grade of clean plates, no figures, no text
    specs = {
        "dongfu": (cave, (0.48, 0.42), (0.90, 1.06, 1.14, (90, 50, 20), 0.14), (210, 140, 60), (0.52, 0.48), 280, 0.26),
        "sanxiu": (forest, (0.50, 0.50), (0.96, 1.08, 1.06, (40, 50, 30), 0.08), (160, 170, 90), (0.40, 0.55), 220, 0.12),
        "xinmo": (cliff, (0.55, 0.34), (0.74, 0.82, 1.20, (28, 12, 36), 0.24), (180, 40, 50), (0.62, 0.28), 240, 0.22),
        "qianbei": (cliff, (0.40, 0.30), (0.90, 0.90, 1.10, (30, 40, 55), 0.14), (200, 210, 220), (0.70, 0.16), 260, 0.20),
        "lingquan": (spring, (0.50, 0.58), (1.00, 1.10, 1.06, (16, 50, 42), 0.08), (80, 180, 150), (0.55, 0.66), 320, 0.30),
        "tiancai": (forest, (0.62, 0.38), (1.00, 1.16, 1.12, (70, 45, 10), 0.16), (220, 160, 40), (0.68, 0.40), 300, 0.28),
        "jieyun": (storm, (0.50, 0.26), (0.84, 1.04, 1.20, (50, 10, 20), 0.16), (180, 40, 50), (0.58, 0.10), 400, 0.26),
        "danfang": (cave, (0.36, 0.56), (0.86, 1.04, 1.16, (80, 32, 12), 0.20), (200, 90, 30), (0.38, 0.70), 260, 0.24),
    }
    unique = {"danfang", "lingquan"}
    for name, (src, focus, g, glow_c, glow_p, rad, a) in specs.items():
        dest = EVENTS / f"{name}.jpg"
        if name in unique and dest.exists():
            print("keep", dest.relative_to(ROOT))
            continue
        im = cover(src, (W, H), focus)
        im = grade(im, *g)
        im = glow(im, glow_c, (int(W * glow_p[0]), int(H * glow_p[1])), rad, a)
        save_jpg(vignette(im, 0.56), dest, 84)

    # UI chrome from procedural wood/silk — cannot contain calligraphy
    UI.mkdir(parents=True, exist_ok=True)
    draw_plaque((960, 168), False).save(UI / "choice-slip.png", optimize=True)
    draw_plaque((960, 168), True).save(UI / "choice-slip-hover.png", optimize=True)
    draw_panel((780, 980)).save(UI / "event-panel.png", optimize=True)
    draw_frame((640, 860)).save(UI / "portrait-frame.png", optimize=True)
    draw_banner((1100, 160)).save(UI / "title-banner.png", optimize=True)
    for p in UI.iterdir():
        print(f"wrote ui/{p.name}  {p.stat().st_size}")


if __name__ == "__main__":
    main()
