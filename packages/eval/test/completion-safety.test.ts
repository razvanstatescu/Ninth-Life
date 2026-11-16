// Finish the word never offers an offensive word unasked (web-ui Req 31.7; spec r6 2-word-completion AC 17).
// For every 1-3 key prefix, after the start of a sentence and after a few common words, none of the words
// rankCompletions offers (with the app's `allow`: words the word-pair model knows) is an identity slur
// (the committed hash list, always checked) or on the LDNOOBW list (checked when `pnpm data:fetch` has
// put it in .cache/). The words themselves are never printed: a failure names the hash only.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOS, Lexicon, bigramModel, rankCompletions, type BigramFile, type LexiconFile, type LexiconFileV2 } from '@ninth/core';
import { BLOCKLIST, SLUR_LIST, blocklistWords } from '../src/offensive';
import { PATHS, REPO_ROOT } from '../src/fixture';
import { join } from 'node:path';

const LEX_V2 = join(REPO_ROOT, 'data', 'lexicon', 'en.v2.json');
const sha = (w: string) => createHash('sha256').update(w).digest('hex');
const DIGITS = ['2', '3', '4', '5', '6', '7', '8', '9'];
const prefixes = (() => {
  const out: string[] = [...DIGITS];
  for (const a of DIGITS) for (const b of DIGITS) out.push(a + b);
  for (const a of DIGITS) for (const b of DIGITS) for (const c of DIGITS) out.push(a + b + c);
  return out;
})();
const PREVS = [BOS, 'i', 'you', 'the', 'a', 'he', 'she', 'they', 'my', 'your', 'what', 'is', 'are', 'so'];

describe('Req 31.7 Finish the word offers no offensive word (AC 17)', () => {
  const lex = Lexicon.fromJSON(JSON.parse(readFileSync(existsSync(LEX_V2) ? LEX_V2 : PATHS.lexicon, 'utf8')) as LexiconFile | LexiconFileV2);
  const lm = bigramModel(JSON.parse(readFileSync(PATHS.bigram, 'utf8')) as BigramFile, lex);
  const allow = (w: string) => lm.knows?.(w) ?? false;
  const offered = new Set<string>();
  for (const prev of PREVS) for (const p of prefixes) for (const w of rankCompletions(p, prev, lex, lm, { allow })) offered.add(w);

  it('offers words at all (sanity)', () => {
    expect(offered.size).toBeGreaterThan(200);
  });

  it('no identity slur (hash list) is ever offered', () => {
    const slurs = new Set(SLUR_LIST.words.map((x) => x.sha256));
    const hits = [...offered].map(sha).filter((h) => slurs.has(h));
    expect(hits, `offered slur hashes: ${hits.join(', ')}`).toEqual([]);
  });

  it.skipIf(!existsSync(BLOCKLIST.path))('no word on the LDNOOBW list is offered', () => {
    const listed = new Set(blocklistWords(readFileSync(BLOCKLIST.path, 'utf8')));
    const hits = [...offered].filter((w) => listed.has(w)).map(sha);
    expect(hits, `offered listed-word hashes: ${hits.join(', ')}`).toEqual([]);
  });
});
