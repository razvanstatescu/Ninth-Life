# Design: core-encoder

Knowledge-base page with measurements and limitations: `docs/architecture/core.md`.

## Architecture

```
            keys 2-9
               │
   ┌───────────▼───────────┐      ┌──────────────────────┐
   │ keymap.ts             │◄─────┤ validator.ts         │  validate / proof
   │ normalize, encodeWord │      └──────────▲───────────┘
   │ tokenize, encodeSent. │                 │ every candidate
   └───────────▲───────────┘                 │
               │                  ┌──────────┴───────────┐
   ┌───────────┴───────────┐      │ decode.ts            │
   │ lexicon.ts            │◄─────┤ lattice → beam →     │◄── lm.ts (unigram, bigram)
   │ code→words, trie      │      │ validate → top k     │
   └───────────────────────┘      └──────────────────────┘
   format.ts (after validation)    scan.ts (see access-modes spec)
```

- `keymap.ts` has no dependencies. `validator.ts`, `lexicon.ts` and `lm.ts` depend only on it.
  `decode.ts` composes them. `format.ts` is standalone.
- Pure functions and one class (`Lexicon`), no I/O: loading files is the caller's job
  (`fetch` in the browser, `fs` in the eval CLI).
- Safety is layered: `Lexicon.fromJSON` re-encodes every word (a bad data file cannot misfile a
  word), and `decodeGhost` still validates every beam before returning it. The decoder service
  runs the same `validate` on LLM output.

## Data shapes

```ts
interface LexiconFile { v: 1; lang: string; source: string; license: string;
  codes: Record<string, [word: string, zipfX10: number][]> }   // words by frequency desc
interface BigramFile { v: 1; lang: string; source: string; license: string; bos: '<s>';
  logp: Record<string, Record<string, number>>;  // log10 P(w | prev)
  backoff: Record<string, number> }              // log10 backoff weight of prev
// In memory (lexicon.ts, private):
interface Entry { w: string; code: string; base: number; boost: number; seq: number }
//   byWord: Map<word, Entry>; byCode: Map<code, Entry[]> sorted by (base+boost) desc, seq asc
//   ranked: Entry[] (lazy); trie: Map<digitPrefix, string[] /* top 5 */> (lazy)
interface Candidate { words: string[]; score: number /* log10 */; source: 'dict' | 'ghost' | 'llm' }
```

## Algorithms
- **normalize:** fold ‘ ’ ʼ ´ ` to `'`, NFKD, strip `\p{M}`, lowercase, fold again.
- **encodeWord:** per code point: skip `'`; a-z through a 26-char lookup string; else `null`.
- **validate:** equal lengths; per slot `encodeWord(w) === code` (letter) or
  `code.length === 1 && encodeWord(w)[0] === code` (initials).
- **trie:** sort all words by rank once; push each word into the node of every prefix of its code
  until the node has 5. Rank order means the first 5 to arrive are the top 5.
- **beam:** `beams = [[]]`; per slot, extend every beam with every slot word, score with
  `lm.logP(prev, w)`, stable-sort, keep the best B.
- **decodeGhost:** `lattice(12)` → `beam(max(32, k), prev = last context token or <s>)` →
  `validate` filter → dedupe → top k.

## Correctness properties

Each property is a fast-check test in `packages/core/test/`, named after the requirement it validates.

| # | Property | Validates | Test |
|---|---|---|---|
| P1 | For any `w ∈ [a-z]{1,20}`: `encodeWord(w).length === w.length`, digits in 2-9, digit i = `KEYMAP[w[i]]` | Req 1.1 | `keymap.test.ts` "Req 1.1 length preservation" |
| P2 | For any plain word and decoration d (case, marks, precomposed letters, fullwidth/math/circled forms, apostrophe look-alikes): `encodeWord(d(w)) === encodeWord(w)` | Req 1.2 | "Req 1.2 normalization invariance" |
| P3 | For any string s: `encodeWord(s)` is null or matches `^[2-9]+$` | Req 1.3 | "Req 1.3 encodeWord is null or a 2-9 string" |
| P4 | Removing apostrophes never changes the code | Req 1.4 | "Req 1.4 removing apostrophes" |
| P5 | `encodeSentence(ws.join(' ')) = ws.map(encodeWord)`; for any text, encodeSentence throws RangeError iff some token is unencodable, else its tokens validate against it | Req 1.5 | "Req 1.5 ..." (2 properties) |
| P6 | `normalize` is idempotent (property + exhaustive over all 1,112,064 scalar values), output has no marks or look-alike apostrophes | Req 1.6 | "Req 1.6 ..." |
| P7 | `completions(p, k)` = the top-k words with code prefix p: right length, distinct, non-increasing zipf, nothing better left out; trie and ranked scan agree | Req 2.2 | "Req 2.2 completions(p, k) ..." |
| P8 | `addWords(p); addWords(p)` ≡ `addWords(reverse(p))` | Req 2.4 | "Req 2.4 addWords is idempotent ..." |
| P9 | For any lexicon file, even one that files words under wrong codes: every word of `lookup(c)` encodes to c; unencodable words are absent | Req 2.6 | "Req 2.6 every word lookup() returns ..." |
| P10 | Length mismatch ⇒ `validate` is false | Req 3.1 | "Req 3.1 ..." |
| P11 | Soundness: `validate(x, c)` ⇒ every word of x encodes to its code | Req 3.2 | "Req 3.2 soundness" |
| P12 | `validate` equals an independent reference implementation on right, wrong, short, long and cross-mode code lists | Req 3.2, 3.3, 3.4 | "Req 3.2 + 3.3 ... reference implementation" |
| P13 | Completeness: `validate(s, s.map(encodeWord))` for any encodable s, in both modes | Req 3.3 | "Req 3.3 completeness" |
| P14 | `proof` has `max(len)` entries and no `reject` iff `validate` is true | Req 3.5 | "Req 3.5 proof never says ..." |
| P15 | Every log-prob is finite and in [-10, 0] for any strings | Req 4.4 | "Req 4.4 ..." |
| P16 | `beam` returns <= B results, sorted, each score = the sum of its log-probs | Req 5.2 | "Req 5.2 ..." |
| P17 | For any lexicon (honest or lying), codes (including junk), k, mode, context and LM (including NaN and huge scores): `decodeGhost` returns <= k distinct candidates and every one passes `validate` | Req 5.3 | "Req 5.3 decodeGhost output always passes validate" |
| P18 | If every code has a word, `decodeGhost` returns at least one candidate | Req 5.3 | "Req 5.3 decodeGhost finds a sentence ..." |
| P19 | Same inputs ⇒ same output | Req 5.7 | "Req 5.7 ..." |
| P20 | `tokenize(formatSentence(ws, p))` equals the normalized `ws`, still validates, ends with p | Req 6.4 | "Req 6.4 ..." (2 properties) |
| P21 | For any lexicon, prev, word and penalty p <= 0: a one-letter word outside a/i scores in [off + p, off]; every other word scores exactly as with the penalty off | Req 4.5 | `lm.test.ts` "Req 4.5 the letter penalty only lowers ..." |
| P22 | For any lexicon and codes: the lattice ignores the LM; an exhaustive beam and `decodeGhost(k = all)` return the same sentence set with and without the penalty; sentences without a penalised letter keep their exact score | Req 5.8 | `decode.test.ts` "Req 5.8 the letter penalty never removes a valid reading ..." |

Example tests pin the behavior people see: `"isn't" -> "4768"`, `4663 -> good, home, gone`,
`["i"] -> "I"`, `"4 6333 92837" -> "i need water"`, and the real-lexicon smoke test.

## Error handling
- Unencodable input: `encodeWord` returns `null`; `encodeSentence` throws `RangeError`.
- Bad files: `Lexicon.fromJSON` / `bigramModel` throw `TypeError` unless `v === 1`; malformed
  entries are skipped.
- LM misbehavior: a non-finite log-prob scores -99 in the beam, so a broken model cannot crash
  decoding or let an invalid word through.
