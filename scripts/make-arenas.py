#!/usr/bin/env python3
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path("/workspace/public")


def crop16x9(src: Path, top_frac: float, size=(1920, 1080)) -> Image.Image:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    tw, th = size
    # take a wide window from the painting
    window_h = int(h * 0.58)
    window_w = min(w, int(window_h * tw / th))
    window_h = int(window_w * th / tw)
    left = (w - window_w) // 2
    top = max(0, min(h - window_h, int(h * top_frac)))
    return im.crop((left, top, left + window_w, top + window_h)).resize(size, Image.Resampling.LANCZOS)


def grade(im: Image.Image, brightness: float, color: float, contrast: float) -> Image.Image:
    im = ImageEnhance.Brightness(im).enhance(brightness)
    im = ImageEnhance.Color(im).enhance(color)
    return ImageEnhance.Contrast(im).enhance(contrast)


def vignette(im: Image.Image, strength=0.55) -> Image.Image:
    w, h = im.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(180):
        a = int((180 - i) / 180 * 255 * strength)
        d.rectangle([i, 0, i + 1, h], fill=(0, 0, 0, a))
        d.rectangle([w - 1 - i, 0, w - i, h], fill=(0, 0, 0, a))
    for i in range(110):
        a = int((110 - i) / 110 * 255 * (strength * 0.85))
        d.rectangle([0, i, w, i + 1], fill=(0, 0, 0, a))
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")


def cinnabar_wash(im: Image.Image) -> Image.Image:
    dark = grade(im, 0.48, 0.55, 1.12)
    wash = Image.new("RGB", dark.size, (92, 28, 24))
    return Image.blend(dark, wash, 0.18)


def main() -> None:
    src = ROOT / "combat-bg.jpg"
    act1 = vignette(grade(crop16x9(src, 0.28), 0.86, 0.88, 1.05), 0.42)
    act2 = vignette(cinnabar_wash(crop16x9(src, 0.40)), 0.6)
    act1.save(ROOT / "arena-qingming.jpg", quality=90)
    act2.save(ROOT / "arena-jindan.jpg", quality=90)
    print("ok", act1.size, (ROOT / "arena-qingming.jpg").stat().st_size)


if __name__ == "__main__":
    main()
