# Step 11 · QA metrics (final build)

Measured on the production build (`vite preview`), Chromium.

## Lighthouse 12.8 (default throttling)

| | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Mobile | 96 | 100 | 100 | 100 | 1.7 s | 2.4 s | 120 ms | 0 |
| Desktop | 100 | 100 | 100 | 100 | 0.4 s | 0.6 s | 0 ms | 0 |

## Page weight and runtime (Playwright, 4× CPU throttle, fast 4G)

| | Baseline | Sections done (step 09) | Final |
|---|---|---|---|
| First load, decoded (desktop) | 7,691 KB | 503 KB | 485 KB |
| First load over the wire | - | ≈240 KB | 229 KB (14 requests) |
| Initial JS (gzip) | - | 109.7 KB | 102.9 KB |
| `public/` folder | 28.6 MB | 8.4 MB | 2.2 MB |
| Game download after PRESS START | 8.1 MB | 8.1 MB | 1.9 MB |
| LCP, mobile 390 | - | 1.22 s | 1.01 s |
| CLS | - | 0 | 0 |
| Tab stops, desktop / mobile | - | 82 / 77 | 41 / 36 |

## Accessibility and typography

- axe-core: 0 violations at 1280 and 390, day and night, including the open pause menu.
- Pixel-font text below 12px: 0. Body text below 13px: 0. Emoji in the UI: 0 (only ©).
- Every button label fits on one line from 360 to 1440px.
- The theme is applied before first paint (no day flash for night visitors).

## SEO keep-list

Compared with the pre-redesign `main`:

- `index.html`: all 17 title/meta/link tags and the JSON-LD block are byte-identical after whitespace normalisation.
- `robots.txt`, `sitemap.xml` and the Google verification file are unchanged.
- `og-image.png` keeps its path and meta; the image is regenerated at 1200×630 from the new title screen (194 KB → 56 KB).

## Tests

`npx vitest run`: 400 passed. `npx tsc -p tsconfig.app.json --noEmit`: clean. `npm run build`: passes.
