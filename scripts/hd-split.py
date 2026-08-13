#!/usr/bin/env python3
"""Split 1408 2x2 raw sheets into full-res transparent frames."""
from pathlib import Path

from collections import deque

import numpy as np
from PIL import Image

KEYS = np.array(
    [
        [255, 0, 255],
        [203, 26, 98],
        [200, 30, 90],
        [180, 20, 80],
        [220, 40, 160],
    ],
    dtype=np.float32,
)

MAP = {
    "player-idle": ("player", ["idle-1", "idle-2", "idle-3", "idle-4"]),
    "player-attack": ("player", ["attack-1", "attack-2", "attack-3", "attack-4"]),
    "shanxiao": ("shanxiao", ["idle-1", "idle-2", "attack", "hurt"]),
    "yeshou": ("yeshou", ["idle-1", "idle-2", "attack", "hurt"]),
    "lingshe": ("lingshe", ["idle-1", "idle-2", "attack", "hurt"]),
    "shikui": ("shikui", ["idle-1", "idle-2", "attack", "hurt"]),
    "huoya": ("huoya", ["idle-1", "idle-2", "attack", "hurt"]),
    "juyuan": ("juyuan", ["idle-1", "idle-2", "attack", "hurt"]),
    "zhuji": ("zhuji", ["idle-1", "idle-2", "attack", "hurt"]),
    "jindan": ("jindan", ["idle-1", "idle-2", "attack", "hurt"]),
}


def key_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dist = np.min(np.sqrt(((rgb[:, :, None, :] - KEYS) ** 2).sum(axis=3)), axis=2)
    crimson = (r > 90) & (g < 80) & (b < 140) & (r > g + 45)
    magenta = (np.minimum(r, b) > 150) & (g < 100)
    return (dist < 78) | crimson | magenta


def clean_cell(cell: Image.Image) -> Image.Image:
    a = np.array(cell.convert("RGBA"))
    rgb = a[:, :, :3].astype(np.float32)
    al = a[:, :, 3].astype(np.float32)
    mask = key_mask(rgb)
    al[mask] = 0
    # flood from borders
    h, w = al.shape
    seen = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        stack.append((0, x))
        stack.append((h - 1, x))
    for y in range(h):
        stack.append((y, 0))
        stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x]:
            continue
        seen[y, x] = True
        if al[y, x] > 16 and not mask[y, x]:
            continue
        al[y, x] = 0
        stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
    mag = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    spill = mag > 10
    rgb[:, :, 0] = np.where(spill, np.clip(rgb[:, :, 0] - mag * 0.75, 0, 255), rgb[:, :, 0])
    rgb[:, :, 2] = np.where(spill, np.clip(rgb[:, :, 2] - mag * 0.75, 0, 255), rgb[:, :, 2])
    al[(al < 28) & key_mask(rgb)] = 0
    # keep only the largest opaque blob (drops leftover magenta islands)
    opaque = al > 40
    labels = np.zeros(opaque.shape, dtype=np.int32)
    h, w = al.shape
    lab = 0
    sizes = {}
    for y in range(h):
        for x in range(w):
            if not opaque[y, x] or labels[y, x]:
                continue
            lab += 1
            q = deque([(y, x)])
            labels[y, x] = lab
            n = 0
            while q:
                cy, cx = q.popleft()
                n += 1
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = lab
                        q.append((ny, nx))
            sizes[lab] = n
    if sizes:
        keep = max(sizes, key=sizes.get)
        al[labels != keep] = 0
    leftover = (rgb[:, :, 0] > 100) & (rgb[:, :, 1] < 90) & (rgb[:, :, 2] < 120) & (
        rgb[:, :, 0] > rgb[:, :, 1] + 40
    )
    al[leftover] = 0
    out = np.dstack([rgb, al])
    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    # crop to content with padding
    bbox = im.getbbox()
    if not bbox:
        return im
    pad = 18
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def split(src: Path, dest_dir: Path, names: list[str]) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    cw, ch = w // 2, h // 2
    cells = [
        im.crop((0, 0, cw, ch)),
        im.crop((cw, 0, w, ch)),
        im.crop((0, ch, cw, h)),
        im.crop((cw, ch, w, h)),
    ]
    dest_dir.mkdir(parents=True, exist_ok=True)
    for name, cell in zip(names, cells):
        cleaned = clean_cell(cell)
        out = dest_dir / f"{name}.png"
        cleaned.save(out)
        print(name, cleaned.size, out.stat().st_size)


def main() -> None:
    root = Path("/workspace/assets/sprites")
    pub = Path("/workspace/public/sprites")
    for folder, (dest, names) in MAP.items():
        src = root / folder / "raw-sheet.png"
        if src.exists():
            split(src, pub / dest, names)


if __name__ == "__main__":
    main()
