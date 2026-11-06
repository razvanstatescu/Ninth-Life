/**
 * Spell mode, unknown keys, my words and word packs (web-ui Req 19-22): the pure parts.
 */
import { Lexicon, encodeWord, normalize, validate, unigramModel } from '@ninth/core';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY, actionForKey, composerReducer, type ComposerAction } from '@/lib/composer';
import { MY_WORD_BOOST, applyMyWords, buildDisplayMap, foldWord, makeMyWord, mergeMyWords, showWord, type MyWord } from '@/lib/myWords';
import { buildSentence, decodeAround, decodeWithPins, spellTarget } from '@/lib/sentence';
import { initialChoice, spellOptions, spelledWord, withCapital } from '@/lib/spell';
import { PACK_LIMITS, exportVocabPack, fetchPackText, packUrl, parseVocabPack, planImport } from '@/lib/vocabPack';
import { MINI_LEXICON, miniDict } from './fixtures';

const type = (s: string) => s.split('').map((k) => actionForKey(k as never)!).reduce<typeof EMPTY>((st, a: ComposerAction) => composerReducer(st, a), EMPTY);
const word = (w: string, extra: Partial<MyWord> = {}): MyWord => ({ w: normalize(w), display: w, boost: MY_WORD_BOOST, added: 1, source: 'typed', ...extra });

/** Small deterministic PRNG so the "for any code" checks are repeatable. */
function rng(seed: number) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe('spell mode (web-ui Req 19)', () => {
  it('Req 19.2: one row per key with only that key\'s letters', () => {
    expect(spellOptions('64424')).toEqual([['m', 'n', 'o'], ['g', 'h', 'i'], ['g', 'h', 'i'], ['a', 'b', 'c'], ['g', 'h', 'i']]);
    expect(spellOptions('79')).toEqual([['p', 'q', 'r', 's'], ['w', 'x', 'y', 'z']]);
    expect(spellOptions('')).toEqual([]);
    expect(spellOptions('140')).toEqual([]);
  });

  it('Req 19.3: every choice of letters encodes to the same code (2,000 random codes and choices)', () => {
    const next = rng(42);
    for (let n = 0; n < 2000; n++) {
      const len = 1 + Math.floor(next() * 16);
      const code = Array.from({ length: len }, () => String(2 + Math.floor(next() * 8))).join('');
      const opts = spellOptions(code);
      const choice = opts.map((o) => Math.floor(next() * o.length));
      const w = spelledWord(code, choice);
      expect(w).not.toBeNull();
      expect(encodeWord(w!)).toBe(code);
      expect(validate([w!], [code])).toBe(true);
    }
  });

  it('Req 19.3: a choice that does not fit the code is refused', () => {
    expect(spelledWord('64424', [0, 2, 1])).toBeNull();
    expect(spelledWord('64424', [0, 2, 1, 0, 9])).toBeNull();
  });

  it('Req 19.7: starts from the word on show, else the first letter on each key', () => {
    expect(spelledWord('64424', initialChoice('64424', 'mihai'))).toBe('mihai');
    expect(spelledWord('4663', initialChoice('4663', 'Home'))).toBe('home');
    expect(spelledWord('64424', initialChoice('64424', null))).toBe('mggag');
    // A word for other keys is ignored rather than half-used.
    expect(spelledWord('64424', initialChoice('64424', 'water'))).toBe('mggag');
    expect(withCapital('mihai', true)).toBe('Mihai');
    expect(withCapital('mihai', false)).toBe('mihai');
  });
});

describe('unknown keys (web-ui Req 20)', () => {
  const d = miniDict();

  it('Req 20.1: known slots are still ranked around a slot with no word', () => {
    const st = type('4064424'); // "i" + an unknown word (open)
    expect(decodeWithPins(st, d.lexicon, d.lm)).toEqual([]);
    expect(decodeAround(st, d.lexicon, d.lm)).toEqual(['i', null]);
    const st2 = type('6442406333'); // unknown word, then "need"
    expect(decodeAround(st2, d.lexicon, d.lm)).toEqual([null, 'need']);
  });

  it('Req 20.2: a slot with neither a dictionary nor a spelled word shows its digits, not spelled yet, and blocks Speak', () => {
    const st = composerReducer(type('4064424'), { type: 'space' });
    const s = buildSentence(st, [], d.lexicon, 'letter', { fallback: decodeAround(st, d.lexicon, d.lm) });
    expect(s.words.map((w) => w.state)).toEqual(['match', 'unspelled']);
    expect(s.tokens).toEqual(['I', '64424']);
    expect(s.speakable).toBe(false);
    expect(spellTarget(s.words)).toBe(1);
  });

  it('Req 20.1 + 20.4: once spelled, full sentences are listed and every one validates; the spelled word is new', () => {
    let st = type('4064424');
    st = composerReducer(st, { type: 'pin', index: 1, word: 'mihai' });
    const cands = decodeWithPins(st, d.lexicon, d.lm);
    expect(cands.length).toBeGreaterThan(0);
    for (const c of cands) {
      expect(validate(c.words, ['4', '64424'])).toBe(true);
      expect(c.words[1]).toBe('mihai');
    }
    const s = buildSentence(st, cands, d.lexicon, 'letter', { display: new Map([['mihai', 'Mihai']]) });
    expect(s.text).toBe('I Mihai');
    expect(s.words[1]?.state).toBe('new');
    expect(s.speakable).toBe(true);
  });

  it('Req 20.2: an open word that may still grow stays "typing"', () => {
    const st = type('4092');
    const s = buildSentence(st, [], d.lexicon, 'letter', { fallback: decodeAround(st, d.lexicon, d.lm) });
    expect(s.words[1]?.state).toBe('typing');
    expect(s.words[1]?.partial).toBe('wa');
  });

  it('Req 20.4: a spelled pin with typing after it is dropped, so a stale word is never spoken', () => {
    let st = type('4064424');
    st = composerReducer(st, { type: 'pin', index: 1, word: 'mihai' });
    st = composerReducer(st, { type: 'digit', digit: '2' });
    expect(st.slots[1]).toEqual({ code: '644242' });
  });
});

describe('my words (web-ui Req 21)', () => {
  it('Req 21.5: folds for the lexicon and keeps the spelling for display', () => {
    expect(foldWord('Mihai')).toEqual({ w: 'mihai', display: 'Mihai' });
    expect(foldWord('  Ștefan ')).toEqual({ w: 'stefan', display: 'Ștefan' });
    expect(foldWord("O'Neil")).toEqual({ w: "o'neil", display: "O'Neil" });
    expect(foldWord('')).toEqual({ error: 'Type a word first.' });
    expect('error' in foldWord('two words')).toBe(true);
    expect('error' in foldWord('r2d2')).toBe(true);
    expect('error' in foldWord('a'.repeat(33))).toBe(true);
    expect('error' in foldWord("'tis")).toBe(true);
  });

  it('Req 21.5: the display map changes the text only, never the words', () => {
    const map = buildDisplayMap([word('Mihai'), word('ana', { display: 'ana' })], [{ w: 'ana', display: 'Ana' }]);
    expect(showWord('mihai', map)).toBe('Mihai');
    expect(showWord('ana', map)).toBe('Ana');
    expect(showWord('water', map)).toBe('water');
    // A display that does not fold back to the word is ignored.
    expect(buildDisplayMap([{ w: 'mihai', display: 'Mike' }]).size).toBe(0);
  });

  it('Req 21.4: added words are boosted with addWords so they rank, and are known to the proof check', () => {
    const lex = Lexicon.fromJSON(MINI_LEXICON);
    expect(lex.lookup('64424')).toEqual([]);
    applyMyWords(lex, [word('Mihai'), word('home')]);
    expect(lex.lookup('64424')).toEqual(['mihai']);
    expect(lex.has('mihai')).toBe(true);
    expect(lex.lookup('4663')[0]).toBe('home'); // 5.8 + 2 > good 6.0
    const st = type('4064424');
    const s = buildSentence(st, decodeWithPins(st, lex, unigramModel(lex)), lex);
    expect(s.text).toBe('I mihai');
    expect(s.words.map((w) => w.state)).toEqual(['match', 'match']);
  });

  it('Req 21.1: merging keeps one entry per word, the newest spelling and the largest boost', () => {
    const merged = mergeMyWords([word('mihai', { boost: 3 })], [word('Mihai', { boost: 1, added: 2 })]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ w: 'mihai', display: 'Mihai', boost: 3 });
    const m = makeMyWord('Ana', 'spelled', 2, 5);
    expect(m).toEqual({ w: 'ana', display: 'Ana', boost: 2, added: 5, source: 'spelled' });
  });
});

describe('word packs (web-ui Req 22)', () => {
  const example = {
    id: 'family-example',
    lang: 'en',
    version: 2,
    words: [
      { w: 'Ana', boost: 2 },
      { w: 'Mihai', boost: 2 },
      { w: 'Bucharest', boost: 1 },
      { w: 'water', boost: 1 },
      { w: 'mihai', boost: 3 },
    ],
    phrases: ['Call Ana, please.', 'I want to go to Bucharest.'],
  };

  it('Req 22.2 + 22.4: a valid pack parses, folds words, keeps capitals, merges duplicates', () => {
    const r = parseVocabPack(JSON.stringify(example));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pack.words).toEqual([
      { w: 'ana', display: 'Ana', boost: 2 },
      { w: 'mihai', display: 'Mihai', boost: 3 },
      { w: 'bucharest', display: 'Bucharest', boost: 1 },
      { w: 'water', display: 'water', boost: 1 },
    ]);
    expect(r.pack.phrases).toEqual(example.phrases);
    expect(r.pack.skipped).toEqual([]);
  });

  it('Req 22.2: the shape is checked and wrong packs are refused as a whole', () => {
    const bad = (v: unknown) => {
      const r = parseVocabPack(typeof v === 'string' ? v : JSON.stringify(v));
      expect(r.ok).toBe(false);
      return r.ok ? '' : r.error;
    };
    expect(bad('{not json')).toMatch(/not a word pack/);
    expect(bad([1, 2])).toMatch(/not a word pack/);
    expect(bad({ ...example, words: undefined })).toMatch(/not a word pack/);
    expect(bad({ ...example, id: '' })).toMatch(/id/);
    expect(bad({ ...example, id: 'x'.repeat(65) })).toMatch(/id/);
    expect(bad({ ...example, lang: 'ro' })).toMatch(/"ro"/);
    expect(bad({ ...example, version: 0 })).toMatch(/version/);
    expect(bad({ ...example, version: 1.5 })).toMatch(/version/);
    expect(bad({ ...example, phrases: 'hello' })).toMatch(/phrases/);
    expect(bad({ ...example, words: Array.from({ length: PACK_LIMITS.words + 1 }, () => ({ w: 'a', boost: 0 })) })).toMatch(/5,000 words/);
    expect(bad({ ...example, phrases: Array.from({ length: PACK_LIMITS.phrases + 1 }, () => 'hi') })).toMatch(/1,000 phrases/);
    expect(bad('x'.repeat(PACK_LIMITS.bytes + 1))).toMatch(/1 MB/);
  });

  it('Req 22.2: entries that cannot be typed are left out and listed', () => {
    const r = parseVocabPack({
      ...example,
      words: [{ w: 'Ana' }, { w: 'r2d2' }, { w: 'two words' }, { w: 'x'.repeat(33) }, { w: 'Ana', boost: 'high' }, 'Mihai', { w: 'Big', boost: 99 }],
      phrases: ['ok', 'x'.repeat(281), 7, '  ', 'ok'],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pack.words).toEqual([
      { w: 'ana', display: 'Ana', boost: 1 },
      { w: 'big', display: 'Big', boost: 3 },
    ]);
    expect(r.pack.phrases).toEqual(['ok']);
    expect(r.pack.skipped.map((s) => s.reason)).toEqual([
      'use letters only',
      'one word at a time, with no spaces',
      'a word can have at most 32 letters',
      'boost must be a number',
      'not a word entry ({ "w": "word", "boost": 1 })',
      'longer than 280 characters',
      'a phrase must be text',
    ]);
  });

  it('Req 22.3: the plan shows new, updated and unchanged words and phrases before anything is added', () => {
    const r = parseVocabPack(example);
    if (!r.ok) throw new Error(r.error);
    const lex = Lexicon.fromJSON(MINI_LEXICON);
    const plan = planImport(r.pack, [word('ana', { display: 'ana', boost: 2 }), word('Bucharest', { boost: 1 })], ['Call Ana, please.'], lex);
    expect(plan.add.map((x) => x.display)).toEqual(['Mihai', 'water']);
    expect(plan.known).toBe(1);
    expect(plan.update.map((x) => x.display)).toEqual(['Ana']);
    expect(plan.same.map((x) => x.display)).toEqual(['Bucharest']);
    expect(plan.phrasesNew).toEqual(['I want to go to Bucharest.']);
    expect(plan.phrasesExisting).toEqual(['Call Ana, please.']);
  });

  it('Req 22.1 + 22.4: export writes the contract shape with the person\'s spelling, and imports back the same', () => {
    const pack = exportVocabPack([word('Mihai'), word('Ana', { boost: 1 })], ['Call Ana, please.']);
    expect(pack).toEqual({
      id: 'my-words',
      lang: 'en',
      version: 1,
      words: [
        { w: 'Ana', boost: 1 },
        { w: 'Mihai', boost: 2 },
      ],
      phrases: ['Call Ana, please.'],
    });
    const back = parseVocabPack(JSON.stringify(pack));
    expect(back.ok && back.pack.words.map((x) => x.display)).toEqual(['Ana', 'Mihai']);
  });

  it('Req 22.1: links must be https; a GitHub page link becomes its raw file', () => {
    expect(packUrl('https://raw.githubusercontent.com/a/b/main/pack.json')).toEqual({ url: 'https://raw.githubusercontent.com/a/b/main/pack.json' });
    expect(packUrl('https://github.com/a/b/blob/main/packs/family.json')).toEqual({ url: 'https://raw.githubusercontent.com/a/b/main/packs/family.json' });
    expect('error' in packUrl('http://example.com/p.json')).toBe(true);
    expect('error' in packUrl('ftp://example.com/p.json')).toBe(true);
    expect('error' in packUrl('https://user:pw@example.com/p.json')).toBe(true);
    expect('error' in packUrl('pack.json')).toBe(true);
    expect(packUrl('http://localhost:3301/p.json')).toEqual({ url: 'http://localhost:3301/p.json' });
  });

  it('Req 22.5: fetching sends no cookies and no referrer, and reports failures plainly', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => '{"x":1}' }));
    await expect(fetchPackText('https://example.com/p.json', { fetchImpl })).resolves.toBe('{"x":1}');
    expect(fetchImpl).toHaveBeenCalledWith('https://example.com/p.json', expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }));
    const notFound = vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => null }, text: async () => '' }));
    await expect(fetchPackText('https://example.com/p.json', { fetchImpl: notFound })).rejects.toThrow(/error 404/);
    const big = vi.fn(async () => ({ ok: true, status: 200, headers: { get: () => String(PACK_LIMITS.bytes + 1) }, text: async () => '' }));
    await expect(fetchPackText('https://example.com/p.json', { fetchImpl: big })).rejects.toThrow(/1 MB/);
    const down = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(fetchPackText('https://example.com/p.json', { fetchImpl: down })).rejects.toThrow(/could not be fetched/);
  });
});
