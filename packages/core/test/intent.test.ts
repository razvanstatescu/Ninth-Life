/**
 * Reply type re-rank (rankByIntent). Decision: docs/decisions/ADR-008-reply-types-steer-ranking.md.
 * Requirement: web-ui Req 29.2 (only reorders; every sentence still validates).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  INTENT_CUE_MAX,
  INTENT_CUE_MIN,
  INTENT_WEIGHT,
  Lexicon,
  REPLY_INTENTS,
  bigramModel,
  decodeGhost,
  encodeWord,
  intentCue,
  isReplyIntent,
  rankByIntent,
  unigramModel,
  validate,
  type BigramFile,
  type LexiconFile,
  type LexiconFileV2,
  type Mode,
  type ReplyIntent,
} from '../src/index';
import { code, lexiconFile, plainWord, runs } from './arbitraries';
import { MINI_BIGRAM, MINI_LEXICON } from './fixtures/mini-lexicon';

const intentArb = fc.constantFrom<ReplyIntent>(...REPLY_INTENTS);
const CUE_WORDS = ['no', 'not', 'never', 'nope', 'nah', "don't", "can't", 'cannot', 'nothing', 'nobody', 'none', 'yes', 'yeah', 'ok', 'sure', 'right', 'good', 'great', 'who', 'what', 'do', 'can', 'is', 'are', 'will', 'on', 'my', 'way', 'i', 'am'];
const wordArb = fc.oneof(fc.constantFrom(...CUE_WORDS), plainWord(1, 8));
const scoreArb = fc.oneof(
  { weight: 8, arbitrary: fc.double({ min: -60, max: 0, noNaN: true }) },
  { weight: 1, arbitrary: fc.constantFrom(Number.NaN, -Infinity, Infinity, -99, 0) },
);
/** Candidates tagged with their input index, so the output can be checked object by object. */
const candsArb = fc
  .array(fc.record({ words: fc.array(wordArb, { minLength: 0, maxLength: 5 }), score: scoreArb }), { maxLength: 14 })
  .map((cs) => cs.map((c, id) => ({ ...c, id })));
const sortedFinite = fc
  .array(fc.record({ words: fc.array(wordArb, { minLength: 1, maxLength: 5 }), score: fc.double({ min: -60, max: 0, noNaN: true }) }), { maxLength: 14 })
  .map((cs) => [...cs].sort((a, b) => b.score - a.score).map((c, id) => ({ ...c, id })));

const text = (cs: { words: readonly string[] }[]) => cs.map((c) => c.words.join(' '));

describe('core: reply type cues', () => {
  it('ask: +1 for a question starter first', () => {
    expect(intentCue(['do', 'you'], 'ask')).toBe(1);
    expect(intentCue(['where', 'is', 'it'], 'ask')).toBe(1);
    expect(intentCue(['you', 'do'], 'ask')).toBe(0);
  });

  it('disagree: +1 for no/not/never/nope/nah first, +1 for any negative word, -1 for an agreeing word first', () => {
    expect(intentCue(['no', 'i', "can't"], 'disagree')).toBe(2);
    expect(intentCue(['no', 'good'], 'disagree')).toBe(2); // "no" is both the opener and a negative word
    expect(intentCue(['i', "don’t"], 'disagree')).toBe(1); // curly apostrophe folds
    expect(intentCue(['i', 'cannot'], 'disagree')).toBe(1);
    expect(intentCue(['yes', 'nothing'], 'disagree')).toBe(0);
    expect(intentCue(['sure'], 'disagree')).toBe(-1);
  });

  it('agree: +1 for an agreeing word first, -1 for no/not/never/nope/nah first', () => {
    expect(intentCue(['yes', 'please'], 'agree')).toBe(1);
    expect(intentCue(['Okay'], 'agree')).toBe(1); // case folds
    expect(intentCue(['no', 'my', 'way'], 'agree')).toBe(-1);
    expect(intentCue(['on', 'my', 'way'], 'agree')).toBe(0);
  });

  it('an empty sentence has no cue', () => {
    for (const i of REPLY_INTENTS) expect(intentCue([], i)).toBe(0);
  });

  it(`every cue is between ${INTENT_CUE_MIN} and ${INTENT_CUE_MAX} (property)`, () => {
    fc.assert(
      fc.property(fc.array(wordArb, { maxLength: 6 }), intentArb, (words, i) => {
        const c = intentCue(words, i);
        expect(Number.isInteger(c)).toBe(true);
        expect(c).toBeGreaterThanOrEqual(INTENT_CUE_MIN);
        expect(c).toBeLessThanOrEqual(INTENT_CUE_MAX);
      }),
    );
  });

  it('isReplyIntent accepts the three values only', () => {
    for (const i of REPLY_INTENTS) expect(isReplyIntent(i)).toBe(true);
    for (const x of [undefined, null, '', 'Agree', 'yes', 'question', 1, {}]) expect(isReplyIntent(x)).toBe(false);
  });
});

describe('core: rankByIntent examples', () => {
  const c = (s: string, score: number) => ({ words: s.split(' '), score });

  it('Agree lifts "on my way" over "no my way" (keys 66 69 929)', () => {
    const base = [c('no my way', -6.7), c('on my way', -7.1), c('no my wax', -9.4)];
    expect(text(rankByIntent(base, 'agree'))).toEqual(['on my way', 'no my way', 'no my wax']);
    expect(text(rankByIntent(base, 'disagree'))).toEqual(['no my way', 'no my wax', 'on my way']);
    expect(text(rankByIntent(base, 'ask'))).toEqual(text(base)); // no question starter: no change
  });

  it('Ask lifts a question starter; a far better score still wins', () => {
    const base = [c('em you', -5), c('do you', -6), c('en you', -20), c('who you', -20)];
    expect(text(rankByIntent(base, 'ask'))).toEqual(['do you', 'em you', 'who you', 'en you']);
  });

  it('no reply type, or anything that is not one, keeps the order', () => {
    const base = [c('no my way', -6.7), c('on my way', -7.1)];
    expect(text(rankByIntent(base))).toEqual(text(base));
    expect(text(rankByIntent(base, 'maybe' as ReplyIntent))).toEqual(text(base));
  });

  it('returns a new array and leaves the input alone', () => {
    const base = [c('no my way', -6.7), c('on my way', -7.1)];
    const copy = structuredClone(base);
    const out = rankByIntent(base, 'agree');
    expect(out).not.toBe(base);
    expect(base).toEqual(copy);
    expect(out[0]).toBe(base[1]); // the same objects, moved
  });

  it('an empty pool stays empty', () => {
    expect(rankByIntent([], 'ask')).toEqual([]);
  });
});

describe('core: rankByIntent properties', () => {
  it('P-I1 the output is a permutation of the input (the same objects, each once)', () => {
    fc.assert(
      fc.property(candsArb, fc.option(intentArb, { nil: undefined }), (cands, i) => {
        const out = rankByIntent(cands, i);
        expect(out).toHaveLength(cands.length);
        expect(new Set(out).size).toBe(out.length);
        expect(out.map((x) => x.id).sort((a, b) => a - b)).toEqual(cands.map((x) => x.id));
        for (const x of out) expect(x).toBe(cands[x.id]);
      }),
      { numRuns: runs(300) },
    );
  });

  it('P-I2 every re-ranked ghost sentence still passes validate (pools from decodeGhost on random codes)', () => {
    const lex = Lexicon.fromJSON(MINI_LEXICON);
    const words = Object.values(MINI_LEXICON.codes).flatMap((l) => l.map(([w]) => w));
    let nonEmpty = 0;
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(MINI_LEXICON), lexiconFile(false)),
        fc.oneof(
          fc.array(fc.constantFrom(...words), { minLength: 1, maxLength: 6 }).map((ws) => ws.map((w) => encodeWord(w)!)),
          fc.array(code(5), { minLength: 1, maxLength: 5 }),
        ),
        fc.constantFrom<Mode>('letter', 'initials'),
        intentArb,
        fc.integer({ min: 1, max: 12 }),
        (file, codes, mode, i, k) => {
          const l = file === MINI_LEXICON ? lex : Lexicon.fromJSON(file);
          const cs = mode === 'initials' ? codes.map((x) => x.slice(0, 1)) : codes;
          const lm = file === MINI_LEXICON ? bigramModel(MINI_BIGRAM, l) : unigramModel(l);
          const pool = decodeGhost(cs, { lexicon: l, lm, k, mode });
          if (pool.length > 0) nonEmpty++;
          for (const cand of rankByIntent(pool, i)) expect(validate(cand.words, cs, mode)).toBe(true);
        },
      ),
      { numRuns: runs(300) },
    );
    expect(nonEmpty).toBeGreaterThan(runs(300) / 4); // non-vacuous
  });

  it('P-I3 with no reply type the order is the identity', () => {
    fc.assert(
      fc.property(candsArb, (cands) => {
        expect(rankByIntent(cands)).toEqual(cands);
        expect(rankByIntent(cands, undefined).map((x) => x.id)).toEqual(cands.map((x) => x.id));
      }),
    );
  });

  it('P-I4 stable ties: in a score-ordered pool, candidates with equal cues keep their relative order', () => {
    fc.assert(
      fc.property(sortedFinite, intentArb, (cands, i) => {
        const out = rankByIntent(cands, i);
        const pos = new Map(out.map((x, p) => [x.id, p]));
        for (let a = 0; a < cands.length; a++) {
          for (let b = a + 1; b < cands.length; b++) {
            if (intentCue(cands[a]!.words, i) === intentCue(cands[b]!.words, i)) expect(pos.get(cands[a]!.id)!).toBeLessThan(pos.get(cands[b]!.id)!);
          }
        }
      }),
      { numRuns: runs(300) },
    );
  });

  it('P-I4 equal adjusted scores keep input order (all-equal scores and cues give the identity)', () => {
    fc.assert(
      fc.property(fc.array(fc.array(fc.constantFrom('on', 'my', 'way', 'it'), { minLength: 1, maxLength: 3 }), { maxLength: 10 }), intentArb, fc.double({ min: -30, max: 0, noNaN: true }), (ws, i, s) => {
        const cands = ws.map((words, id) => ({ words, score: s, id }));
        expect(rankByIntent(cands, i).map((x) => x.id)).toEqual(cands.map((x) => x.id));
      }),
    );
  });

  it(`P-I5 bounded effect: a candidate never passes one whose score is more than ${INTENT_CUE_MAX - INTENT_CUE_MIN} x INTENT_WEIGHT higher`, () => {
    const bound = (INTENT_CUE_MAX - INTENT_CUE_MIN) * INTENT_WEIGHT;
    let close = 0;
    fc.assert(
      fc.property(candsArb, intentArb, (cands, i) => {
        const out = rankByIntent(cands, i);
        const pos = new Map(out.map((x, p) => [x.id, p]));
        for (const a of cands) {
          for (const b of cands) {
            if (!Number.isFinite(a.score) || !Number.isFinite(b.score)) continue;
            if (b.score - a.score > bound) expect(pos.get(b.id)!).toBeLessThan(pos.get(a.id)!);
            else if (a !== b) close++;
          }
        }
        // A finite score always beats a non-finite one.
        for (const a of cands) for (const b of cands) if (Number.isFinite(b.score) && !Number.isFinite(a.score)) expect(pos.get(b.id)!).toBeLessThan(pos.get(a.id)!);
      }),
      { numRuns: runs(300) },
    );
    expect(close).toBeGreaterThan(0); // non-vacuous: some pairs are close enough to swap
  });
});

const DATA = join(__dirname, '..', '..', '..', 'data', 'lexicon');
const LEX_V2 = join(DATA, 'en.v2.json');
const BIGRAM = join(DATA, 'en.bigram.v1.json');
const haveData = existsSync(LEX_V2) && existsSync(BIGRAM);

describe.skipIf(!haveData)('core: rankByIntent on the real lexicon (design C examples)', () => {
  const lex = haveData ? Lexicon.fromJSON(JSON.parse(readFileSync(LEX_V2, 'utf8')) as LexiconFile | LexiconFileV2) : Lexicon.fromJSON(MINI_LEXICON);
  const lm = haveData ? bigramModel(JSON.parse(readFileSync(BIGRAM, 'utf8')) as BigramFile, lex) : unigramModel(lex);
  const pool = (s: string) => {
    const codes = s.split(' ').map((w) => encodeWord(w)!);
    return { codes, cands: decodeGhost(codes, { lexicon: lex, lm, k: 12 }) };
  };

  it('66 69 929: base "no my way" first; Agree puts "on my way" first', () => {
    const { codes, cands } = pool('on my way');
    expect(text(cands)[0]).toBe('no my way');
    const r = rankByIntent(cands, 'agree');
    expect(text(r)[0]).toBe('on my way');
    for (const x of r) expect(validate(x.words, codes)).toBe(true);
  });

  it('66 48 669: Agree puts "on it now" first', () => {
    expect(text(rankByIntent(pool('on it now').cands, 'agree'))[0]).toBe('on it now');
  });

  it('66 4663: Agree keeps "no good" first and lifts "on good" to second', () => {
    expect(text(rankByIntent(pool('no good').cands, 'agree')).slice(0, 2)).toEqual(['no good', 'on good']);
  });

  it('36 968: "do you" stays first with Ask', () => {
    expect(text(rankByIntent(pool('do you').cands, 'ask'))[0]).toBe('do you');
  });
});
