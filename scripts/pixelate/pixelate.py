#!/usr/bin/env python3
"""Recover native-resolution pixel art from the hi-res AI exports.

The character sprites and the forest were exported as "pixel art" at roughly 10-12 screen
pixels per logical pixel, with soft (anti-aliased) block edges and thousands of noisy colors.
This script recovers the true logical grid of every source, resamples it to one color per
logical pixel, cleans it up and writes small, crisp PNGs plus a typed metadata module:

    public/assets/pixel/roy-wave.png   3-frame sheet (wave-1 arms down, wave-2, wave-3)
    public/assets/pixel/roy-sit.png    3-frame sheet (sit-1, sit-2, sit-3 mirrored)
    public/assets/pixel/roy-idle.png   1 frame (the arms-down wave-1 pose)
    public/assets/pixel/roy-face.png   portrait (face-large)
    public/assets/pixel/forest.png     hero backdrop (background)
    src/theme/pixelSprites.ts          generated metadata (sizes, frames, timing, ground row)

Pipeline per source image:

1. Grid detection, per axis. Edge energy E[i] = sum over rows (or columns) of the RGB step
   |p[i+1] - p[i]|, counted only where both pixels are solid (alpha > 128). The grid is the
   (period p, phase o) that maximises the mean of E sampled on the lines round(o + k*p), with
   p in [9.5, 12.5] (step 0.01) and o in [0, p) (step 0.25). The coarse result is refined by a
   weighted least-squares fit of the actual edge peaks found near each predicted line.
2. Cell sampling. A cell is solid when at least half of its source pixels are solid. Its color
   is the per-channel median of the fully opaque pixels (alpha >= 250) in the central 50% of
   the cell, which ignores the soft block edges and the green matte baked into the
   semi-transparent fringe (no halo).
3. Clean-up. Solid pixels with no solid 4-neighbour are removed (stray pixels); transparent
   pixels whose four neighbours are solid are filled (pin holes). The result is cropped to
   its bounding box.
4. Palette. Every sprite group (one sheet, or one image) is clustered with k-means in OKLab
   (deterministic k-means++ seed) and each pixel snaps to its cluster's median color, so flat
   areas are flat and all frames of a sheet share exactly the same colors.
5. Sheets. Frames share one canvas (max width/height), are bottom aligned, and are aligned
   horizontally on the centroid of the solid pixels in their bottom 40% (legs and feet), then
   nudged by up to 2px so the shoe silhouettes match frame 0 exactly (a hanging hand inside
   the 40% band would otherwise pull the centroid by a pixel). The feet do not jitter.
6. Forest ground row: the first grass row under the dark ground outline. A sprite whose
   bottom edge sits on that row (bottom offset = (h - groundRow) x scale) stands on the grass.

Scale check: every source except wave-2 has a ~11.47px grid (the forest too, so the character
and the forest share one logical pixel size); wave-2 was exported at ~10.5px per pixel and
recovers to the same 67-row height as wave-1/3, so all frames share one logical scale.

Run from anywhere: `python3 scripts/pixelate/pixelate.py` (add `-v` for grid diagnostics).
The output is deterministic for a given numpy/Pillow version.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
GAME_SPRITES = ROOT / 'public' / 'assets' / 'sprites'   # also loaded by the mini-game
DESIGN_SRC = ROOT / 'design-src' / 'sprites'            # pipeline-only sources
OUT_DIR = ROOT / 'public' / 'assets' / 'pixel'
TS_OUT = ROOT / 'src' / 'theme' / 'pixelSprites.ts'
PUBLIC_PREFIX = '/assets/pixel'

PERIOD_MIN, PERIOD_MAX, PERIOD_STEP = 9.5, 12.5, 0.01
PHASE_STEP = 0.25
SOLID_ALPHA = 128
OPAQUE_ALPHA = 250
INNER = 0.5            # fraction of the cell (per axis) used for the color median
FEET_FRACTION = 0.4    # bottom share of the frame used for the horizontal anchor

# Colors per palette group. Chosen by eye on the review sheets: enough ramps for skin and
# denim to stay smooth, few enough that flat areas stop shimmering.
PALETTE = {'wave': 40, 'sit': 40, 'face': 48, 'forest': 48}

FRAME_MS = {'wave': 400, 'sit': 500, 'idle': 0}


# ── Grid detection ─────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Axis:
    """One axis of a pixel grid: cell k spans [offset + k*period, offset + (k+1)*period)."""

    period: float
    offset: float
    score: float  # peak energy / mean energy (higher = clearer grid)

    def starts(self, length: int) -> np.ndarray:
        """Start of every cell that lies at least half inside [0, length)."""
        k = np.arange(-1, int(np.ceil((length - self.offset) / self.period)) + 1)
        s = self.offset + k * self.period
        inside = np.minimum(s + self.period, length) - np.maximum(s, 0)
        return s[inside >= self.period / 2]


def load_rgba(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert('RGBA')).astype(np.float64)


def edge_energy(a: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Edge energy between neighbouring columns (x) and rows (y). E[i] is the step i -> i+1."""
    rgb, solid = a[..., :3], a[..., 3] > SOLID_ALPHA
    dx = np.abs(np.diff(rgb, axis=1)).sum(2) * (solid[:, 1:] & solid[:, :-1])
    dy = np.abs(np.diff(rgb, axis=0)).sum(2) * (solid[1:, :] & solid[:-1, :])
    return dx.sum(0), dy.sum(1)


def search_axis(e: np.ndarray) -> Axis:
    """Coarse exhaustive search of (period, phase) maximising mean energy on grid lines."""
    n = len(e) + 1
    best = Axis(0.0, 0.0, -1.0)
    mean = e.mean() or 1.0
    for p in np.arange(PERIOD_MIN, PERIOD_MAX + 1e-9, PERIOD_STEP):
        phases = np.arange(0.0, p, PHASE_STEP)
        k = np.arange(0, int(n / p) + 2)
        idx = np.round(phases[:, None] + k[None, :] * p).astype(int) - 1  # boundary -> step index
        valid = (idx >= 0) & (idx < len(e))
        vals = np.where(valid, e[np.clip(idx, 0, len(e) - 1)], 0.0)
        scores = vals.sum(1) / np.maximum(valid.sum(1), 1)
        i = int(np.argmax(scores))
        if scores[i] > best.score * mean:
            best = Axis(float(p), float(phases[i]), float(scores[i] / mean))
    return best


def refine_axis(e: np.ndarray, ax: Axis, rounds: int = 2) -> Axis:
    """Least-squares fit of the real edge peaks near each predicted grid line."""
    n = len(e) + 1
    p, o = ax.period, ax.offset
    for _ in range(rounds):
        ks, pos, w = [], [], []
        for k in range(0, int(n / p) + 2):
            c = o + k * p                      # boundary position (between pixels c-1 and c)
            i = int(round(c)) - 1              # step index
            lo, hi = max(1, i - 3), min(len(e) - 1, i + 4)
            if hi - lo < 3:
                continue
            j = lo + int(np.argmax(e[lo:hi]))
            if e[j] < 1.5 * e.mean() or j in (lo, hi - 1):
                continue
            a_, b_, c_ = e[j - 1], e[j], e[j + 1]  # parabolic sub-pixel peak
            den = a_ - 2 * b_ + c_
            sub = 0.5 * (a_ - c_) / den if den != 0 else 0.0
            ks.append(k); pos.append(j + 1 + sub); w.append(e[j])
        if len(ks) < 6:
            return ax
        ks_, pos_, w_ = np.array(ks, float), np.array(pos), np.sqrt(np.array(w))
        A = np.stack([ks_, np.ones_like(ks_)], 1) * w_[:, None]
        (p_new, o_new), *_ = np.linalg.lstsq(A, pos_ * w_, rcond=None)
        if not (PERIOD_MIN - 0.5 < p_new < PERIOD_MAX + 0.5):
            return ax
        p, o = float(p_new), float(o_new % p_new)
    return Axis(p, o, ax.score)


def detect_grid(a: np.ndarray) -> tuple[Axis, Axis]:
    ex, ey = edge_energy(a)
    return refine_axis(ex, search_axis(ex)), refine_axis(ey, search_axis(ey))


# ── Sampling and clean-up ──────────────────────────────────────────────────────────────


def sample(a: np.ndarray, gx: Axis, gy: Axis) -> np.ndarray:
    """One RGBA value per logical cell (alpha is 0 or 255)."""
    h, w, _ = a.shape
    xs, ys = gx.starts(w), gy.starts(h)
    alpha = a[..., 3]
    out = np.zeros((len(ys), len(xs), 4), np.float64)

    def span(s: float, p: float, lim: int, frac: float) -> tuple[int, int]:
        m = (1 - frac) / 2
        lo, hi = int(np.ceil(s + p * m - 1e-6)), int(np.floor(s + p * (1 - m) - 1e-6)) + 1
        return max(lo, 0), min(hi, lim)

    for j, y0 in enumerate(ys):
        fy = span(y0, gy.period, h, 1.0)
        iy = span(y0, gy.period, h, INNER)
        for i, x0 in enumerate(xs):
            fx = span(x0, gx.period, w, 1.0)
            ix = span(x0, gx.period, w, INNER)
            full = alpha[fy[0]:fy[1], fx[0]:fx[1]]
            if full.size == 0 or (full > SOLID_ALPHA).mean() < 0.5:
                continue
            px = None
            for (ya, yb), (xa, xb), thr, need in (
                (iy, ix, OPAQUE_ALPHA, 4), (fy, fx, OPAQUE_ALPHA, 4), (fy, fx, SOLID_ALPHA, 1),
            ):
                blk = a[ya:yb, xa:xb].reshape(-1, 4)
                blk = blk[blk[:, 3] >= thr]
                if len(blk) >= need:
                    px = blk
                    break
            if px is None:
                continue
            out[j, i, :3] = np.median(px[:, :3], axis=0)
            out[j, i, 3] = 255
    return out


def neighbours4(mask: np.ndarray) -> np.ndarray:
    p = np.pad(mask, 1)
    return p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]


def cleanup(img: np.ndarray) -> np.ndarray:
    img = img.copy()
    solid = img[..., 3] > 0
    n = neighbours4(solid)
    img[solid & (n == 0)] = 0                                   # stray pixels
    solid = img[..., 3] > 0
    holes = ~solid & (neighbours4(solid) == 4)                  # pin holes
    pad = np.pad(img, ((1, 1), (1, 1), (0, 0)))
    for y, x in zip(*np.nonzero(holes)):
        nb = np.stack([pad[y, x + 1], pad[y + 2, x + 1], pad[y + 1, x], pad[y + 1, x + 2]])
        img[y, x, :3] = np.median(nb[:, :3], axis=0)
        img[y, x, 3] = 255
    return img


def crop(img: np.ndarray) -> np.ndarray:
    ys, xs = np.nonzero(img[..., 3] > 0)
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def pixelate(path: Path, verbose: bool = False, keep_bounds: bool = False) -> np.ndarray:
    a = load_rgba(path)
    gx, gy = detect_grid(a)
    out = cleanup(sample(a, gx, gy))
    if not keep_bounds:
        out = crop(out)
    if verbose:
        print(f'  {path.name:18s} grid x p={gx.period:6.3f} o={gx.offset:6.3f} (x{gx.score:.2f})'
              f'  y p={gy.period:6.3f} o={gy.offset:6.3f} (x{gy.score:.2f})'
              f'  -> {out.shape[1]}x{out.shape[0]}')
    return out


# ── Palette (k-means in OKLab) ─────────────────────────────────────────────────────────


def _srgb_to_oklab(rgb: np.ndarray) -> np.ndarray:
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    return np.cbrt(lin @ m1.T) @ m2.T


def _kmeans(x: np.ndarray, k: int, iters: int = 60) -> np.ndarray:
    rng = np.random.default_rng(0)
    centers = [x[rng.integers(len(x))]]
    d = ((x - centers[0]) ** 2).sum(1)
    for _ in range(1, k):
        centers.append(x[rng.choice(len(x), p=d / d.sum())])
        d = np.minimum(d, ((x - centers[-1]) ** 2).sum(1))
    c = np.array(centers)
    labels = np.zeros(len(x), int)
    for _ in range(iters):
        labels = np.argmin(((x[:, None, :] - c[None]) ** 2).sum(-1), axis=1)
        new = np.array([x[labels == i].mean(0) if np.any(labels == i) else c[i] for i in range(k)])
        if np.allclose(new, c, atol=1e-7):
            break
        c = new
    return labels


def reduce_palette(images: list[np.ndarray], k: int) -> list[np.ndarray]:
    """Snap all solid pixels of a group of images to one shared k-color palette."""
    solid = [im[..., 3] > 0 for im in images]
    px = np.concatenate([im[m][:, :3] for im, m in zip(images, solid)])
    uniq, inv = np.unique(np.round(px).astype(int), axis=0, return_inverse=True)
    if len(uniq) <= k:
        return [np.round(im) for im in images]
    labels_u = _kmeans(_srgb_to_oklab(uniq.astype(float)), k)
    labels = labels_u[inv.ravel()]
    palette = np.array([np.median(px[labels == i], axis=0) if np.any(labels == i) else [0, 0, 0]
                        for i in range(k)])
    snapped = np.round(palette[labels])
    out, off = [], 0
    for im, m in zip(images, solid):
        im = im.copy()
        n = int(m.sum())
        im[m, :3] = snapped[off:off + n]
        off += n
        out.append(np.round(im))
    return out


# ── Sheets ─────────────────────────────────────────────────────────────────────────────


def feet_anchor(img: np.ndarray, fraction: float = FEET_FRACTION) -> float:
    """x centroid of the solid pixels in the bottom `fraction` of the image."""
    h = img.shape[0]
    top = int(round(h * (1 - fraction)))
    ys, xs = np.nonzero(img[top:, :, 3] > 0)
    return float(xs.mean() + 0.5)


def _feet_mismatch(a: np.ndarray, xa: int, b: np.ndarray, xb: int, rows: int) -> int:
    """Number of differing solid pixels in the bottom `rows` rows of two placed frames."""
    lo, hi = min(xa, xb), max(xa + a.shape[1], xb + b.shape[1])
    ma = np.zeros((rows, hi - lo), bool)
    mb = np.zeros((rows, hi - lo), bool)
    ma[:, xa - lo:xa - lo + a.shape[1]] = a[-rows:, :, 3] > 0
    mb[:, xb - lo:xb - lo + b.shape[1]] = b[-rows:, :, 3] > 0
    return int((ma ^ mb).sum())


def build_sheet(frames: list[np.ndarray]) -> tuple[np.ndarray, int, int, int]:
    """Bottom-align frames on their feet. Returns (sheet, frameW, frameH, anchorX).

    Each frame is first placed on the centroid of its bottom 40% (legs and feet). When one arm
    hangs down in one frame and is raised in the next, the hand sits inside that band and
    pulls the centroid by a pixel, so each frame is then nudged by up to 2px to minimise the
    silhouette difference of the bottom rows (shoes) against frame 0.
    """
    xs = [-int(np.floor(feet_anchor(f))) for f in frames]  # left edge relative to the anchor
    rows = max(6, int(round(min(f.shape[0] for f in frames) * 0.15)))
    for i in range(1, len(frames)):
        base = xs[i]
        xs[i] = min(range(base - 2, base + 3),
                    key=lambda x: (_feet_mismatch(frames[0], xs[0], frames[i], x, rows),
                                   abs(x - base)))
    left = -min(xs)
    fw = max(x + f.shape[1] for f, x in zip(frames, xs)) + left
    fh = max(f.shape[0] for f in frames)
    sheet = np.zeros((fh, fw * len(frames), 4), np.float64)
    for i, (f, x) in enumerate(zip(frames, xs)):
        x0, y0 = i * fw + x + left, fh - f.shape[0]
        sheet[y0:y0 + f.shape[0], x0:x0 + f.shape[1]] = f
    # Reported anchor: the centre of the shoes of frame 0, in frame coordinates.
    anchor = int(np.floor(feet_anchor(frames[0], 0.15))) + xs[0] + left
    return sheet, fw, fh, anchor


# ── Output ─────────────────────────────────────────────────────────────────────────────


def save_png(img: np.ndarray, path: Path) -> int:
    """Save as an indexed PNG when it fits in 256 colors (exact, no dithering), else RGBA."""
    arr = np.clip(np.round(img), 0, 255).astype(np.uint8)
    solid = arr[..., 3] > 0
    has_alpha = not solid.all()
    colors, inv = np.unique(arr[solid][:, :3], axis=0, return_inverse=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    if len(colors) + int(has_alpha) <= 256:
        base = 1 if has_alpha else 0
        idx = np.zeros(arr.shape[:2], np.uint8)
        idx[solid] = inv.ravel() + base
        pal = ([0, 0, 0] if has_alpha else []) + colors.flatten().tolist()
        im = Image.fromarray(idx, 'P')
        im.putpalette(pal + [0] * (768 - len(pal)))
        kwargs = {'transparency': 0} if has_alpha else {}
        im.save(path, optimize=True, **kwargs)
    else:
        Image.fromarray(arr if has_alpha else arr[..., :3]).save(path, optimize=True)
    return path.stat().st_size


def measure_ground_row(forest: np.ndarray) -> int:
    """Top row of the grass band that runs across the whole forest floor.

    Scans up from the bottom: the floor is dirt (brown) under grass (green) under a dark
    outline row. Skips the dirt rows, then climbs while rows stay mostly grass-green; the
    result is the first grass row, directly below the dark ground outline.
    """
    rgb = forest[..., :3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    grass = (g > r) & (g > b + 15)
    frac = grass.mean(1)
    h = forest.shape[0]
    y = h - 1
    while y > 0 and frac[y] < 0.6:      # dirt
        y -= 1
    while y > 0 and frac[y - 1] >= 0.6:  # grass band
        y -= 1
    return int(y)


TS_TEMPLATE = '''/**
 * GENERATED by scripts/pixelate/pixelate.py. Do not edit by hand; re-run the script.
 *
 * Native (logical-pixel) sizes of the site's pixel art in /public/assets/pixel. Every image is
 * shown only at integer multiples of these sizes with `image-rendering: pixelated`.
 * Sheets are horizontal strips of `frames` frames, each `frameW` x `frameH`, bottom-aligned;
 * `anchorX` is the column (from the frame's left edge) the feet are centred on.
 */

export interface SpriteSheetMeta {{
  src: string;
  frameW: number;
  frameH: number;
  frames: number;
  /** Duration of one frame in ms (0 for a still). */
  frameMs: number;
  /** Feet centre, in native px from the left edge of a frame. */
  anchorX: number;
}}

export interface PixelImageMeta {{
  src: string;
  w: number;
  h: number;
}}

export interface ForestMeta extends PixelImageMeta {{
  /** Native row of the top of the grass ground line (0 = top row). */
  groundRow: number;
}}

export type SheetPose = 'wave' | 'sit' | 'idle';

export const pixelSprites: {{
  wave: SpriteSheetMeta;
  sit: SpriteSheetMeta;
  idle: SpriteSheetMeta;
  face: PixelImageMeta;
  forest: ForestMeta;
}} = {{
  wave: {wave},
  sit: {sit},
  idle: {idle},
  face: {face},
  forest: {forest},
}};
'''


def ts_obj(d: dict) -> str:
    parts = []
    for k, v in d.items():
        parts.append(f"{k}: '{v}'" if isinstance(v, str) else f'{k}: {v}')
    return '{ ' + ', '.join(parts) + ' }'


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('-v', '--verbose', action='store_true', help='print grid diagnostics')
    args = ap.parse_args()
    v = args.verbose

    if v:
        print('grid detection:')
    wave = [pixelate(GAME_SPRITES / f'wave-{i}.png', v) for i in (1, 2, 3)]
    sit = [pixelate(DESIGN_SRC / f'sit-{i}.png', v) for i in (1, 2, 3)]
    sit[2] = sit[2][:, ::-1].copy()  # sit-3 faces the other way in the source: mirror it
    face = pixelate(DESIGN_SRC / 'face-large.png', v)
    forest = pixelate(GAME_SPRITES / 'background.png', v, keep_bounds=True)

    wave = reduce_palette(wave, PALETTE['wave'])
    sit = reduce_palette(sit, PALETTE['sit'])
    face = reduce_palette([face], PALETTE['face'])[0]
    forest = reduce_palette([forest], PALETTE['forest'])[0]

    meta: dict[str, dict] = {}
    report = []

    for name, frames, key in (('roy-wave', wave, 'wave'), ('roy-sit', sit, 'sit'),
                              ('roy-idle', [wave[0]], 'idle')):
        sheet, fw, fh, anchor = build_sheet(frames)
        size = save_png(sheet, OUT_DIR / f'{name}.png')
        meta[key] = {'src': f'{PUBLIC_PREFIX}/{name}.png', 'frameW': fw, 'frameH': fh,
                     'frames': len(frames), 'frameMs': FRAME_MS[key], 'anchorX': anchor}
        report.append((f'{name}.png', f'{len(frames)} x {fw}x{fh}', size))

    size = save_png(face, OUT_DIR / 'roy-face.png')
    meta['face'] = {'src': f'{PUBLIC_PREFIX}/roy-face.png', 'w': face.shape[1], 'h': face.shape[0]}
    report.append(('roy-face.png', f'{face.shape[1]}x{face.shape[0]}', size))

    size = save_png(forest, OUT_DIR / 'forest.png')
    meta['forest'] = {'src': f'{PUBLIC_PREFIX}/forest.png', 'w': forest.shape[1],
                      'h': forest.shape[0], 'groundRow': measure_ground_row(forest)}
    report.append(('forest.png', f'{forest.shape[1]}x{forest.shape[0]}', size))

    TS_OUT.write_text(TS_TEMPLATE.format(**{k: ts_obj(m) for k, m in meta.items()}))

    print('wrote:')
    for f, dims, size in report:
        print(f'  public/assets/pixel/{f:14s} {dims:14s} {size:6d} B')
    print(f'  {TS_OUT.relative_to(ROOT)} (forest groundRow = {meta["forest"]["groundRow"]})')


if __name__ == '__main__':
    main()
