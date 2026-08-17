#!/usr/bin/env python3
"""Restore combat frames without a shared size pipeline.

Each foe is handled on its own: chroma-split shanxiao from its magenta sheet,
copy+trim sanxiu / juyuan from already-keyed asset cells.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

PUB = Path("/workspace/public/sprites")
ASSETS = Path("/workspace/assets/sprites")


def trim(arr: np.ndarray, pad: int = 8) -> np.ndarray:
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 16)
    if len(xs) == 0:
        return arr
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + 1 + pad)
    return arr[y0:y1, x0:x1]


def key_magenta(arr: np.ndarray) -> np.ndarray:
    """Key only magenta plate. Do not flood-eat brown fur."""
    out = arr.copy()
    r = out[:, :, 0].astype(np.int16)
    g = out[:, :, 1].astype(np.int16)
    b = out[:, :, 2].astype(np.int16)
    mag = (r > 170) & (b > 170) & (g < 150) & ((r + b) > (g * 2 + 80))
    out[mag, 3] = 0
    # despill remaining pink fringe into nearby fur
    vis = out[:, :, 3] > 16
    pink = vis & (r > 140) & (b > 110) & (g < 130) & (r > g + 25)
    if pink.any():
        # pull magenta toward local luminance so fur stays brown/black
        lum = np.clip((g * 2 + r) // 3, 0, 255).astype(np.uint8)
        out[pink, 0] = np.minimum(out[pink, 0], lum[pink] + 18)
        out[pink, 2] = np.minimum(out[pink, 2], lum[pink] + 8)
        # fade the thinnest rim
        out[pink, 3] = np.minimum(out[pink, 3], 210)
    return out


def split_sheet(path: Path) -> dict[str, np.ndarray]:
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    h, w = a.shape[:2]
    ch, cw = h // 2, w // 2
    cells = {
        "idle-1": a[0:ch, 0:cw],
        "idle-2": a[0:ch, cw : cw * 2],
        "attack": a[ch : ch * 2, 0:cw],
        "hurt": a[ch : ch * 2, cw : cw * 2],
    }
    return {k: trim(key_magenta(v)) for k, v in cells.items()}


def install_arr(dest: Path, arr: np.ndarray) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGBA").save(dest, optimize=True)
    vis = (arr[:, :, 3] > 16).mean()
    print(f"  {dest} {arr.shape[1]}x{arr.shape[0]} fill={vis:.3f}")


def restore_from_cells(name: str) -> None:
    src = ASSETS / name
    dest = PUB / name
    print("restore cells", name)
    for fname in ("idle-1.png", "idle-2.png", "attack.png", "hurt.png"):
        im = Image.open(src / fname).convert("RGBA")
        arr = trim(key_magenta(np.array(im)))
        install_arr(dest / fname, arr)


def restore_shanxiao() -> None:
    sheet = ASSETS / "shanxiao" / "raw-sheet-clean.png"
    print("split shanxiao", sheet)
    cells = split_sheet(sheet)
    dest = PUB / "shanxiao"
    mapping = {
        "idle-1": "idle-1.png",
        "idle-2": "idle-2.png",
        "attack": "attack.png",
        "hurt": "hurt.png",
    }
    for key, fname in mapping.items():
        install_arr(dest / fname, cells[key])


if __name__ == "__main__":
    restore_shanxiao()
    restore_from_cells("sanxiu")
    restore_from_cells("juyuan")
