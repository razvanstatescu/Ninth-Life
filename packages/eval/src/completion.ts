/**
 * B1c "B1 + Finish the word (top 3)" (web-ui Req 31; improvement plan T1). The simulated user types each
 * word one key at a time. After every key it looks at the words the app would offer: core
 * `rankCompletions` (the shipped function) for the keys so far, after the word the app shows before it,
 * limited to words the word-pair model knows (the app also allows My words and the pack's words; this
 * run has neither). It takes the gold word at the first chance that saves a press: one press, which also
 * closes the word, so it costs keys + 1 against keys + 0 (or keys alone for the last word). Otherwise it
 * types the whole word, then 0. Taken words are pinned, as in the app. The sentence is then decoded with
 * the pins (the app's `decodeWithPins`: the lattice with pinned slots, `beam`, `validate`, top k) and the
 * usual corrections follow (src/simulate.ts). An ideal user: real people will save less.
 */
import { BOS, beam, bigramModel, lattice, rankCompletions, validate, type BigramFile, type LanguageModel, type Lexicon, type LmOptions } from '@ninth/core';
import { simulateWithTargets, type Typing } from './simulate';
import { scanSteps, type Target } from './scan-cost';
import type { ItemResult, TestItem } from './types';

export const B1C = { id: 'B1c', label: 'B1c ghost + finish the word (top 3)' } as const;
const PER_SLOT = 12;

/** Ghost decode with some slots fixed (packages/web/lib/sentence.ts decodeWithPins). */
export function decodePinned(codes: string[], pins: readonly (string | undefined)[], lex: Lexicon, lm: LanguageModel, k: number): string[][] {
  if (codes.length === 0) return [];
  const lat = lattice(codes, lex, PER_SLOT, 'letter').map((slot, i) => (pins[i] ? [pins[i]!] : slot));
  const out: string[][] = [];
  const seen = new Set<string>();
  for (const c of beam(lat, lm, Math.max(32, k), BOS)) {
    if (!validate(c.words, codes, 'letter')) continue;
    const key = c.words.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c.words);
    if (out.length >= k) break;
  }
  return out;
}

export interface CompletionUser {
  lex: Lexicon;
  lm: LanguageModel;
  k: number;
  allow: (w: string) => boolean;
}

export function completionUser(lex: Lexicon, bigram: BigramFile, k: number, lmOpts?: LmOptions): CompletionUser {
  const lm = bigramModel(bigram, lex, lmOpts);
  return { lex, lm, k, allow: (w) => lm.knows?.(w) === true };
}

/** One item: how it is typed with Finish the word, then the usual reading and corrections. */
export function simulateCompletion(item: TestItem, u: CompletionUser): { result: ItemResult; targets: Target[] } {
  const { lex, lm, k, allow } = u;
  const n = item.codes.length;
  const pins: (string | undefined)[] = [];
  const targets: Target[] = [];
  let presses = 0;
  let completed = 0;
  item.codes.forEach((code, i) => {
    const last = i === n - 1;
    // The word the app shows before the open one: the best sentence for the words so far, pins kept.
    const prev = i === 0 ? BOS : (decodePinned(item.codes.slice(0, i), pins.slice(0, i), lex, lm, 1)[0]?.[i - 1] ?? BOS);
    const gold = item.words[i]!;
    let taken = false;
    let typed = 0;
    for (let p = 1; p < code.length; p++) {
      if (code.length - p - (last ? 1 : 0) <= 0) break; // taking it would not save a press
      targets.push({ key: code[p - 1]! });
      presses++;
      typed = p;
      const j = rankCompletions(code.slice(0, p), prev, lex, lm, { allow }).indexOf(gold);
      if (j >= 0) {
        targets.push({ word: j });
        presses++;
        pins[i] = gold;
        completed++;
        taken = true;
        break;
      }
    }
    if (!taken) {
      // Type the rest of the word (the keys already pressed stay), then 0.
      for (const d of code.slice(typed)) targets.push({ key: d });
      presses += code.length - typed;
      if (!last) {
        targets.push({ key: '0' });
        presses++;
      }
    }
  });
  const candidates = decodePinned(item.codes, pins, lex, lm, k);
  const typing: Typing = { presses, targets, completed };
  const out = simulateWithTargets(item, { candidates }, lex, k, 'letter', typing);
  out.result.scanStepsApp = scanSteps(out.targets, 'app');
  return out;
}

