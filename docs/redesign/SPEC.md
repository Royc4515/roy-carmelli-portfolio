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
| Assets | Site UI uses native-resolution art in `public/assets/pixel/`. Files the mini-game loads stay untouched in `public/assets/sprites/`. Unused files are deleted; hi-res sources the pixel pipeline needs move to `design-src/`. |
| Hero | Game title screen: forest backdrop at integer scale, character on the ground line at the same pixel scale, title card, HUD nameplate. |
| Contact | No form (no backend). `mailto:` plus copy-to-clipboard with a toast. |
| Icons | One pixel icon set (`PixelIcon`). No emoji anywhere in the UI. |

## 2. Tokens

All tokens live in `src/index.css` inside `@theme` (Tailwind v4), with night values under
`:root[data-theme="night"]`. Components use **semantic tokens only** (no hex literals in
components; pixel-art bitmaps are the one exception).

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
| `edge` | `#1a120a` | `#05080f` | dark outline around buttons |
| `bevel-hi` / `bevel-lo` | `#e8c974` / `#9c7a2c` | `#f9e3a0` / `#b8902f` | brass bevel |
| `wood-hi` / `wood-lo` | `#5a4028` / `#24180c` | `#2a3558` / `#0b1022` | wood bevel |
| `hp` / `xp` | `#ef7d70` / `#8fd07a` | `#f07a6e` / `#8fd07a` | HUD bars, status dots |
| `dot` | `#34521f` | `#f5e9b8` | dot grid (night = stars) |

Measured WCAG contrast (all text pairs ≥ 4.5:1, all component borders ≥ 3:1):
`fg` on bg/surface/raised 11.1/10.7/8.9 (night 14.5/12.6/10.7) · `fg-muted` on bg/bg-alt/surface
7.4/6.3/7.1 · `fg-subtle` on bg/raised 6.8/5.5 · `accent-fg` on bg-alt/raised 6.5/6.0 · `on-accent`
on accent 6.1 (night 11.8) · `ink`/`ink-muted` on paper 11.2/6.6 (night 9.6/5.6) · `border-subtle`
on bg/surface 3.9/3.8 (night 4.2/3.6). The old `forest-light` (#4a6b2e) is **never** text (2.4:1).

Legacy tokens (`forest-dark`, `forest`, `forest-light`, `parchment`, `parchment-dark`, `brass`,
`wood`, `wood-dark`, `shadow-deep`, `secondary-text`) stay as aliases until the last component
stops using them; QA removes them.

### 2.2 Typography

Families: `--font-pixel: "Press Start 2P"`, `--font-sans: "IBM Plex Sans"`, `--font-mono: "IBM Plex Mono"`
(each with a system fallback stack). Self-hosted via `@fontsource`, latin subset, `font-display: swap`.
Preload the two critical files (Press Start 2P latin 400, Plex Sans latin 400).

| Utility (`text-*`) | Font | Base (mobile) | `md:` and up | Use |
|---|---|---|---|---|
| `display-xl` | pixel | 40/48, name on two lines | 48/56 | H1 (name) |
| `display-l` | pixel | 24/32 | 32/40 | zone title (H2) |
| `display-m` | pixel | 16/24 | 24/32 | main-quest title, sheet titles |
| `display-s` | pixel | 16/24 | 16/24 | card titles, large CTA |
| `label` | pixel | 12/16, +0.04em | same | eyebrows, button labels (md), tier tags |
| `hud` | mono 500 | 13/16, +0.06em | same | nav labels, chips, meta, stats |
| `body-l` | sans 400 | 18/28 | 20/32 | hero lede |
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
- Section rhythm: `py-16` (64) base, `md:py-24` (96). Zone header → content 32. Card gap 24.
  Panel padding 16 (base) / 24 (`md`).
- No `min-height: 100vh` except the hero (`min-h-[100svh]`, capped at 880px on desktop).
- Zone grounds alternate: hero scene · Projects `bg` · About `bg-alt` · Skills `bg` ·
  Resume paper band on `bg-alt` · Contact `bg-alt` · Footer `surface-sunken`.

### 2.4 Pixel language

- **Frame:** 4px, notched corners (the corner pixel is missing), drawn with box-shadow.
  No `border-radius` anywhere.
- **Shadow:** hard, no blur, down-right (light from top-left). `px-drop-sm` = 4px, `px-drop` = 8px.
- **Bevel:** 4px inner highlight top/left + 4px inner shade bottom/right on buttons and raised items.
- **Divider:** 4px dashed accent line (8px dash, 8px gap) with a 12px diamond in the middle.
- **Dot grid:** square 2px dots on a 32px grid (`px-dots`). Night keeps the twinkling star layer;
  the twinkle is disabled under reduced motion.
- **Sprites:** stored at native resolution, shown at ×1/×2/×3/×4 only, `image-rendering: pixelated`.
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

## 3. Components

All components: semantic HTML, no inline `style` except dynamic values (CSS custom properties,
computed transforms), no `onMouseEnter`/`onMouseLeave` for styling, visible `:focus-visible`,
typed props, JSDoc on exported components.

### PixelPanel
- Variants: `wood` (default, `surface`), `paper` (`paper` + `ink` text; sets `--color-focus` to
  `ink` inside), `inset` (`surface-sunken` + 2px inner `border-subtle` line, no frame), `ghost`
  (frame only, transparent).
- Props: `variant`, `as` (element), `padding` (`sm` 16 / `md` 16→24 / `lg` 24→32), `elevation`
  (0 none, 1 `px-drop-sm`, 2 `px-drop`), `frame` (`accent` default | `subtle` | `none`),
  optional `tab` (small brass title plate sitting on the top frame, pixel `label` text).

### Button
- Polymorphic: renders `<a>` when `href` is set, otherwise `<button type="button">`.
- Variants: `primary` (brass), `secondary` (wood with brass frame, `accent-fg` text), `ghost`
  (HUD text, dashed underline), `icon` (48×48 square, requires `aria-label`).
- Sizes: `md` 48px tall with `label` text, `lg` 56px tall with `display-s` text.
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
  `aria-labelledby` on the section).

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
  `aria-current="true"`. Right: `Resume` (primary md, download icon, links to the PDF),
  `Play` (secondary md, joystick) and theme toggle (icon button, sun/moon). Mobile (< 768px):
  brand left; right: Resume icon button + Menu button. Menu = full-screen "PAUSED" panel, list
  with `play` cursor on hover/focus, "Resume game" closes it; `inert` when closed, focus moves to
  the first item on open, Esc closes, focus returns to the Menu button.
- **Hero (title screen).** Full-bleed forest (`forest.png`, 229×107 native) at integer scale
  `k = ceil(viewportWidth / 229)` clamped to 2-8, anchored bottom-center, cropped. Character
  (wave) on the ground line (native row 97 → bottom offset `10 × k` px) around x = 118/229 of the
  forest, same scale `k` as the forest. Title card (wood panel, `px-drop`) top-left on desktop:
  eyebrow `PLAYER ONE` with `play` icon, H1 name, role line (`bio.role`, Plex 600, `accent-fg`),
  tagline (`bio.tagline`, `body-l`), availability chip (`bio.availability`, `xp` square dot),
  CTAs: primary `View projects` → `#projects`, secondary `Resume` (PDF, download), then
  `Press start to play` (ghost with joystick icon, the button tests look for `/press start/i`).
  HUD nameplate (face, `PLAYER 1`, HP/XP bars from 4px segments, `LVL 3`) top-right of the scene.
  No blinking; no floating offset hacks. Pressing start fades the title card out and mounts the
  game in the same frame (existing MiniGame/ArcadeFallback logic and `arcade:play` event stay).
  Mobile: scene at `k = 3`, cropped to keep the character, title card flows below the scene,
  name on two lines, CTAs full width.
- **Projects (Zone 01 · The Library).** ZoneHeader "Things I've Built". Main quests: the first
  spans full width (visual 7/12, text 5/12), the other two side by side; side quests in a 3-col
  grid (compact wood cards); research logs as a compact list. QuestCard anatomy: visual (16:10,
  pixel bezel) · tier tag (`star` icon + `MAIN QUEST` / `SIDE QUEST` / `RESEARCH LOG`) · kind ·
  year · title · `tagline` · `highlights` (main only) · ≤ 5 chips + `+N` · actions: `Live` (primary,
  external icon), `Code` (secondary, code icon), `Quest log` (ghost, `<details>` holding the full
  `description`). Links ≥ 44px. Mobile: one column, visual on top.
- **About (Zone 02 · The Adventurer).** 7/12 story on a paper panel (≤ 65ch) + 5/12 "Character
  sheet" (inset panel): face ×2, the existing at-a-glance rows (HUD labels, Plex values), one
  achievement row derived from the bio ("Field medic · scaled a unit from 12 to 30+").
- **Skills (Zone 03 · Equipment).** Equipment screen: character (idle, ×3) in a wood frame on the
  left; slots on the right, one per `skills[i].slot` (Weapons, Armor, Magic, Potions, Tomes,
  Trinkets, Achievements). Each item is a focusable chip; hover/focus shows a Stardew-style
  tooltip with "Used in: …" computed from `projects` (normalize e.g. `React 19` → `React`).
  Items not used in any project show no "Used in" line (never invent data). Mobile: stacked,
  tooltip becomes an inline detail row on tap.
- **Resume (Zone 04 · Resume Scroll).** Wide paper band: `scroll` icon ×4, existing sentence,
  `bio.resume.meta`, `Download` (primary, `download` attr) + `View` (secondary, new tab).
  Download shows toast "Loot acquired: Roy_Carmelli_CV.pdf".
- **Contact (Zone 05 · Save Point).** Pixel campfire (3-frame sheet or SVG, stepped) next to the
  idle character. Title "Let's Talk". `bio.contactBlurb`. Primary `Email me` (mailto) + icon button
  `Copy email` (toast "Email copied · progress saved"). Secondary buttons with icon + readable
  label: GitHub, LinkedIn, Phone.
- **Footer.** `surface-sunken`. `Continue?` back-to-top button with `arrow-up`, name ©, and
  "Built from scratch: React · TypeScript · Canvas" in readable size and contrast.
- **ArcadeFallback.** `rotate-phone` icon (stepped rotation, static under reduced motion), text at
  ≥ 12px pixel / 16px body. Keep `data-testid="arcade-fallback-message"` and "ARCADE ZONE" text.

## 5. Quality bar

- **Accessibility:** skip link to `#projects`; landmarks; one H1; H2 per zone; focus visible
  everywhere; `aria-current` in nav; mobile menu `inert` when closed; icon-only buttons have
  `aria-label`; decorative sprites `aria-hidden`; text floors above; touch targets ≥ 44px.
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
