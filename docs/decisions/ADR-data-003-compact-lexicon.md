# ADR-data-003: Ship a compact lexicon file (en.v2.json) with codes derived on load

- Status: accepted
- Date: 2026-11-06
- Plan item: F9 (`docs/plan/01-implementation-plan.md`), measured in `docs/testing/performance.md`
- Contract: `docs/architecture/contracts.md` §1 (`LexiconFileV2`, additive) and §2 (new data file)
- Specs: core-encoder Req 2.8 - 2.11, eval-harness Req 5.9, web-ui Req 23

## Context
On a Moto G-class profile (4x CPU, Slow 4G) the first load was 687-692 KB with gzip against a 700 KB
budget, and 402 KB of it was `data/lexicon/en.v1.json`. Parsing it took 108.6 ms on desktop
(target < 100 ms) and 457 ms at 4x CPU: `JSON.parse` builds 48,140 keys and 58,906 small arrays,
then `Lexicon.fromJSON` normalizes and re-encodes every word.

Most of those bytes are redundant. Every v1 key is a code that `fromJSON` recomputes from the word
anyway (Req 2.6: the file is never trusted to file a word under the right code), and every word
repeats its frequency.

## Decision
Keep `en.v1.json` exactly as it is: the eval harness, `eval.lock`, the frozen test set and the
Python builders (bigrams, pack, test set) keep reading it. Add `data/lexicon/en.v2.json`, built by
`packages/eval/scripts/build_lexicon.py` from v1 (`compact_lexicon`, or `--compact-only` to derive it
from the committed v1 offline), and ship only v2 in the web app.

```jsonc
{ "v": 2, "lang": "en", "source": "<v1 source>; compact v2 of en.v1.json ...", "license": "CC-BY-SA-4.0",
  "derived_from": { "file": "en.v1.json", "sha256": "<sha-256 of the v1 bytes>" },
  "words": [
    [77, "the"],
    [74, "a and of to"],
    ...                       // one [zipfX10, "space-separated words"] group per value, highest first
  ] }
```

- **Groups by zipfX10, highest first.** Words arrive in rank order, so every code's list is already
  sorted when it is built and `fromJSON` sorts nothing.
- **Order inside a group: the order JavaScript reads v1** (`js_code_order`: integer-like codes up to
  2^32 - 2 ascending by value, then longer codes as written), then the code's own order. Core breaks
  score ties by load order, so `lookup()` and `completions()` return the same lists for v1 and v2,
  word for word. A first version ordered codes lexicographically; it gave identical letter-mode
  eval numbers but moved initials-mode KSR by 0.3-0.9 points (initials mode reads `completions`),
  so it was changed before shipping.
- **No codes in the file.** The loader computes them, through a per-letter table for words that are
  plain a-z and `'` and through `normalize` + `encodeWord` for anything else. Soundness (Req 2.6)
  does not depend on the file, so there is no checksum to trust: a corrupted or hand-edited v2 file
  can only lose words or change their rank, never put a word under a code it does not type.
- **Still JSON, still CC BY-SA 4.0, still in `data/`**, with `data/NOTICE.md` listing it.
  `derived_from.sha256` ties it to the v1 file it was made from.

## Measurements
Sizes (`docs/architecture/data-and-eval.md` §2):

| File | Raw | gzip -9 | brotli 11 |
|---|---|---|---|
| `en.v1.json` | 1,558,083 B | 402,255 B | 328,257 B |
| `en.v2.json` | 483,570 B | 230,120 B | 193,816 B |

Parse, `JSON.parse` + `Lexicon.fromJSON`, median of 3 in the app's page: see
`docs/testing/performance.md` (desktop and 4x CPU, v1 and v2 with the same core).

Groups ordered lexicographically by code were 10 KB smaller with gzip (220,568 B); we kept the
JavaScript order so the two files are interchangeable for every API, including tie-breaks.

Eval (`pnpm -F @ninth/eval quick`, 200 items, seed 9): `RESULTS.json` with the new core on v1 is
byte-identical to the old core on v1; with `--lexicon data/lexicon/en.v2.json` it differs only in
the lexicon SHA-256 (letter mode and initials mode, B0 and B1).

## Tests
- `packages/eval/scripts/test_build_lexicon.py` `CompactTest`: lossless and deterministic for 300
  random v1 dicts (including codes past 2^32 - 2), byte-identical writes, and the committed v2 is
  exactly what the builder derives from the committed v1 (eval-harness Req 5.9).
- `packages/eval/test/compact.test.ts`: header and licence, the documented order, and v1 and v2 load
  to the same Lexicon: size, every `lookup`, every `zipf`, `completions(p, 12)` (core-encoder Req 2.11).
- `packages/core/test/lexicon.test.ts`: the fast path loads exactly what the old algorithm did, lying
  files included (Req 2.8); random v1 files and their v2 twin load to the same lexicon (Req 2.9).

## Consequences
- Two lexicon files in `data/` (2.0 MB raw). They must change together: rebuild with
  `build_lexicon.py` (it writes both) or run `--compact-only` after editing v1. The Python and TS
  sync tests fail if they drift.
- `en.v1.json` is still copied into `public/data/` because the landing page reads it at build time.
  It is not precached and the app never fetches it.
- `LexiconFile` (v1) is unchanged; `LexiconFileV2` and `Lexicon.fromJSON(v2)` are additive. A new
  language can ship either format.

## Alternatives considered
- **C1 only, a faster v1 loader.** Done as well (the per-letter fast path and no re-sort help v1
  too), but it leaves 402 KB on the wire and `JSON.parse` of 48k keys.
- **`code -> "word:61 word:58"` strings (data-and-eval.md C3).** 391 KB gzip: the codes are the
  redundant part, and this keeps them.
- **A binary or delta-coded format.** Smaller still, but not a readable, diffable data file, and
  gzip/brotli already remove most of what delta coding would.
