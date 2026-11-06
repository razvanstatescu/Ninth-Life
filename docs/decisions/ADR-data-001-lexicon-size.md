# ADR-data-001: Keep the 60,000-word English lexicon

- Status: accepted (lead default; team can revisit at M2)
- Date: 2026-11-06

## Context
`data/lexicon/en.v1.json` is 1.56 MB raw / 328 KB brotli, 2.8x the source plan's ~550 KB raw
estimate. The contract's per-word frequency field (`zipfX10`) accounts for the difference. Lexicon
plus bigrams is 413.6 KB brotli, under the 700 KB first-load budget.

Measured on the frozen 866-item test set (B1 ghost, k = 5):

| Lexicon | Raw | Brotli | Sentence top-1 | Unreachable items |
|---|---|---|---|---|
| 60k (`--top 60000`) | 1.56 MB | 328 KB | 85.5% | 15 |
| 40k (`--top 40000`) | 1.05 MB | 221 KB | 84.4% | 29 |

## Decision
Keep 60k. The bundle is served brotli-compressed and precached once by the service worker. The
107 KB saved is not worth twice as many unreachable sentences.

## Revisit if
Parse time on a low-end phone exceeds 150 ms, or the trie's ~22 MB heap (ADR-core-001 notes) causes
memory pressure. Then measure a 40.6k cut (the 40k floor) or a more compact trie first.
