import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PixelPanel, { PixelPanel as NamedPixelPanel } from './PixelPanel';

describe('PixelPanel', () => {
  it('defaults to a flat wood div with a brass frame and md padding', () => {
    render(<PixelPanel data-testid="p">Hi</PixelPanel>);
    const panel = screen.getByTestId('p');
    expect(panel.tagName).toBe('DIV');
    expect(panel).toHaveClass('px-panel', 'px-panel--wood', 'px-frame', 'p-4', 'md:p-5');
    expect(panel).not.toHaveClass('px-frame-subtle', 'px-drop-sm', 'px-drop');
    expect(panel).not.toHaveAttribute('style');
  });

  it('exports the same component by name', () => {
    expect(NamedPixelPanel).toBe(PixelPanel);
  });

  it('renders each variant as its own surface class', () => {
    render(
      <>
        <PixelPanel variant="paper" data-testid="paper" />
        <PixelPanel variant="ghost" data-testid="ghost" />
        <PixelPanel frame="subtle" data-testid="subtle" />
      </>,
    );
    expect(screen.getByTestId('paper')).toHaveClass('px-panel--paper', 'px-frame');
    expect(screen.getByTestId('ghost')).toHaveClass('px-panel--ghost', 'px-frame');
    expect(screen.getByTestId('subtle')).toHaveClass('px-panel--wood', 'px-frame', 'px-frame-subtle');
  });

  it('draws no frame on inset unless asked', () => {
    render(
      <>
        <PixelPanel variant="inset" data-testid="inset" />
        <PixelPanel variant="inset" frame="accent" data-testid="framed" />
      </>,
    );
    expect(screen.getByTestId('inset')).not.toHaveClass('px-frame');
    expect(screen.getByTestId('framed')).toHaveClass('px-frame');
  });

  it('keeps the drop when the frame is off', () => {
    render(<PixelPanel frame="none" elevation={1} data-testid="p" />);
    expect(screen.getByTestId('p')).toHaveClass('px-panel--frameless', 'px-drop-sm');
    expect(screen.getByTestId('p')).not.toHaveClass('px-frame');
  });

  it('applies elevation, padding, element and pass-through props', () => {
    render(
      <PixelPanel as="article" elevation={2} padding="lg" aria-label="Quest" className="mt-8">
        Body
      </PixelPanel>,
    );
    const panel = screen.getByRole('article', { name: 'Quest' });
    expect(panel).toHaveClass('px-drop', 'p-5', 'md:p-7', 'mt-8');
  });

  it('renders a tab plate and makes room for it', () => {
    render(
      <PixelPanel tab="Main quest" padding="sm" data-testid="p">
        Body
      </PixelPanel>,
    );
    const panel = screen.getByTestId('p');
    expect(screen.getByText('Main quest')).toHaveClass('px-panel__tab');
    expect(panel).toHaveClass('pt-8');
    expect(panel).not.toHaveClass('p-4');
  });
});
