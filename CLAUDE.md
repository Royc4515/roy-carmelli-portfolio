# CLAUDE.md - roy-carmelli-portfolio

## What this is
Roy Carmelli's personal portfolio site, built as a pixel-RPG title screen with a playable endless runner, so recruiters hiring for student/intern full-stack and AI roles in Israel can see his projects, CV and contact info in one page.

Live: https://roy-carmelli-portfolio.vercel.app/ (Vercel, auto-deploys on push to `main`).

## Stack & layout
- Vite 6 + React 18 + TypeScript, Tailwind CSS v4 (Vite plugin), Framer Motion via `LazyMotion` + `m`, Vitest + Testing Library (jsdom).
- `src/data/bio.ts`, `src/data/projects.ts` - ALL recruiter-facing copy (bio, skills, project cards). Most content edits happen here.
- `src/sections/` - page zones: Hero, Projects, About, Skills, Resume, Contact.
- `src/components/ui/` - design-system primitives (Button, PixelPanel, Chip, ZoneHeader, ZoneBanner, Toast, Reveal).
- `src/components/MiniGame/` - "Roy Runner" canvas engine (GameEngine, Player, Obstacle, SpriteRenderer, config) and the `Scoreboard` dialog. Lazy-loaded from `Hero.tsx`.
- `api/` - Vercel Functions for the Roy Runner scoreboard (`session`, `runs`, `leaderboard`; shared code in `api/_lib/`, tests in `api/_tests/`). Neon Postgres via `DATABASE_URL`. Setup in `docs/leaderboard/SETUP.md`.
- `src/lib/runnerScores.ts` (`ScoreApi` client, local best), `src/lib/googleIdentity.ts`, `src/hooks/useRunnerScores.ts`, `src/components/MiniGame/Scoreboard.tsx` - the browser side of the scoreboard.
- `api/chat.ts` + `api/_lib/chat/` - Pixel Roy, the AI chat agent (Groq free tier): validate -> rate limit -> Prompt Guard -> BM25 retrieval -> model fallback chain -> output hooks. Setup and safety in `docs/chat/SETUP.md`.
- `src/components/Chat/` (`ChatLauncher` floating button, lazy `ChatPanel`), `src/hooks/useChat.ts`, `src/lib/chatApi.ts`, `src/data/chatPersona.ts` (UI copy) - the browser side of the chat. The model's persona and rules are in `api/_lib/chat/prompt.ts`.
- `src/lib/chatKnowledge.ts` - compiles the chat's knowledge from `src/data/` (`bio.ts`, `projects.ts`, `linkedin.ts`, `github.generated.json`).
- `src/hooks/` - theme, media queries, game display mode, active section, hash scroll.
- `src/theme/` - tokens, motion, and the GENERATED `pixelSprites.ts`.
- `src/dev/Gallery.tsx` - dev-only component gallery at `/?gallery`.
- `index.html` - SEO meta, JSON-LD Person data, and the pre-paint theme script.
- `public/` - `Roy_Carmelli_CV.pdf`, fonts, sprites, sitemap, robots, Search Console verification file.
- `scripts/pixelate/` - Python pipeline that regenerates pixel art + `pixelSprites.ts`.
- `docs/redesign/SPEC.md` - design-system source of truth; `docs/redesign/*` and `docs/copy-refresh/*` hold before/after screenshots.

## Commands
- `npm install` (or `npm ci`) - verified.
- `npm run dev` - Vite dev server on port 5173 (unverified here).
- `npm test` - `vitest run`; verified: 55 files / 684 tests pass (the `api/_tests` files run in the node environment). jsdom logs "getContext() not implemented" warnings for the canvas; they are expected, not failures.
- `npm run build` - `tsc -b && vite build`; verified. `tsc -b` also typechecks `api/` (its own `api/tsconfig.json`).
- `vercel dev` - runs the site with the `/api` functions locally (needs `vercel link` + `vercel env pull`; unverified here). Plain `npm run dev` has no `/api`.
- `npm run test:coverage` - v8 coverage (unverified).
- `python3 scripts/pixelate/pixelate.py` - needs Pillow + numpy (unverified).
- `npx vitest run src/lib/chatKnowledge.test.ts -u` - regenerates the chat knowledge after a data edit; verified.
- `node scripts/chat/snapshot-github.mjs [--repos-json file]` - refreshes `src/data/github.generated.json` from the allowlisted public repos; verified with `--repos-json` (this cloud session's proxy blocks `api.github.com/users/...`).
- `node scripts/chat/eval.mjs <url>` - 14 live normal and adversarial questions against a running chat (needs a real Groq key; unverified here).
- No CI in this repo; run tests and build locally before pushing, since every push to `main` deploys.

## Conventions (Roy's standing rules)
- Comments explain WHY, not what.
- Flag counterintuitive, load-bearing or past-bug-hiding lines with a `// don't touch / <reason>` comment (in CSS: `/* don't touch / <reason> */`).
- Edge cases and input validation are priorities; prefer clean OOP, good naming, reuse.
- No em dashes in any user-facing text or docs; use a plain hyphen.
- Secrets only via environment variables, never committed (`.env*` is gitignored). Env vars (all optional, see `.env.example`): `VITE_GOOGLE_CLIENT_ID` (public, shared by the build and `api/`), `SESSION_SECRET` and `DATABASE_URL` (server only), `GROQ_API_KEY` (server only), `VITE_CHAT_ENABLED` (public launcher switch), `CHAT_MODELS` / `CHAT_ENABLED` / `CHAT_GUARD` (optional). Never give a secret a `VITE_` prefix: Vite inlines those into the bundle.
- Components use semantic tokens from `src/index.css`, never raw hex (per `docs/redesign/SPEC.md`).

## Repo-specific rules
- This site is what recruiters see. Every project claim in `src/data/projects.ts` must match that project's actual repo; never add metrics or claims that are not backed.
- Describe Roy's military service as "battalion medic (חוג"ד), operational support role" - never "combat medic".
- The site is English-only (`<html lang="en">`); Hebrew appears only in `bio.nameHe` and the JSON-LD `alternateName`. If any Hebrew/RTL copy is added, check both RTL and LTR rendering.
- Keep `index.html` meta/OG/JSON-LD descriptions in sync with `bio.ts` when the headline or degree wording changes.

## Gotchas
- The service wording was fixed: `src/sections/About.test.tsx` now asserts "combat medic" never appears; the chat enforces the same rule in its prompt, its knowledge test and its output `styleHook`.
- `src/theme/pixelSprites.ts` and `public/assets/pixel/*` are generated by `scripts/pixelate/pixelate.py`. Do not hand-edit; change the script or sources and re-run.
- Theme key `roy-portfolio-theme` is duplicated in the inline script in `index.html` and `src/hooks/useTheme.ts`; `data-theme` set pre-paint is the source of truth. Change both together.
- Game display mode gates on `(pointer: coarse)` + orientation, not width, because landscape phones exceed the 767px breakpoint (`src/hooks/useGameDisplayMode.ts`).
- iPhone Safari has no element Fullscreen API; `MiniGame.tsx` falls back to a CSS fixed overlay.
- `Chip.tsx` sets `role="list"` because Safari drops list semantics when `list-style: none`.
- `main.tsx` wraps the app in `LazyMotion strict`: using a full `motion.*` component throws. Use `m.*`.
- `MiniGame` is lazy-imported with a `.catch` to `GameLoadFailed`; keep that fallback when touching the import.
- `vite.config.ts` excludes `.claude/**` from tests so agent worktrees are not collected.
- Scoreboard: without `VITE_GOOGLE_CLIENT_ID` it is `offline` (no trophy, no Leaderboard button, local best only); tests run that way. The API answers 503 when any server var is missing.
- `api/` imports use explicit `.js` extensions and `api/tsconfig.json` is NodeNext: the package is `"type": "module"` and Vercel runs the functions as native ESM, where extensionless imports fail at runtime. Never import `src/` code from `api/` (browser code).
- Files under `api/` are deployed as functions unless they (or a parent folder) start with `_`; keep helpers in `api/_lib` and tests in `api/_tests`.
- `api/_lib/scoring.ts` duplicates `SCORE_CONFIG.pointsPerSecond` (8); `api/_tests/lib.test.ts` fails if they drift, which would reject real scores.
- Google "Authorized JavaScript origins" allow no wildcards: a new domain or a preview to test sign-in on must be added there by hand.
- Chat knowledge is a GENERATED file (`api/_lib/chat/knowledge.generated.ts`) written by `src/lib/chatKnowledge.test.ts`: editing `bio.ts`, `projects.ts`, `linkedin.ts` or the GitHub snapshot fails `npm test` until it is refreshed with `-u`. It must never contain the phone number or the city (tested).
- The chat's GitHub view is an allowlist (`scripts/chat/github-allowlist.json`); a new public repo is invisible to it until added. A repo behind a site card is folded into the card; its README is not used.
- Chat config (`readChatConfig`) is separate from the scoreboard's, but reuses `DATABASE_URL` and `SESSION_SECRET` (as the IP-hash salt). Without them the chat API answers 503. The limiter fails closed (DB down = no model call); the Prompt Guard fails open (output hooks still run).
- Chat daily caps (`api/_lib/chat/limiter.ts`: 15 per visitor, 150 site-wide) are sized under Groq's free token limits; raise them only after checking `cached` in the function logs. Never add billing to the Groq account: the free tier is what makes the chat unable to cost money.
- `Hero.tsx` sets `data-arcade-playing` on `<html>` while the game runs; the chat launcher hides on it. The launcher sits at z 90 (below the nav); an open phone sheet goes to z 150.
- Chat design rules are in `docs/redesign/SPEC.md` §3 "Chat (Pixel Roy)". Typed answers keep the full text in the DOM as `sr-only` until typing ends (`useTypewriter` + `TypedText`), so tests find it with `getByText` and the live region announces it once; the class flips, the node is not replaced. The launcher's speech bubble is remembered per session under `pixel-roy-bubble-seen`. Only the chat log may shrink (it once overflowed the frame on a short laptop window); the sheet query `SHEET_QUERY` in `ChatPanel.tsx` must match the `@media` in `ChatLauncher.css`.
- `MOBILE_SDD.md` is partly stale (mentions `Arcade.tsx` and an inline-styles-only codebase); trust the code over it.
- Project claims drift as the source repos evolve (e.g. test counts). Re-verify numbers against the source repo before editing a card.
