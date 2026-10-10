/**
 * Compiles what pixel Roy (the /api/chat agent) is allowed to know: the site's own data, the
 * allowlisted GitHub snapshot and the curated LinkedIn profile. Nothing else reaches the model.
 *
 * The server cannot import src/ (browser code, extensionless imports), so the result is written
 * to api/_lib/chat/knowledge.generated.ts by chatKnowledge.test.ts as a file snapshot. Editing
 * any data file therefore fails the tests until the snapshot is refreshed:
 *   npx vitest run src/lib/chatKnowledge.test.ts -u
 */
import { bio, skills } from '../data/bio';
import { linkedin } from '../data/linkedin';
import { projects } from '../data/projects';
import github from '../data/github.generated.json';
import type { Project } from '../types/index';

/** Mirrors `Knowledge` in api/_lib/chat/types.ts; the generated file is checked against it. */
export interface ChatKnowledge {
  core: string;
  chunks: { id: string; source: 'site' | 'github' | 'linkedin'; title: string; url: string | null; text: string; keywords: string[] }[];
  email: string;
  allowedUrlPrefixes: string[];
}

interface GithubRepo {
  name: string;
  url: string;
  description: string;
  language: string | null;
  topics: string[];
  homepage: string | null;
  lastPush: string;
  readme: string;
}

export const SITE_URL = 'https://roy-carmelli-portfolio.vercel.app';

/** Same wording as the rest of the site; no em dashes reach the model's examples. */
const plain = (text: string) => text.replace(/[–—]/g, '-').replace(/⁠/g, '').replace(/\s+/g, ' ').trim();

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9֐-׿+#]+/)
    .filter(w => w.length > 1);

function projectChunk(p: Project, repo: GithubRepo | undefined) {
  const lines = [
    `${p.title} (${p.kind}, ${p.year}${p.status === 'in-development' ? ', in development' : ''}).`,
    plain(p.description),
    p.highlights?.length ? `Highlights: ${p.highlights.map(plain).join('; ')}.` : '',
    `Tech: ${p.tech.join(', ')}.`,
    p.github ? `Code: ${p.github}` : 'Code: private repo, shared on request.',
    p.live ? `Live: ${p.live}` : '',
    // The repo's README is not used here: the card is the reviewed version of the same story.
    repo ? `GitHub repo ${repo.name}: ${[repo.language, `last push ${repo.lastPush}`].filter(Boolean).join(', ')}.` : '',
  ];
  return {
    id: `site:project:${p.id}`,
    source: 'site' as const,
    title: plain(p.title),
    url: p.live ?? p.github ?? `${SITE_URL}/#projects`,
    text: lines.filter(Boolean).join('\n'),
    keywords: [...new Set([p.id, ...words(p.title), ...words(p.kind), ...p.tech.flatMap(words), ...(repo ? [repo.name.toLowerCase(), ...words(repo.name.replace(/[-_]/g, ' '))] : [])])],
  };
}

/** A public repo with no site card: its description and README are all the chat knows. */
function repoChunk(r: GithubRepo) {
  const meta = [
    r.language ? `Language: ${r.language}.` : '',
    r.topics.length ? `Topics: ${r.topics.join(', ')}.` : '',
    `Last push: ${r.lastPush}.`,
    r.homepage ? `Homepage: ${r.homepage}` : '',
  ];
  return {
    id: `github:${r.name}`,
    source: 'github' as const,
    title: `GitHub: ${r.name}`,
    url: r.url,
    text: [`Repo ${r.name} (${r.url}).`, plain(r.description), r.readme ? `README excerpt: ${plain(r.readme)}` : '', ...meta]
      .filter(Boolean)
      .join('\n'),
    keywords: [...new Set([r.name.toLowerCase(), ...words(r.name.replace(/[-_]/g, ' ')), ...r.topics])],
  };
}

export function buildChatKnowledge(): ChatKnowledge {
  const repos = (github as { repos: GithubRepo[] }).repos;
  const repoByUrl = new Map(repos.map(r => [r.url.toLowerCase(), r]));
  const siteRepoUrls = new Set(projects.flatMap(p => (p.github ? [p.github.toLowerCase()] : [])));
  // A repo behind a site card is folded into that card; only the others get their own chunk.
  const otherRepos = repos.filter(r => !siteRepoUrls.has(r.url.toLowerCase()));

  const core = [
    `Name: ${bio.name} (Hebrew: ${bio.nameHe}).`,
    `Headline: ${bio.role}. ${plain(bio.title)}.`,
    `Studies: third-year B.Sc. student at ${linkedin.education.school}, dual major in Computer Science and Neuroscience, ${linkedin.education.period}.`,
    `Looking for: ${plain(bio.contactBlurb)}`,
    'Based in: central Israel.',
    `Military service: ${linkedin.service.role}. ${linkedin.service.period}.`,
    `Contact: email ${bio.email}; LinkedIn ${bio.linkedin}; GitHub ${bio.github}; phone number: on the site's Contact section (${SITE_URL}/#contact). CV: ${SITE_URL}${bio.resume.href} (${plain(bio.resume.meta)}).`,
    `Skills: ${skills.map(s => `${s.category}: ${s.items.join(', ')}`).join('. ')}.`,
    `LinkedIn top skills: ${linkedin.topSkills.join(', ')}. Certifications: ${linkedin.certifications.join(', ')}.`,
    `Projects on the site: ${projects.map(p => `${plain(p.title)} [${p.tier} quest, ${p.kind}] - ${plain(p.tagline)}`).join(' | ')}`,
    `Other public GitHub repos: ${otherRepos.map(r => `${r.name}${r.description ? ` - ${plain(r.description)}` : ''}`).join(' | ')}`,
  ].join('\n');

  const chunks: ChatKnowledge['chunks'] = [
    {
      id: 'site:about',
      source: 'site',
      title: 'About Roy',
      url: `${SITE_URL}/#about`,
      text: plain(bio.about),
      keywords: ['about', 'background', 'neuroscience', 'student', 'medic', 'idf', 'army', 'military', 'reserve', 'reservist', 'leadership'],
    },
    ...projects.map(p => projectChunk(p, p.github ? repoByUrl.get(p.github.toLowerCase()) : undefined)),
    ...otherRepos.map(repoChunk),
    {
      id: 'linkedin:profile',
      source: 'linkedin',
      title: 'LinkedIn profile',
      url: linkedin.url,
      text: [
        `Headline: ${linkedin.headline}.`,
        `Summary: ${linkedin.summary}`,
        `Education: ${linkedin.education.degree}, ${linkedin.education.school}, ${linkedin.education.period}.`,
        `Top skills: ${linkedin.topSkills.join(', ')}.`,
        `Certifications: ${linkedin.certifications.join(', ')}.`,
      ].join('\n'),
      keywords: ['linkedin', 'education', 'degree', 'graduate', 'graduation', 'certification', 'certifications', 'certificate', 'university', 'bar', 'ilan'],
    },
    {
      id: 'linkedin:service',
      source: 'linkedin',
      title: 'IDF service',
      url: linkedin.url,
      text: [
        `${linkedin.service.org}: ${linkedin.service.role}. ${linkedin.service.period}.`,
        `Title shown on LinkedIn (mention only if asked about his title): ${linkedin.service.linkedinTitle}.`,
        ...linkedin.service.points,
      ].join('\n'),
      keywords: ['idf', 'army', 'military', 'service', 'medic', 'medical', 'reserve', 'reservist', 'war', 'leadership', 'gaza', 'commander', 'team', 'crisis'],
    },
  ];

  const allowedUrlPrefixes = [
    SITE_URL,
    bio.github,
    'https://linkedin.com/in/roy-carmelli',
    'https://www.linkedin.com/in/roy-carmelli',
    ...projects.flatMap(p => [p.live]),
    ...repos.map(r => r.homepage),
  ].filter((u): u is string => Boolean(u));

  return {
    core,
    chunks,
    email: bio.email,
    allowedUrlPrefixes: [...new Set(allowedUrlPrefixes.map(u => u.replace(/\/+$/, '')))],
  };
}

/** The generated server module: data only, typed against the server's own `Knowledge`. */
export function renderKnowledgeModule(knowledge: ChatKnowledge): string {
  return [
    '// GENERATED by src/lib/chatKnowledge.test.ts from src/data. Do not edit by hand:',
    '// change the data, then run `npx vitest run src/lib/chatKnowledge.test.ts -u`.',
    "import type { Knowledge } from './types.js';",
    '',
    `export const KNOWLEDGE: Knowledge = ${JSON.stringify(knowledge, null, 2)};`,
    '',
  ].join('\n');
}
