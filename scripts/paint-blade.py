#!/usr/bin/env python3
"""Raster sword/claw VFX: thin silver blade, crimson edge. Not brown stamps."""
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path("/workspace/public/fx")
OUT.mkdir(parents=True, exist_ok=True)


def dist_to_segment(px, py, ax, ay, bx, by):
    abx, aby = bx - ax, by - ay
    apx, apy = px - ax, py - ay
    ab2 = abx * abx + aby * aby
    t = np.clip((apx * abx + apy * aby) / max(ab2, 1e-6), 0.0, 1.0)
    qx, qy = ax + t * abx, ay + t * aby
    return np.hypot(px - qx, py - qy), t


def taper(t, head=0.08, tail=0.12):
    a = np.clip(t / head, 0, 1)
    b = np.clip((1 - t) / tail, 0, 1)
    s = a * a * (3 - 2 * a) * b * b * (3 - 2 * b)
    return np.maximum(s, 0)


def slash_layer(h, w, a, b, core, glow, crimson_side=1.0, curve=0.0, rng=None):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ax, ay = a
    bx, by = b
    mx, my = (ax + bx) * 0.5, (ay + by) * 0.5
    nx, ny = -(by - ay), (bx - ax)
    nlen = max(np.hypot(nx, ny), 1e-6)
    nx, ny = nx / nlen, ny / nlen
    # slight bow
    xx_c = xx + nx * curve * np.sin(np.pi * np.clip(((xx - ax) * (bx - ax) + (yy - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 + 1e-6), 0, 1))
    d, t = dist_to_segment(xx_c, yy, ax, ay, bx, by)
    tp = taper(t)
    width = np.maximum(core * tp, 0.4)
    # signed side for crimson edge
    side = ((xx - ax) * nx + (yy - ay) * ny)

    core_a = np.exp(-0.5 * (d / (width * 0.55 + 0.3)) ** 2) * tp
    glow_a = np.exp(-0.5 * (d / (glow * tp + 1.2)) ** 2) * tp * 0.72
    fringe = np.exp(-0.5 * ((d - width * 0.9) / (width * 0.7 + 0.8)) ** 2)
    crimson = fringe * tp * np.clip(crimson_side * side / 8.0, 0, 1)

    rgba = np.zeros((h, w, 4), dtype=np.float32)
    # cool silver glow
    rgba[..., 0] += glow_a * 210
    rgba[..., 1] += glow_a * 226
    rgba[..., 2] += glow_a * 255
    rgba[..., 3] += glow_a * 160
    # white-hot core
    rgba[..., 0] += core_a * 255
    rgba[..., 1] += core_a * 252
    rgba[..., 2] += core_a * 248
    rgba[..., 3] += core_a * 255
    # thin blood edge
    rgba[..., 0] += crimson * 220
    rgba[..., 1] += crimson * 36
    rgba[..., 2] += crimson * 42
    rgba[..., 3] += crimson * 200

    if rng is not None:
        # sparks along the trail
        n = 18
        for _ in range(n):
            u = float(rng.uniform(0.08, 0.92))
            sx = ax + (bx - ax) * u + float(rng.normal(0, 10))
            sy = ay + (by - ay) * u + float(rng.normal(0, 10))
            r = float(rng.uniform(1.2, 3.4))
            spark = np.exp(-((xx - sx) ** 2 + (yy - sy) ** 2) / (2 * r * r))
            hot = float(rng.random()) > 0.35
            if hot:
                rgba[..., 0] += spark * 255
                rgba[..., 1] += spark * 230
                rgba[..., 2] += spark * 210
            else:
                rgba[..., 0] += spark * 200
                rgba[..., 1] += spark * 24
                rgba[..., 2] += spark * 30
            rgba[..., 3] += spark * 220

        # fine grain
        grain = rng.normal(0, 1, (h, w)).astype(np.float32)
        mask = rgba[..., 3] > 8
        rgba[..., 0][mask] += grain[mask] * 8
        rgba[..., 1][mask] += grain[mask] * 8
        rgba[..., 2][mask] += grain[mask] * 8

    return rgba


def save(arr, path: Path) -> None:
    out = np.clip(arr, 0, 255).astype(np.uint8)
    # kill near-empty pixels
    a = out[..., 3]
    out[..., 3] = np.where(a < 10, 0, a)
    Image.fromarray(out, "RGBA").save(path)
    print(path, out.shape, int((out[..., 3] > 10).mean() * 1000) / 10, "% opaque")


def main() -> None:
    h = w = 1024
    rng = np.random.default_rng(11)
    slash = slash_layer(h, w, (150, 130), (890, 900), core=5.2, glow=22, crimson_side=1.0, curve=18, rng=rng)
    save(slash, OUT / "slash.png")

    rng2 = np.random.default_rng(21)
    claw = np.zeros((h, w, 4), dtype=np.float32)
    paths = [
        ((240, 90), (300, 910), 4.2, 16, 10),
        ((470, 60), (530, 940), 4.6, 18, 0),
        ((700, 110), (760, 900), 4.0, 15, -10),
    ]
    for a, b, c, g, curve in paths:
        claw += slash_layer(h, w, a, b, core=c, glow=g, crimson_side=1.0, curve=curve, rng=rng2)
    save(claw, OUT / "claw.png")

    # small white spark burst, no brown
    rng3 = np.random.default_rng(5)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = 512.0, 512.0
    burst = np.zeros((h, w, 4), dtype=np.float32)
    for i in range(22):
        ang = float(rng3.uniform(0, np.pi * 2))
        length = float(rng3.uniform(40, 160))
        ax, ay = cx, cy
        bx, by = cx + np.cos(ang) * length, cy + np.sin(ang) * length
        burst += slash_layer(h, w, (ax, ay), (bx, by), core=2.2, glow=8, crimson_side=0.4 if i % 3 == 0 else 0.0, curve=0, rng=None) * 0.85
    core = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * 28 ** 2))
    burst[..., 0] += core * 255
    burst[..., 1] += core * 244
    burst[..., 2] += core * 230
    burst[..., 3] += core * 200
    save(burst, OUT / "impact.png")


if __name__ == "__main__":
    main()
