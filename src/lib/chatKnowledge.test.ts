import { bio } from '../data/bio';
import { buildChatKnowledge, renderKnowledgeModule } from './chatKnowledge';

const knowledge = buildChatKnowledge();
const everything = JSON.stringify(knowledge);

/** Free-tier token budgets (Groq: 8K tokens/minute per model); about 4 characters per token. */
const tokens = (text: string) => Math.ceil(text.length / 4);

describe('chat knowledge', () => {
  it('matches the generated server module (refresh with -u after a data edit)', async () => {
    await expect(renderKnowledgeModule(knowledge)).toMatchFileSnapshot('../../api/_lib/chat/knowledge.generated.ts');
  });

  it('never contains the phone number, in any format', () => {
    const digits = bio.phone.replace(/\D/g, '');
    expect(everything.replace(/\D/g, '')).not.toContain(digits.slice(-9));
    expect(everything).not.toMatch(/\+?972[\s-]?5\d/);
    expect(everything).not.toMatch(/\b05\d[\s-]?\d{3}[\s-]?\d{4}\b/);
  });

  it('keeps the city out (Roy chose "central Israel")', () => {
    expect(everything).not.toMatch(/givat\s*shmuel|גבעת שמואל/i);
    expect(knowledge.core).toContain('central Israel');
  });

  it('describes the service with the site wording, never "combat medic"', () => {
    expect(everything).not.toMatch(/combat medic/i);
    expect(knowledge.core).toMatch(/battalion medic/i);
  });

  it('has no em or en dashes for the model to copy', () => {
    expect(everything).not.toMatch(/[–—]/);
  });

  it('stays inside the token budget', () => {
    expect(tokens(knowledge.core)).toBeLessThan(1800);
    for (const chunk of knowledge.chunks) expect(tokens(chunk.text), chunk.id).toBeLessThan(700);
  });

  it('gives every chunk a unique id and keywords', () => {
    const ids = knowledge.chunks.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const chunk of knowledge.chunks) expect(chunk.keywords.length, chunk.id).toBeGreaterThan(0);
  });

  it('allows only Roy-owned links', () => {
    for (const prefix of knowledge.allowedUrlPrefixes) {
      expect(prefix).toMatch(/^https:\/\//);
      expect(prefix).toMatch(/roy-carmelli|royc4515|Royc4515|vercel\.app|onrender\.com/i);
    }
    for (const chunk of knowledge.chunks) {
      if (chunk.url) expect(knowledge.allowedUrlPrefixes.some(p => chunk.url!.startsWith(p)), chunk.url).toBe(true);
    }
  });

  it('folds a repo behind a site card into that card instead of using its README', () => {
    expect(knowledge.chunks.find(c => c.id === 'github:Aside')).toBeUndefined();
    const aside = knowledge.chunks.find(c => c.id === 'site:project:ai-sidebar')!;
    expect(aside.text).toContain('GitHub repo Aside');
    expect(aside.text).not.toContain('README excerpt');
    expect(knowledge.chunks.find(c => c.id === 'github:build-your-goat')!.text).toContain('README excerpt');
  });
});
