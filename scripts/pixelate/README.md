# Pixel pipeline

All the pixel art (Roy, the obstacles, the forest, the portrait) is drawn in Google Flow (Nano
Banana) as sprite sheets on a flat magenta matte, using the previous sprites and the "Roy"
character as reference. The site and the game only show pixel art at its native resolution,
so two scripts turn those sheets into small, native-size PNGs:

```sh
python3 scripts/pixelate/import_flow.py     # Flow sheets -> game sprites + site sources
python3 scripts/pixelate/pixelate.py        # site sources -> site sheets (add -v for details)
python3 scripts/pixelate/review.py --out /tmp/pixel-review
```

Requires Python 3 with Pillow and numpy. The output is deterministic, so re-running on
unchanged sources gives byte-identical files.

## Step 1: `import_flow.py`

| Source (`design-src/flow/`) | Layout | Writes |
|---|---|---|
| `roy_wave_idle.jpg` | 1 row: wave 1-3, idle | game `wave-*.png`, `idle.png`; site `design-src/sprites/wave-*.png` |
| `roy_run_a.jpg`, `roy_run_b.jpg` | 1 row: run 1-4; run 5-7, stand-1 | `run-1..7.png`, `stand-1.png` |
| `roy_jump.jpg` | 1 row: jump 1-4 | `jump-*.png` |
| `roy_slide_stand.jpg` | 1 row: slide 2-3, stand-2 | `slide-*.png`, `stand-2.png` |
| `roy_sit.jpg` | 1 row: sit 1-3 | site `design-src/sprites/sit-*.png` |
| `obstacles.jpg` | 5x2: raccoon, stumps, rock, mushrooms, toadstools, agave, 2 birds | `racoon.png`, `stump.png`, ... `bird-*.png` |
| `critters.jpg` | 3x1: beetle, hedgehog, bat | `beetle.png`, `hedgehog.png`, `bat.png` |
| `background.jpg` | full frame | `background.png`; site `design-src/sprites/forest.png` (a 330x154 window) |
| `portrait.jpg` | one bust | game `portrait.png` (player card); site `design-src/sprites/face-large.png` |

It also writes `src/components/MiniGame/spriteSizes.generated.ts`: the game draws the sprites
at 1.25x their native size, so its frame sizes come from there.

1. **Key.** Pixels where `min(R, B) - G` is large are the matte; the purple fringe the matte
   leaves on the outline is capped back to neutral.
2. **Cut.** Roy's sheets are one row of figures (one figure per column fills the image
   height, which is what gives him ~92 px of real detail), split on the empty columns between
   figures; the obstacle sheets are split into grid cells. Rows and columns with under 3
   opaque pixels are matte noise.
3. **Native.** Flow's pixel art is not on one exact grid, and its pixel size changes from
   sheet to sheet. Roy is area-averaged so a standing Roy is 92 px tall on every sheet (one
   reference pose per sheet sets the scale); an area average cannot drop a 2 px feature, while
   sampling one median per cell at an off-grid scale made one eye vanish (a "wink"). Obstacles
   are sampled with `pixelate.sample` at one period per sheet, scaled to a median height.
4. **Palette and frames.** One palette per group; every pose drawn in the game's player box
   is padded to one frame size, bottom-aligned on the feet. The birds are mirrored to face the
   way they fly.

Every file it writes carries a `pixel-grid=1` PNG text chunk, which tells `pixelate.py` the
image is already native.

## Step 2: `pixelate.py`

| Source (`design-src/sprites/`) | Output (`public/assets/pixel/`) |
|---|---|
| `wave-1..3.png` | `roy-wave.png`, 3-frame sheet; `roy-idle.png` is wave-1 |
| `sit-1..3.png` | `roy-sit.png`, 3-frame sheet; sit-3 mirrored (it faces the other way) |
| `face-large.png` | `roy-face.png` |
| `forest.png` | `forest.png`, the hero forest |

and `src/theme/pixelSprites.ts` (sizes, frame counts, timing, feet anchor, forest ground row).
Native sources skip grid detection; older non-native sources still go through it: per axis,
the period (9.5-12.5 px) and phase that put the most color edges on grid lines, refined by
least squares. Then a k-means palette in OKLab per group, and sheets aligned on the centroid of
the frames' bottom 40%. The forest's ground row is the first grass row under the dark outline
along the top of the grass.

Do not edit any output by hand: change a source or a script and re-run.

`review.py` renders every site output at x4 on the day and night grounds (`contact-sheet.png`),
animated GIFs with the real frame timing (`wave.gif`, `sit.gif`), the PixelIcon set at
x1/x2/x4 (`icons.png`, parsed from `src/components/PixelIcon.tsx`) and a grid comparison for
the forest (`forest-grid.png`).
