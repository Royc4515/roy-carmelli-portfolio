import { act, renderHook, waitFor } from '@testing-library/react';
import { ChatApi, ChatApiError, type ChatReply } from '../lib/chatApi';
import { errorCode, useChat } from './useChat';

function fakeApi(...results: (ChatReply | Error)[]) {
  const ask = vi.fn(async () => {
    const next = results.shift();
    if (!next) throw new Error('no more answers');
    if (next instanceof Error) throw next;
    return next;
  });
  return { api: { ask } as unknown as ChatApi, ask };
}
const answer = (reply: string): ChatReply => ({ reply, sources: [], blocked: false });

describe('useChat', () => {
  it('sends the question with the history and appends the answer', async () => {
    const { api, ask } = fakeApi(answer('First!'), answer('Second!'));
    const { result } = renderHook(() => useChat(api));
    act(() => result.current.send('  What   did you build? '));
    expect(result.current.messages.map(m => m.content)).toEqual(['What did you build?']);
    expect(result.current.sending).toBe(true);
    await waitFor(() => expect(result.current.sending).toBe(false));
    act(() => result.current.send('More?'));
    await waitFor(() => expect(result.current.messages).toHaveLength(4));
    expect(ask).toHaveBeenLastCalledWith([
      { role: 'user', content: 'What did you build?' },
      { role: 'assistant', content: 'First!' },
      { role: 'user', content: 'More?' },
    ]);
  });

  it('ignores blank questions and questions sent while one is in flight', async () => {
    const { api, ask } = fakeApi(answer('a'));
    const { result } = renderHook(() => useChat(api));
    act(() => result.current.send('   '));
    act(() => {
      result.current.send('one');
      result.current.send('two');
    });
    await waitFor(() => expect(result.current.sending).toBe(false));
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('keeps the question after an error and retries it', async () => {
    const { api, ask } = fakeApi(new ChatApiError(0, 'network'), answer('Back!'));
    const { result } = renderHook(() => useChat(api));
    act(() => result.current.send('hi'));
    await waitFor(() => expect(result.current.error).toBe('network'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.messages.map(m => m.content)).toEqual(['hi', 'Back!']));
    expect(result.current.error).toBeNull();
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('maps API failures onto the UI error codes', () => {
    expect(errorCode(new ChatApiError(429, 'rate_limited'))).toBe('rate_limited');
    expect(errorCode(new ChatApiError(429, 'daily_cap'))).toBe('daily_cap');
    expect(errorCode(new ChatApiError(503, 'busy'))).toBe('busy');
    expect(errorCode(new ChatApiError(400, 'invalid_messages'))).toBe('invalid');
    expect(errorCode(new ChatApiError(503, 'chat_unavailable'))).toBe('unavailable');
    expect(errorCode(new ChatApiError(404, 'unknown'))).toBe('unavailable');
    expect(errorCode(new Error('x'))).toBe('unavailable');
  });
});
