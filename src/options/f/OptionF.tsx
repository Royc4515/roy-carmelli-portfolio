import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/bricolage-grotesque/wdth.css';
import { OptionShell } from '../shared/OptionShell';
import {
  bio,
  mainProjects,
  sideProjects,
  courseworkProjects,
  aboutParagraphs,
  skillGroups,
  certifications,
  DEGREE,
  SERVICE_ORG,
  SERVICE_ROLE,
  SERVICE_PERIOD,
  EDUCATION_PERIOD,
  EMAIL_SHOWN,
  MAILTO,
  GITHUB_HANDLE,
  LINKEDIN_HANDLE,
  splitTitle,
  projectImage,
  projectLinks,
  storyParagraphs,
  type Project,
} from '../shared/content';
import { useCopyEmail, useModalDialog, usePrefersReducedMotion } from '../shared/hooks';
import { ArrowRight, ArrowUpRight, ArrowDown, Chat, Check, Close, Copy, Download, Mail, Play } from '../shared/icons';
import Arcade from '../d/Arcade';
import { CHAT_ENABLED } from '../../components/Chat/ChatLauncher';
import { AskRoy, Portrait } from './AskRoy';
import { frameSection } from './frame';
import { chatPersona } from '../../data/chatPersona';
import type { VoxelWorld } from './engine';
import { useAmbience, type Ambience, type SkyMode } from './ambience';
import { AmbienceLine } from './AmbienceLine';
import './f.css';

type SceneState = 'loading' | 'on' | 'off';

/**
 * The canvas behind the page. The engine (and its shaders) loads in an effect, so nothing
 * touches WebGL while the page renders in a test or in the build-time prerender. Without
 * WebGL2, or after a lost context, `state` is "off" and the page shows its still image.
 */
function Scene({ ambience, paused, onState, worldRef }: {
  ambience: Ambience;
  paused: boolean;
  onState: (s: SceneState) => void;
  worldRef: React.MutableRefObject<VoxelWorld | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  // The engine loads asynchronously: it takes the latest ambience when it is ready.
  const latest = useRef(ambience);
  latest.current = ambience;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cancelled = false;
    let world: VoxelWorld | null = null;
    import('./engine')
      .then(({ createVoxelWorld }) =>
        createVoxelWorld(el, {
          reducedMotion: reduced,
          stations: () => Array.from(document.querySelectorAll<HTMLElement>('[data-station]')),
          onReady: () => !cancelled && onState('on'),
          onLost: () => !cancelled && onState('off'),
        }),
      )
      .then(created => {
        if (cancelled) return created?.destroy();
        world = created;
        worldRef.current = created;
        if (!created) onState('off');
        created?.setAmbience(latest.current);
      })
      .catch(() => !cancelled && onState('off'));
    return () => {
      cancelled = true;
      world?.destroy();
      worldRef.current = null;
    };
  }, [reduced, onState, worldRef]);

  useEffect(() => worldRef.current?.setAmbience(ambience), [ambience, worldRef]);
  useEffect(() => worldRef.current?.setPaused(paused), [paused, worldRef]);

  return <canvas ref={canvas} className="of-canvas" aria-hidden="true" />;
}

function External({ href, children, className = 'of-link' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight className="of-link__icon" />
      <span className="opt-sr"> (opens in a new tab)</span>
    </a>
  );
}

/** One station of the world: the panel is solid, the scene shows beside and between panels. */
function Station({ id, label, children, wide, fit }: { id: string; label: string; children: ReactNode; wide?: boolean; fit?: boolean }) {
  return (
    <section className="of-stage" id={id} aria-labelledby={`${id}-title`}>
      <div className="of-card" data-station="" data-solid="" data-wide={wide ? '' : undefined} data-fit={fit ? '' : undefined}>
        <p className="of-kicker">{label}</p>
        {children}
      </div>
    </section>
  );
}

/** The stack at a glance. The data lists the core tools first, so the first few say the most. */
function Tags({ items, limit, label = 'Built with' }: { items: string[]; limit?: number; label?: string }) {
  const shown = limit ? items.slice(0, limit) : items;
  const rest = items.length - shown.length;
  return (
    <ul className="of-tags" aria-label={label}>
      {shown.map(item => <li key={item}>{item}</li>)}
      {rest > 0 && <li className="of-tags__more">+{rest}</li>}
    </ul>
  );
}

function ProjectStation({ project, index, onOpen }: { project: Project; index: number; onOpen: (p: Project) => void }) {
  const { name, descriptor } = splitTitle(project.title);
  return (
    <Station id={`project-${project.id}`} label={`${String(index + 1).padStart(2, '0')} / ${project.kind} / ${project.year}`}>
      <h2 className="of-title" id={`project-${project.id}-title`}>
        {name}
        {descriptor && <span className="of-title__sub">{descriptor}</span>}
      </h2>
      <p className="of-lede">{project.tagline}</p>
      {project.highlights && (
        <ul className="of-points">
          {project.highlights.map(h => (
            <li key={h}>
              <Check className="of-points__icon" />
              {h}
            </li>
          ))}
        </ul>
      )}
      <Tags items={project.tech} limit={5} />
      <div className="of-actions">
        <button type="button" className="of-btn" data-project-open={project.id} onClick={() => onOpen(project)}>
          Full story
          <span className="opt-sr">: {name}</span>
          <ArrowRight />
        </button>
        {project.live && <External href={project.live}>Live</External>}
        {project.github && <External href={project.github}>Source</External>}
      </div>
    </Station>
  );
}

function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const ref = useModalDialog(project !== null, onClose);
  // Keep the last project while the dialog closes, so it does not empty out mid-fade.
  const shown = useRef<Project | null>(null);
  if (project) shown.current = project;
  const p = shown.current;
  const image = p ? projectImage(p) : null;
  const story = p ? storyParagraphs(p) : null;
  return (
    <dialog ref={ref} className="of-dialog" aria-labelledby="of-dialog-title">
      {p && story && (
        <div className="of-dialog__body">
          <button type="button" className="of-icon-btn of-dialog__close" onClick={onClose} aria-label="Close">
            <Close />
          </button>
          <p className="of-kicker">{p.kind} / {p.year}</p>
          <h2 className="of-title" id="of-dialog-title">
            {splitTitle(p.title).name}
            {splitTitle(p.title).descriptor && <span className="of-title__sub">{splitTitle(p.title).descriptor}</span>}
          </h2>
          <p className="of-lede">{story.lead}</p>
          <div className="of-actions">
            {projectLinks(p).map(link => (
              <External key={link.href} href={link.href}>{link.label}</External>
            ))}
          </div>
          {/* Rendered only while open, so lazy loading would only delay it. */}
          {image && (
            <img className="of-dialog__image" src={image.src} srcSet={image.srcSet} sizes="(min-width: 48rem) 44rem, 92vw"
              width={image.width} height={image.height} alt={image.alt} decoding="async" />
          )}
          {p.highlights && (
            <>
              <h3 className="of-label">Highlights</h3>
              <ul className="of-points">
                {p.highlights.map(h => (
                  <li key={h}>
                    <Check className="of-points__icon" />
                    {h}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3 className="of-label">The full story</h3>
          {story.body.map(paragraph => (
            <p key={paragraph} className="of-dialog__text">{paragraph}</p>
          ))}
          <h3 className="of-label">Built with</h3>
          <Tags items={p.tech} />
        </div>
      )}
    </dialog>
  );
}

function Row({ project }: { project: Project }) {
  const { name } = splitTitle(project.title);
  return (
    <li className="of-row">
      <h3 className="of-row__head">
        <span className="of-row__name">{name}</span>
        <span className="of-row__kind">{project.kind}</span>
        {project.status === 'in-development' && <span className="of-row__badge">In development</span>}
      </h3>
      <div className="of-row__links">
        {project.live && <External href={project.live}>Live<span className="opt-sr">: {name}</span></External>}
        {project.github && <External href={project.github}>Source<span className="opt-sr">: {name}</span></External>}
      </div>
      <p className="of-row__text">{project.tagline}</p>
    </li>
  );
}

const SHELVES = [
  { key: 'side', label: 'Side projects', items: sideProjects },
  { key: 'course', label: 'Coursework', items: courseworkProjects },
] as const;

/**
 * Side projects and coursework on two tabs, so the panel fits one screen and the island stays
 * beside it. Arrow keys move between tabs, as the ARIA tabs pattern expects.
 */
function MoreWork() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + SHELVES.length) % SHELVES.length;
    setActive(next);
    tabs.current[next]?.focus();
  };
  return (
    <>
      <div className="of-tabs" role="tablist" aria-label="More work" onKeyDown={onKey}>
        {SHELVES.map((shelf, n) => (
          <button
            key={shelf.key}
            ref={el => { tabs.current[n] = el; }}
            type="button"
            role="tab"
            id={`of-tab-${shelf.key}`}
            aria-controls={`of-shelf-${shelf.key}`}
            aria-selected={active === n}
            tabIndex={active === n ? 0 : -1}
            className="of-tab"
            onClick={() => setActive(n)}
          >
            {shelf.label}
            <span className="of-tab__count">{shelf.items.length}</span>
          </button>
        ))}
      </div>
      {SHELVES.map((shelf, n) => (
        <ul
          key={shelf.key}
          id={`of-shelf-${shelf.key}`}
          role="tabpanel"
          aria-labelledby={`of-tab-${shelf.key}`}
          className="of-rows"
          hidden={active !== n}
        >
          {shelf.items.map(project => <Row key={project.id} project={project} />)}
        </ul>
      ))}
    </>
  );
}

/**
 * Option F, "Voxel Roy": the pixel world rebuilt in 3D from the game's own sprites, one cube
 * per pixel. Scrolling is the journey: Roy runs and jumps from island to island while a swarm
 * of cubes flies ahead and builds the next project's model. All text is ordinary HTML on
 * solid panels; the scene is decoration and is hidden from assistive technology.
 */
export default function OptionF() {
  const [mode, setMode] = useState<SkyMode>('live');
  const info = useAmbience(mode);
  const [scene, setScene] = useState<SceneState>('loading');
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState<Project | null>(null);
  const [playing, setPlaying] = useState(false);
  const [copyState, copyEmail] = useCopyEmail();
  const world = useRef<VoxelWorld | null>(null);
  const reduced = usePrefersReducedMotion();
  const closeDialog = useCallback(() => setOpen(null), []);
  const quit = useCallback(() => setPlaying(false), []);
  const [asking, setAsking] = useState(false);
  const stopAsking = useCallback(() => setAsking(false), []);
  // When Pixel Roy answers in the chat, the scene's Roy jumps: one character, two places.
  const royAnswers = useCallback(() => world.current?.jump(), []);

  // In-page links frame their panel on screen (frame.ts), on click and when the page opens
  // with a hash such as #skills.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const id = link?.getAttribute('href')?.slice(1);
      if (!id || !frameSection(id, !reduced)) return;
      e.preventDefault();
      history.replaceState(null, '', `#${id}`);
    };
    document.addEventListener('click', onClick);
    const id = window.location.hash.slice(1);
    // After fonts and layout settle, or the panel's position is measured too early.
    const timer = id ? window.setTimeout(() => frameSection(id, false), 350) : 0;
    return () => {
      document.removeEventListener('click', onClick);
      window.clearTimeout(timer);
    };
  }, [reduced]);

  // The interface follows the sky: dark panels once the sun is down, where the visitor is or
  // in the sky they chose. `data-theme` is the attribute the option's tokens key on.
  useEffect(() => {
    document.documentElement.dataset.theme = info.dark ? 'night' : 'day';
  }, [info.dark]);

  return (
    <OptionShell optionKey="f">
      <div className="of-root" data-scene={scene}>
        <Scene ambience={info.ambience} paused={paused} onState={setScene} worldRef={world} />

        <header className="of-nav">
          <div className="of-nav__bar" data-solid="">
            <a className="of-nav__brand" href="#main">
              {bio.name}
            </a>
            <nav aria-label="Page">
              <ul className="of-nav__links">
                <li><a href={`#project-${mainProjects[0].id}`}>Work</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#skills">Skills</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </nav>
          </div>
        </header>
        <AmbienceLine info={info} mode={mode} onMode={setMode} />

        <main id="main">
          <section className="of-stage of-stage--hero" aria-labelledby="hero-title">
            {/* Without WebGL the hero still has Roy: the wave frame itself, crisp. */}
            <img className="of-still" src="/assets/sprites/wave-2.png" width={68} height={92} alt="" />
            <div className="of-card of-card--hero" data-station="" data-solid="">
              <p className="of-status">
                <span className="of-dot" aria-hidden="true" />
                {bio.availability}
              </p>
              <h1 className="of-name" id="hero-title">{bio.name}</h1>
              <p className="of-role">{bio.role}</p>
              <p className="of-lede">{bio.tagline}</p>
              <div className="of-actions">
                <a className="of-btn of-btn--primary" href={bio.resume.href} download={bio.resume.fileName}>
                  <Download />
                  Download resume
                </a>
                <a className="of-btn" href={MAILTO}>
                  <Mail />
                  Email me
                </a>
              </div>
              <p className="of-meta">{bio.resume.meta}</p>
              {CHAT_ENABLED && (
                <button type="button" className="of-ask-cta" onClick={() => setAsking(true)}>
                  <span className="of-ask-cta__me">
                    <Portrait />
                    <span className="of-ask__online" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Questions? Ask {chatPersona.name}</strong>
                    <span className="of-ask-cta__sub">My AI twin answers about my work, in English or Hebrew</span>
                  </span>
                  <ArrowRight />
                </button>
              )}
            </div>
          </section>

          {mainProjects.map((project, i) => (
            <ProjectStation key={project.id} project={project} index={i} onOpen={setOpen} />
          ))}

          <Station id="more" label="More work" wide>
            <h2 className="of-title" id="more-title">More things I built</h2>
            <MoreWork />
          </Station>

          <Station id="about" label="About" wide fit>
            <h2 className="of-title" id="about-title">Student, builder, medic</h2>
            <div className="of-prose">
              {aboutParagraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <dl className="of-facts of-facts--pair">
              <div>
                <dt>Education</dt>
                <dd>B.Sc., {DEGREE}, {bio.institution}<span>{EDUCATION_PERIOD}</span></dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>{SERVICE_ORG}: {SERVICE_ROLE}<span>{SERVICE_PERIOD}</span></dd>
              </div>
            </dl>
          </Station>

          <Station id="skills" label="Skills" wide>
            <h2 className="of-title" id="skills-title">Toolbox</h2>
            <div className="of-shelf">
              {skillGroups.map(group => (
                <div key={group.category} className="of-shelf__group">
                  <h3 className="of-shelf__name">{group.category}</h3>
                  <Tags items={group.items} label={group.category} />
                </div>
              ))}
              {certifications.length > 0 && (
                <div className="of-shelf__group">
                  <h3 className="of-shelf__name">Certifications</h3>
                  <Tags items={certifications} label="Certifications" />
                </div>
              )}
            </div>
          </Station>

          <Station id="contact" label="Contact">
            <h2 className="of-title" id="contact-title">Hiring a student developer?</h2>
            <p className="of-lede">{bio.contactBlurb}</p>
            <p className="of-email">
              <a href={MAILTO}>{EMAIL_SHOWN}</a>
            </p>
            <div className="of-actions">
              <button type="button" className="of-btn" onClick={copyEmail}>
                {copyState === 'copied' ? <Check /> : <Copy />}
                {copyState === 'copied' ? 'Copied' : 'Copy address'}
              </button>
              <a className="of-btn of-btn--primary" href={bio.resume.href} download={bio.resume.fileName}>
                <Download />
                Download resume
              </a>
            </div>
            <span className="opt-sr" role="status">
              {copyState === 'copied' ? 'Email address copied' : copyState === 'failed' ? 'Copy failed. Use the email link instead.' : ''}
            </span>
            <div className="of-actions">
              <External href={bio.github}>{GITHUB_HANDLE}</External>
              <External href={bio.linkedin}>{LINKEDIN_HANDLE}</External>
            </div>
          </Station>
        </main>

        <footer className="of-footer" data-solid="">
          <span>{bio.name}</span>
          <span lang="he" dir="rtl">{bio.nameHe}</span>
        </footer>

        {/* The scene's own controls: stop the motion, poke Roy, or play the real game. */}
        <div className="of-controls">
          <div className="of-dock" data-solid="">
            {scene === 'on' && !reduced && (
              <>
                <button type="button" className="of-chip" onClick={() => setPaused(p => !p)} aria-pressed={paused}>
                  {paused ? <Play /> : <span className="of-pause" aria-hidden="true" />}
                  <span className="of-chip__label">{paused ? 'Resume scene' : 'Pause scene'}</span>
                </button>
                <button type="button" className="of-chip of-chip--toy" onClick={() => world.current?.jump()} disabled={paused}>
                  <ArrowDown style={{ rotate: '180deg' }} />
                  <span className="of-chip__label">Make Roy jump</span>
                </button>
              </>
            )}
            {CHAT_ENABLED && (
              <button type="button" className="of-chip of-chip--ask" onClick={() => setAsking(true)}>
                <Chat />
                <span className="of-chip__label">Ask {chatPersona.name}</span>
              </button>
            )}
            <button type="button" className="of-chip of-chip--play" onClick={() => setPlaying(true)}>
              <Play />
              <span className="of-chip__label">Play Roy Runner</span>
            </button>
          </div>
        </div>
      </div>
      <ProjectDialog project={open} onClose={closeDialog} />
      <Arcade open={playing} onClose={quit} />
      {CHAT_ENABLED && <AskRoy open={asking} onClose={stopAsking} onAnswer={royAnswers} />}
    </OptionShell>
  );
}
