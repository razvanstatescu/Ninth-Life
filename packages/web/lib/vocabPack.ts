/**
 * Word packs: the `VocabPack` file (docs/architecture/contracts.md §4) that "My words" imports and
 * exports. Format and rules: docs/architecture/vocab-packs.md. A pack only ever adds words and
 * phrases on this device; nothing in it is sent anywhere.
 *
 * Validation is a hand-written schema (no new dependency): the pack shape is checked strictly and
 * rejected as a whole when it is wrong; single entries that cannot be typed are skipped and listed,
 * so the person sees exactly what will be added before anything is added.
 */
import { encodeWord, type Lexicon } from '@ninth/core';
import { MAX_WORD_CHARS, foldWord, type MyWord } from './myWords';

/** The contract shape (contracts.md §4). `w` may carry the person's spelling ("Mihai"). */
export interface VocabPack {
  id: string;
  lang: string;
  version: number;
  words: { w: string; boost: number }[];
  phrases: string[];
}

export const PACK_LIMITS = {
  /** File size, in characters of JSON text. */
  bytes: 1_000_000,
  words: 5000,
  wordChars: MAX_WORD_CHARS,
  phrases: 1000,
  phraseChars: 280,
  idChars: 64,
} as const;
/** Boost range for pack words, in zipf units; a missing boost is 1. */
export const PACK_BOOST = { min: 0, max: 3, fallback: 1 } as const;
export const APP_LANG = 'en';

export interface PackWord {
  w: string;
  display: string;
  boost: number;
}
export interface PackProblem {
  item: string;
  reason: string;
}
export interface ParsedPack {
  id: string;
  lang: string;
  version: number;
  words: PackWord[];
  phrases: string[];
  /** Entries left out, each with the reason. */
  skipped: PackProblem[];
}
export type PackResult = { ok: true; pack: ParsedPack } | { ok: false; error: string };

const NOT_A_PACK = 'This is not a word pack. A word pack is a JSON file with an id, lang, version, words and phrases.';
const fmt = (n: number) => n.toLocaleString('en-US');
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Parse and validate pack text (or an already parsed value). */
export function parseVocabPack(input: string | unknown): PackResult {
  let v: unknown = input;
  if (typeof input === 'string') {
    if (input.length > PACK_LIMITS.bytes) return { ok: false, error: 'This file is too big for a word pack. A pack can be at most 1 MB.' };
    try {
      v = JSON.parse(input);
    } catch {
      return { ok: false, error: NOT_A_PACK };
    }
  }
  if (!isObj(v) || !Array.isArray(v.words)) return { ok: false, error: NOT_A_PACK };

  const id = typeof v.id === 'string' ? v.id.trim() : '';
  if (!/^[A-Za-z0-9._-]+$/.test(id) || id.length > PACK_LIMITS.idChars) {
    return { ok: false, error: `The pack needs an id of up to ${PACK_LIMITS.idChars} letters, digits, dots, dashes or underscores.` };
  }
  const lang = typeof v.lang === 'string' ? v.lang.trim().toLowerCase() : '';
  if (lang !== APP_LANG && !lang.startsWith(`${APP_LANG}-`)) {
    return { ok: false, error: lang ? `This pack is for "${lang}". Ninth Life has an English dictionary only for now.` : 'The pack needs a lang, such as "en".' };
  }
  const version = v.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'The pack needs a version: a whole number from 1.' };
  }
  if (v.words.length > PACK_LIMITS.words) {
    return { ok: false, error: `A pack can have at most ${fmt(PACK_LIMITS.words)} words. This one has ${fmt(v.words.length)}.` };
  }
  const rawPhrases = v.phrases === undefined ? [] : v.phrases;
  if (!Array.isArray(rawPhrases)) return { ok: false, error: 'The phrases in this pack must be a list of sentences.' };
  if (rawPhrases.length > PACK_LIMITS.phrases) {
    return { ok: false, error: `A pack can have at most ${fmt(PACK_LIMITS.phrases)} phrases. This one has ${fmt(rawPhrases.length)}.` };
  }

  const skipped: PackProblem[] = [];
  const words = new Map<string, PackWord>();
  for (const item of v.words) {
    const raw = isObj(item) ? item.w : undefined;
    if (typeof raw !== 'string') {
      skipped.push({ item: short(item), reason: 'not a word entry ({ "w": "word", "boost": 1 })' });
      continue;
    }
    const f = foldWord(raw);
    if ('error' in f) {
      skipped.push({ item: raw, reason: f.error.split('.')[0]!.toLowerCase() });
      continue;
    }
    const b = (item as Record<string, unknown>).boost;
    if (b !== undefined && (typeof b !== 'number' || !Number.isFinite(b))) {
      skipped.push({ item: raw, reason: 'boost must be a number' });
      continue;
    }
    const boost = Math.min(PACK_BOOST.max, Math.max(PACK_BOOST.min, typeof b === 'number' ? b : PACK_BOOST.fallback));
    const prev = words.get(f.w);
    words.set(f.w, prev ? { ...prev, boost: Math.max(prev.boost, boost) } : { w: f.w, display: f.display, boost });
  }

  const phrases: string[] = [];
  const seen = new Set<string>();
  for (const p of rawPhrases) {
    if (typeof p !== 'string') {
      skipped.push({ item: short(p), reason: 'a phrase must be text' });
      continue;
    }
    const text = p.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (text.length > PACK_LIMITS.phraseChars) {
      skipped.push({ item: `${text.slice(0, 40)}…`, reason: `longer than ${PACK_LIMITS.phraseChars} characters` });
      continue;
    }
    if (seen.has(text)) continue;
    seen.add(text);
    phrases.push(text);
  }

  return { ok: true, pack: { id, lang, version, words: [...words.values()], phrases, skipped } };
}

function short(v: unknown): string {
  let s: string;
  try {
    s = typeof v === 'string' ? v : JSON.stringify(v) ?? String(v);
  } catch {
    s = String(v);
  }
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

/** What an import would do, shown before anything is added. */
export interface ImportPlan {
  /** Not in my words yet. */
  add: PackWord[];
  /** Already in my words, with a new spelling or a larger boost. */
  update: PackWord[];
  /** Already in my words, unchanged. */
  same: PackWord[];
  /** Of `add`, how many the dictionary already knows (they only rank higher). */
  known: number;
  phrasesNew: string[];
  phrasesExisting: string[];
}

export function planImport(pack: ParsedPack, mine: readonly MyWord[], savedPhrases: readonly string[], lex?: Lexicon | null): ImportPlan {
  const byW = new Map(mine.map((m) => [m.w, m] as const));
  const plan: ImportPlan = { add: [], update: [], same: [], known: 0, phrasesNew: [], phrasesExisting: [] };
  for (const pw of pack.words) {
    const m = byW.get(pw.w);
    if (!m) {
      plan.add.push(pw);
      if (lex?.has(pw.w)) plan.known++;
    } else if (m.display !== pw.display || pw.boost > m.boost) plan.update.push(pw);
    else plan.same.push(pw);
  }
  const saved = new Set(savedPhrases);
  for (const p of pack.phrases) (saved.has(p) ? plan.phrasesExisting : plan.phrasesNew).push(p);
  return plan;
}

/** The person's words and saved phrases as a pack file. Words keep their spelling ("Mihai"). */
export function exportVocabPack(words: readonly MyWord[], phrases: readonly string[], opts: { id?: string; version?: number } = {}): VocabPack {
  return {
    id: opts.id ?? 'my-words',
    lang: APP_LANG,
    version: opts.version ?? 1,
    words: [...words]
      .sort((a, b) => a.w.localeCompare(b.w))
      .filter((x) => encodeWord(x.w) !== null)
      .map((x) => ({ w: x.display || x.w, boost: x.boost })),
    phrases: phrases.filter((p) => p.trim().length > 0 && p.length <= PACK_LIMITS.phraseChars),
  };
}

/**
 * A pasted link, made fetchable. Only https (http only for this computer, for testing). A GitHub
 * "blob" page link is turned into its raw file link.
 */
export function packUrl(input: string): { url: string } | { error: string } {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return { error: 'Paste the full link to a pack file, starting with https://' };
  }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return { error: 'The link must start with https://' };
  if (u.username || u.password) return { error: 'Use a link without a user name or password.' };
  const blob = /^\/([^/]+)\/([^/]+)\/blob\/(.+)$/.exec(u.pathname);
  if (u.hostname === 'github.com' && blob) return { url: `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}` };
  return { url: u.toString() };
}

type FetchText = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number; headers: { get(n: string): string | null }; text(): Promise<string> }>;

/**
 * Get a pack file from a link the person pasted. No cookies, no referrer, nothing typed is sent:
 * the request carries only the link itself.
 */
export async function fetchPackText(url: string, opts: { fetchImpl?: FetchText; timeoutMs?: number } = {}): Promise<string> {
  const fetchImpl: FetchText = opts.fetchImpl ?? ((u, init) => fetch(u, init));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 10_000);
  try {
    const res = await fetchImpl(url, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(`The link answered with error ${res.status}. Check the link and try again.`);
    const len = Number(res.headers.get('content-length') ?? '0');
    if (len > PACK_LIMITS.bytes) throw new Error('This file is too big for a word pack. A pack can be at most 1 MB.');
    return await res.text();
  } catch (e) {
    if (e instanceof Error && /error \d+|too big/.test(e.message)) throw e;
    throw new Error('The pack could not be fetched. Check the link and the connection, then try again.');
  } finally {
    clearTimeout(t);
  }
}
