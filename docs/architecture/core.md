# `@ninth/core`: the engine

`packages/core` is the part of Ninth Life that turns key presses into words and decides what may be
spoken. It is pure TypeScript with no DOM and no Node-only APIs, so the same code runs in the
browser (ghost mode), in Next.js server code (the decode route validates LLM output with it)
and in the eval CLI. `package.json` points `main`/`exports` at `src/index.ts`; consumers transpile it.

- Contract: `docs/architecture/contracts.md` §1, with clarifications in
  `docs/decisions/ADR-core-001-contract-clarifications.md`.
- Specs: `.kiro/specs/core-encoder/` and `.kiro/specs/access-modes/`.
- Tests: `pnpm -F @ninth/core test --run` (vitest + fast-check). `FC_SCALE=50` multiplies every
  property's run count for a long bug hunt; `FC_SEED=<n>` replays a run.

## Module map

| File | Exports | Role |
|---|---|---|
| `src/keymap.ts` | `KEYMAP`, `KEY_LETTERS`, `DIGITS`, `normalize`, `encodeWord`, `encodeSentence`, `tokenize`, `digitOf`, `isCode`, types `Mode`, `Digit` | Letters to keys. Normalization (NFKD, strip marks, lowercase, fold apostrophes). |
| `src/validator.ts` | `validate`, `matchesCode`, `proof`, types `ProofState`, `WordProof` | The safety core: a candidate is speakable only if every word encodes to its code. |
| `src/lexicon.ts` | `Lexicon`, `LexiconFile`, `LexiconFileV2`, `TRIE_TOP_K`, `NEW_WORD_ZIPF` | Exact code -> words map, sorted code index with cached completions, vocab packs; loads v1 and the compact v2 file (ADR-data-003). |
| `src/lm.ts` | `unigramModel`, `bigramModel`, `LanguageModel`, `BigramFile`, `LmOptions`, `BOS`, `LOGP_FLOOR`, `DEFAULT_LETTER_PENALTY`, `SPOKEN_LETTERS` | log10 scores for the beam, with the one-letter penalty (ADR-core-002). |
| `src/decode.ts` | `lattice`, `beam`, `decodeGhost`, `Candidate`, `GhostOptions`, defaults | Ghost mode: offline decoding, no LLM. |
| `src/format.ts` | `formatSentence`, `Punct` | Sentence case, `i` -> `I`, punctuation. Runs after validation and never changes words. |
| `src/scan.ts` | `initialScan`, `scanReducer`, `ScanConfig`, `ScanState`, `ScanEvent`, `ScanResult` | Row/column switch scanning as a pure reducer (the UI owns the timer). |
| `src/index.ts` | everything above | Public entry point. |

Dependency direction: `keymap` <- `validator`, `lexicon`, `lm` <- `decode`. `format` and `scan` are
standalone.

## Algorithms

### Encoding and normalization
`normalize(s)` = fold apostrophe look-alikes (‘ ’ ʼ ´ `) to `'`, NFKD, delete every `\p{M}`
combining mark, lowercase, fold apostrophes again (NFKD can produce ´ and ` from Greek and fullwidth
forms). `encodeWord(w)` walks the normalized code points: `'` is skipped (apostrophes are free, so
`isn't` = `4768`), a-z maps through a 26-character lookup string, anything else returns `null`; an
empty result is also `null`. `tokenize` splits normalized text on runs of characters that are not a
letter, number or apostrophe and trims edge apostrophes; `encodeSentence` encodes each token and
throws `RangeError` on the first one that cannot be typed.

### Validator
`validate(cand, codes, mode)`: lengths must match; for each slot the word's code must equal the
slot code (letter mode), or the slot code must be one digit equal to the word's first key (initials
mode). `proof` gives the per-word verdict for the proof panel: `match` (in lexicon), `new` (encodes
but unknown, e.g. a name, shown amber), `reject` (never spoken).

### Lexicon and completion index
`fromJSON` reads two formats: v1 (`codes`: code -> `[word, zipfX10]` lists) and the compact v2
(`words`: `[zipfX10, "w1 w2 ..."]` groups, highest first, no codes; ADR-data-003, what the app ships).
Either way the **code is computed from the word**, so a data error cannot put a word under a code it
does not type (Req 2.6). A word that is plain a-z and `'` is encoded with a 128-entry per-letter
table (`normalize` is the identity on such a word); anything else goes through `normalize` and
`encodeWord` (Req 2.8). `addWords` (vocab packs, my words) always takes the `normalize` path.

Entries are kept in a `Map` by word and a `Map` by code, each code's list in rank order (effective
zipf desc, ties in load order). A new entry has the largest load number, so a list only needs a sort
when the new entry outscores the current last one; only those lists are sorted (Req 2.9). v2 groups
arrive highest zipf first, so loading v2 sorts nothing.

Completions (Req 2.2, 2.10): instead of a trie, the lexicon keeps every code in one **sorted array**
(built by `prepare()` or the first `completions()` call: one sort of 48k strings). The codes that
start with a prefix are one contiguous run; a binary search finds it and a single pass keeps the
best k entries by rank, stopping inside each code's list as soon as an entry cannot make the top k.
Each answer is cached per prefix (up to 2,048 prefixes) until a score changes. `addWords` inserts a
new code into the sorted array in place and clears the cache, so nothing is rebuilt. The results are
identical to the old trie's (both are "the first k words with this prefix in global rank order"),
and the web app calls `prepare()` and fills the single-key cache in idle time after loading.

### Language models
Unigram: `log10 p(w) = zipf(w) - 9`, clamped to [-9, 0]; unknown words get -9. Bigram (Katz /
Kneser-Ney style backoff): `logp[prev][w]` if listed, else `backoff[prev] + unigram(w)`, with
`backoff` 0 for an unseen `prev`. Both normalize inputs that are not already plain `[a-z']`, and the
bigram reads own properties only (so `constructor` and `__proto__` are words, not prototype keys).

**One-letter penalty** (ADR-core-002, plan F2): wordfreq lists every letter as a word (Zipf 4.5 -
5.9), which put "H need water" in the top 5. Both models add `letterPenalty` (default -3 log10) to a
one-letter word that is not in `spokenLetters` (default "a", "i"), floored at -9; in the bigram it
applies to the listed value and, through the unigram, to the backoff branch. `{ letterPenalty: 0 }`
turns it off. The lexicon and lattice are unchanged, so a spelled letter ("vitamin c") is still
there; the property `Req 5.8` checks that an exhaustive beam returns the same sentences with and
without the penalty. On the test set it removed stray letters from the B1 top 5 in 91 of the 109
items that had one (the other 18 are one-word sentences on a one-digit code, where letters are the
only readings).

### Ghost decode
`lattice` = top `perSlot` (12) words per code (`[]` for an unknown code). `beam` keeps the best `B`
(32) partial sentences by summed log-prob, extending each with every word in the next slot (the
first slot uses `prev`, default `<s>`); the sort is stable, so ties keep frequency order.
`decodeGhost` builds the lattice, takes the last context token as `prev`, runs the beam with
`B = max(32, k)`, **filters every beam through `validate`**, deduplicates and returns the top `k`
(5). The filter is redundant today (the lexicon is already sound) and stays as defense in depth.

### Scanning reducer
Phases: `idle` -> `rows` -> `cells` -> (choose) -> `rows` ..., with `paused` after `loops` full
passes without a select. `tick` (1-switch auto scan) and `advance` (2-switch step scan) both move
the highlight; only `tick` counts passes and can pause. `select` picks the lit row, then the lit
cell. From `idle` the first `tick` lights the first non-empty row, so cell (r, c) is chosen after
exactly `r + 1 + c` highlight steps (fewer when empty rows are skipped) and 2 selects, which is at
most `R + C`. Full state machine: `.kiro/specs/access-modes/design.md`.

## Complexity

N = words in the lexicon, L = mean code length, n = codes in a sentence, S = words per slot (12),
B = beam width (32), R = rows.

| Operation | Time | Memory |
|---|---|---|
| `encodeWord`, `normalize` | O(length) | O(length) |
| `validate` | O(total characters) | O(1) extra |
| `Lexicon.fromJSON` (v1 or v2) | O(N·L), plus a sort only for lists out of order | O(N) |
| `lookup(code)` | O(1) + O(m) copy | O(m) |
| completion index (`prepare`, once) | O(C log C) for C codes | O(C) |
| `completions(p, k)`, first call for p | O(log C + codes under p + k log k) | O(k) cached |
| `completions(p, k)`, cached | O(k) | — |
| `addWords`, new code | O(C) array insert | — |
| `beam` / `decodeGhost` | O(n · B·S · log(B·S)) | O(B·S·n) |
| `scanReducer` | O(R) per event | O(1) |

Measured on the 58,906-word lexicon under Node 22 on the dev container (cold process, 3 runs;
before ADR-data-003: JSON parse 32 ms, `fromJSON` 92 ms, lazy trie build 69 ms and about 22 MB of
heap on a faster container):

| | `en.v1.json` | `en.v2.json` |
|---|---|---|
| `JSON.parse` | 42-46 ms | 0.3-2 ms |
| `Lexicon.fromJSON` | 95-101 ms | 64-86 ms |
| `prepare()` (sort 48,140 codes) | 6 ms | 9-12 ms |
| first `completions(d, 12)` per single key | | 1-6 ms (then cached) |
| heap, lexicon + index (+ the parsed file) | 23 MB | 15 MB |

In the browser at 4x CPU the same work is in `docs/testing/performance.md`. `decodeGhost` takes
0.1-1 ms for 3-7 words and about 2 ms for 18 words with the bigram. With the bigram,
`["4","6333","92837"]` -> `i need water`, `i want to go home`, `can you help me`,
`please call my mom` and `thank you very much` all decode top-1; the unigram alone gets
`can you help of` and `i want to in good`, which is the gap the bigram (and the LLM) closes.
Since ADR-core-002 the top 5 for `["4","6333","92837"]` are `i need water`, `i need waves`,
`i need yates`, `i need waver`, `i neff water` (before: `h need water` at rank 5).

## Adding a Romanian or Spanish keymap

Romanian and Spanish use the same 26 Latin letters on the same keys, so **no keymap change is
needed**: `normalize` already folds ă â → a, î → i, ș ş → s, ț ţ → t, ñ → n and á é í ó ú ü → base
letter (tested in `Req 1.2 Romanian and Spanish letters fold to their base letter`). To add a
language:

1. Build `data/lexicon/<lang>.v1.json` in the `LexiconFile` shape with `lang: 'ro'` (or `'es'`).
   Words may be written with diacritics: `fromJSON` normalizes and re-encodes them, and two
   spellings that fold to the same word keep the higher frequency. For the web app, also write the
   compact `<lang>.v2.json` (`build_lexicon.py`'s `compact_lexicon`, ADR-data-003); words with
   diacritics simply take the `normalize` path on load.
2. Optionally build `data/lexicon/<lang>.bigram.v1.json` (`BigramFile`); otherwise use
   `unigramModel`.
3. Load it with `Lexicon.fromJSON(file)` and pass it to `decodeGhost`. Everything else (validator,
   formatter, scanning) is language-independent.
4. Add a smoke test like `test/smoke.test.ts` with a few common sentences.

A language with letters outside a-z after NFKD (Polish ł, Danish ø, German ß, Turkish ı, any
non-Latin script) needs a real keymap change: a fold table (for example `ł -> l`, `ß -> ss`) in
`normalize`, or a per-language `KEYMAP`. That would mean `encodeWord` and `validate` take a keymap
argument, which is a contract change; write an ADR first.

## Known limitations

- **Diacritics are not restored.** Words are stored and returned normalized (`maine`, not
  `mâine`). The display and the voice see the folded spelling. Fix: let `LexiconFile` carry an
  optional display form per word (additive; needs a data change).
- **Case is not stored.** A name added with `addWords([{ w: 'Ana' }])` comes back as `ana`; the
  formatter only capitalizes the first word and `I`.
- **Ghost mode cannot type unknown words.** If any code has no lexicon word, `decodeGhost` returns
  `[]`. Names come from vocab packs or the LLM path (shown as `new` in the proof panel).
- **Initials mode is weak offline.** Each slot holds only the 12 most frequent words starting on
  that key; initials mode depends on the LLM.
- **Short prefixes are the slow completions.** A one-digit prefix covers about 6,000 codes: 1-6 ms
  on desktop the first time, then cached. Initials mode asks for these on every press; the web app
  fills the eight single-key answers in idle time after loading.
- **Parsing is on the main thread.** About 65 ms on desktop and 230-270 ms at 4x CPU, during loading
  only, never in a key press. A Web Worker would move it off the main thread; not worth it yet
  (`docs/testing/performance.md`).
- **Unicode letters that do not decompose** (ø, ł, ß, ı) are unencodable, so any word that has one
  is rejected; see above.
- **Scope.** The engine is a general-purpose text-entry and text-to-speech component.

## PBT findings

Every property test is named after the requirement it checks (for example
`Req 1.2 normalization invariance ...`). This is what fast-check found while the engine was built.

### Finding 1: acute and grave accents typed as apostrophes (bug in `normalize`, fixed)
- **Property:** `Req 1.2 normalization invariance` - for any word and any decoration (case,
  diacritics, fullwidth/mathematical/circled forms, apostrophe look-alikes between letters),
  `encodeWord(decorated) === encodeWord(plain)`.
- **Trigger:** the apostrophe generator was widened from the contract's ’ ‘ ʼ to what people
  actually type, adding ´ (U+00B4) and ` (U+0060).
- **Shrunk counterexamples** (fast-check 3.23.1): `{"plain":"aa","decorated":"a´a"}` (seeds 1, 2,
  3, 7) and ``{"plain":"aa","decorated":"a`a"}`` (seeds 42, 99); expected `"22"`, got `null`. The same character also failed `Req 3.3 completeness` (``[["a`"]]``).
- **Cause:** NFKD maps U+00B4 to a space plus a combining acute; stripping marks left a space, so
  `"isn´t"` became `"isn t"`. U+0060 was never folded at all.
- **Fix:** `normalize` folds ´ and ` to `'` before NFKD and again after it
  (`src/keymap.ts`, ADR-core-001 §2). Regression examples: `encodeWord('isn´t') === '4768'`,
  ``encodeWord('isn`t') === '4768'``, `tokenize('rock´n´roll')` is one word. All seeds pass since.

### Finding 2: the first decoration generator shrank badly (test fix)
The first `decoratedWord` generator was built with `chain` over a tuple, which fast-check cannot
shrink well: Finding 1 first showed up as
`{"plain":"aaaaaaaaa","decorated":"a︠Ａa᪰A᷀ａa⃐𝐚A̦a´"}` after 19 shrinks. Rebuilding it as a flat
array of `{ letter, style, mark, apostrophe }` records lets every part shrink on its own, and the
same seed then shrank to ``a`a`` in 10 steps.

### Finding 3: mutation check exposed two weak generators (test fix)
To check that the properties catch real bugs, we broke the source on purpose, one change at a time,
and ran the suite (seed 42). Every mutant must be killed by at least one property.

| Mutant | Killed by | Shrunk counterexample |
|---|---|---|
| Scanner skips repairing a row that no longer exists | `Req 3.2 + 3.3 any event sequence ...` | grid `[1]`, `tick` (row 0 lit), then the grid becomes `[0, 1]` and `select` opened row 0, which has no cells |
| Pause check off by one (`loopsLeft <= 0`) | `Req 1.5 pause after loops` | `{"rows":[1],"loops":1}` lit the row twice |
| Trie built without sorting by rank | `Req 2.2 completions(p, k) ...` | lexicon `{"2":[["a",0]],"22":[["aa",1]]}`, `completions("2", 1)` returned `a` instead of `aa` |
| Initials validator uses `startsWith` | `Req 3.2 soundness` (after the fix below) | `{"cand":["aa"],"m":"initials","codes":["22"]}` |
| Initials lattice accepts multi-digit codes **and** the `validate` filter is removed | `Req 5.3 decodeGhost output always passes validate` (after the fix below) | mini lexicon, codes `["6333"]`, initials mode: returned `need`, which does not validate |
| Only the `validate` filter in `decodeGhost` removed | not killed | expected: the lexicon is already sound, so the filter is defense in depth |
| Loader skips sorting a list whose new entry outscores the last (ADR-data-003) | `Req 2.8 the per-letter fast path ...`, `Req 2.9 a v2 file loads to the same lexicon ...` | a v1 list in file order with a lower zipf before a higher one |
| `addWords` appends a new code to the sorted index instead of inserting it in order | `Req 2.10 prepare() and cached completions stay exact after addWords` | a pack word whose code sorts before the last code; its prefix run is split |

The `startsWith` mutant first survived every property: in initials mode the generator only made
one-digit codes, so `startsWith` and `c[0] ===` never disagreed. The validator generator now also
feeds full letter-mode codes and two-digit prefixes into initials mode. Likewise, the
`decodeGhost` property always cut codes to one digit in initials mode; it now sends uncut codes half
the time. Both mutants are killed now.

### Long runs
After the fixes, `FC_SCALE=30` (up to 60,000 runs per property) and `FC_SCALE=20` on seeds 1, 7 and
42 pass: no other property failed. `Req 1.6` is also checked exhaustively: `normalize` is idempotent on
every one of the 1,112,064 Unicode scalar values.
