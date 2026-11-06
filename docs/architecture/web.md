# Web app (`packages/web`)

The communication screen: press keys 2-9, one press per letter, and Ninth Life speaks the sentence you meant.
Next.js 15.1 App Router, React 19, plain CSS from the design-system tokens, Serwist for offline.
Spec: `.kiro/specs/web-ui/` (requirements, design, tasks). Contracts: `docs/architecture/contracts.md`.

## Route map

| Route | File | What it is |
|---|---|---|
| `/` | `app/page.tsx` → `components/CommunicationScreen.tsx` | The communication screen (static shell, client component) |
| `/about` | `app/about/page.tsx` | What it does, proof, privacy, the not-a-medical-device statement |
| `POST /api/decode` | `app/api/decode/route.ts` | Next.js adapter for `@ninth/decoder` `handleDecode`; 503 `llm_disabled` unless `DECODE_ROUTE_ENABLED=true` |
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
| `AppHeader`, `StatusPill` | In-context-app artboard | Logo (favicon variant at 44px), status pills, Phrases / Voice / Settings |
| `PartnerTurn` | artboard "They said" | Optional typed line from the other person, never stored |
| `ScanBar` | artboard scan control | "Switch scanning: 1.2 s a step", Slower, Faster |
| `Sheet`, `SettingsSheet`, `PhrasesSheet` | Interface kit | Native `<dialog>` sheets |
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
scanner   ScanState from @ninth/core scanReducer                          ← lib/useScanner.ts
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
In switch modes, a press on the page outside any control is also the switch.

Scan grid: rows 0-3 keypad, row 4 sentences (skipped when empty), row 5 Speak / Clear / Save phrase.
Any key is at most 4 + 3 = 7 steps away.

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

Model ranking in dev: `DECODE_ROUTE_ENABLED=true LLM_ENABLED=true` with AWS credentials for Bedrock in an EU region,
or `DECODE_FAKE_LLM=true` for the decoder's fake model. Production points `NEXT_PUBLIC_DECODE_URL` at the Lambda.

## Fonts

Next 15.1.3's `next/font/google` only knows the older "Atkinson Hyperlegible", so Atkinson Hyperlegible Next and
Atkinson Hyperlegible Mono are self-hosted woff2 files (latin and latin-ext subsets, variable weight) in
`public/fonts` with their OFL licenses, loaded by `@font-face` in `styles/globals.css` and preloaded in the layout.
No font request leaves the site. Upgrading to Next 15.4+ would allow `next/font/google` instead.

## Known gaps

- No axe run in CI yet (the Playwright sanity script checks targets, text size, real controls and focus rings).
- Settings sheets are not switch-scannable; a switch user needs help to change settings.
- Vocab pack phrases are loaded but not yet shown as quick phrases.
