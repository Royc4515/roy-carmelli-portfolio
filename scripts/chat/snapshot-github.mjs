#!/usr/bin/env node
/**
 * Snapshots Roy's allowlisted public GitHub repos into src/data/github.generated.json, the
 * GitHub part of pixel Roy's knowledge. Run by hand, review the diff, then refresh the chat
 * knowledge with `npx vitest run src/lib/chatKnowledge.test.ts -u`.
 *
 *   node scripts/chat/snapshot-github.mjs
 *   node scripts/chat/snapshot-github.mjs --repos-json saved.json   # metadata from a saved
 *     /users/{owner}/repos response, for networks that block that endpoint
 *
 * A snapshot, not a live fetch: no GitHub rate limits at request time, no README text reaching
 * the model unreviewed, and every claim the chat can make is in a committed, diffable file.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const OUT = resolve(root, 'src/data/github.generated.json');
/** Enough to say what a repo is; the site's own project cards carry the detail. */
const README_CHARS = 600;

const allow = JSON.parse(await readFile(resolve(here, 'github-allowlist.json'), 'utf8'));

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'roy-portfolio-snapshot' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

async function loadRepos() {
  const i = process.argv.indexOf('--repos-json');
  if (i !== -1) return JSON.parse(await readFile(resolve(process.argv[i + 1]), 'utf8'));
  return getJson(`https://api.github.com/users/${allow.owner}/repos?per_page=100&type=owner`);
}

/** The README as plain prose: no badges, images, HTML, code blocks or markdown syntax. */
export function readmeExcerpt(markdown, limit = README_CHARS) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+\.|>)\s+/gm, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, ' ')
    // Horizontal rules and table separators ("---", ":---:").
    .replace(/:?-{3,}:?/g, ' ')
    .replace(/[*_`~|]/g, '')
    // Emoji and pictographs: decoration, and noise in a prompt.
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), limit - 40))}...`;
}

async function readme(repo) {
  // Some READMEs are boilerplate (e.g. an auto-sync tool's own docs) that would put words in Roy's mouth.
  if ((allow.noReadme ?? []).includes(repo.name)) return '';
  const res = await fetch(`https://raw.githubusercontent.com/${allow.owner}/${repo.name}/${repo.default_branch}/README.md`);
  return res.ok ? readmeExcerpt(await res.text()) : '';
}

const all = await loadRepos();
const byName = new Map(all.map(r => [r.name, r]));
const missing = allow.repos.filter(name => !byName.get(name) || byName.get(name).private);
if (missing.length) console.warn(`Not public or not found, skipped: ${missing.join(', ')}`);

const repos = [];
for (const name of allow.repos) {
  const r = byName.get(name);
  if (!r || r.private) continue;
  repos.push({
    name: r.name,
    url: r.html_url,
    description: (r.description ?? '').replace(/[\u2013\u2014]/g, '-').trim(),
    language: r.language ?? null,
    topics: r.topics ?? [],
    homepage: r.homepage || null,
    lastPush: (r.pushed_at ?? '').slice(0, 10),
    readme: await readme(r),
  });
}

await writeFile(OUT, `${JSON.stringify({ owner: allow.owner, repos }, null, 2)}\n`);
console.log(`Wrote ${repos.length} repos to ${OUT}`);
