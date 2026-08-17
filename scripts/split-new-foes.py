#!/usr/bin/env python3
"""Split new 2x2 magenta sheets with a gentle key — magenta family only."""
from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image

FOES = [
    "shijiang", "tongzhong", "youdeng", "xuefu", "yanxi",
    "moxiao", "jiantong", "fengli", "yaokui",
    "lianshi", "leishi", "xuehe", "zhujian", "yecha",
    "yuanzhen", "tianmo",
]
NAMES = ["idle-1", "idle-2", "attack", "hurt"]
ROOT = Path("/workspace/assets/sprites")
PUB = Path("/workspace/public/sprites")
PORT = Path("/workspace/public/portraits")


def magenta_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    # true magenta + jpeg rose (#F10780) + pink spill. Leave brown/green/gold bodies.
    hot = (r > 160) & (b > 100) & (g < 130) & (np.minimum(r, b) > g + 20)
    rose = (r > 190) & (g < 50) & (b > 90) & (r > b + 40)
    pink = (r > 190) & (g < 90) & (b > 140)
    return hot | rose | pink


def clean_cell(cell: Image.Image) -> Image.Image:
    a = np.array(cell.convert("RGBA"))
    rgb = a[:, :, :3].astype(np.float32)
    al = a[:, :, 3].astype(np.float32)
    mask = magenta_mask(rgb)
    al[mask] = 0

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
        if al[y, x] > 18 and not mask[y, x]:
            continue
        al[y, x] = 0
        stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))

    # despill leftover magenta fringe
    mag = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    spill = (mag > 18) & (al > 0)
    rgb[:, :, 0] = np.where(spill, np.clip(rgb[:, :, 0] - mag * 0.7, 0, 255), rgb[:, :, 0])
    rgb[:, :, 2] = np.where(spill, np.clip(rgb[:, :, 2] - mag * 0.7, 0, 255), rgb[:, :, 2])
    al[(al < 24) & magenta_mask(rgb)] = 0

    opaque = al > 40
    labels = np.zeros(opaque.shape, dtype=np.int32)
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

    out = np.dstack([rgb, al])
    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    bbox = im.getbbox()
    if not bbox:
        return im
    pad = 16
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def fill_ratio(im: Image.Image) -> float:
    a = np.array(im)
    if a.ndim < 3 or a.shape[2] < 4:
        return 1.0
    return float((a[:, :, 3] > 40).mean())


def portrait_from(im: Image.Image, dest: Path) -> None:
    """Crop upper two-thirds of the idle sprite onto warm paper — never used in combat."""
    paper = Image.new("RGB", (360, 480), (42, 32, 24))
    src = im.convert("RGBA")
    # focus on upper body for the codex tile
    w, h = src.size
    crop = src.crop((0, 0, w, int(h * 0.72)))
    crop.thumbnail((320, 420), Image.Resampling.LANCZOS)
    x = (360 - crop.width) // 2
    y = 480 - crop.height - 8
    paper.paste(crop, (x, y), crop)
    dest.parent.mkdir(parents=True, exist_ok=True)
    paper.save(dest, quality=90)


def split(foe: str) -> None:
    src = ROOT / foe / "raw-sheet.png"
    if not src.exists():
        print("MISSING", foe)
        return
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    cw, ch = w // 2, h // 2
    cells = [
        im.crop((0, 0, cw, ch)),
        im.crop((cw, 0, w, ch)),
        im.crop((0, ch, cw, h)),
        im.crop((cw, ch, w, h)),
    ]
    dest = PUB / foe
    dest.mkdir(parents=True, exist_ok=True)
    idle = None
    for name, cell in zip(NAMES, cells):
        cleaned = clean_cell(cell)
        cleaned.save(dest / f"{name}.png")
        ratio = fill_ratio(cleaned)
        print(f"{foe}/{name} {cleaned.size[0]}x{cleaned.size[1]} fill={ratio:.2f}")
        if name == "idle-1":
            idle = cleaned
    if idle is not None:
        portrait_from(idle, PORT / f"{foe}.png")


def main() -> None:
    import sys
    foes = sys.argv[1:] or FOES
    for foe in foes:
        split(foe)


if __name__ == "__main__":
    main()
