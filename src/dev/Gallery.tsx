/**
 * Dev-only component gallery: every shared UI component and state, day and
 * night side by side. Open http://localhost:5173/?gallery with `npm run dev`.
 * main.tsx lazy-loads this file behind `import.meta.env.DEV`, so production
 * builds never include it.
 */
import { useLayoutEffect, type ReactNode } from 'react';
import { Button } from '../components/ui/Button';
import { Chip, ChipList } from '../components/ui/Chip';
import { ZoneHeader } from '../components/ui/ZoneHeader';
import { Reveal } from '../components/ui/Reveal';
import { useToast } from '../components/ui/Toast';
import PixelPanel from '../components/PixelPanel';

type Theme = 'day' | 'night';
type GalleryState = 'default' | 'hover' | 'active' | 'focus' | 'disabled';

/* ── Night tokens inside a wrapper ──────────────────────────────────────────
   The theme tokens are declared on `:root` (day, via @theme) and
   `:root[data-theme="night"]`, which never match a nested element. Rather
   than duplicating ~40 hex values, copy the declarations of both rules at
   runtime into `.gallery [data-theme="…"]` scopes. Dev only. */

function collectCustomProps(selector: string, prefix: string): string {
  const found: string[] = [];
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const selectors = rule.selectorText.split(',').map(s => s.trim());
        if (selectors.includes(selector)) {
          for (const name of Array.from(rule.style)) {
            if (name.startsWith(prefix)) {
              found.push(`${name}: ${rule.style.getPropertyValue(name)};`);
            }
          }
        }
      }
      if ('cssRules' in rule && rule.cssRules) visit(rule.cssRules as CSSRuleList);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // Cross-origin sheet (fonts): nothing of ours in it.
    }
  }
  return found.join('\n');
}

function useScopedThemeTokens() {
  useLayoutEffect(() => {
    const day = collectCustomProps(':root', '--color-');
    const night = collectCustomProps(':root[data-theme="night"]', '--color-');
    const style = document.createElement('style');
    style.dataset.gallery = 'theme-tokens';
    style.textContent = `.gallery [data-theme="day"] {\n${day}\n}\n.gallery [data-theme="night"] {\n${night}\n}`;
    document.head.append(style);
    return () => style.remove();
  }, []);
}

/* ── Placeholder icons ──────────────────────────────────────────────────────
   PixelIcon arrives with step 02; these 12×12 bitmaps only stand in for it
   so the icon slots can be checked for size and alignment. */

const BITMAPS = {
  play: [
    '............',
    '..X.........',
    '..XX........',
    '..XXX.......',
    '..XXXX......',
    '..XXXXX.....',
    '..XXXXX.....',
    '..XXXX......',
    '..XXX.......',
    '..XX........',
    '..X.........',
    '............',
  ],
  download: [
    '.....XX.....',
    '.....XX.....',
    '.....XX.....',
    '.....XX.....',
    '..XX.XX.XX..',
    '...XXXXXX...',
    '....XXXX....',
    '.....XX.....',
    '............',
    'XX........XX',
    'XX........XX',
    'XXXXXXXXXXXX',
  ],
  external: [
    '.....XXXXXXX',
    '.........XXX',
    '........XXXX',
    '.......XXX.X',
    '......XXX..X',
    'XXXX.XXX....',
    'XX..XXX.....',
    'XX...X......',
    'XX..........',
    'XX.......XX.',
    'XX.......XX.',
    'XXXXXXXXXXX.',
  ],
  copy: [
    '....XXXXXXXX',
    '....X......X',
    '....X......X',
    'XXXXXXXXX..X',
    'X.......X..X',
    'X.......X..X',
    'X.......X..X',
    'X.......XXXX',
    'X.......X...',
    'X.......X...',
    'X.......X...',
    'XXXXXXXXX...',
  ],
  book: [
    'XXXXXXXXXX..',
    'X........XX.',
    'X.XXXXXX.XX.',
    'X........XX.',
    'X.XXXXX..XX.',
    'X........XX.',
    'X........XX.',
    'X........XX.',
    'X........XX.',
    'XXXXXXXXXXX.',
    'X........X..',
    'XXXXXXXXXX..',
  ],
  check: [
    '............',
    '............',
    '..........XX',
    '.........XX.',
    '........XX..',
    'XX.....XX...',
    '.XX...XX....',
    '..XX.XX.....',
    '...XXX......',
    '....X.......',
    '............',
    '............',
  ],
  star: [
    '.....XX.....',
    '.....XX.....',
    '....XXXX....',
    'XXXXXXXXXXXX',
    '.XXXXXXXXXX.',
    '..XXXXXXXX..',
    '...XXXXXX...',
    '...XXXXXX...',
    '..XXX..XXX..',
    '..XX....XX..',
    '.XX......XX.',
    '............',
  ],
} as const;

type DemoIconName = keyof typeof BITMAPS;

function DemoIcon({ name, size = 12 }: { name: DemoIconName; size?: 12 | 24 | 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
    >
      {BITMAPS[name].flatMap((row, y) =>
        Array.from(row).map((cell, x) =>
          cell === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null,
        ),
      )}
    </svg>
  );
}

/* ── Layout helpers ─────────────────────────────────────────────────────── */

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-12 first:mt-0">
      <p className="text-hud mb-6 uppercase text-fg-subtle">{title}</p>
      {children}
    </div>
  );
}

function Cell({ caption, onPaper = false, children }: { caption: string; onPaper?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-6">
      {children}
      <span className={onPaper ? 'text-hud text-ink-muted' : 'text-hud text-fg-subtle'}>{caption}</span>
    </div>
  );
}

const STATES: GalleryState[] = ['default', 'hover', 'active', 'focus', 'disabled'];

function stateProps(state: GalleryState) {
  return {
    disabled: state === 'disabled',
    'data-gallery-state': state === 'default' || state === 'disabled' ? undefined : state,
  };
}

const TECH = ['Chrome MV3', 'Streaming / SSE', 'Claude API', 'OOP patterns', 'i18n / RTL', 'Node.js', 'Vitest', 'Canvas'];

/* ── One theme column ───────────────────────────────────────────────────── */

function ThemeColumn({ theme }: { theme: Theme }) {
  const toast = useToast();
  const id = (name: string) => `${theme}-${name}`;

  return (
    <section
      data-theme={theme}
      aria-labelledby={id('zone')}
      className="relative min-w-0 bg-bg px-4 py-10 text-fg md:px-8"
    >
      <p className="text-label mb-10 text-fg-subtle">{theme === 'day' ? 'Day · forest' : 'Night · moonlit'}</p>

      <Block title="ZoneHeader">
        <ZoneHeader
          id={id('zone')}
          zone={1}
          name="The Library"
          title="Things I've Built"
          subtitle="Three main quests, three side quests, three research logs."
          icon={<DemoIcon name="book" size={36} />}
        />
      </Block>

      <Block title="Button · variants (md)">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-8">
          <Button href="#projects" leadingIcon={<DemoIcon name="play" />}>
            View projects
          </Button>
          <Button variant="secondary" href="#resume" leadingIcon={<DemoIcon name="download" size={24} />}>
            Resume
          </Button>
          <Button variant="ghost">Quest log</Button>
          <Button variant="icon" aria-label="Copy email">
            <DemoIcon name="copy" size={24} />
          </Button>
        </div>
      </Block>

      <Block title="Button · lg, trailing icon, external">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-8">
          <Button size="lg" href="https://example.com" external trailingIcon={<DemoIcon name="external" size={24} />}>
            Live
          </Button>
          <Button size="lg" variant="secondary">
            Code
          </Button>
          <Button size="lg" variant="icon" aria-label="Copy email">
            <DemoIcon name="copy" size={24} />
          </Button>
        </div>
      </Block>

      <Block title="Button · states">
        <div className="flex flex-col gap-10">
          {(['primary', 'secondary', 'icon', 'ghost'] as const).map(variant => (
            <div key={variant} className="flex flex-wrap items-start gap-x-8 gap-y-8">
              {STATES.map(state => (
                <Cell key={state} caption={`${variant} · ${state}`}>
                  {variant === 'icon' ? (
                    <Button variant="icon" aria-label={`Copy (${state})`} {...stateProps(state)}>
                      <DemoIcon name="copy" size={24} />
                    </Button>
                  ) : (
                    <Button variant={variant} {...stateProps(state)}>
                      Start
                    </Button>
                  )}
                </Cell>
              ))}
            </div>
          ))}
          <Cell caption="link · aria-disabled">
            <Button href="/resume.pdf" disabled leadingIcon={<DemoIcon name="download" />}>
              Resume
            </Button>
          </Cell>
        </div>
      </Block>

      <Block title="Chip · dark surface (accentCount 3, max 5)">
        <ChipList items={TECH} accentCount={3} max={5} />
        <div className="mt-6 flex flex-wrap gap-2">
          <Chip>default</Chip>
          <Chip tone="accent">accent</Chip>
        </div>
      </Block>

      <Block title="Chip · paper surface">
        <PixelPanel variant="paper" padding="md">
          <ChipList items={TECH} accentCount={3} max={5} surface="paper" />
        </PixelPanel>
      </Block>

      <Block title="PixelPanel · variants">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
          <PixelPanel>
            <p className="text-label text-accent-fg">wood</p>
            <p className="mt-2 text-body">Default surface, brass frame.</p>
          </PixelPanel>
          <PixelPanel variant="paper">
            <p className="text-label">paper</p>
            <p className="mt-2 text-body">
              Ink text, <a href="#gallery-link">ink links</a>, ink focus ring.
            </p>
          </PixelPanel>
          <PixelPanel variant="inset">
            <p className="text-label text-accent-fg">inset</p>
            <p className="mt-2 text-body">Sunken well, 2px inner line.</p>
          </PixelPanel>
          <PixelPanel variant="ghost">
            <p className="text-label text-accent-fg">ghost</p>
            <p className="mt-2 text-body">Frame only.</p>
          </PixelPanel>
          <PixelPanel variant="dark">
            <p className="text-label text-accent-fg">dark (legacy)</p>
            <p className="mt-2 text-body">Page ground, subtle frame.</p>
          </PixelPanel>
          <PixelPanel variant="parchment">
            <p className="text-label">parchment (legacy)</p>
            <p className="mt-2 text-body">Alias of paper.</p>
          </PixelPanel>
        </div>
      </Block>

      <Block title="PixelPanel · elevation, frame, tab">
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2">
          <PixelPanel elevation={1} padding="sm">
            <p className="text-hud">elevation 1 · padding sm</p>
          </PixelPanel>
          <PixelPanel elevation={2} padding="sm">
            <p className="text-hud">elevation 2 · padding sm</p>
          </PixelPanel>
          <PixelPanel frame="subtle" padding="sm">
            <p className="text-hud">frame subtle</p>
          </PixelPanel>
          <PixelPanel frame="none" elevation={1} padding="sm">
            <p className="text-hud">frame none · elevation 1</p>
          </PixelPanel>
          <PixelPanel variant="inset" elevation={1} padding="sm">
            <p className="text-hud">inset · elevation 1</p>
          </PixelPanel>
          <PixelPanel tab="Side quest" elevation={1} padding="sm">
            <p className="text-hud">tab · padding sm</p>
          </PixelPanel>
        </div>
        <PixelPanel
          variant="paper"
          as="article"
          padding="lg"
          elevation={2}
          className="mt-14"
          tab={
            <>
              <DemoIcon name="star" />
              Main quest
            </>
          }
        >
          <p className="text-hud uppercase text-ink-muted">Chrome extension · 2026</p>
          <h3 className="mt-2 text-display-m text-ink">Aside · AI Sidebar</h3>
          <p className="mt-4 max-w-[68ch] text-body">
            Alt+A drops an AI assistant beside any webpage, and it has already read the page.
          </p>
          <ChipList className="mt-6" items={TECH} accentCount={3} max={5} surface="paper" />
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-8">
            <Button href="https://example.com" external trailingIcon={<DemoIcon name="external" />}>
              Live
            </Button>
            <Button variant="secondary" href="https://example.com" external>
              Code
            </Button>
            <Button variant="ghost">Quest log</Button>
            <Button variant="icon" aria-label="Copy link">
              <DemoIcon name="copy" size={24} />
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-8">
            {(['hover', 'active', 'focus'] as const).map(state => (
              <Cell key={state} caption={`on paper · ${state}`} onPaper>
                <Button variant="secondary" data-gallery-state={state}>
                  Code
                </Button>
              </Cell>
            ))}
            <Cell caption="ghost · focus" onPaper>
              <Button variant="ghost" data-gallery-state="focus">
                Quest log
              </Button>
            </Cell>
          </div>
        </PixelPanel>
      </Block>

      <Block title="Toast">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-8">
          <Button
            variant="secondary"
            onClick={() => toast.show('Email copied · progress saved', { icon: <DemoIcon name="check" size={24} /> })}
          >
            Copy toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast.show('Loot acquired: Roy_Carmelli_CV.pdf', { icon: <DemoIcon name="download" size={24} /> })}
          >
            Loot toast
          </Button>
        </div>
      </Block>

      <Block title="Reveal · index 0-3">
        <ul className="grid gap-6 sm:grid-cols-2">
          {[0, 1, 2, 3].map(i => (
            <Reveal as="li" key={i} index={i}>
              <PixelPanel variant="inset" padding="sm">
                <p className="text-hud">Reveal index {i}</p>
              </PixelPanel>
            </Reveal>
          ))}
        </ul>
      </Block>
    </section>
  );
}

/** Gallery page: both themes side by side from `lg`, stacked below. */
export default function Gallery() {
  useScopedThemeTokens();

  return (
    <main className="gallery min-h-screen bg-surface-sunken text-fg">
      <header className="px-4 py-8 md:px-8">
        <h1 className="text-display-m">Component gallery</h1>
        <p className="mt-2 text-body text-fg-muted">
          Step 03 shared UI. Dev only (<code className="font-mono">?gallery</code>). Forced states use{' '}
          <code className="font-mono">data-gallery-state</code>; icons are placeholders until PixelIcon lands.
        </p>
      </header>
      <div className="grid lg:grid-cols-2">
        <ThemeColumn theme="day" />
        <ThemeColumn theme="night" />
      </div>
    </main>
  );
}
