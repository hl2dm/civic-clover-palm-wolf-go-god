#!/usr/bin/env python3
"""Strip painted rectangular boards; keep the figure silhouette."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path("/workspace/public/sprites")
SKIP = {"player"}


def cutout(im: Image.Image) -> Image.Image:
    src = np.asarray(im.convert("RGBA")).astype(np.float32)
    h, w = src.shape[:2]
    rgb = src[..., :3]
    a = src[..., 3]
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)

    opaque = a > 16
    if opaque.sum() < 80:
        return im
    ys, xs = np.where(opaque)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    bh, bw = max(1, y1 - y0), max(1, x1 - x0)
    my, mx = max(6, bh // 7), max(6, bw // 7)

    rim = np.zeros((h, w), dtype=bool)
    rim[y0 : y0 + my, x0 : x1 + 1] = True
    rim[y1 - my + 1 : y1 + 1, x0 : x1 + 1] = True
    rim[y0 : y1 + 1, x0 : x0 + mx] = True
    rim[y0 : y1 + 1, x1 - mx + 1 : x1 + 1] = True
    rim &= opaque
    if rim.sum() < 20:
        return im

    bg = np.median(rgb[rim], axis=0)
    bg_lum = float(np.median(lum[rim]))
    bg_sat = float(np.median(sat[rim]))
    dist = np.linalg.norm(rgb - bg, axis=2)

    # Likely board: rim-like color, dark wash, or already empty.
    like_bg = (dist < 46) | ((lum < bg_lum + 18) & (sat < bg_sat + 16) & (dist < 72))
    like_bg |= a < 16

    vis = np.zeros((h, w), dtype=bool)
    stack = list(zip(*np.where(rim & like_bg)))
    # also start from image edges
    for x in range(w):
        stack.append((0, x))
        stack.append((h - 1, x))
    for y in range(h):
        stack.append((y, 0))
        stack.append((y, w - 1))

    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or vis[y, x]:
            continue
        if not like_bg[y, x] and dist[y, x] > 58:
            continue
        vis[y, x] = True
        stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))

    keep = opaque & ~vis
    keep = _largest(keep)
    keep = _fill_holes(keep)

    # If we ate the figure, fall back to luminance contrast against rim.
    if keep.mean() < 0.04:
        keep = opaque & ((sat > bg_sat + 14) | (lum > bg_lum + 22) | (dist > 50))
        keep = _largest(keep)

    alpha = np.zeros((h, w), dtype=np.uint8)
    alpha[keep] = 255
    # feather
    img_a = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(radius=0.8))
    alpha = np.array(img_a)
    alpha[keep] = np.maximum(alpha[keep], 220)
    alpha[~keep & (alpha < 40)] = 0

    out = src.copy()
    out[..., 3] = alpha
    img = Image.fromarray(out.astype(np.uint8), "RGBA")
    bbox = img.getbbox()
    if not bbox:
        return im
    pad = 10
    l, t, r, b = bbox
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(w, r + pad), min(h, b + pad)
    return img.crop((l, t, r, b))


def _largest(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best_cells: list[tuple[int, int]] = []
    for y in range(h):
        for x in np.where(mask[y] & ~seen[y])[0]:
            if seen[y, x]:
                continue
            stack = [(int(y), int(x))]
            cells: list[tuple[int, int]] = []
            while stack:
                cy, cx = stack.pop()
                if cy < 0 or cy >= h or cx < 0 or cx >= w or seen[cy, cx] or not mask[cy, cx]:
                    continue
                seen[cy, cx] = True
                cells.append((cy, cx))
                stack.extend(((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)))
            if len(cells) > len(best_cells):
                best_cells = cells
    out = np.zeros_like(mask)
    for cy, cx in best_cells:
        out[cy, cx] = True
    return out


def _fill_holes(mask: np.ndarray) -> np.ndarray:
    inv = ~mask
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    stack = []
    for x in range(w):
        if inv[0, x]:
            stack.append((0, x))
        if inv[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if inv[y, 0]:
            stack.append((y, 0))
        if inv[y, w - 1]:
            stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or seen[y, x] or not inv[y, x]:
            continue
        seen[y, x] = True
        stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
    holes = inv & ~seen
    return mask | holes


def main() -> int:
    ids = [p.name for p in ROOT.iterdir() if p.is_dir() and p.name not in SKIP]
    if len(sys.argv) > 1:
        ids = sys.argv[1:]
    for name in sorted(ids):
        folder = ROOT / name
        for src in sorted(folder.glob("*.png")):
            im = Image.open(src)
            out = cutout(im)
            out.save(src)
            print(f"{src.relative_to(ROOT)} {im.size} -> {out.size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
