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
MIN_SPRITE_W = 40     # narrower shapes on a one-row sheet are specks, not a figure
CUT_COARSE = 4        # cell size (px) of the mask cut_row finds figures on
# Native height of a standing Roy, in the game and on the site. Flow draws him about this
# tall on a one-row sheet; much smaller and his 2 px eyes start to drop out (a "wink").
STAND_H = 92
SIT_TO_STAND = 0.98   # Roy on his stool is this share of his standing height (old art: 69/70)
# Real-world sizes set every sprite's height, so the cast stands in true proportion to Roy and
# to the forest. The scale comes from Roy (an adult, ROY_M tall, is STAND_H px) and agrees with
# the background: its fence (18.5 native rows, 46 px at the game's 2.5x) comes out at 0.88 m.
ROY_M = 1.75
PX_PER_M = STAND_H / ROY_M
# Height in metres of each obstacle as drawn (tail, ears or cap included).
OBSTACLE_M = {
    'racoon': 0.5, 'stump': 0.7, 'stump-moss': 0.6, 'rock': 0.55, 'mushrooms': 0.5,
    'toadstools': 0.3, 'agave': 0.7, 'bird-blue': 0.25, 'bird-brown': 0.25,
    'beetle': 0.3, 'hedgehog': 0.25, 'bat': 0.25,
}
# At true size the animals read as specks in a game, so like most platformers the cast is
# exaggerated: real heights times OBSTACLE_EXAGGERATION, keeping their real order (a stump
# above a raccoon above a hedgehog), and nothing under MIN_OBSTACLE_H. The tallest, a stump,
# lands about the fence's height and half of Roy's.
OBSTACLE_EXAGGERATION = 1.35
MIN_OBSTACLE_H = 32
# Contrast rim around the obstacles (see contrast_rim).
RIM_PX = 1
RIM_INK = (13, 22, 8)          # the HUD's ink, a near-black forest green
RIM_LIGHT = (243, 231, 194)    # the HUD's parchment
RIM_ALPHA = 0.45
OUTLINE_LUMA = 70              # an edge pixel brighter than this gets the dark outline
GROUND_RIM_SKIP = 3            # bottom rows of a grounded sprite that get no light rim
PORTRAIT_H = 56       # fits the 76 px player card (HUD_CONFIG) with its frame
FACE_H = 49           # the site's portrait height (navbar, About, chat), unchanged
# The site's scenes were tuned to a 67 px Roy in front of a 240x112 forest with its grass at
# row 101; the forest window keeps those proportions around the larger Roy.
SITE_SCALE = STAND_H / 67
FOREST_W, FOREST_H = round(240 * SITE_SCALE), round(112 * SITE_SCALE)
FOREST_GROUND_ROW = round(101 * SITE_SCALE)
BG_TOP_PAD = 2        # canopy rows repeated on top of the background (see import_background)
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
    # Its standing figure only scales stand-2; the slide is sized by head (import_player).
    RoySheet(Sheet('roy_slide_stand.jpg', 4, 1, 3), ('slide-2', 'slide-3', 'stand-2'), ref=2),
    # Drop into the slide and get up again; sized by face like the slide (import_player).
    RoySheet(Sheet('roy_slide_moves.jpg', 4, 1, 4), ('slide-in-1', 'slide-in-2', 'slide-out-1', 'slide-out-2'), ref=0),
    RoySheet(Sheet('roy_sit.jpg', 4, 1, 3), ('sit-1', 'sit-2', 'sit-3'), ref=0,
             ref_h=SIT_TO_STAND),
)
# Run 1-4 has no standing frame; it is scaled so its run frames match run 5-7.
RUN_A = Sheet('roy_run_a.jpg', 4, 1, 4)
RUN_A_NAMES = ('run-1', 'run-2', 'run-3', 'run-4')
SLIDE = ('slide-2', 'slide-3')
SLIDE_MOVES = ('slide-in-1', 'slide-in-2', 'slide-out-1', 'slide-out-2')
# Upright frames whose head size the slide is matched to (see import_player).
HEAD_REFERENCE = ('wave-1', 'wave-3', 'run-5', 'run-6', 'run-7')
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


def _label(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """4-connected component labels of a boolean mask (0 = background)."""
    labels = np.zeros(mask.shape, np.int32)
    n = 0
    for y, x in zip(*np.nonzero(mask)):
        if labels[y, x]:
            continue
        n += 1
        labels[y, x] = n
        stack = [(y, x)]
        while stack:
            cy, cx = stack.pop()
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if (0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1]
                        and mask[ny, nx] and not labels[ny, nx]):
                    labels[ny, nx] = n
                    stack.append((ny, nx))
    return labels, n


def cut_row(rgba: np.ndarray, sheet: Sheet) -> list[np.ndarray]:
    """The figures of a one-row sheet, left to right, each with only its own pixels.

    Flow does not keep a figure inside its grid column (a slide spills over) and figures
    sometimes touch (a trailing hand, a foot against the next figure), so the figures are
    found as connected shapes on a coarse, slightly eroded mask, which breaks thin contacts.
    """
    solid = rgba[..., 3] > P.SOLID_ALPHA
    f = CUT_COARSE
    h, w = solid.shape[0] // f * f, solid.shape[1] // f * f
    coarse = solid[:h, :w].reshape(h // f, f, w // f, f).any(axis=(1, 3))
    eroded = coarse.copy()
    eroded[1:] &= coarse[:-1]
    eroded[:-1] &= coarse[1:]
    eroded[:, 1:] &= coarse[:, :-1]
    eroded[:, :-1] &= coarse[:, 1:]
    labels, n = _label(eroded)
    shapes = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(labels == k)
        if (xs.max() - xs.min() + 1) * f >= MIN_SPRITE_W:
            shapes.append((xs.mean(), k))
    if len(shapes) != sheet.count:
        raise SystemExit(f'{sheet.file}: found {len(shapes)} figures, expected {sheet.count}')
    # Every solid pixel goes to the nearest figure (by coarse cell), undoing the erosion.
    full = np.zeros(solid.shape, np.int32)
    full[:h, :w] = np.repeat(np.repeat(labels, f, 0), f, 1)
    owner = full.copy()
    for _ in range(3 * f):  # grow labels back over the eroded rim, within the solid mask
        grown = owner.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            shifted = np.roll(owner, (dy, dx), (0, 1))
            grown = np.where((grown == 0) & (shifted > 0) & solid, shifted, grown)
        owner = grown
    crops = []
    for _, k in sorted(shapes):
        part = np.where((owner == k)[..., None], rgba, 0).astype(np.uint8)
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
    """Save via pixelate.save_png (or as RGBA when it has soft alpha), then tag it native."""
    alpha = img[..., 3]
    if ((alpha > 0) & (alpha < 255)).any():
        # save_png keeps only on/off transparency; the contrast rim needs its soft alpha.
        info = PngImagePlugin.PngInfo()
        info.add_text(P.NATIVE_KEY, '1')
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(np.clip(np.round(img), 0, 255).astype(np.uint8), 'RGBA').save(
            path, optimize=True, pnginfo=info)
        return img.shape[1], img.shape[0]
    P.save_png(img, path)
    with Image.open(path) as src:
        im = src.copy()  # fully read before the same path is written again
        transparency = src.info.get('transparency')
    info = PngImagePlugin.PngInfo()
    info.add_text(P.NATIVE_KEY, '1')
    kwargs = {'transparency': transparency} if transparency is not None else {}
    im.save(path, optimize=True, pnginfo=info, **kwargs)
    return img.shape[1], img.shape[0]


def head_size(sprite: np.ndarray) -> float:
    """Square root of the area of Roy's face (the largest skin-coloured blob; his hands are
    smaller): a size reference that, unlike his height or his hair's extent, holds in every
    pose, upright or lying with his head tilted back."""
    r, g, b, a = (sprite[..., i].astype(int) for i in range(4))
    skin = ((a > 0) & (r >= 150) & (r - g >= 25) & (r - g <= 90) & (g - b >= 15)
            & (b >= 60) & (b <= 170))
    f = CUT_COARSE
    h, w = skin.shape[0] // f * f, skin.shape[1] // f * f
    cells = skin[:h, :w].reshape(h // f, f, w // f, f).mean(axis=(1, 3)) > 0.5
    labels, n = _label(cells)
    if n == 0:
        raise SystemExit('head_size: no face found')
    return float(np.sqrt(max((labels == k).sum() for k in range(1, n + 1)))) * f


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

    # A lying pose has no standing height to measure, and Flow draws the slide sheet's
    # standing figure at its own scale: size the slide so Roy's face matches his upright one.
    upright = np.median([head_size(crops[n]) * scale[n] for n in HEAD_REFERENCE])
    for group in (SLIDE, SLIDE_MOVES):
        k = float(upright) / float(np.median([head_size(crops[n]) for n in group]))
        for name in group:
            scale[name] = k

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
    moves_sheet, mw, mh, _ = P.build_sheet([art[n] for n in SLIDE_MOVES])
    for name, frame in zip(SLIDE_MOVES, split_sheet(moves_sheet, mw, len(SLIDE_MOVES))):
        save_native(frame, P.GAME_SPRITES / f'{name}.png')

    # Transparent rows above the tallest slide frame: the game places the air obstacles
    # against the slide's visible top, not its frame.
    slide_top = int(np.argmax((slide_sheet[..., 3] > 0).any(1)))

    for name in SITE_SOURCES:
        save_native(art[name], P.DESIGN_SRC / f'{name}.png')

    print(f'  player {fw}x{fh}, slide {sw}x{sh}, '
          + ', '.join(f'{n} {art[n].shape[1]}x{art[n].shape[0]}' for n in SITE_ONLY))
    return {'player': {'w': fw, 'h': fh}, 'slide': {'w': sw, 'h': sh, 'top': slide_top},
            'slideMove': {'w': mw, 'h': mh}}


def _grow4(mask: np.ndarray) -> np.ndarray:
    out = mask.copy()
    out[1:] |= mask[:-1]
    out[:-1] |= mask[1:]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def contrast_rim(img: np.ndarray, grounded: bool) -> np.ndarray:
    """Add a dark outline where the art's own edge is light, and a soft light rim outside it.

    Brown and dark-green obstacles otherwise melt into the forest's trunks and bushes (a
    review measured up to 43% of a hedgehog's pixels within 40 RGB of what is behind it).
    For a grounded sprite nothing is added under its bottom row (its feet stay on the feet
    line) and no light rim is drawn in its bottom rows, where it would glow against the grass
    between roots and paws; air sprites get the rim all round.
    """
    pad = RIM_PX + 1
    below = 0 if grounded else pad
    a = np.zeros((img.shape[0] + pad + below, img.shape[1] + 2 * pad, 4))
    a[pad:pad + img.shape[0], pad:-pad] = img
    solid = a[..., 3] > 0
    luma = a[..., :3].mean(2)
    light_edge = solid & (luma > OUTLINE_LUMA)
    ring1 = _grow4(solid) & ~solid
    ink = ring1 & _grow4(light_edge)
    a[ink] = [*RIM_INK, 255]
    inner = solid | ink
    rim = _grow4(inner) & ~inner
    if grounded:
        rim[-GROUND_RIM_SKIP:] = False
    a[rim] = [*RIM_LIGHT, round(255 * RIM_ALPHA)]
    return P.crop(a)


def obstacle_height(name: str) -> int:
    return max(MIN_OBSTACLE_H, round(OBSTACLE_M[name] * PX_PER_M * OBSTACLE_EXAGGERATION))


def import_obstacles() -> dict:
    names, native = [], []
    for sheet, sheet_names in ((OBSTACLES, OBSTACLE_NAMES), (CRITTERS, CRITTER_NAMES)):
        crops = cut_cells(load_keyed(FLOW / sheet.file), sheet)
        names += sheet_names
        # Area-averaged straight to the drawn size, so the game draws each one 1:1.
        native += [downscale(c, obstacle_height(n)) for n, c in zip(sheet_names, crops)]
    native = P.reduce_palette(native, OBSTACLE_COLORS)
    sizes = {}
    for name, img in zip(names, native):
        if name in FACING_RIGHT:
            img = img[:, ::-1].copy()
        w, h = save_native(contrast_rim(img, grounded=name not in AIR), P.GAME_SPRITES / f'{name}.png')
        sizes[name] = {'w': w, 'h': h}
    print('  obstacles ' + ', '.join(f'{n} {s["w"]}x{s["h"]}' for n, s in sizes.items()))
    return {'obstacles': sizes}


def import_background() -> dict:
    rgb = np.asarray(Image.open(FLOW / 'background.jpg').convert('RGB'))
    rgba = np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)])
    ax = P.Axis(BG_PERIOD, 0.0, 0.0)
    bg = P.reduce_palette([P.sample(rgba, ax, ax)], BG_COLORS)[0]
    # The game draws the forest at 2.5x with its grass line pinned to the ground, which
    # leaves its top a few px short of the canvas top: repeat the canopy's top row to cover it.
    bg = np.concatenate([np.repeat(bg[:1], BG_TOP_PAD, axis=0), bg])
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
