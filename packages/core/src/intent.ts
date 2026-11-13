/**
 * Reply type (Agree / Disagree / Ask): an offline re-rank of sentences that already match the keys.
 * It only reorders. It reads the words of the candidates it is given and never adds, drops or
 * changes one, so every output still passes validate() whenever the input did.
 * Decision: docs/decisions/ADR-008-reply-types-steer-ranking.md. Requirement: web-ui Req 29.2.
 */
import { normalize } from './keymap';

export type ReplyIntent = 'agree' | 'disagree' | 'ask';

/** Every reply type, in the order the app shows them. */
export const REPLY_INTENTS: readonly ReplyIntent[] = Object.freeze(['agree', 'disagree', 'ask'] as const);

/** Score bonus per cue point, in the language model's units (log10 probability). */
export const INTENT_WEIGHT = 2;

/**
 * Ghost sentences to decode before re-ranking for a reply type; the top k of the re-ranked pool
 * are shown (and sent to the decode route as its beams, so its fallback follows the reply type).
 */
export const INTENT_POOL = 12;

/** Lowest and highest value intentCue can return. Their spread bounds how far a candidate can move. */
export const INTENT_CUE_MIN = -1;
export const INTENT_CUE_MAX = 2;

/** Question starters: a sentence that opens with one of these reads as a question. */
const QS = new Set(
  'who what when where why how which whose can could do does did is are am was were will would should shall may might have has had'.split(' '),
);
/** Words that open a disagreeing reply. */
const NEG0 = new Set(['no', 'not', 'never', 'nope', 'nah']);
/** Negative words anywhere in a sentence (plus every "n't" form, checked by suffix). */
const NEG = new Set([...NEG0, 'cannot', 'nothing', 'nobody', 'none']);
/** Words that open an agreeing reply. */
const YES0 = new Set('yes yeah yep ok okay sure right exactly true agreed absolutely definitely fine good great'.split(' '));

const isNeg = (w: string) => NEG.has(w) || w.endsWith("n't");

export function isReplyIntent(x: unknown): x is ReplyIntent {
  return x === 'agree' || x === 'disagree' || x === 'ask';
}

/**
 * How well a sentence fits a reply type, from INTENT_CUE_MIN to INTENT_CUE_MAX.
 * - ask: +1 if the first word is a question starter.
 * - disagree: +1 if the first word is no/not/never/nope/nah, +1 if any word is negative,
 *   -1 if the first word is an agreeing word.
 * - agree: +1 if the first word is an agreeing word, -1 if it is no/not/never/nope/nah.
 */
export function intentCue(words: readonly string[], intent: ReplyIntent): number {
  if (words.length === 0) return 0;
  const ws = words.map((w) => normalize(String(w)));
  const first = ws[0]!;
  switch (intent) {
    case 'ask':
      return QS.has(first) ? 1 : 0;
    case 'disagree':
      return (NEG0.has(first) ? 1 : 0) + (ws.some(isNeg) ? 1 : 0) - (YES0.has(first) ? 1 : 0);
    case 'agree':
      return (YES0.has(first) ? 1 : 0) - (NEG0.has(first) ? 1 : 0);
    default:
      return 0;
  }
}

/**
 * Re-rank scored candidates for a reply type: adjusted score = score + INTENT_WEIGHT * cue,
 * then a stable sort (equal adjusted scores keep their input order). With no reply type the
 * input order is returned unchanged. The output is always a permutation of the input (the same
 * objects), so a candidate can move but never change. A non-finite score sorts last.
 * A candidate never passes one whose score is more than
 * (INTENT_CUE_MAX - INTENT_CUE_MIN) * INTENT_WEIGHT higher.
 */
export function rankByIntent<T extends { words: readonly string[]; score: number }>(candidates: readonly T[], intent?: ReplyIntent): T[] {
  if (!isReplyIntent(intent)) return [...candidates];
  return candidates
    .map((c, i) => {
      const base = Number.isFinite(c.score) ? c.score : -Infinity;
      return { c, i, s: base + INTENT_WEIGHT * intentCue(c.words, intent) };
    })
    .sort((a, b) => (a.s === b.s ? a.i - b.i : a.s > b.s ? -1 : 1))
    .map((t) => t.c);
}
