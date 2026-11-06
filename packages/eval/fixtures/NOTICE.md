# fixtures/: attribution

`test.v1.jsonl` contains, verbatim in its `text` and `partner` fields:

- sentences from `sent_test_aac.txt` of the AACText "Imagination of Crowds" corpus,
  Keith Vertanen and Per Ola Kristensson, EMNLP 2011, <https://www.aactext.org/imagine/>,
  **CC BY 4.0** (<https://creativecommons.org/licenses/by/4.0/>);
- partner/reply turn pairs from the test split of the Turk dialogues, Keith Vertanen,
  ASSETS 2017, <https://www.aactext.org/turk/>, **CC BY 4.0** per the dataset page (the
  readme inside the download says CC BY-ND 3.0; see `data/NOTICE.md`).

Added by us: `words` (tokenized, normalized) and `codes` (9-key codes). These excerpts are not
covered by the repository's MIT license; they keep their source license. Built by
`packages/eval/scripts/build_testset.py`; SHA-256 in `../eval.lock`.
