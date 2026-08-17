#!/usr/bin/env python3
"""Unique heritage icons + a readable 傳承 slip. No reused portraits."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path("/workspace/public")
N = 256


def load_rgb(path: Path, size: tuple[int, int] | None = None) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    if size:
        im = im.resize(size, Image.Resampling.LANCZOS)
    return np.asarray(im).astype(np.float32)


GRAINS = [
    load_rgb(p, (N, N))
    for p in (
        ROOT / "combat-bg.jpg",
        ROOT / "arena-qingming.jpg",
        ROOT / "scenes" / "shop.jpg",
        ROOT / "scenes" / "events" / "danfang.jpg",
        ROOT / "scenes" / "events" / "tiancai.jpg",
        ROOT / "scenes" / "events" / "lingquan.jpg",
        ROOT / "scenes" / "events" / "dongfu.jpg",
        ROOT / "title-bg.jpg",
    )
    if p.exists()
]


def grain(i: int, contrast=1.12) -> np.ndarray:
    g = GRAINS[i % len(GRAINS)]
    return np.clip((g - 128) * contrast + 128, 0, 255)


def disk(yy, xx, cx, cy, rx, ry=None) -> np.ndarray:
    ry = rx if ry is None else ry
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2


def body(d, soft=0.1) -> np.ndarray:
    return np.clip((1 - d) / soft, 0, 1)


def stamp(base, mask, color, tex, mix=0.4) -> None:
    m = np.clip(mask, 0, 1)[..., None]
    col = np.asarray(color, dtype=np.float32)
    painted = col * (1 - mix) + tex * mix
    base[..., :3] = base[..., :3] * (1 - m) + painted * m
    base[..., 3] = np.maximum(base[..., 3], np.clip(mask, 0, 1) * 255)


def rim(base, mask, color, width=0.04) -> None:
    edge = np.clip((mask > 0.18).astype(np.float32) - (mask > 0.18 + width).astype(np.float32), 0, 1)
    stamp(base, edge * 0.9, color, grain(0, 0.7), mix=0.18)


def highlight(base, mask, yy, xx, hx, hy, color=(240, 230, 200), r=18) -> None:
    h = np.exp(-(((xx - hx) ** 2 + (yy - hy) ** 2) / (2 * r * r))) * mask
    stamp(base, h * 0.5, color, grain(0, 0.5), mix=0.1)


def canvas() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    a = np.zeros((N, N, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:N, 0:N]
    return a, yy.astype(np.float32), xx.astype(np.float32)


def save(a: np.ndarray, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    paper = grain(0, 0.7)
    out = np.zeros((N, N, 4), dtype=np.float32)
    out[..., :3] = paper * 0.22 + np.array([22, 16, 10])
    out[..., 3] = 255
    alpha = (a[..., 3:] / 255.0)
    out[..., :3] = out[..., :3] * (1 - alpha) + a[..., :3] * alpha
    out[..., 3] = 255
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").convert("RGB").save(dest, quality=92)
    print("wrote", dest)


def incense_houtu():
    a, yy, xx = canvas()
    m = body(disk(yy, xx, 128, 148, 78, 42), 0.1)
    stamp(a, m, (132, 96, 48), grain(6), 0.5)
    strata = np.clip(np.sin(yy * 0.18) * 0.4, 0, 1) * m
    stamp(a, strata, (90, 64, 32), grain(6), 0.25)
    peak = body(disk(yy, xx, 128, 108, 36, 48), 0.12)
    stamp(a, peak, (148, 118, 70), grain(7), 0.4)
    moss = body(disk(yy, xx, 118, 92, 14, 10), 0.2)
    stamp(a, moss, (70, 96, 52), grain(5), 0.3)
    rim(a, np.clip(m + peak, 0, 1), (200, 170, 100))
    return a


def incense_nangzhong():
    a, yy, xx = canvas()
    bag = body(disk(yy, xx, 128, 150, 64, 54), 0.1)
    neck = body(disk(yy, xx, 128, 98, 24, 16), 0.15)
    m = np.clip(bag + neck, 0, 1)
    stamp(a, m, (156, 92, 40), grain(2), 0.42)
    coin1 = body(disk(yy, xx, 102, 176, 16, 16), 0.2)
    coin2 = body(disk(yy, xx, 148, 182, 14, 14), 0.2)
    stamp(a, coin1, (196, 150, 48), grain(3), 0.35)
    stamp(a, coin2, (186, 140, 40), grain(3), 0.35)
    hole = body(disk(yy, xx, 102, 176, 4, 4), 0.4)
    stamp(a, hole, (80, 50, 20), grain(3), 0.1)
    cord = body(disk(yy, xx, 128, 92, 28, 6), 0.2)
    stamp(a, cord, (70, 48, 28), grain(2), 0.25)
    rim(a, m, (220, 176, 90))
    highlight(a, m, yy, xx, 108, 140, (230, 190, 120), 16)
    return a


def incense_danyuan():
    a, yy, xx = canvas()
    body_m = body(disk(yy, xx, 128, 150, 46, 56), 0.1)
    neck = body(disk(yy, xx, 128, 92, 16, 22), 0.15)
    lid = body(disk(yy, xx, 128, 70, 20, 10), 0.2)
    m = np.clip(body_m + neck + lid, 0, 1)
    stamp(a, m, (86, 118, 92), grain(5), 0.4)
    pill = body(disk(yy, xx, 176, 186, 16, 16), 0.2)
    stamp(a, pill, (176, 42, 36), grain(3), 0.25)
    string = ((np.abs(xx - 128) < 2) & (yy > 52) & (yy < 78)).astype(np.float32)
    stamp(a, string, (160, 40, 34), grain(2), 0.2)
    rim(a, m, (180, 200, 160))
    highlight(a, body_m, yy, xx, 112, 136, (200, 220, 190), 14)
    return a


def incense_jianzhong():
    a, yy, xx = canvas()
    shard = body(disk(yy, xx, 128, 176, 38, 18), 0.12)
    stamp(a, shard, (90, 78, 62), grain(6), 0.45)
    blade = ((np.abs(xx - 128) < 7 + (210 - yy) * 0.02) & (yy > 48) & (yy < 178)).astype(np.float32)
    stamp(a, blade, (186, 190, 196), grain(0), 0.28)
    sprout = body(disk(yy, xx, 142, 86, 10, 28), 0.18)
    stamp(a, sprout, (72, 118, 64), grain(5), 0.35)
    leaf = body(disk(yy, xx, 156, 78, 16, 7), 0.2)
    stamp(a, leaf, (88, 136, 70), grain(5), 0.3)
    rim(a, np.clip(shard + blade, 0, 1), (220, 220, 210), 0.03)
    return a


def incense_huyuan():
    a, yy, xx = canvas()
    stone = body(disk(yy, xx, 128, 140, 52, 64), 0.1)
    stamp(a, stone, (168, 186, 198), grain(5), 0.32)
    glow = body(disk(yy, xx, 128, 140, 36, 44), 0.2)
    stamp(a, glow * 0.7, (210, 230, 240), grain(5), 0.15)
    ring = np.clip(body(disk(yy, xx, 128, 140, 78, 90), 0.08) - body(disk(yy, xx, 128, 140, 66, 76), 0.08), 0, 1)
    stamp(a, ring * 0.65, (200, 220, 230), grain(0), 0.2)
    rim(a, stone, (230, 240, 245))
    highlight(a, stone, yy, xx, 108, 118, (245, 250, 255), 16)
    return a


def incense_shibao():
    a, yy, xx = canvas()
    lens = body(disk(yy, xx, 128, 132, 58, 48), 0.1)
    stamp(a, lens, (70, 92, 88), grain(5), 0.4)
    glass = body(disk(yy, xx, 128, 132, 36, 30), 0.18)
    stamp(a, glass, (186, 210, 196), grain(5), 0.25)
    pupil = body(disk(yy, xx, 128, 132, 10, 10), 0.3)
    stamp(a, pupil, (28, 36, 30), grain(1), 0.15)
    handle = body(disk(yy, xx, 186, 186, 18, 8), 0.2)
    stamp(a, handle, (120, 86, 40), grain(2), 0.3)
    rim(a, lens, (210, 190, 110))
    highlight(a, glass, yy, xx, 112, 118, (230, 245, 230), 12)
    return a


def incense_qimai():
    a, yy, xx = canvas()
    plate = body(disk(yy, xx, 128, 140, 70, 78), 0.1)
    stamp(a, plate, (62, 48, 40), grain(6), 0.4)
    for ox, oy, rx, ry in (
        (128, 88, 6, 28),
        (108, 130, 5, 36),
        (148, 130, 5, 36),
        (128, 168, 7, 30),
        (96, 168, 18, 5),
        (160, 168, 18, 5),
    ):
        vein = body(disk(yy, xx, ox, oy, rx, ry), 0.25)
        stamp(a, vein * 0.85, (212, 168, 72), grain(3), 0.2)
    rim(a, plate, (180, 140, 70))
    return a


def path_jian():
    a, yy, xx = canvas()
    ang = np.radians(-55)
    xr = (xx - 128) * np.cos(ang) + (yy - 128) * np.sin(ang)
    yr = -(xx - 128) * np.sin(ang) + (yy - 128) * np.cos(ang)
    blade = ((np.abs(yr) < 8) & (xr > -90) & (xr < 100)).astype(np.float32)
    tip = ((xr > 70) & (np.abs(yr) < (100 - xr) * 0.35)).astype(np.float32)
    guard = ((np.abs(xr + 40) < 8) & (np.abs(yr) < 28)).astype(np.float32)
    hilt = ((xr < -48) & (xr > -96) & (np.abs(yr) < 7)).astype(np.float32)
    m = np.clip(blade + tip + guard + hilt, 0, 1)
    stamp(a, np.clip(blade + tip, 0, 1), (198, 202, 208), grain(0), 0.28)
    stamp(a, guard, (168, 128, 48), grain(3), 0.35)
    stamp(a, hilt, (70, 44, 28), grain(2), 0.35)
    rim(a, m, (230, 220, 180), 0.03)
    return a


def path_ti():
    a, yy, xx = canvas()
    torso = body(disk(yy, xx, 128, 128, 52, 70), 0.1)
    stamp(a, torso, (150, 132, 104), grain(6), 0.45)
    plate = body(disk(yy, xx, 128, 120, 36, 28), 0.15)
    stamp(a, plate, (186, 170, 130), grain(0), 0.3)
    stamp(a, body(disk(yy, xx, 128, 188, 40, 16), 0.15), (120, 96, 72), grain(6), 0.35)
    rim(a, torso, (210, 186, 140))
    return a


def path_san():
    a, yy, xx = canvas()
    pack = body(disk(yy, xx, 128, 150, 70, 52), 0.1)
    flap = body(disk(yy, xx, 128, 112, 62, 22), 0.12)
    strap = ((np.abs(xx - 88) < 6) & (yy > 70) & (yy < 200)).astype(np.float32)
    m = np.clip(pack + flap + strap, 0, 1)
    stamp(a, pack, (92, 78, 58), grain(2), 0.5)
    stamp(a, flap, (70, 58, 42), grain(2), 0.4)
    stamp(a, strap, (50, 40, 30), grain(2), 0.3)
    gourd = body(disk(yy, xx, 176, 176, 16, 22), 0.2)
    stamp(a, gourd, (70, 110, 78), grain(5), 0.3)
    rim(a, m, (180, 150, 100))
    return a


def path_mo():
    a, yy, xx = canvas()
    horn = body(disk(yy, xx, 96, 86, 16, 36), 0.15)
    horn2 = body(disk(yy, xx, 160, 86, 16, 36), 0.15)
    core = body(disk(yy, xx, 128, 148, 58, 58), 0.1)
    m = np.clip(horn + horn2 + core, 0, 1)
    stamp(a, core, (92, 18, 24), grain(3), 0.38)
    stamp(a, np.clip(horn + horn2, 0, 1), (40, 16, 18), grain(1), 0.3)
    eye = body(disk(yy, xx, 128, 140, 10, 8), 0.3)
    stamp(a, eye, (230, 170, 60), grain(3), 0.15)
    rim(a, m, (180, 50, 40))
    highlight(a, core, yy, xx, 112, 128, (180, 60, 50), 14)
    return a


def relic_canjuan():
    a, yy, xx = canvas()
    slip = body(disk(yy, xx, 128, 132, 36, 88), 0.08)
    stamp(a, slip, (164, 196, 168), grain(5), 0.38)
    lines = ((np.abs(xx - 128) < 10) & ((yy.astype(int) % 14) < 3) & (yy > 70) & (yy < 196)).astype(np.float32)
    stamp(a, lines * slip, (40, 70, 48), grain(5), 0.15)
    hole = body(disk(yy, xx, 128, 52, 6, 6), 0.3)
    stamp(a, hole, (20, 24, 18), grain(1), 0.1)
    cord = body(disk(yy, xx, 128, 40, 5, 16), 0.2)
    stamp(a, cord, (150, 40, 34), grain(2), 0.2)
    rim(a, slip, (210, 230, 200))
    return a


def relic_wendaoling():
    a, yy, xx = canvas()
    bell = body(disk(yy, xx, 128, 150, 58, 52), 0.1)
    top = body(disk(yy, xx, 128, 104, 22, 16), 0.15)
    loop = body(disk(yy, xx, 128, 78, 10, 14), 0.2)
    m = np.clip(bell + top + loop, 0, 1)
    stamp(a, m, (176, 138, 52), grain(3), 0.42)
    mouth = body(disk(yy, xx, 128, 186, 48, 10), 0.2)
    stamp(a, mouth, (120, 88, 30), grain(3), 0.25)
    rim(a, m, (230, 196, 90))
    highlight(a, bell, yy, xx, 108, 136, (240, 210, 130), 16)
    return a


def relic_yingkui():
    a, yy, xx = canvas()
    doll = body(disk(yy, xx, 128, 150, 36, 58), 0.1)
    head = body(disk(yy, xx, 128, 86, 22, 22), 0.15)
    arm = body(disk(yy, xx, 88, 140, 22, 8), 0.2)
    arm2 = body(disk(yy, xx, 168, 140, 22, 8), 0.2)
    m = np.clip(doll + head + arm + arm2, 0, 1)
    stamp(a, m, (36, 28, 40), grain(1), 0.35)
    silk = ((np.abs(xx - 128) < 2 + np.sin(yy * 0.2) * 8) & (yy > 40) & (yy < 80)).astype(np.float32)
    stamp(a, silk, (90, 70, 110), grain(1), 0.25)
    eye = body(disk(yy, xx, 120, 84, 3, 3), 0.5) + body(disk(yy, xx, 136, 84, 3, 3), 0.5)
    stamp(a, eye, (220, 80, 70), grain(3), 0.1)
    rim(a, m, (80, 50, 90))
    return a


def relic_changsheng():
    a, yy, xx = canvas()
    vial = body(disk(yy, xx, 128, 150, 28, 62), 0.1)
    neck = body(disk(yy, xx, 128, 86, 12, 18), 0.15)
    cork = body(disk(yy, xx, 128, 68, 14, 8), 0.2)
    m = np.clip(vial + neck + cork, 0, 1)
    stamp(a, vial, (186, 214, 196), grain(5), 0.28)
    dew = body(disk(yy, xx, 128, 158, 18, 28), 0.2)
    stamp(a, dew, (120, 196, 150), grain(5), 0.2)
    stamp(a, neck, (170, 190, 180), grain(5), 0.25)
    stamp(a, cork, (90, 58, 36), grain(2), 0.3)
    rim(a, m, (220, 240, 220))
    highlight(a, vial, yy, xx, 116, 130, (240, 255, 245), 12)
    return a


def paint_figure(src: Path, dest: Path, box: tuple[float, float, float, float], grade=1.05) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    l, t, r, b = box
    crop = im.crop((int(w * l), int(h * t), int(w * r), int(h * b)))
    crop = crop.resize((720, 960), Image.Resampling.LANCZOS)
    arr = np.asarray(crop).astype(np.float32)
    arr = np.clip((arr - 128) * grade + 118, 0, 255)
    Image.fromarray(arr.astype(np.uint8)).save(dest, quality=90)
    print("wrote", dest)


def compose_heritage_slip() -> None:
    src = ROOT / "ui" / "slip-keep.png"
    out = ROOT / "ui" / "slip-heritage.png"
    font_path = ROOT / "fonts" / "MaShanZheng-Regular.ttf"
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    # cover the whole glyph band with sampled wood
    patch = im.crop((int(w * 0.08), int(h * 0.18), int(w * 0.22), int(h * 0.78)))
    patch = patch.resize((int(w * 0.72), int(h * 0.62)), Image.Resampling.BICUBIC)
    patch = patch.filter(ImageFilter.GaussianBlur(0.6))
    # tile a few horizontal shifts so grain does not look stamped
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    px, py = int(w * 0.14), int(h * 0.2)
    layer.paste(patch, (px, py))
    mask = Image.new("L", patch.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, *patch.size), radius=int(h * 0.18), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(6))
    im.paste(patch, (px, py), mask)

    draw = ImageDraw.Draw(im)
    font = ImageFont.truetype(str(font_path), size=int(h * 0.46))
    text = "传承"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) / 2 - bbox[0]
    y = h * 0.50 - th / 2 - bbox[1]
    draw.text((x + 2, y + 3), text, font=font, fill=(48, 32, 16, 170))
    draw.text((x, y), text, font=font, fill=(246, 232, 196, 255))
    im.save(out, "PNG")
    print("wrote", out, im.size)


def main() -> None:
    compose_heritage_slip()
    icons = {
        ROOT / "items" / "incense" / "houtu.png": incense_houtu,
        ROOT / "items" / "incense" / "nangzhong.png": incense_nangzhong,
        ROOT / "items" / "incense" / "danyuan.png": incense_danyuan,
        ROOT / "items" / "incense" / "jianzhong.png": incense_jianzhong,
        ROOT / "items" / "incense" / "huyuan.png": incense_huyuan,
        ROOT / "items" / "incense" / "shibao.png": incense_shibao,
        ROOT / "items" / "incense" / "qimai.png": incense_qimai,
        ROOT / "items" / "paths" / "jian.png": path_jian,
        ROOT / "items" / "paths" / "ti.png": path_ti,
        ROOT / "items" / "paths" / "san.png": path_san,
        ROOT / "items" / "paths" / "mo.png": path_mo,
        ROOT / "items" / "relics" / "canjuan.png": relic_canjuan,
        ROOT / "items" / "relics" / "wendaoling.png": relic_wendaoling,
        ROOT / "items" / "relics" / "yingkui.png": relic_yingkui,
        ROOT / "items" / "relics" / "changsheng.png": relic_changsheng,
    }
    for dest, fn in icons.items():
        save(fn(), dest)

    # unique event figures — different source + crop, never the reused portraits
    shop = ROOT / "scenes" / "shop.jpg"
    cave = ROOT / "scenes" / "cave.jpg"
    tian = ROOT / "scenes" / "events" / "tiancai.jpg"
    dong = ROOT / "scenes" / "events" / "dongfu.jpg"
    if shop.exists():
        paint_figure(shop, ROOT / "scenes" / "events" / "yehang-fig.jpg", (0.08, 0.02, 0.62, 0.95), 1.08)
    if (ROOT / "scenes" / "events" / "xinmo.jpg").exists():
        # fox-dream: warmer crop of lantern interior, not the xinmo portrait
        paint_figure(ROOT / "scenes" / "events" / "jieyun.jpg", ROOT / "scenes" / "events" / "menggu-fig.jpg", (0.28, 0.0, 0.88, 0.9), 0.95) if (ROOT / "scenes" / "events" / "jieyun.jpg").exists() else paint_figure(dong, ROOT / "scenes" / "events" / "menggu-fig.jpg", (0.2, 0.0, 0.8, 0.85), 1.0)
    if tian.exists():
        paint_figure(tian, ROOT / "scenes" / "events" / "tianxing-fig.jpg", (0.15, 0.05, 0.85, 0.78), 1.12)
    elif cave.exists():
        paint_figure(cave, ROOT / "scenes" / "events" / "tianxing-fig.jpg", (0.2, 0.05, 0.85, 0.8), 1.05)


if __name__ == "__main__":
    main()
