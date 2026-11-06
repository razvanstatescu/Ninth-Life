# ADR-core-001: `@ninth/core` contract clarifications and additive extensions

- Status: accepted
- Date: 2026-11-06
- Decided by: core engine owner (packages/core)
- Affects: `docs/architecture/contracts.md` §1. **Nothing was renamed or removed.** Every change
  below is either a clarification of behavior the contract left open, or an additive export /
  optional parameter. Code written against §1 keeps compiling and keeps its meaning.

## Context
The §1 contract gives names and one-line semantics. Building and property-testing the engine raised
questions those lines do not answer, and one property test (see `docs/architecture/core.md`, "PBT
findings") showed that the contract's apostrophe list is too narrow for real typing.

## Decisions

### 1. `encodeSentence` and `tokenize`: punctuation separates words
§1 says `encodeSentence` "split[s] on whitespace". Read literally, `encodeSentence("I need water.")`
would throw, because `"water."` contains a period. That would break the eval harness on almost every
gold sentence.

- `tokenize(text)` normalizes, then splits on any run of characters that are not a letter, a number
  or an apostrophe, and strips apostrophes at the edges of each token (`"'tis"` -> `"tis"`;
  `"isn't"` stays whole). Numbers and non-Latin letters stay as tokens.
- `encodeSentence(text)` is `tokenize(text).map(encodeWord)`, and throws a `RangeError` naming the
  first token that cannot be typed on keys 2-9 (for example `"3"` or `"ø"`).
- Consequence: `"well-known"` is two words (`well`, `known`), which matches how the keypad works
  (0 is the only word separator; there is no hyphen key).

### 2. `normalize` also folds U+00B4 ´ and U+0060 ` to `'`
§1 lists `’ ʼ ‘`. Property testing found that `"isn´t"` (acute accent used as an apostrophe, common
on Romanian and Spanish keyboards) normalized to `"isn t"`, because NFKD turns U+00B4 into a space
plus a combining acute. `normalize` now folds ´ and ` (before NFKD, and again after it, which also
catches fullwidth ＇ and ｀). This only widens what is accepted as an apostrophe; every input that
normalized before normalizes the same way now except those two characters.
The data pipeline is unaffected (lexicon words are already a-z plus `'`).

### 3. `beam(lat, lm, B?, prev?)`: optional fourth parameter
`decodeGhost` needs the context word as the `prev` of slot 0, and `beam` had no way to receive it.
`prev` defaults to `'<s>'`, so existing calls are unchanged.

### 4. Additive exports
`DIGITS`, `digitOf`, `isCode` (keymap); `matchesCode` (validator); `TRIE_TOP_K = 5`,
`NEW_WORD_ZIPF = 3.0`, a public `new Lexicon(lang)` constructor (an empty lexicon you can fill with
`addWords`) (lexicon); `BOS`, `LOGP_FLOOR` (lm); `DEFAULT_PER_SLOT`, `DEFAULT_BEAM`, `DEFAULT_K`,
`GhostOptions` (decode); `Punct` (format); `ScanResult` (scan).

### 5. Semantics the contract left open
| API | Behavior chosen | Why |
|---|---|---|
| `Lexicon.fromJSON` | Re-encodes every word; a word filed under the wrong code is moved to its real code, an unencodable word is dropped, a duplicate keeps its highest zipf. Throws `TypeError` unless `v === 1`. | `lookup()` must never return a word that fails `validate()`, whatever the data file says. |
| `Lexicon.lookup` | Ties in zipf keep the file's order. Returns a copy. | The file's order is finer than the quantized zipf. |
| `Lexicon.completions` | Includes words whose code *equals* the prefix. A non-digit prefix or `k < 1` gives `[]`. `k <= 5` reads the trie; `k > 5` walks the rank-ordered index. | Prediction lists usually show the exact match first. |
| `Lexicon.addWords` | Unknown words start at zipf 3.0, plus boost. Boosts do not stack: the largest boost seen wins, so re-adding a pack is a no-op and pack order does not matter. Unencodable entries are skipped. | Idempotent and order-insensitive (property-tested). |
| `zipf()` / `unigramModel` | `zipf()` returns file zipf + boost. Unigram log10 p is clamped to [-9, 0]. | A large boost must not give p > 1. |
| `bigramModel` | Listed log-prob if the pair is present, else `backoff[prev]` (0 if absent) + unigram. Lookups read own properties only. | `"constructor"` is an English word and also an `Object.prototype` key. |
| `proof` | Returns `max(cand.length, codes.length)` entries; a missing word or code is `''` and rejects. | The proof panel can show surplus words or missing slots. |
| `validate` (initials) | A code longer than one digit never matches. | Same result as `c[0] === code`, stated explicitly. |
| `lattice` (initials) | A slot code must be one digit, else `[]`. | Same reason. |
| `decodeGhost` | `[]` if `codes` is empty, `k` is 0, or any code has no lexicon word. Context strings are tokenized; only the last token is used. Results are deduplicated. | Ghost mode never invents a word; names come from the LLM path or a vocab pack. |
| `scanReducer` | See `.kiro/specs/access-modes/design.md`: `select` from idle or paused starts (or resumes) row scanning without choosing; rows with 0 cells are skipped; `loops < 1` (or NaN) counts as 1, `Infinity` never pauses; `advance` never pauses and resumes a paused scan; after a choice, scanning restarts at the first non-empty row; a row/cell that no longer exists (the grid changed) is repaired before the event is applied. | Needed for the reachability and pause properties to be well defined. |

## Consequences
- Teammates do not need to change anything. The web UI can call `beam(..., prev)` directly if it
  wants the same context handling as `decodeGhost`.
- The Python lexicon builder does not need to change for decision 2, because its output only holds
  a-z and `'`. If it ever reads user text, it should fold ´ and ` the same way.
