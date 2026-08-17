#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

TMP = Path("/workspace/tmp-art")
SPR = Path("/workspace/public/sprites")
POR = Path("/workspace/public/portraits")


def paper_cut(im: Image.Image) -> Image.Image:
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    corners = np.concatenate(
        [
            rgb[:12, :12].reshape(-1, 3),
            rgb[:12, -12:].reshape(-1, 3),
            rgb[-12:, :12].reshape(-1, 3),
            rgb[-12:, -12:].reshape(-1, 3),
        ]
    )
    bg = corners.mean(axis=0)
    dist = np.linalg.norm(rgb - bg, axis=2)
    sat = rgb.max(2) - rgb.min(2)
    lum = rgb.mean(2)
    mag = np.linalg.norm(rgb - np.array([255, 0, 255], dtype=np.float32), axis=2)
    mask = (mag > 55) & ((dist > 22) | (sat > 18) | (lum < 80))
    alpha = Image.fromarray((mask.astype(np.uint8) * 255), "L").filter(ImageFilter.GaussianBlur(1.1))
    a = np.asarray(alpha)
    a = np.where(a > 28, np.clip((a.astype(np.int16) - 12) * 1.35, 0, 255), 0).astype(np.uint8)
    rgba = np.asarray(im.convert("RGBA")).copy()
    rgba[:, :, 3] = a
    out = Image.fromarray(rgba, "RGBA")
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def fit(im: Image.Image, w=380, h=700) -> Image.Image:
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    im = ImageOps.contain(im, (w - 16, h - 16))
    canvas.alpha_composite(im, ((w - im.width) // 2, h - im.height - 6))
    return canvas


def pose(im: Image.Image, kind: str) -> Image.Image:
    if kind == "idle2":
        return im.rotate(1.4, resample=Image.Resampling.BICUBIC)
    if kind == "attack":
        return im.rotate(-6, resample=Image.Resampling.BICUBIC)
    if kind == "hurt":
        return ImageEnhance.Brightness(im).enhance(1.1).rotate(5, resample=Image.Resampling.BICUBIC)
    return im


def save_frames(name: str, frames: list[Image.Image]):
    d = SPR / name
    d.mkdir(parents=True, exist_ok=True)
    idle, idle2, attack, hurt = frames
    fit(idle).save(d / "idle-1.png")
    fit(idle2).save(d / "idle-2.png")
    fit(attack).save(d / "attack.png")
    fit(hurt).save(d / "hurt.png")
    print("sprites", name)


def split2x2(path: Path) -> list[Image.Image]:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    cw, ch = w // 2, h // 2
    cells = [
        im.crop((0, 0, cw, ch)),
        im.crop((cw, 0, w, ch)),
        im.crop((0, ch, cw, h)),
        im.crop((cw, ch, w, h)),
    ]
    return [paper_cut(c) for c in cells]


def from_portrait(path: Path) -> list[Image.Image]:
    cut = paper_cut(Image.open(path))
    return [cut, pose(cut, "idle2"), pose(cut, "attack"), pose(cut, "hurt")]


def save_portrait(src: Path, dest: Path):
    im = Image.open(src).convert("RGB")
    im = ImageEnhance.Contrast(im).enhance(1.04)
    im.resize((720, 960), Image.Resampling.LANCZOS).save(dest, quality=90)
    print("portrait", dest.name)


def main():
    save_frames("sanxiu", split2x2(TMP / "f4f44ff0-86b1-4718-8e0a-05de80941a62.jpg"))
    save_portrait(TMP / "27fcb45c-f9da-427b-ad7c-ad7c33157f18.jpg", POR / "sanxiu.jpg")

    save_frames("neimen", from_portrait(TMP / "c29737a6-bd5f-4fa2-839e-3b093801aea1.jpg"))
    save_portrait(TMP / "c29737a6-bd5f-4fa2-839e-3b093801aea1.jpg", POR / "neimen.jpg")

    save_frames("xinmo", from_portrait(TMP / "e28c29ba-fe75-4693-8486-81e41bc45c88.jpg"))
    save_portrait(TMP / "e28c29ba-fe75-4693-8486-81e41bc45c88.jpg", POR / "xinmo.jpg")

    save_frames("huxian", split2x2(TMP / "61bc0515-c0f3-4672-81e2-402f06f82296.jpg"))

    save_frames("mumei", from_portrait(POR / "mumei.jpg"))
    save_frames("zhiren", from_portrait(POR / "zhiren.jpg"))
    save_frames("wuji", from_portrait(POR / "wuji.jpg"))
    save_frames("jianbing", from_portrait(POR / "jianbing.jpg"))


if __name__ == "__main__":
    main()
