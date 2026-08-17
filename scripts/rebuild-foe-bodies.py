#!/usr/bin/env python3
"""Rebuild combat bodies as tight silhouettes — never pad back onto a square board."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ASSETS = Path("/workspace/assets/sprites")
PUB = Path("/workspace/public/sprites")
POR = Path("/workspace/public/portraits")
TMP = Path("/workspace/tmp-art")

SPLIT = {
    "shanxiao": "shanxiao",
    "yeshou": "yeshou",
    "lingshe": "lingshe",
    "shikui": "shikui",
    "huoya": "huoya",
    "juyuan": "juyuan",
    "zhuji": "zhuji",
    "jindan": "jindan",
}
NAMES = ["idle-1", "idle-2", "attack", "hurt"]

KEYS = np.array(
    [
        [255, 0, 255],
        [203, 26, 98],
        [200, 30, 90],
        [180, 20, 80],
        [220, 40, 160],
        [152, 30, 54],
        [141, 27, 34],
        [138, 26, 33],
        [90, 20, 30],
        [70, 18, 28],
    ],
    dtype=np.float32,
)


def key_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dist = np.min(np.sqrt(((rgb[:, :, None, :] - KEYS) ** 2).sum(axis=3)), axis=2)
    crimson = (r > 70) & (g < 85) & (b < 130) & (r > g + 28)
    magenta = (np.minimum(r, b) > 130) & (g < 110)
    return (dist < 86) | crimson | magenta


def flood_clear(rgb: np.ndarray, al: np.ndarray) -> np.ndarray:
    h, w = al.shape
    mask = key_mask(rgb)
    al = al.copy()
    al[mask] = 0
    seen = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        stack += [(0, x), (h - 1, x)]
    for y in range(h):
        stack += [(y, 0), (y, w - 1)]
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x]:
            continue
        seen[y, x] = True
        if al[y, x] > 18 and not mask[y, x]:
            continue
        al[y, x] = 0
        stack += [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
    return al


def largest(al: np.ndarray, thresh=24) -> np.ndarray:
    h, w = al.shape
    opaque = al > thresh
    seen = np.zeros((h, w), dtype=bool)
    best = []
    for y in range(h):
        xs = np.where(opaque[y] & ~seen[y])[0]
        for x in xs:
            if seen[y, x]:
                continue
            stack = [(int(y), int(x))]
            cells = []
            while stack:
                cy, cx = stack.pop()
                if cy < 0 or cx < 0 or cy >= h or cx >= w or seen[cy, cx] or not opaque[cy, cx]:
                    continue
                seen[cy, cx] = True
                cells.append((cy, cx))
                stack += [(cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)]
            if len(cells) > len(best):
                best = cells
    out = np.zeros_like(al)
    for cy, cx in best:
        out[cy, cx] = al[cy, cx]
    return out


def trim(im: Image.Image, pad=14) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(im.width, r + pad), min(im.height, b + pad)
    return im.crop((l, t, r, b))


def finalize(im: Image.Image) -> Image.Image:
    a = np.array(im.convert("RGBA"))
    rgb, al = a[:, :, :3].astype(np.float32), a[:, :, 3].astype(np.float32)
    al = flood_clear(rgb, al)
    al = largest(al)
    mag = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    spill = mag > 8
    rgb[:, :, 0] = np.where(spill, np.clip(rgb[:, :, 0] - mag * 0.7, 0, 255), rgb[:, :, 0])
    rgb[:, :, 2] = np.where(spill, np.clip(rgb[:, :, 2] - mag * 0.7, 0, 255), rgb[:, :, 2])
    out = Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), "RGBA")
    return trim(out)


def split_sheet(path: Path) -> list[Image.Image]:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    cw, ch = w // 2, h // 2
    cells = [
        im.crop((0, 0, cw, ch)),
        im.crop((cw, 0, w, ch)),
        im.crop((0, ch, cw, h)),
        im.crop((cw, ch, w, h)),
    ]
    return [finalize(c) for c in cells]


def pose(im: Image.Image, kind: str) -> Image.Image:
    if kind == "idle2":
        return im.rotate(2.2, resample=Image.Resampling.BICUBIC, expand=True)
    if kind == "attack":
        return im.rotate(-8, resample=Image.Resampling.BICUBIC, expand=True)
    if kind == "hurt":
        return ImageEnhance.Brightness(im).enhance(1.08).rotate(7, resample=Image.Resampling.BICUBIC, expand=True)
    return im


def extract_by_contrast(path: Path, mode: str) -> Image.Image:
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    lum = rgb.mean(2)
    sat = rgb.max(2) - rgb.min(2)
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w]
    if mode == "pale":  # paper doll, mist woman
        keep = (lum > 118) | ((sat > 28) & (lum > 80))
    elif mode == "tree":
        keep = (lum > 52) & ((sat > 16) | (lum > 70))
        keep &= ~((yy < h * 0.06) | (yy > h * 0.96) | (xx < w * 0.06) | (xx > w * 0.94))
    elif mode == "metal":
        keep = (lum > 48) | (sat > 22)
        keep &= ~((yy < h * 0.05) | (yy > h * 0.97))
    elif mode == "ink":
        # dark figure on lighter paper, or vice versa
        corners = np.concatenate(
            [rgb[:10, :10].reshape(-1, 3), rgb[:10, -10:].reshape(-1, 3), rgb[-10:, :10].reshape(-1, 3), rgb[-10:, -10:].reshape(-1, 3)]
        )
        bg = corners.mean(0)
        dist = np.linalg.norm(rgb - bg, axis=2)
        keep = (dist > 26) | (sat > 18)
    else:
        keep = (sat > 18) | ((lum > 40) & (lum < 200))
    al = (keep.astype(np.uint8) * 255)
    img = Image.fromarray(al, "L").filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
    a = np.asarray(img)
    a = np.where(a > 36, np.clip((a.astype(np.int16) - 10) * 1.3, 0, 255), 0).astype(np.uint8)
    rgba = np.asarray(im.convert("RGBA")).copy()
    rgba[:, :, 3] = a
    out = Image.fromarray(rgba, "RGBA")
    a2 = np.array(out)
    a2[:, :, 3] = largest(a2[:, :, 3].astype(np.float32))
    return trim(Image.fromarray(a2, "RGBA"))


def save_frames(name: str, frames: list[Image.Image]) -> None:
    dest = PUB / name
    dest.mkdir(parents=True, exist_ok=True)
    for label, im in zip(NAMES, frames):
        # keep natural aspect — never stamp onto a square plate
        im.save(dest / f"{label}.png")
        print(name, label, im.size)


def from_one(cut: Image.Image) -> list[Image.Image]:
    return [cut, pose(cut, "idle2"), pose(cut, "attack"), pose(cut, "hurt")]


def main() -> None:
    for folder, dest in SPLIT.items():
        clean = ASSETS / folder / "raw-sheet-clean.png"
        raw = ASSETS / folder / "raw-sheet.png"
        src = clean if clean.exists() else raw
        print("sheet", dest, src)
        save_frames(dest, split_sheet(src))

    # unique remaining foes from painted sources — extract a body, not a board
    extras = [
        ("sanxiu", TMP / "f4f44ff0-86b1-4718-8e0a-05de80941a62.jpg", "sheet"),
        ("huxian", TMP / "61bc0515-c0f3-4672-81e2-402f06f82296.jpg", "sheet"),
        ("neimen", TMP / "c29737a6-bd5f-4fa2-839e-3b093801aea1.jpg", "ink"),
        ("xinmo", TMP / "e28c29ba-fe75-4693-8486-81e41bc45c88.jpg", "ink"),
        ("mumei", POR / "mumei.jpg", "tree"),
        ("zhiren", POR / "zhiren.jpg", "pale"),
        ("wuji", POR / "wuji.jpg", "pale"),
        ("jianbing", POR / "jianbing.jpg", "metal"),
    ]
    for name, src, mode in extras:
        if not src.exists():
            print("missing", src)
            continue
        if mode == "sheet":
            frames = split_sheet(src)
        else:
            frames = from_one(extract_by_contrast(src, mode))
        save_frames(name, frames)


if __name__ == "__main__":
    main()
