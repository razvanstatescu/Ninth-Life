# ADR-data-004: Drop identity slurs from the lexicon; keep them typeable on purpose

- Status: accepted
- Date: 2026-11-09
- Plan item: open decision D7 (`docs/plan/01-implementation-plan.md`), now decided here
- Contract: `docs/architecture/contracts.md` §2 (`data/lexicon/en.v1.json`, `en.v2.json`): same shape, new build step

## Context
`packages/eval/reports/offensive-readings.md` (ADR-data-002, "Also measured") checks the lexicon
against the LDNOOBW English list (CC BY 4.0, fetched into the gitignored cache, never committed).
On the lexicon before this ADR (`d27fc037…`), 150 listed words were in the lexicon. The
decoding-quality owner marked 14 of them as **identity slurs** (race or ethnicity, sexual
orientation or gender identity, disability) and the other 136 as **other** (general profanity,
sexual words). 7 of the 14 share a code with ordinary words, and a slur appeared among the B1
top 5 for 8 of 866 test items (0.9%), never at top 1. Most of those came from one word, rank 2 of
2 under the keys of "like".

Ninth Life is a voice for people who cannot speak, so two things matter at once:

- A slur must never turn up as a suggestion the person did not ask for. A wrong sentence spoken
  aloud in someone's voice does real harm, and in letter mode the person cannot see every
  alternative before they choose.
- People have the right to say what they mean, swearing included. So general profanity and
  sexual words are not touched, and even a slur stays typeable when the person spells it on purpose.

## Options measured
Built with `build_lexicon.py --slurs keep|down|drop` (the bigrams and pack were rebuilt and are
byte-identical in every case: no listed word is in the AACText or Turk training text). The
offensive report's analysis ran on the full frozen set (866 items, B1 ghost, k = 5).

| Option | Listed words in the lexicon | Slurs in the lexicon | Items with any listed word in top 5 | Items with a **slur** in top 5 | Items at top 1 |
|---|---|---|---|---|---|
| keep (before) | 150 | 14 | 12 (1.4%) | 8 (0.9%) | 0 |
| down (Zipf set to the 2.0 floor) | 150 | 14 | 10 (1.2%) | **6 (0.7%)** | 0 |
| **drop (chosen)** | 136 | 0 | 4 (0.5%) | **0** | 0 |

"Down" cannot meet the goal. The word behind 6 of the 8 items already sits last in its code (2 of
2, Zipf 2.4), so moving it to the 2.0 floor changes nothing: the beam still offers it as the
second-best reading in a sentence. "Down" also does nothing for the 7 slurs that are the only
reading of their keys, which would still show up as the first and only suggestion. ADR-data-002
chose "down" for acronyms and junk because dropping them made test items unreachable; no test
item contains a slur, and the web app has a deliberate path for words the dictionary lacks.

Offline quality (`pnpm -F @ninth/eval eval`, full set):

| Config | Lexicon | Word acc | Sent top-1 | Sent top-5 | KSR | Unreachable |
|---|---|---|---|---|---|---|
| B0 dict | before (58,906 words) | 91.5% | 62.4% | 92.0% | -1.2% | 15 |
| B0 dict | after (58,892 words) | 91.5% | 62.4% | 92.0% | -1.2% | 15 |
| B1 ghost | before | 96.8% | 85.6% | 97.3% | -0.0% | 15 |
| B1 ghost | after | 96.8% | 85.6% | 97.3% | -0.0% | 15 |

Every metric in `RESULTS.json` is identical; only the lexicon hash and word count changed.

## Decision
Ship `--slurs drop` as the default of `build_lexicon.py` (step 3c, before the contraction and
word-class steps). Words on the list, and their possessives (`x's`, matched by the stem), are left
out of `en.v1.json` and therefore of `en.v2.json` and the bigrams.

- **The list is hashes, not words.** `packages/eval/scripts/slurs.sha256.json` holds the SHA-256 of
  each normalized word and its keypad code. No file in the repository spells them (the same pattern
  as the trademark list, `BANNED_SHA256`). The code is there so a test can recover the word by
  trying every spelling of those keys (at most 4^7 for the longest entry) without writing it down.
- **One list, three readers:** the build drops with it, `src/offensive.ts` marks report rows with
  it, and `test/data.test.ts` checks the committed v1 and v2 lexicons against it.
- **Still typeable on purpose.** Typing the keys of a dropped word gives the other readings of
  those keys, or, when there are none, its digits and "not spelled yet" (web-ui Req 20). Spell mode offers every letter on each pressed key, and "Add to my
  words" puts the word in that person's own dictionary on their device (`Lexicon.addWords`, web-ui
  Req 19 and 21). From then on it is a normal reading for that person. `packages/web/test/words.test.ts`
  checks this for every listed word against the shipped `en.v2.json`.
- **Profanity stays.** The 136 "other" words (general swearing, sexual words) are not on the list.
  `test/data.test.ts` pins one common swear word by hash so a later change cannot quietly drop it.
- `build-stats/lexicon.json` records the mode, the list's SHA-256, how many words were listed and
  affected, and their 8-digit hash prefixes (never the words). `--slurs keep` rebuilds the previous
  lexicon byte-for-byte (`d27fc037…`).

Result: 58,906 → 58,892 words (14 dropped, no possessive forms were present), 48,140 → 48,133
codes, shared-code share 27.0% (unchanged to one decimal). Brotli sizes: v1 328,257 → 328,247 B,
v2 193,816 → 194,071 B (+255 B, a compression artefact of the reshuffled groups). `eval.lock` was
regenerated with `pnpm data:freeze`; the fixture is byte-identical (`9fefd9db…`).

## Licenses
No new data is committed. The hash list was selected by hand from the LDNOOBW list (CC BY 4.0),
which is still only fetched into `.cache/`. A SHA-256 is not a copy of the list, but
`data/NOTICE.md` credits LDNOOBW anyway, as the source of the selection that shaped `en.v1.json`.

## Consequences
- The report (`reports/offensive-readings.md`) now shows 0 slurs in the lexicon and 0 test items
  with a slur in the top 5. The remaining 4 items show one word marked "other", which stays.
- The model-ranking results in `RESULTS.llm.json` were measured on the previous lexicon and were
  not rerun (paid API). The dropped words are never gold words, so B2-B4 can only lose a wrong
  candidate.
- **Known gap.** LDNOOBW is a profanity list, not a slur list, and misses some identity slurs.
  A spot check on 2026-11-09 found about 20 more candidate words in the lexicon (most are the only
  reading of their keys; a few share keys with ordinary words at rank 3 to 7). Several are also
  ordinary words in other senses (engineering, biology, a sports team, a reclaimed identity word),
  so adding them is a judgement call for the owner. To add one: append its SHA-256 and code to
  `slurs.sha256.json`, run `pnpm data:build` and `pnpm data:freeze`, then the report and the eval.
- Revisit if a person reports that a word they need is gone. "Add to my words" already restores it
  for them; a word that is mainly not a slur should come off the list.
