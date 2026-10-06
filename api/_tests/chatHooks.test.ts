// @vitest-environment node
import {
  cannedReply,
  canaryHook,
  linkAllowlistHook,
  MAX_ANSWER_CHARS,
  piiHook,
  runOutputHooks,
  sourcesHook,
  styleHook,
  type HookContext,
  type OutputHook,
} from '../_lib/chat/hooks.js';
import { KNOWLEDGE } from '../_lib/chat/knowledge.generated.js';
import type { ReplyDraft } from '../_lib/chat/prompt.js';

const ctx: HookContext = { knowledge: KNOWLEDGE, canary: 'PXR-abc123def456' };
const draft = (answer: string, sources: string[] = []): ReplyDraft => ({ answer, inScope: true, sources });
const answerOf = (hook: OutputHook, answer: string) => {
  const outcome = hook.apply(draft(answer), ctx);
  if (!outcome.ok) throw new Error(`blocked: ${outcome.reason}`);
  return outcome.draft.answer;
};

describe('canaryHook', () => {
  it('blocks the exact marker and anything shaped like it', () => {
    expect(canaryHook.apply(draft('ok PXR-abc123def456'), ctx)).toEqual({ ok: false, reason: 'leak' });
    expect(canaryHook.apply(draft('PXR-0f0f0f0f'), ctx)).toEqual({ ok: false, reason: 'leak' });
    expect(canaryHook.apply(draft('Pixel Roy here'), ctx).ok).toBe(true);
  });
});

describe('piiHook', () => {
  it.each(['+972 54 728 7807', '+972547287807', '054-728-7807', '(054) 728 7807'])('replaces the phone number %s', phone => {
    expect(answerOf(piiHook, `Call me at ${phone}.`)).toBe("Call me at the site's Contact section.");
  });

  it('leaves years, ranges and counts alone', () => {
    const text = 'From October 2024 to 2028, 12 to 30 people, 273 tests, 2024-2028.';
    expect(answerOf(piiHook, text)).toBe(text);
  });

  it("keeps Roy's email and swaps any other address for it", () => {
    expect(answerOf(piiHook, 'Email roy.y.carmelli@gmail.com')).toBe('Email roy.y.carmelli@gmail.com');
    expect(answerOf(piiHook, 'Email hr@evil.example')).toBe(`Email ${KNOWLEDGE.email}`);
  });
});

describe('linkAllowlistHook', () => {
  it("keeps Roy's own links", () => {
    for (const url of [
      'https://github.com/Royc4515/Aside',
      'https://roy-carmelli-portfolio.vercel.app/#contact',
      'https://linkedin.com/in/roy-carmelli',
      'https://royc4515.github.io/Aside/',
    ]) {
      expect(answerOf(linkAllowlistHook, `See ${url} for more.`)).toBe(`See ${url} for more.`);
    }
  });

  it('cuts any other link, including look-alikes', () => {
    expect(answerOf(linkAllowlistHook, 'See https://evil.example/x for more.')).toBe('See for more.');
    expect(answerOf(linkAllowlistHook, 'Try https://github.com/Royc4515-evil/x.')).toBe('Try.');
    expect(answerOf(linkAllowlistHook, 'Or www.evil.example now')).toBe('Or now');
    expect(answerOf(linkAllowlistHook, 'Or https://roy-carmelli-portfolio.vercel.app.evil.io')).toBe('Or');
  });
});

describe('sourcesHook', () => {
  it('keeps known ids, once each, at most three', () => {
    const ids = ['site:about', 'nope', 'site:about', 'linkedin:profile', 'linkedin:service', 'site:project:clr'];
    const outcome = sourcesHook.apply(draft('x', ids), ctx);
    expect(outcome.ok && outcome.draft.sources).toEqual(['site:about', 'linkedin:profile', 'linkedin:service']);
  });
});

describe('styleHook', () => {
  it('turns em and en dashes into hyphens', () => {
    expect(answerOf(styleHook, 'Aside—a sidebar – fast')).toBe('Aside - a sidebar - fast');
  });

  it('drops a sentence that says "combat medic" instead of rewording it', () => {
    // Rewording once turned a correct denial into nonsense: "I never called it a battalion medic."
    expect(answerOf(styleHook, 'I was a battalion medic. I never called it a combat medic. Ask me more!')).toBe(
      'I was a battalion medic. Ask me more!',
    );
    expect(answerOf(styleHook, 'Line one\nCombat Medic is wrong\nLine three')).toBe('Line one\n\nLine three');
  });

  it('blocks an answer that was only about "combat medic"', () => {
    expect(styleHook.apply(draft('Yes, I was a combat medic.'), ctx)).toEqual({ ok: false, reason: 'empty' });
  });

  it('strips markdown but keeps hyphen lists and link targets', () => {
    expect(answerOf(styleHook, '## Hi\n**Bold** `code`\n* one\n• two\n[Aside](https://github.com/Royc4515/Aside)')).toBe(
      'Hi\nBold code\n- one\n- two\nAside (https://github.com/Royc4515/Aside)',
    );
  });

  it('caps a runaway answer at a sentence end', () => {
    const long = 'This is one sentence that goes on. '.repeat(40);
    const out = answerOf(styleHook, long);
    expect(out.length).toBeLessThanOrEqual(MAX_ANSWER_CHARS);
    expect(out.endsWith('.')).toBe(true);
  });

  it('blocks an answer that is empty after cleaning', () => {
    expect(styleHook.apply(draft('** **'), ctx)).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('runOutputHooks', () => {
  it('runs every hook in order and stops at the first block', () => {
    const outcome = runOutputHooks(draft('A **battalion medic** \u2014 see https://evil.example. Not a combat medic.', ['site:about', 'x']), ctx);
    expect(outcome).toEqual({ ok: true, draft: { answer: 'A battalion medic - see.', inScope: true, sources: ['site:about'] } });
    expect(runOutputHooks(draft(`x ${ctx.canary} https://evil.example`), ctx)).toEqual({ ok: false, reason: 'leak' });
  });
});

describe('cannedReply', () => {
  it('answers in the visitor language and never uses em dashes', () => {
    for (const reason of ['injection', 'leak', 'empty'] as const) {
      expect(cannedReply(reason, false, KNOWLEDGE.email)).not.toMatch(/[֐-׿–—]/);
      expect(cannedReply(reason, true, KNOWLEDGE.email)).toMatch(/[֐-׿]/);
    }
  });
});
