import { bio } from '../data/bio';
import { projects as allProjects } from '../data/projects';
import type { Project } from '../types/index';
import { SITE_DESCRIPTION, SITE_URL, siteUrl } from './site';
import { leadSentence, projectAnchor } from './structuredData';

/** Pages worth a search result: the one-page site and the CV, which ranks on its own for the name. */
export const SITEMAP_PATHS = ['/', bio.resume.href] as const;

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * sitemap.xml, written into dist/ by every build. `lastmod` per path is the date of the last
 * commit that touched it: Google only trusts lastmod that changes when content does, so a
 * per-build timestamp would teach it to ignore the field.
 */
export function sitemapXml(lastmod: Readonly<Record<string, string>> = {}): string {
  const urls = SITEMAP_PATHS.map(path => {
    const mod = lastmod[path] ? `\n    <lastmod>${escapeXml(lastmod[path])}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeXml(siteUrl(path))}</loc>${mod}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

const TIER_HEADINGS: Record<Project['tier'], string> = {
  main: 'Main projects',
  side: 'Side projects',
  research: 'Coursework and data projects',
};

/**
 * /llms.txt (llmstxt.org): a plain Markdown digest for AI assistants that read a site before
 * answering about it. Same facts as the page, no contact details beyond the public email.
 */
export function llmsTxt(projects: readonly Project[] = allProjects): string {
  const lines = [
    `# ${bio.name} (${bio.nameHe})`,
    '',
    `> ${bio.name}: ${bio.role}. ${SITE_DESCRIPTION}`,
    '',
    ...bio.about.split(/\n\s*\n/).map(p => p.trim()).flatMap(p => [p, '']),
    '## Links',
    '',
    `- [Portfolio](${SITE_URL}/): projects, skills, CV and contact`,
    `- [CV (PDF)](${siteUrl(bio.resume.href)}): one page`,
    `- [GitHub](${bio.github})`,
    `- [LinkedIn](${bio.linkedin})`,
    `- Email: ${bio.email}`,
    '',
  ];
  for (const tier of ['main', 'side', 'research'] as const) {
    const inTier = projects.filter(p => p.tier === tier);
    if (inTier.length === 0) continue;
    lines.push(`## ${TIER_HEADINGS[tier]}`, '');
    for (const p of inTier) {
      const links = [p.github && `[code](${p.github})`, p.live && `[live](${p.live})`].filter(Boolean).join(', ');
      lines.push(`- [${p.title}](${projectAnchor(p)}): ${leadSentence(p.description)}${links ? ` (${links})` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
