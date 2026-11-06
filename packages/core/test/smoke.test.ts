/**
 * Smoke test against the real data files, when the data teammate has produced them.
 * Skipped when data/lexicon/en.v1.json is absent.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Lexicon, bigramModel, decodeGhost, unigramModel, validate, type BigramFile, type LexiconFile, type LexiconFileV2 } from '../src/index';

const DATA = join(__dirname, '..', '..', '..', 'data', 'lexicon');
const LEX = join(DATA, 'en.v1.json');
const BIGRAM = join(DATA, 'en.bigram.v1.json');
const LEX_V2 = join(DATA, 'en.v2.json');

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

  it.skipIf(!existsSync(LEX) || !existsSync(BIGRAM))('Req 5.8 en.v1.json: no stray one-letter reading in the top 5 for "4 6333 92837" (plan F2)', () => {
    const lex = Lexicon.fromJSON(JSON.parse(readFileSync(LEX, 'utf8')) as LexiconFile);
    const lm = bigramModel(JSON.parse(readFileSync(BIGRAM, 'utf8')) as BigramFile, lex);
    const out = decodeGhost(['4', '6333', '92837'], { lexicon: lex, lm });
    expect(out[0]!.words).toEqual(['i', 'need', 'water']);
    for (const c of out) expect(c.words[0]).toBe('i');
    // Without the penalty "h need water" was rank 5.
    const before = decodeGhost(['4', '6333', '92837'], { lexicon: lex, lm: bigramModel(JSON.parse(readFileSync(BIGRAM, 'utf8')) as BigramFile, lex, { letterPenalty: 0 }) });
    expect(before.map((c) => c.words.join(' '))).toContain('h need water');
  });

  it.skipIf(!existsSync(LEX_V2) || !existsSync(BIGRAM))('Req 2.11 en.v2.json (the file the app ships) decodes "4 6333 92837" to "i need water" first', () => {
    const lex = Lexicon.fromJSON(JSON.parse(readFileSync(LEX_V2, 'utf8')) as LexiconFileV2);
    const lm = bigramModel(JSON.parse(readFileSync(BIGRAM, 'utf8')) as BigramFile, lex);
    expect(lex.size).toBeGreaterThan(40_000);
    expect(decodeGhost(['4', '6333', '92837'], { lexicon: lex, lm })[0]?.words.join(' ')).toBe('i need water');
    expect(lex.completions('54824', 1)).toEqual(['kitchen']);
  });
});
