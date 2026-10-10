import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatLauncher, { BUBBLE_DELAY_MS, BUBBLE_INTRO_MS, BUBBLE_LINGER_MS } from './ChatLauncher';
import { chatPersona } from '../../data/chatPersona';

const launcher = () => screen.getByRole('button', { name: chatPersona.launcherLabel });
const bubble = () => document.querySelector('.chat-bubble');
const [FIRST, SECOND, THIRD] = chatPersona.bubbles;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ChatLauncher', () => {
  it('renders nothing unless the chat is enabled (tests and previews run without it)', () => {
    const { container } = render(<ChatLauncher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the panel lazily and closes it back to the launcher', async () => {
    render(<ChatLauncher enabled />);
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('chat-panel')).toBeNull();

    await userEvent.click(launcher());
    expect(await screen.findByRole('dialog', { name: /pixel roy/i })).toBeInTheDocument();
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('button', { name: chatPersona.closeLabel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(launcher()).toHaveFocus();
  });

  it('stands still, and waves while pointed at or focused', () => {
    render(<ChatLauncher enabled />);
    expect(launcher()).toHaveAttribute('data-pose', 'idle');
    fireEvent.pointerEnter(launcher());
    expect(launcher()).toHaveAttribute('data-pose', 'wave');
    fireEvent.pointerLeave(launcher());
    expect(launcher()).toHaveAttribute('data-pose', 'idle');
    fireEvent.focus(launcher());
    expect(launcher()).toHaveAttribute('data-pose', 'wave');
  });

  it('says hello in a bubble when the page loads, waving, then clears the corner', () => {
    vi.useFakeTimers();
    render(<ChatLauncher enabled />);
    expect(bubble()).toBeNull();
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    expect(bubble()).toHaveTextContent(FIRST);
    expect(bubble()).toHaveAttribute('aria-hidden', 'true');
    expect(launcher()).toHaveAttribute('data-pose', 'wave');
    act(() => vi.advanceTimersByTime(BUBBLE_INTRO_MS));
    expect(launcher()).toHaveAttribute('data-pose', 'idle');
    expect(bubble()).toBeNull();
  });

  it('shows the next line every time Roy is pointed at, and lets it linger before hiding', () => {
    vi.useFakeTimers();
    render(<ChatLauncher enabled />);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS + BUBBLE_INTRO_MS));
    fireEvent.pointerEnter(launcher());
    expect(bubble()).toHaveTextContent(SECOND);
    fireEvent.pointerLeave(launcher());
    expect(bubble()).toHaveTextContent(SECOND);
    act(() => vi.advanceTimersByTime(BUBBLE_LINGER_MS));
    expect(bubble()).toBeNull();
    fireEvent.pointerEnter(launcher());
    expect(bubble()).toHaveTextContent(THIRD);
  });

  it('cycles back to the first line after the last one', () => {
    vi.useFakeTimers();
    render(<ChatLauncher enabled />);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    for (let i = 1; i < chatPersona.bubbles.length; i++) {
      fireEvent.pointerEnter(launcher());
      fireEvent.pointerLeave(launcher());
    }
    fireEvent.pointerEnter(launcher());
    expect(bubble()).toHaveTextContent(FIRST);
  });

  it('shows a line on keyboard focus too, and hides it while the chat is open', () => {
    vi.useFakeTimers();
    render(<ChatLauncher enabled />);
    fireEvent.focus(launcher());
    expect(bubble()).toHaveTextContent(FIRST);
    fireEvent.click(launcher());
    expect(bubble()).toBeNull();
    fireEvent.pointerEnter(launcher());
    expect(bubble()).toBeNull();
  });

  it('keeps every line within the pixel-font rules (Latin-1, at most 24 characters)', () => {
    for (const line of chatPersona.bubbles) {
      expect(line.length).toBeLessThanOrEqual(24);
      expect(line).toMatch(/^[\x20-\x7e\xa0-\xff]+$/);
    }
  });

  it('does not pop the bubble when focus comes back from closing the panel', async () => {
    render(<ChatLauncher enabled />);
    await userEvent.click(launcher());
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: chatPersona.closeLabel }));
    expect(launcher()).toHaveFocus();
    expect(bubble()).toBeNull();
  });
});
