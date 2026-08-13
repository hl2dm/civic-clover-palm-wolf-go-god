#!/usr/bin/env python3
"""Painted raster VFX stamped from the game's own ink textures."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = Image.open("/workspace/public/combat-bg.jpg").convert("RGB")
OUT = Path("/workspace/public/fx")
OUT.mkdir(parents=True, exist_ok=True)


def stamp(rng: np.random.Generator, size=1024) -> Image.Image:
    w, h = SRC.size
    x = int(rng.integers(0, max(1, w - 180)))
    y = int(rng.integers(0, max(1, h - 180)))
    return SRC.crop((x, y, x + 180, y + 180)).resize((size, size), Image.Resampling.BICUBIC)


def slash() -> None:
    rng = np.random.default_rng(3)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    paper = stamp(rng).convert("RGBA")
    ink = Image.new("L", (1024, 1024), 0)
    d = ImageDraw.Draw(ink)
    strokes = [((140, 180), (880, 860), 46), ((220, 90), (940, 780), 28), ((80, 300), (760, 960), 18)]
    for a, b, w in strokes:
        d.line([a, b], fill=255, width=w)
    ink = ink.filter(ImageFilter.GaussianBlur(4))
    arr = np.array(paper)
    a = np.array(ink).astype(np.float32) / 255.0
    # tint toward cinnabar/gold
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 0.4 + 210 * a, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.35 + 140 * a, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.25 + 90 * a, 0, 255)
    arr[:, :, 3] = (a * 230).astype(np.uint8)
    Image.fromarray(arr, "RGBA").save(OUT / "slash.png")


def claw() -> None:
    rng = np.random.default_rng(7)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    paper = stamp(rng).convert("RGBA")
    ink = Image.new("L", (1024, 1024), 0)
    d = ImageDraw.Draw(ink)
    paths = [
        [(220, 120), (300, 420), (250, 880)],
        [(480, 80), (560, 400), (500, 900)],
        [(740, 130), (800, 430), (760, 860)],
    ]
    for i, pts in enumerate(paths):
        d.line(pts, fill=255, width=34 - i * 4)
    ink = ink.filter(ImageFilter.GaussianBlur(5))
    arr = np.array(paper)
    a = np.array(ink).astype(np.float32) / 255.0
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 0.35 + 220 * a, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.3 + 120 * a, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.25 + 80 * a, 0, 255)
    arr[:, :, 3] = (a * 220).astype(np.uint8)
    Image.fromarray(arr, "RGBA").save(OUT / "claw.png")


def shield() -> None:
    rng = np.random.default_rng(11)
    paper = stamp(rng).resize((1024, 1024), Image.Resampling.BICUBIC).convert("RGBA")
    mask = Image.new("L", (1024, 1024), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((180, 140, 844, 900), outline=255, width=28)
    d.ellipse((250, 210, 774, 830), outline=180, width=10)
    d.ellipse((390, 400, 634, 580), outline=140, width=6)
    mask = mask.filter(ImageFilter.GaussianBlur(3))
    glow = mask.filter(ImageFilter.GaussianBlur(18))
    arr = np.array(paper)
    m = np.maximum(np.array(mask), np.array(glow) * 0.55).astype(np.float32) / 255.0
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 0.25 + 170 * m, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.3 + 190 * m, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.35 + 200 * m, 0, 255)
    arr[:, :, 3] = (m * 200).astype(np.uint8)
    Image.fromarray(arr, "RGBA").save(OUT / "shield.png")


def shatter() -> None:
    rng = np.random.default_rng(13)
    paper = stamp(rng).resize((1024, 1024), Image.Resampling.BICUBIC).convert("RGBA")
    mask = Image.new("L", (1024, 1024), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((200, 160, 820, 880), outline=255, width=16)
    shards = [
        (260, 240, 360, 400),
        (640, 220, 780, 390),
        (220, 560, 370, 740),
        (680, 580, 820, 760),
        (430, 180, 560, 300),
        (400, 720, 560, 880),
    ]
    for box in shards:
        d.polygon(
            [
                (box[0], box[1]),
                (box[2], box[1] + 20),
                (box[2] - 10, box[3]),
                (box[0] + 15, box[3] - 10),
            ],
            outline=230,
            width=8,
        )
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    arr = np.array(paper)
    m = np.array(mask).astype(np.float32) / 255.0
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 0.2 + 200 * m, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.25 + 180 * m, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.3 + 190 * m, 0, 255)
    arr[:, :, 3] = (m * 210).astype(np.uint8)
    Image.fromarray(arr, "RGBA").save(OUT / "break.png")


if __name__ == "__main__":
    slash()
    claw()
    shield()
    shatter()
    print("fx", list(OUT.iterdir()))
