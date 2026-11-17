import { useCallback, useState, type ReactNode } from 'react';
import '@fontsource-variable/inter/wght.css';
import { useTheme } from '../../hooks/useTheme';
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
  splitTitle,
  projectImage,
  projectLinks,
  storyParagraphs,
  type Project,
} from '../shared/content';
import { useCopyEmail, useModalDialog, usePrefersReducedMotion } from '../shared/hooks';
import { ArrowRight, ArrowUpRight, Check, Close, Copy, Download, Github, Linkedin, Mail, Moon, Play, Sun } from '../shared/icons';
import { ParticleStage, SCENES } from './ParticleStage';
import './e.css';

const SCENE_LABELS = ['Top', ...mainProjects.map(p => splitTitle(p.title).name), 'More work', 'About', 'Contact'];

function External({ href, children, className = 'oe-link' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight className="oe-link__icon" />
      <span className="opt-sr"> (opens in a new tab)</span>
    </a>
  );
}

function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const ref = useModalDialog(project !== null, onClose);
  const image = project ? projectImage(project) : null;
  const story = project ? storyParagraphs(project) : null;
  const { name, descriptor } = project ? splitTitle(project.title) : { name: '', descriptor: null };
  return (
    <dialog ref={ref} className="oe-dialog" aria-labelledby="oe-dialog-title">
      {project && story && (
        <div className="oe-dialog__body">
          <button type="button" className="oe-icon-btn oe-dialog__close" onClick={onClose} aria-label="Close">
            <Close />
          </button>
          <p className="oe-kicker">
            {project.kind} / {project.year}
          </p>
          <h2 className="oe-dialog__title" id="oe-dialog-title">
            {name}
            {descriptor && <span> {descriptor}</span>}
          </h2>
          <p className="oe-dialog__lead">{story.lead}</p>
          {image && (
            <img
              className="oe-dialog__image"
              src={image.src}
              srcSet={image.srcSet}
              sizes="(min-width: 60rem) 52rem, 92vw"
              width={image.width}
              height={image.height}
              alt={image.alt}
            />
          )}
          {story.body.map(paragraph => (
            <p key={paragraph} className="oe-dialog__p">
              {paragraph}
            </p>
          ))}
          <p className="oe-dialog__tech">{project.tech.join(' / ')}</p>
          <div className="oe-row">
            {projectLinks(project).map(link => (
              <External key={link.href} href={link.href} className="oe-btn oe-btn--ghost">
                {link.label}
              </External>
            ))}
          </div>
        </div>
      )}
    </dialog>
  );
}

function ProjectScene({ project, index, onOpen }: { project: Project; index: number; onOpen: (p: Project) => void }) {
  const { name, descriptor } = splitTitle(project.title);
  const scene = SCENES[index + 1];
  return (
    <section className="oe-scene" data-scene={project.id} data-side={scene.side} id={project.id} aria-labelledby={`oe-${project.id}`}>
      <div className="oe-card">
        <p className="oe-kicker">
          <span className="oe-kicker__no">{String(index + 1).padStart(2, '0')}</span>
          {project.kind} / {project.year}
        </p>
        <h2 className="oe-card__title" id={`oe-${project.id}`}>
          {name}
          {descriptor && <span> {descriptor}</span>}
        </h2>
        <p className="oe-card__lede">{project.tagline}</p>
        {project.highlights && (
          <ul className="oe-points">
            {project.highlights.map(point => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}
        <div className="oe-row">
          <button type="button" className="oe-btn oe-btn--accent" data-project-open={project.id} onClick={() => onOpen(project)}>
            Full story
            <span className="opt-sr">: {name}</span>
            <ArrowRight />
          </button>
          {project.live && <External href={project.live}>Live</External>}
          {project.github && <External href={project.github}>Code</External>}
        </div>
      </div>
    </section>
  );
}

function WorkRow({ project }: { project: Project }) {
  const { name } = splitTitle(project.title);
  return (
    <li className="oe-work">
      <div>
        <h3 className="oe-work__name">{name}</h3>
        <p className="oe-work__kind">
          {project.kind}
          {project.status === 'in-development' ? ', in development' : ''}
        </p>
      </div>
      <p className="oe-work__text">{project.tagline}</p>
      <div className="oe-work__links">
        {project.live && <External href={project.live}>Live<span className="opt-sr">: {name}</span></External>}
        {project.github && <External href={project.github}>Code<span className="opt-sr">: {name}</span></External>}
      </div>
    </li>
  );
}

/**
 * Option E, "Particles": one point cloud, drawn in raw WebGL2, forms the name and then
 * re-forms into a shape for each part of the page as the visitor scrolls. The page under it is
 * ordinary HTML: every word is real text, and without WebGL it is still a complete page.
 */
export default function OptionE() {
  const [theme, toggleTheme] = useTheme();
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [gl, setGl] = useState<boolean | null>(null);
  const [scene, setScene] = useState(0);
  const [open, setOpen] = useState<Project | null>(null);
  const [copyState, copyEmail] = useCopyEmail();
  const close = useCallback(() => setOpen(null), []);
  const dark = theme === 'night';

  return (
    <OptionShell optionKey="e">
      <div className="oe-page" data-gl={gl ? 'on' : gl === false ? 'off' : 'wait'} style={{ ['--oe-accent' as string]: `var(--oe-c${scene})` }}>
        <ParticleStage dark={dark} motion={!paused && !reduced} reduced={reduced} onReady={setGl} onScene={setScene} />
        <div className="oe-veil" aria-hidden="true" />

        <header className="oe-nav">
          <a className="oe-nav__name" href="#top">
            {bio.name}
          </a>
          <div className="oe-nav__tools">
            {gl && !reduced && (
              <button type="button" className="oe-icon-btn" onClick={() => setPaused(p => !p)} aria-pressed={paused}>
                {paused ? <Play /> : <span className="oe-pause" aria-hidden="true" />}
                <span className="opt-sr">Pause the particle animation</span>
              </button>
            )}
            <button type="button" className="oe-icon-btn" onClick={toggleTheme} aria-pressed={dark}>
              {dark ? <Sun /> : <Moon />}
              <span className="opt-sr">Dark theme</span>
            </button>
            <a className="oe-btn oe-btn--small" href={bio.resume.href} download={bio.resume.fileName}>
              <Download />
              Resume
            </a>
          </div>
        </header>

        <nav className="oe-dots" aria-label="Sections">
          <ol>
            {SCENES.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={scene === i ? 'true' : undefined}>
                  <span className="oe-dots__label">{SCENE_LABELS[i]}</span>
                  <span className="oe-dots__dot" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main id="main">
          <section className="oe-hero" data-scene="top" id="top">
            {/* The particles draw the name; the heading stays for assistive tech, and becomes
                the visible name whenever the canvas cannot run. */}
            <h1 className="oe-hero__name">{bio.name}</h1>
            <div className="oe-hero__text">
              <p className="oe-hero__status">
                <span className="oe-dot" aria-hidden="true" />
                {bio.availability}
              </p>
              <p className="oe-hero__role">{bio.role}</p>
              <p className="oe-hero__pitch">{bio.tagline}</p>
              <div className="oe-row oe-row--center">
                <a className="oe-btn oe-btn--accent" href={bio.resume.href} download={bio.resume.fileName}>
                  <Download />
                  Download resume
                </a>
                <a className="oe-btn oe-btn--ghost" href={MAILTO}>
                  <Mail />
                  {EMAIL_SHOWN}
                </a>
              </div>
              <p className="oe-hero__meta">{bio.resume.meta}</p>
            </div>
            {gl && (
              <p className="oe-hint" aria-hidden="true">
                Move, tap, scroll
              </p>
            )}
          </section>

          {mainProjects.map((project, i) => (
            <ProjectScene key={project.id} project={project} index={i} onOpen={setOpen} />
          ))}

          <section className="oe-scene" data-scene="more" data-side="left" id="more" aria-labelledby="oe-more">
            <div className="oe-card oe-card--wide">
              <p className="oe-kicker">More work</p>
              <h2 className="oe-card__title" id="oe-more">
                Side projects <span>and coursework</span>
              </h2>
              <ul className="oe-works">
                {sideProjects.map(project => (
                  <WorkRow key={project.id} project={project} />
                ))}
                {courseworkProjects.map(project => (
                  <WorkRow key={project.id} project={project} />
                ))}
              </ul>
            </div>
          </section>

          <section className="oe-scene" data-scene="about" data-side="right" id="about" aria-labelledby="oe-about">
            <div className="oe-card oe-card--wide">
              <p className="oe-kicker">About</p>
              <h2 className="oe-card__title" id="oe-about">
                {DEGREE} <span>{bio.institution}</span>
              </h2>
              {aboutParagraphs.map(paragraph => (
                <p key={paragraph} className="oe-card__p">
                  {paragraph}
                </p>
              ))}
              <dl className="oe-facts">
                <div>
                  <dt>Education</dt>
                  <dd>
                    B.Sc., {DEGREE}
                    <span>{EDUCATION_PERIOD}</span>
                  </dd>
                </div>
                <div>
                  <dt>Service</dt>
                  <dd>
                    {SERVICE_ORG}: {SERVICE_ROLE}
                    <span>{SERVICE_PERIOD}</span>
                  </dd>
                </div>
                {skillGroups.map(group => (
                  <div key={group.category}>
                    <dt>{group.category}</dt>
                    <dd>{group.items.join(', ')}</dd>
                  </div>
                ))}
                <div>
                  <dt>Certifications</dt>
                  <dd>{certifications.join(', ')}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="oe-scene oe-scene--last" data-scene="contact" data-side="left" id="contact" aria-labelledby="oe-contact">
            <div className="oe-card">
              <p className="oe-kicker">Contact</p>
              <h2 className="oe-card__title oe-card__title--big" id="oe-contact">
                {bio.contactBlurb}
              </h2>
              <div className="oe-row">
                <a className="oe-btn oe-btn--accent" href={MAILTO}>
                  <Mail />
                  {EMAIL_SHOWN}
                </a>
                <button type="button" className="oe-btn oe-btn--ghost" onClick={copyEmail}>
                  {copyState === 'copied' ? <Check /> : <Copy />}
                  {copyState === 'copied' ? 'Copied' : 'Copy'}
                  <span className="opt-sr"> email address</span>
                </button>
              </div>
              <span className="opt-sr" role="status">
                {copyState === 'copied' ? 'Email address copied' : copyState === 'failed' ? 'Copy failed. Use the email link instead.' : ''}
              </span>
              <div className="oe-row">
                <a className="oe-btn oe-btn--ghost" href={bio.resume.href} download={bio.resume.fileName}>
                  <Download />
                  Resume
                </a>
                <External href={bio.github} className="oe-btn oe-btn--ghost">
                  <Github />
                  GitHub
                </External>
                <External href={bio.linkedin} className="oe-btn oe-btn--ghost">
                  <Linkedin />
                  LinkedIn
                </External>
              </div>
            </div>
          </section>
        </main>

        <footer className="oe-footer">
          <span>{bio.name}</span>
          <span lang="he" dir="rtl">
            {bio.nameHe}
          </span>
        </footer>
        <ProjectDialog project={open} onClose={close} />
      </div>
    </OptionShell>
  );
}
