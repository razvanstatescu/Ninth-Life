/**
 * Build-time data for the website (/welcome). Server only: it reads files with node:fs while the
 * page is statically rendered, so nothing here ships to the browser.
 *
 * - The keypad demo is real output of the offline decoder (@ninth/core decodeGhost on the shipped
 *   lexicon and bigrams), computed once at build time. Nothing in it is typed by hand.
 * - The measured results are read from packages/eval/RESULTS.json, the eval harness's own output,
 *   so the website can only show numbers the harness measured (.kiro/steering/product.md).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Lexicon, bigramModel, decodeGhost, encodeWord, unigramModel, type BigramFile, type LanguageModel, type LexiconFile } from '@ninth/core';

export const REPO_URL = 'https://github.com/razvanstatescu/Ninth-Life';
export const RESULTS_URL = `${REPO_URL}/blob/main/packages/eval/RESULTS.md`;
export const METHOD_URL = `${REPO_URL}/blob/main/docs/architecture/data-and-eval.md#4-evaluation-method`;

/** The fixed example the demo types: one press per letter, 0 between words. */
export const DEMO_WORDS = ['i', 'need', 'water'] as const;

export interface DemoStep {
  /** The key pressed at this step ('0' is space). */
  key: string;
  /** Codes typed so far, one per word ("4", "6333", "928"). */
  codes: string[];
  /** What the offline decoder shows for those codes (top sentence), or null for a code with no word yet. */
  words: (string | null)[];
}

export interface DemoData {
  steps: DemoStep[];
  /** Up to 3 sentences for the full example, best first. */
  candidates: string[];
  /** The final words with their codes, for the proof chips. */
  proof: { word: string; code: string }[];
  /** True when the sentences came from the shipped dictionary at build time. */
  fromDictionary: boolean;
}

function readJson<T>(...parts: string[]): T | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), ...parts), 'utf8')) as T;
  } catch {
    return null;
  }
}

let cached: DemoData | null = null;

export function getDemoData(): DemoData {
  if (cached) return cached;
  const finalCodes = DEMO_WORDS.map((w) => encodeWord(w) ?? '');
  const presses = finalCodes.flatMap((c, i) => (i === 0 ? c.split('') : ['0', ...c.split('')]));

  const file = readJson<LexiconFile>('public', 'data', 'lexicon', 'en.v1.json');
  let lexicon: Lexicon | null = null;
  let lm: LanguageModel | null = null;
  if (file) {
    try {
      lexicon = Lexicon.fromJSON(file);
      const big = readJson<BigramFile>('public', 'data', 'lexicon', 'en.bigram.v1.json');
      lm = big ? bigramModel(big, lexicon) : unigramModel(lexicon);
    } catch {
      lexicon = null;
    }
  }

  const steps: DemoStep[] = [];
  const codes: string[] = [];
  for (const key of presses) {
    if (key === '0') codes.push('');
    else if (codes.length === 0) codes.push(key);
    else codes[codes.length - 1] += key;
    const typed = codes.filter(Boolean);
    let words: (string | null)[] = typed.map(() => null);
    if (lexicon && lm) {
      const best = decodeGhost(typed, { lexicon, lm, k: 1 })[0];
      if (best) words = best.words;
      else {
        // The last code is not a whole word yet: decode the rest and show the top completion.
        const head = typed.length > 1 ? decodeGhost(typed.slice(0, -1), { lexicon, lm, k: 1 })[0]?.words ?? [] : [];
        const tail = lexicon.completions(typed[typed.length - 1]!, 1)[0] ?? null;
        words = [...typed.slice(0, -1).map((_, i) => head[i] ?? null), tail];
      }
    }
    steps.push({ key, codes: [...typed], words });
  }

  const candidates =
    lexicon && lm ? decodeGhost(finalCodes, { lexicon, lm, k: 3 }).map((c) => c.words.join(' ')) : [DEMO_WORDS.join(' ')];
  cached = {
    steps,
    candidates,
    proof: DEMO_WORDS.map((w, i) => ({ word: w, code: finalCodes[i]! })),
    fromDictionary: !!lexicon,
  };
  return cached;
}

/** One config row from RESULTS.json. */
interface ResultConfig {
  id: string;
  label: string;
  status: string;
  metrics?: { items: number; words: number; wordAcc: number; top1: number; top5: number; ksr: number; scanStepsPerChar: number };
}

export interface SiteResults {
  items: number;
  /** B1: offline dictionary with the bigram model (what the app ships). */
  ghost: { wordAcc: string; top1: string; top5: string; scanStepsPerChar: string; ksr: string };
  /** B0: word frequency only, for comparison. */
  dict: { top1: string; top5: string };
  /** True when no model-ranking config has been measured. */
  modelNotRun: boolean;
}

const pct = (x: number) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`;

export function getResults(): SiteResults | null {
  const r = readJson<{ configs: ResultConfig[]; subset?: { items: number } }>('..', 'eval', 'RESULTS.json');
  const b0 = r?.configs.find((c) => c.id === 'B0' && c.status === 'ok')?.metrics;
  const b1 = r?.configs.find((c) => c.id === 'B1' && c.status === 'ok')?.metrics;
  if (!r || !b0 || !b1) return null;
  return {
    items: b1.items,
    ghost: {
      wordAcc: pct(b1.wordAcc),
      top1: pct(b1.top1),
      top5: pct(b1.top5),
      scanStepsPerChar: b1.scanStepsPerChar.toFixed(2),
      ksr: pct(b1.ksr),
    },
    dict: { top1: pct(b0.top1), top5: pct(b0.top5) },
    modelNotRun: !r.configs.some((c) => /^B[234]$/.test(c.id) && c.status === 'ok'),
  };
}
