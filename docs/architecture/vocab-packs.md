# Word packs and "My words"

How a person's own words get into Ninth Life: spelled on the keypad, typed by a helper, or imported
from a **word pack** (a `VocabPack` JSON file, contracts.md §4). This is the format the planned Kiro
Crew app "Phrase Keeper" will write. Spec: `.kiro/specs/web-ui/requirements.md` Req 19-22.
Code: `packages/web/lib/{spell,myWords,vocabPack}.ts`, `components/{SpellSheet,MyWordsSheet}.tsx`.

## Why

The offline dictionary has 58,906 words, but no names: "Mihai" (keys 64424) has no dictionary word,
so ghost mode alone could never type it. Spell mode lets the person fix the exact letters of one
word (only the letters on the keys they pressed, so the proof check still holds), and "My words"
keeps it for next time.

## The file

```json
{
  "id": "family-example",
  "lang": "en",
  "version": 1,
  "words": [
    { "w": "Ana", "boost": 2 },
    { "w": "Mihai", "boost": 2 },
    { "w": "Bucharest", "boost": 1 },
    { "w": "Ștefan", "boost": 2 }
  ],
  "phrases": [
    "Call Ana, please.",
    "I want to go to Bucharest."
  ]
}
```

Only generic example names belong in this repository. A family's real pack (names of people, pets,
places, their phrases) is personal data: keep it in their own private storage or private repository,
never here (`.kiro/steering/privacy.md`).

| Field | Rule |
|---|---|
| `id` | 1-64 characters: letters, digits, `.`, `-`, `_` |
| `lang` | `en` (or `en-XX`); the app has an English dictionary only for now, so other languages are refused |
| `version` | whole number from 1 (the pack author's own counter) |
| `words` | list, at most **5,000** entries, each `{ "w": string, "boost"?: number }` |
| `words[].w` | one word in the person's spelling. After `normalize()` (NFKD, marks stripped, lower case) it must be a-z with apostrophes only inside the word, at most **32** letters. Capitals and diacritics are kept for display ("Mihai", "Ștefan") |
| `words[].boost` | zipf units added in the dictionary, clamped to 0-3; missing means 1. A word the dictionary does not know starts at 3.0, so boost 2 puts a name at 5.0, about as common as "water" |
| `phrases` | list of strings, at most **1,000**, each at most **280** characters after collapsing spaces. Optional on import, always written on export |
| file | at most 1 MB of JSON text |

**Validation** (`parseVocabPack`, hand-written, no new dependency): a wrong shape (not JSON, no
`words` list, bad `id`, other `lang`, bad `version`, too many words or phrases, too big) refuses the
whole pack with one plain sentence. A single entry that cannot be typed (a digit, a space, more than
32 letters, a non-number boost, a phrase over 280 characters) is left out and listed by name and
reason. Duplicates (same word after folding) merge: first spelling, largest boost.

**Preview before adding** (`planImport`): the sheet shows the pack id and version, the words it adds
(with how many the dictionary already knows: those only rank higher), the words in my words it
updates (new spelling or larger boost), the ones already there, the phrases it adds to "Your
phrases", phrases already saved, and every entry left out. Nothing is stored until the person
chooses **Add N words and M phrases**.

**Export** writes the person's words (their spelling, their boost) and their saved phrases as
`ninth-life-my-words.json` with `id: "my-words"`, so a pack can move to another device or browser.

**Import from a link**: a pasted `https://` link (a GitHub `.../blob/...` page link is turned into its
`raw.githubusercontent.com` file). The request sends no cookies, no referrer and nothing the person
typed; it times out after 10 s. `http://` is accepted only for `localhost` (testing).

## My words in the app

- **Where they come from**: "Add to my words" in spell mode, the same button next to a `new` word in
  the proof panel ("Not in your words yet. Add it?"), "Add a word" (a text field for a helper) in the
  My words sheet, or a pack import.
- **Storage**: IndexedDB store `words` (database `ninth-life` version 2), keyed by the folded word:
  `{ w, display, boost, added, source }`. Only on this device, only after one of the actions above.
  The words are sent nowhere, except that once they are in the dictionary they can appear in the
  candidate lattice of a model-ranking request when the person has turned model ranking on.
- **Ranking**: on every load, and at once when added, `lexicon.addWords([{ w, boost }])` raises them
  (default boost 2 for words the person adds). Boosts never stack (core ADR-core-001 §5).
- **Removing**: each word is a scan row with Remove, then Remove word / Keep. The core lexicon can
  only raise a word, never lower or forget one, so after a removal the web reloads the dictionary
  (`loadDictionary()`, served from the HTTP / service-worker cache) and applies the words that are
  left. Until that finishes the old lexicon is used.
- **Where to find it**: Phrases sheet (first row) and the compact Menu.

## Capital letters (resolves the open question in ADR-core-001 / core.md "Case is not stored")

Decision: **keep the person's spelling in the web layer; keep the core folded.**

- The lexicon stores and returns folded words (`mihai`), and the proof check, decoder and model
  request only ever see folded words. Nothing about validity changes.
- The web keeps a display map, folded word → spelling (`lib/myWords.ts` `buildDisplayMap`), built
  from my words plus any word spelled in spell mode during this visit. A display spelling is kept
  only if it folds back to its word, so it can never change which word is spoken.
- The map is applied just before `formatSentence` (SpeakBar text, the sentence list, proof chip
  labels, show mode, speech and saved phrases), so "hi mihai" is shown and spoken as "Hi Mihai".
- Spell mode starts with "Capital first letter" on for keys with no dictionary word (usually a
  name) and off otherwise; the person can switch it. A helper typing a word or a pack keeps any
  spelling, including all capitals or diacritics ("Ștefan" is spoken with its ș).

Why not in core: a display form per word is a data-format change for the lexicon file and would
touch every consumer; the web is the only place that shows text, and the decoder never needs it.

## Spell mode and unknown keys

- **Entry**: "Spell this word" (visible "Spell" on phones) in the actions row under the SpeakBar.
  It opens on the first word that has no dictionary or spelled word yet, else the last word.
- **Rows**: one per key pressed, offering only that key's letters as real radio buttons, so any
  choice encodes to the same code by construction; `spelledWord` checks it with `encodeWord` and the
  screen checks it again before pinning the word to its slot.
- **Keys**: 1-4 picks the nth letter of the current key and moves on, ArrowLeft/Right change the
  letter, ArrowUp/Down move between keys, Enter uses the word, Escape cancels. **Switch**: rows are
  Close, Use this word / Add to my words, one row per key, Capital first letter.
- **Sentences around an unknown word** (`decodeAround` in `lib/sentence.ts`): when no full sentence
  exists, the slots that have words (dictionary, spelled or added) are still ranked by beam search
  with a placeholder in the empty slots; an empty slot shows its digits, a dotted chip "not spelled
  yet", and Speak stays off. Once spelled, the word is pinned and normal sentences are listed.
  No core change was needed.
