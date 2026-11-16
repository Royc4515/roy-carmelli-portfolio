import { useId, useState } from 'react';
import '@fontsource-variable/bricolage-grotesque/wght.css';
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
import { useCopyEmail } from '../shared/hooks';
import { ArrowDown, ArrowUpRight, Check, Copy, Download, Github, Linkedin, Mail, Moon, Sun } from '../shared/icons';
import { NeuralFieldCard } from './NeuralFieldCard';
import './c.css';

const NAV = [
  { href: '#work', label: 'Work' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
];

const two = (n: number) => String(n).padStart(2, '0');

function ExternalLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="opt-sr"> (opens in a new tab)</span>
    </a>
  );
}

/** One of the three main projects: a large block with the full story one control away. */
function Feature({ project, index }: { project: Project; index: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { name, descriptor } = splitTitle(project.title);
  const image = projectImage(project);
  const story = storyParagraphs(project);
  const highlights = project.highlights ?? [];

  return (
    <article
      className="oc-feature oc-reveal"
      data-flip={index % 2 === 1 ? '' : undefined}
      // Esc closes an open story from anywhere inside the card, like any disclosure panel.
      onKeyDown={event => {
        if (event.key === 'Escape' && open) setOpen(false);
      }}
    >
      <div className="oc-feature__visual">
        {image ? (
          <img
            className="oc-feature__shot"
            src={image.src}
            srcSet={image.srcSet}
            sizes="(min-width: 960px) 46vw, 92vw"
            width={image.width}
            height={image.height}
            alt={image.alt}
            decoding="async"
          />
        ) : (
          // No screenshot exists for this project: its own highlights, set large, are the visual.
          <ol className="oc-feature__type">
            {highlights.map((line, i) => (
              <li key={line}>
                <span aria-hidden="true">{two(i + 1)}</span>
                {line}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="oc-feature__text">
        <p className="oc-meta">
          <span aria-hidden="true">{two(index + 1)}</span>
          <span>
            {project.kind}, {project.year}
          </span>
        </p>
        <h3 className="oc-feature__title">
          {name}
          {descriptor && <span className="oc-feature__descriptor">{descriptor}</span>}
        </h3>
        <p className="oc-feature__tagline">{project.tagline}</p>
        {image && highlights.length > 0 && (
          <ul className="oc-feature__points">
            {highlights.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <div className="oc-feature__actions">
          <button
            type="button"
            className="oc-btn oc-btn--quiet"
            aria-expanded={open}
            aria-controls={panelId}
            data-project-open={project.id}
            onClick={() => setOpen(o => !o)}
          >
            {open ? 'Close the story' : 'Read the full story'}
            <span className="opt-sr"> of {name}</span>
            <ArrowDown className="oc-btn__chevron" data-open={open ? '' : undefined} />
          </button>
          {projectLinks(project).map(link => (
            <ExternalLink key={link.href} href={link.href} className="oc-link">
              {/* Short visible labels keep all three actions on one row; the full one is read out. */}
              <span aria-hidden="true">{link.href === project.live ? 'Live site' : 'GitHub'}</span>
              <span className="opt-sr">
                {link.label}, {name}
              </span>
              <ArrowUpRight />
            </ExternalLink>
          ))}
        </div>
      </div>

      {/* Height animates with the grid 0fr to 1fr technique: `interpolate-size` is Chrome-only. */}
      <div className="oc-story" id={panelId} data-open={open ? '' : undefined}>
        <div className="oc-story__clip">
          <div className="oc-story__inner">
            <p className="oc-story__lead">{story.lead}</p>
            <div className="oc-story__body">
              {story.body.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <ul className="oc-chips" aria-label={`Built with, ${name}`}>
              {project.tech.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}

function WorkRows({ title, items }: { title: string; items: Project[] }) {
  return (
    <section className="oc-rows oc-reveal" aria-label={title}>
      <h3 className="oc-rows__title">{title}</h3>
      <ul>
        {items.map(project => {
          const { name } = splitTitle(project.title);
          return (
            <li key={project.id} className="oc-row">
              <div className="oc-row__head">
                <h4 className="oc-row__name">{name}</h4>
                <p className="oc-row__kind">
                  {project.kind}
                  {project.status === 'in-development' ? ', in development' : ''}
                </p>
              </div>
              <p className="oc-row__tagline">{project.tagline}</p>
              <p className="oc-row__links">
                {project.live && (
                  <ExternalLink href={project.live} className="oc-link">
                    Live<span className="opt-sr"> site of {name}</span>
                    <ArrowUpRight />
                  </ExternalLink>
                )}
                {project.github && (
                  <ExternalLink href={project.github} className="oc-link">
                    Code<span className="opt-sr"> of {name} on GitHub</span>
                    <ArrowUpRight />
                  </ExternalLink>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function OptionC() {
  const [theme, toggleTheme] = useTheme();
  const [copyState, copyEmail] = useCopyEmail();
  const nextTheme = theme === 'day' ? 'dark' : 'light';

  return (
    <OptionShell optionKey="c">
      <div className="oc-progress" aria-hidden="true" />

      <header className="oc-header">
        <a className="oc-header__mark" href="#top" aria-label={`${bio.name}, back to top`}>
          <span aria-hidden="true">RC</span>
        </a>
        <nav aria-label="Sections">
          <ul className="oc-nav">
            {NAV.map(item => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" className="oc-icon-btn" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} theme`}>
          {theme === 'day' ? <Moon /> : <Sun />}
        </button>
      </header>

      <main id="main">
        <section className="oc-hero" id="top" aria-labelledby="oc-name">
          <div className="oc-hero__text">
            <p className="oc-hero__status">
              <span className="oc-hero__pulse" aria-hidden="true" />
              {bio.availability}
            </p>
            <h1 className="oc-hero__name" id="oc-name">
              {bio.name}
            </h1>
            <p className="oc-hero__role">{bio.role}</p>
            <p className="oc-hero__pitch">{bio.tagline}</p>
            <div className="oc-hero__actions">
              <a className="oc-btn oc-btn--primary" href={bio.resume.href} download={bio.resume.fileName}>
                <Download />
                Download resume
              </a>
              <a className="oc-btn" href={MAILTO}>
                <Mail />
                Email me
              </a>
            </div>
            <p className="oc-hero__meta">{bio.resume.meta}</p>
          </div>
          <NeuralFieldCard theme={theme} />
        </section>

        <section className="oc-section" id="work" aria-labelledby="oc-work">
          <header className="oc-section__head oc-reveal">
            <p className="oc-eyebrow">Selected work</p>
            <h2 className="oc-h2" id="oc-work">
              Three main projects
            </h2>
          </header>
          <div className="oc-features">
            {mainProjects.map((project, index) => (
              <Feature key={project.id} project={project} index={index} />
            ))}
          </div>
          <div className="oc-more">
            <WorkRows title="Side projects" items={sideProjects} />
            <WorkRows title="Coursework" items={courseworkProjects} />
          </div>
        </section>

        <section className="oc-section oc-about" id="about" aria-labelledby="oc-about">
          <header className="oc-section__head oc-reveal">
            <p className="oc-eyebrow">About</p>
            <h2 className="oc-h2" id="oc-about">
              {DEGREE}, {bio.institution}
            </h2>
          </header>
          <div className="oc-about__grid">
            <div className="oc-prose oc-reveal">
              {aboutParagraphs.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <dl className="oc-facts oc-reveal">
              <div>
                <dt>Education</dt>
                <dd>
                  B.Sc., {DEGREE}
                  <span>{bio.institution}</span>
                  <span>{EDUCATION_PERIOD}</span>
                </dd>
              </div>
              <div>
                <dt>Military service</dt>
                <dd>
                  {SERVICE_ROLE}
                  <span>{SERVICE_ORG}</span>
                  <span>{SERVICE_PERIOD}</span>
                </dd>
              </div>
              <div>
                <dt>Certifications</dt>
                <dd>
                  <ul className="oc-facts__list">
                    {certifications.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="oc-section" id="skills" aria-labelledby="oc-skills">
          <header className="oc-section__head oc-reveal">
            <p className="oc-eyebrow">Skills</p>
            <h2 className="oc-h2" id="oc-skills">
              What I work with
            </h2>
          </header>
          <dl className="oc-skills oc-reveal">
            {skillGroups.map(group => (
              <div key={group.category}>
                <dt>{group.category}</dt>
                <dd>{group.items.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="oc-section oc-contact" id="contact" aria-labelledby="oc-contact">
          <div className="oc-contact__card oc-reveal">
            <p className="oc-eyebrow">Contact</p>
            <h2 className="oc-h2" id="oc-contact">
              {bio.contactBlurb}
            </h2>
            <div className="oc-contact__mail">
              <a className="oc-contact__address" href={MAILTO}>
                {EMAIL_SHOWN}
              </a>
              <button type="button" className="oc-btn oc-btn--quiet" onClick={copyEmail}>
                {copyState === 'copied' ? <Check /> : <Copy />}
                {copyState === 'copied' ? 'Copied' : 'Copy address'}
              </button>
              <span className="opt-sr" role="status" aria-live="polite">
                {copyState === 'copied' && 'Email address copied.'}
                {copyState === 'failed' && 'Copy was blocked. Use the email link instead.'}
              </span>
            </div>
            {copyState === 'failed' && (
              <p className="oc-contact__note">Copy was blocked. Use the email link instead.</p>
            )}
            <ul className="oc-contact__links">
              <li>
                <a className="oc-btn oc-btn--primary" href={bio.resume.href} download={bio.resume.fileName}>
                  <Download />
                  Download resume
                </a>
              </li>
              <li>
                <ExternalLink className="oc-btn" href={bio.linkedin}>
                  <Linkedin />
                  <span>
                    LinkedIn<span className="opt-sr">: {LINKEDIN_HANDLE}</span>
                  </span>
                </ExternalLink>
              </li>
              <li>
                <ExternalLink className="oc-btn" href={bio.github}>
                  <Github />
                  <span>
                    GitHub<span className="opt-sr">: {GITHUB_HANDLE}</span>
                  </span>
                </ExternalLink>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="oc-footer">
        <p>
          {bio.name}
          <span lang="he" dir="rtl">
            {bio.nameHe}
          </span>
        </p>
        <p>
          {DEGREE}, {bio.institution}
        </p>
      </footer>
    </OptionShell>
  );
}
