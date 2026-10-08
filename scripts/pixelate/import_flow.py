"""Import the Flow sprite sheets in design-src/flow into native-resolution sprites.

The game and site art is generated in Google Flow (Nano Banana) from the current sprites as
reference: each animation is one sheet on a flat magenta matte, so every frame of an
animation is drawn in one pass and stays on-model. This script turns those sheets into the
files the game loads and the sources pixelate.py reads:

1. Key out the magenta matte and pull the purple fringe it leaves back to neutral.
2. Cut each sheet into its grid cells and crop every cell to its sprite.
3. Resample to native resolution (one PNG pixel per art pixel) with pixelate.sample, using
   one period per sheet so a standing Roy is STAND_H px tall on every sheet.
4. Share one palette per group, so colors do not shimmer between frames.
5. Pad each animation set to one frame size, bottom-aligned on the feet.

Native files carry a `pixel-grid=1` PNG text chunk; pixelate.py skips grid detection for
them. The game draws them 1:1, so it reads the frame sizes from the generated
src/components/MiniGame/spriteSizes.generated.ts.

    python3 scripts/pixelate/import_flow.py && python3 scripts/pixelate/pixelate.py
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, PngImagePlugin

import pixelate as P

FLOW = P.ROOT / 'design-src' / 'flow'
SIZES_TS = P.ROOT / 'src' / 'components' / 'MiniGame' / 'spriteSizes.generated.ts'

KEY_MIN = 80          # min(R, B) - G above this is the magenta matte
DESPILL = 24          # fringe pixels keep at most this much magenta over green
SPECK_MIN = 3         # rows/cols with fewer opaque px than this are matte noise, not sprite
STAND_H = 70          # native height of a standing Roy (the game's player box was 72)
SITE_STAND_H = 67     # the site's Roy, which its scene layouts are tuned to
GROUND_OBSTACLE_H = 52  # native median height of the ground obstacles (they were 52-54)
CRITTER_H = 40        # the beetle and hedgehog are low, quick critters
PORTRAIT_H = 56       # fits the 76 px player card (HUD_CONFIG) with its frame
FACE_H = 49           # the site's portrait height (navbar, About, chat), unchanged
FOREST_W, FOREST_H = 240, 112  # the site hero's forest size, which its layout is tuned to
FOREST_GROUND_ROW = 101  # the site forest's grass top row, as before (pixelSprites.forest)
BG_PERIOD = 4.0       # Nano Banana draws its pixel art on a 4 px grid at 1376x768
PLAYER_COLORS = 48
OBSTACLE_COLORS = 64
BG_COLORS = 64


@dataclass(frozen=True)
class Sheet:
    file: str
    cols: int
    rows: int
    count: int


RUN = Sheet('run_idle.jpg', 4, 2, 8)           # run 1-7, idle
JUMP = Sheet('jump_slide_stand.jpg', 4, 2, 8)  # jump 1-4, slide 2-3, stand 1-2
WAVE = Sheet('wave_sit.jpg', 3, 2, 6)          # wave 1-3, sit 1-3
OBSTACLES = Sheet('obstacles.jpg', 5, 2, 9)

CRITTERS = Sheet('critters.jpg', 3, 1, 3)

OBSTACLE_NAMES = ('racoon', 'stump', 'stump-moss', 'rock', 'mushrooms',
                  'toadstools', 'agave', 'bird-blue', 'bird-brown')
CRITTER_NAMES = ('beetle', 'hedgehog', 'bat')  # drawn facing left already
AIR = ('bird-blue', 'bird-brown', 'bat')
FACING_RIGHT = ('bird-blue', 'bird-brown')  # the sheet's birds face right; they fly left


def load_keyed(path: Path) -> np.ndarray:
    """RGBA with the magenta matte transparent and its fringe despilled."""
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    spill = np.minimum(r, b) - g
    matte = spill > KEY_MIN
    # JPEG and soft edges blend the matte into the outline; cap the magenta so the dark
    # outline stays dark instead of turning purple.
    fringe = ~matte & (spill > DESPILL)
    cap = g + DESPILL
    out = np.dstack([
        np.where(fringe, np.minimum(r, cap), r),
        g,
        np.where(fringe, np.minimum(b, cap), b),
        np.where(matte, 0, 255),
    ])
    return out.astype(np.uint8)


def sprite_bbox(cell: np.ndarray) -> tuple[int, int, int, int] | None:
    solid = cell[..., 3] > P.SOLID_ALPHA
    rows = np.nonzero(solid.sum(1) >= SPECK_MIN)[0]
    cols = np.nonzero(solid.sum(0) >= SPECK_MIN)[0]
    if len(rows) == 0 or len(cols) == 0:
        return None
    return rows[0], rows[-1] + 1, cols[0], cols[-1] + 1


def cut_cells(rgba: np.ndarray, sheet: Sheet) -> list[np.ndarray]:
    """One cropped high-res sprite per grid cell, in reading order."""
    h, w = rgba.shape[:2]
    ch, cw = h / sheet.rows, w / sheet.cols
    crops = []
    for k in range(sheet.count):
        r, c = divmod(k, sheet.cols)
        y0, y1 = round(r * ch), round((r + 1) * ch)
        x0, x1 = round(c * cw), round((c + 1) * cw)
        cell = rgba[y0:y1, x0:x1]
        box = sprite_bbox(cell)
        if box is None:
            raise SystemExit(f'{sheet.file}: cell {k} is empty')
        ya, yb, xa, xb = box
        if ya == 0 or xa == 0 or yb == cell.shape[0] or xb == cell.shape[1]:
            print(f'  warning: {sheet.file} cell {k} touches its cell edge (may be clipped)')
        crops.append(cell[ya:yb, xa:xb])
    return crops


def to_native(crop: np.ndarray, period: float) -> np.ndarray:
    ax = P.Axis(period, 0.0, 0.0)
    return P.crop(P.cleanup(P.sample(crop, ax, ax)))


def split_sheet(sheet: np.ndarray, fw: int, n: int) -> list[np.ndarray]:
    return [sheet[:, i * fw:(i + 1) * fw] for i in range(n)]


def save_native(img: np.ndarray, path: Path) -> tuple[int, int]:
    """Save via pixelate.save_png, then tag the file as already native."""
    P.save_png(img, path)
    with Image.open(path) as src:
        im = src.copy()  # fully read before the same path is written again
        transparency = src.info.get('transparency')
    info = PngImagePlugin.PngInfo()
    info.add_text(P.NATIVE_KEY, '1')
    kwargs = {'transparency': transparency} if transparency is not None else {}
    im.save(path, optimize=True, pnginfo=info, **kwargs)
    return img.shape[1], img.shape[0]


def import_player() -> dict:
    sheets = {s: cut_cells(load_keyed(FLOW / s.file), s) for s in (RUN, JUMP, WAVE)}
    # The reference pose that sets each sheet's scale: idle, stand-1 and wave-1.
    ref = {RUN: 7, JUMP: 6, WAVE: 0}
    native = {s: [to_native(c, sheets[s][ref[s]].shape[0] / STAND_H) for c in crops]
              for s, crops in sheets.items()}

    run, idle = native[RUN][:7], native[RUN][7]
    jump, slide, stand = native[JUMP][:4], native[JUMP][4:6], native[JUMP][6:8]
    wave = native[WAVE][:3]
    # The site's scenes are laid out on its own integer grid around a SITE_STAND_H Roy, so
    # its wave and sit sources get their own sampling instead of reusing the game frames.
    site_period = sheets[WAVE][ref[WAVE]].shape[0] / SITE_STAND_H
    site = [to_native(c, site_period) for c in sheets[WAVE]]

    upright = [*wave, *run, *jump, *stand, idle]
    every = P.reduce_palette([*upright, *slide, *site], PLAYER_COLORS)
    upright, slide, site = every[:17], every[17:19], every[19:]
    for i, frame in enumerate(site[:3], 1):
        save_native(frame, P.DESIGN_SRC / f'wave-{i}.png')
    sit = site[3:]

    # One frame size for every pose drawn in the player box, so poses keep one scale.
    sheet, fw, fh, _ = P.build_sheet(upright)
    frames = split_sheet(sheet, fw, len(upright))
    names = ([f'wave-{i}' for i in (1, 2, 3)] + [f'run-{i}' for i in range(1, 8)]
             + [f'jump-{i}' for i in range(1, 5)] + ['stand-1', 'stand-2', 'idle'])
    for name, frame in zip(names, frames):
        save_native(frame, P.GAME_SPRITES / f'{name}.png')

    slide_sheet, sw, sh, _ = P.build_sheet(slide)
    for name, frame in zip(('slide-2', 'slide-3'), split_sheet(slide_sheet, sw, 2)):
        save_native(frame, P.GAME_SPRITES / f'{name}.png')

    for i, frame in enumerate(sit, 1):
        save_native(frame, P.DESIGN_SRC / f'sit-{i}.png')

    print(f'  player {fw}x{fh}, slide {sw}x{sh}, sit {[f.shape[1::-1] for f in sit]}')
    return {'player': {'w': fw, 'h': fh}, 'slide': {'w': sw, 'h': sh}}


def import_obstacles() -> dict:
    names, native = [], []
    for sheet, sheet_names, ground_target in ((OBSTACLES, OBSTACLE_NAMES, GROUND_OBSTACLE_H),
                                              (CRITTERS, CRITTER_NAMES, CRITTER_H)):
        crops = cut_cells(load_keyed(FLOW / sheet.file), sheet)
        # One period per sheet, so every object on a sheet keeps one pixel size.
        ground_h = [c.shape[0] for n, c in zip(sheet_names, crops) if n not in AIR]
        period = float(np.median(ground_h)) / ground_target
        names += sheet_names
        native += [to_native(c, period) for c in crops]
    native = P.reduce_palette(native, OBSTACLE_COLORS)
    sizes = {}
    for name, img in zip(names, native):
        if name in FACING_RIGHT:
            img = img[:, ::-1].copy()
        w, h = save_native(img, P.GAME_SPRITES / f'{name}.png')
        sizes[name] = {'w': w, 'h': h}
    print('  obstacles ' + ', '.join(f'{n} {s["w"]}x{s["h"]}' for n, s in sizes.items()))
    return {'obstacles': sizes}


def import_background() -> dict:
    rgb = np.asarray(Image.open(FLOW / 'background.jpg').convert('RGB'))
    rgba = np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)])
    ax = P.Axis(BG_PERIOD, 0.0, 0.0)
    bg = P.reduce_palette([P.sample(rgba, ax, ax)], BG_COLORS)[0]
    w, h = save_native(bg, P.GAME_SPRITES / 'background.png')
    ground = P.measure_ground_row(bg)

    # The site's hero is tuned to a FOREST_W x FOREST_H forest with Roy standing in front of
    # it; a native window of the game background keeps that framing without resampling.
    left = (w - FOREST_W) // 2
    bottom = min(h, ground + FOREST_H - FOREST_GROUND_ROW)
    top = bottom - FOREST_H
    if top < 0 or left < 0:
        raise SystemExit(f'background {w}x{h} is too small for a {FOREST_W}x{FOREST_H} forest')
    save_native(bg[top:bottom, left:left + FOREST_W], P.DESIGN_SRC / 'forest.png')
    print(f'  background {w}x{h}, grass top row {ground}; site forest rows {top}-{bottom}')
    return {'background': {'w': w, 'h': h, 'groundRow': ground}}


def import_portrait() -> dict:
    """One bust for the game's player card and the site's portrait (pixelate.py face)."""
    keyed = load_keyed(FLOW / 'portrait.jpg')
    box = sprite_bbox(keyed)
    if box is None:
        raise SystemExit('portrait.jpg is empty')
    ya, yb, xa, xb = box
    crop = keyed[ya:yb, xa:xb]
    card, face = P.reduce_palette(
        [to_native(crop, crop.shape[0] / PORTRAIT_H), to_native(crop, crop.shape[0] / FACE_H)],
        P.PALETTE['face'])
    w, h = save_native(card, P.GAME_SPRITES / 'portrait.png')
    fw, fh = save_native(face, P.DESIGN_SRC / 'face-large.png')
    print(f'  portrait {w}x{h} (game card), {fw}x{fh} (site face)')
    return {'portrait': {'w': w, 'h': h}}


TS_TEMPLATE = '''/**
 * GENERATED by scripts/pixelate/import_flow.py. Do not edit by hand; re-run the script.
 *
 * Native (one PNG pixel per art pixel) sizes of the Roy Runner sprites in
 * /public/assets/sprites. The game draws them 1:1 so the pixel grid stays crisp.
 */

export interface Size {{
  readonly w: number;
  readonly h: number;
}}

export const SPRITE_SIZES = {body} as const;
'''


def ts_literal(value: object, indent: int = 0) -> str:
    pad = '  ' * (indent + 1)
    key = (lambda k: f"'{k}'" if '-' in k else k)
    if isinstance(value, dict) and not any(isinstance(v, dict) for v in value.values()):
        return '{ ' + ', '.join(f'{key(k)}: {v}' for k, v in value.items()) + ' }'
    if isinstance(value, dict):
        items = ',\n'.join(f"{pad}'{k}': {ts_literal(v, indent + 1)}" if '-' in k
                           else f'{pad}{k}: {ts_literal(v, indent + 1)}'
                           for k, v in value.items())
        return '{\n' + items + ',\n' + '  ' * indent + '}'
    return str(value)


def main() -> None:
    argparse.ArgumentParser(description=__doc__.split('\n\n')[0]).parse_args()
    print('import:')
    sizes: dict = {}
    for step in (import_player, import_obstacles, import_background, import_portrait):
        sizes.update(step())
    SIZES_TS.write_text(TS_TEMPLATE.format(body=ts_literal(sizes)))
    print(f'wrote {SIZES_TS.relative_to(P.ROOT)}')


if __name__ == '__main__':
    main()
