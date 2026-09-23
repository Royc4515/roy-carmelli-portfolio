# Roy Carmelli — Portfolio

Live: https://roy-carmelli-portfolio.vercel.app/

Personal portfolio for a CS × Neuroscience student at Bar-Ilan University, built as the title screen and pause menu of a small pixel RPG. Built from scratch in TypeScript + React + Vite + Tailwind + Framer Motion. The arcade theme is committed enough that the homepage character runs on a mini canvas game engine I wrote in this repo — OOP entity hierarchy, AABB collision, 7-state FSM, custom event bus. Day/night theme with system preference detection.

The page is a map of five zones: Projects (quest cards), About (character sheet), Skills (equipment screen with "used in" tooltips), Resume and Contact (save point). On desktop the nav doubles as a mini-map of those zones.

The game ("Roy Runner") is playable on **desktop** and **mobile**:

- **Desktop:** Space / ↑ / W / click to jump, ↓ / S to slide, Esc to quit.
- **Phone (landscape):** on-screen **JUMP** / **SLIDE** buttons, tap anywhere to start/restart, and a **fullscreen** toggle (with larger controls in fullscreen). Portrait shows a "rotate your phone" prompt. Device detection uses a `(pointer: coarse)` + orientation hook so desktop behaviour is untouched.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS v4 (Vite plugin), design tokens in `@theme`
- Framer Motion via `LazyMotion` + `m` (reveals and scene transitions only)
- Vitest + Testing Library

## Design system

The source of truth is [`docs/redesign/SPEC.md`](docs/redesign/SPEC.md): direction, tokens, type scale, pixel language, motion, components and the quality bar. Before/after screenshots for every step live next to it in `docs/redesign/`.

- **Tokens:** semantic colours (`bg`, `surface`, `accent`, `fg-muted`, …) with night values under `:root[data-theme="night"]` in `src/index.css`. Components never use hex.
- **Type:** Press Start 2P for display and labels only (12/16/24/32/40/48px), IBM Plex Sans for body, IBM Plex Mono for HUD text. Critical faces are self-hosted in `public/fonts` and preloaded.
- **Pixel language:** 4px notched frames and hard drops drawn with `box-shadow` (`src/styles/pixel.css`), sprites only at integer scale with `image-rendering: pixelated`, sprite sheets animated with CSS `steps()`.
- **Components:** `Button`, `PixelPanel`, `Chip`, `ZoneHeader`, `ZoneBanner`, `Toast`, `Reveal` in `src/components/ui`, plus `PixelIcon`, `Character`, `QuestCard`, `Campfire`. Run `npm run dev` and open `/?gallery` for a live gallery (dev only).

## Pixel art pipeline

The character and forest art were exported at a non-integer scale. `scripts/pixelate/pixelate.py` recovers the true pixel grid, writes native-resolution sprites to `public/assets/pixel/` and generates `src/theme/pixelSprites.ts` (frame sizes, anchors, ground row). See `scripts/pixelate/README.md`.

## Dev

```bash
npm install
npm run dev
npm test
npm run build
```

## Deploy

Hosted on Vercel — auto-deploys on push to `main`.
