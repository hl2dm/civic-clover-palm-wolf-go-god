#!/usr/bin/env python3
"""Compose complete talisman card faces: art window + name/ability caption (no overlay)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace")
ART = ROOT / "public" / "cards"
OUT = ROOT / "public" / "cards" / "faces"
FONT_KAI = ROOT / "assets" / "fonts" / "LXGWWenKai-Medium.ttf"
FONT_SONG = ROOT / "assets" / "fonts" / "NotoSerifTC.ttf"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 640, 900
RIM = 22
# Art stays in the upper window. Caption (name + ability) is a separate plate
# below it so type never sits on the illustration.
ART_TOP = 24
ART_H = 612
CAP_TOP = 652
NAME_Y = 694
RULE_Y = 736
TEXT_Y = 780

KIND = {
    "attack": {
        "wood": ((72, 28, 18), (38, 14, 10)),
        "gold": (212, 168, 86),
        "ink": (42, 18, 12),
        "wash": (248, 232, 208),
        "caption": (236, 214, 178),
        "label": "劍訣",
    },
    "skill": {
        "wood": ((28, 48, 34), (14, 28, 20)),
        "gold": (186, 176, 104),
        "ink": (18, 36, 24),
        "wash": (236, 238, 214),
        "caption": (214, 222, 188),
        "label": "功法",
    },
    "power": {
        "wood": ((48, 28, 58), (26, 14, 34)),
        "gold": (196, 164, 214),
        "ink": (38, 18, 48),
        "wash": (240, 228, 236),
        "caption": (226, 208, 222),
        "label": "神通",
    },
}

CARDS = [
    ("pikong", "劈空劍", "attack", 1, "造成 6 點傷害", "造成 9 點傷害"),
    ("huti", "護體訣", "skill", 1, "獲得 5 點護體", "獲得 8 點護體"),
    ("pojia", "破甲刺", "attack", 2, "造成 8 點傷害，給予 2 層破防", "造成 11 點傷害，給予 3 層破防"),
    ("lianzhan", "連斬", "attack", 1, "造成 4 點傷害兩次", "造成 5 點傷害兩次"),
    ("yujian", "御劍術", "attack", 1, "造成 10 點傷害", "造成 13 點傷害"),
    ("wanjian", "萬劍歸宗", "attack", 1, "對所有敵人造成 5 點傷害", "對所有敵人造成 8 點傷害"),
    ("zhuxin", "誅心一擊", "attack", 2, "造成 16 點傷害", "造成 21 點傷害"),
    ("tianlei", "天雷引", "attack", 1, "造成 11 點傷害，給予 1 層虛弱", "造成 14 點傷害，給予 1 層虛弱"),
    ("xueji", "血祭劍", "attack", 1, "失去 4 點氣血，造成 20 點傷害", "失去 3 點氣血，造成 24 點傷害"),
    ("chuanyun", "穿雲刺", "attack", 1, "造成 7 點傷害，抽 1 張牌", "造成 9 點傷害，抽 1 張牌"),
    ("jianqi", "劍氣縱橫", "attack", 1, "造成等同當前護體的傷害", "造成等同當前護體加 5 的傷害"),
    ("tuna", "吐納術", "skill", 1, "獲得 8 點護體", "獲得 11 點護體"),
    ("ningshen", "凝神", "skill", 0, "抽 2 張牌", "抽 3 張牌"),
    ("jinzhong", "金鐘罩", "skill", 2, "獲得 13 點護體", "獲得 17 點護體"),
    ("huichun", "回春訣", "skill", 1, "回復 7 點氣血。消耗", "回復 10 點氣血。消耗"),
    ("juling", "聚靈", "skill", 0, "獲得 2 點靈力。消耗", "獲得 3 點靈力。消耗"),
    ("xieli", "卸力", "skill", 1, "獲得 7 點護體，抽 1 張牌", "獲得 9 點護體，抽 1 張牌"),
    ("qingxin", "清心咒", "skill", 0, "移除自身負面狀態，抽 1 張牌", "移除自身負面狀態，抽 2 張牌"),
    ("xushi", "蓄勢", "skill", 1, "下一次攻擊額外造成 8 點傷害", "下一次攻擊額外造成 12 點傷害"),
    ("fanshang", "反震訣", "skill", 1, "獲得 5 點護體與 3 層反傷", "獲得 8 點護體與 4 層反傷"),
    ("jianyi", "劍意長存", "power", 1, "每回合開始時，對隨機敵人造成 4 點傷害", "每回合開始時，對隨機敵人造成 6 點傷害"),
    ("jindanhu", "金丹護體", "power", 1, "每回合開始時獲得 3 點護體", "每回合開始時獲得 5 點護體"),
    ("fenxin", "焚心修煉", "power", 1, "獲得 3 層劍意。每回合開始失去 1 點氣血", "獲得 4 層劍意。每回合開始失去 1 點氣血"),
    ("yuqi", "御氣", "power", 2, "每回合多抽 1 張牌", "每回合多抽 2 張牌"),
    ("liekong", "裂空掌", "attack", 1, "造成 5 點傷害，給予 1 層破防", "造成 7 點傷害，給予 2 層破防"),
    ("huifeng", "回風劍", "attack", 1, "造成 4 點傷害，抽 1 張牌", "造成 6 點傷害，抽 1 張牌"),
    ("zhenhunzhou", "鎮魂咒", "skill", 1, "獲得 6 點護體。若敵手欲攻，再得 4 點", "獲得 8 點護體。若敵手欲攻，再得 5 點"),
    ("huaxue", "化血訣", "skill", 0, "失去 3 點氣血，獲得 2 點靈力。消耗", "失去 2 點氣血，獲得 2 點靈力。消耗"),
    ("tianwen", "天問", "attack", 2, "對所有敵人造成 7 點傷害，給予 1 層虛弱", "對所有敵人造成 10 點傷害，給予 1 層虛弱"),
    ("wenxindeng", "問心燈", "power", 1, "每回合開始時獲得 2 點護體", "每回合開始時獲得 4 點護體"),
    ("fenghou", "一劍封喉", "attack", 3, "造成 12 點傷害。敵手氣血未半則改為 26 點", "造成 16 點傷害。敵手氣血未半則改為 32 點"),
]


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def assert_glyphs(path: Path, text: str) -> None:
    f = font(path, 64)
    missing = np.array(f.getmask("\uFFFF"))
    bad = []
    for ch in text:
        if ch.isspace():
            continue
        mask = np.array(f.getmask(ch))
        if mask.size == 0 or int(mask.max()) == 0:
            bad.append(ch)
        elif mask.shape == missing.shape and np.array_equal(mask, missing):
            bad.append(ch)
    if bad:
        raise SystemExit(f"{path.name} missing: {''.join(sorted(set(bad)))}")


def wood_plate(kind: str) -> Image.Image:
    pal = KIND[kind]
    hi, lo = pal["wood"]
    yy = np.linspace(0, 1, H)[:, None]
    xx = np.linspace(0, 1, W)[None, :]
    t = np.clip(0.55 * yy + 0.12 * np.sin(xx * 18) * 0.08 + 0.2 * xx, 0, 1)
    rng = np.random.default_rng(180 + sum(ord(c) for c in kind))
    grain = rng.normal(0, 7, (H, W)).astype(np.float32)
    rgb = np.zeros((H, W, 3), np.float32)
    for i in range(3):
        rgb[..., i] = hi[i] * (1 - t) + lo[i] * t + grain
    return Image.fromarray(rgb.clip(0, 255).astype(np.uint8), "RGB").convert("RGBA")


def parchment(size: tuple[int, int], wash: tuple[int, int, int]) -> Image.Image:
    w, h = size
    yy = np.linspace(0, 1, h)[:, None]
    xx = np.linspace(0, 1, w)[None, :]
    t = np.clip(0.35 * yy + 0.2 * xx, 0, 1)
    rng = np.random.default_rng(9)
    n = rng.normal(0, 5, (h, w, 1)).astype(np.float32)
    rgb = np.zeros((h, w, 3), np.float32)
    deep = (int(wash[0] * 0.86), int(wash[1] * 0.84), int(wash[2] * 0.78))
    for i in range(3):
        rgb[..., i] = wash[i] * (1 - t) + deep[i] * t + n[..., 0]
    return Image.fromarray(rgb.clip(0, 255).astype(np.uint8), "RGB").convert("RGBA")


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return m


def wrap(text: str, fnt: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    lines: list[str] = []
    cur = ""
    dummy = Image.new("L", (8, 8))
    d = ImageDraw.Draw(dummy)
    for ch in text:
        trial = cur + ch
        box = d.textbbox((0, 0), trial, font=fnt)
        if box[2] - box[0] > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def stamp_text(
    plate: Image.Image,
    text: str,
    *,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    cy: int,
    tracking: int = 0,
) -> None:
    draw = ImageDraw.Draw(plate)
    dummy = ImageDraw.Draw(Image.new("L", (8, 8)))
    widths = []
    for ch in text:
        b = dummy.textbbox((0, 0), ch, font=fnt)
        widths.append(b[2] - b[0])
    total = sum(widths) + tracking * max(0, len(text) - 1)
    x = (W - total) // 2
    box0 = dummy.textbbox((0, 0), text[0], font=fnt)
    y = cy - (box0[3] - box0[1]) // 2 - box0[1]
    for ch, cw in zip(text, widths):
        draw.text((x + 1, y + 2), ch, font=fnt, fill=(20, 12, 8, 90))
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += cw + tracking


def compose(cid: str, name: str, kind: str, cost: int, ability: str, upgraded: bool) -> Image.Image:
    pal = KIND[kind]
    plate = wood_plate(kind)
    inner = parchment((W - RIM * 2, H - RIM * 2), pal["wash"])
    plate.alpha_composite(inner, (RIM, RIM))

    # art window — stops above the caption so name/ability never sit on the blade
    art_path = ART / f"{cid}.jpg"
    art = Image.open(art_path).convert("RGB")
    aw, ah = W - RIM * 2 - 16, ART_H
    scale = max(aw / art.width, ah / art.height)
    nw, nh = int(art.width * scale), int(art.height * scale)
    art = art.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - aw) // 2
    top = max(0, int((nh - ah) * 0.16))
    art = art.crop((left, top, left + aw, top + ah)).convert("RGBA")
    art_mask = rounded_mask((aw, ah), 10)
    art.putalpha(art_mask)
    plate.alpha_composite(art, ((W - aw) // 2, ART_TOP + 6))

    d = ImageDraw.Draw(plate)
    ax0, ay0 = (W - aw) // 2 - 3, ART_TOP + 3
    ax1, ay1 = ax0 + aw + 6, ay0 + ah + 6
    d.rounded_rectangle((ax0, ay0, ax1, ay1), 12, outline=pal["gold"], width=3)

    # caption plate under the art — solid, so type cannot cover the illustration
    cap = parchment((W - RIM * 2 - 8, H - CAP_TOP - RIM - 4), pal["caption"])
    plate.alpha_composite(cap, (RIM + 4, CAP_TOP))

    stamp_text(
        plate,
        name + (" · 進" if upgraded else ""),
        fnt=font(FONT_KAI, 58),
        fill=pal["ink"],
        cy=NAME_Y,
        tracking=4,
    )
    d.line((RIM + 56, RULE_Y, W - RIM - 56, RULE_Y), fill=(*pal["gold"], 200), width=2)

    body = font(FONT_SONG, 36)
    lines = wrap(ability, body, W - RIM * 2 - 64)
    y = TEXT_Y
    for line in lines[:3]:
        stamp_text(plate, line, fnt=body, fill=pal["ink"], cy=y, tracking=0)
        y += 46

    # type chip
    chip = pal["label"]
    chip_f = font(FONT_SONG, 24)
    tw = ImageDraw.Draw(Image.new("L", (8, 8))).textbbox((0, 0), chip, font=chip_f)
    cw, ch = max(92, tw[2] - tw[0] + 28), max(36, tw[3] - tw[1] + 16)
    cx, cy = W - RIM - 28 - cw, ART_TOP + 22
    d.rounded_rectangle((cx, cy, cx + cw, cy + ch), 18, fill=(16, 10, 8, 220))
    tx = cx + (cw - (tw[2] - tw[0])) // 2 - tw[0]
    ty = cy + (ch - (tw[3] - tw[1])) // 2 - tw[1]
    d.text((tx, ty), chip, font=chip_f, fill=pal["wash"])

    # baked cost disc
    d.ellipse((28, 30, 88, 90), fill=(20, 12, 8, 230), outline=pal["gold"], width=3)
    cost_f = font(FONT_SONG, 36)
    cs = str(cost)
    cb = ImageDraw.Draw(Image.new("L", (8, 8))).textbbox((0, 0), cs, font=cost_f)
    d.text((58 - (cb[2] + cb[0]) / 2, 60 - (cb[3] + cb[1]) / 2), cs, font=cost_f, fill=(243, 234, 212))

    d.rounded_rectangle((8, 8, W - 9, H - 9), 18, outline=pal["gold"], width=4)
    d.rounded_rectangle((3, 3, W - 4, H - 4), 20, outline=(20, 12, 8, 255), width=5)

    plate.putalpha(rounded_mask((W, H), 22))
    return plate


def main() -> None:
    corpus = "".join(n + a + b + "劍訣功法神通進0123456789" for _, n, _, _, a, b in CARDS)
    assert_glyphs(FONT_KAI, corpus)
    assert_glyphs(FONT_SONG, corpus)
    for cid, name, kind, cost, base, up in CARDS:
        a = compose(cid, name, kind, cost, base, False)
        b = compose(cid, name, kind, cost, up, True)
        a.save(OUT / f"{cid}.png", "PNG")
        b.save(OUT / f"{cid}-up.png", "PNG")
        print("face", cid, a.size)
    print("wrote", len(CARDS) * 2, "faces")


if __name__ == "__main__":
    main()
