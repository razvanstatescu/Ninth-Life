# Marketing site: repo audit

What the repo already gives a one-page marketing site at `/`, what moving the app off `/` touches, and the rules the page must follow. Research phase, 2026-11-10. Read-only audit: nothing outside this file was changed.

Paths are relative to the repo root unless they start with `/`.

## 1. The finding that changes the plan

**A landing page already exists at `/welcome`.** It was built on Nov 9 (plan row F12, `docs/plan/01-implementation-plan.md`) from the website artboard, and it is statically rendered.

| Piece | File | What it does |
|---|---|---|
| Page | `packages/web/app/welcome/page.tsx` | Hero (Night in both themes), How it works (3 steps), Proof, Ways to type, Privacy, Measured results, Free and open source, footer with the intended-purpose sentence. `export const dynamic = 'force-static'` |
| Hero demo | `packages/web/components/site/KeypadDemo.tsx` | Client component. Replays "i need water" one key every 520 ms after a press on "Play the example". It starts on the finished sentence, never plays on its own (WCAG 2.2.2), offers Stop while playing, and announces the result in a polite live region. The keys are `aria-hidden` divs, a picture rather than controls. The pressed key gets a moon ring, not ember. "Hear it" calls `speechSynthesis` |
| Build-time data | `packages/web/components/site/site-data.ts` | `getDemoData()` runs `decodeGhost` on `public/data/lexicon/en.v1.json` and the bigrams at build time, so the demo sentences are real decoder output. `getResults()` reads `packages/eval/RESULTS.json` (B0 and B1 only). Exports `REPO_URL`, `RESULTS_URL` and `METHOD_URL` |
| Styles | `packages/web/components/site/site.css` (11 KB) | `site-*` classes, tokens only, 4px grid, a phone breakpoint at 599px. Imported only by the welcome page |
| Artboard | `design/artboards/In-context-web.dc.html` | The 1440 x 2300 mockup the page follows |

It has **no requirement in any spec** (no "website" or "welcome" in `.kiro/specs/web-ui/requirements.md`) and **no unit test** (nothing in `packages/web/test/` imports `site-data`, `KeypadDemo` or the page). The only automated check is `axe.mjs`, which loads `/welcome`.

`docs/testing/README.md` ("The website") records the earlier decision: "The app stays at `/` because it is the PWA start URL." This task reverses that decision, so the reason needs a new ADR (see section 9).

Drift worth fixing while it moves:
- The results copy says "Model ranking has not been measured yet". That was true for `RESULTS.json`, but `packages/eval/RESULTS.md` now holds three MiniMax model runs (section 5). `getResults()` never reads `packages/eval/RESULTS.llm.json`.
- "Hear it" sets no `utterance.lang` and does not prefer local voices (`.kiro/steering/voice.md` rules 4 and 7).
- `/about` renders "sent toAnthropic's Claude API": the JSX line break after "sent to" in `packages/web/app/about/page.tsx` eats the space. This is an app bug, outside this task.

## 2. Everything the move off `/` touches

### Routes and pages

| Item | File and line | Now | Note |
|---|---|---|---|
| App page | `packages/web/app/page.tsx` | `/` renders `<CommunicationScreen />` | Moves to the new route. The component itself uses absolute URLs only (`/data/...` in `lib/data.ts`, `/api/decode` in `lib/decodeClient.ts`, `/icons/favicon.svg` in `AppHeader.tsx`), so it works at any path |
| Root layout | `packages/web/app/layout.tsx` | Imports all four stylesheets (`tokens.css`, `globals.css`, `components.css`, `app.css` at 41 KB raw) for every route; inline `THEME_BOOT_SCRIPT`; preloads both latin fonts; `viewportFit: 'cover'`, `themeColor '#140a2e'`, no `maximumScale` | The landing page pays for `app.css` and the mono font preload unless the routes get separate layouts (route groups). `test/mobile.test.tsx` reads `app/layout.tsx` by path and asserts `viewportFit: 'cover'` and no `maximumScale`/`userScalable`, so moving the viewport into a group layout breaks that test unless it follows |
| `/about` | `packages/web/app/about/page.tsx` | `<Brand href="/" />` and the "Back to the keypad" button go to `/`; "See the demo, the measured results and the source code" goes to `/welcome`; `<Footer about={false} />` | The two `/` links must point at the app route |
| `/welcome` | `packages/web/app/welcome/page.tsx` | Brand link `/welcome`; "Open the app" (header), "Try it in your browser" (the hero's one ember button) and the footer "Open the app" all go to `/`; "About" goes to `/about` | Becomes `/` or redirects there. Open point: keep it as a redirect so old links and the CI readiness probe still work |
| App footer | `packages/web/components/Footer.tsx` | `about` true: "About Ninth Life" `/about`; false: "Back to the keypad" `/`; both: "How Ninth Life works" `/welcome` | Comment says "/welcome link works offline: next.config.mjs precaches it" |
| Menu sheet | `packages/web/components/MenuSheet.tsx` (lines 113-119) | "How Ninth Life works" `/welcome`, "About Ninth Life" `/about` | Scan row `about` |
| Skip link | `packages/web/components/CommunicationScreen.tsx` line 889 | `#keypad` | Unaffected |

**First-run logic: none exists.** No code redirects to `/welcome` or shows a first-run screen (no match for `firstRun`, `onboard`, `redirect(` or `router.push` in `packages/web`). `docs/a11y/2026-11-10-root-web-ui-51.md` calls `/welcome` "(first run)", but it is only a linked page. `.kiro/steering/product.md` asks for the intended-purpose sentence in "About and first run", and the footer and About page already meet that.

### PWA manifest, service worker, Next config

| Item | File | Now | Impact |
|---|---|---|---|
| Manifest | `packages/web/public/manifest.webmanifest` | `"id": "/"`, `"start_url": "/"`, `"scope": "/"`, `"orientation": "any"`, `display: standalone` | `start_url` must become the app route, or installed apps open the marketing page. Keep `"id": "/"` so an installed app stays the same app. `scope: "/"` keeps `/about` and the landing page inside the installed window; narrowing it to the app route would open `/about` in the browser. `orientation` stays `any` (ADR-003 point 3) |
| Precache list | `packages/web/next.config.mjs` line 102 | `additionalPrecacheEntries: [{ url: '/' }, { url: '/about' }, { url: '/welcome' }, ...publicEntries()]` with one build revision | Add the app route. Decide whether `/` (the landing page) stays precached. Its HTML was 40 KB raw, 8 KB gzip as `/welcome` (`docs/testing/performance.md`, "What it means now" point 2). Any images or video the new page adds would enter the precache through `publicEntries()`, which walks all of `public/`, unless they are added to `NOT_PRECACHED` |
| Offline fallback | `packages/web/app/sw.ts` | `fallbacks.entries: [{ url: '/', matcher: request.destination === 'document' }]` | Offline, any document that is not cached falls back to `/`. After the move that would be the marketing page; it should be the app route |
| Navigation caching | `next.config.mjs` | `cacheOnNavigation: true`, `reloadOnOnline: false`, `disable` in development | No service worker under `pnpm dev`, so the offline behaviour can only be checked on a production build |
| Registration | `@serwist/next` | `register` is not set, so the plugin default applies (registration from the client entry on every page; confirm against the installed 9.0.11) | A first visit to the landing page installs the worker and precaches the app (about 605 KB, page and worker, per `docs/testing/performance.md`). That keeps "after one visit the app works with no connection" true, but the downloads happen during a Lighthouse run |
| Theme colour | `app/layout.tsx` `viewport` | `#140a2e` | Fine for a Night hero |

Installed copies: the app is not deployed yet (`docs/submission/CHECKLIST.md` A1 "todo", `.kiro/steering/tech.md` "not yet live"), so only testers' installs keep the old `start_url: "/"`. If that matters, `/` can send a standalone-mode visit (`matchMedia('(display-mode: standalone)')`) to the app route.

Storage needs no migration: IndexedDB phrases, My words and the `nl-theme` / `nl-keysize` localStorage keys (`packages/web/lib/settings.ts`) belong to the origin, not to a path.

### Tests, e2e scripts and CI

| File | What loads `/` | Change |
|---|---|---|
| `packages/web/test/e2e/lib.mjs` | `openApp(page, path = '/')` waits for `button[data-key="4"]` and "Offline dictionary ready" | Change the default path to the app route. Also: `newContext` defaults to `reducedMotion: 'reduce'` and `serviceWorkers: 'block'`, so no e2e script sees animation or the worker unless it asks |
| `test/e2e/axe.mjs` | Targets `app /`, `welcome /welcome`, `about /about`, `settings sheet on /` at 1280 and 390, Night and Day | Point the app targets at the new route; make `/` the landing page target |
| `test/e2e/responsive.mjs` line 70 | `page.goto(BASE_URL + '/')` for phones held sideways (expects `.rotate`), then `openApp(page)` | App-only test of 24 sizes; both calls move to the app route. It does not cover the landing page |
| `test/e2e/keyboard.mjs`, `switch.mjs`, `spell.mjs` | `openApp(page)` | Follow `lib.mjs` |
| `scripts/perf-check.mjs` lines 262, 305, 380 | `page.goto(BASE_URL + '/')` waits for the dictionary | Move to the app route, or the perf report measures the wrong page |
| `packages/web/test/footer.test.tsx` | Asserts `['How Ninth Life works', '/welcome']` and `['Back to the keypad', '/']` | Update the hrefs |
| `packages/web/test/mobile.test.tsx` | Reads `app/layout.tsx`, `styles/app.css`, `styles/globals.css` by path | Breaks if the layout or viewport moves |
| `packages/web/test/tokens.test.ts` | `styles/tokens.css` must equal `gen-tokens` output of `design/system/tokens.json` | New tokens go in `tokens.json`, then `pnpm -F @ninth/web tokens` |
| `.github/workflows/ci.yml` | Readiness probe `curl "$BASE_URL/welcome"`; runs axe, keyboard, switch, responsive, perf | Probe a route that will exist; add any landing-page e2e script to the `e2e` job (`docs/testing/README.md`, "Writing a new walkthrough") |

### Kiro config and docs that name the routes

| File | Text |
|---|---|
| `.kiro/steering/structure.md` | "`app/` pages (`/`, `/about`, `/welcome`)"; "`packages/web/` — the app. Spec: `web-ui/` (Req 1-26)" |
| `.kiro/steering/product.md` | Devices section: "the main screen fits the visible screen and never scrolls" (the app); intended-purpose placement list |
| `.kiro/steering/accessibility.md`, `tech.md` | e2e commands with `BASE_URL=http://localhost:3000` (no path, still fine) |
| `.kiro/agents/a11y-auditor.json` | Default route `http://localhost:3000/` in `prompt` and `welcomeMessage`: after the move it audits the marketing page by default |
| `.kiro/workflows/ship-feature.workflow.json` | Dev-server probe `curl http://localhost:3000/` (still fine); the a11y review step says "Audit the Ninth Life app at http://localhost:3000/" (now the wrong page) |
| `.kiro/specs/web-ui/requirements.md` | Req 5.1 (precache shell, fonts, icons, `/data/**`), Req 14.3 (footer and About carry the sentence), Req 11 (motion), Req 23.4 (what the precache holds) |
| `.kiro/specs/web-ui/design.md` line 105 | "Serwist precaches the shell, `/`, `/about` and every public file" |
| `.kiro/specs/web-ui/tasks.md` | Task 17 (Serwist precache); task 52 (WCAG 1.3.4 statement on `/about`, still open) |
| `docs/architecture/web.md` "Route map" | Lists `/` as the communication screen and `/about`; `/welcome` is missing from the table, though the `/data/**` row says "`en.v1.json` is copied for the landing page's build only" |
| `docs/testing/README.md` | Layers table: axe on `/`, `/welcome`, `/about`; section "The website": the app stays at `/` |
| `docs/testing/performance.md` | Precache notes for `/`, `/about`, `/welcome` |
| `docs/plan/01-implementation-plan.md` | Row F12 (link to and precache `/welcome`) |
| `docs/decisions/ADR-002-minimax-provider.md` point 5, `ADR-data-003-compact-lexicon.md` | "Settings, About, Welcome" opt-in copy; `en.v1.json` copied "because the landing page reads it at build time" |
| `docs/a11y/2026-11-10-root-web-ui-51.md`, `.kiro/workflow-output/review.md` | Name `/welcome`; historical reports, leave as they are |
| `docs/submission/DEVPOST.md`, `VIDEO_SCRIPT.md`, `CHECKLIST.md` | `[APP_URL]` placeholders; DEVPOST's results table says model ranking "not run yet" (now out of date) |
| `README.md` | No route named; "Develop" runs `pnpm dev` |

## 3. Brand assets, fonts and tokens the page can reuse

### Logo and icons (never redraw)

| Asset | Source | Served copy | Rule |
|---|---|---|---|
| Full icon (moon bubble with cat ears, 8 plum keys, ember ninth key) | `design/system/assets/Logos/ninth-life-icon.svg` | `packages/web/public/icons/icon.svg` (10 KB) | 48px and up: website header, hero, end card |
| Favicon variant (bubble, one plum-ringed ember key) | `design/system/assets/Logos/ninth-life-favicon.svg` | `public/icons/favicon.svg` (1 KB), `favicon-32.png` | Below 48px |
| PNG icons | generated by `packages/web/scripts/gen-icons.mjs` | `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (111 KB each), `apple-touch-icon.png` | Manifest only; kept out of the precache |
| Wordmark | "Ninth Life" set in Atkinson Hyperlegible Next ExtraBold beside the icon | text, not an image | `design/system/README.md` "Logo" |

Logo rules (`design/system/README.md` "Logo", `design/system/assets/Logos/README.md`, misuse cards in `design/artboards/Logo-system.dc.html`): clear space is one key's width on every side. Do not recolour the ember key or the night ground. Do not rotate, tilt, squash or **animate the icon**. Do not crop the ears, add a face, put it on a phone drawing or pair it with a trademark. There is no single-ink version; on a photo, place the whole tile.

### Visual motifs that already exist as vectors

- **Cover** (`design/system/components/Cover/preview.html`): an SVG of a moon panel holding a 3 x 4 grid of plum keys with the ninth key in ember, drawn from tokens (`--radius-panel`, `--radius-key`), with "Ninth Life" in display type and the tagline. A ready token-based hero or card graphic.
- **The keypad** itself: `nl-keypad`, `nl-key` from `design/system/components/bundle.css` and `packages/web/styles/components.css`, with `KEY_ROWS` in `packages/web/lib/keys`. The fixed layout (1 punctuation, 2-9 letters, `*` Back, `0` Space, `#` Next) may not be reordered, its digits may not be hidden, and no keys may be added (`.kiro/steering/design-system.md`).
- **ProofChip** (`packages/web/components/ProofChip.tsx`): states `match`, `new`, `reject`, `typing`, `unspelled`, each with an icon, a word and a border style.
- **Icons** (`packages/web/components/Icon.tsx`): inline SVG, 24px grid, 2.5px round stroke, `currentColor`: speaker, voice, check, plus, x, back, space, gear, switch, save, menu, show, flip, spell, said, mic, stop, offline. New icons go here in the same style.
- The brand's three shapes (`design/system/README.md` "The idea in three shapes"): the bubble, the ears, the ninth key. "No mascots, no faces, no cartoon cat."

### Fonts (self-hosted, OFL 1.1)

`packages/web/public/fonts/`: `atkinson-hyperlegible-next-latin.woff2` (34 KB), `-latin-ext.woff2` (19 KB), `atkinson-hyperlegible-mono-latin.woff2` (18 KB), `-latin-ext.woff2` (11 KB), with `OFL-atkinson-hyperlegible-next.txt` and `OFL-atkinson-hyperlegible-mono.txt`. `@font-face` rules with `font-display: swap`, variable weights 400-800 (Next) and 400-700 (Mono), and unicode ranges are in `packages/web/styles/globals.css`. Both latin files are preloaded in `app/layout.tsx`. Do not hotlink Google Fonts, and do not use `next/font/google` on Next 15.1.12 (`.kiro/steering/design-system.md`). `design/system/components/bundle.css` and the artboards import Google Fonts for previews only; copy nothing from them that loads fonts.

### Tokens (`design/system/tokens.json` → generated `packages/web/styles/tokens.css`)

- Brand colours, same in both themes: `night #140a2e`, `plum #2a1856`, `moon #eee8ff`, `ember #ffb13d`, plus `ember-deep`, `on-ember #1a0f3a`.
- Semantic, Night / Day: `ground`, `surface`, `surface-sunken`, `panel`, `key`, `on-key`, `line` (decorative only), `line-strong` (control edges), `ink`, `ink-muted`, `link`, `focus` (ember on Night, ink on Day), `proof-match`, `proof-new`, `proof-reject`, `danger`, `ember-soft`.
- Type for the website: `display-xl` 96px/0.95/800 (website hero, one per screen), `display` 56px/60px/800 (website section heads), `title` 32px, `heading` 22px, `body-lg` 20px, `body` 17px/26px ("website body"), `label` 16px, `caption` 14px ("website footnotes and video credits only"), `digits` 20px mono, `key-digit` 15px mono. Samples include "Press nine keys. Say what you mean." (`display`).
- Spacing `space-1` to `space-24` (4 to 96px). `space-12` 48px is "website section padding on phones", `space-16` 64px "website and video safe margins", `space-24` 96px "website section spacing on desktop".
- Sizes: `target-min` 56px, `key-min` 72, `key-size` 96, `key-xl` 128, `focus-width` 4px, `scan-width` 6px. Radii: chip 14, key 24, card 28, panel 44, pill 999.
- Shadows: `lift` (keypad panel and floating sheets only), `glow-ember` (lit key and scan highlight only; Day uses a plum ring because a glow vanishes on light grounds).

There are no motion tokens (no durations or easings). Rich animation needs new tokens added to `tokens.json` first (`.kiro/steering/design-system.md`: "add it to the design system first").

### Reusable code

- `NOT_A_MEDICAL_DEVICE` in `packages/web/components/Footer.tsx`: the intended-purpose sentence as one constant.
- `providerCopy()` in `packages/web/lib/rankingProvider.ts`: the provider name and the retention facts, set at build time from the decode route's env (`NEXT_PUBLIC_DECODE_PROVIDER`).
- `Brand` in `packages/web/components/AppHeader.tsx`; `nl-btn` variants (primary, secondary, quiet, `--xl`); `nl-skip` skip link and `nl-sr-only` in `globals.css`.
- The whole `components/site/` folder (section 1).

## 4. Approved copy the page can reuse

Copy already in the brand book, README or the shipped `/welcome`, and consistent with `.kiro/steering/product.md`:

- **Intended purpose, verbatim, in the footer** (`.kiro/steering/product.md`, `Footer.tsx`): "Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment."
- Tagline: "The old keypad, back as your voice." (`README.md`, `design/system/README.md`, Cover).
- Hero line: "Press keys. Hear your sentence." Lead: "Ninth Life brings back 9-key predictive text as a voice. Press one key per letter on any device, and it speaks the sentence you meant, after checking every word against the keys you pressed." Note: "Free. Works offline. No account." (`app/welcome/page.tsx`).
- Product sentence (`README.md`, `DEVPOST.md`): "Press keys 2 to 9, one press per letter, and Ninth Life speaks the sentence you meant. A proof check makes sure every spoken word matches the keys pressed, so a language model can help rank sentences but can never put words in someone's mouth."
- How it works: "Press one key per letter / H and I share key 4, so "hi" is 4 4. No tapping a key three times, no code to learn. 0 is space." "Pick the sentence you meant." "Hear it out loud / Nothing is spoken until you press Speak."
- Proof: "Every word is checked against your keys." "A language model can suggest sentences. It cannot put words in your mouth." Example: keys 92837 give water and waves (match); wafer is 92337 (reject). Use the page's conditional "If it were suggested, it would be checked and dropped", not the artboard's "It was suggested, checked and dropped", which describes an event that did not happen.
- Ways to type: Keyboard ("Number keys or the numpad. Enter speaks, Backspace goes back, arrow keys pick a sentence."), Touch ("Keys from 72 to 128 pixels. No swipes, no long presses."), One or two switches ("Row and column scanning, from 0.4 to 5 seconds a step, with no time limits."), Your view (Night or Day, large or extra-large keys, Show mode).
- Privacy: "No account, no cookies, no analytics, no ads." "Saved phrases stay on your device, and only when you press Save phrase." Model ranking is opt-in, with `providerCopy().service` and `.retention`, "Processing is not limited to the EU." Voices: "Voices marked "on this device" keep your words on the device; online voices send the text to the browser maker." Listen (from `/about`): the other person's voice "may be sent to the browser maker (Google in Chrome, Apple in Safari)".
- Honest limits ("Good to know" on `/welcome`): "You need to be able to spell: Ninth Life types words, not symbols." "Voices depend on your device and browser." "English first. It has not yet been tested with people who use AAC."
- Closing lines: "Free and open source. Built with Kiro for Kiroween 2026." Video end card: "Free. Works offline. Runs in your browser." (`docs/submission/VIDEO_SCRIPT.md` row 7).
- The Write / Not table in `design/system/README.md` ("Voice and content"): for example "This word matches your keys", not "Verified by AI".

Do **not** reuse these artboard lines from `design/artboards/In-context-web.dc.html`:
- "Nothing you say is stored or logged." `.kiro/steering/privacy.md` forbids saying nothing is kept.
- "Ninth Life can use what the other person just said to put the likely one first." It leaves out that model ranking is opt-in.
- An ember "Try it free" in the header next to the ember hero button: two ember things on one screen.

## 5. Numbers the page may quote

Only from `packages/eval/RESULTS.md`, each with the method linked. Method links already in code (`site-data.ts`): `RESULTS_URL` = `https://github.com/razvanstatescu/Ninth-Life/blob/main/packages/eval/RESULTS.md`, `METHOD_URL` = `.../docs/architecture/data-and-eval.md#4-evaluation-method` (heading "## 4. Evaluation method" exists). Model runs are described under "### Model runs (B2–B4, decision D5)" in the same file. Both links 404 until the repo is public (`docs/submission/CHECKLIST.md` G1 "todo").

Every number comes from a **simulated typist**, not from people. The `/welcome` copy says so, and DEVPOST adds that the numbers say nothing about communication speed for any user.

Full set: 866 items from `fixtures/test.v1.jsonl` (AACText and Turk dialogues), seed 9, k = 5, letter mode.

| Config | Word acc | Right sentence first | In top 5 | KSR | Scan steps/char |
|---|---|---|---|---|---|
| B0 dict (word frequency only) | 91.5% | 62.4% | 92.0% | -1.2% | 3.61 |
| B1 ghost (the offline dictionary the app ships) | 96.8% | 85.6% | 97.3% | -0.0% | 3.57 |

By source, B1: AACText 566 items 97.3% / 88.7% / 98.4%; Turk 300 items 96.2% / 79.7% / 95.3%. DEVPOST notes the AACText subset is somewhat optimistic because some short stock phrases also occur in the training text.

Model ranking, **200-item seeded sample**, letter mode, 2026-11-09, B4 lattice+val (the mode the app uses):

| Model | Word acc | First | Top 5 | Calls over 1.2 s (would fall back to the offline result at the route's deadline) | Same items, B1 offline |
|---|---|---|---|---|---|
| MiniMax-M3 | 98.9% | 95.5% | 98.5% | 24.8% | 96.5% / 84.5% / 98.0% |
| MiniMax-M3.1-Flash | 98.9% | 96.0% | 98.5% | 70.7% | same |

A model figure is only honest with three things beside it: the sample size (200, not 866), the B1 row for the same items, and the share of calls over the deadline. No Claude run is in RESULTS.md yet. Do not quote the B2 or B3 rows as product numbers, because the app uses B4.

Do not quote:
- A keystroke-saving or speed claim. KSR is about 0 by design in letter mode; the existing page states this as a limit ("letter mode saves no key presses").
- Latency (p50, p95). RESULTS.md says it varies run to run, and DEVPOST chose not to quote it.
- Initials mode as a feature result: B1 gets 1.5% right sentence first, and it is not in the app.
- `docs/testing/performance.md` figures as product claims. They are relative timings on a throttled cloud machine ("4x is not a real phone"), and web-ui task 45 (re-measure on a real phone) is open.
- Any research result (for example from `docs/research/mobile-aac-evidence.md`) as ours.

`getResults()` turns RESULTS.json into percentages with one decimal, so the page cannot show a number the harness did not write. For model numbers it would also need `RESULTS.llm.json`, or the copy must not say "not measured yet".

## 6. Binding rules for the page

### Motion
- `design/system/README.md` "Motion": "No slides, bounces, pulses or blinking: switch users watch the screen for long stretches, and pulsing light is tiring and can be unsafe. Respect `prefers-reduced-motion`."
- `.kiro/steering/design-system.md` "Spooky, but calm": no flicker, fog animation, jump scares, dripping text or low-contrast ghost text **in the app**. "**The website hero and the video may use slow fades.**" This is the only motion the rules grant the website.
- `.kiro/steering/accessibility.md` rule 5 and web-ui Req 11.1-11.2 forbid pulsing, blinking, sliding and bouncing and remove all transitions under reduced motion. Both are written for "the app"; whether they bind the marketing page is an open point, and the a11y-auditor profile applies them to every route it audits.
- Logo: never animate the icon (`Logo-system.dc.html`).
- Already enforced site-wide: `packages/web/styles/globals.css` sets `*, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }` under `prefers-reduced-motion: reduce`. Every CSS animation on the page switches off for those visitors with no extra work. JavaScript-driven motion (timers like `KeypadDemo`'s `setInterval`, the Web Animations API, scroll handlers) is not covered and must check `matchMedia('(prefers-reduced-motion: reduce)')` itself.
- WCAG to design for: 2.2.2 Pause, Stop, Hide (anything that moves for over 5 s on its own needs a pause control; `KeypadDemo` avoids it by playing only on a press), 2.3.1 Three flashes, 2.3.3 Animation from interactions (AAA, but the steering asks for it).
- The e2e helpers run with `reducedMotion: 'reduce'` by default (`test/e2e/lib.mjs`), so an animation test must pass `reducedMotion: 'no-preference'` to see the motion.

### Colour and contrast
- Tokens only; no raw hex in components (`.kiro/steering/design-system.md`). Text 4.5:1, large text 3:1, UI edges, icons and focus 3:1 in Night and Day (`accessibility.md` rule 8). The token comments give the checked ratios.
- **One ember thing per screen**, as a fill, never text or a hairline, with `on-ember` text (`accessibility.md` rule 3). On `/welcome` the hero CTA is that one thing; the header CTA is secondary and the demo's pressed key uses a moon ring. An ember motif such as the icon's ninth key, a glow, or a lit key in an animation competes with the CTA. Decide what "screen" means on a scrolling page (per viewport) before designing ember visuals.
- Ember on the Day ground is 1.7:1: in Day it appears only as a fill with a plum ring. `/welcome` keeps the hero Night in both themes (`data-theme="night"` on the hero), and the body sections follow the theme.
- Never colour alone (1.4.1): proof states carry an icon, a word and a border style, and rejected words are struck through.

### Size, targets, type
- Targets at least 56px (`target-min`) with 8px between them (rule 1). `/welcome` applies `min-height: var(--target-min)` to nav, footer and inline link rows.
- App text is at least 16px. `caption` 14px is allowed only for the website footer and video credits (rule 2, `tokens.json`). The website body is `body` 17px.
- Reflow at 320px, usable at 200% zoom and with text-spacing overrides (1.4.4, 1.4.10, 1.4.12). Zoom must stay on: no `maximumScale` (`test/mobile.test.tsx`).
- `display-xl` once per screen (the hero name or line).

### Structure and interaction
- Real `<a href>` and `<button>` controls only; focus always visible (4px `--focus`, 3px offset); a skip link first (`nl-skip`, which `/welcome` already has).
- No gesture-only actions (2.5.1, 2.5.7). No auto-speech: "Hear it" speaks only on a press, inside the handler (`voice.md` rules 1-2), with `lang` set and local voices preferred (rules 4, 7).
- Global CSS affects the page: `html { overscroll-behavior: none; touch-action: manipulation }` (no pull-to-refresh, no double-tap zoom, pinch zoom kept), pinned by `test/mobile.test.tsx`.
- Phones: ADR-003 makes **the app** portrait-only and one-screen (`docs/decisions/ADR-003-one-screen-portrait-phones.md`, web-ui Req 24-25, `components/RotateNotice.tsx`). The landing page does not use `CommunicationScreen`, so it scrolls and rotates freely unless a new decision says otherwise. Open point.

### Privacy (`.kiro/steering/privacy.md`, web-ui Req 13.3)
- No cookies, analytics, fingerprinting, third-party scripts or consent banner. Self-host everything: no CDN fonts, icons, video players, Lottie or animation runtimes from another origin, no embedded YouTube for the demo video (an outbound link is fine).
- Do not say "nothing is kept". Name the provider and its retention through `providerCopy()`. Do not claim EU-only processing.
- Browser-maker names (Google, Apple, Chrome, Safari) only as plain words in privacy and help copy (`.kiro/steering/trademarks.md`).

### Trademarks and third-party material (`.kiro/steering/trademarks.md`)
- The words listed in `trademarks.md` never appear, in any case, in copy, alt text, file names, identifiers, comments or commit messages. Say "9-key predictive text", "the old phone keypad", "the 12-key keypad", "one press per letter". `node scripts/tm-lint.mjs <files>` matches whole words only, so name identifiers `nineKey…` or `keypad…`.
- No drawings or photos of a recognisable phone model (the "Phone shell" direction was dropped for this reason, `design/artboards/Directions.dc.html`), no phone-maker, keyboard-app or OS logos, no other apps' screenshots or UI, no third-party voice names on screen, no copyrighted music or sound effects (keypad tones are self-made).
- Kiro, AWS, Anthropic, Claude, MiniMax may be named in credits and the Kiro section.

### Claims and audience (`.kiro/steering/product.md`)
- Write for adults; describe the tool, not the person; "people who use AAC" when a group must be named; no conditions or diagnoses named as who it is for; no cartoons, mascots, faces or pictures of people (`design/system/README.md`).
- The "Banned claims" list in `product.md` applies to every line: no treatment, recovery or therapy wording; no clinical validation, approval or medical-device wording; no claim that it replaces an AAC device, an assessment or professional advice; no number that RESULTS.md did not measure; no research results presented as ours; nothing suggesting the model understands people or decides what is said.
- Allowed: "free", "works offline", "runs in your browser", "every spoken word matches the keys you pressed", and numbers copied from RESULTS.md with the method linked.
- Plain verbs, sentence case, no exclamation marks, numbers as digits (web-ui Req 14.1).

### Licences (`.kiro/steering/data-licenses.md`)
- Any new font, icon, image, sound, video or animation asset needs a known licence that allows it and an entry in a NOTICE or the README credits in the same change. If the licence is unclear, stop and ask. No NC or ND material. The fonts' `OFL-*.txt` files stay next to the woff2 files.
- A new dependency, even a dev-only one such as Lighthouse, gets its licence recorded.

### Process (`.kiro/steering/tech.md`, `product.md`)
- Every new user-facing behaviour gets a requirement in `.kiro/specs/<spec>/requirements.md` and a test that names its ID. Trade-offs go in `docs/decisions/`. Log the work in `docs/KIRO_LOG.md` (by hand or `node scripts/kiro-log.mjs add ...`; the table must stay the last block).
- No formatter over files. Do not hand-edit `styles/tokens.css` (generated). Do not hand-edit lexicon JSON in `data/`.

## 7. Performance and Lighthouse constraints

- **Building blocks the dev server.** `next build` and `next dev` share `packages/web/.next`, and the build also rewrites `public/sw.js` and `public/swe-worker-*.js` (git-ignored, `packages/web/.gitignore`). `scripts/block-build-during-dev.mjs` (the `build-guard` hook) blocks any `next build` / `pnpm build` while a `next dev` process runs anywhere on the machine, whatever the directory. The dev server was up on 2026-11-10 (`/` and `/welcome` both answered 200).
- **Lighthouse needs a production build.** `next dev` has no service worker and serves unminified chunks with the dev overlay (`docs/testing/README.md`). The repo's e2e and perf scripts expect `next start -p 3202`. A Lighthouse run therefore needs one of: the person stops the dev server, builds, starts on 3202, measures and restarts dev; or a build in a separate copy of the repo, which the hook still blocks while dev runs, so it needs the person's explicit yes.
- **Lighthouse is not installed.** There is no `lighthouse` binary and no global package; only `playwright` is installed globally (`npm root -g`). `scripts/perf-check.mjs` already drives Chromium over CDP with Lighthouse's Slow 4G preset (562.5 ms RTT, 1.44 Mbit/s down, 675 kbit/s up) and 4x CPU, a reusable method for a landing-page budget.
- **Budgets on record** (app): first load under 700 KB compressed, measured 530 KB; slowest key press under 50 ms (`docs/testing/performance.md`, web-ui Req 23). There is no landing-page budget yet.
- The landing page needs no dictionary at runtime: the demo data is computed at build time. Keep it that way, because the 326 KB of dictionary data would dominate its weight.
- Weight that comes free with today's root layout: `app.css` (41 KB raw) and `components.css` (9 KB) on every route, plus preloads of both latin fonts (34 + 18 KB) even where the mono font is not needed.
- `en.v1.json` stays in `public/data/` (copied by `packages/web/scripts/copy-data.mjs`) only because `site-data.ts` reads it at build time (ADR-data-003). It is excluded from the precache.

## 8. Existing research the other phases can lean on

- `docs/research/marketing-site/structure-content.md`: the parallel structure-and-content research (another agent).
- `design/artboards/Directions.dc.html`: why Night with one ember key (AAC tools looked childish, keypads looked like banks, accessibility pages "already wear blue"); the dropped phone-shell and cat-mascot directions.
- `docs/research/competitive-landscape.md`, `mobile-patterns-mobbin.md`, `mobile-aac-evidence.md`, `web-speech.md`: background only. Cite research by source; do not copy figures (`data-licenses.md` rule 6).
- `docs/submission/DEVPOST.md`, `VIDEO_SCRIPT.md`: the long-form story (problem, resurrection, proof panel, access, privacy, results, how we built it), which the page and the submission should keep consistent.

## 9. Open points this audit adds to the brief's list

1. **Reuse or replace `/welcome`.** The page, its demo, its data loader and its CSS already pass axe in CI. Moving it to `/` and adding rich visuals is a smaller and safer change than starting over. Whatever is chosen, `/welcome` needs a fate: a permanent redirect to `/` (keeps old links, the precache entry and the CI probe meaningful) or removal.
2. **The reversed decision needs an ADR.** `docs/testing/README.md` says the app stays at `/` because it is the PWA start URL. The new ADR should cover the app's route, `start_url` and `id`, `scope`, the offline fallback in `app/sw.ts`, the precache list, and what an installed app opening `/` should do.
3. **Spec home.** web-ui owns the app (Req 1-26, `structure.md`). The site has no requirements today. Either a new spec (`.kiro/specs/marketing-site/`) with its own IDs plus web-ui amendments for the move (Req 5.1, 14.3, 23.4 and the precache), or new web-ui requirements 27 and up.
4. **Motion tokens.** No durations or easings exist; add them to `design/system/tokens.json` (then `pnpm -F @ninth/web tokens`) before building animations.
5. **Layout split.** Route groups with their own layouts would keep `app.css` and the app's viewport and theme-boot details off the landing page, but `test/mobile.test.tsx` reads `app/layout.tsx` by path and must follow.
6. **Results copy.** Either read `RESULTS.llm.json` and show the B4 sample with its caveats, or say "measured on a 200-item sample, see RESULTS.md". "Not measured yet" is no longer true.
7. **Service worker on the landing page.** Registering on `/` makes the app available offline after visiting only the landing page, which keeps the existing claim true. It also downloads the app's precache during a Lighthouse run. Decide which matters more.
