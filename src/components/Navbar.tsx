import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Theme } from '../hooks/useTheme';
import { useIsMobile } from '../hooks/useIsMobile';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useActiveSection } from '../hooks/useActiveSection';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useInertWhile } from '../hooks/useInertWhile';
import { Button } from './ui/Button';
import { cx } from './ui/cx';
import PixelIcon, { type PixelIconName } from './PixelIcon';
import PixelPanel from './PixelPanel';
import { useToast } from './ui/Toast';
import { pixelSprites } from '../theme/pixelSprites';
import { bio } from '../data/bio';
import './Navbar.css';

interface SectionLink {
  id: string;
  label: string;
  icon: PixelIconName;
}

const LINKS: readonly SectionLink[] = [
  { id: 'projects', label: 'Projects', icon: 'book' },
  { id: 'about', label: 'About', icon: 'person' },
  { id: 'skills', label: 'Skills', icon: 'sword' },
  { id: 'contact', label: 'Contact', icon: 'mail' },
];

/** The five zones in page order (ZoneHeader numbers). `resume` has no nav link. */
const ZONES = [
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'resume', label: 'Resume' },
  { id: 'contact', label: 'Contact' },
] as const;

/** Sections the scroll-spy watches, in page order. `resume` has no link: nothing is lit there. */
const SPY_IDS = ZONES.map(zone => zone.id);
/** Contact is short and last: its top may never reach the spy line, so the page bottom lights it. */
const LAST_LINK_ID = 'contact';

const SCROLLED_AFTER_PX = 8;
/** Longest wait for the smooth scroll to the hero where the browser has no `scrollend` event. */
const ARCADE_MAX_WAIT_MS = 1200;
const PAUSE_MENU_ID = 'pause-menu';
const WIDE_QUERY = '(min-width: 1280px)';

const PLAY_LABEL = 'Play the mini-game';

/* ── Mini-map (≥ 1024px) ────────────────────────────────────────────────── */

type NodeState = 'visited' | 'current' | 'ahead';
type PathState = 'visited' | 'half' | 'ahead';

/**
 * How far along the map the reader is, in link indices: -1 on the hero, 0-3 on a linked zone,
 * 2.5 on the resume band (it has no node: it sits on the path between Skills and Contact).
 */
export function mapProgress(current: string | null): number {
  if (current === 'resume') return LINKS.findIndex(link => link.id === 'skills') + 0.5;
  return LINKS.findIndex(link => link.id === current);
}

/** Node `i`: passed, the current zone, or still ahead. */
export function nodeState(i: number, progress: number): NodeState {
  if (i < progress) return 'visited';
  return i === progress ? 'current' : 'ahead';
}

/** The path segment leading into node `i` (i ≥ 1): walked, walked halfway, or still ahead. */
export function pathState(i: number, progress: number): PathState {
  if (i <= progress) return 'visited';
  return i - 1 < progress ? 'half' : 'ahead';
}

/** Duration and step count of the walk (SPEC: --dur-slow, steps(4)). */
const WALK_MS = 360;
const WALK_STEPS = 4;
/** The walker hops this many px on every other step. */
const WALK_HOP = 2;
const WALKER_SIZE = 12;

/**
 * Keyframes for the walk from `from` to `to` (px): four whole-pixel stops, each held until the
 * next (`step-end`), hopping on odd steps. CSS `steps(4)` on a transform would land on
 * fractional pixels whenever the distance is not a multiple of 4.
 */
export function walkKeyframes(from: number, to: number): Keyframe[] {
  const frames: Keyframe[] = [];
  for (let step = 0; step < WALK_STEPS; step += 1) {
    const x = Math.round(from + ((to - from) * step) / WALK_STEPS);
    const y = step % 2 === 1 ? -WALK_HOP : 0;
    frames.push({ offset: step / WALK_STEPS, transform: `translate(${x}px, ${y}px)`, easing: 'step-end' });
  }
  frames.push({ offset: 1, transform: `translate(${to}px, 0px)` });
  return frames;
}

/**
 * Roy's head, 12x12, two inks: hair (`h`) and skin (`s`); eyes and mouth are holes that show
 * the bar through them. Same format as PixelIcon bitmaps.
 */
const WALKER_BITMAP = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '.hhhhhhhhhh.',
  '.hhhhhhhhhhh',
  '.hhssshhhhh.',
  '.hssssssshh.',
  '.ss.ssss.ss.',
  '.ss.ssss.ss.',
  '.ssssssssss.',
  '..ss....ss..',
  '...ssssss...',
  '....ssss....',
];

/** Horizontal runs of one ink per row, as SVG rects. */
function bitmapRuns(rows: readonly string[], ink: string) {
  const runs: { x: number; y: number; w: number }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== ink) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ink) end += 1;
      runs.push({ x, y, w: end - x });
      x = end;
    }
  });
  return runs;
}

const WALKER_HAIR = bitmapRuns(WALKER_BITMAP, 'h');
const WALKER_SKIN = bitmapRuns(WALKER_BITMAP, 's');

function WalkerHead() {
  return (
    <svg
      viewBox="0 0 12 12"
      width={WALKER_SIZE}
      height={WALKER_SIZE}
      shapeRendering="crispEdges"
      focusable="false"
      aria-hidden="true"
      className="block"
    >
      <g className="mm-walker__hair">
        {WALKER_HAIR.map(r => (
          <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} />
        ))}
      </g>
      <g className="mm-walker__skin">
        {WALKER_SKIN.map(r => (
          <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Keeps the walker over `anchor` (the current node, or the path it stands on), measured
 * relative to the map. A change of anchor walks it there in 4 stepped hops (a jump under
 * reduced motion); resizes and font swaps re-place it without walking.
 */
function useMapWalker(
  mapRef: RefObject<HTMLElement>,
  walkerRef: RefObject<HTMLElement>,
  anchor: string | null,
  reducedMotion: boolean,
) {
  const placedAt = useRef<number | null>(null);

  useLayoutEffect(() => {
    const map = mapRef.current;
    const walker = walkerRef.current;
    if (!map || !walker) return;

    const place = (walk: boolean) => {
      const target = anchor ? map.querySelector<HTMLElement>(`[data-anchor="${anchor}"]`) : null;
      // Below 1024px the map is hidden (display: none): nothing to measure.
      if (!target || target.getClientRects().length === 0) {
        walker.dataset.hidden = '';
        placedAt.current = null;
        return;
      }
      const box = target.getBoundingClientRect();
      const origin = map.getBoundingClientRect();
      const x = Math.round(box.left + box.width / 2 - origin.left - WALKER_SIZE / 2);
      const from = placedAt.current;
      placedAt.current = x;
      delete walker.dataset.hidden;
      walker.style.transform = `translate(${x}px, 0px)`;
      if (!walk || from === null || from === x || reducedMotion || typeof walker.animate !== 'function') {
        return;
      }
      // Start from where it is now, even if it is still walking to the previous node.
      const running = walker.getAnimations();
      const now = running.length > 0 ? new DOMMatrixReadOnly(getComputedStyle(walker).transform).m41 : from;
      running.forEach(animation => animation.cancel());
      walker.animate(walkKeyframes(Math.round(now), x), { duration: WALK_MS, easing: 'linear' });
    };

    place(true);
    if (typeof ResizeObserver !== 'function') return;
    const resize = new ResizeObserver(() => place(false));
    resize.observe(map);
    return () => resize.disconnect();
  }, [mapRef, walkerRef, anchor, reducedMotion]);
}

/**
 * After a pause-menu jump the clicked item disappears (the menu goes inert), so focus would
 * fall to <body>. Move it to the zone's H2 instead (ZoneHeader gives it tabIndex -1), on the
 * next frame: the menu has closed and the anchor's scroll has started, which preventScroll
 * leaves alone.
 */
function focusZoneHeading(sectionId: string) {
  window.requestAnimationFrame(() => {
    const section = document.getElementById(sectionId);
    const labelId = section?.getAttribute('aria-labelledby');
    const heading = (labelId && document.getElementById(labelId)) || section?.querySelector('h2');
    heading?.focus({ preventScroll: true });
  });
}

/** What a visitor does to go somewhere else while the Play scroll is still running. */
const PLAY_CANCEL_EVENTS = ['pointerdown', 'click', 'wheel', 'touchstart', 'keydown'] as const;

/**
 * Scroll to the hero, then ask it to start the game (Hero listens for `arcade:play`). The event
 * waits until the scroll has settled (`scrollend`, or a timeout where it is unsupported): a fixed
 * delay could start the game while the hero is still off-screen. Hero also brings itself into
 * view if it is not there when the event arrives. Any click, wheel, touch or key before then (a
 * nav link to another zone, say) cancels the start, so the page is not yanked back to the hero.
 */
function triggerArcade(reducedMotion: boolean) {
  const hero = document.getElementById('hero');
  const play = () => window.dispatchEvent(new CustomEvent('arcade:play'));
  if (!hero || reducedMotion || Math.abs(hero.getBoundingClientRect().top) < 2) {
    hero?.scrollIntoView({ behavior: 'auto' });
    play();
    return;
  }
  let timer = 0;
  const done = () => {
    window.removeEventListener('scrollend', settled);
    window.clearTimeout(timer);
    PLAY_CANCEL_EVENTS.forEach(type => window.removeEventListener(type, done, true));
  };
  const settled = () => {
    done();
    play();
  };
  window.addEventListener('scrollend', settled);
  // Capture phase, on the window: seen before any handler can stop it. The click that pressed
  // Play has already passed the window's capture phase, so it does not cancel itself.
  PLAY_CANCEL_EVENTS.forEach(type => window.addEventListener(type, done, { capture: true, passive: true }));
  timer = window.setTimeout(settled, ARCADE_MAX_WAIT_MS);
  hero.scrollIntoView({ behavior: 'smooth' });
}

/** `scrolled`: past the first 8px (the bar gains its drop). `atBottom`: a scrollable page is at its end. */
function useScrollState() {
  const [state, setState] = useState({ scrolled: false, atBottom: false });
  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = y > SCROLLED_AFTER_PX;
      const atBottom = maxScroll > 0 && y >= maxScroll - 2;
      setState(prev =>
        prev.scrolled === scrolled && prev.atBottom === atBottom ? prev : { scrolled, atBottom },
      );
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return state;
}

interface NavbarProps {
  theme: Theme;
  onToggleTheme: () => void;
}

/**
 * Site header (SPEC §4 Navbar): a fixed 64px wood bar with the brand (face + name, back to top),
 * the section links with a scroll-spy cursor, and the Resume / Play / theme actions.
 * Below 768px the links move into a full-screen "PAUSED" menu (a dialog): `inert` while closed,
 * focus moves to its first item on open, Tab stays inside the header, the page behind it is
 * `inert`, Esc closes and returns focus to the Menu button, and the page does not scroll behind it.
 */
export default function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const isWide = useMediaQuery(WIDE_QUERY);
  const reducedMotion = usePrefersReducedMotion();
  const { scrolled, atBottom } = useScrollState();
  const spied = useActiveSection(SPY_IDS);
  const current = atBottom ? LAST_LINK_ID : spied;
  const progress = mapProgress(current);
  const zoneIndex = ZONES.findIndex(zone => zone.id === current);
  const walkerAnchor =
    progress < 0 ? null : Number.isInteger(progress) ? `node-${progress}` : `path-${Math.ceil(progress)}`;

  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const zoneChipRef = useRef<HTMLButtonElement>(null);
  /** The control that opened the menu (Menu button or zone chip): focus returns to it. */
  const openerRef = useRef<HTMLElement | null>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLSpanElement>(null);
  const toast = useToast();

  /** Every resume download in the bar and the menu pops the same toast as the Resume zone. */
  const lootResume = () =>
    toast.show(`Loot acquired: ${bio.resume.fileName}`, { icon: <PixelIcon name="trophy" size={24} /> });

  useMapWalker(mapRef, walkerRef, isMobile ? null : walkerAnchor, reducedMotion);

  const themeLabel = theme === 'night' ? 'Switch to day mode' : 'Switch to night mode';
  const themeIcon: PixelIconName = theme === 'night' ? 'sun' : 'moon';

  /** Close the pause menu; `returnFocus` puts focus back on the Menu button. */
  const closeMenu = useCallback((returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) (openerRef.current ?? menuButtonRef.current)?.focus();
  }, []);

  /** Menu button and zone chip: open (remembering which one did it) or close. */
  const toggleMenu = (opener: HTMLElement | null) => {
    if (menuOpen) {
      closeMenu(false);
      return;
    }
    openerRef.current = opener;
    setMenuOpen(true);
  };

  // The menu only exists below 768px.
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  // Open: focus the first item, lock the page scroll.
  useEffect(() => {
    if (!menuOpen) return;
    firstItemRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // Open: the page behind the menu (the header's siblings: skip link, main, footer) leaves the
  // tab order and the accessibility tree, so a screen reader's virtual cursor stays in the header
  // as Tab does. Closing restores only what this changed (the game may have made more inert).
  useInertWhile(menuOpen, () => {
    const header = headerRef.current;
    return header?.parentElement ? [...header.parentElement.children].filter(el => el !== header) : [];
  });

  // Open: Esc closes; Tab cycles through the header (bar + menu) only.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== 'Tab' || !headerRef.current) return;
      const focusables = Array.from(
        headerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (!headerRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, closeMenu]);

  const play = () => triggerArcade(reducedMotion);

  const brand = (
    <a
      href="#hero"
      aria-label="Roy Carmelli, back to top"
      className="site-nav__brand flex h-[50px] shrink-0 items-center gap-3"
      onClick={() => menuOpen && closeMenu(false)}
    >
      {/* 49px tall: pinned to the top of the 50px box so it lands on whole pixels. */}
      <img
        src={pixelSprites.face.src}
        alt=""
        width={pixelSprites.face.w}
        height={pixelSprites.face.h}
        className="pixelated block self-start"
      />
      <span
        className={cx(
          'site-nav__name relative top-px text-label max-[359px]:hidden md:max-lg:hidden',
          isMobile && zoneIndex >= 0 && 'hidden',
        )}
      >
        {bio.name}
      </span>
    </a>
  );

  // Hidden while closed (`inert` + aria-hidden). React 18 has no typed `inert` prop yet.
  const inertWhenClosed: Record<string, string> = menuOpen ? {} : { inert: '' };

  return (
    <header ref={headerRef} className="site-nav fixed inset-x-0 top-0 z-[100]">
      <nav aria-label="Main">
        {/* -ml-1/pl-1: the bar starts 4px off-screen so the 4px-right drop reaches the left edge. */}
        <div
          className={cx('site-nav__bar relative z-10 -ml-1 h-16 bg-surface pl-1', scrolled && 'px-drop-sm')}
        >
          {/* pb-1: items centre on the 60px above the buttons' floor, so their 8px drop clears the frame. */}
          <div className="mx-auto flex h-full max-w-[1120px] items-center gap-4 px-4 pb-1 md:px-6 lg:px-8">
            {brand}

            {!isMobile && (
              <>
                {/* ≥ 1024px the links sit on a mini-map path (decorative, aria-hidden), with Roy's
                    head walking to the current node. 768-1023px: cursor + underline only. */}
                <div ref={mapRef} className="site-nav__map relative mx-auto">
                  <ul className="flex items-center gap-1 lg:gap-0" role="list">
                    {LINKS.map((link, index) => {
                      const active = current === link.id;
                      return (
                        <li key={link.id} className="flex items-center">
                          {index > 0 && (
                            <span
                              aria-hidden="true"
                              data-anchor={`path-${index}`}
                              data-state={pathState(index, progress)}
                              className="mm-path hidden lg:block"
                            />
                          )}
                          <a
                            href={`#${link.id}`}
                            aria-current={active ? 'true' : undefined}
                            className="nav-link relative flex h-12 items-center gap-2 pl-4 pr-2 text-hud lg:gap-3 lg:px-1"
                          >
                            <PixelIcon
                              name="play"
                              size={12}
                              className="nav-link__cursor absolute inset-y-0 left-0 my-auto lg:hidden"
                            />
                            <span
                              aria-hidden="true"
                              data-anchor={`node-${index}`}
                              data-state={nodeState(index, progress)}
                              className="mm-node hidden shrink-0 lg:block"
                            />
                            <span className="relative top-px">{link.label}</span>
                            <span
                              aria-hidden="true"
                              className="nav-link__underline absolute bottom-0 left-4 right-2 h-1 lg:hidden"
                            />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                  <span ref={walkerRef} aria-hidden="true" data-hidden="" className="mm-walker hidden lg:block">
                    <WalkerHead />
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <Button
                    href={bio.resume.href}
                    download={bio.resume.fileName}
                    title="Download resume (PDF)"
                    leadingIcon={<PixelIcon name="download" size={12} />}
                    size="sm"
                    onClick={lootResume}
                  >
                    Resume
                  </Button>
                  {isWide ? (
                    <Button
                      variant="secondary"
                      title={PLAY_LABEL}
                      leadingIcon={<PixelIcon name="joystick" size={12} />}
                      size="sm"
                      onClick={play}
                    >
                      Play
                    </Button>
                  ) : (
                    <Button
                      variant="icon"
                      aria-label={PLAY_LABEL}
                      title={PLAY_LABEL}
                      size="sm"
                      onClick={play}
                    >
                      <PixelIcon name="joystick" size={24} />
                    </Button>
                  )}
                  <Button
                    variant="icon"
                    aria-label={themeLabel}
                    title={themeLabel}
                    size="sm"
                    onClick={onToggleTheme}
                  >
                    <PixelIcon name={themeIcon} size={24} />
                  </Button>
                </div>
              </>
            )}

            {isMobile && zoneIndex >= 0 && (
              <button
                ref={zoneChipRef}
                type="button"
                className="zone-chip max-[359px]:hidden"
                aria-label={`Zone ${zoneIndex + 1}/${ZONES.length}: ${ZONES[zoneIndex].label}, open the menu`}
                aria-expanded={menuOpen}
                aria-controls={PAUSE_MENU_ID}
                onClick={() => toggleMenu(zoneChipRef.current)}
              >
                <span className="zone-chip__plate">
                  <span className="text-label text-accent-fg">
                    Zone {zoneIndex + 1}/{ZONES.length}
                  </span>
                  <span className="text-hud uppercase text-fg">{ZONES[zoneIndex].label}</span>
                </span>
              </button>
            )}

            {isMobile && (
              <div className="ml-auto flex shrink-0 items-center gap-4">
                <Button
                  variant="icon"
                  href={bio.resume.href}
                  download={bio.resume.fileName}
                  aria-label="Download resume"
                  size="sm"
                  onClick={lootResume}
                >
                  <PixelIcon name="download" size={24} />
                </Button>
                <Button
                  ref={menuButtonRef}
                  variant="icon"
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                  aria-controls={PAUSE_MENU_ID}
                  size="sm"
                  onClick={() => toggleMenu(menuButtonRef.current)}
                >
                  <PixelIcon name={menuOpen ? 'close' : 'menu'} size={24} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {isMobile && (
          <div
            id={PAUSE_MENU_ID}
            data-testid="mobile-menu-overlay"
            data-open={menuOpen || undefined}
            // A dialog, but not aria-modal: the bar above it (Menu, theme, resume) stays in the
            // header's Tab cycle; the page behind is inert instead.
            role="dialog"
            aria-label="Paused"
            aria-hidden={menuOpen ? 'false' : 'true'}
            {...inertWhenClosed}
            className="pause-menu px-dots fixed inset-0 z-0 flex flex-col overflow-y-auto overscroll-contain bg-bg px-6 pb-10 pt-[100px]"
          >
            <PixelPanel
              variant="wood"
              elevation={2}
              tab="Paused"
              className="pause-menu__panel mx-auto my-auto w-full max-w-[360px]"
            >
              <div className="pause-menu__items">
                <ul role="list">
                  {LINKS.map((link, index) => {
                    const active = current === link.id;
                    return (
                      <li key={link.id}>
                        <a
                          ref={index === 0 ? firstItemRef : undefined}
                          href={`#${link.id}`}
                          aria-current={active ? 'true' : undefined}
                          className="pause-item"
                          onClick={() => {
                            closeMenu(false);
                            focusZoneHeading(link.id);
                          }}
                        >
                          <PixelIcon name="play" size={12} className="pause-item__cursor shrink-0" />
                          <PixelIcon name={link.icon} size={24} className="shrink-0" />
                          <span className="relative top-px whitespace-nowrap text-display-s uppercase">{link.label}</span>
                          {active && (
                            <span aria-hidden="true" className="ml-auto whitespace-nowrap pl-2 text-hud uppercase text-fg-subtle">
                              Here
                            </span>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>

                <div aria-hidden="true" className="px-divider my-3" />

                <ul role="list">
                  <li>
                    <a
                      href={bio.resume.href}
                      download={bio.resume.fileName}
                      className="pause-item"
                      onClick={() => {
                        lootResume();
                        closeMenu(true);
                      }}
                    >
                      <PixelIcon name="play" size={12} className="pause-item__cursor shrink-0" />
                      <PixelIcon name="download" size={24} className="shrink-0" />
                      <span className="relative top-px whitespace-nowrap text-display-s uppercase">Resume</span>
                      <span className="ml-auto whitespace-nowrap pl-2 text-hud uppercase text-fg-subtle">PDF</span>
                    </a>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="pause-item"
                      onClick={() => {
                        closeMenu(true);
                        play();
                      }}
                    >
                      <PixelIcon name="play" size={12} className="pause-item__cursor shrink-0" />
                      <PixelIcon name="joystick" size={24} className="shrink-0" />
                      <span className="relative top-px whitespace-nowrap text-display-s uppercase">Play</span>
                      <span className="ml-auto whitespace-nowrap pl-2 text-hud uppercase text-fg-subtle">Mini-game</span>
                    </button>
                  </li>
                  <li>
                    <button type="button" className="pause-item" aria-label={themeLabel} onClick={onToggleTheme}>
                      <PixelIcon name="play" size={12} className="pause-item__cursor shrink-0" />
                      <PixelIcon name={themeIcon} size={24} className="shrink-0" />
                      <span className="relative top-px whitespace-nowrap text-display-s uppercase">{theme === 'night' ? 'Day mode' : 'Night mode'}</span>
                    </button>
                  </li>
                </ul>
              </div>

              <Button
                variant="secondary"
                className="mt-6 w-full"
                leadingIcon={<PixelIcon name="play" size={12} />}
                onClick={() => closeMenu(true)}
              >
                Continue
              </Button>
            </PixelPanel>
          </div>
        )}
      </nav>
    </header>
  );
}
