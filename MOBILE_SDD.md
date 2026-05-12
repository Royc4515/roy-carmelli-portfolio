# MOBILE_SDD — Mobile Responsiveness

**Branch:** `feature/mobile-responsiveness`  
**Breakpoint contract:** `< 768px` = mobile, `≥ 768px` = desktop (maps to Tailwind `md:`)  
**Stack note:** The codebase uses **inline styles almost exclusively**, not Tailwind utility classes. "Mobile-First" here means adding a `useIsMobile` hook and conditional style objects — not migrating to Tailwind prefixes (that would be a separate refactor and out of scope).

---

## 1. Component Audit

### 1.1 Structural Changes Required (logic / JSX changes)

| Component | Problem | Fix |
|---|---|---|
| `Navbar.tsx` | Hamburger visibility is split across an inline `display:'none'` and a `<style>` tag media query — fragile and non-reactive | Replace `<style>` tag with `useIsMobile`-driven conditional render; expose hamburger only on mobile |
| `Hero.tsx` | `HERO_CHARACTER_OFFSET_X = -375px` hard-coded pixel shift pushes character ~375px left, causing overflow on any viewport < ~520px | Hide character panel on mobile; show a centered, condensed hero instead |
| `Hero.tsx` | Clicking "PRESS START" or the Arcade nav button on mobile launches `MiniGame` — the canvas is 800×446 intrinsic pixels, unusable at < 768px | Intercept `isPlaying` on mobile: render `<ArcadeFallback />` instead of `<MiniGame />` |
| `Arcade.tsx` | Renders `<MiniGame />` unconditionally with no fallback | Render `<ArcadeFallback />` when `isMobile` |

### 1.2 Style-Only Changes (no structural JSX changes)

| Component | Problem | Fix |
|---|---|---|
| `Projects.tsx` | Side-by-side flex layout: ZoneLabel sidebar (minWidth 140px) + content (minWidth 280px) forces `420px` minimum width before wrap | Lower `minWidth` thresholds; ensure column wraps naturally on mobile |
| `Skills.tsx` | Same sidebar/content pattern | Same fix |
| `About.tsx` | Same sidebar/content pattern | Same fix |
| `Contact.tsx` | Same sidebar/content pattern + social button row can overflow | Same fix; ensure social buttons wrap |
| `PixelPanel.tsx` | Fixed `padding: 1.5rem` is fine on desktop; acceptable as-is | No change needed |
| `Footer.tsx` | Fine as-is | No change needed |

---

## 2. New Shared Infrastructure

### 2.1 `useIsMobile` Hook — `src/hooks/useIsMobile.ts`

```
const isMobile = useIsMobile()   // true when window.innerWidth < 768
```

- Uses `window.matchMedia('(max-width: 767px)')` with a `change` event listener.
- Returns a stable boolean; re-renders components only on viewport crossing.
- Single source of truth — avoids duplicated media query strings across components.

**Why a hook over CSS media queries?** Because the existing components use conditional JSX rendering (e.g., `{isPlaying && <MiniGame />}`). CSS alone cannot conditionally mount/unmount React subtrees. The hook enables both style-level and render-level decisions in one pass.

### 2.2 `ArcadeFallback` Component — `src/components/ArcadeFallback.tsx`

A pixel-art "terminal screen" UI shown instead of `<MiniGame />` on mobile.

```
┌─────────────────────────────────────┐
│  [pixel monitor icon / 🖥]          │
│                                     │
│  ARCADE ZONE                        │
│                                     │
│  Roy Runner requires a              │
│  larger screen to play.             │
│                                     │
│  Open on desktop or rotate          │
│  to landscape mode.                 │
│                                     │
│  [ ▶ PLAY ON DESKTOP ]              │
└─────────────────────────────────────┘
```

- Styled with `PixelPanel variant="dark"` and pixel typography to match the aesthetic.
- No game engine is initialised; no canvas is mounted.
- Dismissable if the user rotates to landscape (re-checked via `useIsMobile`).

---

## 3. Mobile Navigation State Strategy

### Current state (Navbar.tsx)
- `menuOpen: boolean` — already exists via `useState`.
- Body scroll-lock — already implemented via `useEffect`.
- Hamburger button — already exists in JSX but is **hidden via a `<style>` tag** (`@media (max-width: 640px) { .rpg-hamburger { display: block !important } }`), not via the React render tree.
- The overlay animation (opacity 0/1 + `pointerEvents`) already works.

### New strategy
1. Remove the `<style>` tag media query hack entirely.
2. Use `useIsMobile()` to conditionally render the hamburger button and hide the desktop nav links:
   ```tsx
   {isMobile ? <HamburgerButton /> : <DesktopNavLinks />}
   ```
3. Close menu on navigation link click — already implemented.
4. Touch targets: overlay nav links get `minHeight: 44px` / `padding: '0.875rem 2rem'` to meet the 44×44px spec.
5. Theme toggle button: increase from `40×40px` to `44×44px` on mobile.

**Why not keep the `<style>` tag?** It relies on CSS `!important` overriding inline styles — a brittle pattern that breaks if the inline styles change order or specificity. The React-controlled approach is explicit and testable.

---

## 4. MiniGame Fallback Strategy

### Breakpoint rule
`isMobile === true` (< 768px) → render `<ArcadeFallback />`  
`isMobile === false` (≥ 768px) → render `<MiniGame />`

### Affected locations
| Location | Current | After |
|---|---|---|
| `Hero.tsx` — game overlay | `<MiniGame onQuit={...} />` | `{isMobile ? <ArcadeFallback /> : <MiniGame onQuit={...} />}` |
| `Hero.tsx` — "PRESS START" button | Always sets `isPlaying = true` | On mobile: scroll to `#arcade` instead of launching game |
| `Arcade.tsx` — canvas section | `<MiniGame />` | `{isMobile ? <ArcadeFallback /> : <MiniGame />}` |

### Canvas scaling note
`CANVAS_CONFIG.width = 800` (intrinsic). The canvas element already has `maxWidth: '100%'` in its inline style, so it will **visually scale** on small screens. However, the game engine writes to the canvas at native 800-pixel coordinates — touch interactions and collision detection are offset. Hiding the canvas entirely on mobile is the correct call.

---

## 5. Touch Target Compliance (44×44px)

| Element | Current | After |
|---|---|---|
| Hamburger button | `~38×38px` | `48×48px` |
| Theme toggle | `40×40px` | `44×44px` |
| Mobile overlay nav items | Variable | `minHeight: 44px` |
| Hero CTA buttons | `~40px tall` | Verified ≥ 44px |
| Contact social icons | `64×~48px` | Already compliant |

---

## 6. Regression Safeguards

- Desktop layout (`≥ 768px`) touches **zero** structural changes.
- The `useIsMobile` hook is `false` on desktop — every conditional renders the identical JSX as today.
- `HERO_CHARACTER_OFFSET_X` constant is **unchanged**; it is simply not applied on mobile (character hidden).
- No Tailwind class names on existing desktop elements are modified.

---

## 7. Files to Create / Modify

| File | Action |
|---|---|
| `src/hooks/useIsMobile.ts` | **Create** |
| `src/components/ArcadeFallback.tsx` | **Create** |
| `src/components/Navbar.tsx` | **Modify** |
| `src/sections/Hero.tsx` | **Modify** |
| `src/sections/Arcade.tsx` | **Modify** |
| `src/sections/Projects.tsx` | **Modify** (style tweaks) |
| `src/sections/Skills.tsx` | **Modify** (style tweaks) |
| `src/sections/About.tsx` | **Modify** (style tweaks) |
| `src/sections/Contact.tsx` | **Modify** (style tweaks) |

**Test files (TDD — Step 3):**

| File | Covers |
|---|---|
| `src/hooks/useIsMobile.test.ts` | Hook responds to matchMedia changes |
| `src/components/Navbar.test.tsx` | `menuOpen` toggle, overlay visibility, link click closes menu |
| `src/components/ArcadeFallback.test.tsx` | Renders correctly, no canvas mounted |
| `src/sections/Hero.test.tsx` | PRESS START on mobile scrolls instead of playing; MiniGame not rendered on mobile |
| `src/sections/Arcade.test.tsx` | ArcadeFallback rendered when isMobile; MiniGame rendered when desktop |

---

*Awaiting approval before proceeding to Step 3 (TDD).*
