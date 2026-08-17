#!/usr/bin/env python3
"""Chroma NEW title props (magenta only) and inlay exact Traditional glyphs."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path("/workspace")
RAW = ROOT / "artifacts" / "imagine_images"
UI = ROOT / "public" / "ui"
DBG = ROOT / "screenshots" / "title-inlay"
FONT = ROOT / "assets" / "fonts" / "LXGWWenKai-Medium.ttf"
DBG.mkdir(parents=True, exist_ok=True)

# freshly generated empty / painted props
PLAQUE_RAW = RAW / "b4e891a0-3807-4cbd-ac6b-64074a1a2930.jpg"
SLIP_DARK_RAW = RAW / "4fdf1af3-a62f-4b45-aa52-ecb0e80d6394.jpg"
SLIP_GOLD_RAW = RAW / "4112028c-4d9a-4892-8d89-6220a2afac45.jpg"
SEAL_RAW = RAW / "68f99308-f357-4247-99cb-8941582b231e.jpg"


def load_font(px: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), px)


def assert_glyphs(text: str) -> None:
    f = load_font(72)
    miss = np.array(f.getmask("\uFFFF"))
    bad = []
    for ch in text:
        if ch.isspace():
            continue
        m = np.array(f.getmask(ch))
        if m.size == 0 or int(m.max()) == 0 or (m.shape == miss.shape and np.array_equal(m, miss)):
            bad.append(ch)
    if bad:
        raise SystemExit(f"missing glyphs: {''.join(bad)}")


def chroma(im: Image.Image) -> Image.Image:
    """Remove only edge-connected magenta / hot-pink. Never punch dark interiors."""
    rgba = im.convert("RGBA")
    arr = np.array(rgba)
    r, g, b, a = arr[..., 0].astype(np.int16), arr[..., 1].astype(np.int16), arr[..., 2].astype(np.int16), arr[..., 3]
    mag = (r > 175) & (b > 140) & (g < 130) & ((r - g) > 55) & ((b - g) > 20)
    pink = (r > 200) & (g < 95) & (b > 80) & ((r - g) > 90)
    key = mag | pink
    h, w = key.shape
    # flood from edges so interior navy/gold never dies
    from collections import deque
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        if key[0, x]:
            q.append((0, x))
            seen[0, x] = True
        if key[h - 1, x]:
            q.append((h - 1, x))
            seen[h - 1, x] = True
    for y in range(h):
        if key[y, 0]:
            q.append((y, 0))
            seen[y, 0] = True
        if key[y, w - 1]:
            q.append((y, w - 1))
            seen[y, w - 1] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and key[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    arr[..., 3] = np.where(seen, 0, a)
    out = Image.fromarray(arr, "RGBA")
    # soften only the outer silhouette
    alpha = out.getchannel("A")
    soft = alpha.filter(ImageFilter.GaussianBlur(0.8))
    out.putalpha(ImageChops.lighter(alpha, soft.point(lambda p: min(255, int(p * 0.35)) if p < 40 else p)))
    return out


def trim(im: Image.Image, pad: int = 10) -> Image.Image:
    a = np.array(im.getchannel("A"))
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, xs.min() - pad), min(im.width, xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(im.height, ys.max() + pad)
    return im.crop((x0, y0, x1 + 1, y1 + 1))


def inner_field(im: Image.Image, dark_max: int = 80) -> tuple[int, int, int, int]:
    """Largest dark opaque rectangle in the middle — the silk / wood writing field."""
    arr = np.array(im)
    rgb = arr[..., :3].astype(np.int16)
    a = arr[..., 3]
    lum = rgb.mean(axis=2)
    field = (a > 200) & (lum < dark_max)
    h, w = field.shape
    # restrict to central band so ornaments are ignored
    field[: int(h * 0.16), :] = False
    field[int(h * 0.84) :, :] = False
    field[:, : int(w * 0.10)] = False
    field[:, int(w * 0.90) :] = False
    ys, xs = np.where(field)
    if len(xs) < 200:
        return int(w * 0.14), int(h * 0.22), int(w * 0.86), int(h * 0.78)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def sample_gold(im: Image.Image) -> tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]:
    arr = np.array(im.convert("RGB"))
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    gold = (r > 140) & (g > 90) & (b < 140) & (r > b + 20) & (r > g - 10)
    if gold.sum() < 80:
        return (232, 196, 118), (196, 148, 64), (255, 232, 176)
    pix = arr[gold]
    mean = tuple(int(x) for x in pix.mean(axis=0))
    hi = tuple(int(x) for x in np.percentile(pix, 88, axis=0))
    lo = tuple(int(x) for x in np.percentile(pix, 18, axis=0))
    return mean, lo, hi


def tracked_mask(size: tuple[int, int], text: str, font, tracking: int, origin: tuple[int, int]) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    dummy = ImageDraw.Draw(Image.new("L", (8, 8)))
    x, y = origin
    for ch in text:
        draw.text((x, y), ch, font=font, fill=255)
        box = dummy.textbbox((0, 0), ch, font=font)
        x += (box[2] - box[0]) + tracking
    return mask.filter(ImageFilter.GaussianBlur(0.35))


def text_wh(text: str, font, tracking: int) -> tuple[int, int]:
    dummy = ImageDraw.Draw(Image.new("L", (8, 8)))
    widths, heights = [], []
    for ch in text:
        b = dummy.textbbox((0, 0), ch, font=font)
        widths.append(b[2] - b[0])
        heights.append(b[3] - b[1])
    return sum(widths) + tracking * max(0, len(text) - 1), (max(heights) if heights else 0)


def fit_font(text: str, max_w: int, max_h: int, tracking_ratio: float, start: int) -> tuple[ImageFont.FreeTypeFont, int, int, int]:
    px = start
    while px >= 18:
        font = load_font(px)
        tracking = max(2, int(px * tracking_ratio))
        tw, th = text_wh(text, font, tracking)
        if tw <= max_w and th <= max_h:
            return font, tracking, tw, th
        px -= 4
    font = load_font(18)
    tracking = 2
    tw, th = text_wh(text, font, tracking)
    return font, tracking, tw, th


def inlay(
    plate: Image.Image,
    text: str,
    *,
    kind: str,
    y_bias: float = 0.50,
    track: float = 0.12,
    start_px: int = 220,
    field_dark: int = 80,
    inset: float = 0.10,
) -> Image.Image:
    plate = plate.convert("RGBA")
    w, h = plate.size
    x0, y0, x1, y1 = inner_field(plate, field_dark)
    fw, fh = x1 - x0, y1 - y0
    max_w = int(fw * (1 - inset * 2))
    max_h = int(fh * 0.62)
    font, tracking, tw, th = fit_font(text, max_w, max_h, track, start_px)
    dummy = ImageDraw.Draw(Image.new("L", (8, 8)))
    box0 = dummy.textbbox((0, 0), text[0], font=font)
    cx = x0 + fw // 2
    cy = y0 + int(fh * y_bias)
    x = cx - tw // 2
    y = cy - th // 2 - box0[1]

    mask = tracked_mask((w, h), text, font, tracking, (x, y))
    mean, lo, hi = sample_gold(plate)

    if kind == "gold":
        fill_hi, fill_lo, rim = hi, mean, lo
        body_mix = 0.12
    elif kind == "pale":
        fill_hi, fill_lo, rim = (255, 248, 230), (236, 224, 198), (70, 42, 18)
        body_mix = 0.04
    else:
        fill_hi, fill_lo, rim = (52, 30, 16), (22, 12, 8), (12, 8, 4)
        body_mix = 0.18

    # metallic / ink body
    yy = np.linspace(0, 1, h)[:, None]
    xx = np.linspace(0, 1, w)[None, :]
    t = np.clip(0.45 * yy + 0.25 * xx + 0.08 * np.sin(xx * 11), 0, 1)
    rgb = np.zeros((h, w, 3), np.float32)
    for i in range(3):
        rgb[..., i] = fill_hi[i] * (1 - t) + fill_lo[i] * t
    fill = Image.fromarray(rgb.clip(0, 255).astype(np.uint8), "RGB")
    wood = plate.convert("RGB")
    fill = Image.blend(fill, wood, body_mix)

    def shift(src: Image.Image, dx: int, dy: int) -> Image.Image:
        out = Image.new("L", src.size, 0)
        out.paste(src, (dx, dy))
        return out

    shadow = shift(mask, 2, 3).filter(ImageFilter.GaussianBlur(1.4))
    highlight = shift(mask, -1, -2).filter(ImageFilter.GaussianBlur(0.7))
    trench = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(5)), mask).filter(ImageFilter.GaussianBlur(0.4))

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    tr = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    tr.paste(rim, (0, 0), trench)
    tr.putalpha(trench.point(lambda p: int(p * 0.82)))
    layer = Image.alpha_composite(layer, tr)

    sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sh.paste((18, 10, 4), (0, 0), shadow)
    sh.putalpha(shadow.point(lambda p: int(p * 0.70)))
    layer = Image.alpha_composite(layer, sh)

    body = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    body.paste(fill, (0, 0), mask)
    body.putalpha(mask)
    layer = Image.alpha_composite(layer, body)

    hi_cut = ImageChops.multiply(highlight, mask)
    hg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hg.paste(hi if kind == "gold" else (90, 58, 30), (0, 0), hi_cut)
    hg.putalpha(hi_cut.point(lambda p: int(p * (0.48 if kind == "gold" else 0.30))))
    layer = Image.alpha_composite(layer, hg)

    out = Image.alpha_composite(plate, layer)

    # debug overlay
    dbg = out.copy()
    d = ImageDraw.Draw(dbg)
    d.rectangle((x0, y0, x1, y1), outline=(0, 255, 80, 180), width=2)
    d.rectangle((x, y, x + tw, y + th), outline=(255, 80, 80, 180), width=2)
    dbg.save(DBG / f"dbg-{text}.png")
    return out


def save(im: Image.Image, name: str) -> None:
    path = UI / name
    im.save(path, "PNG")
    im.save(DBG / name, "PNG")
    print("wrote", path, im.size, "aspect", round(im.width / im.height, 3))


def main() -> None:
    assert_glyphs("問道續緣開啟新的一途規留下重新")

    plaque = trim(chroma(Image.open(PLAQUE_RAW)))
    dark = trim(chroma(Image.open(SLIP_DARK_RAW)))
    gold_src = trim(chroma(Image.open(SLIP_GOLD_RAW)))
    if gold_src.width / max(1, gold_src.height) < 3.5:
        wa = np.array(dark).astype(np.float32)
        rgb = wa[..., :3]
        rgb[..., 0] = np.clip(rgb[..., 0] * 1.22 + 22, 0, 255)
        rgb[..., 1] = np.clip(rgb[..., 1] * 1.10 + 10, 0, 255)
        rgb[..., 2] = np.clip(rgb[..., 2] * 0.92, 0, 255)
        wa[..., :3] = rgb
        gold = Image.fromarray(wa.astype(np.uint8), "RGBA")
    else:
        gold = gold_src
    seal = trim(chroma(Image.open(SEAL_RAW)))

    plaque.save(DBG / "cut-plaque.png")
    dark.save(DBG / "cut-dark.png")
    gold.save(DBG / "cut-gold.png")
    seal.save(DBG / "cut-seal.png")
    print("cuts", plaque.size, dark.size, gold.size, seal.size)

    save(inlay(plaque, "問道", kind="gold", y_bias=0.50, track=0.14, start_px=260, field_dark=90, inset=0.16), "title-wordmark.png")
    save(inlay(gold, "續緣", kind="pale", y_bias=0.50, track=0.22, start_px=120, field_dark=170, inset=0.18), "slip-continue.png")
    save(inlay(dark, "開啟新的一途", kind="pale", y_bias=0.50, track=0.08, start_px=92, field_dark=140, inset=0.10), "slip-new-dark.png")
    save(inlay(gold, "開啟新的一途", kind="pale", y_bias=0.50, track=0.08, start_px=92, field_dark=170, inset=0.10), "slip-new-gold.png")
    save(inlay(dark, "留下", kind="pale", y_bias=0.50, track=0.28, start_px=110, field_dark=140, inset=0.22), "slip-keep.png")
    save(inlay(gold, "重新問道", kind="pale", y_bias=0.50, track=0.12, start_px=100, field_dark=170, inset=0.14), "slip-restart.png")
    # seal already has painted 規
    save(seal, "seal-rules.png")


if __name__ == "__main__":
    main()
