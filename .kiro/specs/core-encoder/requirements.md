# Requirements: core-encoder

## Introduction
`@ninth/core` turns 9-key predictive text presses into words and decides what may be spoken. A
person presses keys 2-9, one press per letter (letter mode) or one press per word (initials mode),
and the app speaks the sentence they meant. The deterministic validator guarantees that every
spoken word encodes to the keys pressed, so a language model can rank words but can never put
words in someone's mouth. The package runs unchanged in the browser, in Next.js server code (the
Vercel decode route) and in the eval CLI.

Contract: `docs/architecture/contracts.md` §1. Clarifications: `docs/decisions/ADR-core-001-contract-clarifications.md`.

## Glossary
- **Code**: the digit string for a word, e.g. `good` -> `4663`.
- **Normalized**: NFKD, combining marks removed, lowercase, apostrophe look-alikes folded to `'`.
- **Lexicon**: a code -> words map with Zipf frequencies (`data/lexicon/<lang>.v1.json`).
- **Lattice**: for each code, the candidate words for that slot.
- **Ghost mode**: offline decoding with the lexicon and a bigram model; no network, no LLM.

## Requirement 1: Encoding
**User story:** As a person typing on a 9-key keypad, I want every letter to map to its standard key,
so that the same presses always mean the same words wherever the app runs.

1.1 WHEN a word contains only letters a-z after normalization, THE encoder SHALL return one digit
    2-9 per letter using the standard keypad mapping (abc=2, def=3, ghi=4, jkl=5, mno=6, pqrs=7,
    tuv=8, wxyz=9).
1.2 WHEN a word contains uppercase letters, diacritics (including Romanian ă â î ș ş ț ţ and Spanish
    á é í ó ú ü ñ), compatibility forms (fullwidth, mathematical, circled letters) or apostrophe
    look-alikes (’ ‘ ʼ ＇ ´ `), THE encoder SHALL return the same code as for its plain a-z spelling.
1.3 IF a word contains, after normalization, any character other than a-z or an apostrophe, or no
    letter at all, THEN THE encoder SHALL return null.
1.4 WHEN a word contains apostrophes, THE encoder SHALL skip them ("isn't" -> "4768").
1.5 WHEN a sentence is encoded, THE encoder SHALL split it into words on whitespace and punctuation
    and return one code per word, AND IF any word cannot be encoded THEN THE encoder SHALL throw a
    RangeError that names the word.
1.6 THE normalizer SHALL be idempotent and its output SHALL contain no combining marks and no
    apostrophe look-alikes other than `'`.

## Requirement 2: Lexicon
**User story:** As a person typing, I want the most likely word for my presses first, and
completions as I type, so that I need as few presses as possible.

2.1 WHEN `lookup(code)` is called, THE lexicon SHALL return the words with exactly that code in
    descending frequency order (ties in file order), or `[]` if there are none, as a copy the
    caller cannot use to change the lexicon.
2.2 WHEN `completions(prefix, k)` is called, THE lexicon SHALL return the k most frequent words whose
    code starts with prefix (including the exact code), in descending frequency order (ties in load
    order), k = 5 by default. (Since ADR-data-003 the answer comes from a sorted code index and a
    per-prefix cache instead of a precomputed trie; the results are the same.)
2.3 WHEN `has(word)` or `zipf(word)` is called, THE lexicon SHALL normalize the word first, and
    SHALL NOT treat inherited object keys (e.g. "constructor") as words.
2.4 WHEN `addWords` is called, THE lexicon SHALL add unknown encodable words (zipf 3.0 + boost),
    raise known words by their boost, skip words that cannot be encoded, and SHALL give the same
    result whether a pack is added once or twice and in any order (the largest boost wins).
2.5 THE lexicon SHALL report `size` as the number of distinct normalized words.
2.6 WHEN a lexicon file is loaded, THE lexicon SHALL re-encode every word, file it under its real
    code, and drop words that cannot be encoded, so that every word `lookup(code)` returns encodes
    to code.
2.7 IF a lexicon file is neither version 1 (with `codes`) nor version 2 (with `words`), THEN THE lexicon
    SHALL throw a TypeError.
2.8 WHEN a lexicon file is loaded, THE lexicon SHALL encode a word that is plain a-z and apostrophes
    with a per-letter table and SHALL send every other word through `normalize` and `encodeWord`, AND
    the result SHALL equal loading every word through `normalize` and `encodeWord` (plan F9, C1).
2.9 WHEN a version 2 file (`LexiconFileV2`, ADR-data-003) is loaded, THE lexicon SHALL derive every
    code from its word, AND SHALL give the same `size`, `lookup`, `zipf` and `completions` as the
    version 1 file it was built from; a list that arrives in rank order SHALL NOT be sorted again.
2.10 THE lexicon SHALL build its completion index without ranking the whole vocabulary, either on
    `prepare()` or on the first `completions()` call, SHALL keep it exact after `addWords` (new codes
    inserted, cached answers dropped), AND `prepare()` SHALL be idempotent.
2.11 THE shipped `data/lexicon/en.v2.json` SHALL load to the same lexicon as `data/lexicon/en.v1.json`
    (every `lookup`, every `zipf`, `size`, and `completions(p, 12)`).

## Requirement 3: Validator
**User story:** As a person who relies on the app to speak for me, I want a guarantee that nothing is
spoken that I did not type, so that I can trust it in front of other people.

3.1 THE validator SHALL reject any candidate whose word count differs from the code count.
3.2 WHEN the validator accepts a candidate in letter mode, THE candidate SHALL have every word
    encode exactly to its slot's code (soundness).
3.3 WHEN every word of a candidate encodes and the codes are those words' codes, THE validator
    SHALL accept it (completeness).
3.4 WHILE initials mode is selected, THE validator SHALL accept a word only if its slot code is one
    digit equal to the key of the word's first letter.
3.5 WHEN a proof is requested, THE validator SHALL mark each word `match` (encodes to its code and
    is in the lexicon), `new` (encodes to its code, not in the lexicon) or `reject` (does not encode
    to its code), and the proof SHALL contain no `reject` exactly when the validator accepts the
    candidate.

## Requirement 4: Language models
**User story:** As a person typing a sentence, I want likely word pairs ranked first ("go home" over
"go good"), so that the first suggestion is usually right.

4.1 THE unigram model SHALL score log10 p(w) = zipf(w) - 9 clamped to [-9, 0], and -9 for unknown words
    (plus the one-letter penalty of 4.5).
4.2 THE bigram model SHALL return the listed log10 P(w | prev) when present, otherwise
    backoff(prev) + unigram(w) with backoff 0 for an unseen prev, AND IF the file is not version 1
    THEN SHALL throw a TypeError.
4.3 THE bigram model SHALL read only own properties of the JSON tables.
4.4 THE language models SHALL return a finite log-probability <= 0 for any input strings.
4.5 THE language models SHALL add `letterPenalty` (default -3 log10, ADR-core-002) to the score of a
    one-letter word that is not in `spokenLetters` (default "a", "i"), never going below the floor,
    AND SHALL leave every other score unchanged; `letterPenalty: 0` SHALL turn it off.

## Requirement 5: Ghost-mode decoding
**User story:** As a person who is offline or has the LLM off, I want whole-sentence suggestions from
the dictionary alone, so that I can always talk.

5.1 WHEN a lattice is built, THE decoder SHALL return one slot per code holding at most perSlot
    (default 12) words in frequency order, and `[]` for a code with no words.
5.2 WHEN a beam search runs, THE decoder SHALL return at most B (default 32) candidates sorted by
    descending total log-probability, where the total is the sum of log P(w_i | w_{i-1}) and the
    first word's prev is `<s>` unless given.
5.3 WHEN `decodeGhost` returns candidates, THE decoder SHALL return at most k (default 5) distinct
    candidates, and every candidate SHALL pass `validate(words, codes, mode)`.
5.4 WHERE context words are given, THE decoder SHALL use only the last context word, as the prev of
    the first slot, and SHALL NOT include context words in candidates.
5.5 IF any code has no word in the lexicon, or there are no codes, THEN THE decoder SHALL return no
    candidates (ghost mode never invents words).
5.6 WHILE initials mode is selected, THE decoder SHALL fill each one-digit slot with the most
    frequent words starting on that key.
5.7 THE decoder SHALL be deterministic: the same inputs SHALL give the same candidates.
5.8 THE one-letter penalty SHALL NOT remove a valid reading from the lattice: with a beam wide enough
    to hold every sentence, the penalised and unpenalised models SHALL yield the same sentences,
    only in a different order.

## Requirement 6: Formatting
**User story:** As a person speaking through the app, I want my sentence written properly, so that
it reads naturally on screen and in shared text.

6.1 WHEN a sentence is formatted, THE formatter SHALL capitalize the first letter of the first word.
6.2 WHEN a word is "i" or an "i'" contraction (i'm, i'll, i've, i'd), THE formatter SHALL write it
    with a capital I.
6.3 WHERE a punctuation mark (. ? ! ,) is chosen, THE formatter SHALL append it without a space;
    an empty sentence SHALL format to "".
6.4 THE formatter SHALL NOT add, remove, reorder or change words: tokenizing the formatted text
    SHALL give back the normalized input words.

## Requirement 7: Portability
**User story:** As a teammate on the web app, decoder or eval harness, I want one engine that runs
everywhere, so that client and server always agree.

7.1 THE package source SHALL use no DOM APIs and no Node-only APIs.
7.2 THE package entry point SHALL export the whole contract surface of `contracts.md` §1.
