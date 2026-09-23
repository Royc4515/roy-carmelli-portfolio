import { render, screen, act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast, TOAST_DURATION_MS, TOAST_EXIT_MS, type ToastApi } from './Toast';

let api: ToastApi;

function Capture() {
  api = useToast();
  return <button type="button">Copy email</button>;
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <Capture />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps one empty polite live region mounted before any toast', () => {
    renderWithProvider();
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('puts the message (and a hidden icon) in the live region', () => {
    renderWithProvider();
    act(() => api.show('Email copied · progress saved', { icon: <svg data-testid="icon" /> }));
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Email copied · progress saved');
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('auto-dismisses after 2.4s plus the exit animation', () => {
    renderWithProvider();
    act(() => api.show('Loot acquired: Roy_Carmelli_CV.pdf'));

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByRole('status')).toHaveTextContent('Loot acquired');

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('Loot acquired: Roy_Carmelli_CV.pdf').parentElement).toHaveAttribute('data-leaving');

    act(() => vi.advanceTimersByTime(TOAST_EXIT_MS));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('replaces the current toast and restarts the timer', () => {
    renderWithProvider();
    act(() => api.show('First'));
    act(() => vi.advanceTimersByTime(2000));
    act(() => api.show('Second'));

    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Second');
    expect(region).not.toHaveTextContent('First');
    expect(region.children).toHaveLength(1);

    // The first toast's timers must not cut the second one short.
    act(() => vi.advanceTimersByTime(1000));
    expect(region).toHaveTextContent('Second');
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS + TOAST_EXIT_MS));
    expect(region).toBeEmptyDOMElement();
  });

  it('does not move focus', () => {
    renderWithProvider();
    const trigger = screen.getByRole('button', { name: 'Copy email' });
    trigger.focus();
    act(() => api.show('Email copied · progress saved'));
    expect(trigger).toHaveFocus();
  });

  it('is a harmless no-op outside a provider', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useToast());
    expect(() => result.current.show('Nobody listens')).not.toThrow();
    warn.mockRestore();
  });
});
