# Requirements: web-ui

## Introduction
The web app (`packages/web`, Next.js 15.1 App Router) is the communication screen people actually use:
they press keys 2-9, one press per letter, pick or accept a sentence, and press Speak. It must work
offline, with a keyboard, by touch, or with one or two switches, for people who may type for hours with
low vision, tremor or fatigue. Milestone M1 is ghost mode in the browser: the offline dictionary and
language model from `@ninth/core`, with optional model ranking from `@ninth/decoder`.
The communication screen is served at `/app`; `/` is the website (spec `marketing-site`, ADR-006).

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
5.1 THE service worker SHALL precache the app shell, the documents `/app`, `/about` and `/`, fonts, icons and `/data/**`
    so ghost mode works offline after one visit to any of them, AND an uncached document requested offline SHALL fall
    back to `/app` (ADR-006).
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
These rules cover the app (`/app`, `/about` and their sheets). The website at `/` follows marketing-site MS-8 (ADR-006).

11.1 THE scan highlight SHALL jump between rows and keys with at most a 120ms linear color change, and nothing SHALL
     slide, pulse, bounce or blink.
11.2 WHEN `prefers-reduced-motion: reduce` is set, THE app SHALL remove all transitions.
11.3 WHEN `prefers-reduced-motion` is `no-preference`, a navigation between pages MAY cross-fade for `motion-crossfade`
     (250 ms); nothing inside the app SHALL animate on arrival.

## Requirement 12: Model ranking
12.1 Model ranking SHALL be off by default AND its setting SHALL say that it sends the keys, the other person's last
     line and the reply type picked (Agree, Disagree or Ask, Req 29) to a cloud model (and, with "Include what you
     said" on, your last 3 sentences, Req 27.11). Settings, About and Welcome SHALL use one shared sentence for this.
12.2 WHEN model ranking is on and online, THE app SHALL send codes, lattice, ghost beams and the partner line,
     `context.recent` only as Req 27.11 allows, `context.intent` only as Req 29.8 allows, and nothing else.
12.3 IF the request fails, returns non-200 or takes more than 1,500 ms, THEN THE app SHALL stay in ghost mode without a message.
12.4 THE app SHALL re-run `validate()` on every returned sentence; sentences that fail SHALL NOT be listed.
12.5 THE app SHALL NOT speak model output on its own; only a Speak press speaks.
12.6 THE Next.js route `/api/decode` SHALL return 503 `llm_disabled` unless `LLM_ENABLED=true` and `ANTHROPIC_API_KEY` is set (default off). It is the production decode endpoint (ADR-001).

## Requirement 13: Storage and privacy
13.1 Phrases SHALL be stored in IndexedDB only when the person presses Save phrase, and SHALL be deletable with a confirmation.
13.2 "They said" SHALL be optional, typed, at most 280 characters, and never stored; the conversation it belongs to
     (Req 27) SHALL be kept in memory only.
13.3 THE app SHALL set no cookies, call no analytics and load no third-party fonts at runtime.

## Requirement 14: Copy and claims
14.1 Copy SHALL use plain verbs, sentence case, digits for numbers and no exclamation marks, and follow the Write / Not table.
14.2 THE app SHALL NOT name any third-party phone or keyboard brand (the list in `.kiro/steering/trademarks.md`;
     say "9-key predictive text"), and SHALL make no medical claim.
14.3 THE app footer, the About page and the website footer SHALL carry: "Ninth Life is a general-purpose text entry and text-to-speech tool. It is
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
23.4 THE service worker precache SHALL hold what the app needs offline, including the documents `/`, `/app` and `/about`,
     and SHALL NOT hold `/welcome`, the 192 and 512 px PNG icons,
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
     the key line (under 640px), then the suggestion rows (under 548px, Req 24.9).
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
     named "They said"; WHEN the conversation has a turn it SHALL widen to show the newest turn (Req 27.4), its name
     holding the visible words. THE They said sheet SHALL open in its text field; Done SHALL add the line to the
     conversation and close the sheet.
25.4 WHILE switch scanning is on, THE header SHALL show a Scanning pill; its speed and on/off SHALL be in Settings.
25.5 A tablet in landscape SHALL show the header, sentence card, suggestions and action bar on the left and the keypad
     on the right, level with the action bar; in portrait the stack of Req 24.
25.6 A phone (shorter screen side under 600px) held sideways SHALL show only "Turn your phone upright", SHALL keep the
     sentence, AND SHALL ask for a portrait lock where the browser allows it; a tablet SHALL work in both orientations.
     (Known exception to WCAG 1.3.4, ADR-003.) The website at `/` scrolls and works in both orientations (ADR-006,
     marketing-site MS-10.3).
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

## Requirement 27: Conversation thread (2026-11-11, ADR-007)

**User story:** As a person who types to talk, I want a short record of what they said and what I said, so that I can
say something again, show it, or keep track, without anything being saved.

27.1 THE app SHALL keep a conversation of turns (they said, you said) in memory only, at most 50, AND SHALL NOT write it
     to any storage; a reload, leaving the page or closing it SHALL clear it.
27.2 WHEN a sentence, a phrase or a repeated turn is spoken, or the current sentence is shown, THE app SHALL add a "you
     said" turn, unless the newest turn is the same "you said" line from the last 60 s; Test voice SHALL NOT add one.
27.3 WHEN Done is pressed in They said, THE app SHALL add a "they said" turn (marked heard when Listen filled any of it);
     Change SHALL edit only the newest one, and saving it empty SHALL remove it.
27.4 WHILE the stack shell is 640-1149px tall, THE header's They said button SHALL show their newest line on one row
     with the word "They" (or, while they have said nothing, your newest line with "You"), AND with no turns SHALL open
     the They said field.
27.5 WHILE the split shell is shown, or the stack shell is at least 1150px tall, THE app SHALL show the newest 2 turns in
     a strip of fixed height above the sentence card, with They said and All; laptop layouts SHALL show the newest 3
     in a panel with Listen, Type their line and All.
27.6 THE thread SHALL NOT change the keys' size or position, AND THE main screen SHALL NOT scroll at any size in
     `responsive.mjs`; under 640px the thread SHALL be in Menu > This sentence > Conversation.
27.7 THE Conversation sheet SHALL list every turn newest first with Say again (yours only), Show and Copy, AND SHALL offer
     Share only where the browser can share and Copy only where it can copy.
27.8 WHEN Say again is chosen, THE app SHALL speak that text and nothing else, inside the press.
27.9 WHEN Clear conversation is chosen, THE app SHALL ask to confirm, AND on confirm SHALL remove every turn.
27.10 IN scan modes the thread SHALL be the scan row after the card's Clear (phones) or the header (laptops), AND each
     turn in the sheet SHALL be its own scan row.
27.11 WHERE model ranking and "Include what you said" (off by default, shown only while model ranking is on) are both on,
     THE app SHALL send at most the last 3 "you said" turns from before the current sentence, each at most 280
     characters, as `context.recent`; otherwise `recent` SHALL be empty. THE decode cache key SHALL include them.

## Requirement 28: Quick replies (2026-11-11)

**User story:** As a person who types to talk, I want Yes, No, Hold on and a few other replies one press away when
nothing is typed, so that I can answer at once, or ask the other person to wait while I type.

28.1 WHILE nothing is typed, or the sentence on show has been spoken, AND `quickReplies` is on (default), THE suggestion
     area SHALL show the quick replies "Hold on.", "Yes.", "No." (row 1) and "Pardon?", "Thanks.", Phrases (row 2, where
     2 rows fit), in that order, in equal cells at least 56px tall, never cut; laptops SHALL show the 5 replies in one
     row (wide, where the header has Phrases) or 2 rows of 3 (compact) above the Sentences list.
28.2 WHEN a reply is chosen by touch, keyboard or switch, THE app SHALL speak exactly its visible text inside that
     handler, SHALL NOT change the sentence, AND SHALL ignore a repeat of the same reply within the accept delay.
28.3 THE app SHALL NOT speak or show any reply or typing status without that choice; with `quickReplies` off THE area
     SHALL keep its empty text.
28.4 WHILE the stack shell drops the suggestion rows (Req 24.9), the replies SHALL be in Menu > Quick replies; THE Menu
     (and Phrases on wide) SHALL start with that group on every layout, also while typing; a reply chosen there SHALL
     close the Menu.
28.5 WHILE the replies hold the area and there are sentences (after Speak), Menu > This sentence SHALL offer Sentences.
28.6 THE replies SHALL be the cells of scan row 4 (on laptops before the sentences in that row); the swap between
     replies and sentences SHALL NOT move the keypad AND SHALL NOT be announced; WHILE the replies hold the shells'
     area, Alt+1-5 and the arrows SHALL do nothing.
28.7 WHEN a reply is spoken, THE app SHALL record it as a "you said" turn (Req 27.2).
28.8 WHERE the area has 2 or more rows, its last row (by the keys) SHALL be able to hold the reply-type group (Req 29)
     while the newest turn is theirs; the replies SHALL keep the rows above it, AND the second reply row SHALL stay in
     Menu where it does not fit (2 rows).

## Requirement 29: Reply types (2026-11-11, ADR-008)

**User story:** As a person answering someone, I want to say whether I agree, disagree or ask before I type, so that
the fitting sentence comes first, while the words still come only from my keys.

29.1 WHILE the latest turn is the other person's, THE app SHALL offer Agree, Disagree and Ask as a `role="group"` (name
     "Reply type") of buttons with `aria-pressed`, at most one pressed. Pressing the pressed one SHALL release it.
     None pressed means no steering.
29.2 THE reply type SHALL only reorder sentences that match the keys: offline the app SHALL decode a pool of
     `INTENT_POOL` (12), reorder it with `rankByIntent` and show the top 5. It SHALL NOT add, remove or change words,
     AND every listed sentence SHALL pass `validate()`. Model sentences keep the model's order.
29.3 WHEN Ask is chosen and no punctuation is set, THE sentence SHALL end with "?" (punctuation, outside the words);
     leaving Ask SHALL remove a "?" that Ask added. Key 1 and Back SHALL change or remove it as usual, and after that it
     is the person's. Chosen while the spoken sentence is still on show, the type (and Ask's "?") SHALL start the next.
29.4 THE reply type SHALL belong to their newest line while it is the newest turn, AND SHALL be cleared by Speak, by
     Clear (Undo brings it back), by a new or removed They said line and by any "you said" turn (Show, a reply, a
     phrase, Say again), so it never steers while the group is not on screen. THE sentence on show when Speak is
     pressed SHALL stay on show unchanged until the next key, AND a spoken sentence SHALL NOT be re-ranked.
29.5 THE group SHALL use only existing fixed-height areas: the last row of the shells' suggestion area, just above the
     keys, where it has 2 or more rows (while nothing is typed); the Conversation sheet (top) and the Sentences sheet on every shell (the only place
     on 1-row and short phones, and while typing); on laptops, under the quick replies, and above the Sentences list
     while typing, until Speak. THE keypad SHALL NOT move. Buttons SHALL be at least 56px with 16px text or larger. THE group
     SHALL look like a setting, not like something to say: a labelled segmented control ("Reply type") on a sunken
     track, unlike the reply chips. The pressed state SHALL show as a fill, a 4px inner ring and a check mark in both
     themes (at least 3:1 against the track), never ember.
29.6 WHILE a type is pressed, THE key line SHALL start with it as a word ("Ask · 9428 47") where the line is shown.
29.7 Scanning: THE group's buttons SHALL be cells of the suggestion scan row, after the quick replies (laptops: before
     the sentences); in a sheet the group SHALL be one scan row.
29.8 WHEN model ranking is on, THE request SHALL include `context.intent` only when a reply type is pressed (the key is
     left out otherwise), with the ghost beams already in its order, AND the decode cache key SHALL include it.
29.9 THE copy SHALL say what reply types do and SHALL NOT say that the model understands or decides, nor claim any
     effect: "Agree, Disagree and Ask change the order of the sentences for your keys. They never change the words. Ask
     also adds a question mark." Req 12.1 and 12.2 name the reply type in what is sent.

## Requirement 30: Ranking and input fixes (2026-11-16, improvement plan Part 1 "Bugs")

**User story:** As a person typing a sentence, I want model ranking to keep helping after I fix a word, without
spending the quota on half-typed words, and I want to know when a key press was not taken, so that nothing I press
is lost without a word.

30.1 WHEN model ranking is on AND any word is pinned (by # or by a chosen sentence), THE app SHALL still request
     ranking, sending each pinned slot as a one-word lattice slot (the pinned word), AND the decode cache key SHALL
     include the pins. THE app SHALL show only model sentences that agree with every pin, and every one SHALL pass
     `validate()` as before (Req 12.4).
30.2 WHILE the last word is open (keys still coming), THE app SHALL NOT send a ranking request until no key has been
     pressed for `RANK_PAUSE_OPEN_MS` (1,000 ms). WHEN the last word is closed (Space, or a word pinned or chosen),
     THE app SHALL send it after the normal `RANK_DEBOUNCE_MS` (400 ms). Any key SHALL restart the wait.
30.3 WHEN a letter key would add a 17th key to a word, or a 21st word to a sentence, THE app SHALL NOT add it (the
     caps stay 16 and 20) AND SHALL announce in the polite live region "Words can be at most 16 letters." or "A
     sentence can have at most 20 words.".
30.4 WHEN a repeat press of the same key inside the accept delay is ignored (Req 7.2), THE key SHALL show it for
     `IGNORED_MARK_MS` (700 ms) with a dashed ring just inside the key edge (clear of the corner digit), in the key's own text colour (a shape change, no motion, not
     ember), AND only the first ignored press of a visit SHALL be announced, politely: "Pressed again too quickly, so
     the second press was not counted. Accept delay in Settings changes this." Later ignored presses SHALL show on
     the key only.

## Requirement 31: Finish the word (2026-11-16, improvement plan T1)

**User story:** As a person who types to talk, I want the words that start with my keys offered as I type, so that one
press finishes a long word, while every word still matches the keys on screen.

31.1 WHILE the last word is open, has no fixed word (# or Spell), the sentence on show is not the spoken one, the mode is
     letter and `wordCompletion` is on (default), THE app SHALL offer up to 3 words whose code starts with the keys typed
     and is longer (at most 16 keys), ranked offline by the word-pair model given the word before (`rankCompletions`),
     in 3 fixed places: word 1 left, word 3 right; fewer words leave the later places empty, never shifted.
31.2 WHEN a word is chosen (touch, keyboard or switch), THE app SHALL set that word's keys to the word's code, fix the
     word and close it (the next letter key starts a new word), AND SHALL NOT speak.
31.3 THE key line and the proof chip SHALL show every key of a finished word, marking the keys not pressed with a
     dotted underline and, for screen readers, ", N filled in". THE proof panel SHALL then add "A dotted line marks keys
     that came with a word you picked. Every word still matches all of its keys."
31.4 WHEN Back is pressed on a finished word (no punctuation set), THE app SHALL reopen it at the keys that were pressed,
     and the words SHALL show again.
31.5 THE words SHALL take the last row of the suggestion area on phones and tablets (the only row on a 1-row phone,
     with Sentences in Menu while they hold it), a row under the SpeakBar above the reply types and the sentences on
     laptops, and a "Finish the word" group in Menu on phones under 548px tall (no suggestion area there, ADR-005).
     THE keypad SHALL NOT move. Each word SHALL be a button at least 56px tall with text 16px or larger (20px; 16px on
     2 lines for a long word), never cut.
31.6 IN scan modes THE words SHALL be scan row 4, after the keypad rows, skipped while there are none (the rows after it
     move down one). Alt+Shift+1 to 3 and numpad + (word 1) SHALL choose them while they are on screen; plain digits
     always type. THE words SHALL be a section named "Finish the word", outside any live region; the sentence live region
     SHALL add "Words: w1, w2, w3." after typing pauses. Nothing SHALL be announced per key.
31.7 THE app SHALL offer only lexicon words that are in the word-pair data, My words or the word pack, AND nothing about
     the words SHALL be sent for model ranking (a finished word is a pin, sent as one word, Req 30.1).
31.8 THE public claim SHALL read "Every spoken word matches the keys on screen, and nothing gets there without your
     press." (short form "Every spoken word matches the keys on screen"), on the website, the About page, the metadata,
     `product.md` and the app's proof panel (decision 1 of the improvement plan, D-claim).

## Requirement 32: Fix any word, and Did you mean (2026-11-16, ADR-009)

**User story:** As a person who types to talk, I want to change any word of my sentence, and to be offered the word I
meant when a slip leaves keys that spell nothing, so that one slip does not cost me the whole sentence.

32.1 WHILE a sentence is typed and not yet spoken, pressing the sentence (a button named "{sentence}. Fix a word"), Fix a
     word in Menu > This sentence, or Fix a word in the laptop action row SHALL open the Fix a word sheet with one button
     per word (at least 56px; skipped for a 1-word sentence). On phones the sentence is the first cell of the card's
     scan row, before Clear. THE sentence SHALL be a button only where it is at least 56px tall: on stack screens whose
     card has one 48px line (under 680px tall, moved up by a partner band) it SHALL stay plain text, and Menu > This
     sentence > Fix a word is the way in.
32.2 FOR the word picked, THE sheet SHALL offer its other readings (keys unchanged), up to 3 words one key away ranked by
     fit with the words before and after (`keyFixes`), Retype this word and Spell this word; a pick SHALL change only that
     word, SHALL close the sheet, SHALL be announced politely AND SHALL NOT speak.
32.3 WHEN Retype is chosen, THE key line SHALL start with "Retype ·" and the next letter keys SHALL replace that word's keys
     (# cycles it, Finish the word offers words for it) until 0; Back or 0 with no key typed, or Back deleting its last
     key, SHALL keep the old word ("{word} kept."). No ranking request SHALL be sent while a word is retyped.
32.4 WHEN a word's keys spell nothing and there is no word to finish, THE word row (Req 31.5's places; Menu under 548px)
     SHALL offer up to 3 words one key away (a key changed, added or removed), titled "Did you mean", with Spell beside
     them on a 1-row phone; THE app SHALL NOT apply any offer without a press.
32.5 WHEN a word one key away is taken, THE app SHALL set that word's keys to the word's code, AND THE key line and the
     proof chip SHALL mark the change: a changed or added key in a 2px box, a removed key struck through in its place,
     and ", key N changed from A to B" / ", key B added" / ", extra A removed" for screen readers.
32.6 WHEN Back is pressed right after a word one key away was taken on the last word, THE app SHALL restore the old keys
     (an open word reopens).
32.7 THE sheet's buttons SHALL be scan rows of at most 4 (rows, then cells, Req 16.2); THE keypad SHALL NOT move.

## Requirement 33: Partner strip (2026-11-16, ADR-010)

**User story:** As a person who types to talk, I want the other person to see that I am typing and then read what I said,
so that they wait instead of talking on, without seeing my words before I speak.

33.1 THE `partnerStrip` setting SHALL be Off by default, with "Turned to face the person opposite" and "Upright, for
     someone beside you", AND THE app SHALL show no typing status while it is Off (Req 28.3).
33.2 WHILE it is on, THE app SHALL show a band at the top of the screen with nothing (nothing said yet, or their line is the
     newest), "Typing…" while a sentence is in progress, or the newest text the person said or showed, the newest event
     first (`partnerView`).
33.3 THE band SHALL NOT show the sentence, its letters, its keys or any candidate before it is spoken or shown.
33.4 THE band SHALL have no controls, SHALL NOT be a live region, SHALL NOT animate AND SHALL NOT time out.
33.5 THE band SHALL be full (112px; 128px on split and laptops) on stack screens at least 740px tall, split screens at
     least 752px tall and laptops, compact (64px, one line, cut with "…") on stack screens 640-739px and split screens
     688-751px, and absent below (Settings then says the screen is too short). With a band, THE shells SHALL follow
     today's height rules at the visible height minus the band and its gap (with the compact band the stack hides its
     header up to 711px), SHALL fit without scrolling with keys of at least 72px, AND the keys SHALL NOT move while typing.
33.6 THE full band's text SHALL be at most 40px and at least 24px, fitting the band ("Typing…" 32px); "Turned" SHALL rotate
     it 180°.

## Requirement 34: Punctuation where typed, and capitals (2026-11-16)

**User story:** As a person who types to talk, I want commas and full stops where I type them and capitals on days and
names, so that what I say reads and sounds the way I mean it.

34.1 WHEN 1 is pressed with at least one word, THE app SHALL close the open word (or end a retype) AND SHALL cycle the mark
     after that word through ".", "?", "!", ",", none; the mark SHALL stay after that word when more words are typed.
     With nothing typed, 1 SHALL do nothing. (Changes Req 1.6.)
34.2 WHEN Back is pressed with no open word, THE app SHALL remove the last word's mark before the word. (Changes 1.4.)
34.3 THE app SHALL capitalise the first word and every word after ".", "?" or "!", AND the offline ranking (and Finish the
     word) SHALL start a new sentence there (the previous word is the sentence start).
34.4 THE app SHALL show the words of a fixed table (days, the months that are not ordinary words, holidays, titles, a few
     short forms, languages and places; core `CAPITALS`) with their capitals, after the person's own spellings.
34.5 Marks and capitals SHALL NOT change the words, their keys or the proof check, AND SHALL NOT be sent for model ranking.
34.6 Ask's "?" SHALL end the sentence only while the last word has no mark of its own; 1 on the last word hands it to the
     person (cycles on from "?"). (Amends 29.3.)
34.7 THE Fix a word sheet SHALL offer "Mark after it" (None, Full stop, Question mark, Exclamation mark, Comma) for the
     word picked.
34.8 Each press of 1 SHALL be announced in the polite region as the mark in words ("Full stop after now.", "No mark."),
     and Back removing a mark as "Mark removed.".

## Requirement 35: Your quick replies, cards and setup (2026-11-16)

**User story:** As a person who types to talk, I want my own replies one press away, a card that asks people to wait,
opening lines for a call, and a quick way for a helper to add names and phrases, so that I am ready before the
conversation starts.

35.1 Your phrases SHALL offer "Pin to quick replies" (a toggle with `aria-pressed`) for a phrase of at most 20
     characters whose words wrap into at most 2 lines of the narrowest phone cell (144px of text at 20px, measured in the
     browser), at most 5 pinned ("5 phrases are pinned. Unpin one first."; a phrase that does not fit says "Too long for
     a quick reply: it must fit 2 lines on a phone (about 20 letters). Use Phrases or Show a card for longer ones.").
     THE quick replies SHALL be the pinned phrases in pin order, then "Hold on.", "Yes.", "No.", "Pardon?", "Thanks."
     without repeats, 5 in all, in every list (Menu, Phrases, laptops). On phones and tablets, WHEN any reply is longer
     than 9 characters, THE area SHALL lay them out 2 to a row (2 lines of 20px in a 56px cell, never cut, never
     smaller), the last reply row ending with Phrases; replies that do not fit the area's rows stay in Menu and Phrases.
     (Amends 28.1.)
35.2 WHEN Show is pressed with nothing typed, THE app SHALL open "Show a card" with 4 fixed cards and the saved phrases
     (also in Menu > Quick replies); a card SHALL open Show mode with that text, SHALL add a "you said" turn (shown) AND
     SHALL NOT speak.
35.3 Phrases SHALL have a "Phone calls" group of 4 opening lines that speak on press, with the note that Ninth Life cannot
     speak into a phone call.
35.4 My words SHALL accept names and words, and phrases, one per line, typed or pasted ("Add names and phrases"), AND
     SHALL show the pack import preview (Req 22.3), titled "From what you typed", before adding anything.
35.5 THE built-in phrases SHALL NOT hold two phrases that differ only by a contraction or "thanks" / "thank you".

## Requirement 36: Surfaces that fit what they hold, and close the way people expect (2026-11-16, ADR-011)

**User story:** As a person who types to talk on a phone or a laptop, I want short choices to open as a short sheet or a
popup next to what I pressed, long lists as a panel, and every one of them to close with Back, a tap outside or Close,
so that I never lose my sentence or my place.

36.1 Every surface SHALL be one of four kinds: **fit** (short surfaces: Menu, Fix a word, Check the words, They said,
     Show a card, Sentences for your keys), **panel** (lists: Phrases, My words, Spell this word, Conversation),
     **dialog** (Settings) and **show** (Show mode). Each SHALL be a modal `<dialog>` with a title, Close as its first
     scan row, Escape to close, 56px targets, 16px text, Night and Day tokens and no motion.
36.2 ON a phone (under 600px wide) a fit surface SHALL be a bottom sheet as tall as its content, at most 85% of the
     screen, with the screen visible above it and a decorative grabber, and SHALL take the whole screen under 548px tall
     (ADR-005); a panel and the dialog SHALL take the whole screen, and a panel SHALL have a 56px Done at the bottom that
     is not a scan row. ON larger screens a fit surface SHALL be a popover 440px wide next to the button that opened it
     (below it, or above it when there is more room there), inside the screen and never over its button; a panel SHALL
     be a 440px side panel on the side of that button; the dialog SHALL be centred, at most 880px wide and 85% tall.
36.3 WHEN a surface opens from the main screen, THE app SHALL add one history entry (never on first load, never more
     than one), so the browser's or the phone's Back closes the surface and keeps the app and the sentence; closing it
     any other way SHALL take that entry off.
36.4 A press that starts and ends on the backdrop SHALL close a surface, EXCEPT while switch scanning is on (the press
     is the switch), while a text field in it holds text, while a question (a confirm) is showing in it, and within
     300ms of it opening.
36.5 Focus SHALL move into the surface on opening (its first useful control, or the one named by the caller) and SHALL
     return to the control on the main screen that opened it, also when the surface replaced another.
36.6 A surface opened from the Menu SHALL replace the Menu and SHALL have "Back to Menu" as its second scan row, after
     Close; Back to Menu SHALL bring the Menu back; Close SHALL go to the main screen.
36.7 Links from the app to the website (About Ninth Life, How Ninth Life works) SHALL open in a new tab, and their
     accessible names SHALL end with "(opens in a new tab)".
36.8 They said in its sheet SHALL have Done (and Listen), and no Cancel: Close cancels.
36.9 Fix a word SHALL focus its first word on opening and, after a word is picked, the first choice for it (while
     scanning, the sheet itself).

## Requirement 37: Menu, Voice, More and Status (2026-11-16, ADR-011)

**User story:** As a person who types to talk, I want the things I use most at the top of the Menu, the voice on its
own, and everything on a laptop at most two clicks away, so that I find what I need without scrolling or guessing.

37.1 THE Menu (phones, tablets and narrow laptop windows) SHALL be a fit surface (on phones from 548px tall it may grow
     to the screen less 16px and the safe area, so with nothing typed it does not scroll from 375x667 up) holding, top to bottom: the quick
     replies (Req 28.4); 4 tiles (icon above the word, at least 72px tall) for Phrases, Show a card, Conversation and
     They said, one scan row; on phones with a sentence, This sentence: Sentences (short phones, Req 24.9), then Fix a
     word and Spell this word, then Save phrase and Check the words, each pair a scan row (unavailable ones disabled);
     64px rows with a chevron for My words, Voice and Settings, one scan row; Status (with the short status) and About
     Ninth Life (a new tab), one scan row. The intended-purpose sentence and How Ninth Life works SHALL be in
     Settings > About.
37.2 Opening the Menu SHALL focus Phrases; Back to Menu SHALL focus the item the surface was opened from.
37.3 A link SHALL be a scan cell like a button (Req 16.2).
37.4 Voice SHALL be its own fit surface with the voice picker (and Previous and Next voice), Speed, Pitch and Test voice,
     the same controls as Settings > Voice, opening with focus on the picker: Menu > Voice on phones and tablets, the
     header's Voice on laptops.
37.5 THE wide header SHALL hold the status button, Phrases, Voice, Settings and More (labelled), in that scan order. More
     SHALL be a fit surface with My words, Show a card, Conversation, Check the words (one scan row), Status and About
     Ninth Life (one scan row); a surface it opens SHALL have Back to More. Every phone Menu item SHALL be at most 2
     visible clicks away on a laptop.
37.6 THE header's status SHALL be a button (name "Status: " and the full status) that opens Status: each state as its
     pill with one sentence on what it means. Its changes SHALL still be announced politely. Below 1366px the wide header
     SHALL show the summary pill, so the header stays one row down to 960px.

## Requirement 38: Settings in groups (2026-11-16, ADR-011)

**User story:** As a person who types to talk, or a helper setting the app up, I want Settings in a short list of
groups that each show their current value, so that I find a setting without scrolling through all of them, by touch,
keyboard or switch.

38.1 Settings SHALL be grouped as Voice, Look, Ways to type, Typing, Quick replies, Partner strip, Model ranking, Voice
     to text (only where the browser can do it) and About, each row showing its current value (the voice's name, the
     theme and key size, the way to type, Finish words on or off, On or Off, the strip's way); the rows SHALL be one scan
     row.
38.2 ON a phone Settings SHALL open on the list (64px rows with a chevron); a row SHALL open its group in the same sheet
     with "All settings" as the second scan row (in place of Back to Menu), focus on the group's first control, and
     All settings SHALL return to the list with focus on that group's row.
38.3 ON larger screens Settings SHALL be the centred dialog with the groups on the left (the chosen one marked by an
     ink edge, a bar and a sunken fill, and `aria-current`) and its settings on the right, each pane scrolling on its
     own; it SHALL open on the group last used in this visit (memory only), or Voice.
38.4 A caller SHALL be able to open Settings on a group (`section`; `focusVoice` opens Voice with focus on the picker).
38.5 WHILE "Turn off switch scanning?" is asked (Req 16.7), it SHALL replace the group's settings and the list, so its
     row comes straight after Close.

## Requirement 39: They said over the keyboard, Phrases rows, one confirm, feedback in place, names (2026-11-16, ADR-011)

**User story:** As a person who types to talk, I want the field and Done above the phone's keyboard, more phrases on a
screen, every "are you sure?" to look and work the same, and a sign, where I pressed, that what I saved was saved, so
that I trust what the app did.

39.1 THE They said sheet SHALL show the field first (its label for screen readers only, the title says it), then Done and
     Listen in one row, then the lead text; Enter SHALL submit. WHILE the on-screen keyboard is up (the visual viewport
     is shorter than the window), a bottom sheet SHALL sit on top of it, no taller than the room above it, with Back
     to Menu, the lead text and the grabber set aside, so the field, Done and Listen always show.
39.2 Each saved phrase SHALL be one full-width row that speaks on a press (name "Speak "{phrase}"", "Pinned" shown when
     pinned) plus one 56px More button (name "More for {phrase}", `aria-expanded`), one scan row; More SHALL open, under
     the row, Pin to quick replies (or Unpin), Show (big text) and Delete, one scan row; one phrase open at a time.
39.3 Every confirm SHALL be the one Confirm: the question in bold (a line under it when needed), the safe choice (Keep or
     Cancel) first and focused (the question itself while scanning), the action second; side by side in a surface 600px or wider,
     stacked in a narrower one; a red frame only for actions that cannot be undone (Clear conversation, Delete phrase, Remove word;
     not Turn off scanning); it SHALL carry `data-confirm` so the backdrop never closes its surface (Req 36.4). The pack
     preview SHALL put Cancel first and carry `data-confirm` too.
39.4 Feedback SHALL appear where the press happened, never as an overlay (the one-screen phone has no free room, and an
     overlay covered the word row and sentences on every size tried). Menu > Save phrase SHALL keep the Menu open and
     turn Save phrase into "Saved to Phrases" with Undo (56px, its own scan row, focused; Undo deletes the phrase and
     brings Save phrase back, focused), or "Already in Phrases" when it was saved before. The laptop's Save phrase SHALL
     turn into "Undo save" (name "Saved to Phrases. Undo save"; both labels hold the same cell, so its size never
     changes) until the next key press. Both SHALL say "Saved to Phrases." (or "Already in Phrases.") politely. Pin and
     Unpin answer in their row (Pinned, `aria-pressed`, announced); Add to my words in the proof chip and announcement.
39.5 Names: the proof panel SHALL be called "Check the words" everywhere (the laptop panel's heading; in its sheet the
     title says it, with no heading of its own); the Sentences sheet SHALL be titled "Sentences" (one line on a 375px phone) and not repeat it;
     phone titles SHALL be the 22px heading under 400px wide; Phrases SHALL not start with a My words button (My words
     is in Menu and More); the laptop conversation panel's button SHALL read "Whole conversation".

## Requirement 40: One screen on laptops, content by context (2026-11-16, ADR-012)

**User story:** As a person who types to talk on a laptop, I want everything I need on one screen and only what the
moment needs, so that I know where to look and never scroll to reach a sentence or a button.

40.1 WHILE a laptop window (fine pointer) is 960px wide or wider (wide), THE main screen SHALL not scroll at any height
     from 640px; a narrower laptop window SHALL get the stack shell (Req 24) instead of the old one-column page
     (supersedes Req 15.1-15.4 and 15.6 for laptops).
40.2 WHILE wide, THE header SHALL show one status pill (Status lists every line) and Phrases, Voice, Settings and More;
     THE conversation SHALL be one row: the newest turn (its full text as its title and name) or "Nothing said yet.",
     then Listen, Type their line and, once there is a turn, Whole conversation.
40.3 WHILE wide, THE SpeakBar SHALL hold the sentence and its keys, then Clear (an icon named "Clear", or Undo after a
     clear), Show and Speak, which wrap together under a long sentence.
40.4 WHILE wide AND there is a sentence, Fix a word, Spell this word, Save phrase and Check the words SHALL show under
     the SpeakBar as one row of equal cells (short visible labels in a narrow column, full names always); WHILE there is
     no sentence, THEY SHALL not show, and neither SHALL a Sentences heading or an empty box. In switch scanning they
     SHALL be the SpeakBar row's cells after Speak, Show and Clear.
40.5 WHILE wide, THE sentences SHALL take the height left in whole 56px rows 8px apart; WHEN more sentences exist than
     fit, THE last row SHALL be More sentences, which opens the Sentences popover; WHEN a sentence past the rows shown is
     chosen, IT SHALL be shown (the list scrolls inside, the page never does).
40.6 WHILE wide, Check the words SHALL be a popover from the sentence's actions (and More); THE main screen SHALL show
     only its notes that need the person now ("Add to my words" offers, one scan row; words the model suggested that
     were dropped), in a region named "Notes on these words", and nothing when there are none (supersedes the laptop
     part of Req 39.5).
40.7 WHILE wide, THE keyboard paragraph SHALL be a Keyboard shortcuts button under the keypad (keyboard access only) and
     a More row, opening a popover that lists every shortcut.
40.8 WHILE wide, THE app footer SHALL not show; More SHALL end with About Ninth Life and How Ninth Life works (new
     tabs) and the intended-purpose sentence, which Settings > About also keeps.
40.9 WHILE wide, keys SHALL shrink with the window's height (never under 72px) so the keypad and the switch-scanning
     controls under it fit; with switch scanning on, its speed, Slower and Faster and its status SHALL fit too.
