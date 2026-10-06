import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatLauncher, { BUBBLE_DELAY_MS, BUBBLE_SEEN_KEY } from './ChatLauncher';
import { chatPersona } from '../../data/chatPersona';

const launcher = () => screen.getByRole('button', { name: chatPersona.launcherLabel });
const bubble = () => screen.queryByText(chatPersona.bubble);

beforeEach(() => sessionStorage.clear());
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

  it('says hello in a bubble after a moment, waving, then stops waving', () => {
    vi.useFakeTimers();
    render(<ChatLauncher enabled />);
    expect(bubble()).toBeNull();
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    expect(bubble()).toBeInTheDocument();
    expect(bubble()).toHaveAttribute('aria-hidden', 'true');
    expect(launcher()).toHaveAttribute('data-pose', 'wave');
    act(() => vi.advanceTimersByTime(3000));
    expect(launcher()).toHaveAttribute('data-pose', 'idle');
    expect(bubble()).toBeInTheDocument();
  });

  it('drops the bubble once the chat is opened, for the rest of the session', () => {
    vi.useFakeTimers();
    const { unmount } = render(<ChatLauncher enabled />);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    fireEvent.click(launcher());
    expect(bubble()).toBeNull();
    expect(sessionStorage.getItem(BUBBLE_SEEN_KEY)).toBe('1');
    unmount();

    render(<ChatLauncher enabled />);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS * 2));
    expect(bubble()).toBeNull();
  });

  it('still works when session storage is blocked', () => {
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    render(<ChatLauncher enabled />);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    expect(bubble()).toBeInTheDocument();
    expect(() => fireEvent.click(launcher())).not.toThrow();
    expect(bubble()).toBeNull();
  });
});
