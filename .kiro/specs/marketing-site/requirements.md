# Requirements: marketing-site

## Introduction
A one-page website at `/` that says what Ninth Life is, shows it working and sends people into the app,
which moves from `/` to `/app`. The page is part of `packages/web` (Next.js 15.1 App Router), statically
rendered, built on the design system, and works on phones, tablets and laptops. It has rich, animated
visuals within a bounded website motion tier, every one of which switches off for people who ask for
reduced motion. The app keeps all its behaviour (web-ui Req 1-26) at its new route and keeps working
offline.

Decisions D1-D15 in `.agents/tasks/marketing-landing/decisions.md` are binding; the trade-offs are in
`docs/decisions/ADR-006-landing-page-at-root.md`. Round 2 (2026-11-11: played sequences, How step sync and a drawing
in every feature box) adds decisions V1-V17 in `.agents/tasks/marketing-landing-v2/decisions.md` and the ADR-006
amendment of that date; it changed MS-7.3-7.5, MS-8.5 and MS-10.8 and added MS-7.7-7.10, MS-8.11-8.13, MS-10.9 and
MS-11.6. The round-2 design review (same date, decisions V18-V24) changed MS-7.2, MS-7.7, MS-7.10, MS-8.3,
MS-8.11-8.13, MS-10.8 and MS-10.9. The second round-2 review (same date, decisions V25-V31) changed the "Play line"
entry of the glossary, MS-7.3, MS-7.7, MS-7.9, MS-8.11 and MS-8.12. The third round-2 review (same date,
decisions V32-V35) changed the "Play line" entry, MS-8.11, MS-8.12 and MS-8.13. Research: `docs/research/marketing-site/`
(`repo-audit.md`, `inspiration.md`, `structure-content.md`). Final copy: `content.md` in this folder.
Steering: `product.md`, `accessibility.md`, `design-system.md`, `privacy.md`, `trademarks.md`,
`data-licenses.md`, `voice.md`, `tech.md`.

Requirement IDs carry the `MS-` prefix so tests can name them without clashing with web-ui's numbers
(`it('MS-6.3 ...')`).

## Glossary
- **Landing page**: the page served at `/`.
- **The app**: the communication screen (`CommunicationScreen`), served at `/app`.
- **Motion on**: the visitor's browser reports `prefers-reduced-motion: no-preference` AND the page's
  boot script has set `data-site-motion` on `<html>` (which needs JavaScript).
- **Finished state**: what a section shows with no motion: the end of every drawing's sequence, every block
  fully visible, the demo showing the whole example sentence.
- **Drawing**: a decorative picture built from our own components, tokens and icons (`aria-hidden`, with the
  one exception in MS-7.2).
- **Frame**: one state of a multi-state drawing. Parts that replace each other are stacked in one box; one shows
  at a time.
- **Sequence**: the ordered changes a drawing plays once (MS-8.11), ending on its finished state.
- **Play line**: the horizontal line 30% above the bottom of the viewport. A drawing **reaches** the play line when
  its whole box is between the top of the viewport and the line, or its whole box is on screen with its top in the
  top 30% of the viewport; for a drawing too tall for that, when its whole box is on screen or its top is at the top
  of the viewport, or at most 30% of the viewport above it, with its bottom at or below the line
  (`shouldPlay` in `motion.ts`; changed 2026-11-11, V25, V32, and review B2 and N1).
- **Middle line**: the horizontal line through the middle of the viewport (MS-8.12).
- **Stage**: the `aria-hidden` box of a set (minimum) height at the top of a feature card that holds its drawing (MS-7.7).
- **Ember fill**: an element whose background is `--ember`. The logo's own ember key does not count:
  it is the brand mark, shown unchanged.
- **Viewport position**: the visible part of the page at one scroll offset.

## Requirement MS-1: Routes and links (D1, D2, D3)
**User story:** As a visitor, I want the address of the product to explain it, and the app one press away,
so that I understand what it is before I start, and people who use it get straight to the keypad.

1.1 WHEN a browser requests `/`, THE web app SHALL answer 200 with the landing page, rendered at build time
    (`force-static`).
1.2 WHEN a browser requests `/app`, THE web app SHALL serve the communication screen with the behaviour web-ui
    Req 1-26 describe for it at `/`.
1.3 WHEN a browser requests `/welcome`, THE server SHALL answer 308 with `Location: /`, AND the `/welcome` page
    file SHALL no longer exist.
1.4 THE `/about` page SHALL stay, its brand link and "Back to the keypad" SHALL go to `/app`, AND its "See the
    demo, the measured results and the source code" link SHALL go to `/`.
1.5 THE app footer's "Back to the keypad" SHALL go to `/app`, AND "How Ninth Life works" in the app footer, in
    the Menu sheet and on `/about` SHALL go to `/`.
1.6 Every "Open the app" control on the landing page SHALL be a plain `<a href="/app">` (a full document
    navigation, not a client-side route change).
1.7 No link, test helper, script, CI step or agent setting that means "the app" SHALL still point at `/`: the
    e2e `openApp` default, `axe.mjs`, `responsive.mjs`, `scripts/perf-check.mjs`, the CI readiness probe, the
    `a11y-auditor` default route and the ship-feature workflow's audit URL SHALL use `/app`.

## Requirement MS-2: Install and offline (D4, D5)
**User story:** As a person who installed Ninth Life or opened it once, I want it to open the keypad and work
with no connection, so that I can talk wherever I am.

2.1 THE manifest SHALL have `start_url` `/app`, `id` `/`, `scope` `/` and `orientation` `any`.
2.2 THE service worker precache SHALL hold the documents `/`, `/app` and `/about` and SHALL NOT hold `/welcome`;
    the rest of the precache SHALL be as web-ui Req 23.4 describes.
2.3 WHILE offline, WHEN a document is requested that is not in the cache, THE service worker SHALL answer with
    `/app`.
2.4 THE service worker SHALL register from every page, including `/`; AFTER one online visit to `/` only, an
    offline load of `/app` SHALL reach "Offline dictionary ready".
2.5 WHEN the landing page loads, the landing page document and its scripts SHALL request no file under `/data/`
    (its demo data is computed at build time); the service worker's precache downloads (MS-2.4) are exempt.
2.6 AFTER one online visit, an offline load of `/` SHALL show the landing page from the precache.

## Requirement MS-3: Structure, landmarks and metadata
3.1 THE landing page SHALL have exactly one `h1` ("Ninth Life") and, in this order, one section per row below,
    each with an `h2` and the `id` given: How it works `how`, the proof check `proof`, In a conversation
    `conversation`, Ways to type `access`, Offline and private `privacy`, Measured, not promised `results`,
    Good to know `limits`, Questions `faq`, Free and open source `source`, the closing call to action `start`.
3.2 THE first focusable element SHALL be "Skip to content", which moves focus to `<main id="main">`; THE banner
    (`<header id="top">`) SHALL hold the brand link, the Main navigation, the header "Open the app" and the hero;
    `<main>` SHALL hold sections `how` to `start`; `<footer>` SHALL follow `<main>`; no content SHALL sit outside
    these landmarks except the skip link.
3.3 THE Main navigation SHALL link to `#how`, `#proof`, `#access`, `#privacy` and `#faq`; WHILE the viewport is
    narrower than 720px, OR is landscape and at most 500px tall, THE navigation links SHALL be hidden AND the
    header "Open the app" SHALL stay visible.
3.4 THE questions SHALL be native `<details>` elements with the question as `<summary>`, all closed when the
    page loads, opened and closed with a press, Enter or Space, with no script.
3.5 THE page SHALL set the title, description and Open Graph and `twitter:card` tags of `content.md`, `lang="en"`,
    no `keywords` tag and no `noindex`; `/robots.txt` SHALL allow every user agent.

## Requirement MS-4: Copy and claims
**User story:** As a visitor, I want plain, honest words, so that I know what the tool does and what it does not.

4.1 THE landing page SHALL show the copy in `content.md`, in sentence case, with plain verbs, digits for numbers
    and no exclamation marks.
4.2 THE page SHALL NOT make any claim on the banned list in `.kiro/steering/product.md` (treatment, recovery,
    therapy; clinical proof, validation, approval, certification, medical device except in the
    intended-purpose sentence; replacing an AAC device, an assessment or advice; numbers not measured by
    `packages/eval`; research results as ours; a model that understands or decides), AND SHALL NOT name a
    condition or diagnosis as who it is for.
4.3 THE page, its file names, identifiers, comments and alt text SHALL contain none of the words listed in
    `.kiro/steering/trademarks.md` (`node scripts/tm-lint.mjs` clean), no device brand or model name, and no
    drawing of a phone body, a recognizable phone model, a maker's, keyboard app's or operating system's logo,
    another app's UI or a person.
4.4 THE footer SHALL show the intended-purpose sentence verbatim from `NOT_A_MEDICAL_DEVICE` in `caption` type,
    AND the answer to "Is it a medical device?" SHALL be "No. " followed by the same constant.
4.5 THE "Good to know" section SHALL list every honest limit in `content.md` §8 AND SHALL come before Questions
    and the closing call to action.
4.6 Provider names and retention text SHALL come from `providerCopy()`, never typed into the page.
4.7 THE page SHALL say "Made for Kiroween 2026. The first version was written with Claude Code by Anthropic; the
    work continued in Kiro." AND SHALL NOT say "Built with Kiro" or "Model ranking has not been measured yet".
4.8 Browser makers (Google, Apple, Chrome, Safari) SHALL appear only as plain words in the Listen privacy copy.

## Requirement MS-5: Numbers (D14)
5.1 THE eval numbers on the page SHALL be read at build time from `packages/eval/RESULTS.json` (configs B0 and B1
    with status `ok`), formatted with one decimal, AND links to `RESULTS.md` ("Read the full results") and the
    method ("How we measured") SHALL sit in the same section.
5.2 IF `RESULTS.json` cannot be read, or B0 or B1 is missing or not `ok`, THEN THE section SHALL say "The eval
    results are not available in this build." AND SHALL show no number.
5.3 THE page SHALL show no accuracy, latency or cost number from a model run and SHALL name no model; WHEN
    `RESULTS.llm.json` holds at least one letter-mode run of a known model whose B4 config is `ok`, AND every such
    run's model belongs to the same provider, THE section SHALL show the model line of `content.md` §7 with the
    sample sizes and the model count read from that file; OTHERWISE it SHALL show no model line.
5.4 THE sentence "These figures come from a simulated typist, not from studies with people." SHALL appear with
    the numbers.
5.5 Numbers SHALL be static text: never counted up, animated or revealed digit by digit.

## Requirement MS-6: Hero and keypad demo
**User story:** As a visitor, I want to see the keypad work on the first screen, so that I understand one press
per letter without reading.

6.1 THE hero SHALL use the Night theme in both themes AND SHALL show the icon (`/icons/icon.svg`, 48px or more),
    the `h1` in `display-xl`, the line, the lead, the primary "Open the app" (the ember fill of its viewport),
    "See how it works" (secondary) and the note.
6.2 THE server HTML SHALL show the demo's finished frame (the whole example sentence, its digits and a `match`
    chip per word); every sentence the demo shows SHALL be output of the offline decoder on the shipped
    dictionary at build time (`decodeGhost`, and `Lexicon.completions` for the word being typed); the keys SHALL
    be an `aria-hidden` picture with a visually hidden caption.
6.3 WHEN motion is on AND the demo has been at least 60% in view for `motion-autoplay-delay` (1,200 ms) AND the
    page is visible AND the visitor has not pressed Play or Stop, THE demo SHALL play the example once; it SHALL
    never play on its own again during that page view and SHALL never loop.
6.4 WHILE the demo plays, its button SHALL read "Stop"; WHEN Stop is pressed, OR the demo falls under 10% in
    view, OR the page is hidden, OR the reduced-motion preference becomes `reduce`, THE demo SHALL stop and show
    the finished frame.
6.5 WHILE the demo plays, THE key being pressed SHALL show the pressed ring (an inner ember ring), never the lit
    style or an ember fill; one key at a time; the sentence and digits SHALL change in jumps, with no typing
    caret.
6.6 WHEN a play that the visitor started finishes, THE demo SHALL announce "Typed {codes}. Ninth Life shows:
    {sentence}." in a polite live region; an automatic play SHALL announce nothing.
6.7 "Hear it" SHALL appear only where the browser has speech; while the demo plays it SHALL be `aria-disabled`,
    stay focusable in the Tab order and ignore presses (review R3-N6); AND it SHALL
    speak the finished sentence only on a press, synchronously in the handler, with `lang` `en` and a voice from
    `pickVoice` (on-device first); no voice name SHALL be shown.
6.8 WHILE motion is off, THE demo SHALL NOT play on its own; "Play the example" SHALL still replay it in jumps.
6.9 WHEN motion is on, THE ember ring on key 9 (the ninth key) SHALL fade in once per page view,
    `motion-fade-slow` (900 ms) after `motion-delay-arrival` (300 ms), and SHALL NOT fade in again after a play of
    the demo; the moon glow behind the hero SHALL fade in once over `motion-fade-slow`; WHILE motion is off they
    SHALL show at once, AND neither SHALL fade in later when the reduced-motion preference changes back to
    `no-preference`. THE `h1`, the lead and the icon SHALL never be animated.
6.10 THE demo box SHALL keep its size while it plays, so nothing on the page moves (no layout shift).

## Requirement MS-7: Drawings
7.1 THE body sections SHALL illustrate with drawings built from `nl-` component classes, tokens and
    `components/Icon.tsx`, as HTML and inline SVG: no raster image, no video, no third-party asset.
7.2 Every drawing SHALL be `aria-hidden`, except the proof figure's ProofChips and its two closing lines (MS-7.9),
    which are the figure's accessible content; every drawing SHALL contain nothing focusable and repeat nothing the
    section's text does not also say.
7.3 A drawing SHALL NOT use an ember fill; ember SHALL appear in drawings only as the pressed ring (the Key's
    3px inner ember ring, on a drawn key, a drawn computer key or a drawn button) or as the scan ring (the
    Keypad's `is-scanning` ember and plum ring), AND a drawing SHALL show at most one ember ring at any moment; a
    handover, one ring fading out over `motion-jump` while the next fades in over the same time, counts as one ring;
    AND WHEN a drawing shows the same key pressed twice in a row, THE second press SHALL be its own ring, starting
    `motion-jump` after the first has gone, so each press shows once. (Changed 2026-11-11; the handover and repeated
    press rules added after the second design review, V29.)
7.4 THE page SHALL have these drawings (changed 2026-11-11, decisions V2-V16 in
    `.agents/tasks/marketing-landing-v2/decisions.md`; parts and steps in `design.md` "Round 2"): How it works (one
    app screen with a sentence well, a drawn Speak, up to three sentence rows and the keypad, acted on by the three
    steps), the proof check (MS-7.9), and in the box sections They said, Show and Flip, Saved phrases, Spell and My
    words, Keyboard, Touch, One or two switches, Your view, Phones tablets and laptops, On your device, Model
    ranking, Voices and Listen.
7.5 THE finished state of every drawing SHALL be what its base styles show with no animation: the end of its
    sequence. (Changed 2026-11-11.)
7.6 THE proof example SHALL be computed at build time with `encodeWord`: the keys are the code of "water", the
    matches are the words whose code equals the keys, and the dropped word's code SHALL differ from the keys.
7.7 Every card in the sections `conversation`, `access` and `privacy` SHALL begin with an `aria-hidden` stage that
    holds one drawing; stages in one section SHALL have the same height (in `access`: stages in one row, the switch
    card's row taking the switch stage's height), set from tokens; each How it works step card SHALL hold a stage of a set height from tokens below 1024px;
    AND no drawing SHALL be larger than its stage, and no part of the desktop How picture or the proof figure SHALL
    overflow its box, at any width from 320 to 1920px or with the XL key setting; text in a drawing SHALL NOT wrap
    where its design gives one line (the How well's "Press a key to start", in `label` type, stays on one line at
    320px and at 1024px); AND a width overflow SHALL be fixed by narrowing the drawing's boxes and gaps, never its
    text. Stage heights SHALL be minimums, so under the WCAG 1.4.12 text-spacing overrides a stage grows instead
    of cutting its drawing off. (New 2026-11-11; How stages, the desktop picture and the proof figure added after the
    design review; the one-line and width rules after the second review, V27, V31; heights as minimums after the
    round-2 review, N8.)
7.8 THE How it works example and the Spell and My words example SHALL be computed at build time: the How drawing
    SHALL show the keys `4663`, the decoder's well text after each press and its top 3 sentences, one of which is
    "home"; the Spell drawing SHALL show "Mihai" with `encodeWord('mihai')`; IF the dictionary is loaded AND "home" is
    not in the top 3 for `4663`, OR "mihai" is in the shipped dictionary, OR a code differs, THEN the build SHALL fail.
    (New 2026-11-11.)
7.9 THE proof figure SHALL keep each word in its own row for the whole sequence: each row SHALL hold the word's
    chip and, `aria-hidden`, its letters over their key digits in the same five columns as the "Your keys" digits,
    with the differing digit of the dropped word boxed and marked with an x; its finished state SHALL show the real
    ProofChips, the line "Can be spoken: {matches}. Never spoken: {reject}." and the "For example" sentence, outside
    `aria-hidden`; the column box that steps across the columns SHALL be drawn inside each digit line (the caption's
    and each row's) and SHALL never cover a chip; THE caption's accessible text SHALL be exactly "Your keys:
    {proof.keys}" with its visible digit grid `aria-hidden`; AND the figure SHALL have no frame labels. (New
    2026-11-11; the column box rule added after the design review, the caption rule after the second review, V31.)
7.10 THE Model ranking drawing SHALL list exactly the items of `RANKING_SENT` in `lib/rankingProvider.ts`, with no
    count and no provider name, AND each item SHALL match a field the model-ranking request carries that holds
    visitor data, in this order: "Your keys" `codes`, "The dictionary words that match them" `lattice`, "Ninth
    Life's own best guesses" `beams`, "The other person's last line" `context.partner` (the protocol fields `v`,
    `lang`, `mode` and `k` carry no visitor data and are not listed; `context.recent` SHALL stay empty); THE Voices
    drawing SHALL use the voice picker's label format with the generic name "Voice" and the wording of the Settings
    help text ("keep your words on the device", "send the text to the browser maker") and SHALL name no browser
    maker. (New 2026-11-11.)

## Requirement MS-8: Motion (website tier, D6, D6.1; ADR-006)
**User story:** As a visitor who may watch a screen for a long time, or who finds motion tiring, I want the page
to be lively only in calm ways and completely still when I ask, so that it is safe to look at.

8.1 THE landing page SHALL animate only WHILE motion is on; the view-transition cross-fade (8.6) SHALL depend only
    on `prefers-reduced-motion: no-preference`. The design system's own state transitions on controls
    (`components.css`: `.nl-key`, `.nl-candidate`, `.nl-btn`, 120 ms, already inside `no-preference`) are exempt.
8.2 Every duration, delay, distance and easing SHALL come from the motion tokens in `design/system/tokens.json`
    (`--motion-*`).
8.3 THE page SHALL NOT animate the logo and SHALL NOT pulse, blink, bounce, flicker, fog, parallax, marquee, type
    out text, count up numbers, loop any animation or flash (WCAG 2.3.1); it SHALL use no animation library, no
    SMIL and no third-party file. A drawn keypad's state changing once per drawn key press (the hero demo and How it
    works step 1: the well text and its digits after each press) is not typing out text.
8.4 WHEN motion is on AND a block marked `data-reveal` first comes into view, THE block SHALL fade in over
    `motion-fade` while moving up by at most `motion-reveal-distance` (16px), once per page view; blocks already
    in view or above it when the page becomes interactive SHALL show at once; a block with focus inside SHALL
    always be fully visible, AND a block that receives focus before it is revealed SHALL then stay visible with
    no reveal animation; the marked blocks SHALL be the ones `design.md` A4 lists, AND no marked block SHALL sit
    inside another marked block; the hero, the closing call to action, logos, the `h1`, the lead and the footer
    SHALL NOT be marked.
8.5 THE page SHALL NOT use scroll timelines (`animation-timeline`, `animation-range`, `view-timeline`,
    `scroll-timeline`, `timeline-scope`), AND SHALL NOT capture, snap or smooth the scroll or listen to scroll
    events in script; drawings move only as MS-8.11 and MS-8.12 describe. (Changed 2026-11-11, ADR-006 amendment.)
8.6 WHEN `prefers-reduced-motion` is `no-preference` AND the browser supports cross-document view transitions,
    a navigation between `/`, `/app` and `/about` SHALL cross-fade over `motion-crossfade` (250 ms); WHEN it is
    `reduce`, no view transition SHALL run.
8.7 WHILE motion is off (reduced motion, no JavaScript, or no support), every section SHALL show its finished
    state, AND `document.getAnimations()` SHALL be empty once the page has loaded and been scrolled to the end.
8.8 WHEN the reduced-motion preference changes to `reduce` while the page is open, THE page SHALL stop every
    animation and show every finished state at once.
8.9 Anything that moves on its own for more than 5 seconds SHALL have a visible Stop (only the demo does).
8.10 Animations SHALL change only `opacity` and `transform`.
8.11 WHEN motion is on AND a drawing marked `data-play` first reaches the play line (30% above the bottom of the
     viewport; "reaches" as the glossary defines it: its whole box between the top of the viewport and the line,
     or on screen with its top in the top 30%; for a drawing too tall for that, its whole box on screen or its top
     at the top of the viewport, or at most 30% of the viewport above it, with its bottom at or below the line),
     THE drawing SHALL play its sequence once:
     each change SHALL fade over `motion-state` with at most `motion-nudge` of rise, OR, for rings, scan highlights
     and marks, jump over `motion-jump`; no change SHALL come earlier than the lead, `motion-play-lead` plus
     `motion-frame` for each column before the card's column in its row (at most 1), plus, for a card whose row
     neighbour's ember rings last longer, the time those rings take (Touch: 4 × `motion-frame-quick`), so no two
     ember rings in a row show together (MS-7.3; changed after the round-2 review, N7), after the trigger, AND every
     change SHALL come a whole number of steps after the lead (t(k) = lead + k × step length; a repeated press's
     ring, MS-7.3, adds `motion-jump`); the last change SHALL come at most 4,000 ms after the trigger; AND THEN the drawing SHALL show its finished state with no
     animation left running or filling on its parts (drawing play rules fill `backwards` only; the arrival fades
     and reveals of MS-6.9 and MS-8.4 are not drawing parts). The `data-play` roots SHALL be the box drawings, the
     proof figure and the How it works per-step stages. (New 2026-11-11, A7; "reaches", the lead and the step
     timing reworded after the second design review, V25, V28, V31; "reaches" changed after the third, V32.)
8.12 WHILE motion is on AND the viewport is 1024px or wider, THE How it works picture SHALL show the state of the
     active step (the number of step cards whose top is at or above the middle line of the viewport; steps not yet
     reached in their start state), AND the active card SHALL show an outline; WHEN a step becomes active for the
     first time in the page view, its sequence SHALL play (MS-8.11 timings, at most 4,000 ms); a step active again,
     or passed before motion started, SHALL show its finished state with no play. THE desktop picture SHALL NOT be a
     `data-play` root; only this step sync SHALL drive it. IF the picture is on screen when motion starts AND no step
     is active yet, THEN the picture SHALL keep its finished state until step 1 first becomes active, AND THEN it
     SHALL show the start of the story and play the step that became active (step 1 unless a fast scroll skipped
     it), with the outline, in the same frame; later steps play as above. IF a step is already active when motion
     starts, or the picture has no box then, THEN every step SHALL show its finished state and none SHALL play in
     that page view, while the outline still follows the active step. From an inner height of 632px, step 1 SHALL
     become active only once the whole picture is in view. (New 2026-11-11, A8; the last sentences added after the
     design review and changed after the second and third reviews, V26, V30, V35.)
8.13 A played `data-play` drawing SHALL never play again in that page view; a `data-play` drawing on screen or
     above it (its top above the bottom of the viewport) when motion starts SHALL show its finished state and never
     play (the desktop How picture follows MS-8.12), so nothing in view
     changes when motion starts (the MS-8.4 rule for reveals); a drawing with no box when motion starts (hidden by
     the layout) SHALL NOT be marked finished and SHALL play the first time it reaches the play line after it is
     shown; WHEN the reduced-motion preference changes to `reduce`, every drawing, including one playing, SHALL show
     its finished state and SHALL NOT play when the preference changes back. (New 2026-11-11; the on-screen and
     no-box rules changed after the design review; scoped to `data-play` roots after the third review, V33.)

## Requirement MS-9: Ember, colour and focus
9.1 AT every viewport position there SHALL be at most one ember fill on screen; the ember fills SHALL be the
    hero's and the closing section's "Open the app"; the header's and the proof section's "Open the app" SHALL
    be secondary buttons.
9.2 THE page SHALL use tokens only (no raw colours), keep text at 4.5:1 and large text, control edges, icons and
    focus rings at 3:1 in Night and Day, AND the hero's gradient behind text SHALL be no lighter than `--night`
    mixed with 8% `--moon`.
9.3 Proof states SHALL be told apart by icon, border style and text treatment, never by colour alone.
9.4 Focus SHALL be visible on every focusable element (4px `--focus`, 3px offset) and never hidden by another
    element.

## Requirement MS-10: Phones, tablets and laptops (D7)
**User story:** As a visitor on any device, I want the page to fit my screen and read well, so that I can learn
about the app on the device I have.

10.1 THE page SHALL use three layouts: phone (under 600px wide), tablet (600 to 1023px) and desktop (1024px and
     wider), as `design.md` describes per section.
10.2 Nothing SHALL scroll sideways at any width from 320 to 1920px, AND the page SHALL stay usable at 200% zoom
     and with WCAG 1.4.12 text spacing.
10.3 ON a phone held sideways, THE landing page SHALL show and scroll normally, with no "Turn your phone upright"
     notice (it meets WCAG 1.3.4); `/app` keeps the notice (ADR-003).
10.4 Buttons, navigation links, standalone links, link rows and question summaries SHALL be at least 56px tall
     and wide, with at least 8px between them; links inside a sentence are exempt.
10.5 Text outside `aria-hidden` drawings SHALL be at least 16px, except the footer's licence line and statement
     (`caption`, 14px); body text SHALL be `body` (17px) or larger. Text inside drawings SHALL be at least 16px (`label`; review
     R3-P2, the product owner's answer: no `caption` inside drawings, accessibility.md rule 2),
     AND every key drawing SHALL use `--nl-key` of 64px or more (so the 4-letter keys' letters are 17px or more).
10.6 Content and controls SHALL stay inside the safe areas (`env(safe-area-inset-*)`) in both orientations.
10.7 ON every size in `test/e2e/site.mjs`, THE `h1` and the header "Open the app" SHALL be visible without
     scrolling; ON portrait sizes 640px tall or more, the hero's "Open the app" SHALL be too. "Visible" means the
     element's bounding box lies fully inside the viewport at scroll offset 0.
10.8 Key drawings SHALL keep their own size whatever key size the visitor picked in the app (the `nl-keysize`
     setting, `data-keysize` on `<html>`): every drawn keypad key (`.nl-key`) SHALL be 64 to 84px wide at every width from 320 to
     1920px, with the XL setting too, EXCEPT the Touch drawing, whose two keys SHALL be exactly `key-min` (72px) and
     `key-xl` (128px) wide under the same conditions. (Exception added 2026-11-11, decision V9.)
10.9 THE box grids in `conversation`, `access` and `privacy` SHALL use columns of at least 288px; `conversation` and
     `privacy` SHALL show one column below 648px AND 2 columns from 648px (a 2 × 2 grid, never 3 + 1), and the
     `privacy` cards SHALL keep their own height (not stretched to a neighbour's); `access` SHALL show one column
     below 648px AND 2 columns of normal cards from 648px at every width, the switch card spanning one row and one
     column with its stage at most `space-6` (24px) taller than its drawing, and the last card spanning both columns
     (changed after the round-2 review, P2 and N6: the switch card was a tall tile);
     THE How it works section SHALL use the sticky picture beside the steps from 1024px AND a stage per step card
     below 1024px (two columns per card from 600px); in every layout the DOM order SHALL be the reading and Tab
     order (no CSS `order`). (New 2026-11-11.)

## Requirement MS-11: Performance and Lighthouse (D8, D9)
11.1 Lighthouse (mobile preset, simulated throttling, a fresh profile each run) on `/` of a production build,
     median of 3 runs, SHALL score Performance 95 or more and Accessibility, Best Practices and SEO 100. The
     desktop preset SHALL be measured and reported the same way, with no target.
11.2 In the mobile run with the median Performance score: the largest contentful paint element SHALL be text;
     cumulative layout shift SHALL be at most 0.02; transferred bytes of the page's own requests (Lighthouse
     `network-requests` items with `sessionTargetType` `page`) SHALL be at most 125 KB of script, 16 KB of CSS,
     32 KB for the document, 60 KB of fonts, 16 KB of images and 250 KB in total; the service worker's requests
     SHALL be reported on a separate line with no budget; there SHALL be no request to another origin, from the
     page or the worker.
11.3 THE landing page SHALL NOT load `styles/app.css`, AND its only client components SHALL be `KeypadDemo` and
     `SiteMotion`.
11.4 `scripts/lighthouse.mjs` SHALL measure against a running production server (default
     `http://localhost:3202/`), SHALL refuse a development server, AND SHALL write the Lighthouse version, preset,
     URL, date, commit, the three runs, the medians and the budget results to `docs/testing/performance.md`.
11.5 THE measurement SHALL never build while a development server runs (`tech.md` rule 1).
11.6 THE server-rendered markup of the landing page, gzipped, SHALL be at most 15 KB, checked by a unit test.
     (New 2026-11-11.)

## Requirement MS-12: Privacy
12.1 THE landing page SHALL set no cookie and write nothing to `localStorage`, `sessionStorage` or IndexedDB; its
     own scripts SHALL only read the theme and key size settings and the motion preference. The only storage a
     visit causes is the service worker's precache of the app (MS-2.4).
12.2 Every request the landing page causes, while loading, scrolling, playing the demo and opening questions,
     including the service worker's precache requests, SHALL go to its own origin; outside links (GitHub) SHALL
     be plain links.
12.3 THE page SHALL need no consent banner and SHALL load no analytics, embed, font, icon or script from another
     origin.

## Requirement MS-13: Accessibility checks
13.1 axe (WCAG 2.0, 2.1, 2.2 A and AA rules) SHALL find no serious or critical violation on `/` in Night and Day,
     at 1280 and 390px, with reduced motion, and with motion on after scrolling to the end.
13.2 With the keyboard only, every control SHALL be reachable in visual order, AND Enter and Space SHALL work the
     demo buttons and the questions.
13.3 Logo images SHALL have `alt=""` beside the visible name "Ninth Life".
