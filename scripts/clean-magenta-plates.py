#!/usr/bin/env python3
"""Second pass: drop leftover JPEG-magenta plates without eating fur/cloth."""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

PUB = Path("/workspace/public/sprites")
IDS = ["shanxiao", "yeshou", "lingshe", "shikui", "huoya", "juyuan", "zhuji", "jindan", "huxian"]
NAMES = ["idle-1", "idle-2", "attack", "hurt"]


def plate_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dist = np.sqrt((r - 255) ** 2 + (g - 0) ** 2 + (b - 255) ** 2)
    # JPEG magenta drifts toward mauve / hot pink. Keep brown (g close to r/2, b low)
    # and fire (r high, b low) out of the key.
    mauve = (r > 150) & (b > 90) & (g < 150) & (b > g * 0.75) & (r + b > g * 2.05)
    fuchsia = (np.minimum(r, b) > 140) & (g < 110)
    return (dist < 110) | mauve | fuchsia


def flood(rgb, al):
    mask = plate_mask(rgb)
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
        if al[y, x] > 18 and not mask[y, x]:
            continue
        al[y, x] = 0
        stack += [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
    return al


def largest(al):
    h, w = al.shape
    opaque = al > 28
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


def trim(im, pad=14):
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(im.width, r + pad), min(im.height, b + pad)
    return im.crop((l, t, r, b))


def main():
    for ident in IDS:
        for name in NAMES:
            path = PUB / ident / f"{name}.png"
            if not path.exists():
                continue
            im = Image.open(path).convert("RGBA")
            a = np.array(im)
            rgb, al = a[:, :, :3].astype(np.float32), a[:, :, 3].astype(np.float32)
            al = flood(rgb, al)
            al = largest(al)
            out = Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), "RGBA")
            out = trim(out)
            out.save(path)
            fill = float((al > 28).mean()) if al.size else 0
            print(f"{ident:10} {name:8} {out.size[0]}x{out.size[1]} fill={fill:.2f}")


if __name__ == "__main__":
    main()
