#!/usr/bin/env python3
"""True unique-body combat sprites.

Magenta 2x2 sheets (original pipeline) are chroma-cut and trimmed.
Foes without a sheet get a distinctive silhouette — never a rectangular painting.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ASSETS = Path("/workspace/assets/sprites")
PUB = Path("/workspace/public/sprites")
POR = Path("/workspace/public/portraits")
OUT = Path("/workspace/tmp-sprites/true")
NAMES = ["idle-1", "idle-2", "attack", "hurt"]

# JPEG-safe magenta / crimson family
KEYS = np.array(
    [
        [255, 0, 255],
        [250, 0, 200],
        [230, 20, 180],
        [210, 10, 160],
        [200, 30, 90],
        [180, 20, 80],
        [152, 30, 54],
        [141, 27, 34],
        [110, 0, 48],
        [224, 115, 121],
        [244, 133, 140],
    ],
    dtype=np.float32,
)


def key_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dist = np.min(np.sqrt(((rgb[:, :, None, :] - KEYS) ** 2).sum(axis=3)), axis=2)
    magenta = (np.minimum(r, b) > 110) & (g < 150) & (r + b > g * 2.05 + 30)
    pink = (r > 180) & (g < 160) & (b > 90) & (r > g + 40) & (b + 20 > g)
    crimson = (r > 70) & (g < 90) & (b < 140) & (r > g + 26)
    fuchsia = (r > 140) & (b > 80) & (g < 120) & (r + b > 2 * g + 50)
    return (dist < 92) | magenta | pink | crimson | fuchsia


def flood_clear(rgb: np.ndarray, al: np.ndarray) -> np.ndarray:
    h, w = al.shape
    mask = key_mask(rgb)
    al = al.copy()
    al[mask] = 0
    seen = np.zeros((h, w), dtype=bool)
    stack: list[tuple[int, int]] = []
    for x in range(w):
        stack += [(0, x), (h - 1, x)]
    for y in range(h):
        stack += [(y, 0), (y, w - 1)]
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x]:
            continue
        seen[y, x] = True
        if al[y, x] > 20 and not mask[y, x]:
            continue
        al[y, x] = 0
        stack += [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
    return al


def largest(al: np.ndarray, thresh: float = 28) -> np.ndarray:
    h, w = al.shape
    opaque = al > thresh
    seen = np.zeros((h, w), dtype=bool)
    best: list[tuple[int, int]] = []
    for y in range(h):
        xs = np.where(opaque[y] & ~seen[y])[0]
        for x in xs:
            if seen[y, x]:
                continue
            stack = [(int(y), int(x))]
            cells: list[tuple[int, int]] = []
            while stack:
                cy, cx = stack.pop()
                if cy < 0 or cx < 0 or cy >= h or cx >= w or seen[cy, cx] or not opaque[cy, cx]:
                    continue
                seen[cy, cx] = True
                cells.append((cy, cx))
                stack += [(cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)]
            if len(cells) > len(best):
                best = cells
    out = np.zeros_like(al)
    for cy, cx in best:
        out[cy, cx] = al[cy, cx]
    return out


def trim(im: Image.Image, pad: int = 12) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(im.width, r + pad), min(im.height, b + pad)
    return im.crop((l, t, r, b))


def despill(rgb: np.ndarray, al: np.ndarray) -> np.ndarray:
    mag = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    spill = mag > 6
    rgb = rgb.copy()
    rgb[:, :, 0] = np.where(spill, np.clip(rgb[:, :, 0] - mag * 0.82, 0, 255), rgb[:, :, 0])
    rgb[:, :, 2] = np.where(spill, np.clip(rgb[:, :, 2] - mag * 0.82, 0, 255), rgb[:, :, 2])
    # kill leftover pink islands
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    leftover = (r > 170) & (g < 155) & (b > 80) & (r > g + 35)
    al = al.copy()
    al[leftover] = 0
    return rgb, al


def finalize_cell(cell: Image.Image) -> Image.Image:
    a = np.array(cell.convert("RGBA"))
    rgb, al = a[:, :, :3].astype(np.float32), a[:, :, 3].astype(np.float32)
    al = flood_clear(rgb, al)
    rgb, al = despill(rgb, al)
    al = largest(al)
    out = Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), "RGBA")
    return trim(out)


def split_sheet(path: Path) -> list[Image.Image]:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    cw, ch = w // 2, h // 2
    cells = [
        im.crop((0, 0, cw, ch)),
        im.crop((cw, 0, w, ch)),
        im.crop((0, ch, cw, h)),
        im.crop((cw, ch, w, h)),
    ]
    return [finalize_cell(c) for c in cells]


def pose(im: Image.Image, kind: str) -> Image.Image:
    if kind == "idle2":
        return im.rotate(2.4, resample=Image.Resampling.BICUBIC, expand=True)
    if kind == "attack":
        shifted = Image.new("RGBA", (im.width + 28, im.height + 8), (0, 0, 0, 0))
        shifted.paste(im, (18, 0), im)
        return shifted.rotate(-7, resample=Image.Resampling.BICUBIC, expand=True)
    if kind == "hurt":
        return ImageEnhance.Brightness(im).enhance(1.1).rotate(8, resample=Image.Resampling.BICUBIC, expand=True)
    return im


def from_one(cut: Image.Image) -> list[Image.Image]:
    return [cut, pose(cut, "idle2"), pose(cut, "attack"), pose(cut, "hurt")]


def flood_from_corners(rgb: np.ndarray, tol: float) -> np.ndarray:
    """Transparent where similar to corner background."""
    h, w, _ = rgb.shape
    corners = np.concatenate(
        [
            rgb[:14, :14].reshape(-1, 3),
            rgb[:14, -14:].reshape(-1, 3),
            rgb[-14:, :14].reshape(-1, 3),
            rgb[-14:, -14:].reshape(-1, 3),
        ]
    )
    bg = corners.mean(0)
    dist = np.linalg.norm(rgb - bg, axis=2)
    keep = dist > tol
    al = keep.astype(np.float32) * 255
    al = flood_clear(rgb, al)
    return largest(al)


def extract_tree(path: Path) -> Image.Image:
    """Keep dark wood, drop pale fog — 木魅 is a tree, not a landscape plate."""
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    lum = rgb.mean(2)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    # wood / moss: darker than fog, not pale green-gray
    fog = (lum > 88) & (np.abs(r - g) < 28) & (g + 8 >= b)
    wood = (lum < 92) & ((r > g - 8) | (lum < 55))
    keep = wood & ~fog
    al = keep.astype(np.float32) * 255
    # also drop pixels close to corner fog
    al = flood_from_corners(rgb, tol=38)
    # intersect with not-fog so mist does not stay
    al[fog] = 0
    al[lum > 118] = 0
    al = largest(al, thresh=20)
    rgba = np.asarray(im.convert("RGBA")).copy()
    rgba[:, :, 3] = np.clip(al, 0, 255).astype(np.uint8)
    return trim(Image.fromarray(rgba, "RGBA"), pad=10)


def extract_figure(path: Path, tol: float = 34) -> Image.Image:
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    al = flood_from_corners(rgb, tol=tol)
    rgba = np.asarray(im.convert("RGBA")).copy()
    rgba[:, :, 3] = np.clip(al, 0, 255).astype(np.uint8)
    return trim(Image.fromarray(rgba, "RGBA"), pad=10)


def fill_ratio(im: Image.Image) -> float:
    a = np.array(im.getchannel("A"))
    return float((a > 20).mean())


def paint_mumei() -> Image.Image:
    """Tree-person: crown, trunk-face, branch arms, root flare."""
    W, H = 520, 780
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    por = Image.open(POR / "mumei.jpg").convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    src = np.asarray(por)
    mask = Image.new("L", (W, H), 0)
    m = ImageDraw.Draw(mask)
    cx = W // 2
    # canopy — irregular lobes, not a circle
    for box in [
        (cx - 200, 30, cx + 40, 260),
        (cx - 40, 20, cx + 210, 250),
        (cx - 160, 140, cx + 30, 340),
        (cx - 20, 130, cx + 190, 330),
        (cx - 90, 8, cx + 80, 120),
    ]:
        m.ellipse(box, fill=255)
    # trunk
    m.polygon([(cx - 48, 280), (cx + 58, 275), (cx + 42, 580), (cx - 36, 585)], fill=255)
    # branch arms
    m.polygon([(cx + 40, 340), (cx + 230, 220), (cx + 250, 250), (cx + 70, 400), (cx + 48, 430)], fill=255)
    m.polygon([(cx - 40, 360), (cx - 230, 250), (cx - 250, 280), (cx - 60, 420)], fill=255)
    # twigs
    m.line([(cx + 230, 230), (cx + 248, 160)], fill=255, width=10)
    m.line([(cx - 230, 260), (cx - 200, 180)], fill=255, width=9)
    # roots
    m.polygon(
        [
            (cx - 40, 560),
            (cx + 46, 558),
            (cx + 200, 750),
            (cx + 80, 700),
            (cx + 20, 760),
            (cx - 70, 705),
            (cx - 190, 748),
            (cx - 90, 640),
        ],
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(1.4))
    arr = np.array(im)
    arr[:, :, :3] = src
    arr[:, :, 3] = np.array(mask)
    out = Image.fromarray(arr, "RGBA")
    # carve a face hollow in the trunk so it reads as a spirit, not a landscape
    face = ImageDraw.Draw(out)
    face.ellipse([cx - 22, 360, cx + 26, 430], outline=(40, 28, 16, 220), width=3)
    return trim(out, pad=8)


def paint_jianbing() -> Image.Image:
    W, H = 480, 760
    por = Image.open(POR / "jianbing.jpg").convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    mask = Image.new("L", (W, H), 0)
    m = ImageDraw.Draw(mask)
    cx = W // 2
    m.ellipse([cx - 52, 70, cx + 54, 180], fill=255)  # head
    m.polygon([(cx - 20, 60), (cx + 8, 20), (cx + 22, 70)], fill=255)  # broken plume
    m.polygon([(cx - 100, 175), (cx + 108, 172), (cx + 88, 430), (cx - 84, 434)], fill=255)  # torso
    m.polygon([(cx - 84, 420), (cx + 88, 418), (cx + 60, 730), (cx - 52, 734)], fill=255)  # legs
    m.polygon([(cx - 100, 190), (cx - 170, 250), (cx - 150, 520), (cx - 70, 480)], fill=255)  # cloak
    m.polygon([(cx + 90, 220), (cx + 230, 160), (cx + 238, 190), (cx + 100, 280)], fill=255)  # sword
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[:, :, :3] = np.asarray(por)
    arr[:, :, 3] = np.array(mask)
    return trim(Image.fromarray(arr, "RGBA"), pad=8)


def paint_neimen() -> Image.Image:
    W, H = 420, 760
    por = Image.open(POR / "neimen.jpg").convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    mask = Image.new("L", (W, H), 0)
    m = ImageDraw.Draw(mask)
    cx = W // 2
    m.rectangle([cx - 36, 28, cx + 38, 92], fill=255)  # tall hat
    m.polygon([(cx - 36, 70), (cx - 120, 200), (cx - 100, 210), (cx - 28, 92)], fill=255)  # left flap
    m.polygon([(cx + 38, 70), (cx + 122, 200), (cx + 102, 210), (cx + 30, 92)], fill=255)
    m.ellipse([cx - 48, 96, cx + 50, 200], fill=255)
    m.polygon([(cx - 92, 200), (cx + 96, 198), (cx + 78, 730), (cx - 74, 734)], fill=255)
    m.rectangle([cx + 70, 250, cx + 92, 430], fill=255)  # tablet
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[:, :, :3] = np.asarray(por)
    arr[:, :, 3] = np.array(mask)
    return trim(Image.fromarray(arr, "RGBA"), pad=8)


def paint_xinmo() -> Image.Image:
    W, H = 500, 740
    por = Image.open(POR / "xinmo.jpg").convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    mask = Image.new("L", (W, H), 0)
    m = ImageDraw.Draw(mask)
    cx = W // 2
    m.ellipse([cx - 70, 40, cx + 90, 230], fill=255)
    m.polygon([(cx - 80, 200), (cx + 100, 190), (cx + 70, 560), (cx - 50, 570)], fill=255)
    # dripping hem
    for x0, y0, x1, y1 in [
        (cx - 40, 540, cx - 20, 720),
        (cx + 10, 550, cx + 28, 730),
        (cx + 50, 530, cx + 64, 700),
        (cx - 10, 560, cx + 4, 710),
    ]:
        m.ellipse([x0, y0, x1, y1], fill=255)
    # long ink arm
    m.polygon([(cx + 80, 260), (cx + 230, 180), (cx + 240, 220), (cx + 90, 340)], fill=255)
    m.polygon([(cx - 70, 280), (cx - 200, 360), (cx - 180, 390), (cx - 50, 330)], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(2.4))
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[:, :, :3] = np.asarray(por)
    arr[:, :, 3] = np.array(mask)
    return trim(Image.fromarray(arr, "RGBA"), pad=8)


def paint_sanxiu() -> Image.Image:
    W, H = 420, 720
    por = Image.open(POR / "sanxiu.jpg").convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    mask = Image.new("L", (W, H), 0)
    m = ImageDraw.Draw(mask)
    cx = W // 2
    m.polygon([(cx - 120, 130), (cx, 40), (cx + 120, 130), (cx + 100, 155), (cx - 100, 155)], fill=255)  # hat
    m.ellipse([cx - 44, 130, cx + 46, 230], fill=255)
    m.polygon([(cx - 78, 220), (cx + 82, 218), (cx + 70, 480), (cx - 66, 484)], fill=255)
    m.polygon([(cx - 66, 470), (cx + 70, 468), (cx + 48, 710), (cx - 42, 714)], fill=255)
    m.polygon([(cx + 70, 260), (cx + 190, 320), (cx + 175, 345), (cx + 62, 290)], fill=255)  # sword
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[:, :, :3] = np.asarray(por)
    arr[:, :, 3] = np.array(mask)
    return trim(Image.fromarray(arr, "RGBA"), pad=8)


def save_frames(name: str, frames: list[Image.Image]) -> None:
    dest = OUT / name
    dest.mkdir(parents=True, exist_ok=True)
    for label, im in zip(NAMES, frames):
        im = trim(im, pad=6)
        im.save(dest / f"{label}.png")
        print(f"{name:10} {label:8} {im.size[0]:4}x{im.size[1]:<4} fill={fill_ratio(im):.2f}")


def install(name: str) -> None:
    src = OUT / name
    dest = PUB / name
    dest.mkdir(parents=True, exist_ok=True)
    for label in NAMES:
        Image.open(src / f"{label}.png").save(dest / f"{label}.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    # original-method magenta sheets
    for foe, sheet in [
        ("huxian", ASSETS / "huxian" / "raw-sheet.png"),
        ("wuji", ASSETS / "wuji" / "raw-sheet.png"),
    ]:
        frames = split_sheet(sheet)
        save_frames(foe, frames)
        install(foe)

    # 木魅: prefer extracted tree if it is not a plate; else painted tree-person
    tree = extract_tree(POR / "mumei.jpg")
    print("mumei extract", tree.size, "fill", f"{fill_ratio(tree):.2f}")
    if fill_ratio(tree) < 0.62 and tree.height > tree.width * 1.15:
        save_frames("mumei", from_one(tree))
    else:
        save_frames("mumei", from_one(paint_mumei()))
    install("mumei")

    for name, painter, tol in [
        ("jianbing", paint_jianbing, 32),
        ("neimen", paint_neimen, 30),
        ("xinmo", paint_xinmo, 28),
        ("sanxiu", paint_sanxiu, 36),
    ]:
        cut = extract_figure(POR / f"{name}.jpg", tol=tol)
        print(name, "extract", cut.size, "fill", f"{fill_ratio(cut):.2f}")
        # if extract is still a filled plate, use the distinctive body
        if fill_ratio(cut) > 0.58 or cut.width / max(1, cut.height) > 0.85:
            cut = painter()
            print(name, "painted", cut.size, "fill", f"{fill_ratio(cut):.2f}")
        save_frames(name, from_one(cut))
        install(name)

    # 紙人 stays paper-shaped (user accepted)
    print("done")


if __name__ == "__main__":
    main()
