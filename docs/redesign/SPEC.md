# Portfolio elevation pass: design spec

This file is the source of truth for the redesign on branch `claude/vibrant-cori-ma36lc`.
Every implementation step follows it. If code and spec disagree, the spec wins; if the spec
is wrong, change the spec first, in the same commit.

## 0. Direction

> The title screen and pause menu of a lovingly made indie RPG: a warm forest-library world
> where every panel is a precise game menu, and the recruiter is always one press away from
> the loot (projects, resume, contact).

Principles:

1. **Pixel for flavor, crisp for reading.** Press Start 2P for names, titles and short labels.
   Everything people read in sentences is IBM Plex Sans.
2. **One world, one pixel grid.** Pixel art is stored at native resolution and shown only at
   integer multiples. Borders, offsets and shadows are multiples of 4px.
3. **Every press feels like an arcade button.** Hover is a half press, active is a full press.
4. **The fast path is always open.** Projects, Resume and Contact are one click from anywhere.
5. **The game is a bonus, never a gate.** All content is readable without playing.

This is an elevation pass, not a rebrand: keep the concept, the palette family, the mini-game,
the character, both themes and all existing content.

## 1. Final decisions

| Topic | Decision |
|---|---|
| Fonts | Display: Press Start 2P. HUD: IBM Plex Mono 500/600. Body: IBM Plex Sans 400/600. Remove JetBrains Mono and every `"Inter"` reference. |
| Nav | Brand (face + ROY CARMELLI) links to top · Projects · About · Skills · Contact · Resume (primary CTA) · Play · theme toggle. "Library" becomes the *zone name* of Projects, not a nav label. |
| Project tiers | main: `ai-sidebar`, `career-predictor`, `sommelier-bot` · side: `clr`, `arkanoid-game`, `portfolio` · research: `signal-processing`, `cognitive-correlation`, `white-matter-game`. |
| Availability | Hero chip: `bio.availability`. Contact paragraph: `bio.contactBlurb`. |
| Assets | Site UI uses native-resolution art in `public/assets/pixel/`. Files the mini-game loads stay in `public/assets/sprites/` with the same names and pixel dimensions (no engine change); they may be re-encoded in place (256-colour palette + lossless PNG optimisation) when the game shows no visible difference at 100%. Unused files are deleted; hi-res sources the pixel pipeline needs move to `design-src/`. |
| Hero | Game title screen: forest backdrop at integer scale, character on the ground line at the same pixel scale, title card, HUD nameplate. |
| Contact | No form (no backend). `mailto:` plus copy-to-clipboard with a toast. |
| Icons | One pixel icon set (`PixelIcon`). No emoji anywhere in the UI. |

## 2. Tokens

All tokens live in `src/index.css` inside `@theme` (Tailwind v4), with night values under
`:root[data-theme="night"]`. Components use **semantic tokens only** (no hex literals in
components; pixel-art bitmaps are the one exception).
An inline script in `index.html` sets `data-theme` (stored choice, else `prefers-color-scheme`) before
first paint; the 350ms colour cross-fade runs only after a user toggle (`theme-anim` class on `<html>`).

### 2.1 Color

| Token (`--color-*`) | Day | Night | Role |
|---|---|---|---|
| `bg` | `#1a2e10` | `#0a0f1e` | page ground |
| `bg-alt` | `#223a16` | `#10172b` | alternating zone ground |
| `surface` | `#3a2818` | `#161d36` | wood panel (night: moonlit slate) |
| `surface-raised` | `#4a3420` | `#202a4a` | hover / raised wood |
| `surface-sunken` | `#2a1c10` | `#070b16` | chips, insets, wells |
| `paper` | `#e8d8a8` | `#d8c898` | parchment (dimmed at night) |
| `fg` | `#ede0b8` | `#ece0bc` | primary text on dark |
| `fg-muted` | `#c9b87a` | `#c9b87a` | secondary text |
| `fg-subtle` | `#9dbb7c` | `#a3aed6` | HUD / hints |
| `ink` | `#2e1f12` | `#2e1f12` | primary text on paper |
| `ink-muted` | `#5e4128` | `#5e4128` | secondary text on paper |
| `accent` | `#c9a24a` | `#f2c65a` | brass fills, frames |
| `accent-fg` | `#dcb65c` | `#f2c65a` | brass used as text |
| `accent-hover` | `#dcb65c` | `#f7d67e` | brass hover fill |
| `accent-press` | `#a8842f` | `#d4a93e` | brass pressed fill |
| `on-accent` | `#1a2e10` | `#0a0f1e` | text on brass |
| `border` | `#c9a24a` | `#f2c65a` | panel frame |
| `border-subtle` | `#6a8f48` | `#6472b0` | component boundaries (non-text only) |
| `focus` | `#fff1b8` | `#fff1b8` | focus ring (set to `ink` inside paper surfaces) |
| `shadow` | `#0a1406` | `#02040a` | hard drop shadows |
| `edge` | `#1a120a` | `#3a2f12` | dark outline and drop under buttons (night: bronze, so the key depth stays visible on navy) |
| `bevel-hi` / `bevel-lo` | `#e8c974` / `#9c7a2c` | `#f9e3a0` / `#b8902f` | brass bevel |
| `wood-hi` / `wood-lo` | `#5a4028` / `#24180c` | `#2a3558` / `#0b1022` | wood bevel |
| `hp` / `xp` | `#ef7d70` / `#8fd07a` | `#f07a6e` / `#8fd07a` | HUD bars, status dots |
| `dot` | `#34521f` | `#27305a` | dot grid (quiet texture, ~1.5:1 on `bg`) |
| `star` | `#f5e9b8` | `#f5e9b8` | night star layer of `px-dots` only |

Measured WCAG contrast (all text pairs ≥ 4.5:1, all component borders ≥ 3:1):
`fg` on bg/surface/raised 11.1/10.7/8.9 (night 14.5/12.6/10.7) · `fg-muted` on bg/bg-alt/surface
7.4/6.3/7.1 · `fg-subtle` on bg/raised 6.8/5.5 · `accent-fg` on bg-alt/raised 6.5/6.0 · `on-accent`
on accent 6.1 (night 11.8) · `ink`/`ink-muted` on paper 11.2/6.6 (night 9.6/5.6) · `border-subtle`
on bg/surface 3.9/3.8 (night 4.2/3.6). The old `forest-light` (#4a6b2e) is **never** text (2.4:1).

The pre-redesign tokens (`forest*`, `parchment*`, `brass`, `wood`, `wood-dark`, `shadow-deep`,
`secondary-text`) were removed in QA; only the semantic set above exists.

### 2.2 Typography

Families: `--font-pixel: "Press Start 2P"`, `--font-sans: "IBM Plex Sans"`, `--font-mono: "IBM Plex Mono"`
(each with a system fallback stack). Self-hosted via `@fontsource`, latin subset, `font-display: swap`.
Preload the three critical files (Press Start 2P latin 400, Plex Sans latin 400, Plex Mono latin 500),
self-hosted from `public/fonts` with `@font-face` URLs identical to the preload hrefs.

| Utility (`text-*`) | Font | Base (mobile) | `md:` and up | Use |
|---|---|---|---|---|
| `display-xl` | pixel | 32/40, name on two lines | 40/48 | H1 (name) |
| `display-l` | pixel | 16/24 (< 640), 24/32 (640+) | 24/32; 32/40 from 1600 | zone title (H2) |
| `display-m` | pixel | 16/24 | 16/24; 24/32 from 1600 | main-quest title, sheet titles |
| `display-s` | pixel | 16/24 | 16/24 | card titles, large CTA |
| `label` | pixel | 12/16, +0.04em | same | eyebrows, button labels (md), tier tags |
| `hud` | mono 500 | 13/16, +0.06em | same | nav labels, chips, meta, stats |
| `body-l` | sans 400 | 17/27 | 18/28 | hero lede |
| `body` | sans 400 | 16/26 | same | paragraphs, card copy (max 68ch) |
| `body-s` | sans 400 | 14/22 | same | captions, meta (floor) |

Press Start 2P rules:

- Glyphs sit on an 8×8 grid, so sizes are multiples of 8 (16, 24, 32, 40, 48). `12px` is allowed
  only for short uppercase labels (≤ 24 characters). Nothing below 12px.
- No `clamp()`, `vw` or fractional rem for the pixel font. Step sizes at breakpoints.
- Line-heights are multiples of 8. Letter-spacing 0 for display sizes, `0.04em` for 12px labels.
- Only Latin-1 characters in pixel text. `▶ ★ ✉ ⬇ ↗ → ☰ ✕ ☀ ☾` and emoji are not in the font:
  use `PixelIcon`. `·` (U+00B7) is fine. Use `-` or `·` instead of em dashes.

Floors everywhere: body 16px (14px only for captions/meta), HUD 12px (13 preferred), pixel 12px.

### 2.3 Spacing and layout

- Base unit 4px ("pixel unit", pu). Use Tailwind's default spacing scale (4px steps):
  4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
- Container `max-w-[1120px]`, side gutters 16 (base) / 24 (`md`) / 32 (`lg`). Reading measure ≤ 68ch.
- Grid: 12 columns ≥ 1024px (gap 24), 8 at 768-1023, 4 below (gap 16).
- Breakpoints: Tailwind defaults `sm 640 · md 768 · lg 1024 · xl 1280`.
- Section rhythm: `py-12` (48) base, `md:py-16` (64), `py-20` (80) from 1600px. Zone header → content 24.
  Card gap 24. Density pass: sized for real viewports (14" laptops at 1280×650, 1536×730, 1470×830;
  phones with browser bars at 390×664, 360×700), not the idealised 1280×800 / 390×844.
  Panel padding 16 (base) / 24 (`md`).
- **Short laptops** (`short:` variant, `@media (width >= 64rem) and (height <= 60rem)`: 14" laptops
  at 125-175% scaling with tabs and bookmarks bar, e.g. 1097×516, 1280×602, 1366×600, 1536×730,
  1470×830, and 1440×900): section padding `short:py-6` (24), zone header → content 16, header
  rule `mt-3`. Every zone except Projects fits one screen under the 64px nav; in Projects every
  card fits one screen on its own (see the zone sections below). Phones, tablets and taller
  desktops are unaffected.
- No `min-height: 100vh` except the hero (`min-h-[100svh]`, capped at 880px on desktop, or the
  full `100svh` when the viewport is 881-1031px tall, so Zone 01's title (at most 144px deep) shows
  whole under the hero or not at all).
- Zone grounds alternate: hero scene · Projects `bg` · About `bg-alt` · Skills `bg` ·
  Resume paper band on `bg-alt` · Contact `bg` · Footer `surface-sunken`. Every zone carries `px-dots`.

### 2.4 Pixel language

- **Frame:** 4px, notched corners (the corner pixel is missing), drawn with box-shadow.
  No `border-radius` anywhere.
- **Shadow:** hard, no blur, down-right (light from top-left). `px-drop-sm` = 4px, `px-drop` = 8px.
- **Bevel:** 4px inner highlight top/left + 4px inner shade bottom/right on buttons and raised items.
- **Divider:** 4px dashed accent line (8px dash, 8px gap) with a 12px diamond in the middle.
- **Dot grid:** square 2px dots on a 32px grid (`px-dots`) in `dot`, a quiet texture in both themes.
  Night adds a sparse star layer (`::before`, behind content): 2px `star` squares on scattered nodes of
  the same grid, twinkling in three hard steps; static under reduced motion. The host must be positioned
  and becomes an isolated stacking context.
- **Sprites:** stored at native resolution (see `src/theme/pixelSprites.ts`, generated by `scripts/pixelate/pixelate.py`), shown at ×1/×2/×3/×4 only, `image-rendering: pixelated`.
  Never `transform: scale()` a sprite by a non-integer. Frames of one animation share one canvas
  and a bottom anchor, packed as a horizontal sprite sheet and animated with CSS `steps()`.
- **Icons:** `PixelIcon` bitmaps on a 12×12 grid, rendered as SVG rects with
  `shape-rendering="crispEdges"`. Size = 12 × integer (12 next to 12px labels, 24 next to 16-24px
  text, 36/48 for zone headers). Two colors: `currentColor` and an optional accent.

Utilities (in `src/styles/pixel.css`, Tailwind v4 `@utility`):

```css
@utility px-frame {            /* 4px notched frame + optional drop via --px-drop */
  box-shadow:
    0 -4px 0 0 var(--px-frame, var(--color-border)),
    0 4px 0 0 var(--px-frame, var(--color-border)),
    -4px 0 0 0 var(--px-frame, var(--color-border)),
    4px 0 0 0 var(--px-frame, var(--color-border)),
    var(--px-drop, 0 0 #0000);
}
@utility px-frame-subtle { --px-frame: var(--color-border-subtle); }
@utility px-drop-sm { --px-drop: 4px 8px 0 0 var(--color-shadow); }
@utility px-drop { --px-drop: 8px 12px 0 0 var(--color-shadow); }
@utility pixelated { image-rendering: pixelated; }
```

Plus `px-dots` (dot grid), `px-divider` (dashed line with diamond) and `px-dither`
(2px checker overlay for disabled states).

### 2.5 Motion

Two families: **sprite motion** (stepped, `steps(n)`) for anything that belongs to the world, and
**UI motion** (short, smooth) for state and layout. Animate only `transform` and `opacity`; snap
translations to whole pixels (multiples of 2 or 4).

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 80ms | active/press |
| `--dur-fast` | 120ms, `steps(2)` | hover, focus |
| `--dur-base` | 200ms | state changes, tooltip |
| `--dur-slow` | 360ms, `steps(4)` | zone banner, quest log, pause menu |
| `--dur-scene` | 600ms | hero ↔ game |
| `--ease-snap` | `cubic-bezier(.2,.8,.2,1)` | UI default |
| `--ease-scene` | `cubic-bezier(.65,0,.35,1)` | scene transitions |
| `--ease-pop` | `cubic-bezier(.34,1.56,.64,1)` | toasts only |

The same values are exported for Framer Motion from `src/theme/motion.ts`.

- Scroll reveal ("materialize"): opacity in 3 steps + `y` 8→0, 240ms, once, headers and cards
  only, 60ms stagger, max 4 items. Content must never be parked invisible without a resting
  state that becomes visible (no JS = visible).
- Sprite fps: idle 2, wave ~2.5 (400ms/frame), sit 2 (500ms/frame).
- No blinking text anywhere. Blinking cursors become static `PixelIcon`s.
- `prefers-reduced-motion: reduce`: no parallax, sprite sheets stop on frame 0, reveals are
  instant, banners appear without movement, twinkle off. The game stays available (user-initiated).
  Use `<MotionConfig reducedMotion="user">` plus CSS media queries plus `usePrefersReducedMotion`.
- Sprites pause when off-screen (IntersectionObserver) and when the tab is hidden.
- Zone entered (`useZoneEntered`, once per load, scrolling down past 35% of the viewport, never
  on initial load or scroll restoration): `ZoneBanner` slides in from the header's left edge in
  `steps(4)` over 360ms, holds 1.2s, fades out in 3 steps; the divider below draws left to
  right with `clip-path` in `steps(8)` over 480ms on first full view. Reduced motion: neither.
- Mini-map head walks between nav nodes in 4 whole-pixel hops (`--dur-slow`); jumps under
  reduced motion.

## 3. Components

All components: semantic HTML, no inline `style` except dynamic values (CSS custom properties,
computed transforms), no `onMouseEnter`/`onMouseLeave` for styling, visible `:focus-visible`,
typed props, JSDoc on exported components.

### PixelPanel
- Variants: `wood` (default, `surface`), `paper` (`paper` + `ink` text; sets `--color-focus` to
  `ink` inside), `inset` (`surface-sunken` + 2px inner `border-subtle` line, no frame), `ghost`
  (frame only, transparent).
- Props: `variant`, `as` (element), `padding` (`sm` 16 / `md` 16→20 / `lg` 20→28), `elevation`
  (0 none, 1 `px-drop-sm`, 2 `px-drop`), `frame` (`accent` default | `subtle` | `none`),
  optional `tab` (small brass title plate sitting on the top frame, pixel `label` text).

### Button
- Polymorphic: renders `<a>` when `href` is set, otherwise `<button type="button">`.
- Variants: `primary` (brass), `secondary` (wood with brass frame, `accent-fg` text), `ghost`
  (HUD text, dashed underline), `icon` (48×48 square, requires `aria-label`).
- Sizes: `sm` 44px face with 12px label and a focus ring hugging the edge (navbar), `md` 48px
  tall with `label` text, `lg` 48px tall with `display-s` text from 640px and 44px with `label`
  text and 12px icons on phones (its square icon partner matches: 44 / 48).
  Touch targets are ≥ 44px in every size.
- Optional leading/trailing `PixelIcon`.
- States (CSS only):
  - default: bevel + 4px `edge` outline (notched) + drop 8px straight down in `edge`.
  - hover: fill `accent-hover`, translateY(2px), drop 6px (half press, Roy's signature).
  - active: translateY(4px), drop 4px (hidden), bevel inverted, 80ms.
  - focus-visible: 3px `focus` outline, offset 8px (outside the 4px edge).
  - disabled / `aria-disabled`: `surface-sunken` fill, `fg-subtle` text, `border-subtle` edge,
    no drop, `px-dither`, `cursor: not-allowed`, no transform.
  - reduced motion: no translate; color change only.

Reference CSS (from the approved prototype):

```css
.px-btn {
  --bg: var(--color-accent); --fg: var(--color-on-accent);
  --hi: var(--color-bevel-hi); --lo: var(--color-bevel-lo);
  --edge: var(--color-edge); --drop: 8px;
  color: var(--fg); background: var(--bg);
  box-shadow:
    inset 4px 4px 0 0 var(--hi), inset -4px -4px 0 0 var(--lo),
    0 -4px 0 0 var(--edge), 0 4px 0 0 var(--edge), -4px 0 0 0 var(--edge), 4px 0 0 0 var(--edge),
    0 var(--drop) 0 0 var(--edge);
  transition: transform var(--dur-fast) steps(2, end), box-shadow var(--dur-fast) steps(2, end),
    background-color var(--dur-fast) steps(2, end);
}
.px-btn:hover { --bg: var(--color-accent-hover); --drop: 6px; transform: translateY(2px); }
.px-btn:active { --drop: 4px; transform: translateY(4px); /* swap --hi/--lo */ }
.px-btn--secondary { --bg: var(--color-surface); --fg: var(--color-accent-fg);
  --hi: var(--color-wood-hi); --lo: var(--color-wood-lo); --edge: var(--color-border); }
```

### Chip
- HUD mono 13px, 28px tall, padding 4/8, `surface-sunken` fill, 2px inner `border-subtle` line.
- `accent` variant (2px `accent` line, `accent-fg` text) for the top 3 technologies.
- Overflow chip `+N`. Tech names keep their casing (never uppercase `Node.js`).
- Not interactive.

### ZoneHeader
- Replaces the sidebar `ZoneLabel`. Sits above the content, full width.
- Anatomy: `PixelIcon` (36px) · eyebrow `ZONE 0N · NAME` (`label`, `accent-fg`) · H2 (`display-l`,
  `fg`) · optional subline (`body`, `fg-muted`, ≤ 90 chars) · `px-divider` below.
- Props: `zone` (number), `name`, `title`, `subtitle?`, `icon`, `id` for the H2 (used by
  `aria-labelledby` on the section). The H2 has `tabIndex={-1}` so menu jumps can focus it.
- Eyebrow is `accent-fg` from 640px and `fg-subtle` on phones (where the title is 16px and must lead).
- Eyebrow breaks only after the dot (`ZONE 02 ·` / `THE ADVENTURER`), 4px row gap. Below 640px
  the icon is 24px, inline with the eyebrow, and the H2 takes the full width.
- Hosts the zone-entered `ZoneBanner` (absolute over the eyebrow, `aria-hidden`) and the divider
  draw-in, so every zone gets them with no section changes.

### PixelIcon
- `name`, `size` (12 | 24 | 36 | 48), `title?` (when meaningful; otherwise `aria-hidden`).
- Set: `play`, `book`, `scroll`, `person`, `star`, `sword`, `potion`, `gear`, `mail`, `github`,
  `linkedin`, `phone`, `joystick`, `sun`, `moon`, `download`, `external`, `code`, `copy`, `menu`,
  `close`, `arrow-up`, `arrow-down`, `chevron`, `check`, `campfire`, `rotate-phone`, `trophy`.

### Character
- Props: `pose` (`wave` | `sit` | `idle`), `scale` (1-4, integer), `decorative?`, `label?`, `flip?`.
- Renders a `<div role="img">` (or `aria-hidden` when decorative) whose background is the sprite
  sheet; width/height = native frame size × scale; CSS `steps(frames)` animation.
- Pauses off-screen and under reduced motion (frame 0).

### Toast
- `useToast()` → `show(message, icon?)`. One live region (`role="status"`, `aria-live="polite"`),
  bottom-center, paper panel, `--ease-pop`, auto-dismiss 2.4s, stacked max 1.

### Reveal
- Wrapper around `motion.div` that applies the "materialize" reveal; renders children visible
  when reduced motion is on or JS is off.

### Hooks
- `usePrefersReducedMotion()`, `useActiveSection(ids: string[])` (IntersectionObserver, returns
  the id nearest the top), keep `useIsMobile`, `useGameDisplayMode`, `useTheme`.

## 4. Sections

Order stays: Navbar · Hero · Projects · About · Skills · Resume · Contact · Footer.
Each section: `<section id aria-labelledby>` with a `ZoneHeader` (except Hero).

- **Navbar.** 64px, `surface` with 4px bottom frame; gains `px-drop-sm` after scrolling.
  Left: face ×1 (native) + `ROY CARMELLI` (`label`) linking to `#hero`. Middle: Projects · About ·
  Skills · Contact (HUD 13 + 24px icon), active item gets a `play` cursor + 4px accent underline +
  `aria-current="true"`. From 1024px the links form a mini-map: a 12×12 node before each label
  joined by a 4px path (dashed `border-subtle` ahead, solid `accent` once visited; current node
  `accent` with an `edge` ring) and a 12×12 two-colour head standing on the current node. The
  map is `aria-hidden` decoration. Right: `Resume` (primary md, download icon, links to the PDF),
  `Play` (secondary md, joystick) and theme toggle (icon button, sun/moon). Mobile (< 768px):
  brand left (replaced inside a zone by a two-line HUD plate `ZONE n/5` / zone name that opens
  the menu, named "Zone n/5: <zone>, open the menu"; brand name hidden below 360px); right: Resume
  icon button + Menu button. Menu = full-screen "PAUSED" panel (`role="dialog"`, "Paused"), list
  with `play` cursor on hover/focus, "Continue" closes it; `inert` when closed, focus moves to
  the first item on open, the page behind it (skip link, main, footer) is `inert` while open, Esc
  closes, focus returns to the Menu button. A pending `Play` (waiting for the scroll to the hero)
  is cancelled by any click, wheel, touch or key before it settles.
- **Hero (title screen).** Forest (`pixelSprites.forest`, 240×112, true grid 11.47px,
  `groundRow` 101) and character share ONE integer scale `k`, so their pixels are identical.
  `k = max(ceil(W / 240), floor(H / 112))`, lowered to `floor(H / 112)` when covering the width
  would make the character exceed 60% of the scene height (`HERO_MAX_SHARE`); mirrored copies
  of the forest then fill the sides seamlessly. A forest shorter than the scene is anchored to
  the top and the ground is extended downward by repeating its bottom dirt rows (shifted per
  strip); a taller one is anchored to the bottom. Scene height is the hero height (see §2.3) minus 64px.
  The character's feet sit on forest column 182 on the grass line; its x is chosen per viewport
  so the title card never covers it, no baked-in bird sits on its head and the HUD stays clear.
  Title card: wood panel, elevation 2, 520px, left-aligned to the page container, its top
  aligned with the HUD top: `PLAYER ONE`
  eyebrow, H1 name on two lines, role (`bio.role`), tagline, availability chip, `View projects`
  (primary lg) + `Resume` (secondary lg, PDF), ghost `Press start to play`. HUD nameplate
  top-right (omitted when it would collide). Static `SCROLL` cue on the dirt. Night: moonlight
  washes over the forest (stronger) and the character (lighter). Pressing start fades the card
  and HUD out (`--dur-scene`, stepped slide) and fades the lazily loaded game in over the dimmed
  scene; Esc/Quit return focus to Press start. Press start and `Play` first bring the hero to
  the top of the viewport (the page scroll then locks). During desktop play the game sits on an
  opaque `bg` backdrop no taller than the first screen under the nav, the rest of `main` and the
  footer are `inert`, an HTML controls hint sits next to Esc, and following an in-page nav link
  quits the game first (focus stays on the link). The canvas keeps 800:446 and shrinks (whole CSS
  pixels) so the canvas, Quit and the hint always fit that screen (1097×516: 624×348). If the
  game's code cannot be fetched, a wood panel ("Couldn't load the game. Check your connection and
  try again.") offers Reload and Quit instead of the game.
  Phones and portrait tablets (< 1024 portrait): a scene band (×3 phones, ×4 tablets, ×2 below
  700px tall) at most 38% of the viewport height, canopy cropped and anchored at the bottom so
  the character and grass stay, then the title card as a full-bleed wood slab. Phone card order:
  eyebrow, H1, role, availability chip, CTAs, tagline, Press start. Tablets use two columns (text
  left; CTAs and Press start right, CTA top level with the H1). HUD and scroll cue hidden.
  Short or narrow landscape viewports (e.g. 844×390, 800×600, 640×400) get a compact title
  screen: the same overlay composition with k chosen so the forest fills the first screen and
  the character stands whole, a narrower card when needed (never slicing a bird), and CTAs
  directly under the role below 560px tall. Name, role and primary CTA are always above the fold.
  Tight title card: when the first screen under the nav is shorter than 560px (laptops at 150-175%
  Windows scaling with tabs and bookmarks bar, e.g. 1097×516, 1280×602, 1366×600), the card keeps all
  its content but sets the name on one 32px line, the role and tagline at 16px, 16px padding and a
  tighter rhythm (CTAs under the role), so the whole card, Press start included, fits the first screen.
- **Projects (Zone 01 · The Library).** ZoneHeader "Things I've Built". Main quests: the first
  spans full width (visual 7/12, text 5/12), the other two side by side; side quests (compact wood
  cards) two per row from 640px, the third spanning the row, and three per row from 1024px, their
  parts lined up through subgrid from 768px (24px between rows); research logs as a compact list. QuestCard anatomy: visual (16:10,
  pixel bezel) · tier tag (`star` icon + `MAIN QUEST` / `SIDE QUEST` / `RESEARCH LOG`) · kind ·
  year · title · `tagline` · `highlights` (main only) · ≤ 4 chips + `+N` · actions: `Live` (primary,
  external icon), `Code` (secondary, code icon), `Quest log` (ghost, `<details>` holding the full
  `description`). Links ≥ 44px. Mobile: one column, visual on top.
  Headings: one H3 per tier (the Research logs tab plate is the visible H3; main/side are
  screen-reader only because every card shows its tier tag), card titles H4. Every card caps chips
  at 4 + `+N`, and the `+N` never takes a row alone: the chip before it reserves its room, so the
  two wrap together. An open quest log never stretches its neighbour (`:has()` releases the subgrid).
  Hover lift keeps its hit area. The visual's backdrop bleeds to the inner edge of the 4px frame,
  never over it: the card padding and the bleed are one value (`--quest-pad`: 16, 20 from `md`,
  16 on short laptops). Item art uses fixed bitmap colours with a half-strength night
  wash. Below 640px: Live/Code side by side, highlights on the lead card only, 120px item band,
  research `Code` as a 44px icon button. Research items sit at ×1 on a 32px plate, ×2 on the 56px
  plate from 640px. Card actions (Live / Code) use Button `sm`. The item band is
  120px with the item at ×4 below 1600px, 184px at ×6 above.
  Short laptops (`short:`): the list scrolls, but every quest card fits one screen under the nav
  (viewport height − 92; 424px at 1097×516). Cards run one per row, split 5/12 · 7/12 (gap 24) so
  the text columns line up: the lead card has the screenshot left and the text right; main quests
  have the item at ×6 in a dotted well bleeding to the frame, text right; side quests have slot,
  tag, meta and title left, tagline, chips and actions right. Cards pad 16; parts step
  8 · 8 · 12 · 12 · 12 from the meta line; the subtitle follows the name on its line; Live · Code ·
  Quest log share one row. DOM and reading order are unchanged; the 2-up and 3-up grids don't apply.
  The research log panel scrolls as a whole (each row fits).
- **About (Zone 02 · The Adventurer).** 7/12 story on a paper panel (≤ 65ch) + 5/12 "Character
  sheet" (inset panel): face ×2, the existing at-a-glance rows (HUD labels, Plex values), one
  achievement row derived from the bio ("Field medic · scaled a unit from 12 to 30+").
  Short laptops (`short:`): the story column keeps 632px (600px of text, 12 lines of 16/26, 12px
  paragraph gaps, 16px padding) with the "- Roy" sign-off on its last line; the sheet takes the
  remaining 360-400px: ×1 portrait beside the name, 14px values in an 88px label column, stat rows
  sharing any extra height so both panels end on one line. The sheet is capped at the screen height
  under the zone header (100svh − 196px), so a nav jump always shows it whole; on screens under
  ~590px tall (1097×516) the end of the story runs past the fold.
- **Skills (Zone 03 · Equipment).** Equipment screen: character (idle, ×3) in a wood frame on the
  left; slots on the right, one per `skills[i].slot` (Weapons, Armor, Magic, Potions, Tomes,
  Trinkets, Achievements). Each item is a focusable chip; hover/focus shows a Stardew-style
  tooltip with "Used in: …" computed from `projects` (normalize e.g. `React 19` → `React`).
  Items not used in any project show no "Used in" line (never invent data); CS Foundations say
  "Studied in coursework", certifications "Certificate earned". Mobile: stacked, tooltip becomes
  an inline detail row on tap; character well and stats hidden below 768px.
  Keyboard: the equipment is one ARIA layout grid (`grid` / `row` with the slot h3 as `rowheader` /
  `gridcell`) with a roving tabindex: one Tab stop, Left/Right within a slot, Up/Down across slots
  keeping the column, Home/End, Ctrl+Home/End; the tooltip follows focus, Esc closes. Items carry a
  2px `border-subtle` line and a dotted inspect cue (brass on hover/focus/open); a keycap hint
  shows while the grid has keyboard focus. Tall screens from xl (1280px, taller than the short
  laptops; CSS only, same DOM): the frame column narrows to 152px (well, "ROY · LVL 3", stats) and
  each slot is one line of items beside its heading, the slot name over its category in a heading
  column the rows share through subgrids, slots in data order. Items stay 36px tall with 8px
  padding, 4px apart in a line and 8px between lines (only Magic takes two); 28px between slots
  ends the last one level with the frame column. Every width from xl lays out the same (the zone is
  capped at 1120px); below xl the headings sit over their items in one column.
  Short laptops (`short:`, CSS only, same DOM): a compact inventory. The character well is hidden
  (Roy stands in Hero and Contact); a status line ("ROY · LVL 3", the three stats split by 2px
  dashed rules, the keycap hint at the right) sits over the slots. Each slot is one row: its h3 in a
  heading column as wide as the longest heading, its items beside it, all on one grid through
  subgrids. Items are 28px, 4px apart in a line, 8px between lines, panel padding 16; under 600px
  tall they drop to 24px (the WCAG 2.5.8 floor) with 4px between lines. Magic takes two lines,
  every other slot one from 1024px wide. Up/Down move to the slot directly above or below.
- **Resume (Zone 04 · Resume Scroll, title "Resume").** Wide paper band: `scroll` icon ×4, existing sentence,
  `bio.resume.meta`, `Download` (primary, `download` attr) + `View` (secondary, new tab).
  Download shows toast "Loot acquired: Roy_Carmelli_CV.pdf".
- **Contact (Zone 05 · Save Point).** Pixel campfire (21×21 native, 3 frames, one `<path>` per
  colour) rendered at exactly the character's scale (×4 from 1600, ×3 on laptops 1024-1599, ×2 below) so both share one
  pixel grid; the ground line is level with the panel's bottom frame. Caption `aria-hidden`. Title "Let's Talk". `bio.contactBlurb`. Primary `Email me` (mailto) + icon button
  `Copy email` (toast "Email copied · progress saved"; visible `Copy` label from 640px). Email shown
  in lowercase (`mailto:` keeps `bio.email`). Secondary buttons with icon + readable label: GitHub,
  LinkedIn, Phone (number shown under it from 640px).
  Short laptops (`short:`): panel padding 16 and a 12/16/16/16 rhythm (text → buttons → address →
  socials → phone number); the save-point caption sits above the scene instead of below the ground.
- **Footer.** `surface-sunken`. `Continue?` back-to-top button with `arrow-up`, name ©, and
  "Built from scratch: React · TypeScript · Canvas" in readable size and contrast.
- **ArcadeFallback.** `rotate-phone` icon (stepped rotation, static under reduced motion), text at
  ≥ 12px pixel / 16px body. Keep `data-testid="arcade-fallback-message"` and "ARCADE ZONE" text.

## 5. Quality bar

- **Accessibility:** skip link to `#projects`; landmarks; one H1; H2 per zone; focus visible
  everywhere; `aria-current` in nav; mobile menu `inert` when closed; icon-only buttons have
  `aria-label`; decorative sprites `aria-hidden`; text floors above; touch targets ≥ 44px.
- **Viewports:** every change is checked at 1097×516 (Windows 175%), 1280×602, 1280×650, 1536×730,
  1470×830, 390×664 and 360×700
  as well as 1280×800 / 390×844: name, role and primary CTA fit the first screen on all of them.
- **Performance:** first load ≤ 500KB transferred (was 7.7MB), initial JS ≤ 110KB gzip
  (MiniGame lazy-loaded), every `<img>` has `width`/`height`, below-the-fold images lazy,
  CLS < 0.02, no unused preloads.
- **SEO (must not regress):** do not change the `<title>`, meta description, canonical, robots,
  OG/Twitter tags, JSON-LD, `google-site-verification`, `public/googlecd23d28f0f769144.html`,
  `public/sitemap.xml`, `public/robots.txt`. The H1 stays the name. `og-image.png` may be
  regenerated at the same path.
- **Stack:** React 18, TypeScript, Tailwind v4, Framer Motion. No new runtime libraries beyond
  the Plex fonts.
- **Tests:** `npm run build` and `npm test` pass after every step. Tests change only where copy
  or structure changes on purpose, and each change is listed in the step notes. New logic gets
  tests (hooks, Button states, menu `inert`, skill → project mapping).
- **Game:** do not edit `src/components/MiniGame/{GameEngine,Player,Obstacle,SpriteRenderer,config,types}.ts`.

## 6. Content (in `src/data`)

- `bio.role`, `bio.availability`, `bio.contactBlurb`, `bio.resume` are the single source for
  hero/contact/resume copy.
- `projects[i].tier`, `kind`, `tagline`, `highlights`, `status` drive the quest cards; the
  existing `description` becomes the quest-log text (unchanged).
- `skills[i].slot` names the equipment slot.
