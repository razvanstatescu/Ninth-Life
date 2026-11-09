# Web app (`packages/web`)

The communication screen: press keys 2-9, one press per letter, and Ninth Life speaks the sentence you meant.
Next.js 15.1 App Router, React 19, plain CSS from the design-system tokens, Serwist for offline.
Spec: `.kiro/specs/web-ui/` (requirements, design, tasks). Contracts: `docs/architecture/contracts.md`.

## Route map

| Route | File | What it is |
|---|---|---|
| `/` | `app/page.tsx` → `components/CommunicationScreen.tsx` | The communication screen (static shell, client component) |
| `/about` | `app/about/page.tsx` | What it does, proof, privacy, the not-a-medical-device statement |
| `POST /api/decode` | `app/api/decode/route.ts` | Production decode endpoint: `@ninth/decoder` `createFetchHandler` (Anthropic API); 503 `llm_disabled` unless `LLM_ENABLED=true` and `ANTHROPIC_API_KEY` is set |
| `/sw.js` | built from `app/sw.ts` | Serwist service worker |
| `/data/**` | `public/data` (copied) | Compact lexicon `en.v2.json`, bigram model and vocab pack, fetched at runtime at `?v=<content hash>` (`en.v1.json` is copied for the landing page's build only) |
| `/manifest.webmanifest`, `/icons/*`, `/fonts/*` | `public/` | PWA manifest, icons from the logo SVGs, self-hosted fonts |

## Component map

| Component | Design-system piece | Role |
|---|---|---|
| `Keypad`, `Key` | Keypad, Key (`nl-keypad`, `nl-key`) | 12 fixed keys on the moon panel; `is-scanning` row, `is-lit` key |
| `SpeakBar` | SpeakBar (`nl-speakbar`) + Button primary xl | Sentence in `utterance` 40px, codes in mono, Speak |
| `CandidateList`, `CandidateButton` | Candidate (`nl-candidate`) | Up to 5 ranked sentences, `aria-pressed` |
| `ProofPanel`, `ProofChip` | ProofChip (`nl-chip`) | match / new / reject, plus app-only `typing` |
| `Button`, `Icon` | Button, iconography | Real `<button>`, inline 24px stroke icons |
| `AppHeader`, `StatusPill` | In-context-app artboard | Logo (favicon variant at 44px). Wide: every status pill, Phrases / Voice / Settings. Compact: one summary pill and Menu (both in the HTML, CSS shows one) |
| `MenuSheet` | | Compact header's Menu: Phrases, Voice, Settings and the full status |
| `PartnerTurn` | artboard "They said" | Optional typed line from the other person, never stored |
| `ScanBar` | artboard scan control | "Switch scanning: 1.2 s a step", Slower, Faster |
| `Sheet`, `SettingsSheet`, `PhrasesSheet` | Interface kit | Native `<dialog>` sheets; Close is the first scan row. Phrases has saved phrases and the pack's quick phrases |
| `ShowMode` | | Full-screen big text when there is no voice |
| `SpellSheet` | ProofChip `new` + Interface kit | "Spell this word": one radio row per key with only its letters (Req 19) |
| `MyWordsSheet` | Interface kit | My words: list, Remove, Add a word, word pack import / preview / export (Req 21, 22) |
| `Footer` | website footer | Statement and About link (16px in the app, not `caption`) |

## State model

```
settings  (IndexedDB 'settings', theme mirrored in localStorage for first paint)
dict      loading | ready{lexicon, lm, model, pack} | missing | error      ← lib/data.ts (parallel fetch, idle warm-up)
composer  { slots: [{code, pin?}], open, punct, selected, spoken }       ← lib/composer.ts (pure reducer)
remote    model ranking result for (codes, partner), LRU-cached          ← lib/decodeClient.ts
derived   ghost = decodeWithPins(composer)  →  candidates = merge(remote, ghost)
          sentence = buildSentence(composer, candidates)  → text, tokens, proof per word, speakable
layout    'wide' (>= 960px) | 'compact', matchMedia                         ← lib/layout.ts
scanner   ScanState from @ninth/core scanReducer                          ← lib/useScanner.ts
sheetScan second scanReducer over the open sheet's data-scan-row rows    ← lib/useOverlayScan.ts
phrases   IndexedDB 'phrases' (only after Save phrase)                    ← lib/storage.ts
myWords   IndexedDB 'words' (only after Add to my words / a pack import)  ← lib/myWords.ts, lib/storage.ts
          applied with lexicon.addWords on load and on add; lexVersion bumps decoding
display   folded word -> person's spelling (my words + spelled this visit), applied only to text
fallback  decodeAround(composer) when no full sentence: known words ranked, null = not spelled yet
```

What is on show: a chosen sentence, else rank 1, else word by word. `#` pins the next reading of the last word;
choosing a sentence and then typing on pins its words. Speak is enabled only when every word is a real word that
matches its keys.

## Keyboard map

| Key | Action |
|---|---|
| `2`-`9` (top row or numpad) | Letter keys |
| `0`, Space (when focus is not on a control) | Space: commit the word |
| `1` | Punctuation: none . ? ! , |
| `*`, numpad `*`, Backspace | Back |
| `#`, numpad `/` | Next reading of the last word |
| Enter, numpad Enter (focus not on a control) | Speak |
| ArrowUp / ArrowDown | Move the chosen sentence |
| Alt+1 ... Alt+5 | Choose sentence 1-5 (plain digits always type) |
| One switch | Space or Enter selects; the highlight moves every `scanMs` |
| Two switches | Space moves, Enter selects |

Focus in a text field turns shortcuts off. When a button or link has focus, Enter and Space belong to it.
In switch modes, a press on the page outside any control is also the switch. While a sheet is open in a switch
mode, Space and Enter (and a press on the sheet or backdrop) drive the sheet's scan instead.

Scan grid: rows 0-3 keypad, row 4 sentences on show (+ More/Fewer; skipped when empty), row 5 "Add to my words"
offers (skipped when empty), row 6 Speak / Clear / Save phrase / Show / Spell this word, row 7 the header (Menu on
compact screens, Phrases / Voice / Settings on wide ones).
Any key is at most 4 + 3 = 7 steps away; this keypad-first order is also the access-modes spec's (F3).

Sheet scanning: rows are the `data-scan-row` elements in the open `[data-overlay]` dialog, Close first; it starts by
itself on Close and returns there after each choice. Sliders have buttons (scan speed: Faster / Slower) and the
voice picker has Previous / Next voice, so every setting works with a switch. The scan mode is latched while the
sheet is open, so turning scanning off (Keyboard, Touch) or switching modes takes effect on Close and can be undone
before then. Focus rests on the sheet, not a button, so the scan highlight stays the one ember thing.

Turning scanning off asks first (plan F11, web-ui Req 16.7): in a scan mode, choosing Keyboard or Touch replaces the
sheet's settings with "Turn off switch scanning? You will need a keyboard or touch to turn it back on." and two
buttons, Cancel first, in the scan row right after Close. Only "Turn off, use Keyboard/Touch" changes the setting;
Cancel, Close and Escape leave it. Switching between One switch and Two switches, or choosing while the sheet is not
scanning, does not ask. Tests: `test/scan-off-confirm.test.tsx`. In jsdom the sheet scanner re-reads its rows in a
MutationObserver (a microtask), so a test must `await act(async () => {})` after the sheet's content changes.

## Your words: spell mode and my words

Full design and the pack format: [vocab-packs.md](vocab-packs.md). In short: keys with no dictionary word show their
digits and a "not spelled yet" chip while the other words are still ranked (`decodeAround`); "Spell this word" opens
`SpellSheet`, whose rows offer only each key's letters (valid by construction, checked with `encodeWord`), and "Use
this word" pins the word to its slot. A word not in the person's words is `new` and gets "Not in your words yet. Add
it?". My words live in IndexedDB, are raised with `lexicon.addWords`, and keep the person's spelling through a
display map applied just before `formatSentence` (the core stays folded; this resolves the case question in
ADR-core-001). Removing a word reloads the dictionary with `loadDictionary()` and re-applies the rest, because the
lexicon can only raise words. Spell sheet keys: 1-4 pick a letter and move on, arrows move, Enter uses the word.

## Layout

| | Wide (>= 960px) | Compact (< 960px) | Split (phone held sideways) |
|---|---|---|---|
| When | 960px or wider | narrower than 960px | narrower than 960px, landscape, under 600px tall (`SPLIT_QUERY`) |
| Header | Brand, every status pill, Phrases / Voice / Settings | One row: brand, one summary pill, Menu | As compact, at the top of the left column |
| Main | Left: They said, SpeakBar, sentences, proof. Right: keypad, scan control, hint | SpeakBar, keypad, scan control, sentences (3 + More), proof, They said, hint | Left: SpeakBar, sentences (3 + More), proof, They said, scan control, hint. Right: the keypad alone, pinned |
| Keys | key-size (96) or key-xl | `(100svh - 528px) / 4`, 72 to 96 (or 128 XL) | `(100svh - 72px) / 4`, 72 to 96 (or 128 XL) |

The static HTML is the wide DOM; CSS `order` shows it in compact or split order until hydration swaps in the matching
DOM order (so focus order matches). Phones and tablets (2026-11-09, docs/research/mobile-layout.md, web-ui Req
15.8-15.11, checked on 20 viewports by `test/e2e/responsive.mjs`):
- **Keys never move while typing.** In compact and split the SpeakBar text area has a fixed height (two sentence lines
  and the key line; one sentence line on phones under 800px tall) and scrolls inside, kept on the newest word
  (`SpeakBar.tsx`). The full sentence is also in the sentence list and in Show mode.
- **Short phones** (up to 760px tall in portrait): denser keypad panel (12px padding, 8px gaps). Up to 700px tall
  (iPhone SE): Speak is target-min (56px) tall instead of 80px and section gaps are 12px. Narrow phones show "Save" and
  "Spell"; the accessible names stay "Save phrase" and "Spell this word".
- **Key size uses `svh`**, not `dvh`, so keys do not resize when the browser toolbar shows or hides.
- **Safe areas:** `viewport-fit=cover`; the page, sheets and Show mode pad by `env(safe-area-inset-*)`.
- **Gestures:** `touch-action: manipulation` (no double-tap zoom, pinch zoom stays), `overscroll-behavior: none` (no
  pull-to-refresh wiping a sentence), no iOS long-press menu on keys. The voice `<select>` draws its own chevron
  because iOS ignores `min-height` on a native select (it was 33px).

## Speech caveats

- Voices load late in Chromium: `loadVoices()` waits for `voiceschanged` up to 2 s. An empty list then means show mode.
- On-device (`localService`) voices are listed first and labelled "on this device"; online voices send the text to the
  browser maker. The picker says so.
- iOS Safari only speaks inside a user gesture: `speak()` is synchronous and is called straight from the click,
  keydown or switch handler. Never put an `await` before it.
- Chromium can cut off long utterances: text is split into chunks of at most 160 characters.
- `speechSynthesis.cancel()` runs before each sentence to clear a stuck queue.
- Model ranking never speaks; only a Speak press does.

## Loading and offline strategy

Loading (plan F9, web-ui Req 23; numbers in `docs/testing/performance.md`):

- `lib/data.ts` requests `en.v2.json`, the bigram file and the pack **in parallel** (`Promise.all`), then parses the
  lexicon, applies the pack and builds the language model. A missing or failed lexicon reads as "missing"; a failed
  pack or bigram file only drops that part.
- The app ships the **compact lexicon** `en.v2.json` (ADR-data-003): 230 KB gzip instead of 402 KB for v1, and it
  parses in about half the time. `en.v1.json` stays the eval's file.
- Every `/data` URL carries its content hash: `next.config.mjs` puts `{path: md5[0..12]}` in `NEXT_PUBLIC_DATA_REV`
  and `dataUrl(path)` appends `?v=`. Old export names (`DATA_PATHS.lexicon/bigram/pack`, `loadDictionary`, `DictState`,
  `VocabPack`) still work; fetch any other `/data` file through `dataUrl()` so it hits the precache.
- When the dictionary is ready, `warmDictionary` runs in idle time (`requestIdleCallback`, else `setTimeout`), one
  step per idle slice: `lexicon.prepare()` (the completion index), one small decode, then the completions of each
  single key. No key press builds anything; before this the first word with no exact reading stalled 385-580 ms on
  the Moto profile.

Offline:

- `pnpm prebuild` copies `data/lexicon` and `data/packs` into `public/data` (missing files are fine).
- `next.config.mjs` passes `/`, `/about`, the Next static chunks and the public files the app needs to Serwist:
  the latin fonts, `favicon.svg`, `favicon-32.png`, `icon.svg`, the web manifest, and the three dictionary files at
  their `?v=` URL with `revision: null`. Serwist fetches revision-null entries with the normal HTTP cache, so the
  install reuses the copy the page just downloaded (revisioned entries are fetched with `cache: 'reload'`, which is
  why the lexicon used to download twice).
- Not precached: the 192 and 512 px PNG icons and the Apple touch icon (install prompts read them online; the runtime
  image cache keeps them), latin-ext font subsets (loaded only for text that needs them), `data/LICENSE` and
  `data/NOTICE.md`, `en.v1.json`, the polyfills chunk and the unused pages-router chunks (framework, main, pages/).
- After one online visit the app opens, loads the dictionary and decodes with no network.
- Decode requests are `NetworkOnly` and time out on the client after 1,500 ms; the app stays in ghost mode.
- Offline indicator: "Offline. Using your dictionary." Model ranking shows as paused offline.
- `reloadOnOnline` is off so nobody loses a sentence when the connection comes back.
- The service worker is disabled in `next dev`.

## How to run

```sh
pnpm -F @ninth/web dev          # gen-tokens + copy-data, then next dev on :3000
pnpm -F @ninth/web typecheck
pnpm -F @ninth/web test --run   # vitest + jsdom + Testing Library
pnpm -F @ninth/web build        # gen-tokens + copy-data, then next build (also builds public/sw.js)
pnpm -F @ninth/web start
pnpm -F @ninth/web tokens       # regenerate styles/tokens.css after editing design/system/tokens.json
pnpm -F @ninth/web icons        # regenerate public/icons from the logo SVGs (needs Playwright's Chromium)
```

Model ranking in dev: `LLM_ENABLED=true ANTHROPIC_API_KEY=...` in `.env.local` (see `.env.example`), or
`LLM_ENABLED=true DECODE_FAKE_LLM=true` for the decoder's fake model. Production uses the same route on Vercel;
see `docs/architecture/decoder.md` for env vars, the WAF rule and the spend limit.

## Fonts

Next 15.1.3's `next/font/google` only knows the older "Atkinson Hyperlegible", so Atkinson Hyperlegible Next and
Atkinson Hyperlegible Mono are self-hosted woff2 files (latin and latin-ext subsets, variable weight) in
`public/fonts` with their OFL licenses, loaded by `@font-face` in `styles/globals.css` and preloaded in the layout.
No font request leaves the site. Upgrading to Next 15.4+ would allow `next/font/google` instead.

## Known gaps

- No axe run in CI yet (the Playwright sanity script checks targets, text size, real controls and focus rings).
- At 360 x 740 keys are at the 72px minimum and the last 16px of the keypad panel sits below the fold while the
  SpeakBar shows the 2-line empty prompt.
- In Night, a selected sentence's border uses `--focus`, which is ember (design-system Candidate); it shows next to
  Speak. Needs a design-system decision.
