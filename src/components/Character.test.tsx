import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Character from './Character';
import { pixelSprites } from '../theme/pixelSprites';

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

describe('Character', () => {
  it('renders the sheet at frame size x integer scale with an accessible name', () => {
    const { frameW, frameH, frames, src } = pixelSprites.wave;
    render(<Character pose="wave" scale={3} label="Roy waving hello" />);
    const el = screen.getByRole('img', { name: 'Roy waving hello' });
    expect(el.style.width).toBe(`${frameW * 3}px`);
    expect(el.style.height).toBe(`${frameH * 3}px`);
    expect(el.style.backgroundSize).toBe(`${frameW * frames * 3}px ${frameH * 3}px`);
    expect(el.style.backgroundImage).toContain(src);
    expect(el.style.getPropertyValue('--px-sheet-end')).toBe(`-${frameW * frames * 3}px`);
    expect(el.style.getPropertyValue('--px-frames')).toBe(String(frames));
    expect(el.style.getPropertyValue('--px-duration')).toBe(`${frames * pixelSprites.wave.frameMs}ms`);
    expect(el).toHaveClass('px-character', 'px-character--animated');
  });

  it('is aria-hidden when decorative', () => {
    const { container } = render(<Character pose="sit" decorative />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).not.toHaveAttribute('role');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('does not animate a single-frame pose', () => {
    render(<Character pose="idle" scale={2} label="Roy standing" />);
    expect(screen.getByRole('img', { name: 'Roy standing' })).not.toHaveClass('px-character--animated');
  });

  it('rounds and clamps a non-integer scale and warns in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Character pose="idle" scale={1.4} label="Roy" />);
    expect(screen.getByRole('img', { name: 'Roy' }).style.width).toBe(`${pixelSprites.idle.frameW}px`);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('got 1.4, using 1'));
  });

  it('mirrors with flip', () => {
    render(<Character pose="sit" flip label="Roy" />);
    expect(screen.getByRole('img', { name: 'Roy' }).style.transform).toBe('scaleX(-1)');
  });

  it('pauses while the tab is hidden', () => {
    render(<Character pose="wave" label="Roy" />);
    const el = screen.getByRole('img', { name: 'Roy' });
    expect(el).not.toHaveClass('px-character--paused');
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(el).toHaveClass('px-character--paused');
  });
});
