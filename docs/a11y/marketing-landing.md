# Accessibility audit: the landing page `/` and the app at `/app` (re-audit after review fixes)

Date: 2026-11-10. Auditor: the `a11y-auditor` agent, run as a step of workflow `wf_40182ba43b8e4595`.
Target: `http://localhost:3000/` (dev server, uncommitted working tree on `main`, after the iteration 2 review fixes in `.agents/tasks/marketing-landing/verification.md`) and `http://localhost:3000/app`.
Browser: Chromium 157 through the Playwright MCP. Every configuration used a fresh browser context (viewport, `isMobile` and `hasTouch` for phones and tablets, `reducedMotion`, `colorScheme`, `forcedColors`, theme set through `localStorage` `nl-theme`). Service workers were blocked so every load came from the server. axe-core 4.14.0 from `node_modules`.
Rules applied: WCAG 2.2 AA; `.kiro/steering/accessibility.md`, `design-system.md`, `product.md`, `trademarks.md`; `design/system/README.md`; `.kiro/specs/marketing-site/requirements.md` (MS-1 to MS-13). For `/`, the website motion tier (decisions D6, D6.1, D6.2; ADR-006; MS-8) replaces accessibility rule 5, as the product owner decided.

This report lists what was checked and what was found. It does not state that the page or the app is WCAG compliant or accessible.

Input note: `.agents/tasks/marketing-landing/test-report.md` does not exist. I read the tester's results in `.agents/tasks/marketing-landing/verification.md` instead (all e2e suites in Chromium and WebKit, 336 unit tests, Lighthouse mobile median 100/100/100/100), plus `review.md` and the previous version of this report. This file replaces that previous version, which held back approval on the question-summary spacing.

## Summary

| # | Severity | Criterion or rule | Where | Finding | Blocks approval |
|---|---|---|---|---|---|
| 1 | minor | Accessibility rule 1; WCAG 2.5.8 (inline exception applies) | `components/site/sections/Access.tsx`, "Open an issue on GitHub" | Inline link in a sentence, 187x22px at 1280 wide | no |
| 2 | minor | Forced colors, good practice (no WCAG 2.2 AA failure) | Key drawings (`.nl-key` in the hero demo and section drawings) | In `forced-colors: active` the keys lose their fill and have no edge, so the keypad picture reads as loose letters. The drawings are `aria-hidden` and the caption says the same thing | no |
| 3 | minor | WCAG 2.4.3 / 2.1.1 (pass); usability | Hero demo, "Hear it" | While the automatic play runs (about 6 s, motion on), "Hear it" is `disabled` as MS-6.7 asks, so Tab skips it. A keyboard user who tabs through the hero during that time misses it until the play ends | no |

Previous findings, now fixed and re-checked in the browser:

| Was | Fix in the tree | Measured now |
|---|---|---|
| Question summaries 2px apart (moderate, blocked approval) | `.site-faq { padding-block: var(--space-1); }` | **10px** between all 8 neighbouring summary pairs, at all 14 configurations; every summary at least 56px tall and 288px wide |
| Focus ring cut at the viewport's bottom edge (minor) | `html:has(> body .site) { scroll-padding-bottom: var(--space-2); }` | 0px of ring clipped at top or bottom for every Tab stop in 6 configurations (184 stops in total) |
| Primary button had no edge in forced colors (minor) | `@media (forced-colors: active) { .nl-btn--primary { border: var(--line-width) solid transparent; } }` | Both "Open the app" primaries show a 2px solid system-colour border. Screenshot `ml2-desk-1280x800-forced-colors.png` |

Nothing I checked on `/` failed WCAG 2.2 AA, a hard rule in `accessibility.md`, or a SHALL in the marketing-site spec. The 3 findings above are minor. **Verdict: approved.**

## What passed

### Layout at phone, tablet and desktop sizes

Configurations (Night unless stated): desktop 1280x800 (Night, Day, system + light, motion on), 1920x1080; 320x640 (Night, Day); phone 390x699 (Night reduce, Day motion on), 375x549, 320x568; phone held sideways 874x330; tablet 1133x658 (motion on) and 744x1047. Phones and tablets with `isMobile` and `hasTouch`.

- No sideways scroll at any size: `scrollWidth` equals the viewport width in all 14.
- 874x330: no "Turn your phone upright" notice on `/`; the page scrolls normally (D7, MS-10.3).
- `h1` "Ninth Life" (exactly one) and the header "Open the app" lie fully in the viewport at scroll 0 in all 14 (MS-10.7). The hero "Open the app" is fully in view at 390x699, 744x1047, 1280x800 and 1920x1080, as MS-10.7 asks for portrait sizes 640px tall or more. It is below the fold at 375x549, 320x568, 874x330 and 1133x658 (not required: shorter than 640px or landscape). Note: at 320x640 it starts at y 628 and ends at 692, so only 12px show. 320x640 is not one of the `site.mjs` sizes MS-10.7 is measured on, and the header CTA is visible there.
- Navigation: 5 section links (7 nav links counting brand and CTA) at 744 wide and up; hidden below 720 and at 874x330, where only brand and header CTA show (MS-3.3).
- Targets: every button, standalone link and summary is at least 56x56px at every size. The one exception is finding 1 (inline, exempt). Header CTA 166x56 (138x56 on phones), hero CTA 204x64 (`target-cta`, full width on phones), closing CTA 204x80.
- Text: smallest text outside drawings is 16px everywhere except `.site-footer__caption` (14px `caption`: licence line and intended-purpose statement), which rule 2 and MS-10.5 allow for the website footer. Smallest text inside drawings: 16px (`nl-key__digit`).
- Key drawings: 64 to 84px wide at every size, 64 to 67px at 320 wide (MS-10.5, 10.8).
- Ember: exactly 2 ember fills on the page (hero and closing "Open the app", `.nl-btn--primary`). Header, proof and footer "Open the app" are secondary. Checked every 40px of scroll at every size, with motion on and off: never more than 1 ember fill in the viewport (D6.2, MS-9.1). During the demo play: 1 pressed ring, 0 `is-lit` keys (MS-6.5).

### Day theme and contrast

- `nl-theme=day` switches the body sections to Day while the hero stays Night (D13). Screenshots `ml2-desk-1280x800-day-reduce.png`, `ml2-narrow-320x640-day-reduce.png`, `ml2-phone-390x699-day-motion.png`.
- Text contrast, every visible text colour against its nearest opaque background, 56 combinations per theme at 1280x800: 0 below the required ratio. Lowest: Night 7.84:1 (`--ink-muted` on the demo bar, proof keys, cards), Day 5.84:1 (the GitHub link on a card). Hero text sits on a gradient over `--night`; the gradient is capped at 8% `--moon` (MS-9.2), and the previous audit's worst-case estimate behind the lead was about 6.9:1. axe marks 60 to 65 nodes `color-contrast` "incomplete" for the same gradient reason.
- Control edges (phone, Night): secondary buttons and chips at least 4.4:1. The `.site-card--line` outline is 1.42:1, but it is a card border, not a control or a graphic needed to understand content, so 1.4.11 does not apply.
- Proof states use icon, border style, words and strike-through, never colour alone (rule 4, MS-9.3). The proof list reads "i , matches your keys. Keys 4." and so on.

### axe-core 4.14.0 (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice)

0 violations on `/` in all 7 runs: 1280x800 Night and Day with reduced motion; 1280x800 Night with motion on after the autoplay and a scroll to the end; 390x699 phone with motion on after scrolling to the end; 390x699 phone Day; 1133x658 tablet; 874x330 sideways.

### Keyboard

- Tab order (1280x800): Skip to content, Ninth Life, How it works, Proof check, Ways to type, Privacy, Questions, Open the app (header), Open the app (hero), See how it works, Hear it, Play the example, then the page top to bottom, then the footer: 35 stops. Phones and the sideways phone: 30 stops (the hidden nav links are skipped). The order follows the visual order.
- In 6 configurations (1280x800 Night reduce, 1280x800 Day motion on, 390x699 Day motion on, 1133x658 motion on, 874x330, 375x549), every stop had a solid outline of at least 4px with a 3px offset, the element fully in the viewport, nothing covering it (`elementFromPoint` hit the element), no ring clipped at either edge, and any `[data-reveal]` block around it at opacity 1 (rule 7, MS-8.4, MS-9.4, WCAG 2.4.7, 2.4.11).
- Demo, by keyboard: Enter on "Play the example" plays it, the button reads "Stop" with focus kept on it, and "Hear it" is disabled. At the end, the polite status says "Typed 4 6333 92837. Ninth Life shows: I need water." and focus is on "Play the example again". Space starts it again and a second Space stops it (MS-6.4, 6.6, 6.7, 13.2). The automatic play announced nothing (status empty afterwards).
- Questions are native `<details>`; the earlier audit confirmed Enter and Space open and close them with no script, and the markup is unchanged.

### Links into the app, by keyboard (MS-1.6)

All 5 `<a href="/app">` on `/` (header, hero, proof section, closing section, footer) were reached with Tab only and opened with Enter, at 1280x800 and at 390x699 phone: 10 of 10 did a full document navigation to `http://localhost:3000/app` with status 200 and showed 12 keys. On the desktop runs "Offline dictionary ready" appeared; on the phone runs the same status was checked separately below.

### The app at `/app` (D1)

- `/app` answers 200; `/` answers 200; `/welcome` answers 308 with `Location: /` (D2, MS-1.3).
- Phone 390x699: no page scroll (`scrollHeight` 699 = viewport), all 12 keys on screen, smallest key 76px, Speak 143x64, Menu 104x64, Show 103x64, Clear 56x56 all on screen; status "Offline dictionary ready. Model ranking off."; typing `43556` shows "Hello".
- Phone 375x549: no page scroll, smallest key 72px, Speak, Menu, Show and Clear on screen, "Hello" after `43556`.
- Tablet 1133x658: no page scroll, keys 96px, all controls on screen, "Hello".
- Desktop 1280x800: loads, keys 96px, "Hello".
- 874x330: only "Turn your phone upright" (ADR-003 unchanged).
- axe at 390x699 and 1280x800: 0 WCAG violations; the best-practice note `page-has-heading-one` remains. The app had no `h1` before the move either.
- Screenshots `ml2-app-*.png`.

### Motion, website tier (D6, D6.1, MS-8)

Motion off (`prefers-reduced-motion: reduce`), in all 10 reduced-motion configurations: no `data-site-motion` on `<html>`, `document.getAnimations()` empty at load and after scrolling to the end, all 36 `[data-reveal]` blocks at opacity 1 (MS-8.7).

Motion on (`no-preference`), 1280x800, 1133x658 and 390x699. Animations listed with `getAnimations()` at load:

- A1 `site-fade-in` on `.site-top::before`, 900ms, opacity only, 1 iteration.
- A2 `site-fade-in` on the ninth key's `::after`, 900ms after a 300ms delay, opacity only, 1 iteration (MS-6.9).
- A5 12 `site-frame-*` animations on `ViewTimeline`s, opacity only, keyframes with hard stops (for example `0%, 33.32% { opacity: 1 } 33.33%, 100% { opacity: 0 }`), so frames jump and never blend (MS-8.5). No scroll listener, no snap.
- A4 `site-reveal`: opacity 0 → 1 with `translateY(var(--motion-reveal-distance))` (16px) → none, once per block. After scrolling to the end every block was at opacity 1 and 0 time-based animations were running. With motion on, every reveal block that held focus was at opacity 1. Loading `/#faq` at 1920x1080: the 5 blocks in view were all at opacity 1 within 150ms, with no reveal.
- A3 demo: autoplayed once about 1.2s after load at 1280x800, with "Stop" visible and 1 pressed ring at a time; ended on "Play the example again" and did not play on its own again (MS-6.3, 6.4, 6.5, 8.9).
- Switching to reduce while the page was open removed `data-site-motion`, left 0 animations and every block visible (MS-8.8). Switching back to `no-preference` did not re-run the A1 or A2 fades (MS-6.9).
- A6 `@view-transition { navigation: auto }` and the 250ms root group exist only inside `@media (prefers-reduced-motion: no-preference)` in `globals.css` (MS-8.6). I confirmed the rule, not a watched transition.
- No `infinite` or `alternate` animation in `site.css` or `globals.css`; only `opacity` and `transform` change (MS-8.3, 8.10). The `h1`, lead and logo images have no animation. No flashing: every change is a fade of 600ms or longer or a single jump (WCAG 2.3.1). Only the demo moves on its own for more than 5s, and it has a visible Stop (WCAG 2.2.2).

### Reflow, zoom and text spacing

- 640x400 (200% zoom) and 320x200 (400% zoom), all questions open: no sideways scroll; no element with hidden overflow clips text. Screenshots `ml2-zoom200-640x400.png`, `ml2-zoom400-320x200.png`.
- WCAG 1.4.12 overrides (line height 1.5, letter spacing 0.12em, word spacing 0.16em, paragraph spacing 2em) at 320x640, 390x699 phone and 1280x800, all questions open: no sideways scroll, no clipped text.
- The demo sentence "I need water" uses `white-space: normal` and fits its box at every size; it is never truncated.
- Viewport meta `width=device-width, initial-scale=1, viewport-fit=cover`: zoom is allowed.

### Forced colors

Both primary buttons now show a 2px solid border (`rgb(0, 0, 159)` in the emulated palette); secondary buttons, chips and the demo buttons keep their outlines. Screenshot `ml2-desk-1280x800-forced-colors.png`. The key drawings are finding 2.

### Copy, claims, privacy

- The intended-purpose sentence appears word for word in the footer, and "Is it a medical device?" answers "No. " followed by the same sentence (product.md, MS-4.4). The only match for "treat" in the rendered text is inside that sentence.
- None of the words banned by `trademarks.md` appear in the rendered text; no condition is named as who it is for; no banned claim found.
- Phone 390x699, motion on, scrolled to the end with all questions open: 0 requests to another origin, 0 requests under `/data/`, 0 cookies, `localStorage` and `sessionStorage` empty (MS-2.5, 12.1, 12.2). The service worker was blocked here, so its precache requests were not part of this check.

## Findings

### 1. Inline issue link under 56px (minor, exempt)

- Rule: accessibility rule 1; WCAG 2.5.8 exempts targets inside a sentence, and MS-10.4 exempts links inside a sentence.
- Where: `packages/web/components/site/sections/Access.tsx`, "Open an issue on GitHub".
- Evidence: 187x22px at 1280x800, 1133x658 and 390x699; 203x48px at 320 wide.
- Smallest fix, if wanted: move it into a `.site-links` row. That is a copy and layout decision. Carried over from the earlier reports.

### 2. Key drawings lose their edges in forced colors (minor)

- Rule: good practice for Windows high-contrast users. No WCAG 2.2 AA criterion fails, because the drawings are `aria-hidden` and the visually hidden caption and section text carry the meaning.
- Where: `.nl-key` inside `KeypadPicture` and `KeypadDemo` (hero) and the section drawings.
- Evidence: `ml2-desk-1280x800-forced-colors.png`. The hero keypad shows as a grid of digits and letters with no key shapes.
- Smallest fix: in `components.css`, `@media (forced-colors: active) { .nl-key { border: var(--line-width) solid transparent; } }`, as already done for `.nl-btn--primary`. This also affects the app's keys, so check `/app` with it.

### 3. "Hear it" leaves the Tab order during the automatic play (minor)

- Criterion: WCAG 2.1.1 and 2.4.3 pass (the control is reachable once the play ends, and the order is logical). MS-6.7 requires "Hear it" to be disabled while the demo plays.
- Where: `packages/web/components/site/KeypadDemo.tsx`.
- Evidence: with motion on, the Tab sequence at 1280x800 (Day) and 1133x658 had 34 stops instead of 35; "Hear it" was missing because the autoplay was running (`disabled: true` during the play).
- Smallest fix, if wanted: use `aria-disabled="true"` and ignore presses while playing instead of the `disabled` attribute, so it stays focusable and is announced as unavailable. This still meets MS-6.7's intent; confirm with the spec owner before changing it.

## Not tested here

- Screen readers (VoiceOver, TalkBack, NVDA). I checked roles, names, the live-region text and the accessibility tree, not spoken output.
- "Hear it" audio. I did not press it, so no speech played.
- WebKit (Safari's engine) and Firefox. The MCP browser is Chromium. `verification.md` reports `ENGINE=webkit` runs of `site.mjs` (189 ok) and `responsive.mjs` (181 ok).
- Real phones and tablets, notches and safe areas. Phones and tablets were emulated (`isMobile`, `hasTouch`); see `test/e2e/site.mjs` (14 sizes) and `test/e2e/responsive.mjs` (24 sizes).
- Real browser zoom. 200% and 400% were emulated with 640x400 and 320x200 viewports.
- The demo stopping when it scrolls under 10% in view or the page is hidden (MS-6.4); I checked Stop and the switch to reduced motion.
- A watched cross-document view transition (the CSS rule was confirmed).
- Offline behaviour, the service worker precache and Lighthouse. These need a production build; `verification.md` reports them passing on `next start -p 3202`.
- Switch scanning on `/app` and switch hardware; `switch.mjs` passed in `verification.md`.

## Other note, outside this page

With no saved theme, `prefers-color-scheme: light` alone leaves the site and the app in Night, because `app/layout.tsx` sets `data-theme="night"` by default. That matches the app's behaviour, but `design-system.md` says "Day follows `prefers-color-scheme: light` or the setting", which reads as if the OS setting alone switches it. Worth a wording fix in the steering file or a decision; it is not a landing-page defect.

## Files

Screenshots in `docs/a11y/screens/`, prefixed `ml2-`: one per layout configuration (`ml2-<device>-<size>-<theme>-<motion>.png`), the app (`ml2-app-*.png`), zoom and text spacing (`ml2-zoom200-640x400.png`, `ml2-zoom400-320x200.png`, `ml2-spacing-*.png`) and forced colors (`ml2-desk-1280x800-forced-colors.png`). The round development-overlay button at the bottom left of some screenshots is not part of a production build. The `ml-` screenshots are from the earlier audit run.
