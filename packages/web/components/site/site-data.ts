/**
 * Build-time data for the website at / (marketing-site design.md "Build-time data"). Server only: it
 * reads files with node:fs while the page is statically rendered, so nothing here ships to the
 * browser except the plain values passed down as props.
 *
 * - The keypad demo, the How it works drawing and the proof example are real output of the offline
 *   decoder (@ninth/core decodeGhost and encodeWord on the shipped lexicon and bigrams), computed once
 *   at build time. Nothing in them is typed by hand (MS-6.2, MS-7.4, MS-7.6).
 * - The measured results are read from packages/eval/RESULTS.json and RESULTS.llm.json, the eval
 *   harness's own output, so the website can only show numbers the harness measured
 *   (.kiro/steering/product.md, MS-5). Model names are used only to count runs and to find their
 *   provider; they are never returned (MS-5.3, D14).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Lexicon, bigramModel, decodeGhost, encodeWord, unigramModel, type BigramFile, type LanguageModel, type LexiconFile } from '@ninth/core';
import { MODEL_PROFILES, isModelId } from '@ninth/decoder';

export const REPO_URL = 'https://github.com/razvanstatescu/Ninth-Life';
export const RESULTS_URL = `${REPO_URL}/blob/main/packages/eval/RESULTS.md`;
export const METHOD_URL = `${REPO_URL}/blob/main/docs/architecture/data-and-eval.md#4-evaluation-method`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const NOTICE_URL = `${REPO_URL}/blob/main/data/NOTICE.md`;

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

/**
 * Reads the first candidate path (relative to process.cwd()) that exists. Returns the parsed JSON,
 * `undefined` when no candidate file exists, or `null` when a file exists but none parses.
 */
export type JsonReader = (...candidates: string[][]) => unknown;

export const readJson: JsonReader = (...candidates) => {
  let found = false;
  for (const parts of candidates) {
    let text: string;
    try {
      text = readFileSync(join(process.cwd(), ...parts), 'utf8');
    } catch {
      continue;
    }
    found = true;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      /* try the next candidate */
    }
  }
  return found ? null : undefined;
};

/** public/data (copied by scripts/copy-data.mjs) first, then the repo's data/ (the source of truth). */
const lexiconPath = (file: string): string[][] => [
  ['public', 'data', 'lexicon', file],
  ['..', '..', 'data', 'lexicon', file],
];

export interface Dictionary {
  lexicon: Lexicon;
  lm: LanguageModel;
}

let dictionaryCache: Dictionary | null | undefined;

/** The shipped dictionary (en.v1, which loads to the same Lexicon as the app's en.v2), or null. */
function dictionary(): Dictionary | null {
  if (dictionaryCache !== undefined) return dictionaryCache;
  dictionaryCache = null;
  const file = readJson(...lexiconPath('en.v1.json')) as LexiconFile | null | undefined;
  if (file) {
    try {
      const lexicon = Lexicon.fromJSON(file);
      const big = readJson(...lexiconPath('en.bigram.v1.json')) as BigramFile | null | undefined;
      dictionaryCache = { lexicon, lm: big ? bigramModel(big, lexicon) : unigramModel(lexicon) };
    } catch {
      dictionaryCache = null;
    }
  }
  if (!dictionaryCache) console.warn('[site] the lexicon is missing or invalid; the demo shows digits only');
  return dictionaryCache;
}

/** Sentence case for the words the demo shows: "i need water" becomes "I need water". */
export function sentenceCase(words: readonly (string | null)[]): string {
  const text = words.filter((w): w is string => !!w).join(' ');
  return text.replace(/\bi\b/g, 'I').replace(/^./, (c) => c.toUpperCase());
}

let demoCache: DemoData | null = null;

export function getDemoData(): DemoData {
  if (demoCache) return demoCache;
  const finalCodes = DEMO_WORDS.map((w) => encodeWord(w) ?? '');
  const presses = finalCodes.flatMap((c, i) => (i === 0 ? c.split('') : ['0', ...c.split('')]));

  const dict = dictionary();
  const lexicon = dict?.lexicon ?? null;
  const lm = dict?.lm ?? null;

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
  demoCache = {
    steps,
    candidates,
    proof: DEMO_WORDS.map((w, i) => ({ word: w, code: finalCodes[i]! })),
    fromDictionary: !!lexicon,
  };
  return demoCache;
}

/** The demo's finished sentence ("I need water"), for the Show drawing. */
export function finishedSentence(demo: DemoData): string {
  const last = demo.steps[demo.steps.length - 1];
  return (last && sentenceCase(last.words)) || sentenceCase(DEMO_WORDS);
}

/** The demo's finished keys, one code per word ("4 6333 92837"), for the conversation drawings. */
export function finishedKeys(demo: DemoData): string {
  return demo.proof.map((p) => p.code).join(' ');
}

/** A loaded dictionary, or null for none. Tests pass their own to reach the throw and fallback cases. */
export type SiteDictionary = Dictionary | null;

export interface HowData {
  code: '4663';
  /** The well after each press (4, 46, 466, 4663), sentence case, decoded as the hero demo does. */
  typing: [string, string, string, string];
  /** The top 3 sentences for 4663, best first. */
  sentences: string[];
  /** Index in `sentences` of "home", the word the drawing picks; -1 with no dictionary. */
  chosen: number;
}

const HOW_CODE = '4663';

/**
 * The How it works drawing (MS-7.8): the well after each press of 4 6 6 3, and the top 3 sentences
 * with "home" chosen. It throws when the dictionary is loaded but the example stops being true, so the
 * build fails rather than showing a false drawing. With no dictionary it shows digits only.
 */
export function getHowData(dict: SiteDictionary = dictionary()): HowData {
  const prefixes = [1, 2, 3, 4].map((n) => HOW_CODE.slice(0, n));
  const digits = (p: string) => p.split('').join(' ');
  if (!dict) {
    const [a, b, c, d] = prefixes.map(digits) as [string, string, string, string];
    return { code: HOW_CODE, typing: [a, b, c, d], sentences: [], chosen: -1 };
  }
  const { lexicon, lm } = dict;
  if (encodeWord('home') !== HOW_CODE || encodeWord('good') !== HOW_CODE) {
    throw new Error('site-data: "home" and "good" are no longer both 4663');
  }
  const typed = prefixes.map((p) => {
    const best = decodeGhost([p], { lexicon, lm, k: 1 })[0]?.words[0] ?? lexicon.completions(p, 1)[0];
    return best ? sentenceCase([best]) : digits(p);
  });
  const sentences = decodeGhost([HOW_CODE], { lexicon, lm, k: 3 }).map((c) => c.words.join(' '));
  const chosen = sentences.indexOf('home');
  if (chosen < 0) throw new Error('site-data: "home" is no longer in the top 3 for 4663');
  const [a, b, c, d] = typed as [string, string, string, string];
  return { code: HOW_CODE, typing: [a, b, c, d], sentences, chosen };
}

export interface SpellExample {
  /** A name the dictionary does not have, so Spell shows it as New. */
  word: 'Mihai';
  code: string;
}

/** The Spell and My words drawing (MS-7.8). Throws when the code differs or the dictionary has the name. */
export function getSpellExample(dict: SiteDictionary = dictionary()): SpellExample {
  const code = encodeWord('mihai');
  if (code !== '64424') throw new Error('site-data: "Mihai" is no longer 64424');
  if (dict?.lexicon.has('mihai')) throw new Error('site-data: the dictionary has "Mihai", so it would not be New');
  return { word: 'Mihai', code };
}

/** A column of the 5-digit proof example. */
export type ProofColumn = 0 | 1 | 2 | 3 | 4;

const isProofColumn = (n: number): n is ProofColumn => Number.isInteger(n) && n >= 0 && n <= 4;

export interface ProofExample {
  /** The keys pressed: the code of "water". */
  keys: string;
  words: { word: string; code: string }[];
  /** The words whose code equals the keys. */
  matches: string[];
  /** The first word whose code differs, and the column of its first differing digit. */
  reject: { word: string; code: string; diffAt: ProofColumn };
}

/** The proof figure's closing line (MS-7.9): "Can be spoken: water, waves. Never spoken: wafer." */
export function proofSaidLine(proof: ProofExample): string {
  return `Can be spoken: ${proof.matches.join(', ')}. Never spoken: ${proof.reject.word}.`;
}

/**
 * The proof example (MS-7.6). It throws when the example no longer shows a dropped word, so the
 * build fails rather than showing a false claim.
 */
export function getProofExample(): ProofExample {
  const keys = encodeWord('water') ?? '';
  const words = ['water', 'waves', 'wafer'].map((w) => ({ word: w, code: encodeWord(w) ?? '' }));
  const matches = words.filter((w) => w.code === keys).map((w) => w.word);
  const dropped = words.find((w) => w.code !== keys);
  if (!keys || !dropped || matches.length < 1) throw new Error('site-data: the proof example no longer shows a dropped word');
  let diffAt = 0;
  while (diffAt < dropped.code.length && dropped.code[diffAt] === keys[diffAt]) diffAt += 1;
  if (!isProofColumn(diffAt)) throw new Error('site-data: the proof example no longer differs inside its 5 digits');
  return { keys, words, matches, reject: { ...dropped, diffAt } };
}

export interface SiteResults {
  items: number;
  /** B1: offline dictionary with the bigram model (what the app ships). */
  ghost: { wordAcc: string; top1: string; top5: string; scanStepsPerChar: string; ksr: string };
  /** B0: word frequency only, for comparison. */
  dict: { top1: string; top5: string };
  /** Model-ranking runs (letter mode, B4 ok, known models, one provider), or null. No names. */
  modelRuns: { sizes: number[]; count: number } | null;
}

interface Metrics {
  items: number;
  wordAcc: number;
  top1: number;
  top5: number;
  ksr: number;
  scanStepsPerChar: number;
}

const pct = (x: number) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPositiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;
const inRange = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

function okMetrics(configs: unknown, id: string): Metrics | null {
  if (!Array.isArray(configs)) return null;
  const c = configs.find((x) => isObject(x) && x.id === id && x.status === 'ok') as Record<string, unknown> | undefined;
  const m = c?.metrics;
  if (!isObject(m)) return null;
  const valid =
    isPositiveInt(m.items) &&
    inRange(m.wordAcc, 0, 1) &&
    inRange(m.top1, 0, 1) &&
    inRange(m.top5, 0, 1) &&
    inRange(m.ksr, -1, 1) &&
    typeof m.scanStepsPerChar === 'number' &&
    Number.isFinite(m.scanStepsPerChar) &&
    m.scanStepsPerChar > 0;
  return valid ? (m as unknown as Metrics) : null;
}

function modelRunsOf(file: unknown): SiteResults['modelRuns'] {
  if (file === undefined) return null; // no file: no model line, no warning
  if (file === null) {
    console.warn('[site] RESULTS.llm.json does not parse; the results section shows no model line');
    return null;
  }
  if (!isObject(file) || !isObject(file.runs)) return null;
  const models = new Set<string>();
  const sizes = new Set<number>();
  const providers = new Set<string>();
  for (const run of Object.values(file.runs)) {
    if (!isObject(run) || run.mode !== 'letter') continue;
    const model = run.model;
    if (typeof model !== 'string' || !isModelId(model)) continue;
    if (!Array.isArray(run.configs)) continue;
    const b4 = run.configs.find((c) => isObject(c) && c.id === 'B4' && c.status === 'ok') as Record<string, unknown> | undefined;
    if (!b4) continue;
    const subsetItems = isObject(run.subset) ? run.subset.items : undefined;
    const size = subsetItems !== undefined ? subsetItems : isObject(b4.metrics) ? b4.metrics.items : undefined;
    if (!isPositiveInt(size)) continue;
    models.add(model);
    sizes.add(size);
    providers.add(MODEL_PROFILES[model].provider);
  }
  if (models.size === 0) return null;
  if (providers.size > 1) {
    console.warn('[site] model runs come from more than one provider; content.md §7 needs new copy');
    return null;
  }
  return { sizes: [...sizes].sort((a, b) => a - b), count: models.size };
}

export function getResults(read: JsonReader = readJson): SiteResults | null {
  const r = read(['..', 'eval', 'RESULTS.json']);
  const configs = isObject(r) ? r.configs : undefined;
  const b0 = okMetrics(configs, 'B0');
  const b1 = okMetrics(configs, 'B1');
  if (!b0 || !b1) {
    console.warn('[site] RESULTS.json is missing or invalid; the results section shows no numbers');
    return null;
  }
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
    modelRuns: modelRunsOf(read(['..', 'eval', 'RESULTS.llm.json'])),
  };
}

const joinSizes = (sizes: readonly number[]) =>
  sizes.length <= 1 ? sizes.join('') : `${sizes.slice(0, -1).join(', ')} and ${sizes[sizes.length - 1]}`;

/** The model line of content.md §7 as one string. */
export function modelRunsLine(m: { sizes: readonly number[]; count: number }): string {
  const sizes = [...new Set(m.sizes)].sort((a, b) => a - b);
  const models = m.count === 1 ? 'with 1 model' : `with ${m.count} models from one provider`;
  return `Model ranking has also been measured, on samples of ${joinSizes(sizes)} sentences ${models}. Those numbers, with how often a reply would have come too late to use, are in the full results.`;
}
