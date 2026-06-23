# Roy Carmelli — Portfolio

Live: https://roy-carmelli-portfolio.vercel.app/

Personal portfolio for a CS × Neuroscience student at Bar-Ilan University. Built from scratch in TypeScript + React + Vite + Tailwind + Framer Motion. The arcade theme is committed enough that the homepage character runs on a mini canvas game engine I wrote in this repo — OOP entity hierarchy, AABB collision, 7-state FSM, custom event bus. Dark/light theme with system preference detection.

The game ("Roy Runner") is playable on **desktop** and **mobile**:

- **Desktop:** Space / ↑ / W / click to jump, ↓ / S to slide, Esc to quit.
- **Phone (landscape):** on-screen **JUMP** / **SLIDE** buttons, tap anywhere to start/restart, and a **fullscreen** toggle (with larger controls in fullscreen). Portrait shows a "rotate your phone" prompt. Device detection uses a `(pointer: coarse)` + orientation hook so desktop behaviour is untouched.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (Vite plugin)
- Framer Motion
- Vitest + Testing Library

## Dev

```bash
npm install
npm run dev
npm test
```

## Deploy

Hosted on Vercel — auto-deploys on push to `main`.
