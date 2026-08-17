#!/usr/bin/env python3
"""Bake Traditional Chinese calligraphy into painted title chrome.

Never use Simplified-only display fonts (ZCOOL XiaoWei etc.) — they emit
tofu boxes for 問/續/緣/開/啟/規. WenKai + Noto Serif TC both cover zh-Hant.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path("/workspace")
UI = ROOT / "public" / "ui"
FONT_KAI = ROOT / "assets" / "fonts" / "LXGWWenKai-Medium.ttf"
FONT_SONG = ROOT / "assets" / "fonts" / "NotoSerifTC.ttf"
OUT_PREVIEW = ROOT / "screenshots" / "ui-art"
OUT_PREVIEW.mkdir(parents=True, exist_ok=True)

REQUIRED = "問道續緣開啟新的一途規留下重新棄途"


def load_font(path: Path, size: int, weight: int | None = None) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(path), size)
    if weight is not None:
        font.set_variation_by_axes([weight])
    return font


def assert_glyphs(path: Path, text: str, weight: int | None = None) -> None:
    font = load_font(path, 72, weight)
    missing_mask = np.array(font.getmask("\uFFFF"))
    bad: list[str] = []
    for ch in text:
        mask = np.array(font.getmask(ch))
        if mask.size == 0 or int(mask.max()) == 0:
            bad.append(ch)
            continue
        if mask.shape == missing_mask.shape and np.array_equal(mask, missing_mask):
            bad.append(ch)
    if bad:
        raise SystemExit(f"{path.name} missing glyphs: {' '.join(bad)}")


def text_size(font: ImageFont.FreeTypeFont, text: str, tracking: int) -> tuple[int, int]:
    dummy = Image.new("L", (8, 8))
    d = ImageDraw.Draw(dummy)
    widths, heights = [], []
    for ch in text:
        box = d.textbbox((0, 0), ch, font=font)
        widths.append(box[2] - box[0])
        heights.append(box[3] - box[1])
    w = sum(widths) + tracking * max(0, len(text) - 1)
    return w, (max(heights) if heights else 0)


def draw_tracked(draw: ImageDraw.ImageDraw, origin: tuple[int, int], text: str, font, fill, tracking: int):
    x, y = origin
    dummy = Image.new("L", (8, 8))
    m = ImageDraw.Draw(dummy)
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        box = m.textbbox((0, 0), ch, font=font)
        x += (box[2] - box[0]) + tracking


def glyph_mask(size: tuple[int, int], text: str, font, tracking: int, origin: tuple[int, int]) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw_tracked(draw, origin, text, font, 255, tracking)
    return mask


def gold_fill(size: tuple[int, int], cool: bool = False) -> Image.Image:
    w, h = size
    yy = np.linspace(0, 1, h)[:, None]
    xx = np.linspace(0, 1, w)[None, :]
    t = np.clip(0.35 * yy + 0.25 * xx + 0.09 * np.sin(xx * 9.5), 0, 1)
    if cool:
        r = 246 - t * 22
        g = 222 - t * 30
        b = 150 - t * 28
    else:
        r = 238 - t * 48
        g = 196 - t * 62
        b = 96 - t * 40
    return Image.fromarray(np.dstack([r, g, b]).astype(np.uint8), "RGB")


def ink_fill(size: tuple[int, int]) -> Image.Image:
    w, h = size
    yy = np.linspace(0, 1, h)[:, None]
    xx = np.linspace(0, 1, w)[None, :]
    t = 0.55 * yy + 0.2 * xx
    r = 46 - t * 16
    g = 28 - t * 10
    b = 14 - t * 6
    return Image.fromarray(np.dstack([r, g, b]).clip(0, 255).astype(np.uint8), "RGB")


def shift_mask(src: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new("L", src.size, 0)
    out.paste(src, (dx, dy))
    return out


def stamp(
    base: Image.Image,
    text: str,
    *,
    font_path: Path,
    px: int,
    tracking: int,
    kind: str,
    center: tuple[float, float] | None = None,
    y_nudge: int = 0,
    weight: int | None = None,
) -> Image.Image:
    plate = base.convert("RGBA")
    w, h = plate.size
    font = load_font(font_path, px, weight)
    tw, th = text_size(font, text, tracking)
    dummy = Image.new("L", (8, 8))
    box0 = ImageDraw.Draw(dummy).textbbox((0, 0), text[0], font=font)
    ascent = -box0[1]
    cx, cy = (0.50, 0.50) if center is None else center
    x = int(w * cx - tw / 2)
    y = int(h * cy - th / 2) - ascent + y_nudge

    mask = glyph_mask((w, h), text, font, tracking, (x, y))
    mask = mask.filter(ImageFilter.GaussianBlur(radius=0.35))

    if kind == "gold":
        fill = gold_fill((w, h))
        hi_rgb = (255, 236, 186)
        sh_rgb = (56, 32, 8)
        wood_mix = 0.08
        sh_a, hi_a = 0.72, 0.40
    elif kind == "pale-gold":
        fill = gold_fill((w, h), cool=True)
        hi_rgb = (255, 244, 200)
        sh_rgb = (18, 10, 4)
        wood_mix = 0.04
        sh_a, hi_a = 0.78, 0.34
    else:
        fill = ink_fill((w, h))
        hi_rgb = (92, 58, 28)
        sh_rgb = (14, 8, 4)
        wood_mix = 0.10
        sh_a, hi_a = 0.70, 0.28

    shadow = shift_mask(mask, 2, 3).filter(ImageFilter.GaussianBlur(1.2))
    highlight = shift_mask(mask, -1, -2).filter(ImageFilter.GaussianBlur(0.8))
    rim = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(3)), mask)

    wood = plate.convert("RGB")
    blended = Image.blend(fill, wood, wood_mix)

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    rim_rgba = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rim_rgba.paste((28, 16, 6), (0, 0), rim)
    rim_rgba.putalpha(rim.point(lambda p: int(p * 0.7)))
    layer = Image.alpha_composite(layer, rim_rgba)

    sh_rgba = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sh_rgba.paste(sh_rgb, (0, 0), shadow)
    sh_rgba.putalpha(shadow.point(lambda p: int(p * sh_a)))
    layer = Image.alpha_composite(layer, sh_rgba)

    body = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    body.paste(blended, (0, 0), mask)
    body.putalpha(mask)
    layer = Image.alpha_composite(layer, body)

    hi_cut = ImageChops.multiply(highlight, mask)
    hi_rgba = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hi_rgba.paste(hi_rgb, (0, 0), hi_cut)
    hi_rgba.putalpha(hi_cut.point(lambda p: int(p * hi_a)))
    layer = Image.alpha_composite(layer, hi_rgba)

    return Image.alpha_composite(plate, layer)


def save(im: Image.Image, name: str) -> Path:
    path = UI / name
    im.save(path, "PNG", optimize=True)
    im.save(OUT_PREVIEW / name, "PNG")
    print("wrote", path, im.size)
    return path


def main() -> None:
    if not FONT_KAI.exists():
        raise SystemExit(f"missing {FONT_KAI}")
    assert_glyphs(FONT_KAI, REQUIRED)
    if FONT_SONG.exists():
        assert_glyphs(FONT_SONG, REQUIRED, weight=700)

    plaque = Image.open(UI / "title-plaque.png")
    gold = Image.open(UI / "tablet-gold.png")
    dark = Image.open(UI / "tablet-dark.png")
    seal = Image.open(UI / "tablet-seal.png")

    title_sign = stamp(
        plaque,
        "問道",
        font_path=FONT_KAI,
        px=268,
        tracking=30,
        kind="gold",
        center=(0.50, 0.50),
        y_nudge=4,
    )
    save(title_sign, "title-wordmark.png")

    save(stamp(gold, "續緣", font_path=FONT_KAI, px=104, tracking=32, kind="ink", y_nudge=2), "slip-continue.png")
    save(
        stamp(dark, "開啟新的一途", font_path=FONT_KAI, px=76, tracking=8, kind="pale-gold", y_nudge=1),
        "slip-new-dark.png",
    )
    save(
        stamp(gold, "開啟新的一途", font_path=FONT_KAI, px=70, tracking=10, kind="ink", y_nudge=1),
        "slip-new-gold.png",
    )
    save(stamp(dark, "留下", font_path=FONT_KAI, px=84, tracking=36, kind="pale-gold", y_nudge=1), "slip-keep.png")
    save(stamp(gold, "重新問道", font_path=FONT_KAI, px=80, tracking=16, kind="ink", y_nudge=1), "slip-restart.png")
    save(stamp(seal, "規", font_path=FONT_KAI, px=128, tracking=0, kind="pale-gold", y_nudge=4), "seal-rules.png")


if __name__ == "__main__":
    main()
