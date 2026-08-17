#!/usr/bin/env python3
"""Paint full-body combat sprites. Never stamp portraits / busts."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

PUB = Path("/workspace/public/sprites")
W, H = 420, 760
NAMES = ["idle-1", "idle-2", "attack", "hurt"]


def canvas() -> Image.Image:
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def noise(im: Image.Image, amt=10, seed=3) -> Image.Image:
    a = np.asarray(im).astype(np.int16)
    rng = np.random.default_rng(seed)
    n = rng.integers(-amt, amt + 1, a.shape[:2], dtype=np.int16)
    a[:, :, :3] = (a[:, :, :3] + n[:, :, None]).clip(0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def shade(im: Image.Image, left=1.08, right=0.82) -> Image.Image:
    a = np.asarray(im).astype(np.float32)
    w = a.shape[1]
    ramp = np.linspace(left, right, w)[None, :, None]
    a[:, :, :3] *= ramp
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA")


def outline(im: Image.Image, color=(28, 20, 12, 230), width=3) -> Image.Image:
    alpha = im.split()[-1]
    ring = alpha.filter(ImageFilter.MaxFilter(width * 2 + 1))
    rim = ImageChops.subtract(ring, alpha)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    layer.paste(Image.new("RGBA", im.size, color), mask=rim)
    return Image.alpha_composite(layer, im)


def trim(im: Image.Image, pad=12) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def finish(im: Image.Image, seed: int) -> Image.Image:
    im = shade(im)
    im = noise(im, 8, seed)
    im = outline(im, color=(48, 34, 20, 240), width=4)
    # pale rim so the body reads on dark arenas
    alpha = im.split()[-1]
    ring = alpha.filter(ImageFilter.MaxFilter(9))
    rim = ImageChops.subtract(ring, alpha)
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    glow.paste(Image.new("RGBA", im.size, (236, 220, 186, 160)), mask=rim)
    im = Image.alpha_composite(glow, im)
    return trim(im)


def pose(im: Image.Image, kind: str) -> Image.Image:
    if kind == "idle-2":
        return im.rotate(2.4, resample=Image.Resampling.BICUBIC, expand=True)
    if kind == "attack":
        return im.rotate(-7, resample=Image.Resampling.BICUBIC, expand=True)
    if kind == "hurt":
        return ImageEnhance.Brightness(im).enhance(1.1).rotate(8, resample=Image.Resampling.BICUBIC, expand=True)
    return im


def sanxiu() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    cx = 210
    # legs / wraps
    d.polygon([(cx - 28, 470), (cx - 8, 470), (cx - 18, 700), (cx - 42, 700)], fill=(156, 118, 74, 255))
    d.polygon([(cx + 6, 470), (cx + 28, 470), (cx + 44, 700), (cx + 18, 700)], fill=(140, 104, 64, 255))
    for y in (520, 580, 640):
        d.rectangle([cx - 46, y, cx - 10, y + 14], fill=(140, 112, 70, 255))
        d.rectangle([cx + 10, y, cx + 48, y + 14], fill=(128, 102, 64, 255))
    # sandals
    d.ellipse([cx - 52, 692, cx - 8, 718], fill=(58, 40, 24, 255))
    d.ellipse([cx + 10, 692, cx + 56, 718], fill=(58, 40, 24, 255))
    # robe
    d.polygon(
        [(cx - 62, 250), (cx + 58, 248), (cx + 78, 490), (cx - 80, 492)],
        fill=(168, 122, 78, 255),
    )
    d.polygon(
        [(cx - 20, 250), (cx + 8, 250), (cx + 18, 470), (cx - 28, 472)],
        fill=(168, 132, 86, 255),
    )
    # patches
    d.polygon([(cx + 18, 320), (cx + 52, 310), (cx + 48, 370), (cx + 10, 360)], fill=(86, 58, 34, 255))
    d.polygon([(cx - 54, 360), (cx - 18, 350), (cx - 22, 410), (cx - 58, 400)], fill=(74, 52, 30, 255))
    # belt
    d.rectangle([cx - 58, 448, cx + 56, 468], fill=(48, 32, 18, 255))
    # arms
    d.polygon([(cx - 62, 270), (cx - 38, 280), (cx - 92, 430), (cx - 118, 418)], fill=(118, 82, 50, 255))
    d.polygon([(cx + 40, 268), (cx + 64, 278), (cx + 132, 400), (cx + 104, 418)], fill=(118, 82, 50, 255))
    # hands
    d.ellipse([cx - 128, 408, cx - 96, 442], fill=(196, 158, 118, 255))
    d.ellipse([cx + 118, 388, cx + 150, 422], fill=(196, 158, 118, 255))
    # sword
    d.polygon([(cx + 138, 250), (cx + 150, 248), (cx + 146, 430), (cx + 132, 428)], fill=(150, 148, 142, 255))
    d.polygon([(cx + 124, 418), (cx + 158, 416), (cx + 160, 436), (cx + 122, 438)], fill=(72, 48, 28, 255))
    # neck / head (SMALL)
    d.rectangle([cx - 12, 198, cx + 14, 228], fill=(198, 160, 120, 255))
    d.ellipse([cx - 28, 148, cx + 30, 214], fill=(206, 168, 126, 255))
    d.ellipse([cx - 10, 176, cx + 2, 190], fill=(72, 42, 32, 255))  # eye
    d.ellipse([cx + 10, 176, cx + 20, 188], fill=(72, 42, 32, 255))
    d.arc([cx - 8, 188, cx + 16, 206], 20, 160, fill=(90, 50, 36, 255), width=2)
    # hair under hat
    d.polygon([(cx - 26, 168), (cx - 8, 148), (cx + 22, 150), (cx + 28, 172), (cx + 8, 158), (cx - 16, 160)], fill=(36, 26, 18, 255))
    # conical straw hat — the readable silhouette
    d.polygon([(cx - 118, 168), (cx + 122, 166), (cx + 18, 92), (cx - 10, 94)], fill=(196, 154, 78, 255))
    d.polygon([(cx - 22, 96), (cx + 28, 94), (cx + 16, 70), (cx - 8, 72)], fill=(168, 126, 58, 255))
    d.line([(cx - 90, 156), (cx + 94, 154)], fill=(140, 100, 44, 255), width=3)
    d.line([(cx - 50, 136), (cx + 56, 134)], fill=(140, 100, 44, 255), width=2)
    return finish(im, 11)


def jianbing() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    cx = 200
    # boots
    d.polygon([(cx - 48, 680), (cx - 8, 678), (cx - 4, 730), (cx - 62, 732)], fill=(46, 34, 24, 255))
    d.polygon([(cx + 10, 678), (cx + 50, 680), (cx + 66, 732), (cx + 8, 730)], fill=(46, 34, 24, 255))
    # greaves / legs
    d.polygon([(cx - 40, 470), (cx - 10, 468), (cx - 6, 686), (cx - 48, 688)], fill=(92, 70, 44, 255))
    d.polygon([(cx + 12, 468), (cx + 42, 470), (cx + 52, 688), (cx + 10, 686)], fill=(80, 60, 38, 255))
    # tassets
    d.polygon([(cx - 70, 430), (cx + 68, 428), (cx + 58, 490), (cx - 62, 492)], fill=(110, 78, 42, 255))
    # torso armor
    d.polygon([(cx - 78, 230), (cx + 76, 228), (cx + 70, 440), (cx - 72, 442)], fill=(128, 92, 48, 255))
    d.polygon([(cx - 28, 250), (cx + 30, 248), (cx + 24, 420), (cx - 22, 422)], fill=(168, 128, 70, 255))
    # cracks
    d.line([(cx - 10, 270), (cx + 4, 390)], fill=(60, 40, 22, 255), width=3)
    d.line([(cx + 18, 300), (cx + 8, 400)], fill=(60, 40, 22, 255), width=2)
    # cloak
    d.polygon([(cx + 40, 220), (cx + 90, 240), (cx + 130, 560), (cx + 70, 540), (cx + 58, 300)], fill=(58, 36, 28, 255))
    # arms
    d.polygon([(cx - 78, 250), (cx - 50, 270), (cx - 96, 430), (cx - 128, 410)], fill=(118, 84, 46, 255))
    d.polygon([(cx + 52, 250), (cx + 80, 268), (cx + 40, 400), (cx + 12, 388)], fill=(118, 84, 46, 255))
    # gauntlets
    d.ellipse([cx - 140, 396, cx - 102, 436], fill=(90, 68, 40, 255))
    d.ellipse([cx + 4, 376, cx + 44, 416], fill=(90, 68, 40, 255))
    # sword two-hand, close to body
    d.polygon([(cx - 20, 200), (cx - 8, 196), (cx + 8, 520), (cx - 6, 524)], fill=(164, 158, 148, 255))
    d.polygon([(cx - 36, 500), (cx + 18, 496), (cx + 20, 518), (cx - 38, 522)], fill=(70, 48, 28, 255))
    # neck / small head
    d.rectangle([cx - 14, 196, cx + 16, 228], fill=(176, 140, 108, 255))
    d.ellipse([cx - 30, 148, cx + 32, 208], fill=(186, 148, 112, 255))
    d.ellipse([cx - 12, 172, cx - 2, 184], fill=(40, 24, 16, 255))
    d.ellipse([cx + 10, 172, cx + 20, 184], fill=(40, 24, 16, 255))
    # helmet
    d.polygon([(cx - 48, 168), (cx + 50, 166), (cx + 36, 118), (cx - 32, 120)], fill=(118, 90, 48, 255))
    d.polygon([(cx - 16, 120), (cx + 20, 118), (cx + 12, 86), (cx - 8, 88)], fill=(150, 118, 62, 255))
    d.rectangle([cx - 44, 160, cx + 46, 176], fill=(72, 52, 28, 255))
    return finish(im, 17)


def neimen() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    cx = 210
    # shoes
    d.ellipse([cx - 40, 700, cx - 4, 728], fill=(20, 16, 14, 255))
    d.ellipse([cx + 8, 700, cx + 46, 728], fill=(20, 16, 14, 255))
    # robe column
    d.polygon([(cx - 70, 250), (cx + 72, 248), (cx + 58, 710), (cx - 54, 712)], fill=(48, 56, 86, 255))
    d.polygon([(cx - 16, 260), (cx + 20, 258), (cx + 14, 700), (cx - 10, 702)], fill=(78, 88, 120, 255))
    # gold badge
    d.rounded_rectangle([cx - 22, 320, cx + 24, 380], radius=4, fill=(196, 158, 72, 255))
    d.rectangle([cx - 10, 332, cx + 12, 368], fill=(36, 28, 16, 255))
    # sleeves
    d.polygon([(cx - 70, 260), (cx - 40, 280), (cx - 88, 460), (cx - 120, 440)], fill=(24, 28, 44, 255))
    d.polygon([(cx + 42, 258), (cx + 72, 276), (cx + 128, 430), (cx + 96, 450)], fill=(24, 28, 44, 255))
    # tablet in hands
    d.rounded_rectangle([cx + 86, 390, cx + 138, 500], radius=3, fill=(210, 188, 140, 255))
    d.line([(cx + 96, 410), (cx + 128, 410)], fill=(80, 60, 36, 255), width=2)
    d.line([(cx + 96, 430), (cx + 128, 430)], fill=(80, 60, 36, 255), width=2)
    # neck / small head
    d.rectangle([cx - 12, 200, cx + 14, 236], fill=(198, 166, 128, 255))
    d.ellipse([cx - 26, 154, cx + 28, 212], fill=(206, 172, 132, 255))
    d.ellipse([cx - 10, 176, cx - 2, 186], fill=(30, 22, 16, 255))
    d.ellipse([cx + 8, 176, cx + 16, 186], fill=(30, 22, 16, 255))
    d.arc([cx - 6, 188, cx + 14, 202], 15, 165, fill=(80, 48, 36, 255), width=2)
    # tall official hat
    d.rectangle([cx - 22, 70, cx + 24, 168], fill=(12, 12, 16, 255))
    d.polygon([(cx - 22, 110), (cx - 108, 150), (cx - 96, 168), (cx - 22, 148)], fill=(16, 16, 20, 255))
    d.polygon([(cx + 24, 110), (cx + 110, 148), (cx + 98, 166), (cx + 24, 148)], fill=(16, 16, 20, 255))
    d.rectangle([cx - 26, 62, cx + 28, 78], fill=(196, 158, 72, 255))
    return finish(im, 23)


def xinmo() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    cx = 210
    ink = (22, 16, 28, 255)
    glow = (92, 28, 48, 255)
    # dripping legs
    d.polygon([(cx - 36, 460), (cx - 8, 458), (cx - 20, 720), (cx - 70, 700), (cx - 40, 620)], fill=ink)
    d.polygon([(cx + 10, 458), (cx + 40, 460), (cx + 80, 690), (cx + 24, 720)], fill=ink)
    d.ellipse([cx - 80, 680, cx - 30, 740], fill=ink)
    d.ellipse([cx + 10, 700, cx + 70, 748], fill=ink)
    # torso blot
    d.ellipse([cx - 90, 220, cx + 96, 500], fill=ink)
    d.ellipse([cx - 40, 260, cx + 36, 420], fill=glow)
    # long left arm drip
    d.polygon([(cx - 80, 280), (cx - 50, 300), (cx - 160, 520), (cx - 190, 500), (cx - 120, 360)], fill=ink)
    d.ellipse([cx - 210, 490, cx - 150, 560], fill=ink)
    # right arm
    d.polygon([(cx + 70, 280), (cx + 100, 300), (cx + 150, 470), (cx + 110, 490)], fill=ink)
    # small hollow face
    d.ellipse([cx - 28, 150, cx + 32, 220], fill=(48, 30, 40, 255))
    d.ellipse([cx - 16, 172, cx - 4, 188], fill=(210, 70, 80, 255))
    d.ellipse([cx + 10, 172, cx + 22, 188], fill=(210, 70, 80, 255))
    d.polygon([(cx - 6, 196), (cx + 10, 196), (cx + 4, 214)], fill=(12, 8, 10, 255))
    # smoke crown
    d.ellipse([cx - 50, 100, cx + 10, 168], fill=(30, 20, 36, 200))
    d.ellipse([cx + 4, 88, cx + 58, 160], fill=(26, 16, 32, 180))
    return finish(im, 29)


def wuji() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    cx = 210
    gauze = (220, 224, 228, 255)
    shade_g = (176, 184, 192, 255)
    # trailing hem
    d.polygon([(cx - 70, 430), (cx + 80, 428), (cx + 130, 730), (cx - 40, 732), (cx - 110, 620)], fill=gauze)
    d.polygon([(cx + 40, 480), (cx + 90, 470), (cx + 170, 700), (cx + 100, 710)], fill=shade_g)
    # torso robe
    d.polygon([(cx - 58, 240), (cx + 62, 238), (cx + 78, 450), (cx - 70, 452)], fill=gauze)
    # sleeves
    d.polygon([(cx - 58, 250), (cx - 30, 270), (cx - 140, 430), (cx - 170, 400)], fill=gauze)
    d.polygon([(cx + 40, 250), (cx + 68, 268), (cx + 150, 390), (cx + 118, 410)], fill=shade_g)
    # sash
    d.polygon([(cx - 20, 430), (cx + 24, 428), (cx + 80, 560), (cx + 50, 568)], fill=(200, 206, 214, 255))
    # neck / small pale face
    d.rectangle([cx - 10, 198, cx + 14, 232], fill=(232, 220, 210, 255))
    d.ellipse([cx - 24, 154, cx + 28, 210], fill=(236, 224, 214, 255))
    d.ellipse([cx - 10, 176, cx - 2, 184], fill=(40, 36, 48, 255))
    d.ellipse([cx + 8, 176, cx + 16, 184], fill=(40, 36, 48, 255))
    # black hair
    d.polygon([(cx - 26, 176), (cx - 8, 148), (cx + 26, 150), (cx + 34, 200), (cx + 10, 168), (cx - 16, 172)], fill=(16, 14, 18, 255))
    # veil
    d.polygon([(cx - 8, 150), (cx + 40, 148), (cx + 90, 360), (cx + 50, 370), (cx + 20, 200)], fill=(230, 234, 236, 200))
    return finish(im, 31)


def mumei() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    cx = 210
    bark = (86, 58, 34, 255)
    moss = (62, 82, 40, 255)
    leaf = (142, 86, 36, 255)
    # roots
    d.polygon([(cx - 20, 520), (cx + 24, 518), (cx + 160, 740), (cx + 90, 720), (cx + 10, 700), (cx - 80, 724), (cx - 150, 738)], fill=bark)
    d.polygon([(cx - 10, 540), (cx + 16, 538), (cx - 40, 740), (cx - 90, 730)], fill=(64, 42, 24, 255))
    # trunk body
    d.polygon([(cx - 48, 250), (cx + 52, 248), (cx + 40, 540), (cx - 36, 542)], fill=bark)
    d.polygon([(cx - 12, 260), (cx + 16, 258), (cx + 10, 520), (cx - 8, 522)], fill=(120, 84, 48, 255))
    # branch arms
    d.polygon([(cx + 40, 300), (cx + 70, 290), (cx + 170, 220), (cx + 186, 248), (cx + 80, 360)], fill=bark)
    d.polygon([(cx - 40, 320), (cx - 70, 310), (cx - 170, 280), (cx - 180, 308), (cx - 70, 380)], fill=bark)
    # leaves on arms
    d.ellipse([cx + 150, 190, cx + 200, 250], fill=leaf)
    d.ellipse([cx + 120, 210, cx + 168, 260], fill=moss)
    d.ellipse([cx - 200, 250, cx - 150, 310], fill=leaf)
    d.ellipse([cx - 170, 270, cx - 124, 320], fill=moss)
    # canopy
    d.ellipse([cx - 130, 40, cx + 40, 220], fill=moss)
    d.ellipse([cx - 20, 20, cx + 150, 200], fill=leaf)
    d.ellipse([cx - 70, 10, cx + 80, 150], fill=(96, 64, 30, 255))
    # SMALL wooden face in trunk
    d.ellipse([cx - 22, 300, cx + 26, 370], fill=(58, 38, 22, 255))
    d.ellipse([cx - 12, 322, cx - 2, 336], fill=(20, 12, 8, 255))
    d.ellipse([cx + 8, 322, cx + 18, 336], fill=(20, 12, 8, 255))
    d.arc([cx - 8, 338, cx + 16, 358], 20, 160, fill=(20, 12, 8, 255), width=2)
    return finish(im, 37)


def save(ident: str, base: Image.Image) -> None:
    dest = PUB / ident
    dest.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        frame = pose(base, name)
        frame = trim(frame)
        frame.save(dest / f"{name}.png")
        print(ident, name, frame.size)


def main() -> None:
    save("sanxiu", sanxiu())
    save("jianbing", jianbing())
    save("neimen", neimen())
    save("xinmo", xinmo())
    save("wuji", wuji())
    save("mumei", mumei())


if __name__ == "__main__":
    main()
