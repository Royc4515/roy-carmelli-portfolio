import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPanel from './ChatPanel';
import type { ChatState } from '../../hooks/useChat';
import { chatPersona } from '../../data/chatPersona';

function chat(over: Partial<ChatState> = {}): ChatState {
  return { messages: [], sending: false, error: null, send: vi.fn(), retry: vi.fn(), ...over };
}

describe('ChatPanel', () => {
  it('is a labelled dialog that focuses the question box when open', () => {
    render(<ChatPanel open onClose={vi.fn()} chat={chat()} />);
    expect(screen.getByRole('dialog', { name: /pixel roy/i })).toBeVisible();
    expect(screen.getByRole('textbox', { name: chatPersona.inputLabel })).toHaveFocus();
    expect(screen.getByText(chatPersona.greeting)).toBeInTheDocument();
  });

  it('stays in the DOM but hidden when closed, so the conversation survives', () => {
    render(<ChatPanel open={false} onClose={vi.fn()} chat={chat()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.getElementById('chat-panel')).toHaveAttribute('hidden');
  });

  it('closes on Escape without letting keys reach the page', () => {
    const onClose = vi.fn();
    const onWindowKey = vi.fn();
    window.addEventListener('keydown', onWindowKey);
    render(<ChatPanel open onClose={onClose} chat={chat()} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: ' ' });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onWindowKey).not.toHaveBeenCalled();
    window.removeEventListener('keydown', onWindowKey);
  });

  it('sends a suggested question, and a typed one on Enter', async () => {
    const state = chat();
    render(<ChatPanel open onClose={vi.fn()} chat={state} />);
    await userEvent.click(screen.getByRole('button', { name: chatPersona.suggestions[0] }));
    expect(state.send).toHaveBeenCalledWith(chatPersona.suggestions[0]);
    // The suggestion buttons go away once the chat starts: focus must stay inside the panel.
    expect(screen.getByRole('textbox')).toHaveFocus();
    await userEvent.type(screen.getByRole('textbox'), 'Where do you study?{Enter}');
    expect(state.send).toHaveBeenLastCalledWith('Where do you study?');
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('caps the question at 500 characters and disables Send while waiting', () => {
    render(<ChatPanel open onClose={vi.fn()} chat={chat({ sending: true })} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '500');
    expect(screen.getByRole('button', { name: chatPersona.send })).toBeDisabled();
    expect(screen.getByText(chatPersona.thinking)).toBeInTheDocument();
  });

  it('types the newest answer out and finishes it on a click or key press', () => {
    const state = chat();
    const { rerender } = render(<ChatPanel open onClose={vi.fn()} chat={state} />);
    const answer = 'I built Aside, a Chrome extension that opens an AI sidebar on any page.';
    rerender(
      <ChatPanel
        open
        onClose={vi.fn()}
        chat={chat({ messages: [{ id: 1, role: 'user', content: 'hi' }, { id: 2, role: 'assistant', content: answer }] })}
      />,
    );
    // The full text is there for screen readers from the start; the visible copy is still typing.
    const full = screen.getByText(answer);
    expect(full).toHaveClass('sr-only');
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'a' });
    expect(screen.getByText(answer)).not.toHaveClass('sr-only');
  });

  it('shows the opening questions as a choice menu inside the log, with a cursor on each option', () => {
    render(<ChatPanel open onClose={vi.fn()} chat={chat()} />);
    const log = screen.getByRole('log');
    for (const s of chatPersona.suggestions) {
      const option = screen.getByRole('button', { name: s });
      // In the log they scroll with the conversation and never push the input out of a short panel.
      expect(log).toContainElement(option);
      expect(option.querySelector('svg[data-icon="play"]')).not.toBeNull();
    }
  });

  it('renders answers as text, never as HTML, with source links', () => {
    const messages = [
      { id: 1, role: 'user' as const, content: 'hi' },
      {
        id: 2,
        role: 'assistant' as const,
        content: '<img src=x onerror=alert(1)><script>alert(1)</script>',
        sources: [{ title: 'Aside - AI Sidebar', url: 'https://github.com/Royc4515/Aside' }],
      },
    ];
    const { container } = render(<ChatPanel open onClose={vi.fn()} chat={chat({ messages })} />);
    expect(container.querySelector('script, img[src="x"]')).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Aside - AI Sidebar' });
    expect(link).toHaveAttribute('href', 'https://github.com/Royc4515/Aside');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('button', { name: chatPersona.suggestions[0] })).toBeNull();
  });

  it.each(['rate_limited', 'daily_cap', 'invalid'] as const)('explains the %s error without a retry', error => {
    render(<ChatPanel open onClose={vi.fn()} chat={chat({ error })} />);
    expect(screen.getByRole('alert')).toHaveTextContent(chatPersona.errors[error]);
    expect(screen.queryByRole('button', { name: chatPersona.retry })).toBeNull();
  });

  it('offers a retry when the chat is offline or unreachable', async () => {
    const state = chat({ error: 'unavailable' });
    render(<ChatPanel open onClose={vi.fn()} chat={state} />);
    await userEvent.click(screen.getByRole('button', { name: chatPersona.retry }));
    expect(state.retry).toHaveBeenCalled();
  });

  it('links to the privacy page', () => {
    render(<ChatPanel open onClose={vi.fn()} chat={chat()} />);
    expect(screen.getByRole('link', { name: chatPersona.privacyLabel })).toHaveAttribute('href', '/privacy.html');
  });
});
