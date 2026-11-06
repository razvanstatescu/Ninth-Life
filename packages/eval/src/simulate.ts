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
 *
 * Initials mode (plan section 3.3 "Phantom mode"; spec Req 9.1): one press per word, on the key
 * of its first letter, and 0 between words. `item.codes` stay the letter codes; the decoder gets
 * `initialsCodes(item)`. The # fallback cycles the slot's readings exactly as the app does
 * (`readings()` in packages/web/lib/sentence.ts: the 12 likeliest words on that key). A gold word
 * that is not among them is retyped in letter mode: its full letter code plus # presses in letter
 * order, on top of the initial already pressed (counted in `retyped`).
 */
import { lattice, validate, type Lexicon, type Mode } from '@ninth/core';
import { scanSteps, type Target } from './scan-cost';
import type { DecodeOutput, ItemResult, TestItem } from './types';

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((w, i) => w === b[i]);

/** Readings the app cycles with # in initials mode (packages/web/lib/sentence.ts READINGS_PER_SLOT). */
export const INITIALS_READINGS = 12;

/** One-digit codes for initials mode: the key of each word's first letter. */
export function initialsCodes(item: Pick<TestItem, 'codes'>): string[] {
  return item.codes.map((c) => c.slice(0, 1));
}

/** The codes a decoder receives for this item in this mode. */
export function codesFor(item: Pick<TestItem, 'codes'>, mode: Mode): string[] {
  return mode === 'initials' ? initialsCodes(item) : item.codes;
}

/** # presses to go from `from` to `want` in a reading list, wrapping; -1 if `want` is absent. */
function cycleDistance(readings: readonly string[], from: string, want: string): number {
  const to = readings.indexOf(want);
  if (to < 0) return -1;
  const at = readings.indexOf(from);
  return at < 0 ? to + 1 : (to - at + readings.length) % readings.length;
}

export function simulate(item: TestItem, out: DecodeOutput, lex: Lexicon, k: number, mode: Mode = 'letter'): ItemResult {
  const gold = item.words;
  const n = gold.length;
  const chars = gold.reduce((s, w) => s + w.length, 0) + (n - 1);
  const codes = codesFor(item, mode);

  const targets: Target[] = [];
  let presses = 0;
  codes.forEach((code, i) => {
    for (const d of code) targets.push({ key: d });
    presses += code.length;
    if (i < n - 1) {
      targets.push({ key: '0' });
      presses += 1;
    }
  });

  const firstReading = (i: number) =>
    mode === 'initials' ? (lattice([codes[i]!], lex, 1, 'initials')[0]?.[0] ?? '') : (lex.lookup(item.codes[i]!)[0] ?? '');
  const cands = out.candidates.slice(0, k);
  const rank = cands.findIndex((c) => same(c, gold));
  const top1: string[] = cands[0] ?? codes.map((_, i) => firstReading(i));
  const wordsCorrect = gold.reduce((s, w, i) => s + (top1[i] === w ? 1 : 0), 0);

  let selections = 0;
  let unreachable = false;
  let retyped = 0;
  const pressNext = (count: number) => {
    presses += count;
    for (let j = 0; j < count; j++) targets.push({ key: '#' });
  };
  if (rank > 0) {
    selections = 1;
    targets.push({ candidate: rank });
  } else if (rank < 0) {
    gold.forEach((w, i) => {
      if (top1[i] === w) return;
      const letterReadings = lex.lookup(item.codes[i]!);
      if (mode === 'initials') {
        const nexts = cycleDistance(lattice([codes[i]!], lex, INITIALS_READINGS, 'initials')[0] ?? [], top1[i] ?? '', w);
        if (nexts >= 0) return pressNext(nexts);
        // Not among the initials readings: retype the word in letter mode.
        retyped++;
        for (const d of item.codes[i]!) targets.push({ key: d });
        presses += item.codes[i]!.length;
        const letterNexts = letterReadings.indexOf(w);
        if (letterNexts < 0) {
          unreachable = true;
          return pressNext(letterReadings.length);
        }
        return pressNext(letterNexts);
      }
      const nexts = cycleDistance(letterReadings, top1[i] ?? '', w);
      if (nexts < 0) {
        unreachable = true;
        return pressNext(letterReadings.length);
      }
      pressNext(nexts);
    });
  }

  let invalidRaw = 0;
  let rawCount = 0;
  if (out.raw) {
    rawCount = out.raw.length;
    invalidRaw = out.raw.filter((c) => !validate(c, codes, mode)).length;
  }

  const result: ItemResult = {
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
  if (mode === 'initials') result.retyped = retyped;
  return result;
}
