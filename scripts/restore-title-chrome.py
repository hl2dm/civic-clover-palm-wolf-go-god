#!/usr/bin/env python3
"""Restore painted title chrome by keying ONLY magenta — never dark silk/wood.

Previous despill treated navy lacquer and walnut as background and punched
holes through the plaque body and the dark wooden slips.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAW = Path("/workspace/screenshots/ui-art")
OUT = Path("/workspace/public/ui")
PREVIEW = Path("/workspace/screenshots/ui-art")


def magenta_mask(rgb: np.ndarray, loose: bool = False) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    if loose:
        # flood-only: still require a real magenta cast, never dark neutrals
        return (
            (r > 145)
            & (b > 125)
            & (g < 145)
            & ((r + b) > (g * 2.15))
            & (np.minimum(r, b) > (g + 22))
        )
    return (
        (r > 175)
        & (b > 155)
        & (g < 125)
        & ((r + b) > (g * 2.7))
        & (np.minimum(r, b) > (g + 40))
    )


def key_magenta(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    arr = np.array(rgba)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3].astype(np.float32)
    h, w = alpha.shape

    hard = magenta_mask(rgb, loose=False)
    soft = magenta_mask(rgb, loose=True)
    alpha[hard] = 0

    seen = np.zeros((h, w), dtype=bool)
    from collections import deque

    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))

    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x]:
            continue
        seen[y, x] = True
        if not (hard[y, x] or soft[y, x] or alpha[y, x] < 8):
            continue
        alpha[y, x] = 0
        q.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))

    # despill only remaining magenta fringe, leave gold/wood/silk alone
    mag = np.minimum(rgb[:, :, 0].astype(np.float32), rgb[:, :, 2].astype(np.float32)) - rgb[:, :, 1]
    fringe = (alpha > 0) & (alpha < 240) & (mag > 18) & (rgb[:, :, 2] > 90)
    rgb = rgb.astype(np.float32)
    rgb[:, :, 0] = np.where(fringe, np.clip(rgb[:, :, 0] - mag * 0.55, 0, 255), rgb[:, :, 0])
    rgb[:, :, 2] = np.where(fringe, np.clip(rgb[:, :, 2] - mag * 0.65, 0, 255), rgb[:, :, 2])
    alpha[(alpha < 30) & hard] = 0

    out = np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def crop_opaque(im: Image.Image, pad: int = 8) -> Image.Image:
    alpha = np.array(im.split()[-1])
    ys, xs = np.where(alpha > 18)
    if len(xs) == 0:
        return im
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width - 1, x1 + pad)
    y1 = min(im.height - 1, y1 + pad)
    return im.crop((x0, y0, x1 + 1, y1 + 1))


def soften_edge(im: Image.Image) -> Image.Image:
    a = im.split()[-1].filter(ImageFilter.GaussianBlur(0.6))
    im = im.copy()
    im.putalpha(a)
    return im


def restore(src_name: str, dest_name: str, pad: int = 10) -> Path:
    src = RAW / src_name
    im = Image.open(src)
    keyed = key_magenta(im)
    cropped = soften_edge(crop_opaque(keyed, pad=pad))
    dest = OUT / dest_name
    cropped.save(dest, "PNG", optimize=True)
    cropped.save(PREVIEW / dest_name, "PNG")
    opaque = int(np.array(cropped.split()[-1]).mean())
    print(f"{dest_name:22} {cropped.size}  mean-alpha={opaque:.1f}  from {src_name}")
    return dest


def main() -> None:
    restore("raw-title-wordmark.jpg", "title-wordmark.png", pad=6)
    restore("raw-slip-continue.jpg", "slip-continue.png", pad=8)
    restore("raw-slip-new-dark.jpg", "slip-new-dark.png", pad=8)
    restore("raw-slip-new-gold.jpg", "slip-new-gold.png", pad=8)
    restore("raw-slip-keep.jpg", "slip-keep.png", pad=8)
    restore("raw-slip-restart.jpg", "slip-restart.png", pad=8)
    restore("raw-seal-rules.jpg", "seal-rules.png", pad=6)


if __name__ == "__main__":
    main()
