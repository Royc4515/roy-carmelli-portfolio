import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AskRoy } from './AskRoy';
import { chatPersona } from '../../data/chatPersona';

afterEach(() => vi.unstubAllGlobals());

function reply(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

describe('AskRoy (option F chat)', () => {
  it('opens with the greeting and the suggested questions', () => {
    render(<AskRoy open onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /Pixel Roy/ })).toBeInTheDocument();
    expect(screen.getByText(chatPersona.greeting)).toBeInTheDocument();
    for (const q of chatPersona.suggestions) expect(screen.getByRole('button', { name: q })).toBeInTheDocument();
  });

  it('sends a suggestion, shows the answer with its sources and tells the scene', async () => {
    const fetch = reply({ reply: 'Aside, Nechita Raka and a wine bot.', sources: [{ title: 'Aside', url: 'https://github.com/Royc4515/Aside' }], blocked: false });
    vi.stubGlobal('fetch', fetch);
    const onAnswer = vi.fn();
    render(<AskRoy open onClose={() => {}} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole('button', { name: chatPersona.suggestions[0] }));
    expect(await screen.findByText('Aside, Nechita Raka and a wine bot.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aside/ })).toHaveAttribute('href', 'https://github.com/Royc4515/Aside');
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }));
  });

  it('sends on Enter, not on Shift+Enter, and never sends a blank question', async () => {
    const fetch = reply({ reply: 'Hi.', sources: [], blocked: false });
    vi.stubGlobal('fetch', fetch);
    render(<AskRoy open onClose={() => {}} />);
    const box = screen.getByLabelText(chatPersona.inputLabel);
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: 'What role?' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(box).toHaveValue('');
  });

  it('shows the persona error line and a retry when the chat is busy', async () => {
    vi.stubGlobal('fetch', reply({ error: 'busy' }, 503));
    render(<AskRoy open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: chatPersona.suggestions[1] }));
    expect(await screen.findByText(chatPersona.errors.busy)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: chatPersona.retry })).toBeInTheDocument();
  });
});
