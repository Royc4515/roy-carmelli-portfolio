#!/usr/bin/env python3
"""Render review images for the pixel pipeline output and the PixelIcon set.

    python3 scripts/pixelate/review.py --out <dir>

Writes into <dir>:
    contact-sheet.png   every output at x4 on the day (#1a2e10) and night (#0a0f1e) grounds,
                        plus the forest at x4 with the wave sprite standing on its ground row
    wave.gif, sit.gif   each sheet at x4 with the real frame timing (day | night side by side),
                        with a tick under the feet anchor to judge jitter
    icons.png           every PixelIcon at x1, x2 and x4 on both grounds
    forest-grid.png     source crop vs. the detected grid (11.47) vs. a 12.02 grid, projected
                        back onto the source, to show which grid matches the art
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True  # keep scripts/pixelate free of __pycache__
sys.path.insert(0, str(Path(__file__).resolve().parent))
import pixelate as px  # noqa: E402

ROOT = px.ROOT
PIXEL = px.OUT_DIR
DAY, NIGHT = (0x1a, 0x2e, 0x10), (0x0a, 0x0f, 0x1e)
FG = {DAY: (0xed, 0xe0, 0xb8), NIGHT: (0xec, 0xe0, 0xbc)}
ACCENT = {DAY: (0xef, 0x7d, 0x70), NIGHT: (0xf0, 0x7a, 0x6e)}
LABEL = (0xc9, 0xb8, 0x7a)


def meta() -> dict:
    """Parse src/theme/pixelSprites.ts (numbers only) so the review uses what the site uses."""
    text = px.TS_OUT.read_text()
    out = {}
    for key in ('wave', 'sit', 'idle', 'face', 'forest'):
        m = re.search(rf'^\s*{key}: \{{(.*?)\}},?$', text, re.M)
        out[key] = {k: (int(v) if v.isdigit() else v.strip("'"))
                    for k, v in re.findall(r"(\w+): ('[^']*'|\d+)", m.group(1))}
    return out


def load(name: str) -> Image.Image:
    return Image.open(PIXEL / name).convert('RGBA')


def up(im: Image.Image, k: int) -> Image.Image:
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def frames(im: Image.Image, fw: int, n: int) -> list[Image.Image]:
    return [im.crop((i * fw, 0, (i + 1) * fw, im.height)) for i in range(n)]


def on(bg: tuple, im: Image.Image, pad: int = 0) -> Image.Image:
    canvas = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), bg + (255,))
    canvas.alpha_composite(im, (pad, pad))
    return canvas


def hstack(ims: list[Image.Image], gap: int, bg: tuple, align: str = 'bottom') -> Image.Image:
    w = sum(i.width for i in ims) + gap * (len(ims) - 1)
    h = max(i.height for i in ims)
    out = Image.new('RGBA', (w, h), bg + (255,))
    x = 0
    for i in ims:
        out.alpha_composite(i, (x, h - i.height if align == 'bottom' else 0))
        x += i.width + gap
    return out


def vstack(ims: list[Image.Image], gap: int, bg: tuple) -> Image.Image:
    w = max(i.width for i in ims)
    h = sum(i.height for i in ims) + gap * (len(ims) - 1)
    out = Image.new('RGBA', (w, h), bg + (255,))
    y = 0
    for i in ims:
        out.alpha_composite(i, (0, y))
        y += i.height + gap
    return out


def label(im: Image.Image, text: str, bg: tuple) -> Image.Image:
    out = Image.new('RGBA', (max(im.width, 8 * len(text)), im.height + 16), bg + (255,))
    ImageDraw.Draw(out).text((0, 0), text, fill=LABEL + (255,))
    out.alpha_composite(im, (0, 16))
    return out


def contact_sheet(m: dict, out: Path) -> None:
    k = 4
    wave, sit = load('roy-wave.png'), load('roy-sit.png')
    rows = []
    for bg, name in ((DAY, 'day #1a2e10'), (NIGHT, 'night #0a0f1e')):
        tiles = []
        for i, f in enumerate(frames(wave, m['wave']['frameW'], m['wave']['frames'])):
            tiles.append(label(on(bg, up(f, k)), f'wave {i}', bg))
        for i, f in enumerate(frames(sit, m['sit']['frameW'], m['sit']['frames'])):
            tiles.append(label(on(bg, up(f, k)), f'sit {i}', bg))
        tiles.append(label(on(bg, up(load('roy-idle.png'), k)), 'idle', bg))
        tiles.append(label(on(bg, up(load('roy-face.png'), k)), 'face', bg))
        rows.append(label(hstack(tiles, 24, bg), name, bg))
    # Forest at x4 with wave frame 0 on the ground row, feet at x = 118/229 of the width (SPEC).
    fo = m['forest']
    forest = up(load('forest.png'), k)
    wf = frames(wave, m['wave']['frameW'], 1)[0]
    x = int(round(fo['w'] * 118 / 229)) - m['wave']['anchorX']
    y = fo['groundRow'] - wf.height
    forest.alpha_composite(up(wf, k), (x * k, y * k))
    rows.append(label(forest, f"forest x4, {fo['w']}x{fo['h']}, groundRow {fo['groundRow']} "
                              f"(wave frame 0 feet on the ground row)", DAY))
    sheet = vstack([on(DAY, r, 16) for r in rows], 0, DAY)
    sheet.convert('RGB').save(out / 'contact-sheet.png')


def sheet_gif(m: dict, key: str, file: str, out: Path) -> None:
    k = 4
    info = m[key]
    fr = frames(load(file), info['frameW'], info['frames'])
    pad = 16
    imgs = []
    for f in fr:
        panes = []
        for bg in (DAY, NIGHT):
            pane = on(bg, up(f, k), pad)
            pane = vstack([pane, Image.new('RGBA', (pane.width, 12), bg + (255,))], 0, bg)
            d = ImageDraw.Draw(pane)
            ax = pad + info['anchorX'] * k
            d.rectangle((ax - 1, pane.height - 10, ax + 1, pane.height - 2), fill=LABEL + (255,))
            panes.append(pane)
        imgs.append(hstack(panes, 0, DAY).convert('RGB'))
    imgs[0].save(out / f'{key}.gif', save_all=True, append_images=imgs[1:],
                 duration=info['frameMs'], loop=0, optimize=False, disposal=1)


def parse_icons() -> dict[str, list[str]]:
    src = (ROOT / 'src' / 'components' / 'PixelIcon.tsx').read_text()
    body = src[src.index('ICONS'):]
    icons = {}
    for name, rows in re.findall(r"'?([\w-]+)'?:\s*\[((?:\s*'[.#+]{12}',?)+)\s*\]", body):
        icons[name] = re.findall(r"'([.#+]{12})'", rows)
    return icons


def icon_image(rows: list[str], bg: tuple) -> Image.Image:
    im = Image.new('RGBA', (12, 12), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '#':
                im.putpixel((x, y), FG[bg] + (255,))
            elif ch == '+':
                im.putpixel((x, y), ACCENT[bg] + (255,))
    return im


def icons_sheet(out: Path) -> None:
    icons = parse_icons()
    blocks = []
    for bg in (DAY, NIGHT):
        rows = []
        for k in (1, 2, 4):
            cells = []
            for name, rows_ in icons.items():
                tile = on(bg, up(icon_image(rows_, bg), k), 4)
                cells.append(label(tile, name[:max(2, tile.width // 7)], bg) if k == 4 else tile)
            per = 10 if k == 4 else 30
            lines = [hstack(cells[i:i + per], 12, bg, 'top') for i in range(0, len(cells), per)]
            rows.append(label(vstack(lines, 8, bg), f'x{k}', bg))
        blocks.append(on(bg, vstack(rows, 16, bg), 16))
    vstack(blocks, 0, DAY).convert('RGB').save(out / 'icons.png')
    print(f'  {len(icons)} icons: {", ".join(icons)}')


def forest_grid(out: Path) -> None:
    a = px.load_rgba(px.GAME_SPRITES / 'background.png')
    h, w, _ = a.shape
    gx, gy = px.detect_grid(a)
    x0, x1, y0, y1 = 760, 1160, 960, 1289
    tiles = [Image.fromarray(a[y0:y1, x0:x1].astype(np.uint8), 'RGBA')]
    for ax, ay in ((gx, gy), (px.Axis(12.02, 1.0, 0), px.Axis(12.02, 9.0, 0))):
        o = px.sample(a, ax, ay).astype(np.uint8)
        xs, ys = ax.starts(w), ay.starts(h)
        ix = np.clip(np.searchsorted(xs, np.arange(w) + 0.5, side='right') - 1, 0, len(xs) - 1)
        iy = np.clip(np.searchsorted(ys, np.arange(h) + 0.5, side='right') - 1, 0, len(ys) - 1)
        tiles.append(Image.fromarray(o[iy[:, None], ix[None, :]][y0:y1, x0:x1], 'RGBA'))
    names = ['source (2752x1289)', f'detected grid {gx.period:.2f} -> {len(gx.starts(w))} cols',
             '12.02 grid -> 229 cols']
    tiles = [label(up(t, 2), n, DAY) for t, n in zip(tiles, names)]
    hstack(tiles, 16, DAY, 'top').convert('RGB').save(out / 'forest-grid.png')


def main() -> None:
    ap = argparse.ArgumentParser(description='Render pixel-art review images.')
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('--skip-forest-grid', action='store_true')
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    m = meta()
    contact_sheet(m, args.out)
    sheet_gif(m, 'wave', 'roy-wave.png', args.out)
    sheet_gif(m, 'sit', 'roy-sit.png', args.out)
    if (ROOT / 'src' / 'components' / 'PixelIcon.tsx').exists():
        icons_sheet(args.out)
    if not args.skip_forest_grid:
        forest_grid(args.out)
    print(f'review images in {args.out}')


if __name__ == '__main__':
    main()
