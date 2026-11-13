# Requirements: eval-harness

## Introduction

The eval harness measures how well Ninth Life turns 9-key key presses (letter mode, and initials
mode as a stretch) back into the sentence the person meant. It owns the data the app ships (`data/`) and the frozen test set, runs
a simulated user against each decoder configuration (B0 to B4), and regenerates
`packages/eval/RESULTS.md`. Ninth Life is a general-purpose text entry and text-to-speech tool;
the harness reports measured numbers only, never claims.

Owner: data and evaluation (packages/eval, data/). Plan: `docs/plan/00-source-plan.md` section 3.
Contracts: `docs/architecture/contracts.md` sections 1 and 2.

## Glossary

- **Code**: the digit string for one word in letter mode (`"isn't"` → `4768`).
- **Gold sentence**: the sentence a crowd worker wrote; the target the simulated user types.
- **Decoder / config**: B0 dict, B1 ghost, B2 LLM raw, B3 LLM + validator, B4 lattice-constrained LLM + validator.
- **Initials mode** ("Phantom mode", plan section 3.3): one press per word, on the key of its first letter.
- **Response cache**: `packages/eval/.cache/llm/` (gitignored), one file per Messages API request, named by the request hash.
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
5.9 THE lexicon builder SHALL also emit `data/lexicon/en.v2.json` (`LexiconFileV2`, ADR-data-003) from `en.v1.json`: the
    same words and `zipfX10`, grouped by `zipfX10` highest first, in the order JavaScript reads v1 inside a group, with
    `derived_from.sha256` naming the v1 file; it SHALL be byte-identical for the same v1, AND the committed v2 SHALL be
    what the builder derives from the committed v1.
5.10 THE lexicon builder SHALL by default leave out the words, and their possessives, whose SHA-256 is in
    `packages/eval/scripts/slurs.sha256.json` (identity slurs, decision D7, ADR-data-004), SHALL record the mode, the
    list's SHA-256, the counts and 8-digit hash prefixes (never the words) in `build-stats/lexicon.json`, and SHALL
    rebuild the previous lexicon byte-for-byte with `--slurs keep`. General profanity SHALL NOT be on the list. A left-out
    word SHALL stay typeable through spell mode and "Add to my words" (web-ui Req 19, 21).

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
7.4 THE report SHALL only measure; it SHALL NOT change the lexicon. (The lexicon build does the filtering, Req 5.10; the report reads its slur marks from the same hash list.)

## Requirement 8: Model runs (B2 to B4 against the Anthropic API or MiniMax's Anthropic-compatible API, ADR-002)

**User story:** As the team choosing the default model (decision D5), I want B2 to B4 measured with
one command on the shipping code, at a known cost, so that the choice rests on numbers.

8.1 WHEN `pnpm -F @ninth/eval llm` is run, THE harness SHALL measure B2 (the decoder's prompt with no lattice and no guesses, no validator), B3 (the same replies filtered by `validate()`) and B4 (`handleDecode` with the request the app's `buildRequest` sends: 12 lattice words per slot, the top 5 ghost beams, the partner line, k = 5, at most 4 KB) using `@ninth/decoder`'s `AnthropicLlmClient`, `buildPrompt`, `maxTokensFor` and `parseReply`, and SHALL NOT keep a second copy of the prompt; like the app, B4 SHALL send no request when a slot has no lexicon word or a code exceeds the route's limits.
8.2 THE harness SHALL cache every successful reply on disk under `packages/eval/.cache/llm/`, keyed by the SHA-256 of the API version, URL and request body, AND WHEN a request is already cached THE harness SHALL answer it from the cache without a network call, so that a rerun costs nothing and gives the same results.
8.3 THE harness SHALL keep at most `--concurrency` (default 4) requests in flight, SHALL retry 408, 429, 5xx and 529 replies with exponential backoff (1 s doubling, at most 30 s, the server's retry-after when given, at most 6 attempts), AND IF a request fails with any other status or runs out of attempts, THEN THE harness SHALL stop sending, SHALL exit non-zero and SHALL write no results.
8.4 THE harness SHALL record, for each item and LLM config, sentence top-1 and top-5, the share of model sentences that fail `validate()` before the validator, the latency of each successful call (p50 and p95 per config), input, output, cache-read and cache-write tokens from the reply's `usage`, and the cost at `packages/decoder/src/models.ts` list prices.
8.5 WHEN a model run starts, THE harness SHALL print, before sending any request, a cost estimate (requests not yet cached x average tokens per call x list price), SHALL accept `--plan` to stop after it, AND IF the estimate is above $1 and `--yes` was not given, THEN THE harness SHALL send nothing and exit 3; IF the key for the model's provider (`ANTHROPIC_API_KEY` for Claude models, `MINIMAX_API_KEY` for `MiniMax-M3` and `MiniMax-M3.1-Flash`) is unset outside a dry run, THEN it SHALL send nothing and exit 2.
8.6 THE harness SHALL write each run as a `RESULTS.md` section marked with the model, mode, date and item count and replace only the section of the same model and mode; `pnpm -F @ninth/eval eval` SHALL keep these sections when it rewrites the file; the same numbers without dates or timings SHALL go to `RESULTS.llm.json`.
8.7 THE harness SHALL read the API key only from the provider's environment variable (`ANTHROPIC_API_KEY` or `MINIMAX_API_KEY`; `MINIMAX_BASE_URL` may override the MiniMax host) AND SHALL NOT write it to the cache, results, per-item records or logs.
8.8 WHEN `--dry-run` is given, THE harness SHALL run the whole path against an in-process fake Messages API with no key and no network, SHALL keep its replies in a separate cache namespace, and SHALL NOT write into `packages/eval/`.
8.9 THE decoder package SHALL provide `pnpm -F @ninth/decoder live-check`, which sends one real request per model (two identical ones for Haiku 5.5) and checks that Haiku 5.5 accepts `thinking: {type: "disabled"}` with no sampling parameters on the pinned `anthropic-version`, that the second Haiku 5.5 request reports `cache_read_input_tokens > 0`, that the reply parses and validates, and reports each response time; it SHALL exit non-zero on a failed check AND SHALL skip with a clear message when no key is set. WITH `MINIMAX_API_KEY` it SHALL check the MiniMax models the same way (Bearer auth, no `cache_control`; `MiniMax-M3` with thinking disabled), and `-- --model <id>` SHALL limit the run to one model (ADR-002).
8.10 THE eval workflow SHALL offer B2 to B4 as a manual-dispatch input (model, mode, limit, cost confirmation), off by default, reading `secrets.ANTHROPIC_API_KEY` only in the steps that call the API, AND SHALL NOT run it on pull requests or on the schedule.

## Requirement 9: Initials mode (plan section 3.3, stretch "Phantom mode")

**User story:** As the team deciding whether to build initials mode, I want an offline baseline and
a prepared model run, so that we know how much the mode depends on the model before building it.

9.1 WHILE in initials mode, THE simulated user SHALL press one key per word (the key of its first letter) and one space key between words; WHEN the gold sentence is not in the top k, it SHALL press # through the slot's 12 readings as the app does, AND IF the gold word is not among them, THEN it SHALL retype that word in letter mode (its full code plus # presses) and count it as retyped.
9.2 WHEN `pnpm -F @ninth/eval eval` or `quick` is run, THE harness SHALL also report B0 and B1 in initials mode on the same items (word accuracy, sentence top-1 and top-5, presses per character, words retyped) and the share of gold words and sentences inside the 12-word initials lattice.
9.3 WHEN `pnpm -F @ninth/eval llm --mode initials` is run, THE harness SHALL send one-digit codes in initials mode through the same B4 path (default config B4; `--only` may add B2 and B3).

## Requirement 10: Reply types, upper bound (ADR-008)
10.1 WHEN `--intent oracle` is given, THE harness SHALL evaluate only items with a partner line and a
     reply type read off the gold sentence ("?" ask, no/not/never/nope/nah first disagree, an agreeing
     word first agree).
10.2 THE offline CLI SHALL run B1 and B1i "B1+intent (oracle)" (B1 re-ranked with rankByIntent over a
     pool of INTENT_POOL) and SHALL NOT write into packages/eval.
10.3 THE model CLI SHALL send the reply type as `context.intent` with re-ranked beams for B4, in its own
     RESULTS.md section (`<model>:<mode>:intent-oracle`), labelled an upper bound.
