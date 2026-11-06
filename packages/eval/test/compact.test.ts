/**
 * The compact lexicon (data/lexicon/en.v2.json, ADR-data-003) is the same dictionary as en.v1.json:
 * spec eval-harness Req 5.9 and core-encoder Req 2.11. The eval keeps reading v1 (eval.lock pins it);
 * these checks are why the web app may ship v2 without changing any eval number.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Lexicon, encodeWord, type LexiconFile, type LexiconFileV2 } from '@ninth/core';
import { PATHS, sha256 } from '../src/fixture';

const have = existsSync(PATHS.lexicon) && existsSync(PATHS.lexiconV2);

/** v1 -> v2 the way build_lexicon.py compact_lexicon() does it, minus the header. */
function compactWords(v1: LexiconFile): [number, string][] {
  const groups = new Map<number, string[]>();
  // Object.keys visits the codes in the order fromJSON loads them (js_code_order in the builder).
  for (const code of Object.keys(v1.codes))
    for (const [w, z] of v1.codes[code]!) {
      const g = groups.get(z);
      if (g) g.push(w);
      else groups.set(z, [w]);
    }
  return [...groups.keys()].sort((a, b) => b - a).map((z) => [z, groups.get(z)!.join(' ')]);
}

describe.skipIf(!have)('data/lexicon/en.v2.json (LexiconFileV2)', () => {
  const v1Bytes = have ? readFileSync(PATHS.lexicon) : Buffer.alloc(0);
  const v1 = have ? (JSON.parse(v1Bytes.toString('utf8')) as LexiconFile) : null!;
  const v2 = have ? (JSON.parse(readFileSync(PATHS.lexiconV2, 'utf8')) as LexiconFileV2 & { derived_from: { sha256: string } }) : null!;

  it('Req 5.9 has the contract header, the license, and names the v1 file it was built from', () => {
    expect(v2.v).toBe(2);
    expect(v2.lang).toBe(v1.lang);
    expect(v2.license).toBe('CC-BY-SA-4.0');
    expect(v2.source.startsWith(v1.source)).toBe(true);
    expect(v2.derived_from.sha256).toBe(sha256(v1Bytes));
  });

  it('Req 5.9 holds exactly the v1 words and frequencies, in the documented order (determinism)', () => {
    expect(v2.words).toEqual(compactWords(v1));
  });

  it('Req 2.11 loads to the same Lexicon as v1: size, every lookup list, every zipf', () => {
    const a = Lexicon.fromJSON(v1);
    const b = Lexicon.fromJSON(v2);
    expect(b.size).toBe(a.size);
    for (const [code, list] of Object.entries(v1.codes)) {
      expect(b.lookup(code)).toEqual(a.lookup(code));
      for (const [w] of list) expect(b.zipf(w)).toBe(a.zipf(w));
    }
    // Same load order, so the same tie-breaks: completions agree word for word (initials mode reads 12).
    const codes = Object.keys(v1.codes);
    for (let i = 0; i < codes.length; i += 25)
      for (let n = 1; n <= codes[i]!.length; n++) {
        const p = codes[i]!.slice(0, n);
        expect(b.completions(p, 12)).toEqual(a.completions(p, 12));
      }
    for (const w of ['i', 'need', 'water', "isn't"]) expect(b.lookup(encodeWord(w)!)).toContain(w);
  });
});
