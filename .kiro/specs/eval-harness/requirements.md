# Requirements: eval-harness

## Introduction

The eval harness measures how well Ninth Life turns 9-key letter-mode key presses back into the
sentence the person meant. It owns the data the app ships (`data/`) and the frozen test set, runs
a simulated user against each decoder configuration (B0 to B4), and regenerates
`packages/eval/RESULTS.md`. Ninth Life is a general-purpose text entry and text-to-speech tool;
the harness reports measured numbers only, never claims.

Owner: data and evaluation (packages/eval, data/). Plan: `docs/plan/00-source-plan.md` section 3.
Contracts: `docs/architecture/contracts.md` sections 1 and 2.

## Glossary

- **Code**: the digit string for one word in letter mode (`"isn't"` → `4768`).
- **Gold sentence**: the sentence a crowd worker wrote; the target the simulated user types.
- **Decoder / config**: B0 dict, B1 ghost, B2 LLM raw, B3 LLM + validator, B4 lattice-constrained LLM + validator.
- **Fixture**: `packages/eval/fixtures/test.v1.jsonl`; **lock**: `packages/eval/eval.lock`.
- **Train / dev / test split**: the splits published with the AACText and Turk datasets.

## Requirement 1: Frozen test set and dataset hygiene

**User story:** As the team, I want one frozen, held-out test set, so that results from different
days and decoders can be compared honestly.

1.1 THE test-set builder SHALL compose the fixture from the AACText `sent_test_aac.txt` split and at most 300 partner/reply turn pairs from the Turk dialogues test split, choosing Turk pairs deterministically.
1.2 WHEN the harness loads the fixture AND its SHA-256 differs from the value in the lock, THE harness SHALL refuse to run and SHALL report both hashes.
1.3 WHEN a candidate sentence contains a token that cannot be typed on keys 2–9, or has fewer than 1 or more than 20 words, THE test-set builder SHALL exclude it; words missing from the lexicon SHALL be kept.
1.4 THE fixture SHALL store, for each item, the gold words and their codes, and every stored code SHALL equal the encoding of its word.
1.5 THE bigram builder and the vocab-pack builder SHALL read only train splits; dev and test splits SHALL NOT be read by any data build.
1.6 THE fetch script SHALL download each dataset file individually, SHALL verify its SHA-256 against a pinned value, and SHALL NOT download `lm_test_switch.txt` or `lm_test_comm.txt`.
1.7 THE repository SHALL NOT contain any NonCommercial-licensed data; downloaded datasets SHALL live only in the gitignored `packages/eval/.cache/`.

## Requirement 2: CLI and reports

**User story:** As a developer, I want one quick command and one full command, so that I can check
a change in seconds and publish results when ready.

2.1 WHEN `pnpm -F @ninth/eval quick` is run, THE harness SHALL evaluate a 200-item subset chosen by a seeded PRNG and SHALL print a markdown results table.
2.2 WHEN `pnpm -F @ninth/eval eval` is run, THE harness SHALL evaluate every fixture item and SHALL write `RESULTS.json` and `RESULTS.md`.
2.3 THE results table SHALL have the columns of the plan section 3.4 template: config, word accuracy, sentence top-1, sentence top-5, KSR, scan steps per character, invalid pre-validator, p50 ms, p95 ms, $/1k.
2.4 THE `RESULTS.md` file SHALL contain only numbers measured by the harness; a config that was not run SHALL be shown as "not run" with no numbers.
2.5 WHEN the lexicon or bigram file hash differs from the lock, THE harness SHALL warn but SHALL still run.
2.6 THE harness SHALL accept `--lexicon` and `--bigram` paths and a `--letter-penalty` (<= 0) for data experiments, AND SHALL record the language-model letter penalty in `RESULTS.json`.

## Requirement 3: Decoder configurations

**User story:** As the decoder owner, I want to plug my LLM client into the same harness, so that
B2–B4 are measured exactly like the offline baselines.

3.1 THE B0 config SHALL rank candidates by dictionary frequency only (beam over the lattice with `unigramModel`).
3.2 THE B1 config SHALL use `@ninth/core` `decodeGhost` with `bigramModel` over the shipped bigram file.
3.3 THE harness SHALL accept an LLM backend through a pluggable `LlmProposer` interface, loadable from a module path at the command line, for configs B2, B3 and B4.
3.4 IF no LLM backend is configured, THEN THE harness SHALL report B2, B3 and B4 as "not run".
3.5 THE B3 and B4 configs SHALL pass only candidates for which `validate()` holds; B2 SHALL pass LLM candidates unfiltered.
3.6 WHEN B4 is evaluated, THE harness SHALL give the LLM backend the lattice (top 12 words per slot) and the top ghost-mode beams.

## Requirement 4: Simulated user and metrics

**User story:** As the team, I want metrics that count every press and selection, so that the
numbers reflect the effort a person would spend.

4.1 THE simulated user SHALL press one key per letter of each gold word (apostrophes are free) and one space key between words, and SHALL NOT count the final Speak.
4.2 WHEN the gold sentence is the top candidate, THE simulated user SHALL use 0 selections; WHEN it is at rank 1 to k−1, THE simulated user SHALL use 1 selection.
4.3 WHEN the gold sentence is not among the top k, THE simulated user SHALL start from the top candidate (or each slot's most frequent word if there is none) and press Next until each wrong word becomes the gold word in lexicon order, wrapping; IF a gold word is not in the lexicon, THEN THE item SHALL be counted unreachable and cost one full cycle.
4.4 THE harness SHALL report word accuracy (top-1 candidate vs gold, per word), sentence top-1 and top-5 exact match on normalized words, and KSR = 1 − (presses + selections) / characters including spaces.
4.5 THE harness SHALL count scan steps by driving `@ninth/core` `scanReducer` on the plan section 4.5 grid (rows of 5, 3, 3, 3, 3, 5 cells) and SHALL report steps per character.
4.6 WHERE a config returns pre-validator candidates, THE harness SHALL report the share of them that fail `validate()`.
4.7 THE harness SHALL report p50 and p95 wall-clock latency per decode call, and cost per 1,000 decodes where the backend reports cost.
4.8 THE harness SHALL report metrics separately for the AACText and Turk portions as well as overall.

## Requirement 5: Data files

**User story:** As a teammate, I want data files that match the contract exactly, so that
`@ninth/core` loads them without special cases.

5.1 THE lexicon builder SHALL emit `data/lexicon/en.v1.json` as a `LexiconFile` from wordfreq 3.1.1 `top_n_list('en', 60000)`, keeping a-z words with internal apostrophes and Zipf ≥ 2.0, normalized per the contract, with each word filed under its own code, sorted by frequency descending, and `zipfX10` an integer.
5.2 THE lexicon SHALL contain at least 40,000 words.
5.3 THE bigram builder SHALL emit `data/lexicon/en.bigram.v1.json` as a `BigramFile` with `<s>` as sentence start, Kneser-Ney style smoothing, log10 values at 2 decimals, every value ≤ 0, and only lexicon words.
5.4 THE pack builder SHALL emit `data/packs/core-en.json` as a `VocabPack` holding the 36 Universal Core words and 100 to 200 generic phrases with no personal names, every phrase word typable and in the lexicon.
5.5 THE pack boost SHALL NOT change the first reading of any code.
5.6 WHEN a data build is re-run on the same inputs, THE builder SHALL produce byte-identical output.
5.7 THE `data/` directory SHALL carry the CC BY-SA 4.0 license and a NOTICE crediting wordfreq and its upstream sources, the AACText and Turk datasets, and UNC CLDS Universal Core.
5.8 THE lexicon builder SHALL lower by `--down-zipf` (default 1.0, floored at the minimum Zipf) the words that SCOWL lists only in capitals (acronyms) and the words in no SCOWL list, SHALL NOT remove any word by doing so, and SHALL leave one-letter words, dictionary words and names unchanged (ADR-data-002). SCOWL SHALL be fetched with a pinned SHA-256 and SHALL NOT be committed.

## Requirement 6: Determinism

**User story:** As a reviewer, I want reruns to give identical results, so that a change in the
numbers always means a change in the code or data.

6.1 WHEN the harness is run twice with the same inputs and seed, THE harness SHALL write byte-identical `RESULTS.json`.
6.2 THE `RESULTS.json` file SHALL NOT contain timings, dates or host details.
6.3 THE harness SHALL NOT use unseeded randomness.

## Requirement 7: Offensive-readings report (decision D7)

**User story:** As the team deciding D7, I want to know how often an offensive word shows up as a
suggestion, so that we decide with data and without the report spreading the words.

7.1 WHEN `pnpm -F @ninth/eval report:offensive` is run, THE harness SHALL write `reports/offensive-readings.md` counting, on the frozen test set with B1 at k = 5, the items whose top-5 sentences contain a blocklisted word that is not in the gold sentence, and each listed word's code and rank in its code.
7.2 THE report SHALL NOT spell any blocklisted word: each SHALL be shown as its first letter plus dots and a SHA-256 prefix, including when it is another word's first reading.
7.3 THE blocklist SHALL be a public list with a compatible license, fetched with a pinned SHA-256 into the gitignored cache and never committed; the slur marks SHALL be stored as SHA-256 hashes.
7.4 THE report SHALL only measure; it SHALL NOT change the lexicon.
