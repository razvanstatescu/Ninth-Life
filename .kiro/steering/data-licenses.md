---
inclusion: auto
name: data-licenses
description: Dataset, lexicon, word list, corpus, font and asset licensing and attribution. Use when adding or changing files in data/, packages/eval fixtures or datasets, NOTICE or LICENSE files, word frequency lists, vocabulary packs, fonts, icons, or any third-party content.
---

# Data and asset licenses

The repo must stay open source with a license GitHub detects in the About box (MIT at the root). Data has its own license. Every third-party byte needs a source and a license we can honor.

## Layout

- Code: MIT (`LICENSE` at the root).
- `data/`: CC BY-SA 4.0 (`data/LICENSE`), with `data/NOTICE.md` listing every source, its license and what we derived. ShareAlike applies to derived word lists, so everything in `data/` is BY-SA.
- `packages/eval/fixtures/`: frozen test sentences from CC BY 4.0 sets, with `packages/eval/fixtures/NOTICE.md`.
- `packages/eval/.cache/`: downloaded eval-only datasets. Git-ignored. Never commit it.

## Sources and how we may use them (from plan section 3.1; re-check before adding)

| Source | License | Use |
|---|---|---|
| wordfreq 3.x data (en, ro, es) | Data CC BY-SA 4.0 (code Apache-2.0) | Unigram frequencies in `data/lexicon/`; attribute wordfreq and its upstream sources |
| AACText "Imagination of Crowds" (Vertanen and Kristensson 2011) | CC BY 4.0, except `lm_test_switch.txt` and `lm_test_comm.txt` | Test, dev and few-shot sentences; exclude the two non-CC files |
| Turk dialogues (Vertanen 2017) | CC BY 4.0 | Context-conditioned eval |
| Multilingual AAC sets (Vertanen, Zenodo) | CC BY 4.0 for three sets; the DailyDialog-based part is CC BY-NC-SA 4.0 | CC BY parts only |
| DailyDialog | CC BY-NC-SA 4.0 | Never commit; fetch by script for local eval only |
| Universal Core vocabulary (UNC CLDS) | Sources conflict (CC BY 4.0 vs CC BY-SA 4.0); we treat it as CC BY-SA 4.0 | Words only; never PCS, SymbolStix or Widgit symbols or PDFs |
| Atkinson Hyperlegible Next / Mono (Braille Institute) | SIL Open Font License 1.1 | Fonts; if self-hosted, keep `OFL.txt` next to the files |
| OpenSubtitles, COCA, SUBTLEX, Cornell, PersonaChat | Unknown or restrictive | Do not use |
| ARASAAC symbols | CC BY-NC-SA | Do not use (NC) |

## Rules

1. **No NC, ND or unknown-license data in the repo**, ever. If an eval needs it, the fetch script downloads it into `.cache/`.
2. **Every file under `data/`** has an entry in `data/NOTICE.md`: source URL, version or date, license, author, and what we changed. The `license-checker` custom agent audits this.
3. **No copied GPL code** (for example from Cboard): it would force our license. Ideas are fine; code is not.
4. **Personal vocabulary never enters this repo.** Generic packs only.
5. **Check before you add.** New dependency, font, icon set, sound or dataset: record the license in the NOTICE or README credits in the same change. If the license is unclear, stop and ask.
6. Cite research we rely on in docs; do not copy figures or tables from papers into the product.
