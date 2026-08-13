#!/usr/bin/env python3
"""Stamp photographed ink textures into organic slash / claw / impact overlays."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Image.open("/workspace/public/combat-bg.jpg").convert("RGB")
ARENA = Image.open("/workspace/public/arena-qingming.jpg").convert("RGB")
OUT = Path("/workspace/public/fx")
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 1024


def chips(rng: np.random.Generator, n: int, size: int = 220) -> list[Image.Image]:
    pool = [SRC, ARENA]
    out = []
    for _ in range(n):
        im = pool[int(rng.integers(0, len(pool)))]
        w, h = im.size
        s = int(rng.integers(90, 200))
        x = int(rng.integers(0, max(1, w - s)))
        y = int(rng.integers(0, max(1, h - s)))
        crop = im.crop((x, y, x + s, y + s)).resize((size, size), Image.Resampling.BICUBIC)
        out.append(crop)
    return out


def grade(rgb: np.ndarray, a: np.ndarray, ink=(28, 16, 12), blood=(168, 42, 28), ember=(210, 150, 70)) -> np.ndarray:
    t = a[:, :, None]
    mix = (
        np.array(ink, dtype=np.float32) * (1 - t * 0.35)
        + np.array(blood, dtype=np.float32) * (0.55 + 0.45 * t)
    )
    hot = a > 0.72
    mix[hot] = mix[hot] * 0.45 + np.array(ember, dtype=np.float32) * 0.55
    paper = rgb.astype(np.float32)
    out = paper * 0.22 + mix * 0.78
    return np.clip(out, 0, 255)


def stamp_stroke(
    canvas: Image.Image,
    alpha: Image.Image,
    textures: list[Image.Image],
    rng: np.random.Generator,
    pts: list[tuple[float, float]],
    widths: list[float],
) -> None:
    n = len(pts)
    for i in range(n):
        x, y = pts[i]
        w = widths[i]
        tex = textures[i % len(textures)]
        ang = 0.0
        if 0 < i < n - 1:
            ang = np.degrees(np.arctan2(pts[i + 1][1] - pts[i - 1][1], pts[i + 1][0] - pts[i - 1][0]))
        elif i + 1 < n:
            ang = np.degrees(np.arctan2(pts[i + 1][1] - y, pts[i + 1][0] - x))
        size = int(max(18, w * 2.4))
        chip = tex.resize((size, size), Image.Resampling.BICUBIC).rotate(float(ang + rng.normal(0, 8)), expand=True, resample=Image.Resampling.BICUBIC)
        mask = Image.new("L", chip.size, 0)
        # soft ellipse stamp
        from PIL import ImageDraw

        d = ImageDraw.Draw(mask)
        pad = int(size * 0.08)
        d.ellipse((pad, pad, chip.size[0] - pad, chip.size[1] - pad), fill=int(210 - 40 * abs(i / max(1, n - 1) - 0.5)))
        mask = mask.filter(ImageFilter.GaussianBlur(max(2, size // 14)))
        px = int(x - chip.size[0] / 2)
        py = int(y - chip.size[1] / 2)
        canvas.paste(chip, (px, py), mask)
        alpha.paste(mask, (px, py), mask)


def spline(a, b, c, steps: int) -> list[tuple[float, float]]:
    pts = []
    for i in range(steps):
        t = i / (steps - 1)
        u = 1 - t
        x = u * u * a[0] + 2 * u * t * b[0] + t * t * c[0]
        y = u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]
        pts.append((x, y))
    return pts


def compose(canvas: Image.Image, alpha: Image.Image, name: str) -> None:
    a = np.array(alpha.filter(ImageFilter.GaussianBlur(1))).astype(np.float32) / 255.0
    # fray the edge
    noise = np.random.default_rng(abs(hash(name)) % (2**32)).random(a.shape)
    a = np.clip(a * (0.82 + 0.35 * noise) - 0.04, 0, 1)
    a = np.where(a < 0.06, 0, a)
    rgb = grade(np.array(canvas.convert("RGB")), a)
    out = np.dstack([rgb, (a * 245).astype(np.uint8)])
    Image.fromarray(out.astype(np.uint8), "RGBA").save(OUT / name)


def slash() -> None:
    rng = np.random.default_rng(11)
    canvas = Image.new("RGB", (SIZE, SIZE), (20, 14, 12))
    alpha = Image.new("L", (SIZE, SIZE), 0)
    tex = chips(rng, 16)
    pts = spline((140, 150), (470, 430), (880, 870), 48)
    widths = []
    for i, _ in enumerate(pts):
        t = i / (len(pts) - 1)
        envelope = np.sin(t * np.pi) ** 0.85
        widths.append(18 + 46 * envelope + float(rng.normal(0, 4)))
    stamp_stroke(canvas, alpha, tex, rng, pts, widths)
    # secondary hairline
    pts2 = spline((210, 110), (520, 400), (900, 780), 28)
    widths2 = [7 + 10 * np.sin(i / 27 * np.pi) + float(rng.normal(0, 1.4)) for i in range(len(pts2))]
    stamp_stroke(canvas, alpha, tex, rng, pts2, widths2)
    # spatters
    from PIL import ImageDraw

    d = ImageDraw.Draw(alpha)
    for _ in range(18):
        x = int(rng.integers(180, 900))
        y = int(rng.integers(160, 900))
        r = int(rng.integers(3, 11))
        d.ellipse((x - r, y - r, x + r, y + r), fill=int(rng.integers(90, 180)))
    compose(canvas, alpha, "slash.png")


def claw() -> None:
    rng = np.random.default_rng(19)
    canvas = Image.new("RGB", (SIZE, SIZE), (20, 14, 12))
    alpha = Image.new("L", (SIZE, SIZE), 0)
    tex = chips(rng, 14)
    starts = [(250, 90), (470, 60), (690, 110)]
    mids = [(300, 430), (530, 400), (740, 450)]
    ends = [(230, 900), (500, 920), (780, 880)]
    for s, m, e, fat in zip(starts, mids, ends, (1.0, 1.15, 0.88)):
        pts = spline(s, m, e, 40)
        widths = []
        for i, _ in enumerate(pts):
            t = i / (len(pts) - 1)
            envelope = np.sin(min(1, t * 1.15) * np.pi) ** 0.7
            widths.append((10 + 28 * envelope) * fat + float(rng.normal(0, 2.2)))
        stamp_stroke(canvas, alpha, tex, rng, pts, widths)
    from PIL import ImageDraw

    d = ImageDraw.Draw(alpha)
    for _ in range(14):
        x = int(rng.integers(180, 860))
        y = int(rng.integers(120, 920))
        r = int(rng.integers(2, 9))
        d.ellipse((x - r, y - r, x + r, y + r), fill=int(rng.integers(80, 160)))
    compose(canvas, alpha, "claw.png")


def impact() -> None:
    rng = np.random.default_rng(23)
    canvas = Image.new("RGB", (SIZE, SIZE), (20, 14, 12))
    alpha = Image.new("L", (SIZE, SIZE), 0)
    tex = chips(rng, 12, 180)
    cx, cy = 512, 500
    from PIL import ImageDraw

    d = ImageDraw.Draw(alpha)
    for i in range(22):
        ang = rng.uniform(0, 360)
        rad = rng.uniform(40, 280)
        x = cx + rad * np.cos(np.radians(ang))
        y = cy + rad * np.sin(np.radians(ang))
        size = int(28 + (1 - rad / 280) * 70 + rng.normal(0, 6))
        chip = tex[i % len(tex)].resize((size, size), Image.Resampling.BICUBIC).rotate(ang, expand=True)
        mask = Image.new("L", chip.size, 0)
        md = ImageDraw.Draw(mask)
        md.ellipse((4, 4, chip.size[0] - 4, chip.size[1] - 4), fill=int(160 + (1 - rad / 280) * 70))
        mask = mask.filter(ImageFilter.GaussianBlur(max(2, size // 10)))
        canvas.paste(chip, (int(x - chip.size[0] / 2), int(y - chip.size[1] / 2)), mask)
        alpha.paste(mask, (int(x - chip.size[0] / 2), int(y - chip.size[1] / 2)), mask)
    d.ellipse((cx - 70, cy - 58, cx + 70, cy + 58), fill=200)
    compose(canvas, alpha, "impact.png")


if __name__ == "__main__":
    slash()
    claw()
    impact()
    print("wrote", list(OUT.glob("*.png")))
