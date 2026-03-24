# Portfolio Improvement Plan — Final
**Repo:** `github.com/Royc4515/roy-carmelli-portfolio`  
**Stack:** Vite 6 · React 18 · TypeScript · Tailwind CSS v4 · Framer Motion · Lucide React  
**Deployed:** `roy-carmelli-portfolio.vercel.app`

---

## How to use this plan

Read it fully before writing any code. Execute one phase at a time. Run `npm run dev` after each phase and verify visually before moving on.

---

## Design direction

**Neuro-inspired.** Warm amber accent (`#f59e0b`), an animated neural network background in the Hero, and a cycling word in the tagline. Everything else stays clean and minimal.

The neural net (barely visible at ~5% opacity, amber nodes + connections pulsing slowly) makes the portfolio unmistakably personal — no other developer has that angle. The tagline cycle (`why → how → both`) quietly tells the story of the dual degree without explaining it.

---

## Design tokens — new accent

Replace teal with amber throughout:

| Token | Dark | Light |
|-------|------|-------|
| `--accent` | `#f59e0b` | `#d97706` |
| `--accent-dim` | `rgba(245,158,11,0.10)` | `rgba(217,119,6,0.10)` |
| `--accent-hover` | `#fbbf24` | `#b45309` |

---

## Phase 1 — Content

> Pure data changes. No new components. Do this first.

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
  // tagline is split — the base sentence + the cycling word rendered separately in Hero.tsx
  taglineBase: "Writing software, studying brains, asking",
  taglineCycleWords: ["why", "how", "both"] as const,
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

---

### Task 2 · Replace `src/data/projects.ts`

Replace the entire file with exactly this:

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
    description: "Built from scratch. Vite + React + TypeScript + Tailwind CSS + Framer Motion. Neuro-inspired design with animated background and dark/light theme.",
    tech: ["React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion"],
    github: "https://github.com/Royc4515/roy-carmelli-portfolio",
    featured: false,
    year: 2026,
  },
];
```

---

### Task 3 · Update `index.html` meta tags

Replace `<title>` and all `<meta>` content — keep `<meta charset>`, `<meta viewport>`, and `<link rel="icon">` unchanged:

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

---

## Phase 2 — Accent Color & Theme Toggle

---

### Task 4 · Update `src/index.css`

**Step 1** — In the existing `:root` block, replace the three accent lines only:

```css
--accent:       #f59e0b;
--accent-dim:   rgba(245, 158, 11, 0.10);
--accent-hover: #fbbf24;
```

**Step 2** — Add this block **directly after** the closing `}` of `:root`:

```css
[data-theme="light"] {
  --bg-primary:     #fafafa;
  --bg-secondary:   #f3f3f7;
  --bg-card:        #ffffff;
  --accent:         #d97706;
  --accent-dim:     rgba(217, 119, 6, 0.10);
  --accent-hover:   #b45309;
  --text-primary:   #0f0f1a;
  --text-secondary: #444466;
  --text-muted:     #888899;
  --border:         rgba(0, 0, 0, 0.08);
}
```

**Step 3** — Add this rule after `[data-theme="light"]`, before the `* { margin: 0 }` reset:

```css
*:not([style*="transform"]):not([style*="opacity"]) {
  transition: background-color 0.25s ease, border-color 0.25s ease, color 0.15s ease;
}
```

---

### Task 5 · Create `src/hooks/useTheme.ts`

Create a new file:

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

**`src/components/Navbar.tsx`** — four changes:

**1.** Add props interface at top of file:

```tsx
interface NavbarProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}
export default function Navbar({ theme, onThemeToggle }: NavbarProps) {
```

**2.** Replace the `links` array:

```tsx
const links: NavLink[] = [
  { label: 'About',    href: '#about'    },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact',  href: '#contact'  },
];
```

**3.** Add theme toggle button inside the desktop `<ul>`, after the last nav `<li>`:

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

**4.** Fix hardcoded dark background. Replace `rgba(9,9,15,0.95)` with:

```tsx
background: scrolled || menuOpen
  ? 'color-mix(in srgb, var(--bg-primary) 95%, transparent)'
  : 'transparent',
```

Replace the mobile fullscreen overlay hardcoded background with `var(--bg-primary)`.

---

## Phase 3 — Neural Background + Cycling Word

> Two new component files, then Hero.tsx is updated to use both.

---

### Task 7 · Create `src/components/NeuralBackground.tsx`

Animated canvas behind the Hero. Nodes pulse, edges breathe. Opacity stays between 4–8% — it should be felt more than seen.

```tsx
// src/components/NeuralBackground.tsx
import { useEffect, useRef } from 'react';

const NODES = [
  { x: 0.08, y: 0.18 }, { x: 0.22, y: 0.08 }, { x: 0.38, y: 0.22 },
  { x: 0.18, y: 0.52 }, { x: 0.32, y: 0.68 }, { x: 0.55, y: 0.12 },
  { x: 0.65, y: 0.42 }, { x: 0.72, y: 0.18 }, { x: 0.85, y: 0.55 },
  { x: 0.92, y: 0.28 }, { x: 0.48, y: 0.55 }, { x: 0.15, y: 0.82 },
];

const EDGES: [number, number][] = [
  [0,1],[1,2],[2,5],[5,7],[7,9],[9,8],[8,6],[6,2],
  [6,10],[10,3],[3,4],[4,11],[10,4],[1,5],[3,0],[2,10],
];

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.008;

      EDGES.forEach(([a, b], i) => {
        const alpha = 0.04 + 0.035 * Math.sin(t + i * 0.7);
        ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(NODES[a].x * W, NODES[a].y * H);
        ctx.lineTo(NODES[b].x * W, NODES[b].y * H);
        ctx.stroke();
      });

      NODES.forEach((n, i) => {
        const alpha = 0.12 + 0.08 * Math.sin(t * 1.3 + i * 1.1);
        ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`;
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!prefersReducedMotion) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
```

---

### Task 8 · Create `src/components/CyclingWord.tsx`

A single word that fades out, swaps, then fades back in on a 2.4s interval.

```tsx
// src/components/CyclingWord.tsx
import { useState, useEffect } from 'react';

interface CyclingWordProps {
  words: readonly string[];
}

export default function CyclingWord({ words }: CyclingWordProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % words.length);
        setVisible(true);
      }, 350);
    }, 2400);

    return () => clearInterval(interval);
  }, [words]);

  return (
    <span
      style={{
        color: 'var(--accent)',
        fontStyle: 'inherit',
        borderBottom: '1px solid var(--accent-dim)',
        paddingBottom: '1px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        display: 'inline-block',
      }}
    >
      {words[index]}
    </span>
  );
}
```

---

### Task 9 · Rewrite `src/sections/Hero.tsx`

Replace the entire file. This version uses both new components and reads from the updated `bio` fields.

```tsx
// src/sections/Hero.tsx
import { motion } from 'framer-motion';
import { bio } from '../data/bio';
import NeuralBackground from '../components/NeuralBackground';
import CyclingWord from '../components/CyclingWord';

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay },
});

export default function Hero() {
  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 2rem',
        paddingTop: '100px',
        maxWidth: '900px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* Neural network background — absolutely positioned behind content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <NeuralBackground />
      </div>

      {/* Hero content — sits above the canvas */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.p {...fadeUp(0.1)} style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: 'var(--accent)',
          letterSpacing: '0.1em',
          marginBottom: '1.5rem',
          opacity: 0.9,
        }}>
          Hi, I'm
        </motion.p>

        <motion.h1 {...fadeUp(0.2)} style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem, 8vw, 6.5rem)',
          lineHeight: 1.05,
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
        }}>
          {bio.name}
        </motion.h1>

        <motion.h2 {...fadeUp(0.35)} style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.5rem, 4vw, 3rem)',
          lineHeight: 1.2,
          color: 'var(--text-muted)',
          marginBottom: '2rem',
          fontStyle: 'italic',
          letterSpacing: '-0.01em',
        }}>
          {bio.title}
        </motion.h2>

        {/* Tagline with cycling last word */}
        <motion.p {...fadeUp(0.5)} style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          maxWidth: '520px',
          lineHeight: 1.7,
          marginBottom: '3rem',
        }}>
          {bio.taglineBase}{' '}
          <CyclingWord words={bio.taglineCycleWords} />.
        </motion.p>

        <motion.div
          {...fadeUp(0.65)}
          className="hero-buttons"
          style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
        >
          <a
            href="#projects"
            style={{
              padding: '0.75rem 1.75rem',
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              borderRadius: '4px',
              textDecoration: 'none',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            View Projects
          </a>
          <a
            href="#contact"
            style={{
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
            Contact me
          </a>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hero-buttons { flex-direction: column !important; }
          .hero-buttons a { text-align: center !important; }
        }
      `}</style>
    </section>
  );
}
```

---

## Phase 4 — Remaining Section Updates

---

### Task 10 · `src/sections/About.tsx` — replace broken photo placeholder

`bio.photo` is `null`. Replace the entire right-column `<div>` (the one with `bg-card` that holds the photo ternary) with a clean stats card:

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

Also remove the three `<span>` links (institution, location, github) below the card — they're redundant with the Contact section.

---

### Task 11 · Create `src/sections/Resume.tsx`

New file — a single centered download button between Projects and Contact:

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

### Task 12 · Remove Skills section

In `App.tsx`, remove the `import Skills` line and remove `<Skills />` from JSX. Do not delete the file.

---

### Task 13 · Update section number labels

- `About.tsx` → `"01. about"` — unchanged
- `Projects.tsx` → `"02. projects"` (was `"03. projects"`)
- `Contact.tsx` → `"03. contact"` (was `"04. contact"`)

---

### Task 14 · `src/components/Footer.tsx` — two-line footer

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
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
      }}>
        Designed and built by Roy Carmelli · {new Date().getFullYear()}
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        opacity: 0.6,
      }}>
        React · TypeScript · Framer Motion
      </p>
    </footer>
  );
}
```

---

## Execution summary

| Phase | Task | File(s) | What changes |
|-------|------|---------|-------------|
| 1 | Task 1  | `src/data/bio.ts` | New tagline split, about copy, cycle words array |
| 1 | Task 2  | `src/data/projects.ts` | Story-driven descriptions, all 5 projects |
| 1 | Task 3  | `index.html` | Page title, meta description, og tags |
| 2 | Task 4  | `src/index.css` | Amber accent, light theme variables, transition rule |
| 2 | Task 5  | `src/hooks/useTheme.ts` | New file |
| 2 | Task 6  | `src/App.tsx`, `src/components/Navbar.tsx` | Theme hook wired, toggle button, nav simplified, hardcoded colors fixed |
| 3 | Task 7  | `src/components/NeuralBackground.tsx` | New file — animated canvas |
| 3 | Task 8  | `src/components/CyclingWord.tsx` | New file — fade-swap word |
| 3 | Task 9  | `src/sections/Hero.tsx` | Full rewrite using both new components |
| 4 | Task 10 | `src/sections/About.tsx` | Stats card replaces broken photo placeholder |
| 4 | Task 11 | `src/sections/Resume.tsx` | New file — download button |
| 4 | Task 12 | `src/App.tsx` | Remove Skills from render |
| 4 | Task 13 | `src/sections/Projects.tsx`, `Contact.tsx` | Section number labels updated |
| 4 | Task 14 | `src/components/Footer.tsx` | Two-line footer |

---

## Final page structure

```
Navbar  —  rc.dev  ·  About  ·  Projects  ·  Contact  ·  ☀/☾
│
├── Hero       — neural net bg · name · "CS × Brain Sciences" ·
│                "Writing software, studying brains, asking why/how/both."
│                [View Projects]  [Contact me]
│
├── About      — 3-paragraph bio + "at a glance" card
├── Projects   — 2 featured cards + 3 list cards
├── Resume     — "Download Resume" button
└── Contact    — email CTA + social icons
│
Footer  —  built by · stack credit
```

---

## Out of scope — add later

- **Photo** — set `bio.photo` in `bio.ts`. `About.tsx` renders it automatically, replacing the stats card.
- **`og:image`** — add a social preview image to `/public`, reference it in `index.html`
- **`Roy_Carmelli_CV.pdf`** — place in `/public`. The Resume button links to `/Roy_Carmelli_CV.pdf`.
- **Custom domain** — Vercel dashboard only, no code changes needed
- **Project screenshots** — add optional `image` field to `Project` type and render thumbnails in featured cards

---

*End of plan.*
