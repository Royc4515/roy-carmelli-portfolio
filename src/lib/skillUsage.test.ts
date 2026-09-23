import { describe, it, expect } from 'vitest';
import { projects } from '../data/projects';
import { skills } from '../data/bio';
import type { Project } from '../types';
import {
  equipmentStats,
  projectsUsing,
  shortProjectTitle,
  skillDetail,
  skillMatchesTech,
  techKey,
} from './skillUsage';

const ids = (skill: string) => projectsUsing(skill, projects).map(p => p.id);
const group = (category: string) => skills.find(g => g.category === category)!;

function project(id: string, tech: string[]): Project {
  return { id, title: id, tagline: '', description: '', kind: 'test', tech, tier: 'side', year: 2026 } as Project;
}

describe('techKey', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(techKey('  Tailwind   CSS ')).toBe('tailwind css');
  });

  it('strips trailing version numbers', () => {
    expect(techKey('React 19')).toBe('react');
    expect(techKey('Java 17')).toBe('java');
    expect(techKey('Python 3.11')).toBe('python');
    expect(techKey('Vite v6')).toBe('vite');
    expect(techKey('Google OAuth 2.0')).toBe('google oauth');
  });

  it('keeps numbers that are not a trailing version', () => {
    expect(techKey('x86 Assembly')).toBe('x86 assembly');
    expect(techKey('Chrome MV3')).toBe('chrome mv3');
    expect(techKey('Claude Code 101')).toBe('claude code 101');
    expect(techKey('Claude 101')).toBe('claude 101');
  });

  it('maps aliases onto one name', () => {
    expect(techKey('Tailwind')).toBe(techKey('Tailwind CSS'));
    expect(techKey('Telegram API')).toBe(techKey('Telegram Bot API'));
    expect(techKey('Google OAuth')).toBe(techKey('Google OAuth 2.0'));
    expect(techKey('Anthropic API')).toBe(techKey('Claude API'));
    expect(techKey('NodeJS')).toBe(techKey('Node.js'));
    expect(techKey('Node')).toBe(techKey('Node.js'));
  });
});

describe('skillMatchesTech', () => {
  it('matches whole names only: no substring false positives', () => {
    expect(skillMatchesTech('C', 'CSS')).toBe(false);
    expect(skillMatchesTech('C', 'C++')).toBe(false);
    expect(skillMatchesTech('C', 'Chrome MV3')).toBe(false);
    expect(skillMatchesTech('C', 'Claude API')).toBe(false);
    expect(skillMatchesTech('Java 17', 'JavaScript')).toBe(false);
    expect(skillMatchesTech('Git', 'GitHub Pages')).toBe(false);
    expect(skillMatchesTech('SQL', 'SQLite')).toBe(false);
    expect(skillMatchesTech('React', 'React Native')).toBe(false);
    expect(skillMatchesTech('Claude 101', 'Claude API')).toBe(false);
  });

  it('matches across versions and aliases', () => {
    expect(skillMatchesTech('React', 'React 19')).toBe(true);
    expect(skillMatchesTech('Java 17', 'Java')).toBe(true);
    expect(skillMatchesTech('Tailwind CSS', 'Tailwind')).toBe(true);
    expect(skillMatchesTech('Telegram Bot API', 'Telegram API')).toBe(true);
  });

  it('treats Design Patterns as the family of named patterns', () => {
    expect(skillMatchesTech('Design Patterns', 'Factory Pattern')).toBe(true);
    expect(skillMatchesTech('Design Patterns', 'Strategy Pattern')).toBe(true);
    expect(skillMatchesTech('Design Patterns', 'Template Method')).toBe(true);
    expect(skillMatchesTech('Design Patterns', 'OOP')).toBe(false);
    expect(skillMatchesTech('Design Patterns', 'Patterns of Life')).toBe(false);
  });
});

describe('projectsUsing (real data)', () => {
  it('finds every project for a skill, in data order', () => {
    expect(ids('Python')).toEqual([
      'sommelier-bot',
      'clr',
      'signal-processing',
      'cognitive-correlation',
    ]);
    expect(ids('TypeScript')).toEqual(['clr', 'portfolio']);
    expect(ids('JavaScript')).toEqual(['ai-sidebar', 'white-matter-game']);
  });

  it('normalizes versions: React 19 and Java 17', () => {
    expect(ids('React')).toEqual(['career-predictor', 'portfolio']);
    expect(ids('Java 17')).toEqual(['arkanoid-game']);
  });

  it('uses the alias map', () => {
    expect(ids('Tailwind CSS')).toEqual(['career-predictor', 'portfolio']);
    expect(ids('Telegram Bot API')).toEqual(['sommelier-bot', 'clr']);
    expect(ids('Google OAuth')).toEqual(['career-predictor']);
    expect(ids('Claude API')).toEqual(['ai-sidebar']);
    expect(ids('Node.js')).toEqual(['career-predictor']);
  });

  it('returns nothing for skills no project lists', () => {
    expect(ids('C')).toEqual([]);
    expect(ids('x86 Assembly')).toEqual([]);
    expect(ids('MCP')).toEqual([]);
    expect(ids('Algorithms')).toEqual([]);
    expect(ids('Git')).toEqual([]);
    expect(ids('Claude Code 101')).toEqual([]);
  });

  it('works on any project list', () => {
    const list = [project('a', ['C', 'CSS']), project('b', ['C++']), project('c', ['c'])];
    expect(projectsUsing('C', list).map(p => p.id)).toEqual(['a', 'c']);
    expect(projectsUsing('CSS', list).map(p => p.id)).toEqual(['a']);
  });

  it('every skill resolves against the data without throwing', () => {
    for (const g of skills) {
      for (const item of g.items) {
        expect(Array.isArray(projectsUsing(item, projects))).toBe(true);
      }
    }
  });
});

describe('shortProjectTitle', () => {
  it('drops the subtitle after " - "', () => {
    expect(shortProjectTitle('Aside - AI Sidebar')).toBe('Aside');
    expect(shortProjectTitle('Signal Processing - Synthetic Signals')).toBe('Signal Processing');
    expect(shortProjectTitle('This Portfolio')).toBe('This Portfolio');
  });
});

describe('skillDetail', () => {
  it('lists short project titles for used items', () => {
    const d = skillDetail('TypeScript', group('Languages'), projects);
    expect(d).toEqual({
      name: 'TypeScript',
      slot: 'Weapons',
      category: 'Languages',
      usedIn: ['Culinary Logic Repository', 'This Portfolio'],
      note: null,
    });
    expect(skillDetail('Design Patterns', group('CS Foundations'), projects).usedIn).toEqual([
      'Aside',
      'Arkanoid Game',
    ]);
  });

  it('says "Studied in coursework" only for unused CS Foundations items', () => {
    expect(skillDetail('Algorithms', group('CS Foundations'), projects).note).toBe(
      'Studied in coursework',
    );
    expect(skillDetail('OOP', group('CS Foundations'), projects).note).toBeNull();
    const mcp = skillDetail('MCP', group('AI & Agents'), projects);
    expect(mcp.usedIn).toEqual([]);
    expect(mcp.note).toBeNull();
    expect(skillDetail('Git', group('Tools'), projects).note).toBeNull();
  });
});

describe('equipmentStats', () => {
  it('counts projects, languages and certifications from the data', () => {
    const languages = group('Languages').items.length;
    const certifications = group('Certifications').items.length;
    expect(equipmentStats(skills, projects)).toEqual([
      { label: 'Projects', value: projects.length },
      { label: 'Languages', value: languages },
      { label: 'Certifications', value: certifications },
    ]);
  });
});
