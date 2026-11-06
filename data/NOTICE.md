# NOTICE: data sources and attribution

Everything in `data/` is licensed under **CC BY-SA 4.0** (full text in [`LICENSE`](LICENSE)).
The rest of the repository is MIT. The files below are adaptations of the sources listed with
them; changes are described per file. How to rebuild them: `docs/architecture/data-and-eval.md`.

| File | Built by | Derived from |
|---|---|---|
| `lexicon/en.v1.json` | `packages/eval/scripts/build_lexicon.py` | wordfreq 3.1.1 |
| `lexicon/en.bigram.v1.json` | `packages/eval/scripts/build_bigrams.py` | AACText "Imagination of Crowds" train split; Turk dialogues train split; unigram from `en.v1.json` |
| `packs/core-en.json` | `packages/eval/scripts/build_pack.py` | Universal Core vocabulary (36 words); AACText train split (phrases) |

---

## wordfreq 3.1.1 (`lexicon/en.v1.json`)

Robyn Speer. (2022). rspeer/wordfreq: v3.0 (v3.0.2). Zenodo.
<https://doi.org/10.5281/zenodo.7199437>. Package: <https://pypi.org/project/wordfreq/3.1.1/>.

wordfreq code is Apache-2.0; its data files are distributed under CC BY-SA 4.0. Our lexicon
is an adaptation of that data, which is why `data/` as a whole is CC BY-SA 4.0 (upstream
issue on derived lists: treat ShareAlike as applying).

**Changes made:** took `top_n_list('en', 60000)` and `zipf_frequency`; normalized (NFKD,
combining marks removed, lowercased, curly apostrophes folded); kept only a-z words with
internal apostrophes; merged words that normalize to the same string; removed
apostrophe-less spellings of contractions ("dont", "im") that are at least 1.0 Zipf rarer than
the contraction; removed two entries naming a third-party brand; grouped by 9-key code; stored Zipf × 10 rounded to an integer.

wordfreq's upstream sources, as attributed in the wordfreq 3.1.1 README (reproduced so
the attribution chain is kept):

- **Google Books Ngrams** (<http://books.google.com/ngrams>) and Google Books Syntactic Ngrams.
  "Ngram Viewer graphs and data may be freely used for any purpose, although acknowledgement
  of Google Books Ngram Viewer as the source, and inclusion of a link to
  http://books.google.com/ngrams, would be appreciated."
- **The Leeds Internet Corpus**, University of Leeds Centre for Translation Studies
  (<http://corpus.leeds.ac.uk/list.html>), Creative Commons licensed.
- **Wikipedia**, the free encyclopedia (<http://www.wikipedia.org>), Creative Commons licensed.
- **ParaCrawl** (<https://paracrawl.eu>), Creative Commons licensed.
- **OPUS OpenSubtitles 2018** (<http://opus.nlpl.eu/OpenSubtitles.php>), originating from the
  OpenSubtitles project (<http://www.opensubtitles.org/>); used with attribution to OpenSubtitles.
- **SUBTLEX** word lists (SUBTLEX-US, SUBTLEX-UK and others) by Marc Brysbaert et al.,
  <http://crr.ugent.be/programs-data/subtitle-frequencies>. Distributed in wordfreq with the
  author's permission on condition that derived work credits the SUBTLEX authors and that it
  remains clear SUBTLEX is freely available data. **SUBTLEX is freely available data.**
  Brysbaert, M. & New, B. (2009), Behavior Research Methods 41(4), 977-990;
  van Heuven, W. J., Mandera, P., Keuleers, E., & Brysbaert, M. (2014), QJEP 67(6), 1176-1190.
- **NewsCrawl** (WMT) and **GlobalVoices** news text; **OSCAR** web text
  (Ortiz Suárez, Sagot and Romary, 2019); Twitter and Reddit word statistics. Per the
  wordfreq README, the Twitter data gives word statistics only and republishes no content.

## AACText "Imagination of Crowds" corpus (`lexicon/en.bigram.v1.json`, `packs/core-en.json`)

Keith Vertanen and Per Ola Kristensson. *The Imagination of Crowds: Conversational AAC
Language Modeling using Crowdsourcing and Large Data Sources.* EMNLP 2011, 700-711.
<https://www.aactext.org/imagine/>. Licensed **CC BY 4.0**
(<https://creativecommons.org/licenses/by/4.0/>).

Used: `sent_train_aac.txt` only (bigram counts; candidate phrases). `sent_dev_aac.txt` and
`sent_test_aac.txt` are held out for evaluation. **Not used and never downloaded:**
`lm_test_switch.txt` and `lm_test_comm.txt`, which the corpus page excludes from CC BY 4.0.

**Changes made:** tokenized and normalized; bigram counts smoothed (modified Kneser-Ney
discounts, interpolated with the wordfreq unigram), pruned and stored as log10 probabilities.
Phrases: lines written independently by two or more workers, 1 to 6 words, filtered for names
and reviewed by hand, recased and repunctuated.

## Turk dialogues (`lexicon/en.bigram.v1.json`)

Keith Vertanen. *Towards Improving Predictive AAC using Crowdsourced Dialogues and Partner
Context.* ASSETS '17 (poster), 347-348. Filtered version: Jiban Adhikary, Robbie Watling,
Crystal Fletcher, Alex Stanage and Keith Vertanen, *Investigating Speech Recognition for
Improving Predictive AAC*, SLPAT 2019, 37-43. <https://www.aactext.org/turk/>.

License: the dataset web page states **CC BY 4.0**. **Conflict:** the `readme.txt` inside the
download (dated 18 Nov 2022) states CC BY-ND 3.0 Unported. We follow the web page, which is
the licensor's current public statement with a machine-readable `rel="license"` link.
Confirmation from the author is an open item (see `docs/architecture/data-and-eval.md`,
"License reasoning").
If the ND terms turn out to apply, rebuild the bigram file with
`build_bigrams.py --no-turk` (measured cost: dev perplexity 101 → 111).

Used: dialogues with `set = train` whose ids appear in the filtered file. Dev and test are
held out. **Changes made:** as for AACText bigram counts above.

## Universal Core vocabulary (`packs/core-en.json`, `words`)

Center for Literacy and Disability Studies, University of North Carolina at Chapel Hill,
Project Core. <https://www.med.unc.edu/healthsciences/clds/universal-core-vocabulary/>.

License: the UNC page states **CC BY 4.0**; the Project Core site footer states
**CC BY-SA 4.0** (both per the project plan's research of 2026-11; neither page could be
re-read from the build environment on 2026-11-06). We treat the list as **CC BY-SA 4.0**,
which `data/` satisfies either way. The 36 words were cross-checked against secondary
sources that reproduce the UNC list.
Only the 36 words are used: no symbols, boards or PDFs (PCS, SymbolStix and Widgit symbols
are not used).

**Changes made:** lowercased; each word given a 0.1 Zipf boost for the app's vocab-pack
loader.

---

## Also outside `data/`

`packages/eval/fixtures/test.v1.jsonl` (the frozen evaluation set) contains sentences from
the AACText test split and partner/reply pairs from the Turk dialogues test split, with their
tokenization and keypad codes. Those excerpts keep their source licenses (CC BY 4.0, with the
Turk caveat above) and the attribution in this file; see `packages/eval/fixtures/NOTICE.md`.

No NonCommercial data (e.g. DailyDialog, ARASAAC) is in this repository.
