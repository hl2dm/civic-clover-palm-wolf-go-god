#!/usr/bin/env python3
"""Painterly inventory icons from photo grain — unique silhouette per item."""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace/public")
OUT_R = ROOT / "items" / "relics"
OUT_P = ROOT / "items" / "potions"
OUT_M = ROOT / "items"
N = 256


def load_grain() -> np.ndarray:
    paths = [
        ROOT / "combat-bg.jpg",
        ROOT / "arena-qingming.jpg",
        ROOT / "scenes" / "shop.jpg",
        ROOT / "scenes" / "events" / "danfang.jpg",
        ROOT / "scenes" / "events" / "tiancai.jpg",
        ROOT / "scenes" / "events" / "lingquan.jpg",
    ]
    grains = []
    for p in paths:
        if not p.exists():
            continue
        im = Image.open(p).convert("RGB").resize((N, N), Image.Resampling.LANCZOS)
        grains.append(np.asarray(im).astype(np.float32))
    if not grains:
        raise SystemExit("no grain")
    return grains


GRAINS = load_grain()


def grain(i: int, contrast=1.15) -> np.ndarray:
    g = GRAINS[i % len(GRAINS)]
    g = (g - 128) * contrast + 128
    return np.clip(g, 0, 255)


def disk(yy, xx, cx, cy, rx, ry=None) -> np.ndarray:
    ry = rx if ry is None else ry
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2


def stamp(base, mask, color, tex, mix=0.42) -> None:
    m = np.clip(mask, 0, 1)[..., None]
    col = np.array(color, dtype=np.float32)
    painted = col * (1 - mix) + tex * mix
    base[..., :3] = base[..., :3] * (1 - m) + painted * m
    base[..., 3] = np.maximum(base[..., 3], mask * 255)


def rim(base, mask, color, width=0.035) -> None:
    edge = np.clip((mask > 0.15).astype(np.float32) - (mask > 0.15 + width).astype(np.float32), 0, 1)
    stamp(base, edge * 0.85, color, grain(0, 0.8), mix=0.2)


def shade(base, mask, yy, xx, cx, cy, dark=(30, 18, 12)) -> None:
    d = np.sqrt((xx - (cx + 18)) ** 2 + (yy - (cy + 22)) ** 2)
    sh = np.clip((d - 40) / 90, 0, 1) * mask * 0.35
    stamp(base, sh, dark, grain(1, 0.6), mix=0.15)


def highlight(base, mask, yy, xx, hx, hy, color=(240, 230, 200), r=22) -> None:
    h = np.exp(-(((xx - hx) ** 2 + (yy - hy) ** 2) / (2 * r * r))) * mask
    stamp(base, h * 0.55, color, grain(0, 0.5), mix=0.1)


def canvas() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    a = np.zeros((N, N, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:N, 0:N]
    return a, yy.astype(np.float32), xx.astype(np.float32)


def save(a: np.ndarray, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA").save(dest)


def body_mask(d, soft=0.08) -> np.ndarray:
    return np.clip((1 - d) / soft, 0, 1)


# --- relics ---
def relic_yinqi():
    a, yy, xx = canvas()
    tex = grain(5)
    d = disk(yy, xx, 128, 138, 62, 68)
    m = body_mask(d, 0.1)
    hole = body_mask(disk(yy, xx, 128, 118, 8, 9), 0.2)
    m = np.clip(m - hole, 0, 1)
    stamp(a, m, (168, 196, 168), tex, 0.38)
    swirl = np.sin((xx - 128) * 0.12 + (yy - 148) * 0.1) * np.cos((yy - 150) * 0.08)
    stamp(a, m * np.clip(swirl, 0, 1) * 0.35, (90, 130, 100), tex, 0.2)
    cord = body_mask(disk(yy, xx, 128, 52, 7, 38), 0.15) * (yy < 118)
    stamp(a, cord, (140, 42, 36), grain(2), 0.3)
    rim(a, m, (220, 210, 170))
    highlight(a, m, yy, xx, 108, 118, (230, 240, 220), 18)
    return a


def relic_huxin():
    a, yy, xx = canvas()
    m = body_mask(disk(yy, xx, 128, 132, 70, 70), 0.08)
    stamp(a, m, (150, 118, 58), grain(3), 0.45)
    face = body_mask(disk(yy, xx, 128, 132, 48, 48), 0.1)
    stamp(a, face, (196, 178, 110), grain(0), 0.35)
    ring = body_mask(disk(yy, xx, 128, 68, 12, 10), 0.2)
    stamp(a, ring, (120, 90, 40), grain(3), 0.3)
    rim(a, m, (230, 200, 120))
    highlight(a, face, yy, xx, 112, 118, (245, 230, 180), 16)
    return a


def relic_julingfan():
    a, yy, xx = canvas()
    pole = (np.abs(xx - 128) < 5) & (yy > 28) & (yy < 230)
    cloth = (xx > 118) & (xx < 198) & (yy > 40) & (yy < 210)
    wave = np.sin((yy - 40) * 0.08) * 10
    cloth = cloth & (xx < 188 + wave) & (xx > 122 + wave * 0.3)
    m = cloth.astype(np.float32)
    stamp(a, m, (48, 92, 88), grain(5), 0.4)
    stamp(a, pole.astype(np.float32), (70, 46, 28), grain(2), 0.35)
    rim(a, m, (180, 200, 170), 0.04)
    return a


def relic_shijin():
    a, yy, xx = canvas()
    body = body_mask(disk(yy, xx, 128, 140, 58, 38), 0.1)
    head = body_mask(disk(yy, xx, 178, 132, 22, 18), 0.15)
    m = np.clip(body + head, 0, 1)
    stamp(a, m, (176, 132, 42), grain(3), 0.5)
    shell = body_mask(disk(yy, xx, 118, 136, 40, 24), 0.12)
    stamp(a, shell, (210, 170, 60), grain(0), 0.3)
    rim(a, m, (240, 210, 120))
    highlight(a, m, yy, xx, 110, 126, (245, 230, 160), 14)
    return a


def relic_dinghun():
    a, yy, xx = canvas()
    m = body_mask(disk(yy, xx, 128, 132, 58, 58), 0.1)
    stamp(a, m, (28, 24, 32), grain(1), 0.35)
    inner = body_mask(disk(yy, xx, 128, 132, 22, 22), 0.2)
    stamp(a, inner, (180, 200, 210), grain(5), 0.25)
    rim(a, m, (160, 170, 180))
    highlight(a, m, yy, xx, 108, 112, (220, 230, 240), 12)
    return a


def relic_bifuh():
    a, yy, xx = canvas()
    rect = (np.abs(xx - 128) < 48) & (np.abs(yy - 132) < 70)
    curl = np.sin((yy - 60) * 0.05) * 4
    rect = (np.abs(xx - 128 - curl) < 48) & (np.abs(yy - 132) < 70)
    m = rect.astype(np.float32)
    # soft edges
    m = body_mask(disk(yy, xx, 128, 132, 52, 74), 0.12) * m
    m = np.clip(m + body_mask(disk(yy, xx, 128, 132, 46, 68), 0.2) * 0.5, 0, 1)
    stamp(a, m, (214, 186, 112), grain(2), 0.4)
    marks = (np.abs(xx - 128) < 18) & (np.abs(yy - 132) < 42) & ((xx + yy) % 11 < 3)
    stamp(a, marks.astype(np.float32) * m * 0.8, (140, 36, 28), grain(2), 0.15)
    rim(a, m, (180, 80, 50), 0.03)
    return a


def relic_xisui():
    a, yy, xx = canvas()
    pot = body_mask(disk(yy, xx, 128, 128, 58, 48), 0.1)
    neck = body_mask(disk(yy, xx, 128, 82, 28, 16), 0.15)
    leg1 = body_mask(disk(yy, xx, 88, 188, 10, 22), 0.2)
    leg2 = body_mask(disk(yy, xx, 168, 188, 10, 22), 0.2)
    leg3 = body_mask(disk(yy, xx, 128, 196, 10, 16), 0.2)
    m = np.clip(pot + neck + leg1 + leg2 + leg3, 0, 1)
    stamp(a, m, (118, 78, 42), grain(3), 0.45)
    glow_m = body_mask(disk(yy, xx, 128, 120, 22, 16), 0.25)
    stamp(a, glow_m * 0.7, (220, 90, 30), grain(3), 0.2)
    rim(a, m, (210, 170, 90))
    return a


def relic_tongtian():
    a, yy, xx = canvas()
    ang = np.radians(-28)
    xr = (xx - 128) * np.cos(ang) + (yy - 128) * np.sin(ang)
    yr = -(xx - 128) * np.sin(ang) + (yy - 128) * np.cos(ang)
    m = ((np.abs(xr) < 110) & (np.abs(yr) < 11)).astype(np.float32)
    stamp(a, m, (62, 40, 24), grain(2), 0.4)
    ticks = (np.abs(yr) < 8) & (np.abs(xr % 18) < 1.6) & (np.abs(xr) < 100)
    stamp(a, ticks.astype(np.float32) * m, (200, 186, 150), grain(0), 0.2)
    rim(a, m, (180, 150, 90), 0.05)
    return a


def relic_xueyu():
    a, yy, xx = canvas()
    blob = disk(yy, xx, 128, 136, 58, 50) * 0.7 + disk(yy, xx, 148, 118, 28, 24) * 0.4
    m = body_mask(blob, 0.12)
    stamp(a, m, (148, 28, 32), grain(3), 0.4)
    rim(a, m, (220, 90, 70))
    highlight(a, m, yy, xx, 112, 118, (230, 140, 120), 16)
    return a


def relic_putuan():
    a, yy, xx = canvas()
    m = body_mask(disk(yy, xx, 128, 140, 86, 36), 0.08)
    hole = body_mask(disk(yy, xx, 128, 140, 22, 10), 0.2)
    ring = np.clip(m - hole * 0.35, 0, 1)
    stamp(a, ring, (118, 108, 58), grain(2), 0.55)
    weave = np.sin(xx * 0.35) * np.sin(yy * 0.55)
    stamp(a, ring * np.clip(weave, 0, 1) * 0.25, (80, 70, 36), grain(2), 0.2)
    rim(a, ring, (190, 170, 100), 0.03)
    return a


def relic_jubao():
    a, yy, xx = canvas()
    bag = body_mask(disk(yy, xx, 128, 150, 62, 52), 0.1)
    neck = body_mask(disk(yy, xx, 128, 96, 22, 18), 0.15)
    m = np.clip(bag + neck, 0, 1)
    stamp(a, m, (168, 112, 48), grain(2), 0.4)
    cord = body_mask(disk(yy, xx, 128, 96, 26, 6), 0.2)
    stamp(a, cord, (80, 140, 90), grain(5), 0.25)
    rim(a, m, (220, 180, 90))
    highlight(a, m, yy, xx, 108, 140, (230, 190, 120), 18)
    return a


def relic_huichunpei():
    a, yy, xx = canvas()
    disc = body_mask(disk(yy, xx, 128, 142, 48, 48), 0.1)
    stamp(a, disc, (150, 186, 140), grain(5), 0.35)
    petal = body_mask(disk(yy, xx, 128, 142, 16, 16), 0.2)
    stamp(a, petal, (200, 90, 80), grain(2), 0.25)
    cord = body_mask(disk(yy, xx, 128, 70, 6, 36), 0.15)
    stamp(a, cord, (150, 40, 36), grain(2), 0.25)
    rim(a, disc, (220, 220, 180))
    return a


def relic_shuangwen():
    a, yy, xx = canvas()
    knot = body_mask(disk(yy, xx, 128, 70, 16, 12), 0.2)
    strands = np.zeros((N, N), dtype=np.float32)
    for i, ox in enumerate((-18, -6, 6, 18, 0)):
        sway = np.sin((yy - 80) * 0.05 + i) * 6
        col = np.abs(xx - (128 + ox + sway)) < (5 - i * 0.3)
        strands = np.maximum(strands, ((yy > 70) & (yy < 220) & col).astype(np.float32))
    m = np.clip(knot + strands, 0, 1)
    stamp(a, m, (170, 196, 210), grain(5), 0.4)
    rim(a, m, (230, 240, 245), 0.04)
    return a


def relic_chilian():
    a, yy, xx = canvas()
    m = body_mask(disk(yy, xx, 128, 132, 54, 54), 0.1)
    stamp(a, m, (180, 36, 24), grain(3), 0.3)
    inner = body_mask(disk(yy, xx, 128, 132, 24, 24), 0.25)
    stamp(a, inner, (240, 160, 40), grain(0), 0.2)
    rim(a, m, (240, 120, 50))
    highlight(a, m, yy, xx, 110, 114, (255, 220, 160), 14)
    return a


def relic_kongming():
    a, yy, xx = canvas()
    m = body_mask(disk(yy, xx, 128, 132, 60, 60), 0.1)
    stamp(a, m, (186, 198, 206), grain(5), 0.35)
    face = body_mask(disk(yy, xx, 128, 132, 42, 42), 0.15)
    stamp(a, face, (230, 236, 240), grain(0), 0.25)
    handle = body_mask(disk(yy, xx, 128, 200, 8, 22), 0.2)
    stamp(a, handle, (90, 70, 50), grain(2), 0.3)
    rim(a, m, (240, 240, 230))
    highlight(a, face, yy, xx, 112, 118, (255, 255, 250), 16)
    return a


def relic_zhenhun():
    a, yy, xx = canvas()
    shaft = (np.abs(xx - 128) < 7) & (yy > 50) & (yy < 220)
    head = body_mask(disk(yy, xx, 128, 58, 18, 14), 0.2)
    tip = ((yy > 200) & (yy < 232) & (np.abs(xx - 128) < (232 - yy) * 0.45)).astype(np.float32)
    m = np.clip(shaft.astype(np.float32) + head + tip, 0, 1)
    stamp(a, m, (36, 32, 34), grain(1), 0.4)
    wrap = (np.abs(xx - 128) < 10) & (yy > 70) & (yy < 100)
    stamp(a, wrap.astype(np.float32), (160, 50, 36), grain(2), 0.3)
    rim(a, m, (160, 150, 140), 0.04)
    return a


def relic_buyun():
    a, yy, xx = canvas()
    boot = body_mask(disk(yy, xx, 120, 150, 50, 36), 0.1)
    shaft = body_mask(disk(yy, xx, 108, 108, 22, 36), 0.12)
    toe = body_mask(disk(yy, xx, 168, 158, 28, 16), 0.15)
    m = np.clip(boot + shaft + toe, 0, 1)
    stamp(a, m, (48, 44, 52), grain(1), 0.4)
    cloud = body_mask(disk(yy, xx, 118, 120, 16, 8), 0.25)
    stamp(a, cloud * 0.6, (180, 190, 200), grain(5), 0.2)
    rim(a, m, (140, 140, 150))
    return a


def relic_mofu():
    a, yy, xx = canvas()
    box = body_mask(disk(yy, xx, 128, 150, 70, 42), 0.1) * ((yy > 118).astype(np.float32))
    lid = body_mask(disk(yy, xx, 128, 118, 68, 18), 0.12)
    papers = body_mask(disk(yy, xx, 128, 108, 40, 22), 0.15)
    stamp(a, box, (28, 24, 22), grain(1), 0.4)
    stamp(a, lid, (40, 34, 28), grain(2), 0.35)
    stamp(a, papers, (214, 190, 120), grain(2), 0.35)
    rim(a, np.clip(box + lid, 0, 1), (160, 130, 70))
    return a


def relic_qingnang():
    a, yy, xx = canvas()
    book = (np.abs(xx - 128) < 58) & (np.abs(yy - 136) < 70)
    m = book.astype(np.float32)
    m = np.clip(m * body_mask(disk(yy, xx, 128, 136, 64, 76), 0.12), 0, 1)
    stamp(a, m, (42, 86, 72), grain(5), 0.4)
    spine = (np.abs(xx - 76) < 6) & (np.abs(yy - 136) < 70)
    stamp(a, spine.astype(np.float32), (30, 50, 42), grain(2), 0.3)
    herb = body_mask(disk(yy, xx, 150, 90, 18, 8), 0.2)
    stamp(a, herb, (90, 120, 50), grain(5), 0.3)
    rim(a, m, (160, 180, 140))
    return a


def relic_liebo():
    a, yy, xx = canvas()
    band = (np.abs((yy - 128) - 0.15 * (xx - 128)) < 16) & (xx > 40) & (xx < 216)
    fray = np.sin(xx * 0.4) * 6
    band = (np.abs((yy - 128) - 0.15 * (xx - 128) - fray * 0.15) < 16 + (xx > 180).astype(float) * 4)
    m = band.astype(np.float32)
    stamp(a, m, (132, 36, 36), grain(3), 0.45)
    rim(a, m, (200, 80, 70), 0.04)
    return a


def relic_xuepo():
    a, yy, xx = canvas()
    m = body_mask(disk(yy, xx, 128, 134, 52, 46) * 0.8 + disk(yy, xx, 142, 120, 24, 20) * 0.4, 0.12)
    stamp(a, m, (176, 72, 28), grain(3), 0.4)
    bug = body_mask(disk(yy, xx, 132, 138, 10, 6), 0.3)
    stamp(a, bug, (30, 20, 16), grain(1), 0.2)
    rim(a, m, (230, 140, 60))
    highlight(a, m, yy, xx, 110, 118, (240, 190, 120), 14)
    return a


def relic_qiankun():
    a, yy, xx = canvas()
    bag = body_mask(disk(yy, xx, 128, 148, 70, 58), 0.1)
    mouth = body_mask(disk(yy, xx, 128, 92, 28, 16), 0.15)
    m = np.clip(bag + mouth, 0, 1)
    stamp(a, m, (36, 42, 78), grain(1), 0.4)
    star = body_mask(disk(yy, xx, 128, 148, 10, 10), 0.3)
    stamp(a, star * 0.6, (200, 180, 90), grain(0), 0.2)
    rim(a, m, (120, 130, 180))
    return a


def relic_jianqiao():
    a, yy, xx = canvas()
    ang = np.radians(18)
    xr = (xx - 128) * np.cos(ang) + (yy - 140) * np.sin(ang)
    yr = -(xx - 128) * np.sin(ang) + (yy - 140) * np.cos(ang)
    scab = ((xr > -80) & (xr < 50) & (np.abs(yr) < 16)).astype(np.float32)
    break_ = ((xr > 40) & (xr < 78) & (np.abs(yr) < 10 + np.sin(yr) * 4)).astype(np.float32)
    m = np.clip(scab + break_ * 0.9, 0, 1)
    stamp(a, m, (48, 36, 28), grain(2), 0.45)
    metal = ((xr > -80) & (xr < -58) & (np.abs(yr) < 18)).astype(np.float32)
    stamp(a, metal, (140, 110, 60), grain(3), 0.3)
    rim(a, m, (160, 120, 70), 0.04)
    return a


def relic_sancai():
    a, yy, xx = canvas()
    m = body_mask(disk(yy, xx, 128, 132, 62, 62), 0.08)
    hole = body_mask(disk(yy, xx, 128, 132, 16, 16), 0.2)
    # square hole
    sq = ((np.abs(xx - 128) < 12) & (np.abs(yy - 132) < 12)).astype(np.float32)
    ring = np.clip(m - sq, 0, 1)
    stamp(a, ring, (86, 122, 78), grain(3), 0.45)
    rim(a, ring, (180, 200, 140))
    highlight(a, ring, yy, xx, 108, 114, (200, 220, 170), 12)
    return a


def relic_remove():
    a, yy, xx = canvas()
    left = ((xx < 120) & (np.abs(yy - 128) < 70) & (xx > 50)).astype(np.float32)
    right = ((xx > 136) & (np.abs(yy - 128) < 64) & (xx < 210)).astype(np.float32)
    left *= body_mask(disk(yy, xx, 86, 128, 40, 74), 0.15)
    right *= body_mask(disk(yy, xx, 172, 132, 40, 68), 0.15)
    stamp(a, left, (214, 186, 112), grain(2), 0.4)
    stamp(a, right, (200, 170, 96), grain(2), 0.4)
    rim(a, np.clip(left + right, 0, 1), (160, 50, 36), 0.03)
    return a


# --- potions ---
def bottle(color, stout=False, gourd=False):
    a, yy, xx = canvas()
    if gourd:
        top = body_mask(disk(yy, xx, 128, 92, 28, 26), 0.12)
        bot = body_mask(disk(yy, xx, 128, 158, 52, 48), 0.1)
        neck = body_mask(disk(yy, xx, 128, 118, 14, 18), 0.2)
        m = np.clip(top + bot + neck, 0, 1)
    elif stout:
        m = body_mask(disk(yy, xx, 128, 148, 48, 52), 0.1)
        neck = body_mask(disk(yy, xx, 128, 88, 16, 22), 0.18)
        m = np.clip(m + neck, 0, 1)
    else:
        m = body_mask(disk(yy, xx, 128, 150, 38, 50), 0.1)
        neck = body_mask(disk(yy, xx, 128, 86, 14, 24), 0.18)
        m = np.clip(m + neck, 0, 1)
    cork = body_mask(disk(yy, xx, 128, 62, 12, 10), 0.25)
    stamp(a, m, color, grain(5 if sum(color) > 300 else 3), 0.38)
    stamp(a, cork, (120, 78, 40), grain(2), 0.3)
    rim(a, m, tuple(min(255, c + 60) for c in color))
    highlight(a, m, yy, xx, 112, 130, (245, 240, 220), 14)
    return a


def pill(color, veins=None):
    a, yy, xx = canvas()
    m = body_mask(disk(yy, xx, 128, 132, 56, 52), 0.1)
    stamp(a, m, color, grain(3), 0.32)
    if veins:
        v = np.sin(xx * 0.18 + yy * 0.09) * np.cos(yy * 0.16)
        stamp(a, m * np.clip(v, 0, 1) * 0.45, veins, grain(0), 0.15)
    rim(a, m, tuple(min(255, c + 70) for c in color))
    highlight(a, m, yy, xx, 108, 114, (250, 245, 230), 16)
    return a


RELICS = {
    "yinqi": relic_yinqi,
    "huxin": relic_huxin,
    "julingfan": relic_julingfan,
    "shijin": relic_shijin,
    "dinghun": relic_dinghun,
    "bifuh": relic_bifuh,
    "xisui": relic_xisui,
    "tongtian": relic_tongtian,
    "xueyu": relic_xueyu,
    "putuan": relic_putuan,
    "jubao": relic_jubao,
    "huichunpei": relic_huichunpei,
    "shuangwen": relic_shuangwen,
    "chilian": relic_chilian,
    "kongming": relic_kongming,
    "zhenhun": relic_zhenhun,
    "buyun": relic_buyun,
    "mofu": relic_mofu,
    "qingnang": relic_qingnang,
    "liebo": relic_liebo,
    "xuepo": relic_xuepo,
    "qiankun": relic_qiankun,
    "jianqiao": relic_jianqiao,
    "sancai": relic_sancai,
}

POTIONS = {
    "huiqi": lambda: bottle((142, 176, 132)),
    "pozhang": lambda: bottle((86, 48, 120), stout=True),
    "ningshen": lambda: bottle((186, 206, 214)),
    "yandun": lambda: bottle((120, 118, 112), gourd=True),
    "peiyuan": lambda: pill((210, 164, 52)),
    "qingxin": lambda: pill((150, 210, 176)),
    "wanjian": lambda: pill((186, 194, 204)),
    "shigu": lambda: pill((36, 48, 32), veins=(80, 140, 50)),
    "jinshen": lambda: bottle((196, 148, 48), stout=True),
    "pojun": lambda: pill((168, 36, 32)),
    "xuming": lambda: pill((214, 132, 140)),
    "fenglei": lambda: pill((48, 42, 96), veins=(220, 190, 70)),
}


def main() -> None:
    for name, fn in RELICS.items():
        save(fn(), OUT_R / f"{name}.png")
        print("relic", name)
    for name, fn in POTIONS.items():
        save(fn(), OUT_P / f"{name}.png")
        print("potion", name)
    save(relic_remove(), OUT_M / "remove.png")
    print("misc remove")


if __name__ == "__main__":
    main()
