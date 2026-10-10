import type { Knowledge, KnowledgeChunk } from './types.js';

/** Enough detail for one answer while keeping a request near ~2.5K tokens on the free tier. */
export const TOP_K = 3;

const STOPWORDS = new Set(
  ('a an and are as at be but by can did do does for from has have he her him his how i in is it its me my ' +
    'of on or roy roys so tell that the their them there they this to was what when where which who why will ' +
    'with you your about any some more also just like could would should please').split(' '),
);

/** Common Hebrew words mapped onto the English vocabulary the knowledge is written in. */
const HEBREW: Record<string, string[]> = {
  צבא: ['army', 'military'],
  צבאי: ['military'],
  שירות: ['service'],
  מילואים: ['reserve'],
  חובש: ['medic'],
  חוגד: ['medic'],
  פרויקט: ['projects'],
  פרויקטים: ['projects'],
  לימודים: ['education', 'studies'],
  תואר: ['degree'],
  אוניברסיטה: ['university'],
  יין: ['wine', 'sommelier'],
  סומלייה: ['sommelier'],
  בינה: ['ai'],
  מלאכותית: ['ai'],
  משחק: ['game'],
  אותות: ['signal'],
  עיבוד: ['processing'],
  תוסף: ['extension', 'chrome'],
  כרום: ['chrome'],
  בוט: ['bot', 'telegram'],
  טלגרם: ['telegram'],
  לינקדאין: ['linkedin'],
  גיטהאב: ['github'],
  תעודות: ['certifications'],
  קורס: ['course'],
  נוירו: ['neuroscience'],
  מדעי: ['science'],
  מחשב: ['computer'],
  הנדסה: ['engineering'],
  ניסיון: ['experience'],
  וולט: ['wolt'],
};
/** Hebrew attaches one-letter prefixes (and, the, in, to, from...). */
const HEBREW_PREFIX = /^[והבלמשכ]/;

/** Lowercase tokens in Latin, digits and Hebrew; Hebrew words become English vocabulary. */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().replace(/["'׳״]/g, '').split(/[^a-z0-9֐-׿+#]+/)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    if (/[֐-׿]/.test(raw)) {
      const mapped = HEBREW[raw] ?? (raw.length > 3 ? HEBREW[raw.replace(HEBREW_PREFIX, '')] : undefined);
      if (mapped) out.push(...mapped);
      continue;
    }
    out.push(raw);
    if (raw.endsWith('s') && raw.length > 3) out.push(raw.slice(0, -1));
  }
  return out;
}

interface Indexed {
  chunk: KnowledgeChunk;
  tf: Map<string, number>;
  length: number;
  keywords: Set<string>;
}

// The knowledge is fixed per deploy: index it once per warm instance.
const indexes = new WeakMap<Knowledge, { docs: Indexed[]; idf: Map<string, number>; avg: number }>();

function indexOf(knowledge: Knowledge) {
  let index = indexes.get(knowledge);
  if (index) return index;
  const docs = knowledge.chunks.map(chunk => {
    const terms = tokenize(`${chunk.title} ${chunk.text}`);
    const tf = new Map<string, number>();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk, tf, length: terms.length, keywords: new Set(chunk.keywords.flatMap(k => tokenize(k))) };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set([...d.tf.keys(), ...d.keywords])) df.set(t, (df.get(t) ?? 0) + 1);
  const n = docs.length;
  const idf = new Map([...df].map(([t, f]) => [t, Math.log(1 + (n - f + 0.5) / (f + 0.5))]));
  const avg = docs.reduce((s, d) => s + d.length, 0) / Math.max(n, 1);
  index = { docs, idf, avg };
  indexes.set(knowledge, index);
  return index;
}

const K1 = 1.2;
const B = 0.75;
/** A named project or repo beats incidental word overlap. */
const KEYWORD_BOOST = 2;

/** BM25 over the chunks, plus a boost for names and aliases. Deterministic and free. */
export function retrieve(knowledge: Knowledge, query: string, k = TOP_K): KnowledgeChunk[] {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  const { docs, idf, avg } = indexOf(knowledge);
  return docs
    .map(d => {
      let score = 0;
      for (const t of terms) {
        const w = idf.get(t) ?? 0;
        const f = d.tf.get(t) ?? 0;
        if (f) score += (w * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.length) / avg));
        if (d.keywords.has(t)) score += KEYWORD_BOOST * w;
      }
      // Ties go to the site: its cards are the reviewed source.
      return { chunk: d.chunk, score: score + (d.chunk.source === 'site' && score > 0 ? 0.01 : 0) };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(s => s.chunk);
}
