# Accessibility audit: the landing page `/`, round 2 (motion and box visuals)

Date: 2026-11-12. Auditor: the `a11y-auditor` agent, run as a step of workflow `wf_e69aacc718000e2c`.
Target: `http://localhost:3000/` on the running dev server (not started, restarted or built by this step; `/` and `/app` answered 200), uncommitted working tree on `main` after iteration 3 of `.agents/tasks/marketing-landing-v2/task-landing-round2/verification.md`.
Scope: what round 2 changed. That is the How it works step sync (A8) and the per-step stages, the proof figure next to "Every spoken word matches the keys you pressed", the 4 drawings in "Made for both sides of a conversation", the 5 in "Works the way you type" and the 4 in "Offline unless you choose" (A7 played sequences). I also re-ran the page-wide checks from `docs/a11y/marketing-landing.md`.
Browser: Chromium 157 through the Playwright MCP. Every configuration used a fresh context (viewport, `isMobile` and `hasTouch` for phones and tablets, `reducedMotion`, `forcedColors`, Day through `localStorage` `nl-theme=day`), with service workers blocked. axe-core 4.14.0 from `node_modules`.
Rules: WCAG 2.2 AA; `.kiro/steering/accessibility.md`, `design-system.md`, `product.md`, `trademarks.md`; `design/system/README.md`; `.kiro/specs/marketing-site/requirements.md` (MS-7.3, MS-7.7, MS-7.9, MS-8.7, MS-8.8, MS-8.11 to MS-8.13, MS-9.1, MS-10.5, MS-10.8); design `.agents/tasks/marketing-landing-v2/design.md` (revision 3). On `/`, the website motion tier (ADR-006 as amended, A7 and A8) replaces accessibility rule 5.

This report says what I checked and what I found. It does not state that the page is WCAG compliant or accessible.

## Summary

| # | Severity | Criterion or rule | Where | Finding | Blocks approval |
|---|---|---|---|---|---|
| 1 | moderate | Accessibility rule 3 (one ember thing per screen); MS-7.3 and MS-8.11 hold | `SiteMotion.tsx` play leads; Access, Conversation grids | On tall viewports, drawings in **different rows** play together and show ember rings in 2 or 3 drawings at once: 1,044 ms in total at 1024x1366, 250 ms at 1920x1080, during a slow scroll (about 400 px/s) | no |
| 2 | minor | Accessibility rule 8 (UI graphics 3:1 in Night and Day); WCAG 1.4.11 does not apply (decorative, `aria-hidden`) | `.site-press-ring` on drawn buttons and drawn computer keys, Day theme | Ember press ring on light surfaces is 1.49:1 to 1.81:1 (Night: 8.5:1 to 9.5:1) | no |
| 3 | minor | Design system Key ("letters lead, the digit is small in the corner"); legibility | `KeypadPicture` at 64px (How picture, How step 1 stage, switch drawing) | The digit box overlaps the letters box by 10x9px, and the glyphs touch ("2" sits on the "A") | no |
| 4 | minor | MS-8.11 (a drawing plays where it can be seen) | How step 1 stage and proof figure on short viewports | At 874x330 How step 1 plays with 28px of its well above the viewport, and the proof plays with its last row and closing lines below the fold. At 375x549 the proof caption starts 15px above the viewport | no |
| 5 | minor (carried over) | Forced colors, good practice | `.nl-key` in all key drawings | Keys still lose their shapes in `forced-colors: active` (finding 2 of the previous audit). The Touch drawing then shows two "2 ABC" labels with no visible size difference | no |
| 6 | minor (carried over, exempt) | Rule 1; WCAG 2.5.8 inline exception | `sections/Access.tsx`, "Open an issue on GitHub" | Inline link, 187x22px at 1280 | no |

Nothing I checked fails WCAG 2.2 AA, and nothing breaks a SHALL in the marketing-site spec. Findings 1 to 4 are new. Finding 1 is a design-rule point for the product owner, and the others are minor. **Verdict: approved.**

Previous findings re-checked:

| Was | Now |
|---|---|
| "Hear it" left the Tab order during the automatic play (minor) | Fixed (R3-N6, `aria-disabled`). With motion on, the Tab sequence at 1280x800 and 1024x1366 has 35 stops, "Hear it" included, while the demo autoplays |
| Key drawings lose their edges in forced colors (minor) | Still open; see finding 5. The new rings, scan ring, outlines and proof boxes do show in forced colors (the iteration 2 N9 block) |
| Inline GitHub link (minor, exempt) | Unchanged; finding 6 |

## What passed

### Reduced motion: every section shows its finished state (MS-8.7, MS-8.13)

There were 11 configurations, all with `prefers-reduced-motion: reduce`: 320x568, 375x549 and 390x699 phones; 874x330 phone held sideways; 768x1024, 1133x658 and 1024x1366 tablets; 320x640; 1280x800 Night and Day; 1920x1080. After scrolling to the end of the page in each:

- `data-site-motion` was absent, all 17 `[data-play]` roots had `data-played="instant"`, and `document.getAnimations()` was **empty** (0).
- Every shown `.site-in`, `.site-rise` and `.site-mark` was at opacity 1, and every shown `.site-out`, `.site-during` and `.site-ring` was at opacity 0, with **0 exceptions**. So each drawing rests on its finished state: How at the end of step 3 ("Home", "Speaking", "home" chosen, no placeholder rows), the proof with real chips, digit lines, the boxed digit and both closing lines, and all 13 box drawings. Screenshots `mlv2-<size>-reduce-full.png`.
- Switching to reduce **during** the proof sequence (47 animations running) removed `data-site-motion` and left 0 animations, every drawing `instant` and the proof finished at once (MS-8.8). Screenshots `mlv2-proof-midplay-1280x800.png` and `mlv2-proof-after-reduce-1280x800.png`.

### Motion on: played sequences (A7, MS-8.11, MS-8.13)

I scrolled in 40px steps (about 400 px/s) and recorded the drawing's box at the moment it got `data-played="1"`.

- Played in view: 14 of 14 drawings at 1280x800, 1133x658, 1024x1366 and 1920x1080 (the 3 How stages have no box there). 17 of 17 at 390x699, 320x568, 375x549, 768x1024 and 874x330. None played more than 40px outside the viewport. Drawings taller than the viewport played with their top at most 40px above it. At 1280x800 every box drawing played with its top between 233 and 400px and its bottom at most 593px, and the proof at 114-768.
- None left unplayed. After the last play plus 4.5 s, 0 animations remained on any drawing or on the How picture. The only animations left on the page are the 36 round-1 `site-reveal` fills.
- Keyframes change only `opacity` and `transform`. Every animation had 1 iteration, and the longest single animation was 900 ms (the round-1 fades). There is nothing `infinite`, nothing that loops, and nothing driven by the scroll position.
- Anchor load at `/#access` (1280x800): the proof and the 8 drawings at or above the viewport were `instant` with 0 drawing animations, so nothing in view changed when motion started (MS-8.13).
- Flashing (WCAG 2.3.1): the fastest change is the proof sweep at 240 ms per column. Each spot changes at most once on and once off, the parts are small (32x24px boxes, 3px rings), and the changes are low-luminance fades or single jumps. No pattern comes near 3 flashes a second.
- Pause, stop, hide (WCAG 2.2.2): each sequence ends within 4 s of its trigger. The longest measured was the Model ranking drawing (design upper bound 3.42 s). Only the round-1 hero demo runs longer than 5 s, and it has Stop.

### Motion on: How it works step sync (A8, MS-8.12)

- 1280x800: the active step follows the card under the middle line (step log `0 → 1 → 2 → 3`), and only the active card shows its outline (`::after` opacity 1, the other cards 0). The outline is a change in shape and fill: a 2px `--line-strong` border at 4.89:1 against the card, plus the label turning into the plum key square (12.9:1). It does not rely on colour, and other cards keep full contrast.
- Step 1 played with the whole picture in view: 146-762 of 800 at 1280x800, 26-642 of 658 at 1133x658, and 386-1002 of 1080 at 1920x1080. Steps 2 and 3 played while the picture was stuck (48-664).
- On tall viewports the story is deferred (1024x1366, 1920x1200, 1440x1200): no `data-how-live` at load, and the picture keeps its finished state until step 1 crosses the middle line. Then it goes live and plays with the picture at 506-1122 of 1366, all in view. At 1280x1024 it is live from load, with the picture below the fold.
- Phones and tablets under 1024px: the 3 stages played in order and in view. At 320x568, step 1 played at 142-532 of 568, and its well and keypad were both on screen.
- The placeholder rows (`.site-cand__ghost`) show during step 1 and are gone in the finished state. They are dashed `--line` placeholders at 1.56:1 (Night) and 1.31:1 (Day). They stand in for content that is not there yet and carry no information, so no contrast target applies. Screenshot `mlv2-how-step1-midplay-1280x800(-day).png`.

### Ember (MS-7.3, MS-9.1)

- Ember fills: never more than 1 in the viewport, sampled every 30 ms at all 9 motion-on sizes. Drawings use no ember fill.
- Inside one drawing: never 2 rings at once apart from the 120 ms handovers that MS-7.3 counts as one (How step 1 at 4→6 and 6→3, and the switch drawing's rows).
- In a row of two cards: no overlap at 1280x800, 1133x658, 390x699 or 768x1024. 768x1024 showed one 58 ms overlap between Saved phrases and Spell and My words, which is the cross-fade between the two drawings. Different rows: see finding 1.

### Layout at phone, tablet and desktop sizes

- No sideways scroll at any of the 11 sizes, at 640x400 (200% zoom) or at 320x200 (400% zoom).
- No drawing overflows its stage, the How picture or the proof figure at any of these sizes, at 200% and 400% zoom, or with the WCAG 1.4.12 text-spacing overrides at 320x640, 390x699, 768x1024 and 1280x800. The stages use `min-block-size` and grow. No `overflow: hidden` or `clip` element hides text in any of these runs.
- 874x330 (phone held sideways): `/` scrolls normally with no "Turn your phone upright" (ADR-006).
- Text: the smallest text inside drawings is 16px (`nl-key__digit`, labels moved to `label` in R3-P2), and outside drawings it is 16px. The only exception is the footer caption at 14px, which rule 2 and MS-10.5 allow.
- Targets: every button, standalone link and summary is at least 56x56px at every size. The one exception is finding 6. The drawings contain nothing focusable: 0 focusable elements inside `aria-hidden` at every size.

### Contrast (Night and Day, 1280x800 and 390x699)

- Text inside the stages, the How picture, the proof figure and the How cards: 77 colour combinations at 1280 and 75 at 390, measured against the nearest opaque background. **0 below 4.5:1.** The lowest is 6.53:1 in Night and 6.32:1 in Day (`nl-chip__code`).
- Text that shows only during a sequence also passes. The typing chip word is 8.72:1 in Night and 7.78:1 in Day. "Press a key to start" is 7.84:1 and 6.39:1. "Nothing yet." is 8.72:1 and 7.78:1. "Listening. Ask them to speak now." is 13.56:1 and 14.71:1. The muted proof digits are 7.84:1 and 6.39:1.
- Graphics: the ranking outline is 4.89:1 (Night) and 4.51:1 (Day). Proof sweep boxes and the switch press are 4.4:1 and 3.71:1. The boxed digit is 7.14:1 and 5.26:1. The dashed "This device" boundary is 4.4:1 and 3.71:1. The typing chip's dotted border is 4.4:1 and 3.71:1. Drawn computer keys, layout boxes and the toggle are 4.89:1 and 4.51:1. Ember rings on plum keys are 8.51:1 in both themes. The exception is finding 2.
- Never colour alone (rule 4): the proof states use icon, border style, words and strike-through. The differing digit gets a box and an x. The chosen sentence has a border and a check. The Model ranking outline is a shape. Listen's state is in words.

### axe-core 4.14.0 (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice)

**0 violations** in all 8 runs, each taken after scrolling to the end and waiting for every sequence to finish: 1280x800 Night and Day with reduced motion; 1280x800 Night and Day with motion on; 390x699 phone with motion on; 390x699 phone Day with reduced motion; 768x1024 tablet with motion on; 1133x658 tablet with motion on. `color-contrast` was "incomplete" on 61 to 67 nodes, for the hero gradient as before. My own contrast pass above covers the drawings.

### Keyboard and focus

- Tab order with motion on (1280x800 and 1024x1366): Skip to content, Ninth Life, the 5 section links, Open the app (header), Open the app (hero), See how it works, Hear it, Play the example, Open the app (proof), Open an issue on GitHub, Read the source code, Read the full results, How we measured, the 10 questions, then the footer. That is 35 stops, and 30 on phones (390x699, 320x568) where the section links are hidden. Round 2 adds no stops.
- Every stop had a solid outline of at least 4px, sat fully in the viewport, was not covered (`elementFromPoint` hit it), had no ring clipped, and sat in no ancestor below opacity 1, including while drawings nearby were in their before-play state. The only other stop was `nextjs-portal`, the development overlay, which a production build does not have.

### Screen reader tree (accessibility snapshot, 390x699)

- How it works: a list of 3 steps, each a heading and a paragraph. The pictures and stages are not exposed, and they say nothing the step text does not.
- Proof: `figure "Your keys: 92837"` with a list of three chips ("water, matches your keys. Keys 9 2 8 3 7.", "waves, …", "wafer, does not match your keys, will not be spoken. Keys 9 2 3 3 7."), then "Can be spoken: water, waves. Never spoken: wafer." and the "For example" sentence (MS-7.9). The same tree appears with motion on and off.
- The Conversation, Access and Privacy cards expose only their heading and paragraph. The 13 stages are `aria-hidden`.
- One polite live region (`nl-sr-only`, the demo status), as before.

### Copy

The intended-purpose sentence is present word for word in the footer. None of the words banned by `trademarks.md` appear in the rendered text. The drawing texts I read ("Press a key to start", "Nothing yet.", "Sends the text to the browser maker", "Ranked on this device", and the others) make no banned claim and name no condition. The Voices drawing names no browser maker; only the Listen card text does, as ADR-004 allows.

## Findings

### 1. Ember rings in two or three drawings at once on tall viewports (moderate)

- Rule: accessibility rule 3 ("one ember thing per screen") and design-system "Spooky, but calm". MS-7.3 (one ring per drawing) and MS-8.11 (no overlap within a row of two cards) both hold. Design 3.2 (V39) accepts an overlap between rows only "if a fast scroll brings both to the play line at once".
- Where: the play triggers in `components/site/SiteMotion.tsx` and the leads in `site.css`. It shows in the Access grid (Keyboard, Touch, One or two switches) and the Conversation grid (Show and Flip, Saved phrases, Spell and My words).
- Evidence: ember rings measured on every frame while scrolling at about 400 px/s, which is slow:
  - 1024x1366 tablet: 1,044 ms with rings in 2 or more drawings, and up to **3 at once** (Keyboard + Touch + One or two switches). The pairs were switch + Touch 341 ms, Show and Flip + Saved phrases 269 ms, Keyboard + switch 167 ms and Keyboard + Spell and My words 118 ms.
  - 1920x1080: 250 ms (Keyboard + switch 191 ms).
  - 0 ms at 1280x800, 1133x658, 390x699 and at 1,200 px/s. Both rows of a section fit in the play area together only on tall windows, and those are what the design's "fast scroll" note does not describe.
- Smallest fix: in `SiteMotion`, keep one page-wide "ember busy until" time. When a drawing triggers while another drawing's rings are still due, add the remaining time to that drawing's `--play-after`, as Touch already does for its row neighbour. Most drawings end in about 3.4 s, so this stays inside the 4 s cap for a single wait. Otherwise, record this as an accepted exception and correct the V39 note to say "on viewports tall enough to hold two rows". That is a product-owner decision.

### 2. Day theme: ember press rings on light surfaces are 1.5:1 to 1.8:1 (minor)

- Rule: accessibility rule 8 (UI borders and icons 3:1 in Night and Day). WCAG 1.4.11 does not strictly apply: the drawings are `aria-hidden` pictures, and each card's text says the same thing.
- Where: `.site-press-ring` on `div.nl-btn--secondary.site-drawn-btn` (How Speak, Flip, Save phrase, Add to my words, Listen) and on `.site-kbd` and `.site-kbd-pair` (Keyboard drawing).
- Evidence: 3px inset `rgb(255,177,61)` measured 1.49:1 on `rgb(236,230,250)` and 1.81:1 on white in Day, against 8.51:1 to 9.47:1 in Night. Screenshot `mlv2-conversation-ring-1280x800-day.png` (the Flip ring). The drawn button's own `line-strong` border stays, so the button is visible, but the press itself is faint for low-vision Day users. Rings on plum keys are 8.51:1 in both themes, and the scan ring keeps the Keypad's plum inner line, as the app does.
- Smallest fix: in Day, give the press ring the Keypad scan ring's pairing: the ember ring plus a 2px plum (`--key`) line inside it, for example a second inset `box-shadow`. This is an addition to the "Website drawings" section of `design/system/README.md` before use.

### 3. Digits touch the letters on 64px drawn keys (minor)

- Rule: design system Key component (letters lead, the digit sits small in the corner). This is legibility, not a WCAG failure (the drawings are `aria-hidden`).
- Where: `KeypadPicture` at `KEY_DRAWING_SIZE` (64px). Affected: the desktop How picture, the How step 1 stage and the One or two switches drawing (19 keys at 1280x800, 27 at 320 wide).
- Evidence: on key 2 the digit box is at y 363-379 and the letters box (23.04px type, 32px line) at y 370-402, so they overlap by 10x9px. The glyphs touch: "2" sits on the "A", "6" on the "M", "8" on the "T". Screenshot `mlv2-how-keypad-64px-zoom.png`. At 84px there is no overlap at normal spacing. With the 1.4.12 overrides the overlap is 12x14px at 84px and 12x18px at 67px, though nothing clips. This may predate round 2, but the How picture now puts this keypad at the centre of the section.
- Smallest fix: for the 64px drawing size only, add about 4px of top padding to `.nl-key__letters`, or lower the letters by a quarter line, inside `.site .nl-keypad`. Keep the 64px key size (MS-10.8).

### 4. Tall drawings on short viewports play partly off screen (minor)

- Rule: MS-8.11's intent that a drawing plays where it can be seen.
- Where: `shouldPlay` in `lib/motion.ts` for drawings taller than the play area. Affected: How step 1 stage and the proof figure.
- Evidence, the boxes at the moment of play:
  - 874x330 (phone held sideways): How step 1 at −28..362, with the well, where the typing changes, at −28..54. The proof at −24..630, with its last row at 312-444 and its closing lines at 460-512, both below the fold while they play.
  - 375x549: the proof at −39..615, with its caption at −15..33.
  - 320x568: the proof at −5..675, with its closing lines at 479-531 on screen.
  - A visitor still sees most of each sequence, and nothing is lost: the finished state stays.
- Smallest fix: for a drawing taller than the viewport, play when its top reaches 0 instead of up to one band above. For How step 1 on viewports under about 420px tall, show the finished state instead (`data-played="instant"`). Or accept it for the sideways phone, which is not a target for the app and a minor case for the website.

### 5. Key drawings have no edges in forced colors (minor, carried over)

- Rule: good practice for Windows contrast themes. There is no WCAG 2.2 AA failure, because the meaning is in the text.
- Where: `.nl-key` in `KeypadPicture` and `KeypadDemo`.
- Evidence: in `mlv2-forced-how-1280x800.png` and `mlv2-forced-access-1280x800.png` the keypads show as loose digits and letters. In the Touch drawing the 72px and 128px keys are two bare "2 ABC" labels, so the size difference the drawing is about does not show. The round-2 overlays (press, key and scan rings, ranking outline, proof and digit boxes, step labels) do draw in `CanvasText` or `Highlight`.
- Smallest fix, as before: `@media (forced-colors: active) { .nl-key { border: var(--line-width) solid transparent; } }` in `components.css` (it also affects `/app`, so check `/app` with it), or the same rule scoped to `.site .nl-key`.

### 6. Inline issue link under 56px (minor, exempt, carried over)

"Open an issue on GitHub" is 187x22px at 1280, 1024x1366 and 390x699, and 203x48 at 320 wide. Inline links are exempt under WCAG 2.5.8 and MS-10.4. The product owner declined to change it (R3-N5).

## Not tested here

- Screen readers (VoiceOver, TalkBack, NVDA). I checked the accessibility tree and names, not spoken output. `verification.md` also notes that VoiceOver was not available.
- WebKit and Firefox. The MCP browser is Chromium. `verification.md` reports `ENGINE=webkit` passes of `site.mjs` and `responsive.mjs`.
- Real phones and tablets, real touch scrolling with momentum, notches and safe areas. Phones and tablets were emulated (`isMobile`, `hasTouch`); see `test/e2e/site.mjs` (14 sizes, flick passes) and `test/e2e/responsive.mjs` (24 sizes).
- A real Windows contrast theme. Forced colors were emulated.
- Real browser zoom. 200% and 400% were emulated with 640x400 and 320x200 viewports.
- Changing the reduced-motion preference back to `no-preference` after `still()`. The design says nothing replays, and I did not re-check it.
- `/app`. Round 2 did not change it. `verification.md` reports `responsive.mjs`, `keyboard.mjs`, `switch.mjs` and `spell.mjs` passing.
- Production build, Lighthouse and offline. These need the dev server stopped; `verification.md` iteration 2 reports Lighthouse at 100 in all four categories.

## Files

Screenshots in `docs/a11y/screens/`, prefixed `mlv2-`:

- `<size>-reduce-full.png`: full page, reduced motion, 11 sizes.
- `how-load-<size>.png`: tall viewports at load.
- `how-step1-midplay-1280x800(-day).png`, `proof-midplay-1280x800.png`, `proof-after-reduce-1280x800.png` and `conversation-ring-1280x800-day.png`.
- `how-keypad-64px-zoom.png`.
- `zoom200-640x400.png`, `zoom400-320x200.png` and `spacing-<size>.png`.
- `forced-<section>-1280x800.png`.

The round button at the bottom left of some screenshots is the development overlay, which a production build does not have.
