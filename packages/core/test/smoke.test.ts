/**
 * Smoke test against the real data files, when the data teammate has produced them.
 * Skipped when data/lexicon/en.v1.json is absent.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Lexicon, bigramModel, decodeGhost, unigramModel, validate, type BigramFile, type LexiconFile } from '../src/index';

const DATA = join(__dirname, '..', '..', '..', 'data', 'lexicon');
const LEX = join(DATA, 'en.v1.json');
const BIGRAM = join(DATA, 'en.bigram.v1.json');

describe('core-encoder: real lexicon smoke test', () => {
  it.skipIf(!existsSync(LEX))('Req 5.3 en.v1.json decodes ["4","6333","92837"] to include "i need water"', () => {
    const lex = Lexicon.fromJSON(JSON.parse(readFileSync(LEX, 'utf8')) as LexiconFile);
    expect(lex.size).toBeGreaterThan(1000);
    const models = [unigramModel(lex)];
    if (existsSync(BIGRAM)) models.push(bigramModel(JSON.parse(readFileSync(BIGRAM, 'utf8')) as BigramFile, lex));
    const codes = ['4', '6333', '92837'];
    for (const lm of models) {
      const out = decodeGhost(codes, { lexicon: lex, lm });
      expect(out.map((c) => c.words.join(' '))).toContain('i need water');
      for (const c of out) expect(validate(c.words, codes)).toBe(true);
    }
  });
});
