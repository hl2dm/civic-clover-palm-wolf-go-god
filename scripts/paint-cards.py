#!/usr/bin/env python3
"""Light parchment card ART plates only — no baked text, no dark mud."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path("/workspace/public")
OUT = ROOT / "cards"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 512, 420

SKY = {
    "attack": ((72, 28, 22), (196, 112, 58), (236, 196, 140)),
    "skill": ((24, 52, 40), (78, 122, 88), (198, 210, 176)),
    "power": ((40, 24, 58), (102, 68, 128), (210, 186, 168)),
}


def load(p: Path) -> Image.Image:
    return Image.open(p).convert("RGBA")


def sky(kind: str, seed: int) -> Image.Image:
    rng = np.random.default_rng(seed)
    lo, mid, hi = SKY[kind]
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    t = np.clip(y * 0.85 + (x - 0.5) * 0.08, 0, 1)
    rgb = np.zeros((H, W, 3), np.float32)
    for i in range(3):
        rgb[..., i] = lo[i] * (1 - t) + mid[i] * t * 1.15
        rgb[..., i] = np.where(t > 0.55, mid[i] * (1 - (t - 0.55) / 0.45) + hi[i] * ((t - 0.55) / 0.45), rgb[..., i])
    n = rng.normal(0, 7, (H, W, 1)).astype(np.float32)
    rgb = (rgb + n).clip(0, 255)
    im = Image.fromarray(rgb.astype(np.uint8)).convert("RGBA")
    # soft sun / moon
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    cx, cy = int(W * 0.7), int(H * 0.28)
    col = hi
    for r, a in ((160, 40), (90, 70), (40, 120)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*col, a))
    return Image.alpha_composite(im, glow)


def paste_icon(base: Image.Image, icon: Image.Image, scale=0.72) -> None:
    icon = icon.copy()
    icon.thumbnail((int(W * scale), int(H * scale)), Image.Resampling.LANCZOS)
    x = (W - icon.width) // 2
    y = (H - icon.height) // 2 + 8
    base.alpha_composite(icon, (x, y))


CARDS = {
    "pikong": ("attack", 11, "items/relics/jianqiao.png"),
    "huti": ("skill", 21, "items/relics/huxin.png"),
    "pojia": ("attack", 31, "items/relics/liebo.png"),
    "lianzhan": ("attack", 41, "items/relics/jianqiao.png"),
    "yujian": ("attack", 51, "items/relics/jianqiao.png"),
    "wanjian": ("attack", 61, "items/relics/tongtian.png"),
    "zhuxin": ("attack", 71, "items/relics/zhenhun.png"),
    "tianlei": ("attack", 81, "items/relics/liebo.png"),
    "xueji": ("attack", 91, "items/relics/xueyu.png"),
    "chuanyun": ("attack", 101, "items/relics/jianqiao.png"),
    "jianqi": ("attack", 111, "items/relics/yinqi.png"),
    "tuna": ("skill", 121, "items/relics/putuan.png"),
    "ningshen": ("skill", 131, "items/relics/dinghun.png"),
    "jinzhong": ("skill", 141, "items/relics/huxin.png"),
    "huichun": ("skill", 151, "items/relics/huichunpei.png"),
    "juling": ("skill", 161, "items/relics/julingfan.png"),
    "xieli": ("skill", 171, "items/relics/bifuh.png"),
    "qingxin": ("skill", 181, "items/relics/qingnang.png"),
    "xushi": ("skill", 191, "items/relics/kongming.png"),
    "fanshang": ("skill", 201, "items/relics/mofu.png"),
    "jianyi": ("power", 211, "items/relics/jianqiao.png"),
    "jindanhu": ("power", 221, "items/relics/sancai.png"),
    "fenxin": ("power", 231, "items/relics/chilian.png"),
    "yuqi": ("power", 241, "items/relics/yinqi.png"),
}


def main() -> None:
    for cid, (kind, seed, icon) in CARDS.items():
        im = sky(kind, seed)
        paste_icon(im, load(ROOT / icon), 0.78)
        im.convert("RGB").save(OUT / f"{cid}.jpg", quality=90)
    print("art plates", len(CARDS))


if __name__ == "__main__":
    main()
