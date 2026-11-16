import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
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
  GITHUB_HANDLE,
  LINKEDIN_HANDLE,
  splitTitle,
  projectImage,
  projectLinks,
  storyParagraphs,
  type Project,
} from '../shared/content';
import { useCopyEmail, withViewTransition } from '../shared/hooks';
import { ArrowDown, ArrowRight, ArrowUpRight } from '../shared/icons';
import './a.css';

/** The case study of a project lives at "#work-<id>", so Back closes it and the link can be shared. */
const HASH_PREFIX = '#work-';

function projectFromHash(): Project | null {
  if (typeof window === 'undefined') return null;
  const { hash } = window.location;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return mainProjects.find(p => p.id === hash.slice(HASH_PREFIX.length)) ?? null;
}

/**
 * Which case study is open, kept in the URL hash. Opening and closing run inside a View
 * Transition (where supported), and the list's scroll position is restored on the way back.
 */
function useCaseStudy(): [Project | null, (p: Project) => void, () => void] {
  const [open, setOpen] = useState<Project | null>(projectFromHash);
  const listScroll = useRef(0);

  useEffect(() => {
    // Back/Forward: the browser changed the hash, so follow it.
    const onPop = () => withViewTransition(() => setOpen(projectFromHash()));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const show = useCallback((project: Project) => {
    listScroll.current = window.scrollY;
    window.history.pushState(null, '', `${window.location.search}${HASH_PREFIX}${project.id}`);
    withViewTransition(() => setOpen(project));
  }, []);

  const close = useCallback(() => {
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    withViewTransition(() => setOpen(null));
  }, []);

  // After the swap: a case study starts at its top, the list returns to where it was left.
  const mounted = useRef(false);
  useLayoutEffect(() => {
    // Not on the first render: the browser's own position (reload, "#about") must stand.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    window.scrollTo({ top: open ? 0 : listScroll.current, behavior: 'instant' as ScrollBehavior });
  }, [open]);

  return [open, show, close];
}

function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={className ?? 'oa-link'} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight className="oa-link__icon" />
      <span className="opt-sr"> (opens in a new tab)</span>
    </a>
  );
}

/** A page section: a small label in the left margin (sticky on wide screens) and the content. */
function Section({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section className="oa-section" id={id} aria-labelledby={`${id}-label`}>
      <h2 className="oa-section__label" id={`${id}-label`}>
        {label}
      </h2>
      <div className="oa-section__body">{children}</div>
    </section>
  );
}

function ResumeLink() {
  return (
    <a className="oa-cta" href={bio.resume.href} download={bio.resume.fileName}>
      <ArrowDown className="oa-cta__icon" />
      <span>
        <span className="oa-cta__label">Download resume</span>
        <span className="oa-cta__meta">{bio.resume.meta}</span>
      </span>
    </a>
  );
}

function FeaturedProject({ project, index, onOpen }: { project: Project; index: number; onOpen: (p: Project) => void }) {
  const { name, descriptor } = splitTitle(project.title);
  const image = projectImage(project);
  return (
    <li className="oa-work oa-reveal">
      <div className="oa-work__meta">
        <span className="oa-work__no">{String(index + 1).padStart(2, '0')}</span>
        <span>{project.kind}</span>
        <span>{project.year}</span>
      </div>
      <div className="oa-work__main">
        <h3 className="oa-work__title">
          {/* The same name is given to the case study's heading, so the title travels there. */}
          <span style={{ viewTransitionName: `oa-title-${project.id}` }}>{name}</span>
          {descriptor && <span className="oa-work__descriptor">{descriptor}</span>}
        </h3>
        <p className="oa-work__tagline">{project.tagline}</p>
        {image && (
          <img
            className="oa-work__image"
            src={image.src}
            srcSet={image.srcSet}
            sizes="(min-width: 64rem) 42rem, 92vw"
            width={image.width}
            height={image.height}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            style={{ viewTransitionName: `oa-image-${project.id}` }}
          />
        )}
        {project.highlights && (
          <ul className="oa-work__highlights">
            {project.highlights.map(h => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
        <div className="oa-work__actions">
          <button type="button" className="oa-more" data-project-open={project.id} onClick={() => onOpen(project)}>
            Read the case study
            <span className="opt-sr">: {name}</span>
            <ArrowRight className="oa-more__icon" />
          </button>
          {project.live && <ExternalLink href={project.live}>Live</ExternalLink>}
          {project.github && <ExternalLink href={project.github}>Source</ExternalLink>}
        </div>
      </div>
    </li>
  );
}

function IndexRow({ project }: { project: Project }) {
  const { name } = splitTitle(project.title);
  return (
    <li className="oa-index__row">
      <div className="oa-index__head">
        <h4 className="oa-index__name">{name}</h4>
        <span className="oa-index__kind">
          {project.kind}
          {project.status === 'in-development' ? ', in development' : ''}
        </span>
      </div>
      <p className="oa-index__tagline">{project.tagline}</p>
      <div className="oa-index__links">
        {project.live && <ExternalLink href={project.live}>Live<span className="opt-sr">: {name}</span></ExternalLink>}
        {project.github && <ExternalLink href={project.github}>Source<span className="opt-sr">: {name}</span></ExternalLink>}
      </div>
    </li>
  );
}

function CaseStudy({ project, onClose, onOpen }: { project: Project; onClose: () => void; onOpen: (p: Project) => void }) {
  const { name, descriptor } = splitTitle(project.title);
  const image = projectImage(project);
  const story = storyParagraphs(project);
  const heading = useRef<HTMLHeadingElement>(null);
  const next = mainProjects[(mainProjects.indexOf(project) + 1) % mainProjects.length];

  // The view was swapped under the reader: move focus to the new heading so a screen reader
  // announces it and Tab continues from the top of the article.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [project]);

  return (
    <article className="oa-case" aria-labelledby="oa-case-title">
      <button type="button" className="oa-back" onClick={onClose}>
        <ArrowRight className="oa-back__icon" />
        All work
      </button>
      <p className="oa-case__meta">
        {project.kind} / {project.year}
      </p>
      <h1 className="oa-case__title" id="oa-case-title" ref={heading} tabIndex={-1}>
        <span style={{ viewTransitionName: `oa-title-${project.id}` }}>{name}</span>
        {descriptor && <span className="oa-case__descriptor">{descriptor}</span>}
      </h1>
      <p className="oa-case__lead">{story.lead}</p>
      {image && (
        <img
          className="oa-case__image"
          src={image.src}
          srcSet={image.srcSet}
          sizes="(min-width: 64rem) 56rem, 92vw"
          width={image.width}
          height={image.height}
          alt={image.alt}
          style={{ viewTransitionName: `oa-image-${project.id}` }}
        />
      )}
      <div className="oa-case__grid">
        <div className="oa-case__story">
          {story.body.map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <aside className="oa-case__aside" aria-label="Project facts">
          {project.highlights && (
            <>
              <h2>In short</h2>
              <ul className="oa-case__list">
                {project.highlights.map(h => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          )}
          <h2>Built with</h2>
          <p className="oa-case__tech">{project.tech.join(', ')}</p>
          <h2>Links</h2>
          <ul className="oa-case__links">
            {projectLinks(project).map(link => (
              <li key={link.href}>
                <ExternalLink href={link.href}>{link.label}</ExternalLink>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <button type="button" className="oa-next" onClick={() => onOpen(next)}>
        <span className="oa-next__label">Next</span>
        <span className="oa-next__name">{splitTitle(next.title).name}</span>
        <ArrowRight className="oa-next__icon" />
      </button>
    </article>
  );
}

function Home({ onOpen }: { onOpen: (p: Project) => void }) {
  const [copyState, copyEmail] = useCopyEmail();
  return (
    <>
      <header className="oa-hero">
        <p className="oa-hero__eyebrow">
          <span className="oa-dot" aria-hidden="true" />
          {bio.availability}
        </p>
        <h1 className="oa-hero__name">{bio.name}</h1>
        <p className="oa-hero__role">{bio.role}</p>
        <p className="oa-hero__pitch">{bio.tagline}</p>
        <div className="oa-hero__actions">
          <ResumeLink />
          <a className="oa-cta oa-cta--quiet" href={MAILTO}>
            <ArrowRight className="oa-cta__icon" />
            <span>
              <span className="oa-cta__label">Email me</span>
              <span className="oa-cta__meta">{EMAIL_SHOWN}</span>
            </span>
          </a>
        </div>
      </header>

      <Section id="work" label="Selected work">
        <ol className="oa-works">
          {mainProjects.map((project, i) => (
            <FeaturedProject key={project.id} project={project} index={i} onOpen={onOpen} />
          ))}
        </ol>
      </Section>

      <Section id="more" label="Also built">
        <ul className="oa-index oa-reveal">
          {sideProjects.map(project => (
            <IndexRow key={project.id} project={project} />
          ))}
        </ul>
        <h3 className="oa-subhead">Coursework</h3>
        <ul className="oa-index oa-reveal">
          {courseworkProjects.map(project => (
            <IndexRow key={project.id} project={project} />
          ))}
        </ul>
      </Section>

      <Section id="about" label="About">
        <div className="oa-prose oa-reveal">
          {aboutParagraphs.map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <dl className="oa-facts oa-reveal">
          <div>
            <dt>Education</dt>
            <dd>
              B.Sc., {DEGREE}, {bio.institution}
              <span className="oa-facts__sub">{EDUCATION_PERIOD}</span>
            </dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>
              {SERVICE_ORG}: {SERVICE_ROLE}
              <span className="oa-facts__sub">{SERVICE_PERIOD}</span>
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="skills" label="Skills">
        <dl className="oa-facts oa-facts--skills oa-reveal">
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
      </Section>

      <Section id="contact" label="Contact">
        <p className="oa-contact__blurb oa-reveal">{bio.contactBlurb}</p>
        <p className="oa-contact__email">
          <a href={MAILTO}>{EMAIL_SHOWN}</a>
          <button type="button" className="oa-copy" onClick={copyEmail}>
            {copyState === 'copied' ? 'Copied' : 'Copy'}
            <span className="opt-sr"> email address</span>
          </button>
          <span className="opt-sr" role="status">
            {copyState === 'copied' ? 'Email address copied' : copyState === 'failed' ? 'Copy failed. Use the email link instead.' : ''}
          </span>
        </p>
        <ul className="oa-contact__list">
          <li>
            <ResumeLink />
          </li>
          <li>
            <ExternalLink className="oa-link oa-link--row" href={bio.github}>
              <span className="oa-link__k">GitHub</span> {GITHUB_HANDLE}
            </ExternalLink>
          </li>
          <li>
            <ExternalLink className="oa-link oa-link--row" href={bio.linkedin}>
              <span className="oa-link__k">LinkedIn</span> {LINKEDIN_HANDLE}
            </ExternalLink>
          </li>
        </ul>
      </Section>
    </>
  );
}

/**
 * Option A, "Editorial": type-led and quiet. One serif (Newsreader, with its optical-size
 * axis) for everything that is read, one sans (Inter) for labels, one accent colour, and no
 * boxes: structure comes from hairlines, margins and the type scale.
 */
export default function OptionA() {
  const [theme, toggleTheme] = useTheme();
  const [open, show, close] = useCaseStudy();

  return (
    <OptionShell optionKey="a">
      <div className="oa-page">
        <nav className="oa-nav" aria-label="Page">
          {open ? (
            <button type="button" className="oa-nav__home" onClick={close}>
              {bio.name}
            </button>
          ) : (
            <ul className="oa-nav__links">
              <li><a href="#work">Work</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          )}
          <button
            type="button"
            className="oa-nav__theme"
            onClick={() => withViewTransition(toggleTheme)}
            aria-pressed={theme === 'night'}
          >
            <span className="opt-sr">Dark theme</span>
            <span aria-hidden="true">{theme === 'night' ? 'Light' : 'Dark'}</span>
          </button>
        </nav>
        <main id="main">
          {open ? <CaseStudy project={open} onClose={close} onOpen={show} /> : <Home onOpen={show} />}
        </main>
        <footer className="oa-footer">
          <span>{bio.name}</span>
          <span lang="he" dir="rtl">
            {bio.nameHe}
          </span>
        </footer>
      </div>
    </OptionShell>
  );
}
