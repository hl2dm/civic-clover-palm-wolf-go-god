#!/usr/bin/env python3
"""Key compressed-magenta leftovers (JPEG turns #FF00FF into dark crimson)."""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace/public/sprites")
KEYS = np.array(
    [
        [255, 0, 255],
        [203, 26, 98],
        [200, 30, 90],
        [138, 26, 33],
        [141, 27, 34],
        [180, 20, 80],
    ],
    dtype=np.float32,
)


def is_key_color(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dist = np.min(np.sqrt(((rgb[:, :, None, :] - KEYS) ** 2).sum(axis=3)), axis=2)
    crimson = (r > 90) & (g < 70) & (b < 120) & (r > g + 50)
    magenta = (np.minimum(r, b) > 140) & (g < 90)
    return (dist < 72) | crimson | magenta


def clean(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    rgb = a[:, :, :3].astype(np.float32)
    al = a[:, :, 3].astype(np.float32)
    h, w = al.shape
    key = is_key_color(rgb)
    al[key] = 0

    # flood from borders through leftover key / already-clear pixels
    seen = np.zeros((h, w), dtype=bool)
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
        if al[y, x] > 12 and not key[y, x]:
            continue
        al[y, x] = 0
        q.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))

    # despill remaining fringe
    mag = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    spill = mag > 8
    rgb[:, :, 0] = np.where(spill, np.clip(rgb[:, :, 0] - mag * 0.7, 0, 255), rgb[:, :, 0])
    rgb[:, :, 2] = np.where(spill, np.clip(rgb[:, :, 2] - mag * 0.7, 0, 255), rgb[:, :, 2])
    al[(al < 40) & is_key_color(rgb)] = 0

    out = np.dstack([rgb, al])
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").save(path)


def main() -> None:
    # prefer pre-despill sources when present
    src_map = {
        "player/attack-1.png": Path("/workspace/assets/sprites/player-attack/attack-1.png"),
        "player/attack-2.png": Path("/workspace/assets/sprites/player-attack/attack-2.png"),
        "player/attack-3.png": Path("/workspace/assets/sprites/player-attack/attack-3.png"),
        "player/attack-4.png": Path("/workspace/assets/sprites/player-attack/attack-4.png"),
    }
    for rel, src in src_map.items():
        dest = ROOT / rel
        if src.exists():
            dest.write_bytes(src.read_bytes())

    n = 0
    for p in ROOT.rglob("*.png"):
        clean(p)
        n += 1
    print("cleaned", n)


if __name__ == "__main__":
    main()
