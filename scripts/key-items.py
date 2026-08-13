#!/usr/bin/env python3
"""Chroma-key item icons onto transparent 256px PNGs."""
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path("/workspace/artifacts/imagine_images")
OUT_R = Path("/workspace/public/items/relics")
OUT_P = Path("/workspace/public/items/potions")
OUT_M = Path("/workspace/public/items")

KEYS = np.array(
    [
        [255, 0, 255],
        [250, 20, 230],
        [230, 0, 220],
        [203, 26, 98],
        [200, 30, 90],
        [180, 20, 80],
    ],
    dtype=np.float32,
)

RELICS = {
    "yinqi": "cfb9ad7b-5622-45a2-ace7-aeff99634fdf",
    "huxin": "2274bd82-a8de-4819-aa44-638aaff42170",
    "julingfan": "5fa7485f-b855-48a2-a049-cfa55cc419da",
    "shijin": "b1314a15-8b76-4235-b8a9-746567476595",
    "dinghun": "4bd0c3eb-80f7-4902-9ef4-21bdc5da8212",
    "bifuh": "2b197cb4-1494-4136-8f76-40815b5dff6e",
    "xisui": "3d522282-cd09-46f6-88ba-a8b70b91c6c5",
    "tongtian": "8b1b409b-0638-446c-9c15-3ee359fa26cc",
    "xueyu": "6ea921d6-23c5-4238-ac48-097fd7652d04",
    "putuan": "e23856cf-bfe3-482e-9464-664c5b9fa873",
    "jubao": "4ca14916-ed18-4e1d-9b24-ae05f87375a7",
    "huichunpei": "9bf72499-bfe6-4d69-8d88-197c2d25c66d",
    "shuangwen": "8feab460-f1de-47de-9246-b7439ea93d7c",
    "chilian": "a2976300-1b92-40f6-a11d-6a95a714c2bc",
    "kongming": "b403afe4-5dbb-4c6a-ba68-9d42bff19cf8",
    "zhenhun": "e31628d1-1b53-4a93-9825-047914023c3a",
    "buyun": "e19a0dda-3c63-4ec4-b2b8-97b8d8d47604",
    "mofu": "30693ee1-f2bb-413f-83ed-3798fbc41cd2",
    "qingnang": "03a9aad5-4ba7-4281-8055-8c3628535b97",
    "liebo": "261d514d-6f99-4194-a1ef-e488fe7cb479",
    "xuepo": "7dba9f49-823c-468b-85c1-068e4b38b37f",
    "qiankun": "31b8f0a0-cf13-45b9-94ee-38cede6a7a36",
    "jianqiao": "21bf0d13-3b26-4d10-be01-f31b1ce030c9",
    "sancai": "663d186f-aa3b-4a6b-87e0-e72dabcfdf14",
}

POTIONS = {
    "huiqi": "4c4692df-31cb-41a6-b8cd-073926e9e961",
    "pozhang": "7541fa8b-6cef-47b6-95e6-5e5176b8c988",
    "ningshen": "d04dec16-4704-478c-895c-4e32eb63c022",
    "yandun": "56124e92-d942-416c-8229-024a306c8b08",
    "peiyuan": "c7ed7d40-6e88-43df-99ae-3156fd384899",
    "qingxin": "2b690743-56e3-4f65-a0cb-deed59ca75ba",
    "wanjian": "7bae1355-c992-492b-b2b4-e179470f602e",
    "shigu": "23bafe3c-6f07-4447-bf41-72a49f5bbf40",
    "jinshen": "41d5a376-5007-4017-91ea-c62bd5feb2ce",
    "pojun": "5636e56f-0511-43b4-a0b0-c2055485bd3a",
    "xuming": "82c1abbd-02dd-4b47-97e7-edb3e6481433",
    "fenglei": "7a6bccac-6d9f-4b9b-89aa-9baf65c3edb2",
}

MISC = {"remove": "21d30eba-44c2-4402-bf11-01b994f46e73"}


def is_key(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dist = np.min(np.sqrt(((rgb[:, :, None, :] - KEYS) ** 2).sum(axis=3)), axis=2)
    magenta = (np.minimum(r, b) > 130) & (g < 110)
    hot = (r > 200) & (b > 160) & (g < 140)
    return (dist < 80) | magenta | hot


def key_one(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    a = np.array(im)
    rgb = a[:, :, :3].astype(np.float32)
    al = np.where(is_key(rgb), 0, 255).astype(np.float32)
    mag = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    spill = mag > 10
    rgb[:, :, 0] = np.where(spill, np.clip(rgb[:, :, 0] - mag * 0.75, 0, 255), rgb[:, :, 0])
    rgb[:, :, 2] = np.where(spill, np.clip(rgb[:, :, 2] - mag * 0.75, 0, 255), rgb[:, :, 2])
    ys, xs = np.where(al > 20)
    if len(ys) == 0:
        dest.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(np.dstack([rgb, al]).astype(np.uint8), "RGBA").save(dest)
        print("empty", dest.name)
        return
    pad = 24
    y0, y1 = max(0, ys.min() - pad), min(al.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(al.shape[1], xs.max() + pad + 1)
    crop = np.dstack([rgb[y0:y1, x0:x1], al[y0:y1, x0:x1]])
    out = Image.fromarray(np.clip(crop, 0, 255).astype(np.uint8), "RGBA")
    out.thumbnail((256, 256), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.paste(out, ((256 - out.width) // 2, (256 - out.height) // 2), out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest)
    print("ok", dest.relative_to("/workspace/public"), out.size)


def main() -> None:
    for name, uid in RELICS.items():
        key_one(SRC / f"{uid}.jpg", OUT_R / f"{name}.png")
    for name, uid in POTIONS.items():
        key_one(SRC / f"{uid}.jpg", OUT_P / f"{name}.png")
    for name, uid in MISC.items():
        key_one(SRC / f"{uid}.jpg", OUT_M / f"{name}.png")


if __name__ == "__main__":
    main()
