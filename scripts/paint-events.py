#!/usr/bin/env python3
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path("/workspace/public")
OUT = ROOT / "scenes" / "events"
OUT.mkdir(parents=True, exist_ok=True)
SRC = Path("/workspace/tmp-art")
SCENES = ROOT / "scenes"

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


def grade(im: Image.Image, brightness=1.0, color=1.05, contrast=1.08, tint=(0, 0, 0), tint_a=0.0) -> Image.Image:
    im = ImageEnhance.Brightness(im).enhance(brightness)
    im = ImageEnhance.Color(im).enhance(color)
    im = ImageEnhance.Contrast(im).enhance(contrast)
    if tint_a > 0:
        overlay = Image.new("RGB", im.size, tint)
        im = Image.blend(im, overlay, tint_a)
    return im


def vignette(im: Image.Image, strength=0.62) -> Image.Image:
    arr = np.asarray(im).astype(np.float32)
    h, w = arr.shape[:2]
    y, x = np.ogrid[:h, :w]
    cx, cy = w * 0.5, h * 0.42
    rx, ry = w * 0.72, h * 0.78
    d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    fall = np.clip((d - 0.35) / 1.1, 0, 1) ** 1.35
    arr *= (1 - fall * strength)[..., None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))


def glow(im: Image.Image, color, center, radius, alpha=0.35):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    for i in range(8, 0, -1):
        r = int(radius * i / 8)
        a = int(alpha * 255 * (i / 8) ** 2)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")


def place_figure(base: Image.Image, fig: Image.Image, box, fade="right") -> Image.Image:
    x0, y0, x1, y1 = box
    tw, th = x1 - x0, y1 - y0
    fig = cover(fig, (tw, th), focus=(0.5, 0.38))
    mask = Image.new("L", (tw, th), 255)
    md = ImageDraw.Draw(mask)
    if fade == "right":
        for x in range(tw):
            a = 255 if x < tw * 0.62 else int(255 * (1 - (x / tw - 0.62) / 0.38))
            md.line([(x, 0), (x, th)], fill=max(0, a))
    elif fade == "left":
        for x in range(tw):
            a = 255 if x > tw * 0.38 else int(255 * (x / tw / 0.38))
            md.line([(x, 0), (x, th)], fill=max(0, a))
    mask = mask.filter(ImageFilter.GaussianBlur(18))
    base.paste(fig, (x0, y0), mask)
    return base


def save(im: Image.Image, name: str):
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=28, threshold=3))
    dest = OUT / name
    im.save(dest, quality=88, optimize=True)
    print("wrote", dest.name, dest.stat().st_size)


cave = load(SCENES / "cave.jpg")
forest = load(SCENES / "forest.jpg")
cliff = load(SCENES / "cliff.jpg")
storm = load(SCENES / "storm.jpg")
spring = load(SCENES / "spring.jpg")
shop = load(SCENES / "shop.jpg")
title = load(ROOT / "title-bg.jpg")
combat = load(ROOT / "combat-bg.jpg")

wanderer = load(SCENES / "wanderer.jpg")
ghost = load(SCENES / "ghost.jpg")
shade = load(SCENES / "shade.jpg")
hermit = load(SCENES / "hermit.jpg")
fox = load(SCENES / "fox.jpg")
monk = load(SCENES / "monk-storm.jpg")

# 無名洞府
im = cover(cave, (W, H), (0.48, 0.42))
im = grade(im, 0.92, 1.08, 1.14, (90, 50, 20), 0.12)
im = glow(im, (210, 140, 60), (int(W * 0.52), int(H * 0.48)), 280, 0.28)
im = place_figure(im, shade, (0, 40, int(W * 0.42), H), "right")
save(vignette(im), "dongfu.jpg")
save(cover(shade, (720, 960), (0.5, 0.32)), "dongfu-fig.jpg")

# 散修交易
im = cover(forest, (W, H), (0.5, 0.5))
im = grade(im, 0.96, 1.1, 1.06, (40, 50, 30), 0.08)
im = place_figure(im, wanderer, (int(W * 0.02), 20, int(W * 0.46), H), "right")
save(vignette(im), "sanxiu.jpg")
save(cover(wanderer, (720, 960), (0.5, 0.28)), "sanxiu-fig.jpg")

# 心魔叩問
im = cover(cliff, (W, H), (0.55, 0.35))
im = grade(im, 0.78, 0.85, 1.18, (20, 16, 40), 0.22)
im = glow(im, (180, 40, 50), (int(W * 0.62), int(H * 0.3)), 220, 0.22)
im = place_figure(im, shade, (int(W * 0.04), 0, int(W * 0.48), H), "right")
save(vignette(im, 0.7), "xinmo.jpg")
save(cover(shade, (720, 960), (0.48, 0.3)), "xinmo-fig.jpg")

# 前輩殘影
im = cover(cliff, (W, H), (0.42, 0.32))
im = grade(im, 0.9, 0.92, 1.1, (30, 40, 55), 0.14)
im = glow(im, (200, 210, 220), (int(W * 0.7), int(H * 0.18)), 260, 0.2)
im = place_figure(im, ghost, (int(W * 0.06), 30, int(W * 0.5), H), "right")
save(vignette(im), "qianbei.jpg")
save(cover(ghost, (720, 960), (0.5, 0.3)), "qianbei-fig.jpg")

# 山中靈泉
im = cover(spring, (W, H), (0.5, 0.55))
im = grade(im, 1.02, 1.12, 1.08, (20, 50, 40), 0.1)
im = glow(im, (80, 180, 150), (int(W * 0.55), int(H * 0.62)), 340, 0.32)
im = place_figure(im, hermit, (0, 10, int(W * 0.44), H), "right")
save(vignette(im, 0.5), "lingquan.jpg")
save(cover(hermit, (720, 960), (0.5, 0.34)), "lingquan-fig.jpg")

# 天材地寶
im = cover(forest, (W, H), (0.62, 0.4))
im = grade(im, 1.0, 1.18, 1.12, (70, 45, 10), 0.16)
im = glow(im, (220, 160, 40), (int(W * 0.68), int(H * 0.42)), 300, 0.3)
im = place_figure(im, fox, (int(W * 0.02), 20, int(W * 0.44), H), "right")
save(vignette(im), "tiancai.jpg")
save(cover(fox, (720, 960), (0.5, 0.28)), "tiancai-fig.jpg")

# 劫雲低垂
im = cover(storm, (W, H), (0.5, 0.28))
im = grade(im, 0.86, 1.05, 1.2, (50, 10, 20), 0.16)
im = glow(im, (180, 40, 50), (int(W * 0.58), int(H * 0.12)), 400, 0.26)
im = place_figure(im, monk, (int(W * 0.08), 0, int(W * 0.5), H), "right")
save(vignette(im, 0.68), "jieyun.jpg")
save(cover(monk, (720, 960), (0.5, 0.26)), "jieyun-fig.jpg")

# 廢棄丹房
im = cover(cave, (W, H), (0.35, 0.55))
im = grade(im, 0.88, 1.06, 1.16, (70, 30, 10), 0.18)
im = glow(im, (200, 90, 30), (int(W * 0.4), int(H * 0.7)), 260, 0.24)
im = place_figure(im, fox, (int(W * 0.5), 40, W, H), "left")
save(vignette(im), "danfang.jpg")
save(cover(fox, (720, 960), (0.48, 0.3)), "danfang-fig.jpg")
print("ok")
