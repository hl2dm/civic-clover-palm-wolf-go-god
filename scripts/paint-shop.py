#!/usr/bin/env python3
"""Build a crane-free night-market stall and a human shopkeeper."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path("/workspace/public")
SCENES = ROOT / "scenes"
OUT = SCENES
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


def vignette(im: Image.Image, strength=0.62, cx=0.5, cy=0.42) -> Image.Image:
    arr = np.asarray(im).astype(np.float32)
    h, w = arr.shape[:2]
    y, x = np.ogrid[:h, :w]
    rx, ry = w * 0.72, h * 0.78
    d = ((x - w * cx) / rx) ** 2 + ((y - h * cy) / ry) ** 2
    fall = np.clip((d - 0.28) / 1.15, 0, 1) ** 1.35
    arr *= (1 - fall * strength)[..., None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))


def glow(im: Image.Image, color, center, radius, alpha=0.35) -> Image.Image:
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    for i in range(10, 0, -1):
        r = int(radius * i / 10)
        a = int(alpha * 255 * (i / 10) ** 2.1)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")


def kill_crane(im: Image.Image) -> Image.Image:
    """Paint out the bright white crane that dominated the old shop plate."""
    arr = np.asarray(im).astype(np.float32)
    h, w = arr.shape[:2]
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    sat = arr.max(axis=2) - arr.min(axis=2)
    yy = np.linspace(0, 1, h)[:, None]
    xx = np.linspace(0, 1, w)[None, :]
    bird = (lum > 168) & (sat < 55) & (yy < 0.62) & (xx < 0.72)
    bird = bird | ((lum > 200) & (yy < 0.48))
    # dilate
    bird_u8 = (bird * 255).astype(np.uint8)
    mask = Image.fromarray(bird_u8, "L").filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.GaussianBlur(10))
    m = np.asarray(mask).astype(np.float32) / 255.0
    fill = arr.copy()
    # sample warm stall color from the lower-right
    sample = arr[int(h * 0.72) : int(h * 0.92), int(w * 0.45) : int(w * 0.9)]
    tone = sample.mean(axis=(0, 1)) if sample.size else np.array([48, 34, 24])
    night = np.array([18, 14, 16], dtype=np.float32)
    ynorm = np.linspace(0.15, 0.85, h)[:, None, None]
    wash = night * (1 - ynorm) + tone * ynorm
    fill = fill * (1 - m[..., None] * 0.92) + wash * (m[..., None] * 0.92)
    # blur the patched region so it does not look stamped
    blurred = Image.fromarray(fill.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(7))
    brr = np.asarray(blurred).astype(np.float32)
    out = arr * (1 - m[..., None]) + brr * m[..., None]
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def wood_counter(size: tuple[int, int], src: Image.Image) -> Image.Image:
    tw, th = size
    plank = cover(src, (tw, th), (0.7, 0.92))
    plank = grade(plank, 0.62, 0.75, 1.18, (40, 24, 12), 0.22)
    arr = np.asarray(plank).astype(np.float32)
    h, w = arr.shape[:2]
    y = np.linspace(0, 1, h)[:, None]
    shade = 0.55 + 0.45 * (1 - np.abs(y - 0.35) * 1.4)
    arr *= shade[..., None]
    # grain
    rng = np.random.default_rng(7)
    grain = rng.normal(0, 7, (h, w, 1))
    arr += grain
    edge = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(edge)
    d.rectangle([0, 0, w - 1, 8], fill=180)
    d.rectangle([0, h - 10, w - 1, h - 1], fill=90)
    e = np.asarray(edge.filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255.0
    arr += e[..., None] * np.array([30, 20, 10])
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))


def make_stall() -> None:
    shop = load(SCENES / "shop.jpg")
    forest = load(SCENES / "forest.jpg")
    # close crop of the lantern street, then kill leftover crane
    street = cover(shop, (W, H), (0.74, 0.84))
    street = kill_crane(street)
    mist = cover(forest, (W, H), (0.5, 0.35))
    mist = grade(mist, 0.42, 0.7, 1.05, (20, 16, 28), 0.35)
    # keep the top as distant night mountains, street as the stall
    base = Image.composite(
        street,
        Image.blend(mist, street, 0.35),
        ImageOps.invert(
            Image.linear_gradient("L").resize((W, H)).transform(
                (W, H), Image.Transform.EXTENT, (0, 0, W, H)
            )
        ),
    )
    # smoother blend: street dominates lower 70%
    arr_s = np.asarray(street).astype(np.float32)
    arr_m = np.asarray(mist).astype(np.float32)
    y = np.linspace(0, 1, H)[:, None, None]
    mix = np.clip((y - 0.18) / 0.28, 0, 1) ** 1.4
    base_arr = arr_m * (1 - mix) + arr_s * mix
    base = Image.fromarray(base_arr.clip(0, 255).astype(np.uint8))
    base = kill_crane(base)

    counter = wood_counter((W, int(H * 0.34)), shop)
    # paste counter along the bottom with a soft top fade
    canvas = base.convert("RGBA")
    c_rgba = counter.convert("RGBA")
    fade = Image.new("L", c_rgba.size, 255)
    fd = ImageDraw.Draw(fade)
    for i in range(70):
        fd.rectangle([0, i, W, i], fill=int(255 * (i / 70) ** 1.4))
    c_rgba.putalpha(fade)
    canvas.paste(c_rgba, (0, H - counter.height), c_rgba)
    im = canvas.convert("RGB")

    im = grade(im, 0.96, 1.12, 1.1, (70, 36, 12), 0.1)
    im = glow(im, (230, 140, 50), (int(W * 0.28), int(H * 0.22)), 220, 0.28)
    im = glow(im, (230, 150, 60), (int(W * 0.62), int(H * 0.18)), 260, 0.32)
    im = glow(im, (210, 120, 40), (int(W * 0.84), int(H * 0.3)), 180, 0.22)
    im = glow(im, (180, 90, 30), (int(W * 0.5), int(H * 0.78)), 340, 0.14)
    im = vignette(im, 0.58, 0.52, 0.48)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.1, percent=24, threshold=3))
    dest = OUT / "shop-stall.jpg"
    im.save(dest, quality=90, optimize=True)
    im.save(OUT / "shop.jpg", quality=90, optimize=True)
    print("stall", dest, dest.stat().st_size)


def make_keeper() -> None:
    hermit = load(SCENES / "hermit.jpg")
    bust = cover(hermit, (900, 1200), (0.5, 0.3))
    bust = grade(bust, 1.02, 1.08, 1.12, (60, 30, 10), 0.08)
    bust = vignette(bust, 0.45, 0.5, 0.36)
    bust.save(OUT / "keeper-bust.jpg", quality=90, optimize=True)

    # standing-ish crop for the large figure, dark-edge fade to alpha
    fig = cover(hermit, (1000, 1500), (0.5, 0.42))
    fig = grade(fig, 1.04, 1.06, 1.1, (50, 28, 12), 0.06)
    arr = np.asarray(fig).astype(np.float32)
    h, w = arr.shape[:2]
    lum = arr.mean(axis=2)
    warm = arr[:, :, 0] - arr[:, :, 2]
    yy = np.linspace(0, 1, h)[:, None]
    xx = np.linspace(0, 1, w)[None, :]
    body = (lum > 28) & ((warm > -8) | (lum > 55))
    # keep a vertical column around the figure
    col = np.exp(-((xx - 0.5) ** 2) / (2 * 0.22**2))
    alpha = np.clip((lum - 16) / 38, 0, 1) * (0.35 + 0.65 * col)
    alpha = np.where(body, np.maximum(alpha, 0.55 * col), alpha * 0.25)
    # fade edges
    edge = np.minimum(np.minimum(xx / 0.08, (1 - xx) / 0.08), np.minimum(yy / 0.04, (1 - yy) / 0.06))
    edge = np.clip(edge, 0, 1)
    alpha *= edge
    a_img = Image.fromarray((alpha * 255).clip(0, 255).astype(np.uint8), "L")
    a_img = a_img.filter(ImageFilter.GaussianBlur(6))
    rgba = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB").convert("RGBA")
    rgba.putalpha(a_img)
    rgba.save(OUT / "keeper-man.png")
    rgba.save(OUT / "keeper.png")
    print("keeper", (OUT / "keeper-man.png").stat().st_size, (OUT / "keeper-bust.jpg").stat().st_size)


if __name__ == "__main__":
    make_stall()
    make_keeper()
    print("ok")
