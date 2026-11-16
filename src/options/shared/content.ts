import { bio, skills } from '../../data/bio';
import { projects } from '../../data/projects';
import { linkedin } from '../../data/linkedin';
import type { Project } from '../../types';

/**
 * Everything the options render, derived from src/data (the only content source). Nothing here
 * adds a claim: it only selects, splits and relabels what the data files already say.
 */

export { bio };

export const mainProjects = projects.filter(p => p.tier === 'main');
export const sideProjects = projects.filter(p => p.tier === 'side');
export const courseworkProjects = projects.filter(p => p.tier === 'research');

/** Repo rule: the degree is always written this way. */
export const DEGREE = 'Computer Science & Neuroscience';
/** Repo rule: the service is described this way, in a plain professional tone. */
export const SERVICE_ROLE = 'Battalion medic, operational support role';
export const SERVICE_ORG = linkedin.service.org;
export const SERVICE_PERIOD = linkedin.service.period;
export const EDUCATION_PERIOD = linkedin.education.period;

export const aboutParagraphs = bio.about.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

/** Skill groups without the game "slot" names; certifications are listed apart from skills. */
export const skillGroups = skills
  .filter(s => s.category !== 'Certifications')
  .map(({ category, items }) => ({ category, items }));
export const certifications = skills.find(s => s.category === 'Certifications')?.items ?? [];

/** Shown and copied in lowercase (the domain is case-insensitive, Gmail ignores case). */
export const EMAIL_SHOWN = bio.email.toLowerCase();
export const MAILTO = `mailto:${bio.email}`;
export const GITHUB_HANDLE = bio.github.replace(/^https?:\/\/(www\.)?/, '');
export const LINKEDIN_HANDLE = bio.linkedin.replace(/^https?:\/\/(www\.)?/, '');

/** "Aside - AI Sidebar" -> name "Aside", descriptor "AI Sidebar". */
export function splitTitle(title: string): { name: string; descriptor: string | null } {
  const at = title.indexOf(' - ');
  return at === -1
    ? { name: title, descriptor: null }
    : { name: title.slice(0, at), descriptor: title.slice(at + 3) };
}

export interface ProjectImage {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
}

/** Screenshots that exist in public/assets/projects (16:10). Other projects have none. */
const IMAGE_SLUGS: Record<string, string> = {
  'ai-sidebar': 'aside',
  'nechita-raka': 'nechita-raka',
  'wolt-clone': 'wolt-clone',
};

export function projectImage(project: Project): ProjectImage | null {
  const slug = IMAGE_SLUGS[project.id];
  if (!slug) return null;
  const base = `/assets/projects/${slug}`;
  return {
    src: `${base}-1280.webp`,
    srcSet: `${base}-640.webp 640w, ${base}-1280.webp 1280w`,
    width: 1280,
    height: 800,
    alt: `Screenshot of ${splitTitle(project.title).name}`,
  };
}

/**
 * A project's description is one long paragraph. Split it at sentence ends (a full stop
 * followed by a capital letter, so "Alt+A", ".txt" and "e.g." stay whole).
 */
export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-Z"'(])/).map(s => s.trim()).filter(Boolean);
}

/** The lead sentence ("<Name> is a ...") and the rest in readable paragraphs of `size` sentences. */
export function storyParagraphs(project: Project, size = 3): { lead: string; body: string[] } {
  const [lead = '', ...rest] = sentences(project.description);
  const body: string[] = [];
  for (let i = 0; i < rest.length; i += size) body.push(rest.slice(i, i + size).join(' '));
  return { lead, body };
}

export interface ProjectLink {
  label: string;
  href: string;
}

export function projectLinks(project: Project): ProjectLink[] {
  const links: ProjectLink[] = [];
  if (project.live) links.push({ label: 'Live site', href: project.live });
  if (project.github) links.push({ label: 'Source on GitHub', href: project.github });
  return links;
}

export type { Project };
