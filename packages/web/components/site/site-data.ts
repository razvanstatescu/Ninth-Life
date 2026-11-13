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
import { KEY_LETTERS, Lexicon, bigramModel, decodeGhost, encodeWord, formatSentence, unigramModel, type BigramFile, type Digit, type LanguageModel, type LexiconFile } from '@ninth/core';
import { MODEL_PROFILES, isModelId, type Provider } from '@ninth/decoder';
import { PROVIDER_COPY, rankingProvider, type RankingProvider } from '@/lib/rankingProvider';

export const REPO_URL = 'https://github.com/razvanstatescu/Ninth-Life';
export const RESULTS_URL = `${REPO_URL}/blob/main/packages/eval/RESULTS.md`;
export const METHOD_URL = `${REPO_URL}/blob/main/docs/architecture/data-and-eval.md#4-evaluation-method`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const NOTICE_URL = `${REPO_URL}/blob/main/data/NOTICE.md`;
/** Evidence for Privacy's "Check it yourself" (round 3): the rules the code follows, and the code that builds the ranking request. */
export const PRIVACY_RULES_URL = `${REPO_URL}/blob/main/.kiro/steering/privacy.md`;
export const RANKING_REQUEST_URL = `${REPO_URL}/blob/main/packages/web/lib/decodeClient.ts`;
/**
 * The history line (MS-4.7, D15; round 4: in the site footer of every page and in /llms.txt). One constant, so the
 * footer, /llms.txt and the tests can never differ.
 */
export const HISTORY_LINE =
  'Made for Kiroween 2026.';

/** The fixed example the demo types: one press per letter, 0 between words. */
export const DEMO_WORDS = ['i', 'need', 'water'] as const;

export interface DemoStep {
  /** The key pressed at this step ('0' is space). */
  key: string;
  /** Codes typed so far, one per word ("4", "6333", "928"). */
  codes: string[];
  /** What the offline decoder shows for those codes (top sentence), or null for a code with no word yet. */
  words: (string | null)[];
  /**
   * How each word is written on its proof chip, as the app writes it (round 3, R3-P8): the sentence's own tokens
   * from @ninth/core formatSentence ("I", a capital first word), as the app's ProofPanel labels its chips with
   * buildSentence's tokens. Null where `words` is null.
   */
  labels: (string | null)[];
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

/**
 * The chip label of each word: the app's formatSentence tokens (lib/sentence.ts buildSentence → ProofPanel labels).
 * A word not typed yet keeps its place with a letterless stand-in, so the tokens line up with the words.
 */
export function chipLabels(words: readonly (string | null)[]): (string | null)[] {
  const tokens = formatSentence(words.map((w) => w || '-')).split(' ');
  return words.map((w, i) => (w ? (tokens[i] ?? w) : null));
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
    steps.push({ key, codes: [...typed], words, labels: chipLabels(words) });
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
  /** The top 3 sentences for 4663, best first. */
  sentences: string[];
  /** The same sentences as the app lists them: sentence case ("Good", "Home", "Gone"). */
  labels: string[];
  /** Index in `sentences` of "home", the word the drawing picks; -1 with no dictionary. */
  chosen: number;
}

const HOW_CODE = '4663';

/**
 * The How it works drawing (MS-7.8; round 4, 2026-11-13: the well after each press is gone with the
 * typing well): the keys 4663 and the top 3 sentences with "home" chosen. It throws when the dictionary is loaded
 * but the example stops being true, so the build fails rather than showing a false drawing. With no dictionary it
 * shows the digits only.
 */
export function getHowData(dict: SiteDictionary = dictionary()): HowData {
  if (!dict) return { code: HOW_CODE, sentences: [], labels: [], chosen: -1 };
  const { lexicon, lm } = dict;
  if (encodeWord('home') !== HOW_CODE || encodeWord('good') !== HOW_CODE) {
    throw new Error('site-data: "home" and "good" are no longer both 4663');
  }
  const sentences = decodeGhost([HOW_CODE], { lexicon, lm, k: 3 }).map((c) => c.words.join(' '));
  const chosen = sentences.indexOf('home');
  if (chosen < 0) throw new Error('site-data: "home" is no longer in the top 3 for 4663');
  return { code: HOW_CODE, sentences, labels: sentences.map((s) => sentenceCase(s.split(' '))), chosen };
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
  /**
   * The letters of each pressed key, upper case, from @ninth/core's KEY_LETTERS ("WXYZ", "ABC", ...). Round 4
   * (2026-11-13): the figure draws them on its five keys, so a visitor sees that "f" is not on TUV.
   */
  keyLetters: string[];
  words: { word: string; code: string }[];
  /** The words whose code equals the keys. */
  matches: string[];
  /** The first word whose code differs, and the column of its first differing digit. */
  reject: { word: string; code: string; diffAt: ProofColumn };
}

/** The proof figure's first closing line (MS-7.9, round 4): "Can be spoken: water, waves." */
export function proofCanLine(proof: ProofExample): string {
  return `Can be spoken: ${proof.matches.join(', ')}.`;
}

/**
 * The proof figure's second closing line (MS-7.9, round 4): round 3's "Never spoken" and the two codes, together
 * under the x: 'Never spoken: wafer. "wafer" is 92337. Your keys are 92837.'
 */
export function proofNeverLine(proof: ProofExample): string {
  const { word, code } = proof.reject;
  return `Never spoken: ${word}. "${word}" is ${code}. Your keys are ${proof.keys}.`;
}

/**
 * The proof example (MS-7.6). It throws when the example no longer shows a dropped word, so the
 * build fails rather than showing a false claim. Round 4: also when a word does not have one letter per key, or
 * when the dropped word's letter at diffAt is on the key pressed there (the figure says it is not).
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
  if (words.some((w) => w.word.length !== keys.length)) throw new Error('site-data: a proof word no longer has one letter per key');
  const keyLetters = keys.split('').map((d) => KEY_LETTERS[d as Digit]);
  if (keyLetters[diffAt]!.includes(dropped.word[diffAt]!)) throw new Error('site-data: the dropped letter is on the key pressed there');
  return { keys, keyLetters: keyLetters.map((l) => l.toUpperCase()), words, matches, reject: { ...dropped, diffAt } };
}

export interface ModelRuns {
  sizes: number[];
  count: number;
  /** The one provider every counted run's model belongs to (MODEL_PROFILES). */
  provider: Provider;
  /** The measured model ids, sorted ("MiniMax-M3", "MiniMax-M3.1-Flash"). */
  models: string[];
}

/** One test source of RESULTS.md "By source": B1's right sentence first and how many items the source has. */
export interface SourceResult {
  top1: string;
  items: number;
}

export interface SiteResults {
  items: number;
  /**
   * The words in the test sentences (B1 `words`; RESULTS.md 2,730 + 2,160 by source, "of 4890" in the initials table):
   * the denominator of "Right word first". Null when RESULTS.json does not give it (round 4).
   */
  words: number | null;
  /**
   * B1: offline dictionary with the bigram model (what the app ships). Round 4: `pressesPerChar` ("1.00", RESULTS.md
   * "Letter-mode B1 needs 1.00 presses per character") replaces the KSR on the page; null when RESULTS.json lacks it.
   */
  ghost: { wordAcc: string; top1: string; top5: string; scanStepsPerChar: string; ksr: string; pressesPerChar: string | null };
  /** B0: word frequency only, for comparison (round 4: its word accuracy too, so every measure has its pair). */
  dict: { top1: string; top5: string; wordAcc: string };
  /**
   * B1 right sentence first per test source (RESULTS.md "By source"): AACText's test sentences and the Turk
   * dialogue replies, which are longer and more varied, each with its item count (round 4). Null when RESULTS.json
   * has no valid split (round 3).
   */
  bySource: { aac: SourceResult; turk: SourceResult } | null;
  /**
   * Model-ranking runs (letter mode, B4 ok, known models, one provider), or null. Round 3 (R3-P7, 2026-11-13): with the
   * provider and the model ids that were measured, so the page can say which models the numbers come from.
   */
  modelRuns: ModelRuns | null;
}

interface Metrics {
  items: number;
  wordAcc: number;
  top1: number;
  top5: number;
  ksr: number;
  scanStepsPerChar: number;
  /** Checked where they are used (round 4): the page leaves them out when they are missing or invalid. */
  words?: unknown;
  pressesPerChar?: unknown;
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

/** B1's right-sentence-first and item count on each test source, or null unless both sources are there and valid. */
function bySourceOf(configs: unknown): SiteResults['bySource'] {
  if (!Array.isArray(configs)) return null;
  const c = configs.find((x) => isObject(x) && x.id === 'B1' && x.status === 'ok') as Record<string, unknown> | undefined;
  const s = c?.bySource;
  if (!isObject(s) || !isObject(s.aac) || !isObject(s.turk)) return null;
  const { aac, turk } = s;
  if (!inRange(aac.top1, 0, 1) || !inRange(turk.top1, 0, 1) || !isPositiveInt(aac.items) || !isPositiveInt(turk.items)) return null;
  return { aac: { top1: pct(aac.top1), items: aac.items }, turk: { top1: pct(turk.top1), items: turk.items } };
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
  const providers = new Set<Provider>();
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
  return { sizes: [...sizes].sort((a, b) => a - b), count: models.size, provider: [...providers][0] as Provider, models: [...models].sort() };
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
  const presses = b1.pressesPerChar;
  return {
    items: b1.items,
    words: isPositiveInt(b1.words) ? b1.words : null,
    ghost: {
      wordAcc: pct(b1.wordAcc),
      top1: pct(b1.top1),
      top5: pct(b1.top5),
      scanStepsPerChar: b1.scanStepsPerChar.toFixed(2),
      ksr: pct(b1.ksr),
      pressesPerChar: typeof presses === 'number' && Number.isFinite(presses) && presses > 0 ? presses.toFixed(2) : null,
    },
    dict: { top1: pct(b0.top1), top5: pct(b0.top5), wordAcc: pct(b0.wordAcc) },
    bySource: bySourceOf(configs),
    modelRuns: modelRunsOf(read(['..', 'eval', 'RESULTS.llm.json'])),
  };
}

/**
 * The length of a Results bar (round 4, 2026-11-13; MS-5.1): the printed percentage as a share of the
 * whole track, so a bar can never disagree with its label ("85.6%" is 0.856). Clamped to 0..1.
 */
export function barShare(printed: string): number {
  const v = Number.parseFloat(printed) / 100;
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

/**
 * The Results presses figure (round 4): a word's letters over the keys that type them, one press per letter, computed
 * with encodeWord (never typed by hand). "home" is the How it works example (4663). Throws when a letter has no key.
 */
export function pressExample(word = 'home'): [letter: string, digit: string][] {
  const code = encodeWord(word);
  if (!code || code.length !== word.length) throw new Error(`site-data: "${word}" is no longer one key per letter`);
  return word.split('').map((letter, i) => [letter, code[i]!]);
}

/**
 * The marks of "{n} scan steps per character" (round 4): one whole mark per step and the rest as a part mark, read
 * from the printed value ("3.57" is [1, 1, 1, 0.57]); at most 8 marks.
 */
export function scanMarks(printed: string): number[] {
  const v = Number.parseFloat(printed);
  if (!Number.isFinite(v) || v <= 0) return [];
  const whole = Math.min(Math.floor(v), 8);
  const part = Math.round((v - Math.floor(v)) * 100) / 100;
  const marks: number[] = Array.from({ length: whole }, () => 1);
  if (part > 0 && whole < 8) marks.push(part);
  return marks;
}

const joinWords = (items: readonly (string | number)[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
const joinSizes = (sizes: readonly number[]) => joinWords(sizes);

/** What the model-ranking status rows say (round 4), from the same values as the model line. */
export interface ModelStatus {
  count: number;
  /** The measured provider's company name ("MiniMax"). */
  company: string;
  /** The measured model ids, sorted. */
  models: string[];
  /** The distinct sample sizes, ascending and joined ("200", "200 and 300"). */
  sizes: string;
  /** The ranking service this build sends to, and whether it is the provider measured. */
  service: string;
  serviceMeasured: boolean;
}

/**
 * The model-ranking status of content.md §7 (round 4, 2026-11-13; amends the round-3 model line on the
 * page): what was measured, and whether the provider this build uses (`current`, lib/rankingProvider.ts) is the one.
 * The page shows it as status rows; `/llms.txt` keeps the one-line form, `modelRunsLine`. No model-run number.
 */
export function modelStatus(m: ModelRuns, current: RankingProvider = rankingProvider()): ModelStatus {
  return {
    count: m.count,
    company: PROVIDER_COPY[m.provider].company,
    models: [...m.models].sort(),
    sizes: joinSizes([...new Set(m.sizes)].sort((a, b) => a - b)),
    service: PROVIDER_COPY[current].service,
    serviceMeasured: current === m.provider,
  };
}

/**
 * The model line of content.md §7 as one string. Round 3 (R3-P7, 2026-11-13, lead decision; amends D14 and MS-5.3):
 * it names the provider and the models that were measured, and says whether the provider this build sends model
 * ranking to (`current`, lib/rankingProvider.ts) is the measured one. Still no model-run number on the page. Round 4:
 * built from `modelStatus`, so the page's status rows and `/llms.txt` read the same values.
 */
export function modelRunsLine(m: ModelRuns, current: RankingProvider = rankingProvider()): string {
  const s = modelStatus(m, current);
  const models = `with ${s.count} ${s.company} ${s.count === 1 ? 'model' : 'models'} (${joinWords(s.models)})`;
  const which = s.serviceMeasured
    ? `The app's model ranking uses ${s.service}, the provider measured here.`
    : `The app's model ranking uses ${s.service}, which has not been measured yet.`;
  return `Model ranking has also been measured, on samples of ${s.sizes} sentences ${models}. Those numbers, with how often a reply would have come too late to use, are in the full results. ${which}`;
}
