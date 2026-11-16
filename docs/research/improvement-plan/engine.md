# Engine findings (reviewer: engine, 2026-11-14)

Scope: `packages/core`, `packages/decoder`, `packages/eval`, `data/`, and the web libs that call them.
Repo read-only. All new numbers below are **simulations** run with scratch scripts that import the repo's
own code (`@ninth/core` `Lexicon`, `bigramModel`, `beam`, `validate`, eval `scanSteps`) on
`fixtures/test.v1.jsonl` (866 items) with `en.v1.json` + `en.bigram.v1.json`, as the harness does. They are
not in RESULTS.md and must not be quoted as measured results. Scripts:
`docs/research/improvement-plan/sim/` (run one with `npx tsx docs/research/improvement-plan/sim/sim1.ts` from `packages/eval`)
(`sim1.ts` completion, `sim2.ts` phrases/partner/OOV/caps/wrong key, `sim3.ts` initials, `sim4.ts` personal
cache, `sim5.ts` key fixes). Sanity check: my "today" run gives exactly RESULTS.md B1 (85.6% top-1,
KSR −0.0%, 3.57 scan steps/char).

## What a sentence costs today (from the eval simulation)

The average test sentence is 5.65 words and 25.8 characters. It costs **25.9 presses** (letters + spaces +
picks + # corrections), plus Speak. On one switch: 3.57 steps/char, about **92 steps per sentence**
(AACText 21.6 presses, Turk 33.9). Nothing in the engine can predict
before the keys are pressed. `Lexicon.completions()` exists, but the app only uses it to show the letters
typed so far (`sentence.ts:66 partialFor`) and for the initials lattice.

## Ranked problems and proposals

### 1. No word completion or next-word prediction (the main reason it feels simplistic)  [eval ✔ | wow ✔]
**Problem.** Every letter costs one press, so KSR is ~0% by construction (RESULTS.md). ADR-008 rejected
"partial accept" because "every word is already typed, so there is nothing left to accept". Completion
changes that.
**Evidence (simulation).** The simulated user offers the top-k words whose code starts with the keys
typed so far, ranked by bigram P(w | previous decoded word), and accepts the gold word at the first chance
that saves presses. Accepting costs 1 press and closes the word (it replaces the space). The rest of the
sentence is decoded with the accepted words pinned, as `decodeWithPins` does. Corrections are counted as
in `simulate.ts`.

| Policy (simulation) | Presses/sentence | KSR | Scan steps/char | Words accepted | Sent. top-1 after typing |
|---|---|---|---|---|---|
| Today (B1) | 25.9 | 0.0% | 3.57 | – | 85.6% |
| Frequency completion (`completions()`), top-3, ≥2 keys | 20.1 | 22.3% | 2.32 | 58.7% | 87.5% |
| Bigram-ranked completion, top-1, ≥1 key | 18.8 | 27.1% | 2.01 | 64.0% | 86.1% |
| Bigram-ranked completion, top-3, ≥1 key | 16.0 | 38.0% | 1.62 | 79.3% | 88.7% |
| + next-word prediction (0 keys), top-3 | 14.4 | 44.3% | 1.39 | 85.7% | 88.7% |
| Prediction only (0 keys), top-3 | 21.8 | 15.6% | 2.78 | 28.8% | 85.9% |

Turk replies only (5% verbatim overlap with training, vs 24.4% for AACText): top-3 completion 35.9% KSR,
with prediction 40.6%. So the gain is not just memorised test lines.
**Solution.** Core: `rankCompletions(prefix, prev, lex, lm, k)` in a new `core/src/complete.ts`. It takes
the pool `lex.completions(prefix, 300)` plus the bigram successors of `prev` under that prefix, scored by
`lm.logP`. It needs an optional `successors?(prev)` on `LanguageModel` (`lm.ts`; the data is already in
`BigramFile.logp`). Cost: 0.14 ms per call in Node, warm. Composer: a new action `complete {index, word}`
sets the slot code to `encodeWord(word)` and pins the word, so `validate()` holds for the full code. UI:
up to 3 chips for the open word, sharing scan row 0 with the sentences. Eval: a `B1c` config in
`decoders.ts`/`simulate.ts` (accept policy as above), reporting KSR, presses/char and scan steps/char. Add
a property test that every completion's code starts with the typed prefix.
**Proof check.** It still reads "every word matches its keys". The keys you did not press are filled in
by your pick and shown as filled, not typed (e.g. `46`+`63`). Next-word prediction at 0 keys is a word
you pick, not a word your keys chose. That is a product decision for the lead. My advice: ship
completion (≥1 key) first and leave prediction at 0 keys as an option.
**Effort** M. **Risks.** Saved presses are not saved time: watching a list costs attention. In Koester &
Levine's scanning study, prediction gave no significant gain in text rate
(https://informahealthcare.com/doi/abs/10.1080/10400435.1994.10132226; abstract only). Chips compete for
the 56 px rows on short phones (ADR-005). The person must be able to ignore the chips with no penalty.

### 2. Model ranking switches off as soon as any word is pinned  [bug; eval ✔]
`CommunicationScreen.tsx:272` returns early when `pinned`. Choosing a sentence and then typing on pins
every earlier word (`composer.ts:66-70 pinSelected`), and so does one # press. After that the model is
never asked for the rest of the sentence. With completion (#1), almost every sentence would have pins, so
model ranking would almost never run. **Fix:** send each pinned slot as a one-word lattice. The server
already drops lattice words that fail `validate`, and the client already filters model sentences by pins
(`remoteValid`). **Eval:** run B4 with pins from the simulated completion user. **Effort** S.

### 3. A wrong key leaves the person stuck; offer key fixes only when the keys spell nothing  [eval ✔ | wow ✔]
**Evidence (simulation).** One random key changed in one word: in 70.3% of items the wrong code still
spells words. The wrong sentence is offered and the gold sentence cannot be reached without Back. Always-on
fuzzy decoding would catch some of these, but it drops clean-input top-1 from 85.6% to 76.2% and breaks
the proof rule, so it is rejected. When the code spells **no** word, a "did you mean" over codes one edit
away works well:

| Error (simulation) | Dead-code cases | Gold top-1 | Gold top-5 |
|---|---|---|---|
| Wrong key | 257 / 866 | 75.9% | 94.6% |
| Double press (tremor) | 429 / 866 | 82.1% | 96.3% |
| Missed key | 114 / ~840 | 66.7% | 90.4% |

**Solution.** Add `keyFixes(code, lex, k)` in core (substitution, deletion and insertion neighbours, ranked
in the beam with a penalty). It is used only for a slot with no word, which today shows digits and offers
Spell (`sentence.ts:224`). A pick rewrites the slot's keys with the changed key highlighted, then the normal
proof runs against the new keys. **Effort** S–M. **Risk.** The keys change, so the change must be visible
and announced. Never apply a fix automatically.

### 4. Nothing learns from the person: on-device, opt-in personal ranking  [eval ✔ (new metric) | wow ✔]
**Evidence (simulation, proxy).** The test set is many people, not one, so I used two proxies. (a)
Treating the 866 items as one history in file order, a cache model (λ = 0.1, interpolated with the
bigram) moves top-1 from 85.6% to 86.4%. (b) "Say it again": if each sentence was said once before, top-1
goes from 85.6% to 96.4%. Pack phrases do not stand in for personal history: only 6.8% of test sentences
equal one of the 198 pack phrases, and pack-phrase completion saves 1.3% of presses.
**Solution.** `withCache(base: LanguageModel, cache, λ)` in `lm.ts`, with no change to `beam`/`decodeGhost`:
interpolated unigram + bigram counts of the person's own spoken sentences. Two levels:
(1) **this conversation only**, fed from the memory-only thread (ADR-007), with nothing stored and no new
privacy surface; (2) an opt-in "Learn from what I say" setting, kept in IndexedDB (`lib/storage.ts`) and
capped (e.g. last 500 sentences), with "Forget" and "Show what is kept". It is never sent anywhere. It
reaches the model only through the existing "Include what you said". The same store can feed sentence
recall: after the first word's keys, offer earlier sentences whose codes match. Plug-in point: where
`data.ts` builds `lm`, plus an `add()` on the composer's `spoken` action. **Eval:** a `replay` config
(history = earlier items, plus a synthetic per-person fixture) reporting top-1 and presses on repeats.
**Effort** M. **Risk.** What someone said is the most sensitive data here; level 2 is off by default.

### 5. Mid-sentence punctuation and capitals  [demo-visible; no eval number today]
18.6% of test lines have punctuation inside the line ("I'm not sure, I couldn't hear him"). The composer
has one end mark (`PUNCT_CYCLE`). About 25 items have proper nouns that `formatSentence` prints lower case
("tv", "london", "thursday", "dr"). The lexicon is case-folded. Only My words carry a display spelling
(`myWords.ts DisplayMap`). **Fix:** punctuation per slot (1 after a closed word attaches the mark to that
word; capitalise after . ? !), and a small casing table (days, months, TV, OK, Dr, Mr…) applied through the
same display map. The validator is untouched. **Eval:** a "formatted text" exact-match metric. **Effort** S.

### 6. Model ranking: latency and wasted calls  [eval ✔]
B4 gives +11 points top-1 over ghost (MiniMax-M3: 95.5% vs 84.5%, 200 items, RESULTS.md). But 24.8% of
those calls took longer than the 1.2 s route deadline and would fall back to ghost beams (p50 907 ms,
p95 5.6 s). Haiku 5.5 is not measured yet. The request is also sent while a word is still open, after a
400 ms pause (`CommunicationScreen.tsx:270-291`: no `composer.open` check), so the model ranks half words
and the quota pays for them. **Fix:** skip while the last word is open, or rank only on space/pause ≥ 1 s.
Run the pending Haiku eval before tuning `DECODE_TIMEOUT_MS`. **Effort** S.

### 7. Unreachable words: a third are an eval artefact  [eval ✔]
The 15 OOV words: `cant`×2, `dont`, `didnt`, `hows` (the same keys already give can't/don't/didn't/how's,
because apostrophes are free); misspellings `tonite`, `tommorow`, `opinon`; names `mahabhog`,
`rattigans`, `mill's`; rare words `coffeeshop`, `disheart`, `dicker`, `suntan`. **Fix (eval only):** an
apostrophe-insensitive gold match option. "Unreachable" then drops from 15 to 10 honestly. Spell + My words
already cover names. **Effort** S.

### 8. Initials mode ("Phantom")  [no; not for this hackathon]
Core has `validate`/`lattice` for initials and the eval measures it. No UI exists.
**Bigram-only ambiguity (simulation, top-1 / 5 / 20):** today's 12-word lattice gives 1.5% / 2.0% / 2.8%.
Adding the bigram successors of the previous word (beam 256) gives 4.5% / 9.0% / 15.1%. 200 words per key
adds nothing. For sentences of 3 words or fewer: 8.6% / 18.8% / 34.9%. The model run in RESULTS.md (B4,
MiniMax-M3) reaches 0% top-5, because half the gold words are not in the lattice.
**Proof check.** It would read "each word starts with a letter on the key you pressed". About 7,000
lexicon words pass per key, so the model, not the keys, would be choosing the words. That runs against
the core idea and invites "it understands you" readings.
**Hybrid (simulation):** words of ≤2 letters as initials and the rest in full gives 64.5% top-1 at 0.95
typing presses/char; ≤3 letters gives 40.9% at 0.85. Both are dominated by #1 (0.62 presses/char with
88.7% top-1). Keep the doc's gate (build only if B3 initials reaches ~40% top-5).

### 9. Other languages  [L; not before Jan 29]
Keys need no change (ITU letters; `normalize` folds ă â î ș ț á é í ó ú ñ). The real blockers:
- **The lexicon drops diacritics** (`lexicon.ts:216 w = normalize(raw)`). Words that differ only by a
  diacritic become one entry, and the folded form is what is shown and spoken: Spanish "año" becomes "ano"
  (a different and rude word), and Romanian "fată"/"fața"/"fata" become one word. Entries need a display
  form keyed separately from the code. The a-z assumption is also in `prompt.ts:138 cleanWord`,
  `handler.ts:233` (`normalize` on model words), `schema.ts`/`decodeClient.ts:57 REJECTED_WORD`, and
  `myWords.ts FOLDED_WORD`. That is a contract change, so it needs an ADR.
- **Data.** wordfreq has a large Spanish list but a small-only Romanian one (https://github.com/rspeer/wordfreq),
  both CC BY-SA 4.0 (same as `data/`). There is no verified permissive conversational corpus for bigrams.
  Vertanen's 2026 multilingual AAC sets are machine-translated into 33 languages
  (https://aclanthology.org/2026.mrl-1.31/; license and language list not verified). Without bigrams,
  expect B0-like quality (English B0: 62.4% top-1). It would also need a native-speaker test set and pack,
  and the slur filter per language.

### 10. Numbers ("at 3 pm")  [M; eval blind]
The test set excludes digits by construction (`build_testset.py`: items must be typable). Today "three"
works (84733), but "3" cannot be shown. A digits slot kind (the keys type their own digit; the proof is
"the digit is the key") touches the composer, `validate` and `format`. It is worth it after #1–#5, not
before.

## Fragile or wrong (short)
- Also above: `CommunicationScreen.tsx:272` (#2), `:270-291` (#6), `decode.ts:30` (#8), `lexicon.ts:216` (#9).
- `composer.ts:89,94`: the 17th key of a word and the 21st word are dropped silently, with no announcement.
- `sentence.ts:105,141`: `prev` = the whole context string lower-cased, not its last token (`decodeGhost`
  tokenizes). This path is dead today, because the screen never passes `context` offline
  (`CommunicationScreen.tsx:233`). Do not wire the partner line in as `prev`: it measured worse (Turk
  top-1 79.7% to 76.7%).

## Rejected ideas
- **Boost the partner's words offline.** Measured on 300 Turk items: +1 log10 gives 79.7% → 80.0% top-1,
  +2 gives 79.0%. No gain.
- **Always-on fuzzy decoding.** −9.4 points clean top-1 and breaks the proof rule (#3 keeps the dead-code-only version).
- **Pack-phrase completion.** Hits 6.8% of sentences and saves 1.3% of presses.
- **Hybrid initials.** Dominated by word completion (#8).
- **Model-generated words at 0 keys.** The model would choose words, not the keys.
- **On-device LLM for the hackathon.** A download of tens to hundreds of MB (estimate, not measured) on
  phones and offline. If it comes later, put a `Ranker` interface behind `decodeRemote` (same
  request/`RemoteResult`, always re-validated) and add `logP(history[], w)` or N-best `scoreSentence` to
  `LanguageModel`, which only sees one previous word today.
- **Trigram from the same corpus.** 57k training tokens is too little to expect much. Not measured.

**Moves an eval number:** #1 (KSR, scan steps), #2, #3 (new error-recovery metric), #4 (replay metric),
#6, #7. **Demo "wow":** #1 (chips finishing "tomorrow" after 3 keys; switch steps per sentence ~92 → ~36),
#3 (a tremor double press fixed with one tap, the changed key lit), #4 ("say it again" comes up first).
