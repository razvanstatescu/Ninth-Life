/**
 * Contract checks on the committed data files (spec eval-harness Req 5.1 - 5.5; properties P4-P6).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bigramModel, encodeWord, Lexicon, normalize, type BigramFile, type LexiconFile, type LexiconFileV2 } from '@ninth/core';
import { PATHS, REPO_ROOT, sha256 } from '../src/fixture';
import { isListedSlur, SLUR_LIST } from '../src/offensive';

const lexFile = JSON.parse(readFileSync(PATHS.lexicon, 'utf8')) as LexiconFile;
const bigFile = JSON.parse(readFileSync(PATHS.bigram, 'utf8')) as BigramFile;
const pack = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'packs', 'core-en.json'), 'utf8')) as {
  id: string;
  lang: string;
  version: number;
  words: { w: string; boost: number }[];
  phrases: string[];
};

describe('data/lexicon/en.v1.json (LexiconFile)', () => {
  it('has the contract header', () => {
    expect(lexFile.v).toBe(1);
    expect(lexFile.lang).toBe('en');
    expect(lexFile.license).toBe('CC-BY-SA-4.0');
    expect(lexFile.source).toContain('wordfreq 3.1.1');
  });

  it('files every word under its own code, normalized, once, as [word, int zipfX10] sorted desc', () => {
    const seen = new Set<string>();
    let n = 0;
    for (const [code, list] of Object.entries(lexFile.codes)) {
      expect(list.length).toBeGreaterThan(0);
      for (let i = 0; i < list.length; i++) {
        const [w, z] = list[i]!;
        expect(normalize(w)).toBe(w);
        expect(encodeWord(w)).toBe(code);
        expect(Number.isInteger(z)).toBe(true);
        expect(z).toBeGreaterThanOrEqual(20);
        if (i > 0) expect(list[i - 1]![1]).toBeGreaterThanOrEqual(z);
        expect(seen.has(w)).toBe(false);
        seen.add(w);
        n++;
      }
    }
    expect(n).toBeGreaterThanOrEqual(40_000);
  });

  it('contains no banned third-party trademark (or its possessive), checked by hash', () => {
    // Same SHA-256 list as scripts/build_lexicon.py BANNED_SHA256 (.kiro/steering/trademarks.md).
    const banned = new Set([
      '2ab6d53e717a0e0d773ccfdb8b0e84ac494729c6b567c72d256b883a9db17ea8',
      '48c2b33eeb8d9f12837d045394028ae014ab0b43bcb1e094bcff764fba3504d3',
      '5ed4c844477205875f8cdeaf2e8ea50580fe302eb0812afc98966916440eebac',
      'ef46a230cfb0c087fdd8883bc989a3eaa253428f9f6033335e0cee7173c42a92',
    ]);
    const hits = Object.values(lexFile.codes)
      .flat()
      .map(([w]) => w)
      .filter((w) => banned.has(sha256(w)) || banned.has(sha256(w.split("'")[0]!)));
    expect(hits).toEqual([]);
  });

  it('Req 5.10 contains no identity slur from the D7 list (or its possessive), checked by hash, in v1 or the shipped v2', () => {
    // scripts/slurs.sha256.json, the list build_lexicon.py --slurs drop uses (ADR-data-004).
    expect(SLUR_LIST.words.length).toBeGreaterThan(0);
    for (const { sha256: h, code } of SLUR_LIST.words) {
      expect(h).toMatch(/^[0-9a-f]{64}$/);
      expect(code).toMatch(/^[2-9]+$/);
    }
    const v1 = Object.values(lexFile.codes).flat().map(([w]) => w);
    const v2File = JSON.parse(readFileSync(PATHS.lexiconV2, 'utf8')) as LexiconFileV2;
    const v2 = v2File.words.flatMap(([, ws]) => ws.split(' '));
    // Hash prefixes only, so a failure never prints the word.
    const hits = [...v1, ...v2].filter(isListedSlur).map((w) => sha256(w).slice(0, 8));
    expect(hits).toEqual([]);
    expect(v2.length).toBe(v1.length);
  });

  it('Req 5.10 keeps general profanity, which D7 does not filter (hash of a common one)', () => {
    // A mild, frequent swear word that is on LDNOOBW but marked "other" (reports/offensive-readings.md).
    const kept = '85fc17f7069acd39a5c636cd0a6530651096128da447959f5e250824857dc559';
    expect(Object.values(lexFile.codes).flat().some(([w]) => sha256(w) === kept)).toBe(true);
  });

  it('loads in @ninth/core without dropping words', () => {
    const lex = Lexicon.fromJSON(lexFile);
    const n = Object.values(lexFile.codes).reduce((s, l) => s + l.length, 0);
    expect(lex.size).toBe(n);
    expect(lex.lookup('4663').slice(0, 2)).toEqual(['good', 'home']);
    expect(lex.lookup('4768')).toContain("isn't");
  });
});

describe('data/lexicon/en.bigram.v1.json (BigramFile)', () => {
  const lex = Lexicon.fromJSON(lexFile);

  it('has the contract header', () => {
    expect(bigFile.v).toBe(1);
    expect(bigFile.bos).toBe('<s>');
    expect(bigFile.license).toBe('CC-BY-SA-4.0');
    expect(bigFile.source).toContain('train');
  });

  it('stores log10 values <= 0 with at most 2 decimals, over lexicon words only', () => {
    for (const [prev, row] of Object.entries(bigFile.logp)) {
      expect(prev === '<s>' || lex.has(prev)).toBe(true);
      expect(typeof bigFile.backoff[prev]).toBe('number');
      for (const [w, lp] of Object.entries(row)) {
        expect(lex.has(w)).toBe(true);
        expect(lp).toBeLessThanOrEqual(0);
        expect(Math.round(lp * 100) / 100).toBe(lp);
      }
    }
    for (const bo of Object.values(bigFile.backoff)) {
      expect(bo).toBeLessThanOrEqual(0);
      expect(Math.round(bo * 100) / 100).toBe(bo);
    }
  });

  it('is roughly normalised for frequent contexts under core bigramModel', () => {
    // Sum over the whole lexicon of P(w | prev) should be close to the unigram mass (<= 1).
    const lm = bigramModel(bigFile, lex);
    const words = Object.values(lexFile.codes).flat().map(([w]) => w);
    for (const prev of ['<s>', 'i', 'you']) {
      let mass = 0;
      for (const w of words) mass += 10 ** lm.logP(prev, w);
      expect(mass).toBeGreaterThan(0.5);
      expect(mass).toBeLessThan(1.1);
    }
  });

  it('prefers conversational readings after <s>', () => {
    const lm = bigramModel(bigFile, lex);
    expect(lm.logP('<s>', 'i')).toBeGreaterThan(lm.logP('<s>', 'g'));
    expect(lm.logP('i', 'need')).toBeGreaterThan(lm.logP('i', 'mead'));
  });
});

describe('data/packs/core-en.json (VocabPack)', () => {
  const lex = Lexicon.fromJSON(lexFile);

  it('has the VocabPack shape with the 36 Universal Core words', () => {
    expect(pack).toMatchObject({ id: 'core-en', lang: 'en', version: 1 });
    expect(pack.words).toHaveLength(36);
    for (const { w, boost } of pack.words) {
      expect(lex.has(w)).toBe(true);
      expect(boost).toBeGreaterThanOrEqual(0);
    }
    expect(new Set(pack.words.map((x) => x.w)).size).toBe(36);
  });

  it('has 100-200 short phrases whose words are all typable and known', () => {
    expect(pack.phrases.length).toBeGreaterThanOrEqual(100);
    expect(pack.phrases.length).toBeLessThanOrEqual(200);
    for (const p of pack.phrases) {
      const words = normalize(p)
        .split(/[^a-z']+/)
        .map((w) => w.replace(/^'+|'+$/g, ''))
        .filter(Boolean);
      expect(words.length).toBeGreaterThan(0);
      expect(words.length).toBeLessThanOrEqual(6);
      for (const w of words) expect(lex.has(w), `${w} in "${p}"`).toBe(true);
    }
  });

  it('does not reorder any first reading when the boost is applied', () => {
    const boosted = Lexicon.fromJSON(lexFile);
    boosted.addWords(pack.words);
    for (const { w } of pack.words) {
      const code = encodeWord(w)!;
      expect(boosted.lookup(code)[0]).toBe(lex.lookup(code)[0]);
    }
  });
});
