import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import { OptionShell } from '../shared/OptionShell';
import { useCopyEmail, withViewTransition } from '../shared/hooks';
import { useTheme } from '../../hooks/useTheme';
import {
  bio,
  mainProjects,
  sideProjects,
  courseworkProjects,
  aboutParagraphs,
  skillGroups,
  certifications,
  projectImage,
  splitTitle,
  DEGREE,
  SERVICE_ROLE,
  SERVICE_ORG,
  SERVICE_PERIOD,
  EDUCATION_PERIOD,
  EMAIL_SHOWN,
  MAILTO,
  GITHUB_HANDLE,
  LINKEDIN_HANDLE,
  type Project,
} from '../shared/content';
import { ArrowRight, ArrowUpRight, Check, Copy, Download, Github, Linkedin, Mail, Moon, Search, Sun } from '../shared/icons';
import { CommandPalette, type Command } from './CommandPalette';
import { CARD_TRANSITION_NAME, ProjectDialog } from './ProjectDialog';
import './b.css';

const SECTIONS = [
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
] as const;

/** The top bar shows three of the four: Skills is one scroll past About and is in the palette. */
const NAV_SECTIONS = SECTIONS.filter(s => s.id !== 'skills');

/** Tech chips on a tile; the dialog lists them all. */
const TILE_TECH_COUNT = 5;

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;
const NewTab = () => <span className="opt-sr"> (opens in a new tab)</span>;

/**
 * Feeds the tile's spotlight (b.css) with the pointer position. Mouse only: a finger has no
 * hover, and a touch would leave the glow stuck where it lifted.
 */
function trackPointer(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return;
  const tile = event.currentTarget;
  const rect = tile.getBoundingClientRect();
  tile.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  tile.style.setProperty('--my', `${event.clientY - rect.top}px`);
}

/** Jump to a section and move focus to its heading, so the keyboard continues from there. */
function goToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

function Tile({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <article className={`ob-tile${className ? ` ${className}` : ''}`} style={style} onPointerMove={trackPointer}>
      {children}
    </article>
  );
}

interface ProjectTileProps {
  project: Project;
  /** Layout role in the bento: wide with a screenshot, or the typographic one (no screenshot exists). */
  variant: 'feature' | 'type';
  /** This tile is the one the open (or last opened) dialog morphs from and back to. */
  morph: boolean;
  onOpen: (project: Project) => void;
}

function ProjectTile({ project, variant, morph, onOpen }: ProjectTileProps) {
  const { name, descriptor } = splitTitle(project.title);
  const image = projectImage(project);
  const extra = project.tech.length - TILE_TECH_COUNT;
  return (
    <Tile
      className={`ob-tile--project ob-tile--${variant}`}
      style={morph ? ({ viewTransitionName: CARD_TRANSITION_NAME } as CSSProperties) : undefined}
    >
      {/* The tile is the query container; this inner box is what its width lays out. */}
      <div className="ob-tile__in">
      <div className="ob-tile__body">
        <p className="ob-kicker">
          {project.kind} <span aria-hidden="true">/</span> {project.year}
        </p>
        <h3 className="ob-tile__title">
          {name}
          {descriptor && <span className="ob-tile__descriptor"> {descriptor}</span>}
        </h3>
        <p className="ob-tile__tagline">{project.tagline}</p>
        {project.highlights && (
          <ul className={variant === 'type' ? 'ob-steps' : 'ob-checks'}>
            {project.highlights.map(h => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
        <ul className="ob-chips" role="list">
          {project.tech.slice(0, TILE_TECH_COUNT).map(t => (
            <li key={t} className="ob-chip">
              {t}
            </li>
          ))}
          {extra > 0 && <li className="ob-chip ob-chip--more">+{extra} more</li>}
        </ul>
        <p className="ob-tile__foot">
          {/* Stretched over the whole tile (b.css); the links below sit above it. */}
          <button type="button" className="ob-open" data-project-open={project.id} onClick={() => onOpen(project)}>
            Details<span className="opt-sr">: {name}</span>
            <ArrowRight />
          </button>
          {project.live && (
            <a className="ob-tile__link" href={project.live} {...external}>
              Live<span className="opt-sr"> site of {name}</span>
              <ArrowUpRight />
              <NewTab />
            </a>
          )}
          {project.github && (
            <a className="ob-tile__link" href={project.github} {...external}>
              Code<span className="opt-sr"> of {name} on GitHub</span>
              <ArrowUpRight />
              <NewTab />
            </a>
          )}
        </p>
      </div>
      {image && variant !== 'type' && (
        <div className="ob-tile__media" aria-hidden="true">
          <div className="ob-frame">
            {/* Decorative here (alt ""): the tile already names the project; the dialog's copy has the alt. */}
            <img src={image.src} srcSet={image.srcSet} sizes="(min-width: 900px) 520px, 92vw" width={image.width} height={image.height} alt="" loading="lazy" decoding="async" />
          </div>
        </div>
      )}
      </div>
    </Tile>
  );
}

function WorkRow({ project, detailed }: { project: Project; detailed: boolean }) {
  const { name } = splitTitle(project.title);
  return (
    <li className="ob-row">
      <div className="ob-row__text">
        <p className="ob-row__head">
          <span className="ob-row__name">{name}</span>
          <span className="ob-row__kind">
            {project.kind}
            {project.status === 'in-development' && ', in development'}
          </span>
        </p>
        {detailed && <p className="ob-row__tag">{project.tagline}</p>}
      </div>
      <p className="ob-row__links">
        {project.live && (
          <a className="ob-tile__link" href={project.live} {...external}>
            Live<span className="opt-sr"> site of {name}</span>
            <ArrowUpRight />
            <NewTab />
          </a>
        )}
        {project.github && (
          <a className="ob-tile__link" href={project.github} {...external}>
            Code<span className="opt-sr"> of {name} on GitHub</span>
            <ArrowUpRight />
            <NewTab />
          </a>
        )}
      </p>
    </li>
  );
}

export default function OptionB() {
  const [theme, toggleTheme] = useTheme();
  const [copyState, copyEmail] = useCopyEmail();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  /** The tile that carries the transition name; kept after closing so the dialog morphs back. */
  const [morphId, setMorphId] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState('Ctrl K');
  const openRef = useRef<string | null>(null);
  openRef.current = openId;

  const openProject = useCallback((project: Project) => {
    // First name the tile (old snapshot), then swap the name to the dialog (new snapshot).
    flushSync(() => setMorphId(project.id));
    withViewTransition(() => setOpenId(project.id));
  }, []);

  const closeProject = useCallback(() => {
    // Also called by the dialog's own `close` event after we closed it: nothing left to do then.
    if (openRef.current === null) return;
    withViewTransition(() => setOpenId(null));
  }, []);

  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    // Apple keyboards have no Ctrl+K habit; show the key the visitor will actually press.
    if (/Mac|iPhone|iPad/i.test(navigator.platform ?? '')) setShortcut('⌘K');
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        // Chrome's own Ctrl+K focuses the address bar.
        event.preventDefault();
        // Not on top of an open project: two stacked modals would fight over focus.
        if (openRef.current === null) setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const openUrl = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');
    return [
      ...SECTIONS.map(section => ({
        id: `go-${section.id}`,
        group: 'Go to',
        label: section.label,
        icon: <ArrowRight />,
        run: () => goToSection(section.id),
      })),
      ...mainProjects.map(project => ({
        id: `project-${project.id}`,
        group: 'Projects',
        label: splitTitle(project.title).name,
        hint: project.kind,
        keywords: `${project.title} ${project.tech.join(' ')}`,
        icon: <ArrowRight />,
        run: () => openProject(project),
      })),
      {
        id: 'resume',
        group: 'Actions',
        label: 'Download resume',
        hint: 'PDF',
        keywords: 'cv',
        icon: <Download />,
        run: () => {
          const link = document.createElement('a');
          link.href = bio.resume.href;
          link.download = bio.resume.fileName;
          link.click();
        },
      },
      { id: 'copy-email', group: 'Actions', label: 'Copy email address', hint: EMAIL_SHOWN, keywords: 'contact mail', icon: <Copy />, run: copyEmail },
      { id: 'send-email', group: 'Actions', label: 'Send an email', keywords: 'contact mail hire', icon: <Mail />, run: () => window.location.assign(MAILTO) },
      {
        id: 'theme',
        group: 'Actions',
        label: theme === 'night' ? 'Switch to light theme' : 'Switch to dark theme',
        keywords: 'dark light mode appearance',
        icon: theme === 'night' ? <Sun /> : <Moon />,
        run: toggleTheme,
      },
      { id: 'github', group: 'Actions', label: 'Open GitHub', hint: GITHUB_HANDLE, keywords: 'code repos', icon: <Github />, run: () => openUrl(bio.github) },
      { id: 'linkedin', group: 'Actions', label: 'Open LinkedIn', hint: LINKEDIN_HANDLE, icon: <Linkedin />, run: () => openUrl(bio.linkedin) },
    ];
  }, [copyEmail, openProject, theme, toggleTheme]);

  const [aside, nechita, sommelier] = mainProjects;
  const openProjectData = mainProjects.find(p => p.id === openId) ?? null;
  const isMorph = (project: Project) => morphId === project.id && openId === null;
  const copyMessage = copyState === 'copied' ? 'Email address copied' : copyState === 'failed' ? 'Copy was blocked. Use the email link instead.' : '';

  return (
    <OptionShell optionKey="b">
      <header className="ob-bar">
        <div className="ob-bar__in ob-wrap">
          <p className="ob-bar__brand">
            <span className="ob-bar__mark" aria-hidden="true" />
            {bio.name}
          </p>
          <nav className="ob-bar__nav" aria-label="Sections">
            {NAV_SECTIONS.map(section => (
              <a key={section.id} href={`#${section.id}`}>
                {section.label}
              </a>
            ))}
          </nav>
          <div className="ob-bar__tools">
            <button type="button" className="ob-cmd" onClick={() => setPaletteOpen(true)} aria-label="Open command palette" aria-keyshortcuts="Control+K Meta+K">
              <Search />
              <span className="ob-cmd__text" aria-hidden="true">
                Search
              </span>
              <kbd className="ob-cmd__kbd" aria-hidden="true">
                {shortcut}
              </kbd>
            </button>
            <button type="button" className="ob-icon-btn" onClick={toggleTheme} aria-label={theme === 'night' ? 'Switch to light theme' : 'Switch to dark theme'}>
              {theme === 'night' ? <Sun /> : <Moon />}
            </button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="ob-hero ob-wrap" aria-label="Introduction">
          <p className="ob-status">
            <span className="ob-status__dot" aria-hidden="true" />
            <span className="opt-sr">Open to: </span>
            {bio.availability}
          </p>
          <h1 className="ob-hero__name">{bio.name}</h1>
          <p className="ob-hero__role">{bio.role}</p>
          <p className="ob-hero__pitch">{bio.tagline}</p>
          <div className="ob-hero__cta">
            <a className="ob-btn ob-btn--primary" href={bio.resume.href} download={bio.resume.fileName}>
              <Download />
              Download resume
            </a>
            <span className="ob-mail">
              <a className="ob-mail__link" href={MAILTO}>
                <Mail />
                <span className="opt-sr">Email </span>
                {EMAIL_SHOWN}
              </a>
              <button type="button" className="ob-mail__copy" onClick={copyEmail} aria-label="Copy email address">
                {copyState === 'copied' ? <Check /> : <Copy />}
              </button>
            </span>
          </div>
          <p className="ob-hero__meta">
            <span>{bio.resume.meta}</span>
            <a href={bio.github} {...external}>
              <Github />
              GitHub
              <NewTab />
            </a>
            <a href={bio.linkedin} {...external}>
              <Linkedin />
              LinkedIn
              <NewTab />
            </a>
          </p>
        </section>

        <section id="projects" className="ob-section ob-wrap" aria-labelledby="ob-projects-title">
          <h2 id="ob-projects-title" className="ob-h2" tabIndex={-1}>
            Projects
          </h2>
          <div className="ob-bento">
            <div className="ob-bento__grid">
              {aside && <ProjectTile project={aside} variant="feature" morph={isMorph(aside)} onOpen={openProject} />}
              {sommelier && <ProjectTile project={sommelier} variant="type" morph={isMorph(sommelier)} onOpen={openProject} />}
              <Tile className="ob-tile--fact ob-tile--edu">
                <p className="ob-kicker">Education</p>
                <h3 className="ob-fact__title">{DEGREE}</h3>
                <p className="ob-fact__text">{bio.institution}</p>
                <p className="ob-fact__meta">{EDUCATION_PERIOD}</p>
              </Tile>
              <Tile className="ob-tile--fact ob-tile--service">
                <p className="ob-kicker">Service</p>
                <h3 className="ob-fact__title">{SERVICE_ROLE}</h3>
                <p className="ob-fact__text">{SERVICE_ORG}</p>
                <p className="ob-fact__meta">{SERVICE_PERIOD}</p>
              </Tile>
              {nechita && <ProjectTile project={nechita} variant="feature" morph={isMorph(nechita)} onOpen={openProject} />}
              <Tile className="ob-tile--more">
                <p className="ob-kicker">More work</p>
                <div className="ob-more">
                  <div>
                    <h3 className="ob-more__title">Side projects</h3>
                    <ul className="ob-rows" role="list">
                      {sideProjects.map(project => (
                        <WorkRow key={project.id} project={project} detailed />
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="ob-more__title">Coursework</h3>
                    <ul className="ob-rows" role="list">
                      {courseworkProjects.map(project => (
                        <WorkRow key={project.id} project={project} detailed />
                      ))}
                    </ul>
                  </div>
                </div>
              </Tile>
            </div>
          </div>
        </section>

        <section id="about" className="ob-section ob-split ob-wrap" aria-labelledby="ob-about-title">
          <h2 id="ob-about-title" className="ob-h2" tabIndex={-1}>
            About
          </h2>
          <div className="ob-prose">
            {aboutParagraphs.map(paragraph => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section id="skills" className="ob-section ob-split ob-wrap" aria-labelledby="ob-skills-title">
          <h2 id="ob-skills-title" className="ob-h2" tabIndex={-1}>
            Skills
          </h2>
          <div>
            <dl className="ob-skills">
              {skillGroups.map(group => (
                <div key={group.category} className="ob-skills__row">
                  <dt>{group.category}</dt>
                  <dd>{group.items.join(', ')}</dd>
                </div>
              ))}
            </dl>
            {certifications.length > 0 && (
              <>
                <h3 className="ob-kicker ob-certs__title">Certifications</h3>
                <ul className="ob-chips" role="list">
                  {certifications.map(cert => (
                    <li key={cert} className="ob-chip">
                      {cert}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section id="contact" className="ob-section ob-wrap" aria-labelledby="ob-contact-title">
          <div className="ob-tile ob-contact" onPointerMove={trackPointer}>
            <h2 id="ob-contact-title" className="ob-h2" tabIndex={-1}>
              Contact
            </h2>
            <p className="ob-contact__blurb">{bio.contactBlurb}</p>
            <div className="ob-contact__actions">
              <a className="ob-btn ob-btn--primary" href={MAILTO}>
                <Mail />
                <span className="opt-sr">Email </span>
                {EMAIL_SHOWN}
              </a>
              <a className="ob-btn ob-btn--ghost" href={bio.resume.href} download={bio.resume.fileName}>
                <Download />
                Resume<span className="opt-sr"> download</span>
              </a>
              <a className="ob-btn ob-btn--ghost" href={bio.linkedin} {...external}>
                <Linkedin />
                LinkedIn
                <NewTab />
              </a>
              <a className="ob-btn ob-btn--ghost" href={bio.github} {...external}>
                <Github />
                GitHub
                <NewTab />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="ob-footer ob-wrap">
        <p>
          {bio.name}{' '}
          <span lang="he" dir="rtl">
            {bio.nameHe}
          </span>
        </p>
        <p>{bio.title}</p>
      </footer>

      {/* One live region for every copy, wherever it was triggered (hero button or palette). */}
      <p className="ob-toast" role="status" aria-live="polite" data-show={copyMessage ? '' : undefined}>
        {copyMessage}
      </p>

      <ProjectDialog project={openProjectData} onClose={closeProject} />
      <CommandPalette open={paletteOpen} onClose={closePalette} commands={commands} />
    </OptionShell>
  );
}
