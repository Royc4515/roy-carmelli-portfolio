import { useCallback, useEffect, useRef, useState } from 'react';
import type { Theme } from '../hooks/useTheme';
import { useIsMobile } from '../hooks/useIsMobile';
import { useActiveSection } from '../hooks/useActiveSection';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { Button } from './ui/Button';
import { cx } from './ui/cx';
import PixelIcon, { type PixelIconName } from './PixelIcon';
import PixelPanel from './PixelPanel';
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

/** Sections the scroll-spy watches, in page order. `resume` has no link: nothing is lit there. */
const SPY_IDS = ['projects', 'about', 'skills', 'resume', 'contact'];
/** Contact is short and last: its top may never reach the spy line, so the page bottom lights it. */
const LAST_LINK_ID = 'contact';

const SCROLLED_AFTER_PX = 8;
const ARCADE_DELAY_MS = 400;
const PAUSE_MENU_ID = 'pause-menu';
const WIDE_QUERY = '(min-width: 1280px)';

const PLAY_LABEL = 'Play the mini-game';

/** Scroll to the hero, then ask it to start the game (Hero listens for `arcade:play`). */
function triggerArcade(reducedMotion: boolean) {
  document.getElementById('hero')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  window.setTimeout(() => window.dispatchEvent(new CustomEvent('arcade:play')), ARCADE_DELAY_MS);
}

function matchesQuery(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/** Live `matchMedia` result (the nav only needs one breakpoint beyond `useIsMobile`). */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchesQuery(query));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
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
 * Below 768px the links move into a full-screen "PAUSED" menu: `inert` while closed, focus moves
 * to its first item on open, Tab stays inside the header, Esc closes and returns focus to the Menu
 * button, and the page does not scroll behind it.
 */
export default function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const isWide = useMediaQuery(WIDE_QUERY);
  const reducedMotion = usePrefersReducedMotion();
  const { scrolled, atBottom } = useScrollState();
  const spied = useActiveSection(SPY_IDS);
  const current = atBottom ? LAST_LINK_ID : spied;

  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  const themeLabel = theme === 'night' ? 'Switch to day mode' : 'Switch to night mode';
  const themeIcon: PixelIconName = theme === 'night' ? 'sun' : 'moon';

  /** Close the pause menu; `returnFocus` puts focus back on the Menu button. */
  const closeMenu = useCallback((returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) menuButtonRef.current?.focus();
  }, []);

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
      <span className="site-nav__name relative top-px text-label md:max-lg:hidden">{bio.name}</span>
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
                <ul className="mx-auto flex items-center gap-1 xl:gap-2" role="list">
                  {LINKS.map(link => {
                    const active = current === link.id;
                    return (
                      <li key={link.id} className="flex">
                        <a
                          href={`#${link.id}`}
                          aria-current={active ? 'true' : undefined}
                          className="nav-link relative flex h-12 items-center gap-2 pl-4 pr-2 text-hud"
                        >
                          <PixelIcon
                            name="play"
                            size={12}
                            className="nav-link__cursor absolute inset-y-0 left-0 my-auto"
                          />
                          <PixelIcon name={link.icon} size={24} className="hidden shrink-0 lg:block" />
                          <span className="relative top-px">{link.label}</span>
                          <span aria-hidden="true" className="nav-link__underline absolute bottom-0 left-4 right-2 h-1" />
                        </a>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex shrink-0 items-center gap-4">
                  <Button
                    href={bio.resume.href}
                    download={bio.resume.fileName}
                    title="Download resume (PDF)"
                    leadingIcon={<PixelIcon name="download" size={12} />}
                    className="min-h-11"
                  >
                    Resume
                  </Button>
                  {isWide ? (
                    <Button
                      variant="secondary"
                      title={PLAY_LABEL}
                      leadingIcon={<PixelIcon name="joystick" size={12} />}
                      className="min-h-11"
                      onClick={play}
                    >
                      Play
                    </Button>
                  ) : (
                    <Button
                      variant="icon"
                      aria-label={PLAY_LABEL}
                      title={PLAY_LABEL}
                      className="size-11 min-h-11"
                      onClick={play}
                    >
                      <PixelIcon name="joystick" size={24} />
                    </Button>
                  )}
                  <Button
                    variant="icon"
                    aria-label={themeLabel}
                    title={themeLabel}
                    className="size-11 min-h-11"
                    onClick={onToggleTheme}
                  >
                    <PixelIcon name={themeIcon} size={24} />
                  </Button>
                </div>
              </>
            )}

            {isMobile && (
              <div className="ml-auto flex shrink-0 items-center gap-4">
                <Button
                  variant="icon"
                  href={bio.resume.href}
                  download={bio.resume.fileName}
                  aria-label="Download resume"
                  className="size-11 min-h-11"
                >
                  <PixelIcon name="download" size={24} />
                </Button>
                <Button
                  ref={menuButtonRef}
                  variant="icon"
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                  aria-controls={PAUSE_MENU_ID}
                  className="size-11 min-h-11"
                  onClick={() => (menuOpen ? closeMenu(false) : setMenuOpen(true))}
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
                          onClick={() => closeMenu(false)}
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
                      onClick={() => closeMenu(true)}
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
                Resume game
              </Button>
            </PixelPanel>
          </div>
        )}
      </nav>
    </header>
  );
}
