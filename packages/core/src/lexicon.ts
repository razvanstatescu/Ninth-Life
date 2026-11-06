/**
 * Lexicon: exact code -> words map (O(1) lookup) plus a lazily built digit trie with the top 5
 * completions precomputed per node.
 * Requirements: core-encoder Req 2.1 – 2.7.
 */
import { encodeWord, isCode, normalize } from './keymap';

/** data/lexicon/<lang>.v1.json */
export interface LexiconFile {
  v: 1;
  lang: string;
  source: string;
  license: string;
  /** code -> [word, zipf x 10][], words sorted by frequency desc. */
  codes: Record<string, [word: string, zipfX10: number][]>;
}

/** Completions precomputed per trie node. */
export const TRIE_TOP_K = 5;
/** Zipf value given to a word that a vocab pack adds and the lexicon does not know (before boost). */
export const NEW_WORD_ZIPF = 3.0;

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
const byRank = (a: Entry, b: Entry): number => score(b) - score(a) || a.seq - b.seq;

export class Lexicon {
  readonly lang: string;
  private readonly byWord = new Map<string, Entry>();
  private readonly byCode = new Map<string, Entry[]>();
  private nextSeq = 0;
  /** Lazy index: every entry in rank order. */
  private ranked: Entry[] | null = null;
  /** Lazy digit trie, one key per node (the node's digit path) -> top TRIE_TOP_K words below it. */
  private trie: Map<string, string[]> | null = null;

  constructor(lang: string) {
    this.lang = lang;
  }

  /**
   * Load a lexicon file. Every word is normalized and re-encoded: a word filed under the wrong
   * code is moved to its real code, and a word that cannot be encoded is dropped, so lookup()
   * can only ever return words that pass validate() (Req 2.6).
   */
  static fromJSON(file: LexiconFile): Lexicon {
    if (!file || file.v !== 1 || typeof file.codes !== 'object' || file.codes === null) {
      throw new TypeError('Lexicon.fromJSON: expected a LexiconFile with v: 1');
    }
    const lex = new Lexicon(String(file.lang));
    const dirty = new Set<string>();
    for (const list of Object.values(file.codes)) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (!Array.isArray(item)) continue;
        const [word, zipfX10] = item;
        if (typeof word !== 'string' || typeof zipfX10 !== 'number' || !Number.isFinite(zipfX10)) continue;
        lex.upsert(word, zipfX10 / 10, 0, 'max-base', dirty);
      }
    }
    lex.resort(dirty);
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
   * k <= TRIE_TOP_K reads the precomputed trie node; larger k walks the rank-ordered index.
   * A prefix that is not digits 2-9 returns [].
   */
  completions(prefix: string, k: number = TRIE_TOP_K): string[] {
    const n = Math.floor(k);
    if (!(n > 0) || !isCode(prefix)) return [];
    this.ensureIndex();
    if (n <= TRIE_TOP_K) return (this.trie!.get(prefix) ?? []).slice(0, n);
    const out: string[] = [];
    for (const e of this.ranked!) {
      if (e.code.startsWith(prefix)) {
        out.push(e.w);
        if (out.length >= n) break;
      }
    }
    return out;
  }

  /**
   * Add user vocabulary (vocab packs). boost is in zipf units (default 0). Unknown words start at
   * NEW_WORD_ZIPF. Boosts do not stack: re-adding a pack is a no-op and the largest boost wins.
   * Words that cannot be encoded (spaces, digits, symbols) are skipped.
   */
  addWords(words: { w: string; boost?: number }[]): void {
    const dirty = new Set<string>();
    for (const item of words) {
      if (!item || typeof item.w !== 'string') continue;
      const b = typeof item.boost === 'number' && Number.isFinite(item.boost) ? item.boost : 0;
      this.upsert(item.w, NEW_WORD_ZIPF, b, 'max-boost', dirty);
    }
    this.resort(dirty);
  }

  // ------------------------------------------------------------------ internals

  private upsert(raw: string, base: number, boost: number, how: 'max-base' | 'max-boost', dirty: Set<string>): void {
    const w = normalize(raw);
    const code = encodeWord(w);
    if (code === null) return;
    const prev = this.byWord.get(w);
    if (prev) {
      const before = score(prev);
      if (how === 'max-base') prev.base = Math.max(prev.base, base);
      else prev.boost = Math.max(prev.boost, boost);
      if (score(prev) !== before) dirty.add(prev.code);
      return;
    }
    const e: Entry = { w, code, base, boost, seq: this.nextSeq++ };
    this.byWord.set(w, e);
    const list = this.byCode.get(code);
    if (list) list.push(e);
    else this.byCode.set(code, [e]);
    dirty.add(code);
  }

  private resort(dirty: Set<string>): void {
    if (dirty.size === 0) return;
    for (const code of dirty) this.byCode.get(code)?.sort(byRank);
    this.ranked = null;
    this.trie = null;
  }

  private ensureIndex(): void {
    if (this.ranked && this.trie) return;
    const ranked = [...this.byWord.values()].sort(byRank);
    // Visiting words in rank order means the first TRIE_TOP_K words to reach a node are its top K.
    const trie = new Map<string, string[]>();
    for (const e of ranked) {
      for (let i = 1; i <= e.code.length; i++) {
        const key = e.code.slice(0, i);
        const top = trie.get(key);
        if (!top) trie.set(key, [e.w]);
        else if (top.length < TRIE_TOP_K) top.push(e.w);
      }
    }
    this.ranked = ranked;
    this.trie = trie;
  }
}
