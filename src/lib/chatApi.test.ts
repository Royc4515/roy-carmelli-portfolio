import { ChatApi, ChatApiError, MAX_TURNS, parseReply } from './chatApi';

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('ChatApi', () => {
  it('posts the last turns as JSON and returns the parsed reply', async () => {
    const fetchFn = vi.fn(async () => ok({ reply: 'Hi!', sources: [{ title: 'Aside', url: 'https://github.com/Royc4515/Aside' }] }));
    const history = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }) as const);
    const reply = await new ChatApi(fetchFn).ask(history);
    expect(reply).toEqual({ reply: 'Hi!', sources: [{ title: 'Aside', url: 'https://github.com/Royc4515/Aside' }], blocked: false });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/chat');
    expect(init.method).toBe('POST');
    const sent = JSON.parse(String(init.body)).messages;
    expect(sent).toHaveLength(MAX_TURNS);
    expect(sent[sent.length - 1].content).toBe('m14');
  });

  it("turns an error body into a ChatApiError with the API's code", async () => {
    await expect(new ChatApi(async () => ok({ error: 'daily_cap' }, 429)).ask([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      status: 429,
      code: 'daily_cap',
    });
  });

  it('reports a network failure and a non-JSON answer', async () => {
    await expect(new ChatApi(async () => { throw new TypeError('offline'); }).ask([])).rejects.toMatchObject({ code: 'network' });
    await expect(new ChatApi(async () => new Response('<html>', { status: 404 })).ask([])).rejects.toBeInstanceOf(ChatApiError);
    await expect(new ChatApi(async () => ok({ nope: true })).ask([])).rejects.toMatchObject({ code: 'invalid_reply' });
  });
});

describe('parseReply', () => {
  it('keeps only https links clickable and drops junk sources', () => {
    expect(
      parseReply({
        reply: 'x',
        blocked: true,
        sources: [{ title: 'ok', url: 'https://a.b' }, { title: 'js', url: 'javascript:alert(1)' }, { url: 'x' }, null],
      }),
    ).toEqual({ reply: 'x', blocked: true, sources: [{ title: 'ok', url: 'https://a.b' }, { title: 'js', url: null }] });
  });

  it('rejects a missing or blank reply', () => {
    expect(parseReply({ reply: ' ' })).toBeNull();
    expect(parseReply(null)).toBeNull();
  });
});
