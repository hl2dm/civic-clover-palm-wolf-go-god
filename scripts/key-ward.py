#!/usr/bin/env python3
"""Key a thin gold qi-oval. Magenta out, jade on the inner lip, soft ink edge."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

SRC = Path("/workspace/artifacts/imagine_images/62b25581-a663-4ac0-a49c-5867757a1ae3.jpg")
OUT = Path("/workspace/public/ui/ward-oval.png")
PREVIEW = Path("/workspace/screenshots/ward-oval-keyed.png")
COMP = Path("/workspace/screenshots/ward-on-player.png")
PLAYER = Path("/workspace/public/sprites/player/idle-1.png")
BG = Path("/workspace/public/arena-qingming.jpg")


def magenta(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    return (r > 150) & (b > 90) & (g < 90) & ((r + b) > (g * 2.4)) & (np.minimum(r, b) > (g + 40))


def flood_clear(alpha: np.ndarray, walk: np.ndarray, seeds: list[tuple[int, int]]) -> None:
    h, w = alpha.shape
    seen = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque(seeds)
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x]:
            continue
        seen[y, x] = True
        if not walk[y, x]:
            continue
        alpha[y, x] = 0
        q.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))


def dist_to_false(mask: np.ndarray) -> np.ndarray:
    """Chebyshev distance to nearest False. mask True = solid."""
    h, w = mask.shape
    inf = h + w + 4
    d = np.where(mask, inf, 0).astype(np.int32)
    for y in range(h):
        row = d[y]
        for x in range(1, w):
            row[x] = min(row[x], row[x - 1] + 1)
        for x in range(w - 2, -1, -1):
            row[x] = min(row[x], row[x + 1] + 1)
    for y in range(1, h):
        d[y] = np.minimum(d[y], d[y - 1] + 1)
    for y in range(h - 2, -1, -1):
        d[y] = np.minimum(d[y], d[y + 1] + 1)
    return d


def key_ring(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3]
    alpha = np.full(rgb.shape[:2], 255, dtype=np.float32)
    h, w = alpha.shape
    mag = magenta(rgb)
    alpha[mag] = 0

    edge = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)]
    edge += [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    flood_clear(alpha, mag | (alpha < 8), edge)
    flood_clear(alpha, mag | (alpha < 40), [(h // 2, w // 2)])

    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    # residual pink fringe
    pink = (alpha > 0) & (b > g + 6) & (r > g + 10)
    mag_amt = np.minimum(r, b) - g
    r = np.where(pink, np.clip(r - mag_amt * 0.75, 0, 255), r)
    b = np.where(pink, np.clip(b - mag_amt * 0.9, 0, 255), b)
    g = np.where(pink, np.clip(g + mag_amt * 0.1, 0, 255), g)
    alpha[pink & (mag_amt > 28)] = 0

    solid = alpha > 40
    if not solid.any():
        out = np.dstack([r, g, b, alpha]).clip(0, 255).astype(np.uint8)
        return Image.fromarray(out, "RGBA")

    # warm the gold, lift it off the mustard
    gold = solid & (r > 120) & (g > 70)
    r = np.where(gold, np.clip(r * 1.04 + 8, 0, 255), r)
    g = np.where(gold, np.clip(g * 0.96 + 2, 0, 255), g)
    b = np.where(gold, np.clip(b * 0.72, 0, 255), b)

    # inner lip: celadon wash where we face the hole
    hole = alpha < 8
    d_in = dist_to_false(~hole)  # distance into the ring from the hole
    inner = solid & (d_in <= 10)
    t = np.clip(1.0 - d_in / 10.0, 0, 1)
    r = np.where(inner, r * (1 - 0.22 * t) + 168 * 0.22 * t, r)
    g = np.where(inner, g * (1 - 0.28 * t) + 196 * 0.28 * t, g)
    b = np.where(inner, b * (1 - 0.18 * t) + 148 * 0.18 * t, b)

    # soften outer edge
    d_out = dist_to_false(solid)
    rim = (alpha > 0) & (d_out <= 6) & ~solid
    fade = np.clip(1.0 - d_out / 6.0, 0, 1)
    alpha = np.where(rim, np.maximum(alpha, fade * 90), alpha)
    r = np.where(rim, np.maximum(r, 198), r)
    g = np.where(rim, np.maximum(g, 150), g)
    b = np.where(rim, np.maximum(b, 62), b)

    out = np.dstack([r, g, b, alpha]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def crop_opaque(im: Image.Image, pad: int = 8) -> Image.Image:
    a = np.array(im.split()[-1])
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, int(xs.min()) - pad), min(im.width - 1, int(xs.max()) + pad)
    y0, y1 = max(0, int(ys.min()) - pad), min(im.height - 1, int(ys.max()) + pad)
    return im.crop((x0, y0, x1 + 1, y1 + 1))


def compose_preview(ring: Image.Image) -> None:
    if BG.exists():
        bg = Image.open(BG).convert("RGBA").resize((520, 720), Image.Resampling.LANCZOS)
        canvas = bg
    else:
        canvas = Image.new("RGBA", (520, 720), (28, 26, 24, 255))
    player = Image.open(PLAYER).convert("RGBA")
    ph = 420
    pw = max(1, int(player.width * ph / player.height))
    p = player.resize((pw, ph), Image.Resampling.LANCZOS)
    px = (canvas.width - pw) // 2
    py = canvas.height - ph - 70
    canvas.alpha_composite(p, (px, py))
    # hug the body: a little taller, a little wider
    wh = int(ph * 1.08)
    ww = int(ring.width * wh / ring.height)
    wimg = ring.resize((ww, wh), Image.Resampling.LANCZOS)
    wx = (canvas.width - ww) // 2
    wy = py + ph // 2 - wh // 2 - 4
    canvas.alpha_composite(wimg, (wx, wy))
    canvas.save(COMP, "PNG")
    print("preview", COMP, "ring", (ww, wh), "player", (pw, ph))


def main() -> None:
    keyed = key_ring(Image.open(SRC))
    ring = crop_opaque(keyed, pad=10)
    a = ring.split()[-1].filter(ImageFilter.GaussianBlur(0.55))
    ring.putalpha(a)
    ring = ImageEnhance.Contrast(ring).enhance(1.04)
    ring = ImageEnhance.Color(ring).enhance(1.05)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    ring.save(OUT, "PNG", optimize=True)
    ring.save(PREVIEW, "PNG")
    mean_a = float(np.array(ring.split()[-1]).mean())
    print(f"ward-oval {ring.size} mean-alpha={mean_a:.1f}")
    compose_preview(ring)


if __name__ == "__main__":
    main()
