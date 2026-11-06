# Data and evaluation

Owner: data and evaluation. Spec: `.kiro/specs/eval-harness/`. Code: `packages/eval/`.
Shipped data: `data/` (CC BY-SA 4.0, see `data/NOTICE.md`). Contract shapes:
`docs/architecture/contracts.md` sections 1 and 2.

All figures on this page were measured on 2026-11-06 by the scripts named next to them; the raw
numbers are in `packages/eval/build-stats/*.json` and `packages/eval/RESULTS.json`.

## 1. Rebuilding the data

```bash
cd packages/eval
pnpm data:venv       # python3 -m venv .venv && pip install -r requirements.txt (wordfreq 3.1.1)
pnpm data:fetch      # downloads 7 files into .cache/ (gitignored), checks SHA-256 pins
pnpm data:build      # build_lexicon.py, build_bigrams.py, build_pack.py -> data/
pnpm data:check      # rebuilds the test set in memory and compares with eval.lock
pnpm test:py         # Python helper tests
pnpm test            # vitest: data contract, fixture, simulated user, determinism
pnpm quick           # 200-item seeded subset, prints the table
pnpm eval            # full test set, rewrites RESULTS.json and RESULTS.md
```

Every build is deterministic: re-running on the same inputs gives byte-identical files (checked
by comparing SHA-256 before and after a rebuild). `pnpm data:freeze` regenerates the frozen test
set and `eval.lock`. Only run it on purpose: if the fixture changes, results are no longer
comparable with earlier ones.

### What gets downloaded

| Cache path | Source | License as found |
|---|---|---|
| `imagine/readme.txt` | aactext.org/imagine/aac_comm/readme.txt | CC BY 4.0 |
| `imagine/sent_train_aac.txt` | 5,019 lines, "TurkTrain, from 80% of the workers" | CC BY 4.0 |
| `imagine/sent_dev_aac.txt` | 557 lines, "TurkDev, 10% of the workers" | CC BY 4.0 |
| `imagine/sent_test_aac.txt` | 566 lines, "TurkTest, 10% of the workers" | CC BY 4.0 |
| `turk/readme.txt` | aactext.org/turk/turk/readme.txt | see "License reasoning" |
| `turk/turk-dialogues.txt` | 1,420 dialogues, columns `set, id, turn1..turn6`; set = train 859 / dev 280 / test 280 | CC BY 4.0 (page) |
| `turk/turk-dialogues-filtered.txt` | 1,154 distinct ids (readme says 1,155) with offensive content removed: train 707 / dev 230 / test 217 | CC BY 4.0 (page) |

Not downloaded: `aac_comm.zip` (it bundles the two excluded files), `lm_test_switch.txt` and
`lm_test_comm.txt` (excluded from CC BY 4.0 on the corpus page), the ARPA language models, and
any NonCommercial dataset (DailyDialog etc.).

The filtered Turk file has broken delimiters (some tabs replaced by runs of spaces, some records
wrapped onto a second line), so its turn boundaries cannot be trusted. The loader takes the set of
surviving ids from the filtered file and the turn text and split from the clean original file.

## 2. The files and their sizes

| File | Raw | gzip -9 | brotli 11 | Contents |
|---|---|---|---|---|
| `data/lexicon/en.v1.json` | 1,557,975 B | 401,447 B | 328,051 B | 58,906 words, 48,140 codes |
| `data/lexicon/en.bigram.v1.json` | 339,147 B | 103,414 B | 85,587 B | 19,237 pairs over 2,972 contexts |
| `data/packs/core-en.json` | 5,564 B | | | 36 core words, 198 phrases |
| `packages/eval/fixtures/test.v1.jsonl` | 164,854 B | | | 866 test items, 4,890 words |

First load of lexicon + bigrams: 413.6 KB brotli (504.9 KB gzip), under the plan's 700 KB budget.

### Lexicon build (`build_lexicon.py`)

wordfreq 3.1.1 `top_n_list('en', 60000)`: 897 entries were not a-z words after normalization
(digits, "u.s", emoji, symbols), 137 merged with another word after normalization
("café" → "cafe"), and 0 fell below Zipf 2.0 (the 60,000th word has Zipf 2.39, so the Zipf filter
never applies at this list length). 58 apostrophe-less spellings of contractions were removed
because the contraction is at least 1.0 Zipf more frequent and they share its code ("dont",
"im", "cant", "wont", "youre", "thats" ...). Real words that collide with a contraction stay
because they are close in frequency ("its", "were", "ill", "well", "lets", "id"). Two
entries were removed because they name a third-party phone brand (a mark and its possessive),
which the product must never show (`.kiro/steering/trademarks.md`). The script keeps the banned
list as SHA-256 hashes, so it never spells the marks.

Ambiguity, measured on the shipped file:

| Statistic | Value |
|---|---|
| Codes with more than one word | 5,144 of 48,140 |
| Word types sharing a code with another word | 15,910 of 58,906 (27.0%) |
| Word types that are not the first reading of their code | 10,766 (18.3%) |
| Running text whose word is the first reading (frequency-weighted) | 94.15% |
| Largest code | 26 words (`727`: par, rap, pcs, sap, pas, ...) |
| Examples | 63: of, me · 46: in, i'm, go · 43: he, if, i'd · 4663: good, home, gone, hood · 5299: jazz, lazy · 4768: isn't |

The 27% type-collision rate is much higher than MacKay's 8.7% on `/usr/dict/words`, because
wordfreq's top 60k includes many acronyms and short tokens (bbc, cbs, pcs, md). These are rare
and sit low in each code's list. The frequency-weighted figure (94%) is what affects typing.

### Size: over the plan's 550 KB raw estimate

The plan estimated about 550 KB raw and 180 KB brotli, assuming a word list with no frequencies.
The contract format (`[word, zipfX10]` per entry) at 60k words is 1.56 MB raw and 328 KB brotli.
Measured alternatives (same pipeline, `--top N`):

| `--top` | Words | Raw | brotli | B1 top-1 | B1 top-5 | Unreachable items |
|---|---|---|---|---|---|---|
| 60,000 (shipped) | 58,906 | 1,558 KB | 328 KB | 85.5% | 97.1% | 15 |
| 50,000 | 49,213 | 1,306 KB | 275 KB | | | |
| 45,000 | 44,328 | 1,178 KB | 249 KB | | | |
| 40,000 | 39,438 | 1,049 KB | 221 KB | 84.4% | 95.7% | 29 |

(B1 numbers for 40k come from a scratch rebuild of both lexicon and bigrams on the 40k vocabulary,
same test set. 50k and 45k were not evaluated.)

**Proposal:** keep 60k. Transfer size is what matters for first load, and 60k is 107 KB more
brotli than 40k for about 1 point of sentence top-1 and half the unreachable items. Note that
`--top 40000` gives 39,438 words, just under the 40k floor, so a cut would need about
`--top 40600`. Either change needs a note in `docs/decisions/` because contracts §2 names
`top_n_list('en', 60000)`. A larger saving with no accuracy cost would be a compact wire format
(e.g. `codes: { "4663": "good:61 home:58 ..." }`), which is a contract change for core.

### Bigram build (`build_bigrams.py`)

Training text: AACText `sent_train_aac.txt` (5,019 lines) plus all six turns of the 707 Turk
train dialogues (4,242 turns). Lines are split into sentences on `. ! ?`, each starting with
`<s>`. A token that cannot be typed or is not in the lexicon breaks the chain (no bigram across
it). 57,026 tokens, 441 dropped, 19,582 bigram types.

Model: interpolated bigram, modified Kneser-Ney discounts (D1 = 0.740, D2 = 1.137,
D3+ = 1.407), interpolated with the **deployed** unigram (`zipfX10/10 − 9`, i.e. core's
`unigramModel`), so that core's backoff (`backoff[prev] + unigram(w)` for an unstored pair) is
exactly the model's own unseen-pair probability. Pruning keeps a pair only if it is at least
0.2 log10 above the backoff estimate (19,237 kept), then recomputes each backoff weight so the
distribution still sums to one. Values are log10, 2 decimals.

Held-out check on AACText dev (2,943 in-lexicon words): perplexity 833 with the unigram alone,
101 with the bigram, 111 with the bigram trained on AACText only (`--no-turk`). Pruning threshold
barely matters at this corpus size (0.0 → 343 KB, 0.5 → 324 KB, perplexity 101.2 → 101.8).

### Core pack (`build_pack.py`)

`words`: the 36 Universal Core words (all, can, different, do, finished, get, go, good, he,
help, here, I, in, it, like, look, make, more, not, on, open, put, same, she, some, stop, that,
turn, up, want, what, when, where, who, why, you), boost 0.1 Zipf. The boost is a tie-breaker
only. 35 of the 36 are already the first reading of their code. "go" is third on key 46, after "in"
and "i'm", and a boost of 0.3 or more would put it above "i'm", which hurts conversational text.
A test checks that the shipped boost changes no first reading.

`phrases`: 198 phrases from AACText **train**. A phrase qualifies when two or more lines,
written by different workers, reduce to the same words (apostrophes ignored). It must also have
1–6 words, all typable and in the lexicon, and no capitalized word mid-phrase other than
I/TV/OK/Mom/Mum/Dad/Christmas (this removes personal names). 22 more were removed by a reviewed
denylist (ungrammatical, rude or context-bound lines). Each phrase is recased: first letter
capitalized, "i" → "I", a terminal "." or "?" added.

The Universal Core list was checked against two web searches that reproduce the UNC list. The
UNC page itself could not be fetched from the build environment (its TLS chain did not verify, and
the fetch tool returned 503). Re-check it once from a browser.

## 3. License reasoning

- **Why `data/` is CC BY-SA 4.0.** The lexicon is an adaptation of wordfreq's data, which is
  CC BY-SA 4.0. ShareAlike then applies to the lexicon, and the cleanest way to comply is to
  license the whole `data/` folder BY-SA, separate from the MIT code. Upstream discussion of
  derived word lists is unresolved, so we assume ShareAlike applies.
- **CC BY 4.0 inputs inside a BY-SA folder.** AACText and Turk (per their pages) are CC BY 4.0. CC BY
  allows adaptations under any license as long as attribution is kept, so the BY-SA bigram file
  and pack are fine. Attribution is in `data/NOTICE.md`.
- **Turk license conflict (open).** The Turk page says CC BY 4.0, with a `rel="license"` link to
  the 4.0 deed. The `readme.txt` inside the download, dated 18 Nov 2022, says
  "Creative Commons Attribution-NoDerivs 3.0 Unported". The imagine page (same author)
  also uses CC BY 4.0. We follow the web page as the licensor's current statement. If ND
  applied, distributing an adaptation (our bigram file includes Turk-derived counts) would not
  be allowed. Verbatim test excerpts would be less of a problem. Mitigation:
  `build_bigrams.py --no-turk` rebuilds without Turk (dev perplexity 101 → 111). **Action:**
  ask Keith Vertanen to confirm, and keep `tasks.md` task 13 open until then.
- **Universal Core.** The UNC page says CC BY 4.0, while the Project Core footer says CC BY-SA 4.0
  (per the plan's research; neither page could be re-read here). Treated as BY-SA, which `data/`
  satisfies. Only the words are used, with no symbol sets (PCS, SymbolStix and Widgit are
  proprietary).
- **Fixture.** `packages/eval/fixtures/test.v1.jsonl` quotes the test splits verbatim. It is not
  under `data/` and not MIT: `fixtures/NOTICE.md` keeps the CC BY attribution.
- **Never committed:** anything NonCommercial (DailyDialog, ARASAAC), and `lm_test_switch.txt`
  and `lm_test_comm.txt`.

## 4. Evaluation method

**Test set** (`build_testset.py`, SHA-256 in `eval.lock`): all 566 lines of AACText
`sent_test_aac.txt` (none dropped), plus 300 Turk test partner/reply pairs. The pairs are chosen
by ranking all 1,042 usable (turn k, turn k+1) pairs from the 217 filtered test dialogues by
`sha256("<id>:<k>")`. An item must be typable on keys 2–9 (no digits or symbols) and have 1–20
words. Out-of-lexicon words are kept: 15 of 4,890 words (0.31%). 24.4% of AACText test sentences,
and 5.0% of the Turk replies, also occur verbatim in the training text. These are mostly short
stock phrases ("I love you.", "Thank you."), so the AACText numbers are somewhat optimistic for
B1.

**Simulated user** (`src/simulate.ts`; spec Req 4):
1. Types each word's code (one press per letter, apostrophes free) and 0 between words. The final
   Speak is not counted.
2. If the gold sentence is the top candidate, it speaks (0 selections). At rank 1–4 it selects the
   candidate (1 selection).
3. Otherwise it presses Next on each wrong word until the gold word comes up in lexicon order,
   wrapping. A gold word not in the lexicon is unreachable and costs a full cycle.

**Metrics:** word accuracy (top-1 candidate, per word, before correction); sentence top-1 and
top-5 (exact match on normalized words: case and punctuation insensitive, apostrophes
significant); KSR = 1 − (presses + selections) / characters including spaces; scan steps per
character (auto-scan highlight steps on the 6-row grid, computed by driving core's
`scanReducer`); invalid pre-validator rate (LLM configs); latency p50/p95 per decode call; $/1k.

In letter mode, KSR cannot go much above 0, because every letter is still one press. The only
saving is free apostrophes. KSR becomes informative for initials mode and for LLM configs.

**Determinism:** the only randomness is the seeded quick-subset choice (mulberry32, default seed
9). `RESULTS.json` has no timings, dates or host names. Tests check that two in-process runs (5
random seeds) and two CLI runs give byte-identical files.

**Results** (`pnpm -F @ninth/eval eval`, full set, 866 items, k = 5):

| Config | Word acc | Sent top-1 | Sent top-5 | KSR | Scan steps/char |
|---|---|---|---|---|---|
| B0 dict | 91.4% | 62.4% | 91.8% | −1.3% | 3.61 |
| B1 ghost | 96.8% | 85.5% | 97.1% | −0.1% | 3.57 |
| B2–B4 | not run (no LLM backend wired yet) | | | | |

B1 beats the plan's 92% word-accuracy target on this test set. Latency for both is well under
1 ms per decode (see `RESULTS.md`). Per-source breakdown: B1 reaches 88.7% top-1 on AACText and
79.3% on the Turk replies, which are longer and more varied.

**Plugging in an LLM (B2–B4):** write a module exporting
`createProposer(): LlmProposer` (`packages/eval/src/decoders.ts`):
`{ model, propose({ codes, mode, k, partner?, lattice?, beams? }) → { candidates: string[][], usd? } }`.
Then run `pnpm -F @ninth/eval eval --llm path/to/module.ts`. B2 shows raw output, B3 filters it
through `validate()`, and B4 also gets the lattice and the top 10 ghost beams. One few-shot example
in `packages/decoder/src/prompt.ts` ("i am good") also appears in the test set; replace it before
measuring B4.

## 5. Adding a language

1. **Keymap and normalization:** core's `normalize` already folds Romanian (ă â î ș ț) and Spanish
   (á é í ó ú ü ñ) to base letters, and `ninth_common.normalize` mirrors it. Check the language's
   letters all reduce to a–z; if not, the keymap needs a contract change.
2. **Lexicon:** `build_lexicon.py` is English-specific only in `'en'` and the contraction rule.
   Add a `--lang` flag, run `top_n_list('<lang>', N)`, and check the merge count. Accent folding
   merges many words in Romanian/Spanish, and the frequencies are summed. Output
   `data/lexicon/<lang>.v1.json`.
3. **Bigrams:** need a CC BY or BY-SA conversational corpus with a train split. The Vertanen
   multilingual AAC sets on Zenodo are CC BY 4.0 except their DailyDialog part
   (CC BY-NC-SA, never commit). Without a corpus, ship unigram only (`unigramModel`).
4. **Pack:** translate the 36 core words with a native speaker (not machine translation), and
   mine phrases from the train split with `build_pack.py`.
5. **Test set:** freeze `fixtures/test.<lang>.v1.jsonl` with its own lock entry, then run the
   harness with that fixture.
6. Add the sources to `data/NOTICE.md`.

## 6. Open questions

1. Turk dialogues license: CC BY 4.0 (page) or CC BY-ND 3.0 (readme)? (section 3)
2. Lexicon size: keep 60k (1.56 MB raw, 328 KB brotli) or cut to ~40k? Or change the wire
   format? (section 2)
3. wordfreq's top 60k includes some slurs as low-ranked readings of common codes (for example on
   key 5453, after "like"). Should the lexicon filter a short list of slurs? Profanity in
   general should stay, because people swear.
4. Universal Core list and license: re-read the UNC page from a browser.
