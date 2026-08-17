#!/usr/bin/env python3
"""Stamp portrait paint onto unique body silhouettes — not square boards."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

PUB = Path("/workspace/public/sprites")
POR = Path("/workspace/public/portraits")
TMP = Path("/workspace/tmp-art")
ASSETS = Path("/workspace/assets/sprites")

W, H = 420, 760


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("L", (W, H), 0)
    return im, ImageDraw.Draw(im)


def body_mumei() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.ellipse([cx - 150, 40, cx + 160, 340], fill=255)  # canopy
    d.polygon([(cx - 40, 280), (cx + 48, 278), (cx + 36, 620), (cx - 28, 622)], fill=255)  # trunk
    d.polygon([(cx - 20, 560), (cx + 24, 558), (cx + 170, 730), (cx + 40, 700), (cx, 740), (cx - 50, 705), (cx - 160, 728)], fill=255)
    d.polygon([(cx + 40, 360), (cx + 190, 250), (cx + 200, 280), (cx + 50, 420)], fill=255)
    d.polygon([(cx - 30, 380), (cx - 180, 300), (cx - 190, 330), (cx - 40, 440)], fill=255)
    return im.filter(ImageFilter.GaussianBlur(1.6))


def body_zhiren() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.ellipse([cx - 52, 70, cx + 52, 180], fill=255)
    d.rectangle([cx - 14, 170, cx + 14, 210], fill=255)
    d.polygon([(cx - 70, 210), (cx + 70, 208), (cx + 90, 430), (cx - 90, 432)], fill=255)
    d.polygon([(cx - 90, 420), (cx + 90, 418), (cx + 48, 710), (cx - 42, 712)], fill=255)
    d.polygon([(cx - 70, 240), (cx - 170, 390), (cx - 150, 410), (cx - 60, 280)], fill=255)
    d.polygon([(cx + 70, 240), (cx + 175, 380), (cx + 155, 400), (cx + 62, 280)], fill=255)
    return im.filter(ImageFilter.GaussianBlur(1.2))


def body_wuji() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.ellipse([cx - 48, 80, cx + 50, 186], fill=255)
    d.polygon([(cx - 30, 170), (cx + 34, 168), (cx + 28, 260), (cx - 26, 262)], fill=255)
    d.polygon([(cx - 80, 250), (cx + 86, 248), (cx + 130, 700), (cx - 110, 708)], fill=255)
    d.polygon([(cx - 20, 90), (cx + 80, 40), (cx + 160, 220), (cx + 40, 200), (cx - 10, 160)], fill=220)
    d.polygon([(cx + 40, 300), (cx + 190, 420), (cx + 160, 460), (cx + 50, 360)], fill=255)
    return im.filter(ImageFilter.GaussianBlur(2.2))


def body_jianbing() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.ellipse([cx - 44, 90, cx + 46, 186], fill=255)
    d.polygon([(cx - 90, 190), (cx + 96, 188), (cx + 80, 430), (cx - 78, 432)], fill=255)
    d.polygon([(cx - 78, 420), (cx + 80, 418), (cx + 56, 710), (cx - 50, 712)], fill=255)
    d.polygon([(cx - 90, 200), (cx - 150, 240), (cx - 130, 420), (cx - 70, 400)], fill=255)
    d.polygon([(cx + 90, 210), (cx + 200, 180), (cx + 210, 210), (cx + 100, 280)], fill=255)
    return im.filter(ImageFilter.GaussianBlur(1.4))


def body_neimen() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.rectangle([cx - 38, 40, cx + 40, 100], fill=255)
    d.polygon([(cx - 70, 90), (cx + 72, 90), (cx + 40, 118), (cx - 38, 118)], fill=255)
    d.ellipse([cx - 46, 110, cx + 48, 206], fill=255)
    d.polygon([(cx - 88, 210), (cx + 92, 208), (cx + 78, 710), (cx - 72, 712)], fill=255)
    d.line([(cx + 70, 260), (cx + 84, 620)], fill=255, width=18)
    return im.filter(ImageFilter.GaussianBlur(1.3))


def body_xinmo() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.ellipse([cx - 120, 80, cx + 130, 420], fill=230)
    d.ellipse([cx - 50, 90, cx + 52, 200], fill=255)
    d.polygon([(cx - 70, 180), (cx + 80, 176), (cx + 150, 700), (cx - 140, 720)], fill=210)
    for x, y, r in ((80, 300, 50), (320, 340, 46), (60, 520, 40), (340, 560, 54), (200, 640, 36)):
        d.ellipse([x - r, y - r, x + r, y + r], fill=200)
    return im.filter(ImageFilter.GaussianBlur(3.4))


def body_sanxiu() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.polygon([(cx - 90, 90), (cx + 92, 88), (cx + 40, 150), (cx - 38, 152)], fill=255)
    d.ellipse([cx - 46, 120, cx + 48, 214], fill=255)
    d.polygon([(cx - 70, 210), (cx + 76, 208), (cx + 58, 700), (cx - 52, 704)], fill=255)
    d.polygon([(cx - 70, 220), (cx - 150, 500), (cx - 120, 510), (cx - 50, 280)], fill=230)
    d.line([(cx + 60, 250), (cx + 78, 640)], fill=255, width=10)
    return im.filter(ImageFilter.GaussianBlur(1.3))


def body_huxian() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.ellipse([cx - 48, 90, cx + 50, 188], fill=255)
    d.polygon([(cx - 20, 80), (cx - 8, 20), (cx + 6, 84)], fill=255)
    d.polygon([(cx + 10, 78), (cx + 28, 16), (cx + 36, 90)], fill=255)
    d.polygon([(cx - 78, 200), (cx + 84, 198), (cx + 70, 620), (cx - 64, 624)], fill=255)
    d.polygon([(cx + 40, 480), (cx + 200, 700), (cx + 160, 720), (cx + 30, 560)], fill=255)
    d.polygon([(cx + 20, 500), (cx + 120, 730), (cx + 80, 740), (cx + 10, 560)], fill=240)
    d.polygon([(cx - 10, 520), (cx + 40, 740), (cx + 10, 748), (cx - 30, 560)], fill=230)
    return im.filter(ImageFilter.GaussianBlur(1.6))


def body_huoya() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.ellipse([cx - 40, 220, cx + 70, 340], fill=255)
    d.polygon([(cx + 40, 240), (cx + 190, 80), (cx + 200, 160), (cx + 70, 300)], fill=255)
    d.polygon([(cx - 10, 250), (cx - 180, 120), (cx - 160, 200), (cx + 10, 310)], fill=255)
    d.polygon([(cx + 20, 320), (cx + 40, 520), (cx + 10, 530), (cx - 10, 340)], fill=255)
    d.ellipse([cx + 40, 210, cx + 86, 250], fill=255)
    return im.filter(ImageFilter.GaussianBlur(1.5))


def body_jindan() -> Image.Image:
    im, d = canvas()
    cx = W // 2
    d.ellipse([cx - 52, 70, cx + 56, 180], fill=255)
    d.polygon([(cx - 20, 64), (cx - 8, 20), (cx + 6, 70)], fill=255)
    d.polygon([(cx + 12, 62), (cx + 34, 18), (cx + 40, 76)], fill=255)
    d.polygon([(cx - 110, 190), (cx + 118, 188), (cx + 96, 700), (cx - 88, 708)], fill=255)
    d.ellipse([cx - 30, 300, cx + 36, 380], fill=255)
    return im.filter(ImageFilter.GaussianBlur(1.5))


BODIES = {
    "mumei": (body_mumei, POR / "mumei.jpg"),
    "zhiren": (body_zhiren, POR / "zhiren.jpg"),
    "wuji": (body_wuji, POR / "wuji.jpg"),
    "jianbing": (body_jianbing, POR / "jianbing.jpg"),
    "neimen": (body_neimen, TMP / "c29737a6-bd5f-4fa2-839e-3b093801aea1.jpg"),
    "xinmo": (body_xinmo, TMP / "e28c29ba-fe75-4693-8486-81e41bc45c88.jpg"),
    "sanxiu": (body_sanxiu, TMP / "27fcb45c-f9da-427b-ad7c-ad7c33157f18.jpg"),
    "huxian": (body_huxian, POR / "huxian.jpg"),
    "huoya": (body_huoya, POR / "huoya.jpg"),
    "jindan": (body_jindan, POR / "jindan.jpg"),
}


def stamp(mask: Image.Image, paint: Path) -> Image.Image:
    src = Image.open(paint).convert("RGB")
    src = ImageOps.fit(src, (W, H), centering=(0.5, 0.42))
    src = ImageEnhance.Contrast(src).enhance(1.08)
    rgba = src.convert("RGBA")
    a = np.array(mask)
    arr = np.array(rgba)
    arr[:, :, 3] = a
    out = Image.fromarray(arr, "RGBA")
    bbox = out.getbbox()
    if bbox:
        pad = 12
        l, t, r, b = bbox
        out = out.crop((max(0, l - pad), max(0, t - pad), min(W, r + pad), min(H, b + pad)))
    return out


def pose(im: Image.Image, kind: str) -> Image.Image:
    if kind == "idle2":
        return im.rotate(2.4, resample=Image.Resampling.BICUBIC, expand=True)
    if kind == "attack":
        return im.rotate(-9, resample=Image.Resampling.BICUBIC, expand=True)
    if kind == "hurt":
        return ImageEnhance.Brightness(im).enhance(1.1).rotate(8, resample=Image.Resampling.BICUBIC, expand=True)
    return im


def main() -> None:
    for name, (fn, src) in BODIES.items():
        if not src.exists():
            src = POR / f"{name}.jpg"
        cut = stamp(fn(), src)
        dest = PUB / name
        dest.mkdir(parents=True, exist_ok=True)
        frames = {
            "idle-1": cut,
            "idle-2": pose(cut, "idle2"),
            "attack": pose(cut, "attack"),
            "hurt": pose(cut, "hurt"),
        }
        for label, im in frames.items():
            im.save(dest / f"{label}.png")
            print(name, label, im.size)


if __name__ == "__main__":
    main()
