import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MobileBar } from './MobileBar';
import { bio } from '../shared/content';

const sections = [
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

describe('MobileBar (option F on phones)', () => {
  it('puts the resume first, as a download', () => {
    render(<MobileBar sections={sections} onPlay={() => {}} reducedMotion />);
    const resume = screen.getByRole('link', { name: /resume/i });
    expect(resume).toHaveAttribute('href', bio.resume.href);
    expect(resume).toHaveAttribute('download', bio.resume.fileName);
  });

  it('asks Pixel Roy when the chat is on, and offers email when it is off', () => {
    const onAsk = vi.fn();
    const { unmount } = render(<MobileBar sections={sections} onAsk={onAsk} onPlay={() => {}} reducedMotion />);
    fireEvent.click(screen.getByRole('button', { name: /ask roy/i }));
    expect(onAsk).toHaveBeenCalledTimes(1);
    unmount();
    render(<MobileBar sections={sections} onPlay={() => {}} reducedMotion />);
    expect(screen.queryByRole('button', { name: /ask roy/i })).toBeNull();
    expect(screen.getByRole('link', { name: /email/i })).toHaveAttribute('href', expect.stringMatching(/^mailto:/));
  });

  it('opens a menu with every section, the game, and pause only when given', () => {
    const onPlay = vi.fn();
    const toggle = vi.fn();
    render(<MobileBar sections={sections} onPlay={onPlay} pause={{ paused: false, toggle }} reducedMotion />);
    const menu = screen.getByRole('button', { name: /menu/i });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    const sheet = screen.getByRole('dialog', { hidden: true });
    for (const s of sections) expect(within(sheet).getByRole('link', { name: s.label, hidden: true })).toHaveAttribute('href', `#${s.id}`);
    fireEvent.click(within(sheet).getByRole('button', { name: /pause scene/i, hidden: true }));
    expect(toggle).toHaveBeenCalledTimes(1);
    fireEvent.click(within(sheet).getByRole('button', { name: /play roy runner/i, hidden: true }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(menu).toHaveAttribute('aria-expanded', 'false');
  });
});
