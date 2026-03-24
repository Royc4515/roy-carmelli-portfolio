# Portfolio Improvement Plan — Developer-First
**Repo:** `github.com/Royc4515/roy-carmelli-portfolio`  
**Stack:** Vite 6 · React 18 · TypeScript · Tailwind CSS v4 · Framer Motion · Lucide React  
**Deployed:** `roy-carmelli-portfolio.vercel.app`

---

## How to use this plan

Read it fully before writing any code. Execute one phase at a time. After each phase, run `npm run dev` and verify visually before moving on.

---

## Core philosophy — portfolio ≠ CV

The CV is for HR. It lists everything: grades, military timeline, fellowships.  
The portfolio is for **engineers and engineering managers**. It answers one question: **can this person build things?**

The best developer portfolios (Brittany Chiang, Olaolu Olawuyi, Rob Bowen) share a structure:
1. **Who you are** — one sharp sentence, no fluff
2. **What you've built** — projects with real context: what was the problem, how did you solve it, what can I click
3. **How to reach you** — one clear CTA

Everything else is noise. IDF timeline, course grades, StandWithUs — that's CV territory. The one exception: a single line in About that mentions the dual degree and military service, because together they say something real about who you are. One line. Not a timeline.

---

## Diagnosis — what to cut from the previous plan

The previous plan was too CV-like. These items are **removed**:
- `src/sections/Experience.tsx` — full IDF timeline with bullet points — belongs on the CV, not here
- Course grade chips (93, 92, 96...) — HR content, not developer content
- StandWithUs fellowship — irrelevant to engineering
- "At a glance" card rows for Service and Languages — CV fields
- `gpa` field in `bio.ts` — no grade numbers in the UI

What carries over from the previous plan (unchanged): project descriptions, theme toggle, meta tags, resume download button, footer polish.

---

## Phase 1 — Content & Identity

> Pure data changes. No new components, no styling. Highest ROI.

---

### Task 1 · Replace `src/data/bio.ts`

Replace the entire file with exactly this:

```typescript
// src/data/bio.ts

export const bio = {
  name: "Roy Carmelli",
  nameHe: "רועי כרמלי",
  title: "CS × Brain Sciences",
  institution: "Bar-Ilan University",
  location: "Israel",
  tagline: "I build things at the intersection of software and the mind.",
  about: `I'm a Computer Science and Brain Sciences student at Bar-Ilan University — one of the few programs that puts software engineering depth and hands-on neuroscience research in the same degree.

I ship full-stack apps, data pipelines, and browser extensions. I use AI deliberately as part of how I work — not as a shortcut, but as a tool I understand. I'm drawn to problems that sit at the edge of CS and neuroscience: how software models cognition, how data reveals something real about the brain.

When I'm not building, I'm serving in the IDF reserves — which has taught me more about ownership and operating under pressure than any course could.`,
  email: "Roy.y.carmelli@gmail.com",
  github: "https://github.com/Royc4515",
  linkedin: "https://linkedin.com/in/roy-carmelli",
  facebook: "https://www.facebook.com/roy.carmelli",
  phone: "+972547287807",
  photo: null as string | null,
};

export const skills = [
  { category: "Languages",        items: ["Java 17", "Python", "C", "JavaScript", "TypeScript", "x86 Assembly"] },
  { category: "Web & Full Stack",  items: ["React", "Vite", "Node.js", "Express", "Tailwind CSS", "SQLite", "Google OAuth"] },
  { category: "Data & Neuro",      items: ["NumPy", "Pandas", "Matplotlib", "SciPy", "Jupyter", "OpenNeuro"] },
  { category: "CS Foundations",    items: ["OOP", "Data Structures", "Algorithms", "Systems Programming"] },
  { category: "Tools",             items: ["Git", "IntelliJ", "PyCharm", "CLion", "Railway", "GitHub Pages"] },
];
```

**Key decisions:**
- No `gpa` field — grade numbers don't belong in a developer portfolio
- `about` mentions IDF in exactly one sentence — context, not biography
- `tagline` leads with building, not credentials

---

### Task 2 · Replace `src/data/projects.ts`

Projects are the heart of the portfolio. Each description answers: what was the problem, what did you actually build, what can I click. Replace the entire file:

```typescript
// src/data/projects.ts
import { Project } from '../types/index';

export const projects: Project[] = [
  {
    id: "career-predictor",
    title: "CareerPredict AI",
    description: "Full-stack web app: Google OAuth login → 5-question quiz → AI-generated career portrait with 100+ unique outcomes. Built to learn OAuth flows, session management, and client-server architecture from scratch. React/Vite/Tailwind frontend, Node/Express + Passport.js backend, SQLite persistence — production-deployed on Railway.",
    tech: ["React 19", "Vite", "Tailwind CSS", "Node.js", "Express", "Passport.js", "SQLite", "Google OAuth"],
    github: "https://github.com/Royc4515/career-predictor",
    live: "https://career-predictor-production-a8bd.up.railway.app/",
    featured: true,
    year: 2026,
  },
  {
    id: "background-cognitive-correlation",
    title: "Background–Cognitive Correlation",
    description: "Research data pipeline investigating socio-educational predictors of children's cognitive outcomes using the OpenNeuro dataset (N=56). Owned the full analysis: data merging, ISCO scoring, LISAS metric, hierarchical OLS regression, Spearman heatmaps. 84 commits, pytest suite, reproducible Jupyter notebook.",
    tech: ["Python", "Pandas", "NumPy", "Matplotlib", "SciPy", "Jupyter", "pytest"],
    github: "https://github.com/Royc4515/background-cognitive-correlation",
    featured: true,
    year: 2026,
  },
  {
    id: "white-matter-game",
    title: "White Matter Tracts Game",
    description: "Browser-based neuroanatomy learning tool — drag-and-drop game for white matter tract classification. Training mode with instant feedback and a timed Test mode. Designed the architecture and UX, directed AI-assisted implementation. Vanilla JS, zero dependencies, mobile-responsive.",
    tech: ["JavaScript", "HTML", "CSS"],
    github: "https://github.com/Royc4515/white-matter-tracts-game",
    live: "https://royc4515.github.io/white-matter-tracts-game",
    featured: false,
    year: 2025,
  },
  {
    id: "arkanoid-game",
    title: "Arkanoid Game",
    description: "Functional Arkanoid clone in Java 17. The point was the architecture: clean OOP — inheritance, polymorphism, encapsulation — with a custom game loop and collision detection. Documented and refactored.",
    tech: ["Java 17", "OOP", "Game Loop", "Collision Detection"],
    github: "https://github.com/Royc4515/ArkanoidGame",
    featured: false,
    year: 2025,
  },
  {
    id: "portfolio",
    title: "This Portfolio",
    description: "Built from scratch. Vite + React + TypeScript + Tailwind CSS + Framer Motion. Dark/light theme with system preference detection.",
    tech: ["React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion"],
    github: "https://github.com/Royc4515/roy-carmelli-portfolio",
    featured: false,
    year: 2026,
  },
];
```

---

### Task 3 · Update `index.html` meta tags

Replace the `<title>` and all `<meta>` content in `<head>` with:

```html
<title>Roy Carmelli — CS × Brain Sciences</title>
<meta name="description" content="Roy Carmelli — CS and Brain Sciences student at Bar-Ilan University. Building full-stack apps and data tools at the intersection of software and the mind." />

<meta property="og:type" content="website" />
<meta property="og:url" content="https://roy-carmelli-portfolio.vercel.app/" />
<meta property="og:title" content="Roy Carmelli — CS × Brain Sciences" />
<meta property="og:description" content="CS and Brain Sciences, Bar-Ilan University. Full-stack developer, data tools, neuroscience." />

<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Roy Carmelli — CS × Brain Sciences" />
<meta name="twitter:description" content="CS and Brain Sciences, Bar-Ilan University." />
```

Keep existing `<link rel="icon">`, `<meta charset>`, `<meta viewport>` unchanged.

---

## Phase 2 — Dark / Light Theme Toggle

> Adds full light theme and a toggle button in the navbar. System preference detection included.

---

### Task 4 · Update `src/index.css` — add light theme variables

Keep the existing `:root` block exactly as-is. Add this **directly after** the closing `}` of `:root`:

```css
[data-theme="light"] {
  --bg-primary:     #fafafa;
  --bg-secondary:   #f3f3f7;
  --bg-card:        #ffffff;
  --accent:         #0d9488;
  --accent-dim:     rgba(13, 148, 136, 0.10);
  --accent-hover:   #0f766e;
  --text-primary:   #0f0f1a;
  --text-secondary: #444466;
  --text-muted:     #888899;
  --border:         rgba(0, 0, 0, 0.08);
}
```

Add this rule after the `[data-theme="light"]` block, before the `* { margin: 0 }` reset:

```css
/* smooth theme transition — exclude animated elements */
*:not([style*="transform"]):not([style*="opacity"]) {
  transition: background-color 0.25s ease, border-color 0.25s ease, color 0.15s ease;
}
```

---

### Task 5 · Create `src/hooks/useTheme.ts`

Create a new file at this exact path:

```typescript
// src/hooks/useTheme.ts
import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
```

---

### Task 6 · Wire theme into `App.tsx` and `Navbar.tsx`

**`src/App.tsx`** — final structure:

```tsx
// src/App.tsx
import { useTheme } from './hooks/useTheme';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './sections/Hero';
import About from './sections/About';
import Projects from './sections/Projects';
import Resume from './sections/Resume';
import Contact from './sections/Contact';

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <>
      <Navbar theme={theme} onThemeToggle={toggle} />
      <main>
        <Hero />
        <About />
        <Projects />
        <Resume />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
```

> Skills is intentionally not imported here — removed in Task 10.

**`src/components/Navbar.tsx`** — three changes:

**1.** Add props interface at the top of the file:

```tsx
interface NavbarProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export default function Navbar({ theme, onThemeToggle }: NavbarProps) {
```

**2.** Update the `links` array — remove Skills, keep three links:

```tsx
const links: NavLink[] = [
  { label: 'About',    href: '#about'    },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact',  href: '#contact'  },
];
```

**3.** Add the theme toggle button inside the desktop `<ul>`, after the last nav link `<li>`:

```tsx
<li>
  <button
    onClick={onThemeToggle}
    aria-label="Toggle theme"
    style={{
      background: 'none',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      cursor: 'pointer',
      padding: '4px 10px',
      color: 'var(--text-muted)',
      fontSize: '0.85rem',
      lineHeight: 1,
      transition: 'border-color 0.2s, color 0.2s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'var(--accent)';
      e.currentTarget.style.color = 'var(--accent)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.color = 'var(--text-muted)';
    }}
  >
    {theme === 'dark' ? '☀' : '☾'}
  </button>
</li>
```

**4.** Fix the hardcoded dark background color in the Navbar's inline style. Replace `rgba(9,9,15,0.95)` with:

```tsx
background: scrolled || menuOpen
  ? 'color-mix(in srgb, var(--bg-primary) 95%, transparent)'
  : 'transparent',
```

Also update the mobile fullscreen overlay `background` from the hardcoded hex to `var(--bg-primary)`.

---

## Phase 3 — Resume Download Button

> One new file. A single clean CTA — no section heading needed.

---

### Task 7 · Create `src/sections/Resume.tsx`

Sits between Projects and Contact. One centered button, nothing else.

```tsx
// src/sections/Resume.tsx
import { Download } from 'lucide-react';

export default function Resume() {
  return (
    <section
      style={{
        padding: '1rem 2rem 4rem',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <a
        href="/Roy_Carmelli_CV.pdf"
        download="Roy_Carmelli_CV.pdf"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.75rem',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          borderRadius: '4px',
          textDecoration: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.color = 'var(--accent)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <Download size={14} />
        Download Resume
      </a>
      {/* TODO: place Roy_Carmelli_CV.pdf in /public before deploying */}
    </section>
  );
}
```

---

## Phase 4 — Polish

> Independent tasks. Do in any order after Phase 3.

---

### Task 8 · `src/sections/Hero.tsx` — one copy tweak

Change the `"Get in Touch"` button label to `"Contact me"`. More direct. That's the only change needed here — the subtitle already renders from `bio.title`, which now reads `"CS × Brain Sciences"` after Task 1.

---

### Task 9 · `src/sections/About.tsx` — replace broken photo placeholder

`bio.photo` is `null`. The current code renders a dashed box with `"photo.jpg"` text — looks broken. Replace it with a clean stats card showing only developer-relevant info. No grades, no service details, no languages — those belong on the CV.

Replace the entire right-column `<div>` (the one with `bg-card` that currently holds the photo ternary) with:

```tsx
<div style={{
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '2rem',
}}>
  <p style={{
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: 'var(--accent)',
    letterSpacing: '0.1em',
    marginBottom: '1.25rem',
    textTransform: 'uppercase',
  }}>
    At a glance
  </p>
  {[
    { label: 'Degree',     value: 'B.Sc. CS & Brain Sciences' },
    { label: 'University', value: 'Bar-Ilan University' },
    { label: 'Currently',  value: '2nd year, 2024–present' },
    { label: 'Open to',    value: 'Internships · Research · Collaborations' },
  ].map(({ label, value }, i, arr) => (
    <div
      key={label}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '1rem',
        padding: '0.75rem 0',
        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
      }}
    >
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  ))}
</div>
```

Also remove the three `<span>` links (institution, location, github) below the card — redundant with the Contact section.

---

### Task 10 · Remove Skills section

In `App.tsx`, remove the `import Skills` line and remove `<Skills />` from JSX. Do not delete the file.

The skills are already visible in every project card's tech tags. A separate grid of pills adds nothing and makes the site feel like a template.

---

### Task 11 · `src/components/Footer.tsx` — two-line footer

```tsx
// src/components/Footer.tsx
export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '2rem',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
    }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Designed and built by Roy Carmelli · {new Date().getFullYear()}
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.6 }}>
        React · TypeScript · Framer Motion
      </p>
    </footer>
  );
}
```

---

### Task 12 · Update section number labels

After removing Skills, fix the section counters in the remaining sections:

- `About.tsx` → `"01. about"` ✓ unchanged
- `Projects.tsx` → `"02. projects"` (was `"03. projects"`)
- `Contact.tsx` → `"03. contact"` (was `"04. contact"`)

---

## Execution summary

| Phase | Task | File(s) | What changes |
|-------|------|---------|-------------|
| 1 | Task 1  | `src/data/bio.ts` | New title, tagline, about — no grades, no biography |
| 1 | Task 2  | `src/data/projects.ts` | Story-driven descriptions for all 5 projects |
| 1 | Task 3  | `index.html` | Better title, meta description, og tags |
| 2 | Task 4  | `src/index.css` | Add `[data-theme="light"]` variables + transition rule |
| 2 | Task 5  | `src/hooks/useTheme.ts` | New file — create it |
| 2 | Task 6  | `src/App.tsx`, `src/components/Navbar.tsx` | Wire hook, add toggle button, simplify nav, fix hardcoded colors |
| 3 | Task 7  | `src/sections/Resume.tsx` | New file — resume download button |
| 4 | Task 8  | `src/sections/Hero.tsx` | Button label copy tweak |
| 4 | Task 9  | `src/sections/About.tsx` | Replace broken photo placeholder with stats card |
| 4 | Task 10 | `src/App.tsx` | Remove Skills section from render |
| 4 | Task 11 | `src/components/Footer.tsx` | Two-line footer |
| 4 | Task 12 | `src/sections/Projects.tsx`, `Contact.tsx` | Update section number labels |

---

## Final page structure

```
Navbar  —  rc.dev  ·  About  ·  Projects  ·  Contact  ·  ☀/☾
│
├── Hero       — name · "CS × Brain Sciences" · tagline · [View Projects] [Contact me]
├── About      — 3-paragraph bio + "at a glance" card (degree, university, open to)
├── Projects   — 2 featured cards + 3 list cards, each: description + tech tags + GitHub/Live links
├── Resume     — single centered "Download Resume" button
└── Contact    — "Let's Talk" + email CTA + social icons
│
Footer  —  built by · stack credit
```

The CV handles the rest. The portfolio handles this.

---

## Out of scope — add later

- **Photo** — set `bio.photo` in `bio.ts` to the path. `About.tsx` already checks for it and renders it, replacing the stats card fallback.
- **`og:image`** — add a social preview image to `/public`, reference it in `index.html`
- **`Roy_Carmelli_CV.pdf`** — place your CV PDF in `/public`. The Resume button links to `/Roy_Carmelli_CV.pdf`.
- **Custom domain** — Vercel dashboard only, no code changes needed
- **Project screenshots** — add an optional `image` field to the `Project` type in `src/types/index.ts` and render thumbnails in the featured project cards

---

*End of plan.*
