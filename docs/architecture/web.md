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
| `/data/**` | `public/data` (copied) | Lexicon, bigram model and vocab pack, fetched at runtime |
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
| `Footer` | website footer | Statement and About link (16px in the app, not `caption`) |

## State model

```
settings  (IndexedDB 'settings', theme mirrored in localStorage for first paint)
dict      loading | ready{lexicon, lm, model, pack} | missing | error      ← lib/data.ts
composer  { slots: [{code, pin?}], open, punct, selected, spoken }       ← lib/composer.ts (pure reducer)
remote    model ranking result for (codes, partner), LRU-cached          ← lib/decodeClient.ts
derived   ghost = decodeWithPins(composer)  →  candidates = merge(remote, ghost)
          sentence = buildSentence(composer, candidates)  → text, tokens, proof per word, speakable
layout    'wide' (>= 960px) | 'compact', matchMedia                         ← lib/layout.ts
scanner   ScanState from @ninth/core scanReducer                          ← lib/useScanner.ts
sheetScan second scanReducer over the open sheet's data-scan-row rows    ← lib/useOverlayScan.ts
phrases   IndexedDB 'phrases' (only after Save phrase)                    ← lib/storage.ts
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

Scan grid: rows 0-3 keypad, row 4 sentences on show (+ More/Fewer; skipped when empty), row 5 Speak / Clear /
Save phrase / Show, row 6 the header (Menu on compact screens, Phrases / Voice / Settings on wide ones).
Any key is at most 4 + 3 = 7 steps away; this keypad-first order is also the access-modes spec's (F3).

Sheet scanning: rows are the `data-scan-row` elements in the open `[data-overlay]` dialog, Close first; it starts by
itself on Close and returns there after each choice. Sliders have buttons (scan speed: Faster / Slower) and the
voice picker has Previous / Next voice, so every setting works with a switch. The scan mode is latched while the
sheet is open, so turning scanning off (Keyboard, Touch) or switching modes takes effect on Close and can be undone
before then. Focus rests on the sheet, not a button, so the scan highlight stays the one ember thing.

## Layout

| | Wide (>= 960px) | Compact (< 960px) |
|---|---|---|
| Header | Brand, every status pill, Phrases / Voice / Settings | One row: brand, one summary pill, Menu |
| Main | Left: They said, SpeakBar, sentences, proof. Right: keypad, scan control, hint | SpeakBar, keypad, scan control, sentences (3 + More), proof, They said, hint |

The static HTML is the wide DOM; CSS `order` shows it in compact order on phones until hydration swaps in the compact
DOM order (so focus order matches). Compact keys are capped by `(100dvh - 480px) / 4` (min 72px) so the SpeakBar and
keypad fit at 390 x 844; the size depends on the viewport only, never on the sentence.

## Speech caveats

- Voices load late in Chromium: `loadVoices()` waits for `voiceschanged` up to 2 s. An empty list then means show mode.
- On-device (`localService`) voices are listed first and labelled "on this device"; online voices send the text to the
  browser maker. The picker says so.
- iOS Safari only speaks inside a user gesture: `speak()` is synchronous and is called straight from the click,
  keydown or switch handler. Never put an `await` before it.
- Chromium can cut off long utterances: text is split into chunks of at most 160 characters.
- `speechSynthesis.cancel()` runs before each sentence to clear a stuck queue.
- Model ranking never speaks; only a Speak press does.

## Offline strategy

- `pnpm prebuild` copies `data/lexicon` and `data/packs` into `public/data` (missing files are fine).
- `next.config.mjs` passes every public file (with a content hash), `/` and `/about` to Serwist, plus the Next
  static chunks. Max precache file size is 16 MB (the lexicon is about 1.6 MB).
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
