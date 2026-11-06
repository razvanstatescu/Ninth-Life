/** Offensive-readings report (spec eval-harness Req 7.1 - 7.3; plan decision D7). */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { encodeWord, type BigramFile, type LexiconFile } from '@ninth/core';
import { analyse, blocklistWords, mask, reportMarkdown, SLUR_SHA256 } from '../src/offensive';
import type { TestItem } from '../src/types';

const bigram: BigramFile = { v: 1, lang: 'en', source: 't', license: 't', bos: '<s>', logp: {}, backoff: {} };
const item = (words: string[]): TestItem => ({ id: words.join('-'), src: 'aac', text: words.join(' '), words, codes: words.map((w) => encodeWord(w)!) });
const meta = { fixtureSha: '0'.repeat(64), lexSha: '1'.repeat(64), bigramSha: '2'.repeat(64) };

describe('offensive-readings report', () => {
  it('Req 7.1 reads single words from the list, normalized, and skips phrases', () => {
    expect(blocklistWords('Foo\nbar baz\n  qux \n\nfoo\nn’t\n')).toEqual(['foo', "n't", 'qux']);
  });

  it('Req 7.1 counts a listed word only when it is shown in the top 5 and is not in the gold sentence', () => {
    const lex: LexiconFile = { v: 1, lang: 'en', source: 't', license: 't', codes: { '5453': [['like', 60], ['kile', 30]], '4': [['i', 70]] } };
    const r = analyse([item(['i', 'like']), item(['i', 'kile'])], lex, bigram, ['kile', 'absent']);
    expect(r.inLexicon).toBe(1);
    const h = r.hits[0]!;
    expect(h).toMatchObject({ code: '5453', rankInCode: 2, readingsInCode: 2, firstReading: 'like', itemsTop5: 1, itemsTop1: 0 });
    expect(r.itemsAny).toBe(1); // the item whose gold is "i kile" does not count
  });

  it('Req 7.2 the report never spells a listed word, not even as another word\'s first reading (property)', () => {
    const word = fc.stringMatching(/^[a-z]{3,9}$/);
    // Another word on the same keys (each letter moved to the next letter of its key), used as the
    // gold word so the listed word is shown as a wrong alternative.
    const KEYS = ['abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
    const sibling = (w: string) => [...w].map((c) => { const k = KEYS.find((x) => x.includes(c))!; return k[(k.indexOf(c) + 1) % k.length]; }).join('');
    fc.assert(
      fc.property(fc.uniqueArray(word, { minLength: 1, maxLength: 6 }), fc.array(fc.integer({ min: 20, max: 60 }), { minLength: 6, maxLength: 6 }), (listed, zs) => {
        const codes: LexiconFile['codes'] = { '4': [['i', 70]] };
        listed.forEach((w, i) => (codes[encodeWord(w)!] ??= []).push([w, zs[i]!]));
        for (const list of Object.values(codes)) list.sort((a, b) => b[1] - a[1]);
        const lex: LexiconFile = { v: 1, lang: 'en', source: 't', license: 't', codes };
        const items = listed.map((w) => item(['i', sibling(w)]));
        const md = reportMarkdown(analyse(items, lex, bigram, listed), meta);
        for (const w of listed) {
          expect(md).not.toMatch(new RegExp(`\\b${w}\\b`));
          expect(md).toContain(mask(w));
        }
      }),
      { numRuns: 100 },
    );
  });

  it('Req 7.2 masks a first reading that is itself listed (example)', () => {
    const lex: LexiconFile = { v: 1, lang: 'en', source: 't', license: 't', codes: { '5453': [['kile', 40], ['jile', 30]], '4': [['i', 70]] } };
    const md = reportMarkdown(analyse([item(['i', 'like'])], lex, bigram, ['kile', 'jile']), meta);
    expect(md).toContain('"k···"');
    expect(md).not.toMatch(/\bkile\b|\bjile\b/);
  });

  it('Req 7.3 the slur marks are SHA-256 hashes, not words', () => {
    expect(SLUR_SHA256.size).toBeGreaterThan(0);
    for (const h of SLUR_SHA256) expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
