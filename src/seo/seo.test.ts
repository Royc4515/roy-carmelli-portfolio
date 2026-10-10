import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { bio } from '../data/bio';
import { projects } from '../data/projects';
import { splitTitle } from '../components/QuestCard';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from './site';
import { IDS, leadSentence, projectAnchor, structuredData, structuredDataScript } from './structuredData';
import { SITEMAP_PATHS, llmsTxt, sitemapXml } from './crawlerFiles';

const read = (path: string) => readFileSync(resolve(__dirname, '../..', path), 'utf8');

/** index.html, parsed, so the assertions see attribute values with entities decoded. */
function head(): Document {
  return new DOMParser().parseFromString(read('index.html'), 'text/html');
}

const meta = (doc: Document, selector: string) => doc.querySelector(selector)?.getAttribute('content');

type Node = Record<string, unknown>;
const graph = () => structuredData({ dateModified: '2026-10-09' })['@graph'] as Node[];
const byType = (type: string) => graph().filter(n => n['@type'] === type);

describe('index.html head', () => {
  it('matches src/seo/site.ts (title, description, canonical)', () => {
    const doc = head();
    expect(doc.title).toBe(SITE_TITLE);
    expect(meta(doc, 'meta[name="description"]')).toBe(SITE_DESCRIPTION);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/`);
    expect(doc.documentElement.lang).toBe('en');
  });

  it('has matching Open Graph and Twitter cards with the share image', () => {
    const doc = head();
    expect(meta(doc, 'meta[property="og:title"]')).toBe(SITE_TITLE);
    expect(meta(doc, 'meta[property="og:description"]')).toBe(SITE_DESCRIPTION);
    expect(meta(doc, 'meta[property="og:url"]')).toBe(`${SITE_URL}/`);
    expect(meta(doc, 'meta[property="og:image"]')).toBe(OG_IMAGE.url);
    expect(meta(doc, 'meta[property="og:image:alt"]')).toBe(OG_IMAGE.alt);
    expect(meta(doc, 'meta[property="og:image:width"]')).toBe(String(OG_IMAGE.width));
    expect(meta(doc, 'meta[property="og:image:height"]')).toBe(String(OG_IMAGE.height));
    expect(meta(doc, 'meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(meta(doc, 'meta[name="twitter:title"]')).toBe(SITE_TITLE);
    expect(meta(doc, 'meta[name="twitter:description"]')).toBe(SITE_DESCRIPTION);
    expect(meta(doc, 'meta[name="twitter:image"]')).toBe(OG_IMAGE.url);
  });

  it('carries no hand-written JSON-LD (the build generates it from src/data)', () => {
    expect(head().querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('uses the agreed degree wording and keeps the description short enough to show whole', () => {
    expect(SITE_DESCRIPTION).toContain('Computer Science & Neuroscience');
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(170);
    expect(SITE_TITLE).toContain(bio.nameHe);
  });
});

describe('structured data', () => {
  it('is one graph: WebSite, ProfilePage, Person and a node per project', () => {
    expect(byType('WebSite')).toHaveLength(1);
    expect(byType('ProfilePage')).toHaveLength(1);
    expect(byType('Person')).toHaveLength(1);
    const projectNodes = graph().filter(n => n['@type'] === 'SoftwareSourceCode' || n['@type'] === 'CreativeWork');
    expect(projectNodes.map(n => n['@id'])).toEqual(projects.map(p => IDS.project(p.id)));
  });

  it('describes the Person with both names and the LinkedIn and GitHub profiles', () => {
    const [person] = byType('Person');
    expect(person.name).toBe('Roy Carmelli');
    expect(person.alternateName).toBe('רועי כרמלי');
    expect(person.sameAs).toEqual(expect.arrayContaining(['https://linkedin.com/in/roy-carmelli', 'https://github.com/Royc4515']));
    expect(person.description).toContain('Computer Science & Neuroscience');
  });

  it('points every reference at a node in the graph', () => {
    const ids = new Set(graph().map(n => n['@id']));
    const refs = JSON.stringify(graph()).match(/"@id":"[^"]+"/g)!.map(r => r.slice('"@id":"'.length, -1));
    for (const ref of refs) expect(ids, ref).toContain(ref);
  });

  it('gives a public repo a SoftwareSourceCode node and a private one a CreativeWork', () => {
    for (const p of projects) {
      const node = graph().find(n => n['@id'] === IDS.project(p.id))!;
      expect(node['@type']).toBe(p.github ? 'SoftwareSourceCode' : 'CreativeWork');
      if (p.github) expect(node.codeRepository).toBe(p.github);
      expect(node.description).toBe(leadSentence(p.description));
    }
  });

  it('names Roy a contributor on team projects and the creator on solo ones', () => {
    for (const p of projects) {
      const node = graph().find(n => n['@id'] === IDS.project(p.id))!;
      if (p.teamSize) expect(node).toMatchObject({ contributor: { '@id': IDS.person } });
      else expect(node).toMatchObject({ creator: { '@id': IDS.person } });
    }
  });

  it('never leaks the phone number or the city, and has no em or en dashes', () => {
    const json = JSON.stringify(structuredData());
    expect(json.replace(/\D/g, '')).not.toContain(bio.phone.replace(/\D/g, '').slice(-9));
    expect(json).not.toMatch(/givat\s*shmuel|גבעת שמואל/i);
    expect(json).not.toMatch(/[–—]/);
    expect(json).not.toMatch(/combat medic/i);
  });

  it('cannot close its script element early', () => {
    const script = structuredDataScript({ name: '</script><script>alert(1)</script>' });
    expect(script.match(/<\/script>/g)).toHaveLength(1);
    expect(JSON.parse(script.replace(/^<script[^>]*>|<\/script>$/g, ''))).toEqual({
      name: '</script><script>alert(1)</script>',
    });
  });
});

describe('project copy', () => {
  it('opens every description with one quotable sentence that names the project', () => {
    for (const p of projects) {
      const lead = leadSentence(p.description);
      expect(lead, p.id).toMatch(/\.$/);
      expect(lead.length, p.id).toBeLessThanOrEqual(260);
      expect(lead.toLowerCase(), p.id).toContain(splitTitle(p.title).name.toLowerCase());
      expect(lead, p.id).toMatch(/ is (a|an|this) /);
    }
  });

  it('keeps teamSize in step with the "team of N" wording', () => {
    for (const p of projects) {
      const says = p.description.match(/team[ -]of[ -](\d+)/i);
      expect(says ? Number(says[1]) : undefined, p.id).toBe(p.teamSize);
    }
  });
});

describe('crawler files', () => {
  it('lists the page and the CV in the sitemap, with lastmod when known', () => {
    const xml = sitemapXml({ '/': '2026-10-09' });
    for (const path of SITEMAP_PATHS) expect(xml).toContain(`<loc>${SITE_URL}${path}</loc>`);
    expect(xml).toContain('<lastmod>2026-10-09</lastmod>');
    expect(xml.match(/<lastmod>/g)).toHaveLength(1);
    expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull();
  });

  it('writes an llms.txt with every project, the profiles and no private details', () => {
    const txt = llmsTxt();
    expect(txt.startsWith(`# ${bio.name} (${bio.nameHe})`)).toBe(true);
    for (const p of projects) expect(txt).toContain(`[${p.title}](${projectAnchor(p)})`);
    expect(txt).toContain(bio.linkedin);
    expect(txt).toContain(bio.github);
    expect(txt.replace(/\D/g, '')).not.toContain(bio.phone.replace(/\D/g, '').slice(-9));
    expect(txt).not.toMatch(/[–—]/);
  });

  it('robots.txt welcomes search engines and AI crawlers and points at the sitemap', () => {
    const robots = read('public/robots.txt');
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bingbot', 'Googlebot', 'OAI-SearchBot']) {
      expect(robots).toMatch(new RegExp(`^User-agent: ${bot}$`, 'm'));
    }
    expect(robots).not.toMatch(/^Disallow: \/\s*$/m);
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});

describe('prerender entry', () => {
  const realMatchMedia = window.matchMedia;
  beforeAll(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    window.matchMedia = realMatchMedia;
  });

  it('renders the whole page to static HTML: one h1, every section and project', async () => {
    const { render } = await import('../entry-server');
    const html = render();
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    for (const id of ['hero', 'projects', 'about', 'skills', 'resume', 'contact']) expect(html).toContain(`id="${id}"`);
    for (const p of projects) {
      expect(html).toContain(`id="quest-${p.id}-title"`);
      expect(html).toContain(splitTitle(p.title).name.replace(/&/g, '&amp;'));
    }
  });
});
