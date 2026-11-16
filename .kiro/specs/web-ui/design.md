# Design: web-ui

Knowledge-base page with the route map, keyboard map and how to run: `docs/architecture/web.md`.

## Architecture

```
 app/app/page.tsx ── <CommunicationScreen/> (client)
                    │
   keys / keyboard / switch ──► composerReducer (lib/composer.ts)   slots[{code, pin?}], punct, selected
                    │                         │
                    │             decodeWithPins (lib/sentence.ts) ── @ninth/core decodeGhost / lattice+beam
                    │                         │            ▲
                    │             mergeCandidates ◄────────┘ model ranking (lib/decodeClient.ts, 1,500 ms, re-validated)
                    │                         │
                    │             buildSentence ── proof() ──► SpeakBar · CandidateList · ProofPanel
                    │
   useScanner (scanReducer) · useVoices/speak · useOnline · storage (idb) · settings
```

- The composer is a pure reducer that knows codes and pinned words, never the dictionary. `#` is resolved
  by the screen (`readings()` then `pin`), so the reducer stays testable without data (Req 1.2-1.6).
- `decodeWithPins` calls `decodeGhost` when nothing is pinned, otherwise builds a lattice where pinned slots
  hold one word and runs `beam`; every result passes `validate()` (Req 2.3, 2.5).
- `buildSentence` decides what is on show: a chosen sentence, else rank 1, else word by word. An open word with
  no exact match shows the first letters of its likeliest completion as `typing` and blocks Speak (Req 1.8).
- Model ranking is a side effect keyed by `codes + partner + recent + intent + pins`, debounced 400 ms (1,000 ms while the last word is open, Req 30.2), cached (LRU 20), aborted on change.
  Its context comes from `decodeContext()` in `lib/conversation.ts` (Req 27.11).
  It is skipped while words are pinned or a word is unfinished. Results are checked with `validate()`
  client-side; failures go to the proof panel only (Req 3.4, 12.2-12.5).

## Components → design system

| App component | Design-system component | Notes |
|---|---|---|
| `Keypad`, `Key` | Keypad, Key | `--nl-key` clamps 72px to 96/128px by viewport (Req 7.3) |
| `SpeakBar` | SpeakBar + Button (primary xl) | Speak turns quiet while the scan highlight is the ember thing (Req 10.2) |
| `CandidateButton`, `CandidateList` | Candidate | selected rank badge is ink, not ember (Req 10.2) |
| `ProofChip`, `ProofPanel` | ProofChip | adds a `typing` state (dotted border, no icon) |
| `Button` | Button | adds `compact` and `lit` |
| `AppHeader`, `StatusPill`, `PartnerTurn`, `ScanBar`, `Sheet`, `SettingsSheet`, `PhrasesSheet`, `ShowMode`, `Footer` | from the In-context-app and Interface-kit artboards | |
| `ThreadBubble`, `ThreadStrip`, `ThreadPanel`, `ConversationSheet` | Button, the phone suggestion row | no ember; "They"/"You" tag, filled for theirs, outlined for yours (Req 27) |
| `QuickReplies` | the phone suggestion row's chip; Phrases is a secondary Button | equal cells in rows of 3, no ember, no rank badge (Req 28) |

## Scanning grid (Req 8, 16)

`rows = [3, 3, 3, 3, sentencesShown (+1 for More/Fewer), 4 actions, header, thread]`, header = 1 (Menu) on compact screens
and 3 (Phrases, Voice, Settings) on wide ones. Phones: `[3, 3, 3, 3, suggestions, offers (0), action bar, card Clear,
thread]`. While the quick replies hold the suggestion area, `CAND_ROW` (4) holds them instead (laptops: the replies, then
the sentences, one row; Req 28.6). `THREAD_ROW` (8) has 0 cells under 640px, 1 for the header button, up to 4 for the strip and up to 6 for the
laptop panel (Req 27.10). Keypad rows come first so a key is at most 4 + 3 = 7 steps away
(Keypad README; M1 review F3). The access-modes spec now lists the same order. The reducer's empty-row skipping keeps
the grid stable while the sentence count changes. `useScanner` owns the timer (`scan1` only), the accept-delay
debounce and pausing while an overlay is open.

Sheets and show mode scan with their own `useScanner` (`lib/useOverlayScan.ts`): rows are the elements marked
`data-scan-row` inside the open `[data-overlay]` dialog (Close first, from `Sheet`), cells are their enabled buttons,
radios and checkboxes, re-read by a MutationObserver. The highlight is `data-scan-state="row" | "lit"`, set directly
on the DOM so a re-render of the sheet cannot wipe it. Choosing a cell calls `click()`. The scan mode is latched when
the overlay opens (Req 16.4), so a switch user who picks Keyboard can still pick One switch again before closing.

## Layout (Req 15, 24, 25; ADR-003)

`lib/layout.ts` picks one of five layouts with `useSyncExternalStore` on `matchMedia` and `screen`
(`chooseLayout`, pure and unit-tested):

| Layout | When | Shape |
|---|---|---|
| `stack` | touch device in portrait (phones and tablets), or a fine-pointer window under 600px wide | header, sentence card, suggestion rows, keypad, action bar [Menu] [Speak] [Show]; no page scroll |
| `split` | touch tablet in landscape, or a short landscape desktop window | left: header, card, suggestions, action bar; right: keypad, level with the action bar |
| `rotate` | touch device whose shorter screen side is under 600px, held sideways | only `RotateNotice` ("Turn your phone upright"); the sentence is kept |
| `wide` | fine pointer, >= 960px | the In-context-app artboard |
| `compact` | fine pointer, 600-959px | one column, keypad first |

`stack` and `split` are the one-screen shells (`isShell`): the app is `100svh` tall, everything that does not fit
(proof, They said, sentences, Save phrase, Spell, About) opens in a sheet, and the header holds the summary pill, the
Scanning pill and the They said bubble. Keys are sized from the measured keypad box: a ResizeObserver on `#keypad`
sets `--pad-w` / `--pad-h`, and `--nl-key` is clamped between `key-min` and `key-size` (container query units
resolved to 0 in Chrome here). Suggestion rows and sentence lines step with the screen height
(`STACK_ROWS_QUERIES`, `SPLIT_ROWS_QUERIES`); below 640px the header hides (620 until 2026-11-16: 620-639px overflowed by up to 7px); below 548px (`STACK_SHORT_QUERY`,
an iPhone SE in Safari with the Bottom tab bar) the stack drops its suggestion rows and Menu > This sentence gains
Sentences (Req 24.9, ADR-005; spec `iphone-se-bottom-bar-fit`). Phones are portrait only by decision
(ADR-003): the page also asks for `screen.orientation.lock('portrait')` where the browser allows it.

The static HTML is the wide DOM; CSS lays it out for narrow screens until hydration renders the chosen layout's DOM
order, so focus order matches the visual order. `test/e2e/responsive.mjs` checks 24 measured phone and tablet sizes.

## They said and Listen (Req 25.3, 26; ADR-004)

`PartnerTurn` is the field (inline on desktop, a sheet on phones and tablets). Listen wraps the browser's
`SpeechRecognition` in `lib/dictation.ts`: one phrase, interim text into the field, `processLocally` when Chrome has
the English pack, a one-time notice before the first use (the `dictation` setting), shown only on secure pages.

## Conversation thread (Req 27; ADR-007)

`lib/conversation.ts`: `Turn = {id, who: 'them' | 'me', text, at, via}`, a pure `conversationReducer` (`add`, `edit`,
`remove`, `clear`; trims, caps 280/500 characters and 50 turns, folds the same "you said" line within 60 s into one),
selectors (`lastTurn`, `lastThem`, `awaitingReply`, `recentMine`, `threadText`, `decodeContext`) and a module store
read with `useSyncExternalStore` (`useConversation`). Memory only: no storage module is imported. They said is
derived (the newest 'them' turn). `CommunicationScreen.sayAndRecord(text, via)` speaks and records anything the person
chose to say (Speak, phrases, quick replies, Say again); Show records `shown`; Test voice does neither.

Where it shows comes from `threadRows(layout, {tall, noHeader})`: 0 under 640px (Menu > Conversation), 1 in the
header (`ThreadBubble`, stack 640-1149px), 2 as a strip above the card (`ThreadStrip`, split and stack at
`STACK_THREAD_QUERY` 1150px, fixed 2 x 56 + 8px), 3 as a panel on laptops (`ThreadPanel`, in the old They said card's
place). `ConversationSheet` lists every turn newest first with Say again, Show, Copy, and Change and Remove on the
newest "they said" (on phones two even rows: the line's actions, then Change and Remove); Share or Copy all and
Clear conversation (with a confirm) close it. The header bubble shows their newest line (yours only before they have
said anything: your own line is already on the card). The strip keeps They said and All in place; one turn takes both
rows (up to 3 lines), none shows an outlined empty box. Say again has the quick replies' repeat guard. The ranking context counts
your lines only from before the current sentence, so Speak or Show does not re-rank the sentence on screen.

## Quick replies (Req 28)

`lib/replies.ts`: `QUICK_REPLIES` ("Hold on." "Yes." "No." "Pardon?" "Thanks."), `suggestionMode({typed, spoken,
enabled})` (replies when nothing is typed or the sentence was just spoken, and `quickReplies` is on), `replyRows(rows,
slot, line)` and the repeat guard `acceptReply`. `components/QuickReplies.tsx` draws them in three variants: `area`
(the shells' suggestion area, the same fixed `phone-sugg--N` height as the sentence rows, so the keypad never moves;
rows share that height from 56px up to a key's 96px, and the split shell's area fills its grid cell), `line` (laptops,
above the Sentences list) and `menu` (Menu and Phrases, one sheet scan row). By rows: 0 on a short phone (Menu > Quick
replies only), 1 row (Hold on, Yes, No), 2 or more (plus Pardon?, Thanks., Phrases). A press calls `sayReply`, which
skips a repeat inside the accept delay and calls `sayAndRecord(text, 'quick')`. No live region: the swap and a spoken
reply are not announced. Reply types (Req 29) slot in through `QuickReplies`' `slot` prop (`ReplySlot`: `cells`,
`render(litIndex)`, `choose(i)`): the area's last row from 2 rows, just above the keys, after the reply rows that fit
(`replyRows(rows, slot.cells)`; on 2 rows the second reply row stays in Menu); `CommunicationScreen` holds `replySlot`
and counts its cells in `CAND_ROW`, after the replies'.

## Reply types (Req 29; ADR-008)

State: `ComposerState.intent` with `intentFor` (the id of the 'them' turn it was pressed for) and `autoPunct` (the
"?" came from Ask). The reducer's `intent` action presses or releases one; Ask sets "?" only when no punctuation is
set, and leaving Ask removes only that automatic "?"; key 1 or Back hand it to the person. `spoken` drops the type;
`clear` returns `EMPTY` (Undo's `restore` brings it back); the first key after Speak starts a new sentence that keeps a
type chosen while the spoken one was on show (`fresh()`). The type in force is `replyIntentFor(state, intent,
intentFor)` in `lib/conversation.ts`: only for their newest line, so a new or removed They said line resets it
(a layout effect then clears it from the composer, taking the automatic "?" with it).

Ranking: `decodeWithPins(..., {intent})` decodes a pool of `INTENT_POOL` (12), reorders it with `rankByIntent` and
keeps the top 5, so the ghost list, the proof and the beams sent to the server all follow the type. `decodeContext`
adds `intent` only when one is in force; `buildRequest(..., intent)` sets `context.intent` only for the three words
(the key is left out otherwise); `DecodeCache.key(codes, partner, recent, intent)` appends `|intent:<type>` (no type
keeps the old key). Model sentences keep the model's order.

View: `components/ReplyTypes.tsx`, a `role="group"` "Reply type" of three toggles (`aria-pressed`) in three variants:
`row` (the shells' area slot: the track with a "Reply type" label at its start, which names the group), `line` (laptops: a title over the row, under the quick
replies, or alone above the Sentences list while typing; its cells come after the replies' in `CAND_ROW`) and `sheet`
(title, one sheet scan row, the help line), at the top of the Conversation sheet and the Sentences sheet on every
shell. A segmented control, so it never reads as a fourth reply: one `--surface-sunken` track, the three bare on it;
pressed is lifted to `--surface` with a 2px ink border, a 2px inset ink ring (4px, the Settings segmented style) and a
check mark (beside the word, or above it on a track under 440px), never ember. In the area the track is a key's
minimum (72px) tall on tablets, lighter than the reply rows. The reply type in force (`replyIntentFor`) needs their
line to be the newest turn, so any "you said" turn ends it; Speak stores the spoken words in `selected`, so the
sentence said stays on show, and a spoken sentence is decoded without the type (`rankIntent`). `SpeakBar`'s `tag`
puts the type at the start of the key line ("Ask · 36 968"); on the shells it also shows alone before the first key.
Copy comes from `lib/rankingProvider.ts`: `SENT_FOR_RANKING` (Settings, About, Welcome) and `REPLY_TYPES_HELP`.

## Ranking and input fixes (Req 30)

- `rankingLattice(state, lex, mode)` in `lib/sentence.ts` builds the lattice for `/api/decode`: the offline readings
  per slot, a pinned slot replaced by its one pinned word, null when nothing is typed or a slot has no word. The
  screen no longer skips ranking once a word is pinned. `DecodeCache.key(..., pins)` adds the pins (only when there
  are any, so old keys stay the same), so a new pin makes a new request and never reuses an unpinned answer.
- `rankDelayMs(state)`: 1,000 ms while the last word is open, 400 ms once it is closed. The effect re-runs on every
  composer change and clears its timer, so typing at a normal pace sends nothing until Space or a pause.
- `limitFor(state, action)` in `lib/composer.ts` mirrors the reducer's caps; `pressKey` checks it and announces
  `LIMIT_MESSAGE[limit]` instead of dispatching. The reducer keeps its own caps (pure, tested on its own).
- The accept-delay guard in `pressKeyPointer` sets `ignoredKey` (the key id; a new object each time so the 700 ms
  timer restarts). `Keypad` passes `ignored` to that `Key`, which gets `is-ignored` and `data-ignored`; the CSS draws
  a dashed `::after` ring in `currentColor`. A ref keeps the announcement to the first ignored press.

## Finish the word (Req 31)

- Core `rankCompletions(prefix, prev, lex, lm, {allow})` (`core/src/complete.ts`): the pool is
  `lex.completions(prefix, 300)` plus `lm.successors(prev)` (lexicon words only), kept when the code starts with the
  prefix, is longer and has at most 16 keys and `allow` passes; scored by `lm.logP(prev, w)`, stable sort, top 3.
  `bigramModel` implements `successors` (row keys, memoised) and `knows` (row keys and successors, built once).
- Screen: `completions` for the open, unpinned word; `prev` is the word on show before it (`BOS` first). `allow` =
  `lm.knows` or My words or the pack. `finishWord` dispatches the composer's `complete`, which sets the slot to
  `{ code: encodeWord(word), pin: word, typed }` and closes it; `back` on a slot with `typed < code.length` reopens it.
- Layout: shells (`stack`, `split`) put `WordRow` as the last row of `order-cands` (`.sugg-split`: the sentence rows
  get `sugRows - 1`, so the area keeps its height and the keypad does not move); on a 1-row phone the sentences go to
  Menu > Sentences. Laptops render it at the top of the sentences section. Phones with no suggestion row (`sugRows ===
  0`) get the `menu` variant as its own group in Menu. Three equal grid columns; an empty place is an `aria-hidden` span.
- Scanning: `WORD_ROW = 4` between the keypad and the sentences (`CAND_ROW` 5, `OFFER_ROW` 6, `ACTION_ROW` 7,
  `MENU_ROW` 8, `THREAD_ROW` 9); it has 0 cells when no word shows, so the scanner skips it.
- `DisplayWord.typed` carries the pressed count; `KeyCode` (SpeakBar) and `ProofChip` draw `.nl-filled` and the sr text.
- Eval: `B1c` (`packages/eval/src/completion.ts`) runs the shipped `rankCompletions` with an ideal user and reports
  KSR, presses, words taken, and scan steps on the harness grid and on the app's grid (`APP_GRID`).

## Fix a word and Did you mean (Req 32; ADR-009)

- Core `fix.ts`: `codeEdit(from, to)` names the one edit (the first place the codes differ), `neighbourCodes(code)`
  lists the codes one key away (changes, removals, additions; each once; at most 16 keys), `keyFixes(code, prev, lex,
  lm, {next})` takes the top 3 words of each and ranks them by `logP(prev, w) + logP(w, next)`.
- Composer: `Slot.was` (+ `wasOpen`) from `recode`; `edit`, `editFresh`, `editWas` for Retype; `openIndex(state)` is the
  word still being typed (the retyped one once a key is typed, else the open last word) and is used by `buildSentence`,
  `complete` and the word row. `rankingLattice` is null and `rankDelayMs` is the open-word pause while retyping.
- Screen: `FixSheet` (`components/FixSheet.tsx`) with `fixWords`, `fixReadings`, `fixFixes`; the SpeakBar sentence is a
  `button.nl-speakbar__fix` inside `#utterance`; laptop `ACTIONS` gains `fix` (cell 4, Spell 5); the phone card's scan
  row is `[sentence, Clear/Undo]` while there is a sentence. Did you mean feeds the word row (`rowKind`) for the first
  `unspelled` word when there are no completions; a pick goes through `takeFix` (dispatch `recode`, announce).
- Marks: `components/KeyCode.tsx` (`KeyCode`, `EditedCode`, `editWords`, hook-free so the server-rendered ProofChip on
  the website can use them): `.nl-keyfix` box, `.nl-keyfix-removed` strike (aria-hidden), and the words.

## Partner strip (Req 33; ADR-010)

- `lib/partner.ts`: `partnerView({typing, lastKeyAt, newest})` (pure), `partnerBand`, `BAND_SHIFT` (72 / 120 / 136),
  `PARTNER_COMPACT_NO_HEADER_QUERY`. `lastKeyAt` is a ref set in `pressKey`; `newest` is the conversation's last turn.
- `components/PartnerStrip.tsx`: a `<section aria-label="Partner strip">` with one `<p>`; the full band measures the
  text and steps 40 / 32 / 28 / 24px; `is-flipped` rotates the text; `data-flipped` and `data-view` for tests.
- Layout: the band is the first child of `.app__inner` (`.app--partner-compact` / `-full` on the root). Stack:
  `.shell-screen` min-height minus the shift; split: an extra grid row "partner partner". JS height queries go through
  `shiftQuery(query, shift)`; the CSS height rules have shifted twins at the end of `styles/app.css`.

## Punctuation where typed, and capitals (Req 34)

- Core: `formatSentence(words, end?, marks?)` puts each word's mark after it and capitalises after `SENTENCE_END`;
  without marks it is the old function. `CAPITALS` is the display table. `beam(..., starts?)` and
  `GhostOptions.starts` score a slot in `starts` after `BOS`.
- Composer: `Slot.punct`; `punct` marks the last word (or the retyped one) and closes it; `back` removes a mark first;
  `mark {index, punct?}` for Fix a word; `marksOf`, `startsOf`. `state.punct` stays the sentence-end mark of Ask.
- Every formatter call passes `marksOf(composer)` (card, sentence rows, Sentences list, the website's try engine);
  the display map starts from `CAPITALS` so My words and spellings win. Model ranking requests are unchanged.

## Your quick replies, cards and setup (Req 35)

- `lib/replies.ts`: `quickReplies(pinned)` (pinned in pin order, then the defaults, no repeats, 5), `sheetReplyRows`,
  `replyRows(rows, slot, line, list, columns)`; `MAX_PINNED`, `MAX_PIN_CHARS`; `replyColumns(list)` (2 when a reply is over 9 characters; phones and tablets only, `.quick-replies--pairs`); `fitsQuickReply(text, replyMeasurer())` (canvas width of each line at the reply font, 2 lines of 144px; the character rule where there is no canvas). `lib/storage.ts`: `Phrase.pinnedAt`,
  `setPhrasePinned` (refuses a sixth or a long one), `pinnedTexts`. The screen passes the list to the area, Menu and
  Phrases.
- `lib/cards.ts` (`SHOW_CARDS`, `PHONE_LINES`, `PHONE_CALLS_HELP`); `components/CardsSheet.tsx`; Show with nothing
  typed opens it (`showCurrent`), a card goes through `showCard` (Show mode + `recordMine(text, 'shown')`).
- `lib/vocabPack.ts` `packFromLines(words, phrases)`, then `parseVocabPack` / `planImport` as for a file; `MyWordsSheet`
  shows the preview with the title "From what you typed".
- `packages/eval/scripts/build_pack.py` `dedupe_phrases` folds contractions and "thanks"; `core-en.json` version 2 (189
  phrases), applied with the same function (`data/NOTICE.md`).

## Keyboard routing (Req 6)

A capture-phase `keydown` listener maps keys with `mapKey(event, access, focusContext(activeElement))`.
Focus contexts: `text` (fields: no shortcuts), `control` (buttons and links own Enter and Space), `pad` (body or a
keypad key: Enter speaks, Space is 0). In scan modes Space and Enter are the switch everywhere except text fields.
A matching `keyup` is swallowed so a focused button does not also activate.

## Speech (Req 4)

`speak()` cancels the queue and enqueues chunks synchronously (no `await` between the click and
`speechSynthesis.speak`). Voices come from `useVoices` (sorted on-device first). No speech engine, no voices after
the wait, or an utterance error opens `ShowMode`.

## Offline and data (Req 5)

`scripts/copy-data.mjs` copies `data/lexicon` and `data/packs` to `public/data` (missing files tolerated).
`lib/data.ts` fetches them at runtime (never bundled): lexicon → `Lexicon.fromJSON`, pack → `addWords`, bigram →
`bigramModel`, falling back to `unigramModel`. Serwist precaches the shell, `/app`, `/about`, `/` and every
public file (including `/data/**`, max 16 MB per file); uncached documents fall back to `/app` (ADR-006); decode
requests are `NetworkOnly`.

## Theme (Req 10)

`scripts/gen-tokens.mjs` writes `styles/tokens.css` (Night on `:root` and `[data-theme=night]`, Day on
`[data-theme=day]`, Day for `[data-theme=system]` under `prefers-color-scheme: light`; aliases resolved, shadows
included). An inline head script applies the stored theme before paint; settings in IndexedDB take over once loaded.

## Correctness properties

- P1 (Req 2.5, 12.4): every candidate listed passes `validate(words, codes)` (sentence + decodeClient tests).
- P2 (Req 12.3): any fetch outcome (timeout, non-200, bad JSON, throw) yields `null` and leaves ghost candidates.
- P3 (Req 12.5): no code path from a decode response calls `speak()` (screen test with a spy).
- P4 (Req 8.1): the scan grid reaches every key within 7 steps (core property + `useScanner` tests).
- P5 (Req 9.1, 9.2, 10.3): Playwright pass finds no control under 56px, no text under 16px, and a 4px/3px focus ring on every tab stop.
- P6 (Req 27.1-27.3): the thread never holds more than 50 turns, keeps their order, never holds empty or over-long text,
  and never repeats a "you said" line within 60 s (fast-check, `test/conversation.test.ts`).
- P7 (Req 27.11, contracts.md §3): with 3 recent lines of 280 characters and a 280-character partner line the request
  stays under 4 KB, and `recent` is empty unless "Include what you said" is on.
- P8 (Req 29.2, core P23-P27): with any reply type the listed ghost sentences are at most 5, all pass `validate()`, and
  all come from the same keys' pool; pinned words stay pinned (`test/reply-types.test.tsx`).
- P9 (Req 30.1): with pins, the ranking lattice holds exactly the pinned word in each pinned slot and the request is
  still sent (`test/ranking-fixes.test.tsx`, `test/plan-bugs.test.tsx`).
- P10 (Req 31.1, 31.7): every word `rankCompletions` returns is in the lexicon, encodes to a code that starts with the
  prefix and is longer, has at most 16 keys, passes `allow`; at most 3; deterministic (fast-check,
  `core/test/complete.test.ts`); no offensive word for any 1-3 key prefix (`eval/test/completion-safety.test.ts`).
- P11 (Req 31.2): after `complete` the pins validate against the codes; a word that does not extend the keys leaves the
  state unchanged (`test/completion.test.tsx`, `test/finish-word.test.tsx`).
- P12 (Req 32.4, 32.5): every `keyFixes` result is a lexicon word whose code is one edit from the keys, `codeEdit`
  names that edit, at most k, deterministic; `neighbourCodes` has no duplicates and never the code itself
  (`core/test/fix.test.ts`); `recode` keeps the pins valid and a retype leaves the other slots identical
  (`test/fix-word.test.tsx`).
- P13 (Req 34.5): `formatSentence` never adds, drops or reorders words (one token per word), capitalises after every
  sentence end, and equals the old output without marks; every `CAPITALS` entry folds back to its key
  (`core/test/marks.test.ts`).
