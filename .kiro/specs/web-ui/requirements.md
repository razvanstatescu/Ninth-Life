# Requirements: web-ui

## Introduction
The web app (`packages/web`, Next.js 15.1 App Router) is the communication screen people actually use:
they press keys 2-9, one press per letter, pick or accept a sentence, and press Speak. It must work
offline, with a keyboard, by touch, or with one or two switches, for people who may type for hours with
low vision, tremor or fatigue. Milestone M1 is ghost mode in the browser: the offline dictionary and
language model from `@ninth/core`, with optional model ranking from `@ninth/decoder`.

Sources: `design/system/README.md` (brand book), `design/artboards/In-context-app.dc.html` (target
screen), `docs/architecture/contracts.md` §1-§5, `docs/plan/00-source-plan.md` §4.5-§4.6, steering
`accessibility.md`, `design-system.md`, `voice.md`, `privacy.md`, `trademarks.md`, and the
`access-modes` spec (Req 4 is implemented here).

## Glossary
- **Code**: the digit sequence for one word ("92837").
- **Ghost mode**: decoding with the offline dictionary only (`decodeGhost`), no network.
- **Model ranking**: the optional cloud re-ranking (`POST /api/decode` or `NEXT_PUBLIC_DECODE_URL`).
- **Proof**: per-word check that a word encodes to its code (`proof()` in `@ninth/core`).
- **Ember thing**: the one ember fill on screen: Speak, the lit key or the scan highlight.

## Requirement 1: Keypad and composition
**User story:** As a person who types to talk, I want a fixed 12-key pad where one press is one letter,
so that motor memory holds and I never tap a key three times.

1.1 THE app SHALL show 12 keys in the fixed layout 1 2 3 / 4 5 6 / 7 8 9 / * 0 #, with letters as the large
    label, the digit small in the corner, and an `aria-label` of the digit then the spaced letters ("4, G H I").
1.2 WHEN a key 2-9 is pressed, THE app SHALL append its digit to the current word's code.
1.3 WHEN 0 is pressed, THE app SHALL commit the current word.
1.4 WHEN * is pressed, THE app SHALL delete the last digit; IF there is no unfinished word THEN it SHALL remove
    the sentence punctuation, and then the last word.
1.5 WHEN # is pressed, THE app SHALL replace the last word with the next word for the same code, and SHALL
    say "No other words for these keys." when there is none.
1.6 WHEN 1 is pressed, THE app SHALL cycle the sentence punctuation through none, ".", "?", "!", ",".
1.7 THE SpeakBar SHALL show the formatted sentence in `utterance` (40px) with each word's code under it in
    mono, and SHALL wrap long sentences, never truncate them.
1.8 WHILE the last word has no exact dictionary word, THE SpeakBar SHALL show it as unfinished (partial
    letters, dotted underline) and Speak SHALL be disabled.
1.9 AFTER the sentence is spoken, THE sentence SHALL stay on screen until the next letter key starts a new one.

## Requirement 2: Sentences for your keys
2.1 THE app SHALL list up to 5 ranked sentences for the keys, each as a `<button>` with a rank badge and
    `aria-pressed` on the one shown in the SpeakBar.
2.2 WHEN a sentence is chosen, THE app SHALL show it in the SpeakBar AND SHALL NOT speak it.
2.3 WHEN the person keeps typing after choosing a sentence, THE chosen words SHALL stay fixed.
2.4 WHEN the list changes, THE app SHALL announce the count in a polite live region.
2.5 Every listed sentence SHALL pass `validate()` against the current codes.

## Requirement 3: Proof display
3.1 THE proof panel SHALL show each word of the shown sentence as a ProofChip with its code.
3.2 THE chip states SHALL be told apart by icon, border style and text treatment, never by color alone:
    match = check icon and solid border; new = plus icon and dashed border; reject = x icon and struck-through text.
3.3 Each chip SHALL carry visually hidden state text ("water, matches your keys").
3.4 WHEN model ranking returns a suggestion that does not match the keys, THE panel SHALL show the dropped word as
    a reject chip and a sentence of the form `The model suggested "…". Your keys spell …, so … was dropped and will not be spoken.`
3.5 A rejected word SHALL never appear in the SpeakBar and SHALL never be spoken.

## Requirement 4: Speech
4.1 WHEN Speak is pressed, THE app SHALL speak the sentence with the Web Speech API, synchronously inside the
    click or key handler (iOS user-gesture rule).
4.2 THE app SHALL wait for `voiceschanged` (up to 2 s) before deciding there are no voices.
4.3 THE voice picker SHALL list on-device (`localService`) voices first and label each voice "on this device" or "online".
4.4 THE app SHALL split text longer than 160 characters into chunks at sentence, then word, boundaries.
4.5 IF no voice is available or speech fails, THEN THE app SHALL show the sentence in a full-screen big-text show mode.
4.6 THE settings SHALL offer voice, speed (0.5-2), pitch (0.5-2) and a Test voice button.
4.7 Show mode SHALL offer Flip (a toggle with `aria-pressed`, beside Done in the same scan row): WHEN pressed, THE
     message (label and sentence) SHALL turn 180 degrees for the person opposite while Done and Flip stay upright, with no
     animation; show mode SHALL open unflipped every time (2026-11-09, docs/research/mobile-aac-evidence.md).

## Requirement 5: Offline
5.1 THE service worker SHALL precache the app shell, fonts, icons and `/data/**` so ghost mode works offline after one visit.
5.2 WHILE the device is offline, THE app SHALL decode with the local dictionary AND SHALL show the indicator
    "Offline. Using your dictionary."
5.3 IF the dictionary files are missing or fail to load, THEN THE app SHALL show "Dictionary not loaded", keep showing
    the digits typed, and disable Speak.
5.4 THE service worker SHALL treat decode requests as network-only.

## Requirement 6: Keyboard only
6.1 Top-row and numpad digits SHALL type keys 0-9; `*` and numpad `*` SHALL be Back; `#` and numpad `/` SHALL be Next;
    Backspace SHALL be Back.
6.2 WHEN focus is not on another control, Enter SHALL speak and Space SHALL be 0; WHEN focus is on a button, link or
    field, Enter and Space SHALL belong to that control.
6.3 ArrowUp and ArrowDown SHALL move the chosen sentence; Alt+1 to Alt+5 SHALL choose sentence 1 to 5. Plain digits
    SHALL always type.
6.4 WHILE focus is in a text field or a sheet is open, THE keypad shortcuts SHALL be off.
6.5 Focus order SHALL follow the visual order, and a "Skip to the keypad" link SHALL be the first stop.

## Requirement 7: Touch only
7.1 Every action SHALL be a single tap; THE app SHALL use no swipes, drags or long presses.
7.2 WHEN the same key is tapped again within `acceptDelayMs`, THE app SHALL ignore the second tap.
7.3 Key size SHALL be selectable: Large 96px or Extra large 128px, shrinking to fit narrow phones but never below 72px.

## Requirement 8: Switch scanning UI
8.1 THE scan grid SHALL be: rows 0-3 the keypad rows, row 4 the sentences on show (plus More / Fewer sentences when
    present; skipped when empty), row 5 the "Add to my words" offers (Req 21.2; skipped when empty), row 6 Speak,
    Clear, Save phrase, Show, Spell this word, and row 7 the header (Menu on compact screens; Phrases, Voice, Settings
    on wide ones), so any key is reachable in at most 4 + 3 = 7 highlight steps. Keypad rows
    come first because typing is what a switch user does most (Keypad README; M1 review F3).
8.2 THE active row SHALL get `is-scanning` (ember ring inside a plum ring) and then the active cell `is-lit`.
8.3 WHILE `access` is `scan1`, THE app SHALL tick every `scanMs` (400-5,000 ms, default 1,200), and Space or Enter SHALL select.
8.4 WHILE `access` is `scan2`, Space SHALL advance and Enter SHALL select, and THE app SHALL NOT tick.
8.5 IN scan modes, a press on the page outside any control SHALL act as the switch.
8.6 THE app SHALL show the scan speed with Slower and Faster buttons under the keypad, and the loops and accept delay in settings.
8.7 WHILE a sheet or show mode is open, scanning of the main screen SHALL pause and scanning SHALL move into the
    sheet (Req 16).

## Requirement 9: Targets and text
9.1 Every button, link, input and candidate SHALL be at least 56px tall and wide.
9.2 No text in the app SHALL be smaller than 16px.
9.3 Every control SHALL be a real `<button>`, `<a href>`, `<input>` or `<select>`; an icon SHALL sit beside a word.

## Requirement 10: Color, contrast and focus
10.1 THE app SHALL use only tokens from `design/system/tokens.json`, in Night (default) and Day themes, and a
     "Match device" option that follows `prefers-color-scheme`.
10.2 THE screen SHALL show at most one ember fill at a time (Speak, the lit key, or the scan highlight).
10.3 Focus SHALL always be visible: 4px `--focus` outline with a 3px offset.
10.4 THE theme SHALL be applied before first paint (no flash of the wrong theme).

## Requirement 11: Motion
11.1 THE scan highlight SHALL jump between rows and keys with at most a 120ms linear color change, and nothing SHALL
     slide, pulse, bounce or blink.
11.2 WHEN `prefers-reduced-motion: reduce` is set, THE app SHALL remove all transitions.

## Requirement 12: Model ranking
12.1 Model ranking SHALL be off by default AND its setting SHALL say that it sends the keys and the other person's last
     line to a cloud model.
12.2 WHEN model ranking is on and online, THE app SHALL send codes, lattice, ghost beams and the partner line, and nothing else.
12.3 IF the request fails, returns non-200 or takes more than 1,500 ms, THEN THE app SHALL stay in ghost mode without a message.
12.4 THE app SHALL re-run `validate()` on every returned sentence; sentences that fail SHALL NOT be listed.
12.5 THE app SHALL NOT speak model output on its own; only a Speak press speaks.
12.6 THE Next.js route `/api/decode` SHALL return 503 `llm_disabled` unless `LLM_ENABLED=true` and `ANTHROPIC_API_KEY` is set (default off). It is the production decode endpoint (ADR-001).

## Requirement 13: Storage and privacy
13.1 Phrases SHALL be stored in IndexedDB only when the person presses Save phrase, and SHALL be deletable with a confirmation.
13.2 "They said" SHALL be optional, typed, at most 280 characters, and never stored.
13.3 THE app SHALL set no cookies, call no analytics and load no third-party fonts at runtime.

## Requirement 14: Copy and claims
14.1 Copy SHALL use plain verbs, sentence case, digits for numbers and no exclamation marks, and follow the Write / Not table.
14.2 THE app SHALL NOT name any third-party phone or keyboard brand (the list in `.kiro/steering/trademarks.md`;
     say "9-key predictive text"), and SHALL make no medical claim.
14.3 THE footer and the About page SHALL carry: "Ninth Life is a general-purpose text entry and text-to-speech tool. It is
     not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment."

## Requirement 15: Phone layout (M1 review F1)
**User story:** As a person who types to talk on a phone, I want the keypad and my sentence on the first screen,
so that I never scroll to reach a key.

15.1 WHILE the viewport is narrower than 960px (compact), THE app SHALL order the screen: header, SpeakBar with its
     actions, keypad, scan control, sentences, proof, "They said", keyboard hint, AND the DOM order (and so the focus
     order) SHALL match that visual order.
15.2 WHILE compact, THE header SHALL be one row: the icon and name, one status pill that sums up the dictionary,
     offline and model state in a word or two (with the full state as screen reader text), and one Menu button.
15.3 WHEN Menu is pressed, THE app SHALL open a Menu sheet with Phrases, My words, Voice and Settings and the full status;
     each choice SHALL open its sheet in place of the Menu.
15.4 WHILE compact, THE app SHALL show at most 3 sentences and a "More sentences" button when there are more;
     WHEN a sentence past the third is chosen (ArrowDown, Alt+4, Alt+5), THE full list SHALL open.
15.5 AT 390 x 844 THE SpeakBar and the whole keypad SHALL be visible without scrolling with keys of at least 72px;
     key size SHALL depend on the viewport only, never on the sentence, so keys do not move while typing.
15.6 WHILE the viewport is 960px or wider, THE app SHALL keep the In-context-app artboard layout (every status pill,
     Phrases, Voice and Settings in the header; talk column beside the keypad).
15.7 THE sentence SHALL wrap and SHALL never be truncated at any width, and nothing SHALL scroll horizontally at 360px.
15.8 ON every phone and tablet in `test/e2e/responsive.mjs` (phones in portrait, tablets in portrait and landscape; phones
     held sideways follow Req 25.6) THE whole keypad and Speak SHALL be visible without scrolling, keys SHALL be at least 72px, other
     targets at least 56px and app text at least 16px (added 2026-11-09, docs/research/mobile-layout.md).
15.9 WHILE a phone is held sideways (narrower than 960px, landscape, under 600px tall), THE app SHALL use the split
     layout: the keypad pinned on the right and sized to the screen height, everything else in a column on its left.
     **Superseded 2026-11-09 for touch phones by Req 25.6 (ADR-003):** a phone held sideways shows only "Turn your
     phone upright". The split layout now serves tablets in landscape (Req 25.5) and short landscape desktop windows.
15.10 THE keypad SHALL NOT move on screen while a sentence is typed, however long it gets: wherever the SpeakBar sits
     above or beside it, its text area SHALL keep one height and scroll inside, kept scrolled to the newest word.
15.11 Key size SHALL follow the small viewport height (svh), so keys do not resize when the browser toolbar shows or
     hides; the page SHALL pad by the safe-area insets (viewport-fit=cover), SHALL NOT reload on pull-to-refresh and
     SHALL NOT zoom on a double tap, and pinch zoom SHALL stay available.

## Requirement 16: Switch access everywhere (M1 review F4)
**User story:** As a person who uses one or two switches, I want to reach every sheet and change every setting
with my switch, so that I do not need someone else to change my settings.

16.1 IN scan modes, THE main scan grid SHALL include the header row (Req 8.1), so Menu, Phrases, Voice and Settings
     can be opened by switch.
16.2 WHILE a sheet or show mode is open in a scan mode, THE app SHALL scan the sheet's controls with `scanReducer`:
     one row per group of controls, the Close row first, starting by itself at the Close row; choosing a cell SHALL
     do what a tap on it does.
16.3 EVERY setting SHALL be changeable with a switch: radio groups and switches are scan cells, each slider has
     buttons that lower and raise it (scan speed: Faster and Slower), and the voice picker has Previous voice and
     Next voice.
16.4 WHILE a sheet is open, scanning SHALL keep the mode it was opened with, so a switch user can turn scanning off
     (Keyboard, Touch), change to the other scan mode, or turn it back on before closing; the new mode SHALL start
     when the sheet closes.
16.5 IN scan modes, Space and Enter SHALL be the switch inside sheets too (2 switches: Space moves, Enter chooses),
     and a press on the sheet or its backdrop outside a control SHALL act as the switch.
16.6 WHILE scanning, THE scan highlight SHALL be the only ember thing: Speak SHALL be quiet, and focus SHALL rest on
     the sheet, not on a button, and SHALL NOT return to a button when the sheet closes.
16.7 WHILE a sheet is open in a scan mode, WHEN Keyboard or Touch is chosen, THE app SHALL first ask "Turn off switch
     scanning? You will need a keyboard or touch to turn it back on." in place of the sheet's settings, with Cancel as
     the first cell of the scan row right after Close, AND SHALL change the setting only on "Turn off"; Cancel, Close
     or Escape SHALL leave it unchanged. Changing between the two scan modes, or choosing while scanning is not on,
     SHALL NOT ask (plan F11).

## Requirement 17: Quick phrases (M1 review F6)
**User story:** As a person who types to talk, I want common phrases ready to speak, so that I can answer quickly.

17.1 THE Phrases sheet SHALL show "Your phrases" (saved) and "Quick phrases" from the vocab pack
     (`data/packs/core-en.json` `phrases`), in pack order.
17.2 WHEN a quick phrase is chosen by touch, keyboard or switch, THE app SHALL speak it (or show it in show mode when
     there is no voice); nothing SHALL be spoken without that choice.
17.3 THE sheet SHALL show 12 quick phrases at first and 12 more per "More quick phrases" press, grouped 4 to a scan
     row so a switch user picks a group, then a phrase.

## Requirement 18: Speech robustness
**User story:** As a person who types to talk, I want every sentence I choose to be spoken in full, in the right
language, and never to get stuck, so that the people around me hear what I meant on whatever device I have.

Builds on Req 4. Browser and OS behaviour behind each item: `docs/research/web-speech.md` (checked 2026-11-06).

18.1 WHEN text is longer than the chunk limit, THE app SHALL split it at sentence ends, then at clause marks (`,` `;`
     `:` and dashes), then at spaces, AND SHALL NOT split inside a word (a single word longer than the limit is a chunk
     of its own); the chunks joined with single spaces SHALL equal the text with its whitespace collapsed.
18.2 THE chunk limit SHALL follow the speech rate: 160 characters at rate 1 or faster, proportionally fewer at slower
     rates, never fewer than 40, so that each chunk stays under the ~14 s cutoff of some network voices.
18.3 THE app SHALL speak one chunk at a time, queuing the next only from the previous chunk's `end`, AND SHALL keep a
     reference to each utterance until it ends, fails or its sentence is settled.
18.4 WHEN no voice has been chosen, THE app SHALL pick a voice that speaks the sentence's language, preferring ordinary
     voices over novelty or very low quality ones, then on-device over online voices, then the exact region; IF no voice
     speaks the language, THEN it SHALL use the first voice in picker order.
18.5 WHEN the remembered voice (by `voiceURI`) still exists and speaks the language, THE app SHALL use it; IF it is
     gone, or another voice speaks the language and it does not, THEN THE app SHALL choose by 18.4.
18.6 IF `voiceschanged` arrives with an empty list before the wait of Req 4.2 ends, THEN THE app SHALL keep waiting
     AND SHALL NOT treat the device as having no voices.
18.7 IF the wait ends with no voices, THEN THE app SHALL treat the device as having no voices (show mode on Speak),
     SHALL look at the list again every 1 s up to 5 times, AND SHALL use voices as soon as they appear, by event or by
     a later look.
18.8 WHEN Speak is pressed while speech is playing or queued, THE app SHALL cancel it before speaking; WHILE the
     engine is idle, THE app SHALL NOT call `cancel()` before speaking.
18.9 WHEN a new sentence replaces one still speaking, or speech is stopped, THE app SHALL report the old sentence as
     ended exactly once AND SHALL ignore its later events.
18.10 IF a chunk has started and neither `end` nor `error` arrives within 3 times its estimated length plus 2 s, THEN
      THE app SHALL cancel it and go on with the next chunk, or end the sentence after the last one.
18.11 IF the engine reports an error other than `canceled` or `interrupted`, THEN THE app SHALL report the error type
      once (never the text), SHALL drop the rest of the sentence, AND THE screen SHALL show the sentence in show mode
      (Req 4.5); `canceled` or `interrupted` from outside SHALL count as the end.
18.12 IF there is no speech engine, the text is empty, or the engine throws, THEN `speak()` SHALL return false so the
      screen shows show mode (Req 4.5).
18.13 THE app SHALL normalize voice language tags (`en_us`, `eng-US-f000`) before matching them, AND SHALL ignore the
      `default` flag when every voice claims it.

## Requirement 19: Spell this word
**User story:** As a person who types to talk, I want to choose the exact letters of a word, so that I can say names
and words the dictionary does not have ("Mihai" is 64424, which no dictionary word matches).

19.1 WHILE the dictionary is ready, the mode is letter mode and a word is typed, THE actions row SHALL offer "Spell this
     word" (visible "Spell" below 600px, accessible name "Spell this word"); it SHALL open spell mode on the first word
     that is not spelled yet (Req 20.2), else on the last word.
19.2 Spell mode SHALL show the word in `utterance` type with its keys in mono, and one row per key pressed offering
     only that key's 3 or 4 letters as radio buttons.
19.3 THE spelled word SHALL encode to the slot's code: spell mode SHALL NOT offer a letter that is not on the key, AND
     THE app SHALL check the word with `encodeWord` before it uses it.
19.4 Touch: a tap chooses a letter. Keyboard: 1 to 4 SHALL choose the nth letter of the current key and move to the
     next key (after the last, to "Use this word"); ArrowLeft and ArrowRight SHALL change the letter; ArrowUp and
     ArrowDown SHALL move between keys; Enter on a letter SHALL use the word; Escape SHALL cancel.
19.5 Switch: THE spell sheet's scan rows SHALL be Close (cancel), then "Use this word" and "Add to my words", then one
     row per key with its letters as cells, then "Capital first letter" (Req 16.2).
19.6 WHEN "Use this word" is chosen, THE word SHALL be fixed in that slot of this sentence; IF it is not in the
     person's words THEN its proof chip SHALL be `new` and THE app SHALL offer "Add to my words" (Req 21.2).
     "Add to my words" in spell mode SHALL use the word and add it.
19.7 Spell mode SHALL start from the letters on show (or of the likeliest completion), else the first letter on each
     key; "Capital first letter" SHALL start on for keys with no dictionary word and off otherwise.

## Requirement 20: Sentences with unknown keys
20.1 WHEN some slot has no dictionary word, THE app SHALL still rank the words of the other slots in context, AND SHALL
     list full sentences as soon as every slot has a dictionary, spelled or added word.
20.2 A slot with neither (a word not spelled yet) SHALL show its digits in the SpeakBar, a dotted proof chip with the
     words "not spelled yet", and Speak SHALL stay off. An open word that is still a prefix of dictionary words SHALL
     stay "typing" (Req 1.8).
20.3 WHILE a word is not spelled yet, THE sentence list SHALL say "Not in your words yet: <digits>. Spell this word to
     choose its letters, or press Back."
20.4 Every word that can be spoken SHALL still pass `validate()` against its code; a spelled word that the person
     changes by typing more keys SHALL be dropped.

## Requirement 21: My words
**User story:** As a person who types to talk, I want the names and words I use to stay, rank first and keep their
capital letters, so that I spell each one only once.

21.1 My words SHALL be stored only in IndexedDB on this device, only after the person adds a word ("Add to my words",
     "Add a word" or a pack import), AND SHALL be sent nowhere except inside the lattice of a model-ranking request
     while model ranking is on.
21.2 WHEN a word on show matches its keys but is not in the person's words (`new`), THE proof panel SHALL say "Not in
     your words yet. Add it?" with an "Add to my words" button; these buttons SHALL be scan row 5 (Req 8.1).
21.3 My words SHALL open from the Phrases sheet and the Menu, list each word with its keys and Remove (with a
     confirmation), each word one scan row, 20 at a time with "More words"; a helper SHALL be able to type a word.
21.4 Added words SHALL be raised with `Lexicon.addWords` (boost 2 zipf units unless a pack says otherwise) when added
     and on every load, so they rank.
21.5 THE app SHALL keep the person's spelling ("Mihai", "Ștefan") in a display map and use it in the SpeakBar, the
     sentence list, the proof, show mode, speech and saved phrases; the dictionary, the proof check and model
     requests SHALL keep using folded words, and a spelling that does not fold back to its word SHALL be ignored.
21.6 WHEN a word is removed, THE app SHALL rebuild the dictionary without it (the lexicon can only raise words).

## Requirement 22: Word packs
22.1 My words SHALL import a `VocabPack` JSON file (contracts.md §4) from a file picker or a pasted https link (a
     GitHub page link becomes its raw file), AND SHALL export the person's words and saved phrases as one.
22.2 THE app SHALL validate a pack before use: an id of 1-64 letters, digits, `.`, `-`, `_`; lang `en`; a whole
     version from 1; a words list of at most 5,000; a phrases list of at most 1,000; at most 1 MB. Each word SHALL be
     a-z with inner apostrophes after `normalize()` and at most 32 letters, each phrase at most 280 characters; IF the
     shape is wrong THEN the pack SHALL be refused with one plain sentence, and entries that cannot be typed SHALL be
     left out and listed.
22.3 THE app SHALL show what a pack adds (new words, updated words, words already there, phrases, entries left out)
     AND SHALL add nothing until the person chooses Add.
22.4 Imported words SHALL keep their spelling (capitals and diacritics).
22.5 Fetching a pack SHALL send no cookies, no referrer and nothing the person typed, and SHALL give up after 10 s.

## Requirement 23: Dictionary loading performance (plan F9)
**User story:** As a person on a cheap phone or a school Chromebook, I want the app to be ready quickly and every key
press to feel instant, so that talking is never held up by the device.

Measured with `scripts/perf-check.mjs`; numbers and method in `docs/testing/performance.md`.

23.1 WHEN the app loads the dictionary, THE app SHALL request the lexicon, the bigram model and the vocab pack at the
     same time, AND a missing or failed lexicon SHALL read as "missing" while a failed pack or bigram file SHALL NOT stop
     loading.
23.2 THE app SHALL fetch the compact lexicon `en.v2.json` (ADR-data-003) and every `/data` file at its content-hashed URL
     (`?v=`), which SHALL be the URL the service worker precaches, so that the first visit downloads each dictionary file
     once.
23.3 WHEN the dictionary is ready, THE app SHALL build the lexicon's completion index and warm decoding in idle time
     (`requestIdleCallback`, else a timeout), one short step per idle slice, so that no key press pays for it.
23.4 THE service worker precache SHALL hold what the app needs offline and SHALL NOT hold the 192 and 512 px PNG icons,
     the Apple touch icon, latin-ext font subsets, the data licence and notice, `en.v1.json`, the polyfills chunk or the
     pages-router chunks; an offline reload after one visit SHALL still reach "Offline dictionary ready" with no network.
23.5 ON the Moto G-class profile (4x CPU, Slow 4G), the first load SHALL stay under 700 KB compressed and no key press
     typing "kitchen" SHALL take over 50 ms; on desktop, lexicon parse SHALL take under 100 ms.

## Requirement 24: Phone-first screen (2026-11-09)
**User story:** As a person who talks with my phone in one hand, I want the keypad and Speak where my thumb is, the
sentence and its alternatives right above the keys, and nothing to scroll while I type, so that talking is fast and
I do not reach across the screen.

Evidence: `docs/research/mobile-patterns-mobbin.md` (real apps), `docs/research/mobile-aac-evidence.md` (visible
viewport heights measured in the iOS Simulator, thumb reach, motor-impaired touch, AAC apps).

24.1 ON a phone in portrait (and a narrow window), THE app SHALL show one screen, top to bottom: the header (brand,
     status, They said), the sentence card, the sentence suggestions, the keypad and an action bar [Menu] [Speak]
     [Show], AND the DOM (and focus) order SHALL match; everything else is in sheets (Req 25).
24.2 THE action bar SHALL be under the keypad and SHALL hold the screen's only Speak, the widest control in the bar; a
     disabled Speak SHALL keep a visible outline.
24.3 Clear SHALL be in the sentence card, away from Speak; WHEN Clear is pressed, THE card SHALL offer Undo until the
     next key press, AND Undo SHALL restore the sentence exactly.
24.4 THE suggestions SHALL show the other sentences for the keys (not the one in the card) as one-line rows that keep
     the end of the sentence in view and keep their rank numbers; "More" SHALL open every sentence in a sheet; WHEN a
     word is not in the person's words, a "Spell <keys>" row SHALL be offered.
24.5 THE Menu sheet SHALL also hold the sentence's Save phrase and Spell this word.
24.6 THE keypad SHALL fill the width (keys wider than tall) and the height left over, keys 72 to 96px tall (128 with XL);
     the screen SHALL fit, with no scrolling, at 495px (iPhone SE in Safari with the Bottom tab bar) and up, dropping
     first the second suggestion row (under 760px), then the second sentence line (under 680px), then the header and
     the key line (under 620px), then the suggestion rows (under 548px, Req 24.9).
24.7 THE keypad SHALL NOT move while typing; the sentence box SHALL keep its height and scroll in whole lines, kept on
     the newest word, AND the key line SHALL keep its place before the first key.
24.8 IN switch scanning the rows SHALL follow the screen: keypad rows, suggestions (then More or Spell), offers, the action
     bar (Menu, Speak, Show), then the card's Clear (or Undo).
24.9 WHILE the visible height is under 548px (2026-11-10, ADR-005), THE stack shell SHALL drop the suggestion rows so
     the main screen does not scroll with 72px keys; Sentences for the keys SHALL be one tap away in Menu > This
     sentence > Sentences, AND Spell this word SHALL stay in the same Menu group; switch scanning SHALL skip the
     missing row.

## Requirement 25: One screen on phones and tablets; phones portrait only (2026-11-09, ADR-003)
**User story:** As a person who talks with a phone or a tablet, I want everything I need on one screen that never
scrolls, so that nothing I need is ever out of reach.

25.1 ON a touch device THE main screen SHALL NOT scroll: header, sentence card, suggestions, keypad and action bar SHALL
     fit the visible height (from 495px, an iPhone SE in Safari with the bottom tab bar, and 1133 x 616, an iPad mini in
     landscape with two tabs; under 548px the suggestions move to Menu, Req 24.9);
     sheets MAY scroll.
25.2 Check the words (the proof panel), They said, Save phrase, Spell this word, Phrases, My words, Voice, Settings and
     About (with the intended-purpose sentence) SHALL be reachable from the main screen in one tap (Menu, the header's They
     said, or the contextual suggestion row) AND SHALL open in sheets.
25.3 THE header's They said control SHALL be a speech-bubble button at the end of the header, the same square as Clear,
     named "They said"; WHEN a line is set it SHALL widen to show the line on one row (cut with an ellipsis), its name
     holding the visible words. THE They said sheet SHALL open in its text field; Done SHALL save the line and close the
     sheet.
25.4 WHILE switch scanning is on, THE header SHALL show a Scanning pill; its speed and on/off SHALL be in Settings.
25.5 A tablet in landscape SHALL show the header, sentence card, suggestions and action bar on the left and the keypad
     on the right, level with the action bar; in portrait the stack of Req 24.
25.6 A phone (shorter screen side under 600px) held sideways SHALL show only "Turn your phone upright", SHALL keep the
     sentence, AND SHALL ask for a portrait lock where the browser allows it; a tablet SHALL work in both orientations.
     (Known exception to WCAG 1.3.4, ADR-003.)
25.7 THE layout SHALL follow the window (an iPad window can be 375px wide) and the phone test SHALL use the screen.

## Requirement 26: Voice to text for They said (2026-11-09, ADR-004)

**User story:** As the other person in the conversation, I want to say my line instead of typing it, so the app can use
it without either of us typing.

26.1 WHERE the browser has speech recognition and the page is secure (HTTPS or localhost), THE They said field SHALL
     show a Listen button; elsewhere it SHALL NOT.
26.2 THE first Listen SHALL say where the audio goes (the browser maker's speech service; Ninth Life never receives or
     keeps it) with "Allow and listen" and "Not now"; nothing SHALL be recorded before Allow.
26.3 Allow SHALL be remembered (the `dictation` setting, off by default, in Settings as "Listen in They said"); Listen
     SHALL hear one phrase and fill the field as words are heard; the line SHALL be saved only with Done.
26.4 WHEN the browser can recognise English on the device, THE recognition SHALL run on the device.
26.5 WHILE listening the button SHALL read Stop and a status line SHALL say "Listening"; Stop SHALL keep what was heard;
     typing, Cancel, Escape and closing SHALL turn the microphone off.
26.6 A blocked or missing microphone, nothing heard, no connection or no service SHALL be said in words in the status
     line, pointing to typing.
