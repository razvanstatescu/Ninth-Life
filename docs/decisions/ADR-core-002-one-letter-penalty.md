# ADR-core-002: Penalise one-letter words other than "a" and "i" in the language models

- Status: accepted
- Date: 2026-11-06
- Plan item: F2 (`docs/plan/01-implementation-plan.md`)
- Contract: `docs/architecture/contracts.md` §1 (`lm.ts`), additive

## Context
wordfreq lists every letter of the alphabet as a word, with Zipf 4.5 to 5.9 ("s" 5.9, "t" 5.4,
"h" 5.1). Each one-digit code therefore holds three or four "words", and ghost mode offered
sentences such as "H need water" (rank 5 for `4 6333 92837`). On the frozen test set, 109 of 866
items had a one-letter reading other than "a" or "i" somewhere in the five B1 suggestions. Only
2 of 4,890 gold words are such letters ("j", and "e" from "E-mail").

Removing the letters from the lexicon would make a spelled letter ("vitamin c", "plan b") impossible
to type offline, so the change belongs in the scoring, not in the data.

## Decision
`unigramModel(lex, opts?)` and `bigramModel(file, lex, opts?)` take optional `LmOptions`:

```ts
export const DEFAULT_LETTER_PENALTY = -3;          // log10
export const SPOKEN_LETTERS: readonly string[];    // ['a', 'i']
export interface LmOptions { letterPenalty?: number; spokenLetters?: readonly string[] }
```

A one-letter word (after `normalize`) that is not in `spokenLetters` gets `letterPenalty` added to
its log-probability, in the unigram and in both bigram branches (listed pair and backoff). The
result stays in `[LOGP_FLOOR, 0]` (`[-9 + backoff, 0]` on the backoff branch, as before). Values
above 0 count as 0; `{ letterPenalty: 0 }` turns it off. It is **on by default**, so the web app,
the eval harness and anything else that builds a model gets it without code changes.

The lexicon, the lattice and `#` cycling are untouched: the penalty only reorders sentences.

## Measurements (full test set, 866 items, k = 5, data before the ADR-data-002 rebuild)

| Penalty | B1 top-1 | B1 top-5 | Turk top-5 | B0 top-5 | Items with a stray letter in the B1 top 5 | Unreachable |
|---|---|---|---|---|---|---|
| 0 (before) | 85.5% | 97.1% | 94.7% | 91.8% | 109 | 15 |
| -1 | 85.5% | 97.1% | 94.7% | 91.9% | 63 | 15 |
| -2 | 85.5% | 97.2% | 95.0% | 91.9% | 29 | 15 |
| **-3 (chosen)** | 85.5% | 97.2% | 95.0% | 91.9% | 18 | 15 |
| -4, -6 | 85.5% | 97.2% | 95.0% | 91.9% | 18, 17 | 15 |

-3 is where the effect saturates. The 18 items left are one-word sentences on a one-digit code,
where the only readings are letters (for example "a" on key 2 shows "a", "b", "c").

## Consequences
- Requirement core-encoder 4.5 (penalty only lowers one-letter scores, by at most the penalty) and
  5.8 (the penalty never removes a reading; with an exhaustive beam the same sentences come out,
  only reordered) are property-tested in `packages/core/test/{lm,decode}.test.ts`.
- Requirement 4.1 now reads "zipf - 9, plus the letter penalty for a one-letter word other than
  a/i".
- The eval harness records the penalty in `RESULTS.json` (`lm.letterPenalty`) and takes
  `--letter-penalty <x>` for experiments.
- Other languages: `spokenLetters` should be set per language (Romanian "a", "o", "e", "i"; Spanish
  "a", "e", "o", "u", "y").
