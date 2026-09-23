import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Footer from './Footer';

afterEach(() => {
  vi.useRealTimers();
});

describe('Footer', () => {
  it('is the contentinfo landmark with the name and the current year', () => {
    vi.useFakeTimers({ now: new Date('2031-03-14T12:00:00Z'), toFake: ['Date'] });
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText('Roy Carmelli © 2031')).toBeInTheDocument();
  });

  it('links back to the top of the page with a readable name', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /back to top/i });
    expect(link).toHaveAttribute('href', '#hero');
    expect(link).toHaveTextContent('Continue?');
    expect(link).not.toHaveAttribute('target');
  });

  it('credits the stack', () => {
    render(<Footer />);
    expect(screen.getByText('Built from scratch: React · TypeScript · Canvas')).toBeInTheDocument();
  });
});
