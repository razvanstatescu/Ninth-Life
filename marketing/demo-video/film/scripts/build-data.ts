/**
 * Builds src/data/decoded.json from the REAL offline decoder (@ninth/core, the shipped lexicon and
 * bigrams). Nothing the film shows as decoder output is typed by hand (05-production-guide.md, s. 5).
 *
 * Run from film/:  npx tsx scripts/build-data.ts
 * It exits with code 1 when a sentence the storyboard relies on is no longer ranked first.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Lexicon,
  bigramModel,
  decodeGhost,
  encodeWord,
  formatSentence,
  type BigramFile,
  type LexiconFile,
} from '../../../../packages/core/src/index';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../../..');
const lexDir = join(repo, 'data', 'lexicon');

const lexicon = Lexicon.fromJSON(JSON.parse(readFileSync(join(lexDir, 'en.v1.json'), 'utf8')) as LexiconFile);
const lm = bigramModel(JSON.parse(readFileSync(join(lexDir, 'en.bigram.v1.json'), 'utf8')) as BigramFile, lexicon);

type Step = {
  /** The key pressed: '2'..'9', or '0' for Space. */
  key: string;
  /** Codes typed so far, one per word. */
  codes: string[];
  /** The decoder's best reading of what is typed so far (a word may be a completion of its code). */
  words: string[];
  /** The same, as the app formats it ("I need wa..."). */
  text: string;
};

type Sentence = {
  id: string;
  words: string[];
  codes: string[];
  /** Every key press in order, with '0' between words. */
  presses: string[];
  steps: Step[];
  /** Top 3 whole sentences for the final codes, formatted, best first. */
  candidates: string[];
  /** The final sentence, formatted. */
  text: string;
  /** Each final word with its code, for proof chips. */
  proof: { word: string; code: string }[];
};

const failures: string[] = [];

function bestReading(typed: string[]): string[] {
  const best = decodeGhost(typed, { lexicon, lm, k: 1 })[0];
  if (best) return best.words;
  // The last code is not a whole word yet: decode the rest, show the top completion (as site-data.ts does).
  const head = typed.length > 1 ? decodeGhost(typed.slice(0, -1), { lexicon, lm, k: 1 })[0]?.words ?? [] : [];
  const tail = lexicon.completions(typed[typed.length - 1]!, 1)[0] ?? '';
  return [...typed.slice(0, -1).map((_, i) => head[i] ?? ''), tail];
}

function sentence(id: string, text: string, expectFirst = true): Sentence {
  const words = text.split(' ');
  const codes = words.map((w) => {
    const c = encodeWord(w);
    if (!c) throw new Error(`cannot encode "${w}"`);
    return c;
  });
  const presses = codes.flatMap((c, i) => (i === 0 ? c.split('') : ['0', ...c.split('')]));
  const steps: Step[] = [];
  const typed: string[] = [];
  for (const key of presses) {
    if (key === '0') typed.push('');
    else if (typed.length === 0) typed.push(key);
    else typed[typed.length - 1] += key;
    const nonEmpty = typed.filter(Boolean);
    const reading = bestReading(nonEmpty);
    steps.push({ key, codes: [...nonEmpty], words: reading, text: formatSentence(reading) });
  }
  const cands = decodeGhost(codes, { lexicon, lm, k: 3 }).map((c) => formatSentence(c.words));
  const final = formatSentence(words);
  if (expectFirst && cands[0] !== final) failures.push(`${id}: expected "${final}" first, decoder gives ${JSON.stringify(cands)}`);
  return { id, words, codes, presses, steps, candidates: cands, text: final, proof: words.map((w, i) => ({ word: w, code: codes[i]! })) };
}

const hello = sentence('hello', 'hello');
const good = sentence('good', 'good');
const helloAgain = sentence('hello-again', 'hello again');
const needWater = sentence('i-need-water', 'i need water');
const goodToBeBack = sentence('good-to-be-back', 'it is good to be back');
const somethingToSay = sentence('something-to-say', 'i have something to say');

// Every word whose keys match a code of the film's sentences, most likely first (the lattice in s10,
// the dictionary in s12). Real lexicon output, never typed by hand.
const allCodes = [...new Set([hello, helloAgain, needWater, somethingToSay].flatMap((s) => s.codes))];
// Brand names the lexicon contains are never shown (the hackathon bans third-party trademarks in the video).
const NEVER_SHOW = new Set(['neff']);
const matches = Object.fromEntries(allCodes.map((c) => [c, lexicon.lookup(c).filter((w) => !NEVER_SHOW.has(w)).slice(0, 8)]));

// One code, several words: what Next cycles through for 4663.
const cycle4663 = decodeGhost(['4663'], { lexicon, lm, k: 6 }).map((c) => c.words[0]!);
if (cycle4663.slice(0, 3).join(',') !== 'good,home,gone') failures.push(`4663: expected good, home, gone first; got ${cycle4663.join(', ')}`);

// The proof example: "wafer" does not match the keys of "water".
const proofWords = ['water', 'waves', 'wafer'].map((w) => ({ word: w, code: encodeWord(w) ?? '' }));
const keys = proofWords[0]!.code;
const wafer = proofWords[2]!;
let diffAt = 0;
while (diffAt < wafer.code.length && wafer.code[diffAt] === keys[diffAt]) diffAt += 1;
if (wafer.code === keys) failures.push('proof: "wafer" encodes to the same keys as "water"');

const out = {
  generatedBy: 'scripts/build-data.ts',
  source: '@ninth/core decodeGhost on data/lexicon/en.v1.json + en.bigram.v1.json',
  generatedAt: new Date().toISOString().slice(0, 10),
  keypad: {
    // The app's legends (packages/web/components/Keypad.tsx order): digit, letters.
    keys: [
      { id: '1', digit: '1', letters: '.,?!' },
      { id: '2', digit: '2', letters: 'ABC' },
      { id: '3', digit: '3', letters: 'DEF' },
      { id: '4', digit: '4', letters: 'GHI' },
      { id: '5', digit: '5', letters: 'JKL' },
      { id: '6', digit: '6', letters: 'MNO' },
      { id: '7', digit: '7', letters: 'PQRS' },
      { id: '8', digit: '8', letters: 'TUV' },
      { id: '9', digit: '9', letters: 'WXYZ' },
      { id: 'star', digit: '*', letters: 'Back' },
      { id: '0', digit: '0', letters: 'Space' },
      { id: 'hash', digit: '#', letters: 'Next' },
    ],
  },
  sentences: { hello, good, 'hello-again': helloAgain, 'i-need-water': needWater, 'good-to-be-back': goodToBeBack, 'something-to-say': somethingToSay },
  matches,
  cycle4663,
  proof: { keys, words: proofWords, matches: proofWords.filter((w) => w.code === keys).map((w) => w.word), reject: { ...wafer, diffAt } },
};

if (failures.length) {
  console.error('build-data: the storyboard no longer matches the decoder:\n- ' + failures.join('\n- '));
  console.error('Do not edit decoded.json by hand. The storyboard needs a new sentence (05-production-guide.md, s. 5).');
  process.exit(1);
}

const target = join(here, '..', 'src', 'data', 'decoded.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`build-data: wrote ${target}`);
for (const s of [hello, helloAgain, needWater, goodToBeBack]) console.log(`  ${s.id}: ${s.codes.join(' ')} -> ${s.candidates.join(' | ')}`);
console.log(`  4663: ${cycle4663.join(', ')}`);
console.log(`  proof: keys ${keys}, wafer ${wafer.code}, differs at index ${diffAt}`);
