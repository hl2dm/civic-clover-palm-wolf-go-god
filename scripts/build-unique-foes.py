#!/usr/bin/env python3
"""Build unique full-body foe sprites + missing portraits from ink-wash sources."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path("/workspace/public")
SPR = ROOT / "sprites"
POR = ROOT / "portraits"

def load(p: Path) -> Image.Image:
    return Image.open(p).convert("RGBA")

def paper_matte(im: Image.Image) -> Image.Image:
    arr = np.asarray(im.convert("RGB")).astype(np.float32)
    h, w, _ = arr.shape
    corners = np.concatenate([
        arr[0:8, 0:8].reshape(-1, 3),
        arr[0:8, -8:].reshape(-1, 3),
        arr[-8:, 0:8].reshape(-1, 3),
        arr[-8:, -8:].reshape(-1, 3),
    ])
    bg = corners.mean(axis=0)
    dist = np.linalg.norm(arr - bg, axis=2)
    sat = arr.max(axis=2) - arr.min(axis=2)
    lum = arr.mean(axis=2)
    mask = (dist > 28) | (sat > 22) | (lum < 70)
    # keep largest component touching the center column
    alpha = (mask.astype(np.uint8) * 255)
    img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(1.2))
    a = np.asarray(img)
    a = np.where(a > 40, np.clip((a - 20) * 1.25, 0, 255), 0).astype(np.uint8)
    rgba = np.asarray(im.convert("RGBA")).copy()
    rgba[:, :, 3] = a
    out = Image.fromarray(rgba, "RGBA")
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    return out

def sample_colors(im: Image.Image, n=6):
    small = im.convert("RGB").resize((48, 48), Image.Resampling.BOX)
    arr = np.asarray(small).reshape(-1, 3)
    # ignore near-white paper
    keep = arr.mean(axis=1) < 210
    arr = arr[keep] if keep.any() else arr
    idx = np.linspace(0, len(arr) - 1, n).astype(int)
    return [tuple(int(x) for x in arr[i]) for i in idx]

def ink_body(w: int, h: int, colors, kind: str) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c0, c1, c2 = colors[0], colors[min(1, len(colors)-1)], colors[min(2, len(colors)-1)]
    cx = w // 2
    if kind == "sanxiu":
        d.ellipse([cx-22, h-28, cx+26, h-8], fill=(*c2, 80))
        d.polygon([(cx-18, 210), (cx+22, 208), (cx+28, 390), (cx-26, 392)], fill=(*c1, 235))
        d.polygon([(cx-8, 150), (cx+16, 148), (cx+18, 220), (cx-12, 222)], fill=(*c0, 240))
        d.ellipse([cx-20, 108, cx+22, 168], fill=(*c0, 255))
        d.polygon([(cx-36, 118), (cx+38, 116), (cx+18, 108), (cx-16, 110)], fill=(*c2, 245))  # straw hat
        d.line([(cx+20, 230), (cx+34, 360)], fill=(*c2, 255), width=4)
    elif kind == "neimen":
        d.polygon([(cx-26, 200), (cx+30, 198), (cx+34, 400), (cx-32, 402)], fill=(*c1, 240))
        d.polygon([(cx-16, 140), (cx+20, 138), (cx+22, 210), (cx-18, 212)], fill=(*c0, 245))
        d.ellipse([cx-18, 112, cx+20, 164], fill=(*c0, 255))
        d.rectangle([cx-10, 78, cx+12, 118], fill=(*c2, 255))  # guan hat
        d.polygon([(cx-16, 118), (cx+18, 118), (cx+8, 108), (cx-6, 108)], fill=(*c2, 255))
        d.line([(cx+24, 210), (cx+28, 330)], fill=(40, 36, 30, 255), width=6)
    elif kind == "xinmo":
        for i, rad in enumerate((90, 70, 50)):
            d.ellipse([cx-rad, 140-i*8, cx+rad+10, 420+i*6], fill=(*c0, 50 + i*30))
        d.polygon([(cx-20, 170), (cx+24, 166), (cx+40, 390), (cx-36, 400)], fill=(*c1, 160))
        d.ellipse([cx-22, 118, cx+24, 178], fill=(*c2, 200))
        d.ellipse([cx-8, 142, cx-2, 150], fill=(160, 40, 36, 255))
        d.ellipse([cx+8, 142, cx+14, 150], fill=(160, 40, 36, 255))
    elif kind == "mumei":
        d.polygon([(cx-24, 210), (cx+26, 208), (cx+20, 400), (cx-18, 402)], fill=(*c1, 240))
        d.polygon([(cx-14, 160), (cx+18, 158), (cx+16, 220), (cx-16, 222)], fill=(*c0, 245))
        d.ellipse([cx-20, 118, cx+22, 172], fill=(*c0, 255))
        d.polygon([(cx-8, 90), (cx, 128), (cx+10, 92)], fill=(*c2, 230))
        d.polygon([(cx+12, 96), (cx+18, 130), (cx+26, 100)], fill=(*c2, 200))
    elif kind == "zhiren":
        d.polygon([(cx-16, 200), (cx+20, 198), (cx+18, 390), (cx-14, 392)], fill=(*c0, 230))
        d.polygon([(cx-10, 150), (cx+14, 148), (cx+12, 210), (cx-8, 212)], fill=(*c1, 235))
        d.ellipse([cx-14, 118, cx+16, 160], fill=(*c0, 245))
        d.rectangle([cx-12, 124, cx+14, 128], fill=(*c2, 180))
    elif kind == "wuji":
        d.ellipse([cx-50, 300, cx+56, 430], fill=(*c0, 40))
        d.polygon([(cx-30, 190), (cx+34, 188), (cx+48, 400), (cx-44, 402)], fill=(*c1, 180))
        d.polygon([(cx-14, 150), (cx+18, 148), (cx+16, 210), (cx-16, 212)], fill=(*c0, 220))
        d.ellipse([cx-18, 112, cx+20, 166], fill=(*c0, 240))
    elif kind == "jianbing":
        d.polygon([(cx-28, 200), (cx+30, 198), (cx+32, 400), (cx-30, 402)], fill=(*c1, 240))
        d.polygon([(cx-20, 150), (cx+22, 148), (cx+24, 214), (cx-22, 216)], fill=(*c0, 245))
        d.ellipse([cx-18, 114, cx+20, 166], fill=(*c0, 255))
        d.polygon([(cx+18, 210), (cx+26, 206), (cx+22, 360), (cx+16, 360)], fill=(*c2, 255))
    elif kind == "huxian":
        d.polygon([(cx-24, 200), (cx+26, 198), (cx+30, 392), (cx-28, 394)], fill=(*c1, 235))
        d.polygon([(cx-14, 150), (cx+18, 148), (cx+16, 212), (cx-16, 214)], fill=(*c0, 245))
        d.ellipse([cx-18, 112, cx+20, 164], fill=(*c0, 255))
        d.polygon([(cx-22, 118), (cx-8, 90), (cx-4, 124)], fill=(*c2, 240))
        d.polygon([(cx+6, 122), (cx+20, 88), (cx+22, 124)], fill=(*c2, 240))
        d.pieslice([cx-48, 300, cx-4, 400], 200, 340, fill=(*c2, 200))
        d.pieslice([cx-10, 310, cx+36, 410], 200, 340, fill=(*c1, 190))
        d.pieslice([cx+8, 300, cx+52, 400], 210, 350, fill=(*c2, 180))
    return im.filter(ImageFilter.GaussianBlur(0.6))

def place_head(body: Image.Image, head: Image.Image, cy=128, scale=0.42) -> Image.Image:
    out = body.copy()
    hw = int(out.width * scale)
    hh = int(head.height * (hw / max(1, head.width)))
    hd = head.resize((hw, hh), Image.Resampling.LANCZOS)
    x = (out.width - hw) // 2
    y = cy - hh // 2
    out.alpha_composite(hd, (x, max(0, y)))
    return out

def pose(im: Image.Image, kind: str) -> Image.Image:
    w, h = im.size
    if kind == "idle2":
        return im.rotate(1.6, resample=Image.Resampling.BICUBIC, expand=False)
    if kind == "attack":
        return im.rotate(-7, resample=Image.Resampling.BICUBIC, expand=False)
    if kind == "hurt":
        faded = ImageEnhance.Brightness(im).enhance(1.12)
        return faded.rotate(6, resample=Image.Resampling.BICUBIC, expand=False)
    return im

def fit_canvas(im: Image.Image, w=380, h=700) -> Image.Image:
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    im = ImageOps.contain(im, (w - 24, h - 20))
    x = (w - im.width) // 2
    y = h - im.height - 8
    canvas.alpha_composite(im, (x, y))
    return canvas

def save_set(name: str, idle: Image.Image):
    d = SPR / name
    d.mkdir(parents=True, exist_ok=True)
    fit_canvas(idle).save(d / "idle-1.png")
    fit_canvas(pose(idle, "idle2")).save(d / "idle-2.png")
    fit_canvas(pose(idle, "attack")).save(d / "attack.png")
    fit_canvas(pose(idle, "hurt")).save(d / "hurt.png")
    print("wrote", d)

def portrait_from(src: Image.Image, out: Path, boost=1.0):
    im = src.convert("RGB")
    im = ImageEnhance.Color(im).enhance(1.05)
    im = ImageEnhance.Contrast(im).enhance(boost)
    im = im.resize((720, 960), Image.Resampling.LANCZOS)
    im.save(out, quality=90)
    print("portrait", out)

def main():
    yeshou = load(SPR / "yeshou" / "idle-1.png")
    zhuji = load(SPR / "zhuji" / "idle-1.png")
    jindan = load(SPR / "jindan" / "idle-1.png")
    shikui = load(SPR / "shikui" / "idle-1.png")
    shanxiao = load(SPR / "shanxiao" / "idle-1.png")
    lingshe = load(SPR / "lingshe" / "idle-1.png")

    heads = {
        "mumei": paper_matte(load(POR / "mumei.jpg")),
        "zhiren": paper_matte(load(POR / "zhiren.jpg")),
        "wuji": paper_matte(load(POR / "wuji.jpg")),
        "jianbing": paper_matte(load(POR / "jianbing.jpg")),
        "huxian": paper_matte(load(POR / "huxian.jpg")),
        "yeshou": paper_matte(load(POR / "yeshou.jpg")),
        "zhuji": paper_matte(load(POR / "zhuji.jpg")),
        "jindan": paper_matte(load(POR / "jindan.jpg")),
    }

    # unique constructed foes
    san = ink_body(380, 700, sample_colors(yeshou), "sanxiu")
    san = place_head(san, heads["yeshou"], cy=138, scale=0.38)
    save_set("sanxiu", san)
    portrait_from(heads["yeshou"].convert("RGBA"), POR / "sanxiu.jpg", 0.95)

    nei = ink_body(380, 700, sample_colors(zhuji), "neimen")
    nei = place_head(nei, heads["zhuji"], cy=132, scale=0.36)
    save_set("neimen", nei)
    portrait_from(heads["zhuji"].convert("RGBA"), POR / "neimen.jpg", 1.05)

    xm = ink_body(380, 700, [(40, 12, 16), (90, 20, 28), (20, 8, 10)], "xinmo")
    xm = place_head(xm, ImageEnhance.Color(heads["jindan"]).enhance(0.4), cy=148, scale=0.4)
    xm = ImageEnhance.Color(xm).enhance(0.55)
    save_set("xinmo", xm)
    portrait_from(heads["jindan"].convert("RGBA"), POR / "xinmo.jpg", 0.8)

    mu = ink_body(380, 700, sample_colors(heads["mumei"]), "mumei")
    mu = place_head(mu, heads["mumei"], cy=136, scale=0.46)
    save_set("mumei", mu)

    zr = ink_body(380, 700, sample_colors(heads["zhiren"]), "zhiren")
    zr = place_head(zr, heads["zhiren"], cy=132, scale=0.4)
    save_set("zhiren", zr)

    wj = ink_body(380, 700, sample_colors(heads["wuji"]), "wuji")
    wj = place_head(wj, heads["wuji"], cy=134, scale=0.42)
    save_set("wuji", wj)

    jb = ink_body(380, 700, sample_colors(heads["jianbing"]), "jianbing")
    jb = place_head(jb, heads["jianbing"], cy=134, scale=0.4)
    save_set("jianbing", jb)

    hx = ink_body(380, 700, sample_colors(heads["huxian"]), "huxian")
    hx = place_head(hx, heads["huxian"], cy=132, scale=0.42)
    save_set("huxian", hx)

if __name__ == "__main__":
    main()
