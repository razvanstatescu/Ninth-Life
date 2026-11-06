/**
 * The simulated user (plan section 3.4; spec eval-harness Req 4.1 - 4.3, 4.6).
 *
 * For one gold sentence:
 *  1. Types it in letter mode: one press per letter (apostrophes are free) and one press of 0
 *     between words. The final Speak is not counted (a full keyboard needs it too).
 *  2. Reads the decoder's candidates. If the gold sentence is at rank 0 it just speaks
 *     (0 selections); at rank 1..k-1 it picks it (1 selection, e.g. Alt+rank or one scan
 *     selection).
 *  3. Otherwise it falls back to per-word "next" (#) cycling, starting from the top-1 candidate
 *     (or, if the decoder returned nothing, from each slot's most frequent word): for every
 *     wrong word it presses # until the gold word comes up in the lexicon's reading order for
 *     that code, wrapping around. A gold word missing from the lexicon cannot be reached; that
 *     costs one full cycle and marks the item unreachable.
 *
 * Word accuracy is measured on the top-1 candidate before any correction.
 * KSR = 1 - (presses + selections) / characters, characters = letters + apostrophes + spaces.
 * Scan steps = auto-scan highlight steps to make the same choices on the scan grid.
 */
import { validate, type Lexicon, type Mode } from '@ninth/core';
import { scanSteps, type Target } from './scan-cost';
import type { DecodeOutput, ItemResult, TestItem } from './types';

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((w, i) => w === b[i]);

export function simulate(item: TestItem, out: DecodeOutput, lex: Lexicon, k: number, mode: Mode = 'letter'): ItemResult {
  const gold = item.words;
  const n = gold.length;
  const chars = gold.reduce((s, w) => s + w.length, 0) + (n - 1);

  const targets: Target[] = [];
  let presses = 0;
  item.codes.forEach((code, i) => {
    for (const d of code) targets.push({ key: d });
    presses += code.length;
    if (i < n - 1) {
      targets.push({ key: '0' });
      presses += 1;
    }
  });

  const cands = out.candidates.slice(0, k);
  const rank = cands.findIndex((c) => same(c, gold));
  const top1: string[] = cands[0] ?? item.codes.map((c) => lex.lookup(c)[0] ?? '');
  const wordsCorrect = gold.reduce((s, w, i) => s + (top1[i] === w ? 1 : 0), 0);

  let selections = 0;
  let unreachable = false;
  if (rank > 0) {
    selections = 1;
    targets.push({ candidate: rank });
  } else if (rank < 0) {
    gold.forEach((w, i) => {
      if (top1[i] === w) return;
      const readings = lex.lookup(item.codes[i]!);
      const at = readings.indexOf(top1[i] ?? '');
      const want = readings.indexOf(w);
      let nexts: number;
      if (want < 0) {
        unreachable = true;
        nexts = readings.length;
      } else {
        nexts = at < 0 ? want + 1 : (want - at + readings.length) % readings.length;
      }
      presses += nexts;
      for (let j = 0; j < nexts; j++) targets.push({ key: '#' });
    });
  }

  let invalidRaw = 0;
  let rawCount = 0;
  if (out.raw) {
    rawCount = out.raw.length;
    invalidRaw = out.raw.filter((c) => !validate(c, item.codes, mode)).length;
  }

  return {
    id: item.id,
    words: n,
    wordsCorrect,
    rank,
    chars,
    presses,
    selections,
    scanSteps: scanSteps(targets),
    invalidRaw,
    rawCount,
    unreachable,
    usd: out.usd ?? 0,
  };
}
