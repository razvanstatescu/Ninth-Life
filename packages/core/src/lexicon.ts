/**
 * Lexicon: exact code -> words map (O(1) lookup) plus a prefix index for completions.
 * Requirements: core-encoder Req 2.1 – 2.11.
 *
 * Two file formats load into the same Lexicon:
 *   v1 (`LexiconFile`)   code -> [word, zipf x 10][] (the eval and data-builder source)
 *   v2 (`LexiconFileV2`) words grouped by zipf x 10, no codes (the compact file the app ships,
 *                        ADR-data-003). Codes are derived on load, so the file cannot misfile a word.
 */
import { KEYMAP, encodeWord, isCode, normalize } from './keymap';

/** data/lexicon/<lang>.v1.json */
export interface LexiconFile {
  v: 1;
  lang: string;
  source: string;
  license: string;
  /** code -> [word, zipf x 10][], words sorted by frequency desc. */
  codes: Record<string, [word: string, zipfX10: number][]>;
}

/**
 * data/lexicon/<lang>.v2.json (ADR-data-003): the same words and frequencies as v1, without the
 * codes, which the loader derives. `words` holds one group per zipf x 10 value, highest first;
 * inside a group, words are space-separated in v1 order (codes ascending, then the code's own order).
 */
export interface LexiconFileV2 {
  v: 2;
  lang: string;
  source: string;
  license: string;
  words: [zipfX10: number, words: string][];
}

/** Completions cached per prefix (and the default k). */
export const TRIE_TOP_K = 5;
/** Zipf value given to a word that a vocab pack adds and the lexicon does not know (before boost). */
export const NEW_WORD_ZIPF = 3.0;
/** Prefixes whose completions are remembered before the cache starts over. */
const PREFIX_CACHE_MAX = 2048;

interface Entry {
  readonly w: string;
  readonly code: string;
  /** zipf from the lexicon file (or NEW_WORD_ZIPF for pack words). */
  base: number;
  /** zipf units from vocab packs; the largest boost seen wins (packs do not stack). */
  boost: number;
  /** insertion order: the file's own order breaks score ties. */
  readonly seq: number;
}

const score = (e: Entry): number => e.base + e.boost;
/** Negative when a ranks before b: higher score first, then file order. A total order. */
const byRank = (a: Entry, b: Entry): number => score(b) - score(a) || a.seq - b.seq;

/** charCode -> digit charCode for a-z, 0 for an apostrophe, -1 for anything else. */
const PLAIN = (() => {
  const t = new Int16Array(128).fill(-1);
  for (const [ch, d] of Object.entries(KEYMAP)) t[ch.charCodeAt(0)] = d.charCodeAt(0);
  t[39] = 0; // '
  return t;
})();

/**
 * Fast path of normalize + encodeWord for a word that is already plain a-z and apostrophes
 * (normalize is the identity on such a word). Returns the code, null when there is no letter
 * (encodeWord would return null too), or undefined when the word has any other character and
 * must take the full normalize + encodeWord path. Req 2.8.
 */
function plainCode(w: string): string | null | undefined {
  let code = '';
  for (let i = 0; i < w.length; i++) {
    const c = w.charCodeAt(i);
    const d = c < 128 ? PLAIN[c]! : -1;
    if (d < 0) return undefined;
    if (d > 0) code += String.fromCharCode(d);
  }
  return code === '' ? null : code;
}

/** First index in sorted `xs` whose value is >= x. */
function lowerBound(xs: readonly string[], x: string): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (xs[mid]! < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

type How = 'max-base' | 'max-boost';

export class Lexicon {
  readonly lang: string;
  private readonly byWord = new Map<string, Entry>();
  private readonly byCode = new Map<string, Entry[]>();
  private nextSeq = 0;
  /** Prefix index: every code in the lexicon, sorted, so the codes under a prefix are one run. Built lazily. */
  private codes: string[] | null = null;
  /** prefix -> the top `k` completions computed for it. Cleared whenever a score changes. */
  private readonly prefixCache = new Map<string, { k: number; words: string[] }>();

  constructor(lang: string) {
    this.lang = lang;
  }

  /**
   * Load a lexicon file (v1 or v2). Every word is checked and encoded here: a plain a-z word takes
   * a per-letter table, anything else is normalized first; a word filed under the wrong code (v1)
   * is moved to its real code, and a word that cannot be encoded is dropped, so lookup() can only
   * ever return words that pass validate() (Req 2.6, 2.8). Lists that arrive in rank order are
   * not sorted again (Req 2.9).
   */
  static fromJSON(file: LexiconFile | LexiconFileV2): Lexicon {
    const f = file as Partial<LexiconFile> & Partial<LexiconFileV2>;
    const v1 = !!f && f.v === 1 && typeof f.codes === 'object' && f.codes !== null;
    const v2 = !!f && f.v === 2 && Array.isArray(f.words);
    if (!v1 && !v2) throw new TypeError('Lexicon.fromJSON: expected a LexiconFile with v: 1 or v: 2');
    const lex = new Lexicon(String(f.lang));
    const unsorted = new Set<string>();
    const add = (word: unknown, zipfX10: unknown) => {
      if (typeof word !== 'string' || typeof zipfX10 !== 'number' || !Number.isFinite(zipfX10)) return;
      lex.upsert(word, zipfX10 / 10, 0, 'max-base', unsorted, true);
    };
    if (v1) {
      for (const list of Object.values(f.codes!)) {
        if (!Array.isArray(list)) continue;
        for (const item of list) if (Array.isArray(item)) add(item[0], item[1]);
      }
    } else {
      for (const group of f.words!) {
        if (!Array.isArray(group) || typeof group[1] !== 'string') continue;
        const z = group[0];
        for (const w of group[1].split(' ')) if (w !== '') add(w, z);
      }
    }
    lex.resort(unsorted, true);
    return lex;
  }

  /** Number of distinct words. */
  get size(): number {
    return this.byWord.size;
  }

  /** Words with exactly this code, most frequent first; [] if none. */
  lookup(code: string): string[] {
    const list = this.byCode.get(code);
    return list ? list.map((e) => e.w) : [];
  }

  /** True if the (normalized) word is in the lexicon. */
  has(word: string): boolean {
    return this.byWord.has(normalize(word));
  }

  /** Effective zipf (file zipf + pack boost), e.g. 6.2; undefined if unknown. */
  zipf(word: string): number | undefined {
    const e = this.byWord.get(normalize(word));
    return e ? score(e) : undefined;
  }

  /**
   * Words whose code starts with prefix (including the exact code), most frequent first, at most k.
   * Reads the run of codes under the prefix in the sorted code index and keeps the best k; the
   * answer for each prefix is cached until a score changes. A prefix that is not digits 2-9
   * returns []. Req 2.2, 2.10.
   */
  completions(prefix: string, k: number = TRIE_TOP_K): string[] {
    const n = Math.floor(k);
    if (!(n > 0) || !isCode(prefix)) return [];
    const hit = this.prefixCache.get(prefix);
    if (hit && hit.k >= n) return hit.words.slice(0, n);
    const kk = Math.max(n, TRIE_TOP_K);
    const words = this.topK(prefix, kk);
    if (this.prefixCache.size >= PREFIX_CACHE_MAX) this.prefixCache.clear();
    this.prefixCache.set(prefix, { k: kk, words });
    return words.slice(0, n);
  }

  /**
   * Build the completion index now instead of on the first completions() call. Idempotent and
   * cheap to call again; the app calls it in idle time right after loading (Req 2.10).
   */
  prepare(): void {
    this.index();
  }

  /**
   * Add user vocabulary (vocab packs). boost is in zipf units (default 0). Unknown words start at
   * NEW_WORD_ZIPF. Boosts do not stack: re-adding a pack is a no-op and the largest boost wins.
   * Words that cannot be encoded (spaces, digits, symbols) are skipped. Every word is normalized
   * (the safe path; no fast path for user input).
   */
  addWords(words: { w: string; boost?: number }[]): void {
    const unsorted = new Set<string>();
    let changed = false;
    for (const item of words) {
      if (!item || typeof item.w !== 'string') continue;
      const b = typeof item.boost === 'number' && Number.isFinite(item.boost) ? item.boost : 0;
      if (this.upsert(item.w, NEW_WORD_ZIPF, b, 'max-boost', unsorted, false)) changed = true;
    }
    this.resort(unsorted, changed);
  }

  // ------------------------------------------------------------------ internals

  /** Returns true if the lexicon changed. Codes whose list is out of rank order go in `unsorted`. */
  private upsert(raw: string, base: number, boost: number, how: How, unsorted: Set<string>, plain: boolean): boolean {
    let w = raw;
    let code = plain ? plainCode(raw) : undefined;
    if (code === undefined) {
      w = normalize(raw);
      code = encodeWord(w);
    }
    if (code === null) return false;
    const prev = this.byWord.get(w);
    if (prev) {
      const before = score(prev);
      if (how === 'max-base') prev.base = Math.max(prev.base, base);
      else prev.boost = Math.max(prev.boost, boost);
      if (score(prev) === before) return false;
      unsorted.add(prev.code);
      return true;
    }
    const e: Entry = { w, code, base, boost, seq: this.nextSeq++ };
    this.byWord.set(w, e);
    const list = this.byCode.get(code);
    if (list) {
      // e has the largest seq, so the list stays in rank order unless e outscores the last entry.
      if (score(e) > score(list[list.length - 1]!)) unsorted.add(code);
      list.push(e);
    } else {
      this.byCode.set(code, [e]);
      if (this.codes) this.codes.splice(lowerBound(this.codes, code), 0, code);
    }
    return true;
  }

  private resort(unsorted: Set<string>, changed: boolean): void {
    for (const code of unsorted) this.byCode.get(code)?.sort(byRank);
    if (changed) this.prefixCache.clear();
  }

  private index(): string[] {
    if (!this.codes) this.codes = [...this.byCode.keys()].sort();
    return this.codes;
  }

  /** The best k entries (by byRank) among all codes that start with prefix. */
  private topK(prefix: string, k: number): string[] {
    const codes = this.index();
    const top: Entry[] = [];
    for (let i = lowerBound(codes, prefix); i < codes.length; i++) {
      const c = codes[i]!;
      if (!c.startsWith(prefix)) break;
      for (const e of this.byCode.get(c)!) {
        // Each list is in rank order: once an entry cannot enter the top k, the rest cannot either.
        if (top.length === k && byRank(e, top[k - 1]!) > 0) break;
        let j = top.length < k ? top.length : k - 1;
        while (j > 0 && byRank(e, top[j - 1]!) < 0) {
          top[j] = top[j - 1]!;
          j--;
        }
        top[j] = e;
      }
    }
    return top.map((e) => e.w);
  }
}
