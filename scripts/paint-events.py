#!/usr/bin/env python3
"""Figure crops only.

Event *backgrounds* are rebuilt by scripts/rebuild-clean-scenes.py from
verified-clean plates (cave/cliff/forest/storm) plus unique interiors.
Do NOT composite title-bg / combat-bg / spring photos into event BGs —
those files historically carried baked calligraphy (龍者迪文).
"""
from pathlib import Path

from PIL import Image

ROOT = Path("/workspace/public")
OUT = ROOT / "scenes" / "events"
SCENES = ROOT / "scenes"


def cover(im: Image.Image, size, focus=(0.5, 0.32)) -> Image.Image:
    tw, th = size
    w, h = im.size
    scale = max(tw / w, th / h)
    nw, nh = int(w * scale), int(h * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    cx, cy = int(nw * focus[0]), int(nh * focus[1])
    left = max(0, min(nw - tw, cx - tw // 2))
    top = max(0, min(nh - th, cy - th // 2))
    return im.crop((left, top, left + tw, top + th))


def save_fig(src: Path, dest: Path, focus=(0.5, 0.3)):
    im = cover(Image.open(src).convert("RGB"), (720, 960), focus)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, quality=88, optimize=True)
    print("fig", dest.name, dest.stat().st_size)


def main():
    save_fig(SCENES / "shade.jpg", OUT / "dongfu-fig.jpg", (0.5, 0.32))
    save_fig(SCENES / "wanderer.jpg", OUT / "sanxiu-fig.jpg", (0.5, 0.28))
    save_fig(SCENES / "shade.jpg", OUT / "xinmo-fig.jpg", (0.48, 0.3))
    save_fig(SCENES / "ghost.jpg", OUT / "qianbei-fig.jpg", (0.5, 0.3))
    save_fig(SCENES / "hermit.jpg", OUT / "lingquan-fig.jpg", (0.5, 0.34))
    save_fig(SCENES / "fox.jpg", OUT / "tiancai-fig.jpg", (0.5, 0.28))
    save_fig(SCENES / "monk-storm.jpg", OUT / "jieyun-fig.jpg", (0.5, 0.26))
    save_fig(SCENES / "fox.jpg", OUT / "danfang-fig.jpg", (0.48, 0.3))
    print("figures only — backgrounds are owned by rebuild-clean-scenes.py")


if __name__ == "__main__":
    main()
