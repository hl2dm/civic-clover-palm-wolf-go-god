#!/usr/bin/env python3
"""Paint 傳承 onto the existing oval wood slip so it matches 留下 / 續緣."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = Path("/workspace/public/ui/slip-keep.png")
OUT = Path("/workspace/public/ui/slip-heritage.png")
FONT = Path("/workspace/public/fonts/MaShanZheng-Regular.ttf")


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    # sample wood from just above the old glyphs
    patch = im.crop((int(w * 0.28), int(h * 0.34), int(w * 0.72), int(h * 0.42)))
    patch = patch.resize((int(w * 0.62), int(h * 0.34)), Image.Resampling.BICUBIC)
    patch = patch.filter(ImageFilter.GaussianBlur(1.2))
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    layer.paste(patch, (int(w * 0.19), int(h * 0.33)))
    # fade patch edges
    mask = Image.new("L", patch.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, *patch.size), radius=int(h * 0.08), fill=235)
    mask = mask.filter(ImageFilter.GaussianBlur(10))
    im.paste(patch, (int(w * 0.19), int(h * 0.33)), mask)

    draw = ImageDraw.Draw(im)
    font = ImageFont.truetype(str(FONT), size=int(h * 0.28))
    text = "传承"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) / 2 - bbox[0]
    y = h * 0.40 - th / 2 - bbox[1]
    # soft shadow then cream glyph
    draw.text((x + 2, y + 3), text, font=font, fill=(40, 28, 14, 160))
    draw.text((x, y), text, font=font, fill=(244, 228, 186, 255))
    im.save(OUT, "PNG")
    print(f"wrote {OUT} {im.size}")


if __name__ == "__main__":
    main()
