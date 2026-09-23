# Pixel pipeline

The character and forest art came out of an image generator as "pixel art" at 10-12 screen
pixels per logical pixel, with soft block edges and thousands of colors. The site only shows
pixel art at its native resolution, scaled by whole numbers, so this pipeline recovers the real
grid and writes small, native-size PNGs.

```sh
python3 scripts/pixelate/pixelate.py        # add -v to print the detected grids
python3 scripts/pixelate/review.py --out /tmp/pixel-review
```

Requires Python 3 with Pillow and numpy. The output is deterministic, so re-running it on
unchanged sources gives byte-identical files.

## Inputs

| Source | Location | Why there |
|---|---|---|
| `wave-1..3.png`, `background.png` | `public/assets/sprites/` | the mini-game loads them too |
| `sit-1..3.png`, `face-large.png` | `design-src/sprites/` | only this pipeline needs them |

## Outputs

| File | Content |
|---|---|
| `public/assets/pixel/roy-wave.png` | 3-frame sheet: wave-1 (arms down), wave-2, wave-3 |
| `public/assets/pixel/roy-sit.png` | 3-frame sheet: sit-1, sit-2, sit-3 mirrored (the source faces the other way) |
| `public/assets/pixel/roy-idle.png` | 1 frame: wave-1 (the old `idle.png` is drawn in another style) |
| `public/assets/pixel/roy-face.png` | portrait from face-large |
| `public/assets/pixel/forest.png` | hero forest from background |
| `src/theme/pixelSprites.ts` | generated sizes, frame counts, timing, feet anchor, forest ground row |

Do not edit the outputs by hand: change the script (or a source) and re-run it.

## How it works

1. **Grid.** Per axis, search the period (9.5-12.5px) and phase that put the most color edges
   on grid lines, then fit the real edge peaks with least squares.
2. **Sample.** One color per cell: the median of the fully opaque pixels in the middle half of
   the cell. This skips soft block edges and the green matte in the semi-transparent fringe,
   so there is no halo. A cell counts as solid when at least half of it is solid.
3. **Clean.** Remove isolated pixels, fill 1px pin holes, crop to the bounding box.
4. **Palette.** k-means in OKLab per group (a sheet shares one palette, so colors do not
   shimmer between frames): 40 colors for the body sheets, 48 for the face and the forest.
5. **Sheets.** Frames share one canvas and are bottom-aligned. Horizontally they are aligned
   on the centroid of their bottom 40%, then nudged (up to 2px) so the shoes match frame 0.

`review.py` renders every output at x4 on the day and night grounds (`contact-sheet.png`),
animated GIFs with the real frame timing (`wave.gif`, `sit.gif`), the PixelIcon set at
x1/x2/x4 (`icons.png`, parsed from `src/components/PixelIcon.tsx`) and a grid comparison for
the forest (`forest-grid.png`).
