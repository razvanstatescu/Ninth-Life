# ADR-data-002: Down-weight acronyms and non-dictionary words in the lexicon (SCOWL signal)

- Status: accepted
- Date: 2026-11-06
- Plan item: F2 (`docs/plan/01-implementation-plan.md`); open decision D7 is **not** decided here (see ADR-data-004)
- Contract: `docs/architecture/contracts.md` §2 (`data/lexicon/en.v1.json`): same shape, new build step

## Context
27% of the lexicon's word types share a code with another word, against 8.7% in MacKay's
`/usr/dict/words` count. wordfreq's top 60,000 includes many acronyms written in lower case (bbc,
nfl, pcs) and many tokens that are not dictionary words (lol, xbox, goin, https). They are rare
but they fill the lattice and appear as alternative sentences.

We need a signal for "acronym" and "not a dictionary word" with a license compatible with
`data/` (CC BY-SA 4.0).

**SCOWL** (Spell Checker Oriented Word Lists) 2020.12.07 by Kevin Atkinson,
<http://wordlist.aspell.net/>, downloaded from
`downloads.sourceforge.net/wordlist/scowl-2020.12.07.tar.gz` (SHA-256 `5587667c…`). Its
`Copyright` file grants permission "to use, copy, modify, distribute and sell these word lists ...
for any purpose ... without fee", with a notice requirement; the parts it incorporates (Moby, 12Dicts,
ENABLE, Brian Kelk's list, Census names) are public domain, and WordNet, Ispell, VarCon and UKACD
have permissive notice-only terms. That is compatible with CC BY-SA. We use SCOWL only as a
build-time membership signal: no SCOWL list is committed or shipped, and the lexicon's words and
frequencies still come from wordfreq. Attribution is in `data/NOTICE.md` anyway.

SCOWL keeps case, so it separates the classes wordfreq folds together. Over all spellings and
categories up to size 95, a lexicon word is classed as:

| Class | Rule | Words (of 58,906) |
|---|---|---|
| dict | some SCOWL list has it in lower case, or it is a contraction | 46,725 |
| proper | in SCOWL only with a capital (names, places, brands: London, Ryan, TV) | 6,824 |
| acronym | in SCOWL only in ALL CAPS (BBC, NFL, DVD, BTW) | 962 |
| none | in no SCOWL list (lol, xbox, goin, https) | 4,369 |

(One-letter words are excluded here; ADR-core-002 handles them.)

## Options measured
Each option was built with `build_lexicon.py` flags, the bigrams were rebuilt on that lexicon, and
the harness ran B0 and B1 on the full frozen set (866 items). All rows use the one-letter penalty
(-3). "Junk in top 5" counts items whose five B1 suggestions contain a word of that class that is
not in the gold sentence.

| Option | B1 top-1 | B1 top-5 | Turk top-1 | Turk top-5 | B0 top-1 / top-5 | Unreachable | Acronym / none in top 5 | Shared-code types |
|---|---|---|---|---|---|---|---|---|
| none (baseline) | 85.5% | 97.2% | 79.3% | 95.0% | 62.4% / 91.9% | 15 | 93 / 121 | 27.0% |
| (b) acronyms dropped | 85.5% | 97.3% | 79.3% | 95.3% | 62.4% / 92.0% | 15 | 0 / 126 | 25.8% |
| (b) acronyms down 1.0 | 85.5% | 97.3% | 79.3% | 95.3% | 62.4% / 92.0% | 15 | 12 / 126 | 27.0% |
| (b') no-vowel heuristic, dropped | 84.6% | 96.5% | 79.3% | 95.3% | 61.7% / 91.2% | **23** | 87 / 86 | 25.3% |
| (b') no-vowel heuristic, down 1.0 | **85.3%** | 97.5% | 79.3% | 95.3% | 62.4% / 91.9% | 15 | 84 / 108 | 27.0% |
| (c) non-dictionary dropped | 85.5% | **97.0%** | 79.3% | **94.3%** | 62.4% / 91.7% | **17** | 101 / 0 | 25.2% |
| (c) non-dictionary down 1.0 | 85.6% | 97.2% | 79.7% | 95.0% | 62.4% / 91.9% | 15 | 100 / 50 | 27.0% |
| (c) non-dictionary down 2.0 | 85.6% | 97.2% | 79.7% | 95.0% | 62.4% / 91.9% | 15 | 100 / 46 | 27.0% |
| **(b) + (c), down 1.0 (chosen)** | **85.6%** | **97.3%** | **79.7%** | **95.3%** | 62.4% / 92.0% | 15 | 15 / 50 | 27.0% |
| (b) + (c), down 2.0 | 85.6% | 97.3% | 79.7% | 95.3% | 62.4% / 92.0% | 15 | 7 / 46 | 27.0% |

Dropping non-dictionary words made 2 more test items unreachable (four test-set words, among them
"goin" and "adhd", are in no SCOWL list), and the no-vowel heuristic hit abbreviations people say
("tv", 7 times in the test set, and "dr"). Down-weighting keeps
every word typeable: it only moves it below the other readings of its code.

## Decision
Ship `--acronyms down --junk down --down-zipf 1.0` (SCOWL size 95) as the defaults of
`build_lexicon.py`: subtract 1.0 Zipf, floored at 2.0, from acronym-class and none-class words.
1.0 and 2.0 measure the same on the gold metrics; 1.0 is the smaller change to wordfreq's own
ranking (the none class also holds informal speech such as "goin", "c'mon", "lookin").

The lexicon keeps all 58,906 words, so the shared-code share stays 27.0%; the
frequency-weighted share of running text whose word is the first reading of its code goes from
94.15% to 94.31%. Brotli size 328,051 → 328,257 B. The bigrams were rebuilt on the new lexicon
(dev perplexity 101.2, unchanged); the pack was rebuilt and is byte-identical.

`eval.lock` was regenerated with `pnpm data:freeze` to record the new lexicon and bigram hashes;
the fixture itself is byte-identical (same SHA-256 `9fefd9db…`), so results stay comparable.

License fallback: SCOWL size 95 includes UKACD (size 80), whose notice asks to be shown when it
is "used in a software package". We only read membership at build time and ship no UKACD text, and
`data/NOTICE.md` carries the notices anyway. If the team wants no doubt at all, `--scowl-level 70`
uses only public-domain and notice-only lists without UKACD/ENABLE. Measured: B1 85.6% / 97.3%,
Turk 79.7% / 95.3%, unreachable 15 (same), B0 62.5% / 91.9%; it down-weights 10,369 + 478 words
instead of 4,369 + 962, i.e. more real words.

## Also measured, not decided: offensive readings (D7)
`pnpm -F @ninth/eval report:offensive` writes `packages/eval/reports/offensive-readings.md`. It
uses the LDNOOBW "List of Dirty, Naughty, Obscene, and Otherwise Bad Words" English list
(CC BY 4.0, <https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words>),
fetched into the gitignored cache and never committed. The report never spells a listed word.
Result on the shipped data: 14 identity slurs are in the lexicon, 7 of them share a code with
ordinary words, and a slur appears among the B1 top 5 for 8 of 866 test items (0.9%), never at
top 1. Nothing is filtered: that is D7's call.

## Consequences
- `pnpm data:fetch` now also downloads SCOWL (2.5 MB, extracts `final/`, `Copyright`, `README`)
  and the LDNOOBW list, both pinned by SHA-256. `pnpm data:build` needs them.
- `build-stats/lexicon.json` records the class counts and the first 25 affected words per class.
- Requirement eval-harness 5.8 (down-weighting never removes a word and lowers a score by at most
  `--down-zipf`) is property-tested in `scripts/test_build_lexicon.py`.
- Revisit if a family reports that an informal word they use is hard to reach; per-family vocab
  packs (`addWords` with a boost) already undo the down-weight for one person.
