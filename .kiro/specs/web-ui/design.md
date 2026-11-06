# Design: web-ui

Knowledge-base page with the route map, keyboard map and how to run: `docs/architecture/web.md`.

## Architecture

```
 app/page.tsx ── <CommunicationScreen/> (client)
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
- Model ranking is a side effect keyed by `codes + partner`, debounced 400 ms, cached (LRU 20), aborted on change.
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

## Scanning grid (Req 8, 16)

`rows = [3, 3, 3, 3, sentencesShown (+1 for More/Fewer), 4 actions, header]`, header = 1 (Menu) on compact screens
and 3 (Phrases, Voice, Settings) on wide ones. Keypad rows come first so a key is at most 4 + 3 = 7 steps away
(Keypad README; M1 review F3). The access-modes spec now lists the same order. The reducer's empty-row skipping keeps
the grid stable while the sentence count changes. `useScanner` owns the timer (`scan1` only), the accept-delay
debounce and pausing while an overlay is open.

Sheets and show mode scan with their own `useScanner` (`lib/useOverlayScan.ts`): rows are the elements marked
`data-scan-row` inside the open `[data-overlay]` dialog (Close first, from `Sheet`), cells are their enabled buttons,
radios and checkboxes, re-read by a MutationObserver. The highlight is `data-scan-state="row" | "lit"`, set directly
on the DOM so a re-render of the sheet cannot wipe it. Choosing a cell calls `click()`. The scan mode is latched when
the overlay opens (Req 16.4), so a switch user who picks Keyboard can still pick One switch again before closing.

## Layout (Req 15)

`lib/layout.ts` decides `wide` (>= 960px) or `compact` with `useSyncExternalStore` on `matchMedia`. The static HTML
is the wide DOM; CSS `order` lays it out as compact on phones until hydration renders the compact DOM order, so
focus order matches the visual order and nothing jumps. The header renders both variants and CSS shows one. On
compact screens `--nl-key` is also capped by `(100dvh - 480px) / 4` (never below 72px), so at 390 x 844 the
SpeakBar and keypad fit; it depends on the viewport only, so keys do not resize while typing.

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
`bigramModel`, falling back to `unigramModel`. Serwist precaches the shell, `/`, `/about` and every public file
(including `/data/**`, max 16 MB per file); decode requests are `NetworkOnly`.

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
