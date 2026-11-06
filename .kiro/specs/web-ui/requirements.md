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
8.1 THE scan grid SHALL be: rows 0-3 the keypad rows, row 4 the sentences (skipped when empty), row 5 Speak, Clear,
    Save phrase, so any key is reachable in at most 4 + 3 = 7 highlight steps.
8.2 THE active row SHALL get `is-scanning` (ember ring inside a plum ring) and then the active cell `is-lit`.
8.3 WHILE `access` is `scan1`, THE app SHALL tick every `scanMs` (400-5,000 ms, default 1,200), and Space or Enter SHALL select.
8.4 WHILE `access` is `scan2`, Space SHALL advance and Enter SHALL select, and THE app SHALL NOT tick.
8.5 IN scan modes, a press on the page outside any control SHALL act as the switch.
8.6 THE app SHALL show the scan speed with Slower and Faster buttons under the keypad, and the loops and accept delay in settings.
8.7 WHILE a sheet or show mode is open, scanning SHALL pause.

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
