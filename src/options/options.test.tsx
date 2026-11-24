import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AppProviders } from '../AppProviders';
import { bio, mainProjects, sideProjects, splitTitle, sentences, storyParagraphs, DEGREE } from './shared/content';
import { PRIVATE_REPO_NOTE } from '../data/projects';
import { readOptionRoute, OPTION_KEYS } from './route';
import { OPTIONS } from './registry';
import Chooser from './Chooser';
import OptionA from './a/OptionA';
import OptionB from './b/OptionB';
import OptionC from './c/OptionC';
import OptionD from './d/OptionD';
import OptionE from './e/OptionE';
import OptionF from './f/OptionF';

const components = { a: OptionA, b: OptionB, c: OptionC, d: OptionD, e: OptionE, f: OptionF } as const;

describe('option routing', () => {
  it('leaves the normal site alone', () => {
    expect(readOptionRoute('')).toBeNull();
    expect(readOptionRoute('?gallery')).toBeNull();
    expect(readOptionRoute('?utm_source=linkedin')).toBeNull();
  });

  it('opens the chooser and each option', () => {
    expect(readOptionRoute('?options')).toEqual({ kind: 'chooser' });
    for (const key of OPTION_KEYS) {
      expect(readOptionRoute(`?option=${key}`)).toEqual({ kind: 'option', key });
    }
    expect(readOptionRoute('?option=B')).toEqual({ kind: 'option', key: 'b' });
  });

  it('falls back to the chooser for an unknown or empty option', () => {
    expect(readOptionRoute('?option=z')).toEqual({ kind: 'chooser' });
    expect(readOptionRoute('?option=')).toEqual({ kind: 'chooser' });
  });

  it('describes every option on the chooser', () => {
    expect(OPTIONS.map(o => o.key)).toEqual([...OPTION_KEYS]);
    render(<Chooser />);
    for (const option of OPTIONS) {
      const link = screen.getByRole('link', { name: new RegExp(`Option ${option.key.toUpperCase()}`) });
      expect(link).toHaveAttribute('href', `/?option=${option.key}`);
    }
    expect(screen.getByRole('link', { name: /classic site/i })).toHaveAttribute('href', '/?classic');
  });
});

describe('shared content helpers', () => {
  it('splits a title into name and descriptor', () => {
    expect(splitTitle('Aside - AI Sidebar')).toEqual({ name: 'Aside', descriptor: 'AI Sidebar' });
    expect(splitTitle('Arkanoid')).toEqual({ name: 'Arkanoid', descriptor: null });
  });

  it('splits descriptions at sentence ends without losing text', () => {
    for (const project of mainProjects) {
      const parts = sentences(project.description);
      expect(parts.length).toBeGreaterThan(3);
      expect(parts.join(' ')).toBe(project.description);
      const story = storyParagraphs(project);
      expect([story.lead, ...story.body].join(' ')).toBe(project.description);
      // Repo rule: every description opens with "<Name> is a ...".
      expect(story.lead).toMatch(/ is a /);
    }
  });
});

describe.each(OPTION_KEYS)('option %s', key => {
  const Option = components[key];
  const renderOption = () =>
    render(
      <AppProviders>
        <Option />
      </AppProviders>,
    );

  it('shows name, role, pitch, CV download and a contact path', () => {
    renderOption();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(bio.name);
    expect(screen.getAllByText(new RegExp(bio.role.replace('&', '&'))).length).toBeGreaterThan(0);
    const cv = screen.getAllByRole('link', { name: /resume|cv/i });
    expect(cv.some(a => a.getAttribute('href') === bio.resume.href)).toBe(true);
    const mail = screen.getAllByRole('link').filter(a => a.getAttribute('href') === `mailto:${bio.email}`);
    expect(mail.length).toBeGreaterThan(0);
  });

  it('lists the three main projects with a way into their details', () => {
    renderOption();
    const main = screen.getByRole('main');
    for (const project of mainProjects) {
      const { name } = splitTitle(project.title);
      expect(within(main).getAllByText(new RegExp(name)).length).toBeGreaterThan(0);
      // Details are either on the page already or one control away.
      const opener = document.querySelector(`[data-project-open="${project.id}"]`);
      expect(opener, `details control for ${project.id}`).not.toBeNull();
    }
  });

  it('follows the wording rules', () => {
    const { container } = renderOption();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/combat medic/i);
    expect(text).toMatch(/battalion medic/i);
    expect(text).toContain(DEGREE);
    // No em dashes (or en dashes standing in for them) in any copy.
    expect(text).not.toMatch(/[—–]/);
  });

  it('has one main landmark, a skip link first, and alt text on every image', () => {
    const { container } = renderOption();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    const firstLink = container.querySelector('a');
    expect(firstLink).toHaveTextContent(/skip to content/i);
    const target = firstLink?.getAttribute('href')?.slice(1);
    expect(target && document.getElementById(target)).toBeTruthy();
    for (const img of container.querySelectorAll('img')) {
      expect(img.hasAttribute('alt')).toBe(true);
    }
    // External links that open a new tab must not leak the opener.
    for (const a of container.querySelectorAll('a[target="_blank"]')) {
      expect(a.getAttribute('rel') ?? '').toMatch(/noopener/);
    }
  });
});

describe('option F side projects', () => {
  it('says why a row has no link, and only then', () => {
    render(
      <AppProviders>
        <OptionF />
      </AppProviders>,
    );
    // The chat links projects without a site or repo here (chatKnowledge.projectAnchor).
    expect(document.getElementById('more')).not.toBeNull();
    const rows = [...document.querySelectorAll<HTMLElement>('#more .of-row')];
    for (const project of sideProjects) {
      const { name } = splitTitle(project.title);
      const row = rows.find(r => r.querySelector('.of-row__name')?.textContent === name);
      expect(row, project.id).toBeDefined();
      const linkless = !project.live && !project.github;
      expect(within(row!).queryByText(PRIVATE_REPO_NOTE) !== null, project.id).toBe(linkless);
    }
    expect(sideProjects.some(p => !p.live && !p.github)).toBe(true);
  });
});
