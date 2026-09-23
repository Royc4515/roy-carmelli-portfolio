/**
 * Skill → project mapping for the Equipment zone (SPEC §4 Skills).
 *
 * Every "Used in" line is computed from `projects[i].tech`, never written by hand.
 * A skill matches a tech entry when both reduce to the same key:
 *   1. trim, lowercase, collapse whitespace;
 *   2. drop a trailing version number ("React 19" → "react", "Java 17" → "java",
 *      "Python 3.11" → "python"), but only a 1-2 digit major so course codes such as
 *      "Claude Code 101" keep their number;
 *   3. map known spellings onto one name (ALIASES).
 * Matching is whole-key equality, so "C" never matches "CSS", "C++" or "Chrome MV3",
 * and "Java" never matches "JavaScript".
 */
import type { Project } from '../types';

/** A trailing version: " 19", " 17", " v2", " 3.11", " 2.0". */
const VERSION_SUFFIX = /\s+v?\d{1,2}(?:\.\d+)*$/;

/** Alternative spellings → the key used in `skills` (both sides go through `techKey`). */
const ALIASES: Readonly<Record<string, string>> = {
  tailwind: 'tailwind css',
  tailwindcss: 'tailwind css',
  'telegram api': 'telegram bot api',
  'google oauth2': 'google oauth', // "Google OAuth 2.0" already loses its version
  claude: 'claude api',
  'anthropic api': 'claude api',
  node: 'node.js',
  nodejs: 'node.js',
  'node js': 'node.js',
  'react.js': 'react',
  reactjs: 'react',
};

/**
 * Skills that name a family of techs rather than one tech. "Design Patterns" is
 * evidenced by the concrete patterns a project lists ("Factory Pattern",
 * "Strategy Pattern", "Template Method").
 */
const FAMILIES: Readonly<Record<string, (tech: string) => boolean>> = {
  'design patterns': tech => tech.endsWith(' pattern') || tech === 'template method',
};

/** Canonical comparison key for a skill or tech name. */
export function techKey(name: string): string {
  const base = name.trim().toLowerCase().replace(/\s+/g, ' ').replace(VERSION_SUFFIX, '');
  return ALIASES[base] ?? base;
}

/** True when the tech entry `tech` is evidence for the skill `skill`. */
export function skillMatchesTech(skill: string, tech: string): boolean {
  const skillKey = techKey(skill);
  const key = techKey(tech);
  const family = FAMILIES[skillKey];
  return family ? family(key) : skillKey === key;
}

/** Projects (in data order) whose `tech` lists `skill`. */
export function projectsUsing(skill: string, list: readonly Project[]): Project[] {
  return list.filter(p => p.tech.some(tech => skillMatchesTech(skill, tech)));
}

/** "Aside - AI Sidebar" → "Aside"; titles without a " - " subtitle are unchanged. */
export function shortProjectTitle(title: string): string {
  return title.split(' - ')[0].trim();
}

/** The category whose unused items read "Studied in coursework". */
export const COURSEWORK_CATEGORY = 'CS Foundations';

/** The category whose unused items read "Certificate earned". */
export const CERTIFICATION_CATEGORY = 'Certifications';

/** Notes for items no project lists, by category; other categories show the category only. */
const UNUSED_NOTES: Readonly<Record<string, string>> = {
  [COURSEWORK_CATEGORY]: 'Studied in coursework',
  [CERTIFICATION_CATEGORY]: 'Certificate earned',
};

export interface SkillGroup {
  slot: string;
  category: string;
  items: readonly string[];
}

/** Everything the tooltip shows for one item. */
export interface SkillDetail {
  name: string;
  slot: string;
  category: string;
  /** Short titles of the projects that list this skill, in data order. */
  usedIn: string[];
  /**
   * Shown instead of "Used in" when no project lists the item: "Studied in coursework"
   * (CS Foundations) or "Certificate earned" (Certifications); otherwise null (category only).
   */
  note: string | null;
}

/** Tooltip content for `item` of `group`. Never invents usage: no match, no "Used in". */
export function skillDetail(item: string, group: SkillGroup, list: readonly Project[]): SkillDetail {
  const usedIn = projectsUsing(item, list).map(p => shortProjectTitle(p.title));
  return {
    name: item,
    slot: group.slot,
    category: group.category,
    usedIn,
    note: usedIn.length === 0 ? (UNUSED_NOTES[group.category] ?? null) : null,
  };
}

export interface EquipmentStat {
  label: string;
  value: number;
}

/** Character-sheet stats, counted from the data: projects, languages, certifications. */
export function equipmentStats(groups: readonly SkillGroup[], list: readonly Project[]): EquipmentStat[] {
  const count = (category: string) => groups.find(g => g.category === category)?.items.length ?? 0;
  return [
    { label: 'Projects', value: list.length },
    { label: 'Languages', value: count('Languages') },
    { label: 'Certifications', value: count('Certifications') },
  ];
}
