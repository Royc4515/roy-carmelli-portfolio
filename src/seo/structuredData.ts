import { bio } from '../data/bio';
import { projects as allProjects } from '../data/projects';
import type { Project } from '../types/index';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_TITLE, SITE_URL, siteUrl } from './site';

/**
 * schema.org JSON-LD for the home page, built from the same data the page renders, so the
 * facts search engines and AI answers quote can never drift from what visitors read.
 * One @graph: WebSite, the ProfilePage it holds, the Person it is about, and one node per
 * project linked back to that Person.
 */

type JsonLd = Record<string, unknown>;

export const IDS = {
  website: `${SITE_URL}/#website`,
  page: `${SITE_URL}/#profile`,
  person: `${SITE_URL}/#person`,
  project: (id: string) => `${SITE_URL}/#project-${id}`,
} as const;

/** Tech entries that are programming languages, for SoftwareSourceCode.programmingLanguage. */
const LANGUAGES = new Set(['Java', 'Java 17', 'Python', 'C', 'C++', 'JavaScript', 'TypeScript', 'HTML', 'x86 Assembly']);

/**
 * The description's first sentence: every project's copy opens with one self-contained
 * sentence (what it is, for whom, on what stack) so it can be quoted on its own.
 * Splits on the first ". " so "Node.js" or "React 19 + TypeScript" never cut it short.
 */
export function leadSentence(text: string): string {
  const at = text.search(/\.\s/);
  return at === -1 ? text.trim() : text.slice(0, at + 1).trim();
}

/** In-page anchor of a project's title (QuestCard's heading id); the hash scroll handles it. */
export function projectAnchor(project: Pick<Project, 'id'>): string {
  return `${SITE_URL}/#quest-${project.id}-title`;
}

export function personNode(): JsonLd {
  return {
    '@type': 'Person',
    '@id': IDS.person,
    name: bio.name,
    alternateName: bio.nameHe,
    url: `${SITE_URL}/`,
    image: OG_IMAGE.url,
    jobTitle: bio.role,
    description:
      `Third-year Computer Science & Neuroscience student at ${bio.institution} who builds web apps, ` +
      'Chrome extensions and AI tools. Open to student and intern roles in full-stack, frontend and AI development in Israel.',
    email: `mailto:${bio.email}`,
    knowsAbout: [
      'Full-Stack Development',
      'Frontend Development',
      'Artificial Intelligence',
      'LLM APIs',
      'React',
      'TypeScript',
      'Node.js',
      'JavaScript',
      'Python',
      'Java',
      'Chrome Extensions',
      'Neuroscience Data Analysis',
    ],
    knowsLanguage: ['English', 'Hebrew'],
    affiliation: { '@type': 'CollegeOrUniversity', name: bio.institution },
    address: { '@type': 'PostalAddress', addressCountry: 'IL' },
    sameAs: [bio.linkedin, bio.github],
  };
}

export function projectNode(project: Project): JsonLd {
  const languages = project.tech.filter(t => LANGUAGES.has(t));
  const person = { '@id': IDS.person };
  return {
    // A public repo is source code anyone can inspect; a private one is only described here.
    '@type': project.github ? 'SoftwareSourceCode' : 'CreativeWork',
    '@id': IDS.project(project.id),
    name: project.title,
    description: leadSentence(project.description),
    abstract: project.tagline,
    genre: project.kind,
    url: projectAnchor(project),
    ...(project.github && { codeRepository: project.github }),
    ...(project.github && languages.length > 0 && { programmingLanguage: languages }),
    keywords: project.tech.join(', '),
    dateCreated: String(project.year),
    ...(project.status === 'in-development' && { creativeWorkStatus: 'In development' }),
    // Team work names Roy as a contributor, not the sole creator.
    ...(project.teamSize && project.teamSize > 1 ? { contributor: person } : { creator: person }),
    ...(project.live && project.live !== `${SITE_URL}/` && { sameAs: project.live }),
    isPartOf: { '@id': IDS.page },
  };
}

export interface StructuredDataOptions {
  /** ISO date of the last content change (the build's commit date). */
  dateModified?: string;
  projects?: readonly Project[];
}

export function structuredData({ dateModified, projects = allProjects }: StructuredDataOptions = {}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': IDS.website,
        url: `${SITE_URL}/`,
        name: bio.name,
        alternateName: [bio.nameHe, `${bio.name} Portfolio`],
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
        publisher: { '@id': IDS.person },
      },
      {
        '@type': 'ProfilePage',
        '@id': IDS.page,
        url: `${SITE_URL}/`,
        name: SITE_TITLE,
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
        isPartOf: { '@id': IDS.website },
        mainEntity: { '@id': IDS.person },
        about: { '@id': IDS.person },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
        },
        ...(dateModified && { dateModified }),
        hasPart: projects.map(p => ({ '@id': IDS.project(p.id) })),
      },
      {
        ...personNode(),
        mainEntityOfPage: { '@id': IDS.page },
        subjectOf: { '@type': 'DigitalDocument', name: `${bio.name} CV`, url: siteUrl(bio.resume.href), encodingFormat: 'application/pdf' },
      },
      ...projects.map(projectNode),
    ],
  };
}

/**
 * Serialised for an inline <script type="application/ld+json">. `<` is escaped so no string in
 * the data can close the script element early.
 */
export function structuredDataScript(data: JsonLd): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
