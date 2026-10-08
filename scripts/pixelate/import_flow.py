"""Import the Flow sprite sheets in design-src/flow into native-resolution sprites.

The game and site art is generated in Google Flow (Nano Banana) from the current sprites as
reference: each animation is one sheet on a flat magenta matte, so every frame of an
animation is drawn in one pass and stays on-model. This script turns those sheets into the
files the game loads and the sources pixelate.py reads:

1. Key out the magenta matte and pull the purple fringe it leaves back to neutral.
2. Cut each sheet into its sprites: Roy's one-row sheets on the empty columns between
   figures, the obstacle sheets on their grid cells.
3. Resample to native size. Roy is area-averaged (downscale) so a standing Roy is STAND_H px
   tall on every sheet; the obstacles use pixelate.sample with one period per sheet.
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
MIN_SPRITE_W = 40     # narrower column runs on a one-row sheet are specks, not a figure
# Native height of a standing Roy, in the game and on the site. Flow draws him about this
# tall on a one-row sheet; much smaller and his 2 px eyes start to drop out (a "wink").
STAND_H = 92
SIT_TO_STAND = 0.98   # Roy on his stool is this share of his standing height (old art: 69/70)
GROUND_OBSTACLE_H = 52  # native median height of the ground obstacles (they were 52-54)
CRITTER_H = 40        # the beetle and hedgehog are low, quick critters
PORTRAIT_H = 56       # fits the 76 px player card (HUD_CONFIG) with its frame
FACE_H = 49           # the site's portrait height (navbar, About, chat), unchanged
# The site's scenes were tuned to a 67 px Roy in front of a 240x112 forest with its grass at
# row 101; the forest window keeps those proportions around the larger Roy.
SITE_SCALE = STAND_H / 67
FOREST_W, FOREST_H = round(240 * SITE_SCALE), round(112 * SITE_SCALE)
FOREST_GROUND_ROW = round(101 * SITE_SCALE)
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


@dataclass(frozen=True)
class RoySheet:
    """One row of Roy poses. `ref` is the frame that sets the sheet's scale: it is drawn
    `ref_h` (a share of STAND_H) tall, so Roy keeps one size across sheets that Flow drew
    at slightly different scales."""

    sheet: Sheet
    names: tuple[str, ...]
    ref: int
    ref_h: float = 1.0


ROY_SHEETS = (
    RoySheet(Sheet('roy_wave_idle.jpg', 4, 1, 4), ('wave-1', 'wave-2', 'wave-3', 'idle'), ref=0),
    RoySheet(Sheet('roy_run_b.jpg', 4, 1, 4), ('run-5', 'run-6', 'run-7', 'stand-1'), ref=3),
    RoySheet(Sheet('roy_jump.jpg', 4, 1, 4), ('jump-1', 'jump-2', 'jump-3', 'jump-4'), ref=0),
    RoySheet(Sheet('roy_slide_stand.jpg', 4, 1, 3), ('slide-2', 'slide-3', 'stand-2'), ref=2),
    RoySheet(Sheet('roy_sit.jpg', 4, 1, 3), ('sit-1', 'sit-2', 'sit-3'), ref=0,
             ref_h=SIT_TO_STAND),
)
# Run 1-4 has no standing frame; it is scaled so its run frames match run 5-7.
RUN_A = Sheet('roy_run_a.jpg', 4, 1, 4)
RUN_A_NAMES = ('run-1', 'run-2', 'run-3', 'run-4')
SLIDE = ('slide-2', 'slide-3')
SITE_ONLY = ('sit-1', 'sit-2', 'sit-3')
SITE_SOURCES = ('wave-1', 'wave-2', 'wave-3', *SITE_ONLY)
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


def cut_row(rgba: np.ndarray, sheet: Sheet) -> list[np.ndarray]:
    """Sprites of a one-row sheet, split on the empty columns between them. Flow does not
    always keep a figure inside its column (a wide slide pose spills over), so the gaps
    are more reliable than the grid."""
    solid = rgba[..., 3] > P.SOLID_ALPHA
    used = solid.sum(0) >= SPECK_MIN
    runs, start = [], None
    for x, on in enumerate([*used, False]):
        if on and start is None:
            start = x
        elif not on and start is not None:
            runs.append((start, x))
            start = None
    runs = [r for r in runs if r[1] - r[0] >= MIN_SPRITE_W]
    if len(runs) != sheet.count:
        raise SystemExit(f'{sheet.file}: found {len(runs)} sprites, expected {sheet.count}')
    crops = []
    for x0, x1 in runs:
        part = rgba[:, x0:x1]
        ya, yb, xa, xb = sprite_bbox(part)
        crops.append(part[ya:yb, xa:xb])
    return crops


def to_native(crop: np.ndarray, period: float) -> np.ndarray:
    ax = P.Axis(period, 0.0, 0.0)
    return P.crop(P.cleanup(P.sample(crop, ax, ax)))


def downscale(crop: np.ndarray, height: int) -> np.ndarray:
    """Area-average a sprite to `height` px (alpha-premultiplied, so the matte cannot tint
    the edges). Unlike sampling one median per cell, an area average cannot drop a feature
    thinner than a cell, which is what made Roy's eyes vanish at off-grid scales; the shared
    palette applied afterwards snaps the averaged colors back to flat pixel-art tones."""
    width = max(1, round(crop.shape[1] * height / crop.shape[0]))
    a = crop.astype(np.float64)
    alpha = a[..., 3:4] / 255
    premul = np.dstack([a[..., :3] * alpha, a[..., 3:4]]).round().astype(np.uint8)
    small = np.asarray(Image.fromarray(premul).resize((width, height), Image.BOX))
    small = small.astype(np.float64)
    cover = small[..., 3:4] / 255
    rgb = np.where(cover > 0, small[..., :3] / np.maximum(cover, 1e-6), 0)
    solid = small[..., 3] >= P.SOLID_ALPHA
    out = np.dstack([np.clip(rgb, 0, 255), np.where(solid, 255, 0)])
    return P.crop(P.cleanup(out))


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
    crops: dict[str, np.ndarray] = {}
    scale: dict[str, float] = {}  # native px per source px, per frame
    for roy in ROY_SHEETS:
        cells = cut_row(load_keyed(FLOW / roy.sheet.file), roy.sheet)
        k = STAND_H * roy.ref_h / cells[roy.ref].shape[0]
        for name, cell in zip(roy.names, cells):
            crops[name], scale[name] = cell, k
    cells = cut_row(load_keyed(FLOW / RUN_A.file), RUN_A)
    target = np.median([crops[f'run-{i}'].shape[0] * scale[f'run-{i}'] for i in (5, 6, 7)])
    k = float(target) / float(np.median([c.shape[0] for c in cells]))
    for name, cell in zip(RUN_A_NAMES, cells):
        crops[name], scale[name] = cell, k

    names = list(crops)
    native = [downscale(crops[n], max(1, round(crops[n].shape[0] * scale[n]))) for n in names]
    art = dict(zip(names, P.reduce_palette(native, PLAYER_COLORS)))

    # One frame size for every pose drawn in the player box, so poses keep one scale.
    upright = ([f'wave-{i}' for i in (1, 2, 3)] + [f'run-{i}' for i in range(1, 8)]
               + [f'jump-{i}' for i in range(1, 5)] + ['stand-1', 'stand-2', 'idle'])
    sheet, fw, fh, _ = P.build_sheet([art[n] for n in upright])
    for name, frame in zip(upright, split_sheet(sheet, fw, len(upright))):
        save_native(frame, P.GAME_SPRITES / f'{name}.png')

    slide_sheet, sw, sh, _ = P.build_sheet([art[n] for n in SLIDE])
    for name, frame in zip(SLIDE, split_sheet(slide_sheet, sw, len(SLIDE))):
        save_native(frame, P.GAME_SPRITES / f'{name}.png')

    for name in SITE_SOURCES:
        save_native(art[name], P.DESIGN_SRC / f'{name}.png')

    print(f'  player {fw}x{fh}, slide {sw}x{sh}, '
          + ', '.join(f'{n} {art[n].shape[1]}x{art[n].shape[0]}' for n in SITE_ONLY))
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
