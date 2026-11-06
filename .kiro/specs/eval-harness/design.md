# Design: eval-harness

## Overview

Two halves, joined by files with pinned hashes:

```
 aactext.org ──fetch_datasets.py──▶ packages/eval/.cache/   (gitignored, SHA-256 pinned)
                                         │
 wordfreq 3.1.1 ──build_lexicon.py──▶ data/lexicon/en.v1.json ─────────────┐
 .cache train splits ──build_bigrams.py──▶ data/lexicon/en.bigram.v1.json ─┤
 .cache AACText train ──build_pack.py──▶ data/packs/core-en.json           │
 .cache test splits ──build_testset.py──▶ fixtures/test.v1.jsonl + eval.lock
                                                                           ▼
                    src/cli.ts ─▶ run.ts ─▶ decoders.ts (B0..B4) ─▶ simulate.ts ─▶ metrics.ts
                                                     │                 │
                                                @ninth/core      scan-cost.ts (core scanReducer)
                                                                           ▼
                                               RESULTS.json (deterministic) + RESULTS.md
```

Python (3.13, venv at `packages/eval/.venv`, pins in `requirements.txt`) builds data. TypeScript
(`tsx`) evaluates, importing `@ninth/core` directly so the harness measures the shipped code.

## Components

| Module | Responsibility | Requirements |
|---|---|---|
| `scripts/ninth_common.py` | normalize / encode / tokenize mirroring core; dataset loaders | 1.3, 1.4, 5.1 |
| `scripts/fetch_datasets.py` | per-file download, SHA-256 pins, exclusion list | 1.6, 1.7 |
| `scripts/build_lexicon.py` | wordfreq → `LexiconFile`, size and collision stats | 5.1, 5.2, 5.6 |
| `scripts/build_bigrams.py` | train splits → `BigramFile`, held-out perplexity | 1.5, 5.3, 5.6 |
| `scripts/build_pack.py` | Universal Core + mined phrases → `VocabPack` | 1.5, 5.4, 5.5 |
| `scripts/build_testset.py` | fixture + lock; `--check` rebuilds and compares | 1.1, 1.3, 1.4 |
| `src/fixture.ts` | load fixture, verify lock | 1.2, 2.5 |
| `src/decoders.ts` | B0, B1, `llmDecoder` for B2–B4 behind `LlmProposer` | 3.1–3.6 |
| `src/simulate.ts` | simulated user (presses, selections, Next fallback) | 4.1–4.3, 4.6 |
| `src/scan-cost.ts` | scan steps by driving core `scanReducer` | 4.5 |
| `src/metrics.ts` | aggregation, percentiles | 4.4, 4.7, 4.8 |
| `src/run.ts`, `src/rng.ts` | subset selection, orchestration, canonical JSON | 2.1, 2.2, 6.1–6.3 |
| `src/report.ts`, `src/cli.ts` | markdown, options, writing results | 2.1–2.5 |

## Key decisions

**Bigram smoothing.** Interpolated bigram with modified Kneser-Ney discounts (D1, D2, D3+ from
count-of-counts). The lower-order distribution is the deployed unigram
(`log10 Pu = zipfX10/10 − 9`, exactly `unigramModel`), not KN continuation counts, because
`bigramModel` in core backs off to that unigram for any pair not stored. So
`logp[v][w] = log10((c(v,w) − D)/c(v) + λ(v)·Pu(w))` and the unseen mass is `λ(v)·Pu(w)`. Pruning
drops pairs whose probability is within 0.2 log10 of the backoff estimate, then renormalizes
`backoff[v] = log10((1 − Σ kept P) / (1 − Σ kept Pu))`.

**Turk structure.** `turk-dialogues-filtered.txt` has inconsistent delimiters (tabs replaced by
runs of spaces, wrapped lines), so turn boundaries cannot be recovered from it. We take the set of
surviving dialogue ids from the filtered file and the turns and split label from
`turk-dialogues.txt`, which is cleanly tab-separated.

**Determinism.** Randomness only from `mulberry32(seed)`. Latency is measured but kept out of
`RESULTS.json` (it goes to `RESULTS.md`). Numbers are rounded to 4 decimals; configs sorted by id;
JSON written with a fixed key order.

**Word accuracy with no candidate.** `decodeGhost` returns `[]` if any code has no lexicon word.
The simulated user then sees each slot's most frequent word (what the keypad shows while typing),
and word accuracy is computed on that.

**LLM plug-in.** `--llm <module>` loads a module exporting `createProposer(): LlmProposer`.
The decoder package can wrap its `LlmClient`, `buildPrompt` and `parseReply` without the harness
depending on the Anthropic API client.

## Correctness properties

Each property is a test in `packages/eval/test/` (P = property-based with fast-check, E = example).

| # | Property | Validates | Test |
|---|---|---|---|
| P1 | For every fixture item, `codes[i] === encodeWord(words[i])` and `validate(words, codes)` holds. | 1.4 | `fixture.test.ts` (exhaustive over fixture) |
| P2 | Any byte change to the fixture makes `loadFixture` throw. | 1.2 | `fixture.test.ts` (E) |
| P3 | Core `tokenize(text)` equals the stored gold words for every item (Python and TS tokenizers agree). | 1.3, 1.4 | `fixture.test.ts` (exhaustive) |
| P4 | Every lexicon entry: normalized, encodes to its code, integer zipfX10 ≥ 20, sorted desc, unique; ≥ 40,000 words; core loads all of them. | 5.1, 5.2 | `data.test.ts` (exhaustive) |
| P5 | Every bigram value ≤ 0 with ≤ 2 decimals; prev ∈ lexicon ∪ {`<s>`}; every prev has a backoff; Σ_w P(w | v) ∈ (0.5, 1.1) for frequent v. | 5.3 | `data.test.ts` |
| P6 | Pack: 36 unique core words in the lexicon; 100–200 phrases of ≤ 6 known words; boosting changes no first reading. | 5.4, 5.5 | `data.test.ts` |
| P7 | Perfect decoder ⇒ word acc = top-1 = top-5 = 1 and KSR = apostrophes / characters. | 4.1, 4.2, 4.4 | `harness.test.ts` (E) |
| P8 | Next fallback cost equals the cyclic distance in lexicon order; an OOV gold word is unreachable. | 4.3 | `harness.test.ts` (E) |
| P9 | Every grid cell is reachable within rows + max(row length) highlight steps and 2 selects. | 4.5 | `harness.test.ts` (exhaustive over grid) |
| P10 | B3 and B4 never return a candidate that fails `validate()`; B2 returns them unfiltered. | 3.5 | `harness.test.ts` (E) |
| P11 | For any seed, two runs give byte-identical `RESULTS.json`; two CLI runs write identical bytes. | 6.1, 6.2 | `harness.test.ts` (P, 5 seeds + CLI) |
| P12 | `sample(xs, n, seed)` is deterministic, order-preserving and repeat-free. | 2.1, 6.3 | `harness.test.ts` (P) |
| P13 | Rebuilding the fixture from the cached inputs reproduces the locked SHA-256. | 1.1, 5.6 | `pnpm -F @ninth/eval data:check` |

## Error handling

- Hash mismatch on a download: stop, print both hashes; upstream changes are reviewed by a person.
- Fixture hash mismatch: refuse to run (results would not be comparable).
- Data hash mismatch with the lock: warn and continue (expected while iterating on data).
- LLM backend throws: the run fails loudly; there are no silent partial numbers.
