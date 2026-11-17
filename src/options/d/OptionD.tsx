import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Character from '../../components/Character';
import ChatLauncher from '../../components/Chat/ChatLauncher';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTheme } from '../../hooks/useTheme';
import { pixelSprites } from '../../theme/pixelSprites';
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
import { useCopyEmail } from '../shared/hooks';
import { ArrowUpRight, Check, Copy, Download, Github, Linkedin, Mail, Moon, Play, Sun } from '../shared/icons';
import Arcade from './Arcade';
import './d.css';

const FOREST = pixelSprites.forest;
const WAVE = pixelSprites.wave;
/** The forest column Roy's feet stand on (the same spot as the current site's hero). */
const FEET_COLUMN = 244;

const NAV = [
  { href: '#work', label: 'Work' },
  { href: '#about', label: 'About' },
  { href: '#skills', label: 'Skills' },
  { href: '#contact', label: 'Contact' },
];

/**
 * The one piece of the pixel world on the page: a framed window onto Roy Runner's forest, with
 * Roy on its grass line. Forest and Roy share one whole-number scale `k`, so every art pixel is
 * a whole CSS pixel. `data-hero-roy` is what the chat launcher looks for on phones: it docks
 * its speech bubble at Roy's mouth instead of standing on the hero's text.
 */
function PixelWindow({ k }: { k: number }) {
  // Right-aligned: Roy stands right of centre, the canopy fills the room to his left.
  const royRight = (FOREST.w - FEET_COLUMN - (WAVE.frameW - WAVE.anchorX)) * k;
  const royBottom = (FOREST.h - FOREST.groundRow) * k;
  return (
    <div className="od-window" style={{ height: `${Math.min(FOREST.h * k, k === 1 ? 132 : 308)}px` }}>
      {[0, 1, 2].map(i => (
        <img
          key={i}
          src={FOREST.src}
          alt=""
          width={FOREST.w * k}
          height={FOREST.h * k}
          decoding="async"
          draggable={false}
          className="od-window__forest"
          // Every other tile is mirrored, so the copies meet without a seam.
          style={{ right: `${i * FOREST.w * k}px`, transform: i % 2 ? 'scaleX(-1)' : undefined }}
        />
      ))}
      <div className="od-window__night" aria-hidden="true" />
      <div data-hero-roy="" className="od-window__roy" style={{ right: `${royRight}px`, bottom: `${royBottom}px` }}>
        <Character pose="wave" scale={k} decorative />
      </div>
    </div>
  );
}

function ProjectVisual({ project }: { project: Project }) {
  const image = projectImage(project);
  if (image) {
    return (
      <div className="od-shot">
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes="(min-width: 60rem) 30rem, 92vw"
          width={image.width}
          height={image.height}
          alt={image.alt}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
  // No screenshot exists for this project: its own highlights, set as a numbered card.
  return (
    <div className="od-shot od-shot--type" aria-hidden="true">
      <p className="od-label">{project.kind}</p>
      <ol>
        {(project.highlights ?? []).map((line, i) => (
          <li key={line}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            {line}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ExternalLinks({ project }: { project: Project }) {
  const { name } = splitTitle(project.title);
  return (
    <>
      {projectLinks(project).map(link => (
        <a key={link.href} className="od-link" href={link.href} target="_blank" rel="noopener noreferrer">
          {link.label}
          <span className="opt-sr"> for {name} (opens in a new tab)</span>
          <ArrowUpRight />
        </a>
      ))}
    </>
  );
}

function MainProject({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const { name, descriptor } = splitTitle(project.title);
  const story = storyParagraphs(project);
  const hasImage = projectImage(project) !== null;
  return (
    <article className="od-project">
      <ProjectVisual project={project} />
      <div className="od-project__text">
        <p className="od-label">
          {project.kind} <span aria-hidden="true">/</span> {project.year}
        </p>
        <h3 className="od-project__title">
          {name}
          {descriptor && <span className="od-project__descriptor"> {descriptor}</span>}
        </h3>
        <p className="od-project__tagline">{project.tagline}</p>
        {/* With no screenshot the highlights are the visual; a screen reader gets them here. */}
        <ul className={hasImage ? 'od-highlights' : 'opt-sr'}>
          {(project.highlights ?? []).map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="od-project__actions">
          <button
            type="button"
            className="od-btn od-btn--quiet"
            data-project-open={project.id}
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen(o => !o)}
          >
            {open ? 'Hide details' : 'Details'}
            <span className="opt-sr"> of {name}</span>
            <span className="od-chevron" data-open={open || undefined} aria-hidden="true" />
          </button>
          <ExternalLinks project={project} />
        </div>
      </div>
      <div id={detailsId} className="od-details" data-open={open || undefined}>
        <div className="od-details__clip">
          <div className="od-details__body">
            <div className="od-details__story">
              <p className="od-details__lead">{story.lead}</p>
              {story.body.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="od-details__stack">
              <p className="od-label">Built with</p>
              <ul className="od-tags">
                {project.tech.map(tech => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function WorkRow({ project }: { project: Project }) {
  const { name, descriptor } = splitTitle(project.title);
  return (
    <li className="od-row">
      <div className="od-row__head">
        <h4 className="od-row__title">
          {name}
          {descriptor && <span className="od-project__descriptor"> {descriptor}</span>}
        </h4>
        <p className="od-label">
          {project.kind}
          {project.status === 'in-development' && ' / in development'}
        </p>
      </div>
      <p className="od-row__tagline">{project.tagline}</p>
      <div className="od-row__links">
        <ExternalLinks project={project} />
      </div>
    </li>
  );
}

export default function OptionD() {
  const [theme, toggleTheme] = useTheme();
  const [playing, setPlaying] = useState(false);
  const [copyState, copyEmail] = useCopyEmail();
  const isPhone = useIsMobile();
  const playButton = useRef<HTMLButtonElement>(null);

  const play = useCallback(() => setPlaying(true), []);
  const quit = useCallback(() => setPlaying(false), []);
  const dark = theme === 'night';

  return (
    <OptionShell optionKey="d">
      <header className="od-header">
        <div className="od-wrap od-header__row">
          <a className="od-wordmark" href="#top" aria-label={`${bio.name}, back to top`}>
            {bio.name}
          </a>
          <nav aria-label="Sections" className="od-nav">
            {NAV.map(item => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="od-icon-btn"
            onClick={toggleTheme}
            aria-pressed={dark}
            aria-label="Dark theme"
          >
            {dark ? <Sun /> : <Moon />}
          </button>
        </div>
      </header>

      <main id="main">
        {/* id and data-layout are read by the chat launcher: on phones it docks its bubble
            beside the Roy in this section and waits until the section has scrolled away
            before it stands in the corner (src/components/Chat/ChatLauncher.tsx). */}
        <section id="hero" data-layout="stack" className="od-hero" aria-labelledby="od-name">
          <span id="top" />
          <div className="od-wrap od-hero__grid">
            <div className="od-hero__text">
              <p className="od-status">
                <span className="od-status__dot" aria-hidden="true" />
                {bio.availability}
              </p>
              <h1 id="od-name" className="od-name">
                {bio.name}
              </h1>
              <p className="od-role">{bio.role}</p>
              <p className="od-pitch">{bio.tagline}</p>
              <div className="od-cta">
                <a className="od-btn od-btn--primary" href={bio.resume.href} download={bio.resume.fileName}>
                  <Download />
                  Download resume
                </a>
                <a className="od-btn" href={MAILTO}>
                  <Mail />
                  Email me
                </a>
              </div>
              <p className="od-meta">{bio.resume.meta}</p>
            </div>

            <div className="od-stage">
              <PixelWindow k={isPhone ? 1 : 2} />
              <div className="od-stage__bar">
                <p className="od-stage__caption">
                  <span className="od-stage__tag">Play mode</span>
                  An endless runner on a canvas engine I built for this site. Optional.
                </p>
                <button ref={playButton} type="button" className="od-btn od-btn--play" onClick={play}>
                  <Play />
                  Play Roy Runner
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="work" className="od-section" aria-labelledby="od-work">
          <div className="od-wrap">
            <header className="od-section__head">
              <p className="od-label">01</p>
              <h2 id="od-work">Selected work</h2>
            </header>
            <div className="od-projects">
              {mainProjects.map(project => (
                <MainProject key={project.id} project={project} />
              ))}
            </div>

            <div className="od-more">
              <h3 className="od-more__title">Side projects</h3>
              <ul className="od-rows">
                {sideProjects.map(project => (
                  <WorkRow key={project.id} project={project} />
                ))}
              </ul>
              <h3 className="od-more__title">Coursework</h3>
              <ul className="od-rows">
                {courseworkProjects.map(project => (
                  <WorkRow key={project.id} project={project} />
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="about" className="od-section" aria-labelledby="od-about">
          <div className="od-wrap">
            <header className="od-section__head">
              <p className="od-label">02</p>
              <h2 id="od-about">About</h2>
            </header>
            <div className="od-about">
              <div className="od-prose">
                {aboutParagraphs.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <dl className="od-facts">
                <div>
                  <dt className="od-label">Education</dt>
                  <dd>
                    <strong>{DEGREE}</strong>
                    <span>{bio.institution}</span>
                    <span>{EDUCATION_PERIOD}</span>
                  </dd>
                </div>
                <div>
                  <dt className="od-label">Service</dt>
                  <dd>
                    <strong>{SERVICE_ROLE}</strong>
                    <span>{SERVICE_ORG}</span>
                    <span>{SERVICE_PERIOD}</span>
                  </dd>
                </div>
                <div>
                  <dt className="od-label">Certifications</dt>
                  <dd>
                    {certifications.map(name => (
                      <span key={name}>{name}</span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section id="skills" className="od-section" aria-labelledby="od-skills">
          <div className="od-wrap">
            <header className="od-section__head">
              <p className="od-label">03</p>
              <h2 id="od-skills">Skills</h2>
            </header>
            <dl className="od-skills">
              {skillGroups.map(group => (
                <div key={group.category}>
                  <dt>{group.category}</dt>
                  <dd>{group.items.join(', ')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="contact" className="od-section od-contact" aria-labelledby="od-contact">
          <div className="od-wrap">
            <header className="od-section__head">
              <p className="od-label">04</p>
              <h2 id="od-contact">Contact</h2>
            </header>
            <p className="od-contact__blurb">{bio.contactBlurb}</p>
            <div className="od-contact__email">
              <a className="od-email" href={MAILTO}>
                {EMAIL_SHOWN}
              </a>
              <button type="button" className="od-btn od-btn--quiet" onClick={copyEmail}>
                {copyState === 'copied' ? <Check /> : <Copy />}
                {copyState === 'copied' ? 'Copied' : 'Copy address'}
              </button>
              <span className="opt-sr" role="status" aria-live="polite">
                {copyState === 'copied' && 'Email address copied.'}
                {copyState === 'failed' && 'Copy was blocked. Use the email link instead.'}
              </span>
            </div>
            <div className="od-contact__links">
              <a className="od-btn od-btn--primary" href={bio.resume.href} download={bio.resume.fileName}>
                <Download />
                Download resume
              </a>
              <a className="od-btn" href={bio.github} target="_blank" rel="noopener noreferrer">
                <Github />
                {GITHUB_HANDLE}
                <span className="opt-sr"> (opens in a new tab)</span>
              </a>
              <a className="od-btn" href={bio.linkedin} target="_blank" rel="noopener noreferrer">
                <Linkedin />
                {LINKEDIN_HANDLE}
                <span className="opt-sr"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="od-footer">
        <div className="od-wrap od-footer__row">
          <p>
            {bio.name}{' '}
            <span lang="he" dir="rtl">
              {bio.nameHe}
            </span>
          </p>
          <button type="button" className="od-link" onClick={play}>
            <Play />
            Play Roy Runner
          </button>
        </div>
      </footer>

      <Arcade open={playing} onClose={quit} />
      {/* Outside `.opt` on purpose: the chat is styled in `@layer components`, which the
          option's unlayered resets would override. */}
      {typeof document !== 'undefined' && createPortal(<ChatLauncher />, document.body)}
    </OptionShell>
  );
}
