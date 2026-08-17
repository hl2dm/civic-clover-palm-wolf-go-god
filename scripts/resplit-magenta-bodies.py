#!/usr/bin/env python3
"""Split magenta 2x2 sheets into full-body frames.

Only key true magenta. Do not treat brown fur / red feathers as leftover
chroma — that is how 山魈 collapsed into a floating head.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ASSETS = Path("/workspace/assets/sprites")
PUB = Path("/workspace/public/sprites")

# Prefer already-despilled clean sheets when present.
SHEETS = {
    "shanxiao": "shanxiao",
    "yeshou": "yeshou",
    "lingshe": "lingshe",
    "shikui": "shikui",
    "huoya": "huoya",
    "juyuan": "juyuan",
    "zhuji": "zhuji",
    "jindan": "jindan",
    "huxian": "huxian",
}
NAMES = ["idle-1", "idle-2", "attack", "hurt"]


def magenta_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    # True fuchsia / JPEG-shifted magenta. Never brown, never fire-red.
    dist = np.sqrt((r - 255) ** 2 + (g - 0) ** 2 + (b - 255) ** 2)
    hot_pink = (r > 170) & (b > 130) & (g < 95) & (r + b > g * 2.4)
    jpeg_mag = (np.minimum(r, b) > 165) & (g < 80)
    return (dist < 88) | hot_pink | jpeg_mag


def flood_clear(rgb: np.ndarray, al: np.ndarray) -> np.ndarray:
    mask = magenta_mask(rgb)
    al = al.copy()
    al[mask] = 0
    h, w = al.shape
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
        # only eat keyed / already-transparent border pixels
        if al[y, x] > 20 and not mask[y, x]:
            continue
        al[y, x] = 0
        stack += [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
    return al


def keep_large(al: np.ndarray, min_frac=0.012) -> np.ndarray:
    h, w = al.shape
    opaque = al > 32
    seen = np.zeros((h, w), dtype=bool)
    blobs: list[list[tuple[int, int]]] = []
    for y in range(h):
        xs = np.where(opaque[y] & ~seen[y])[0]
        for x in xs:
            if seen[y, x]:
                continue
            stack = [(int(y), int(x))]
            cells: list[tuple[int, int]] = []
            while stack:
                cy, cx = stack.pop()
                if cy < 0 or cx < 0 or cy >= h or cx >= w or seen[cy, cx] or not opaque[cy, cx]:
                    continue
                seen[cy, cx] = True
                cells.append((cy, cx))
                stack += [(cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)]
            if cells:
                blobs.append(cells)
    if not blobs:
        return al
    blobs.sort(key=len, reverse=True)
    floor = max(80, int(blobs[0].__len__() * min_frac))
    keep = np.zeros_like(al)
    for blob in blobs:
        if len(blob) < floor:
            continue
        for cy, cx in blob:
            keep[cy, cx] = al[cy, cx]
    return keep


def despill(rgb: np.ndarray, al: np.ndarray) -> np.ndarray:
    mag = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    spill = (mag > 14) & (al > 0)
    rgb = rgb.copy()
    rgb[:, :, 0] = np.where(spill, np.clip(rgb[:, :, 0] - mag * 0.55, 0, 255), rgb[:, :, 0])
    rgb[:, :, 2] = np.where(spill, np.clip(rgb[:, :, 2] - mag * 0.55, 0, 255), rgb[:, :, 2])
    return rgb


def clean_cell(cell: Image.Image) -> Image.Image:
    a = np.array(cell.convert("RGBA"))
    rgb = a[:, :, :3].astype(np.float32)
    al = a[:, :, 3].astype(np.float32)
    al = flood_clear(rgb, al)
    al = keep_large(al)
    rgb = despill(rgb, al)
    out = Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), "RGBA")
    bbox = out.getbbox()
    if not bbox:
        return out
    pad = 16
    l, t, r, b = bbox
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(out.width, r + pad), min(out.height, b + pad)
    return out.crop((l, t, r, b))


def split_sheet(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    cw, ch = w // 2, h // 2
    cells = [
        im.crop((0, 0, cw, ch)),
        im.crop((cw, 0, w, ch)),
        im.crop((0, ch, cw, h)),
        im.crop((cw, ch, w, h)),
    ]
    dest.mkdir(parents=True, exist_ok=True)
    for name, cell in zip(NAMES, cells):
        cleaned = clean_cell(cell)
        cleaned.save(dest / f"{name}.png")
        print(f"{dest.name:10} {name:8} {cleaned.size[0]}x{cleaned.size[1]}")


def main() -> None:
    for folder, dest in SHEETS.items():
        clean = ASSETS / folder / "raw-sheet-clean.png"
        raw = ASSETS / folder / "raw-sheet.png"
        src = clean if clean.exists() else raw
        if not src.exists():
            print("skip", folder)
            continue
        split_sheet(src, PUB / dest)


if __name__ == "__main__":
    main()
