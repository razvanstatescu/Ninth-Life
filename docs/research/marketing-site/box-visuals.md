# Marketing site: visuals for the feature boxes

Research for three grids on the landing page at `/`: "Made for both sides of a conversation" (`#conversation`, 4 boxes), "Works the way you type" (`#access`, 5 boxes) and "Offline unless you choose" (`#privacy`, 4 boxes). Checked **2026-11-11** against the uncommitted working tree on `main`. Part A of this research covers How it works and the proof check; this file does not change them, but section 3 proposes one shared motion rule that part A may also want.

Nothing here is decided. It gives two candidate visuals per box and a recommendation. No product code was changed.

**Sources.** Code: `app/page.tsx`, `components/site/sections/{Conversation,Access,Privacy}.tsx`, `Pictures.tsx`, `KeypadPicture.tsx`, `SiteMotion.tsx`, `motion.ts`, `site.css`, `components/Icon.tsx`, the app sheets (`PartnerTurn`, `PhrasesSheet`, `SpellSheet`, `MyWordsSheet`, `SettingsSheet`, `RotateNotice`). Spec: `.kiro/specs/marketing-site/` (MS-4, MS-7, MS-8, MS-10, MS-11; design.md "Drawings" and "Motion system"; content.md §4-§6). Rules: ADR-006, `.agents/tasks/marketing-landing/decisions.md` (D6, D6.1, D6.2, D13), `design/system/README.md` (Motion), `design/system/components/ProofChip/README.md`, steering `product.md`, `trademarks.md`, `accessibility.md`, `design-system.md`, `privacy.md`. Measurements: the running dev server at 390 and 1280 px wide (Playwright), and `docs/testing/performance.md` (Lighthouse run of 2026-11-10). Mobbin MCP: 5 `search_sections` queries and 1 `search_flows` query. Browser support: MDN browser-compat-data API, read 2026-11-11. References are described in words; no image, icon, animation or other file from them is saved or proposed.

## 1. Summary

The boxes look empty today for two reasons: 9 of 13 boxes have no drawing, and the 4 drawings that exist have different sizes, so rows stretch to the tallest card (at 1280 px the Keyboard and Touch cards are about 490 px tall to match the switch card, with about 350 px of empty space each).

Three proposals apply to every box:

1. **A drawing in every box, built from our own components** (MS-7.1): the real `nl-` classes, tokens and `Icon.tsx`, as HTML and inline SVG. No pictures, no device bodies, no third-party assets.
2. **A fixed "stage" at the top of each card**, the same height across a section, so headings line up and no card looks empty. In "Works the way you type" the switch card becomes a tall tile spanning two rows on tablets and desktops (a bento layout with no change to DOM order).
3. **Each drawing plays once when its card is revealed, then rests on its finished frame.** A new tier entry ("A7, one-time sequences") lets a drawing step through its frames once, by opacity jumps, in at most 4 s, using the reveal trigger `SiteMotion` already sets. It needs no new JavaScript. It needs a small ADR-006 amendment, because the tier today allows drawings to change frames only with the scroll position (A5). Reason: scroll-linked frames freeze wherever the visitor stops scrolling. In the measured page, the Show drawing sat on its upright frame and the scan ring sat on row 2 while the cards were fully in view, so the reader saw a half-told story.

The ban on loops stays. "Micro animation" here means a short sequence that plays once and stops, never an ambient loop (no pulsing mic, no blinking caret, no breathing glow).

Recommended visual per box:

| Section | Box | Recommended visual | Tier |
|---|---|---|---|
| Conversation | They said | The app's They said strip above the sentence well: the other person's line arrives, then the reply | A7 |
| Conversation | Show and Flip | The current Show card, now with Flip drawn pressed, then turned for the person opposite | A7 (today A5) |
| Conversation | Saved phrases | A sentence with Save phrase pressed, then "Your phrases" with that sentence on top | A7 |
| Conversation | Spell and My words | A word chip for a name: New (dashed, plus) → Add to my words pressed → Matches, "In my words." | A7 |
| Ways to type | Keyboard | A legend of drawn keys (`4`, `Enter`, `Backspace`, arrows) with the action beside each, ringed in turn | A7 |
| Ways to type | Touch | Two keys at their true sizes, 72 and 128 px, each tapped once | A7, and an MS-10.8 exception |
| Ways to type | One or two switches | The current keypad plus a drawn switch: rows ringed in turn, a row picked, keys ringed, key 9 picked | A7 (today A5) |
| Ways to type | Your view | The same small sentence and keys drawn twice, Night and Day side by side; keys step from Large to Extra large | A7 |
| Ways to type | Phones, tablets and laptops | Three bare layout boxes (portrait, landscape with keys on the right, wide), no device bodies | A7 |
| Offline | On your device | A dashed "This device" boundary holding what stays there, with the offline chip at its foot | A7 |
| Offline | Model ranking | Off and On side by side: Off ranks on this device (the default); On lists the four things sent | A7 |
| Offline | Voices | Two drawn voice rows: "(en, on this device)" chosen, "(en, online)" with "Sent to the browser maker" | A7 |
| Offline | Listen | The Listen button, then Stop with "Listening" in words, then the other person's line filled in | A7 |

If the product owner declines A7, every recommendation also works under the current tier as a scroll-linked A5 drawing (section 3.2), with the freeze problem above.

## 2. The boxes today

Copy from `content.md`; drawing sizes measured on the dev server (gzip of each drawing's HTML on its own; cards are 358 px wide at a 390 px viewport).

### 2.1 Made for both sides of a conversation (`#conversation`)

Lead: "Ninth Life keeps the other person in view, so a conversation does not stop while a sentence is typed." Grid: 1 column on phones, 2 from 600 px.

| Box | Copy | Visual today |
|---|---|---|
| They said | Type the other person's last line, or press Listen and let your browser turn their speech into text. Listen is off until you allow it. | `SaidBubble`: still pill, `said` icon and "Tea or coffee?" (194 B gzip) |
| Show and Flip | Show puts your sentence in big text. Flip turns it around for the person sitting opposite. | `ShowFrames`: 2 frames, upright then turned 180°, scroll-linked (A5, 319 B gzip) |
| Saved phrases | Keep the sentences you say often. They stay on this device, and only when you press Save phrase. | none |
| Spell and My words | Spell a name or a rare word letter by letter. Add it to My words so you spell it only once. | none |

### 2.2 Works the way you type (`#access`)

Grid `repeat(auto-fit, minmax(288px, 1fr))`: 3 columns at 1280 px, so the row is Keyboard, Touch, Switches and the second row is Your view, Phones and a gap. Below: the Accessibility note (a line card, text only; not one of the 5 boxes).

| Box | Copy | Visual today |
|---|---|---|
| Keyboard | Number keys or the numpad. Enter speaks, Backspace goes back, arrow keys pick a sentence. | none |
| Touch | Large keys, from 72 to 128 pixels. Single taps only: no swipes, no long presses. | none |
| One or two switches | Row and column scanning, from 0.4 to 5 seconds a step, with no time limits. Space or Enter is the switch. | `ScanFrames`: 64 px keypad (240 × 312 px), ring on rows 1, 2, 3, then key 9, scroll-linked (A5, 345 B gzip) |
| Your view | Night or Day theme, large or extra-large keys, and Show for big text. | none |
| Phones, tablets and laptops | On phones and tablets the whole app fits on one screen and never scrolls. Tablets work either way up. Phones work upright: held sideways, Ninth Life asks you to turn the phone and keeps your sentence. | none |

The numbers are product settings, not eval results (72 and 128 are `key-min` and `key-xl`; 0.4 to 5 s is accessibility rule 9).

### 2.3 Offline unless you choose (`#privacy`)

Lead: "Typing, the dictionary and the proof check run in your browser. After one visit the app works with no connection. No account, no cookies, no analytics, no ads." Grid: 2 columns from 600 px, all `site-card--line`.

| Box | Copy | Visual today |
|---|---|---|
| On your device | What you type, the dictionary, your saved phrases and My words. Nothing you say is saved unless you press Save phrase, and then only on this device. | `OfflineChip`: still pill "Offline. Using your dictionary." (256 B gzip) |
| Model ranking, if you turn it on | It is off until you turn it on in Settings. Then Ninth Life sends your keys, the dictionary words that match them, its own best guesses and the other person's last line to {provider.service} to rank the sentences. {region} {retention} Our server logs timings and counts, never your words. | `RankingSwitch`: still toggle drawn Off (135 B gzip) |
| Voices | Speech uses your browser's voices. Voices marked "on this device" keep your words on the device; online voices send the text to the browser maker. | none |
| Listen | Listen uses your browser's speech service. The other person's voice may be sent to the browser maker (Google in Chrome, Apple in Safari) to turn it into text, unless the browser can do it on this device. Ninth Life never receives or keeps the audio. | none |

## 3. Constraints and the motion question

### 3.1 What binds every candidate

- **Motion tier (ADR-006 §4-5, D6.1, MS-8).** Only while motion is on. Only `opacity` and `transform`. Durations, delays and easings are `motion-*` tokens. Banned: animated logo, pulsing, blinking, bouncing, flicker, fog, parallax, marquees, typed-out text, counted-up numbers, any loop, flashes, animation libraries, SMIL, third-party files. Anything moving on its own for over 5 s needs Stop. Reduced motion, no JavaScript or no support: every drawing shows its finished frame; `document.getAnimations()` is empty.
- **Drawings (MS-7).** Built from `nl-` classes, tokens and `Icon.tsx`; `aria-hidden`; nothing focusable; repeat nothing the card's text does not say; drawn buttons are `div`s. The finished state is the last frame, shown by the base styles. Highlights jump, never slide (D6.1); Show turns as a still frame, never an animated rotation.
- **Ember (MS-7.3, MS-9.1).** No ember fill in a drawing. Ember appears only as the Key's 3 px inner pressed ring or the scan ring. A drawn Speak is the outlined secondary button. Guideline used below: at most one ember ring per drawing at a time, and finished frames without ember except where it is the point (the scan ring on key 9).
- **Sizes (MS-10.5, MS-10.8).** Text in drawings at least 14 px; key drawings use `--nl-key` 64 to 84 px whatever the visitor's key-size setting. At a 320 px viewport a card's inner width is 240 px (288 px content minus 2 × 24 px padding), so every drawing must fit 240 px.
- **Pictures (MS-4.3, trademarks.md).** No phone body, no recognizable device, no maker, keyboard-app, OS or browser logo, no other app's UI, no person. Voice names from the system must not appear (drawn voices are generic).
- **Copy (product.md).** Drawing text describes the tool. No banned claims. Sentences that look like Ninth Life output come from the build-time decoder (`finishedSentence(demo)` is "I need water").
- **Budgets (MS-11.2) and headroom** from the 2026-11-10 Lighthouse run: document 17.7 of 32 KB, CSS 8.1 of 16 KB, script 116.8 of 125 KB, total 199.7 of 250 KB, CLS 0.000. Part A and this part share the headroom: about 14 KB of document and 8 KB of CSS.
- **Client components (MS-11.3).** Only `KeypadDemo` and `SiteMotion`. Every proposal here is server-rendered HTML and CSS.

### 3.2 Three ways to make a box drawing move

| Option | How | Fit with ADR-006 today | Trade-off |
|---|---|---|---|
| **A5, scroll-linked frames** (what Show and Scan use now) | `animation-timeline: view()`, frames switch as the card crosses the viewport | Allowed as it stands | No amendment and no script. But the frame depends on where the visitor stops: a reader who stops to read the card sees a middle frame (measured: Show upright, scan on row 2). In a 2- or 3-column row, all drawings switch together while scrolling, which is busier than it needs to be. Card heights shorter than the viewport give a short "contain" range, so frames switch every 100 px or so. |
| **A7, a one-time sequence on reveal** (recommended) | `SiteMotion` already sets `data-revealed="1"` once on each card when it first comes into view. CSS starts the drawing's frame sequence from that attribute; it plays once and ends on the finished frame | Needs an amendment: a time-based drawing sequence is not in the list | Zero JavaScript added, compositor-only, ends on the meaning every time. Cards already in view at load, focused before reveal, or under reduced motion are marked `instant` and show the finished frame with no play. |
| CSS scroll-triggered animations (`animation-trigger`, `timeline-trigger`) | Native "play once when in view" | Would need the same amendment | Chrome and Chrome Android 146 (2026-03-10) only; not in Safari or Firefox ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-trigger), BCD read 2026-11-11). It would bypass `SiteMotion`'s rules (instant blocks, focus, preference changes). Not worth it while A7 gets the same result everywhere from the existing trigger. |
| A per-drawing observer in a client island | `IntersectionObserver` per drawing | Allowed, but a third client component breaks MS-11.3 | More script for what CSS already does. Rejected. |

**Proposed amendment text** (ADR-006 Decision 4, a new bullet; MS-8 gains 8.11; design.md "Motion system" gains A7):

> one-time sequences in drawings: when a card marked for reveal is revealed (A4), a drawing inside it may show its frames once, in order, as opacity changes of `motion-jump` (120 ms, linear), each frame held for `motion-frame` (or `motion-scan-step` for the switch drawing), starting after the card's reveal; the whole sequence takes at most 4 s, ends on the finished frame and never plays again in that page view. A card shown at once (already in view, focused, or motion off) shows the finished frame and plays nothing.

Why it stays inside the reasons behind the tier: it plays once (no loop), under 5 s (WCAG 2.2.2 asks for a pause control only for motion that lasts more than 5 s, [W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)), it changes small areas by opacity (nothing near the WCAG 2.3.1 flash threshold), and it is triggered by scrolling, so reduced motion removes it (WCAG 2.3.3, [W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)).

**New tokens** (in `design/system/tokens.json` first, then `pnpm -F @ninth/web tokens`): `motion-frame` 600 ms (hold per frame), `motion-scan-step` 400 ms (the app's fastest scan speed, so the switch drawing shows a real setting). A unit test asserts that each drawing's frame count × its step is at most 4,000 ms.

**CSS technique** (one pair of keyframes for every sequence, so the CSS cost does not grow per drawing). Each frame gets its index inline, like `--reveal-i` today: `style={{ '--k': 2 }}`. Inside `@media (prefers-reduced-motion: no-preference)`:

```css
/* Sketch, not final. Base styles stay as today: frames stacked in one grid cell, only the last one visible. */
[data-site-motion="on"] [data-revealed="1"] .site-once > * {
  --at: calc(var(--once-start) + var(--k) * var(--once-step));
  animation: site-once-in var(--motion-jump) var(--motion-ease-linear) var(--at) both,
             site-once-out var(--motion-jump) var(--motion-ease-linear) calc(var(--at) + var(--once-step)) forwards;
}
[data-site-motion="on"] [data-revealed="1"] .site-once > :last-child {
  animation: site-once-in var(--motion-jump) var(--motion-ease-linear) var(--at) both;
}
@keyframes site-once-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes site-once-out { from { opacity: 1; } to { opacity: 0; } }
```

Details for the design phase: frame 0 should show from time 0 (so the stage is not empty while the card fades in), so its `in` uses a delay of 0; `--once-start` is `motion-fade` plus a per-card offset of `--reveal-i` × half a `motion-frame`, so cards revealed together do not switch in step; the A5 selectors (`.site-frames > .site-frame--KofN`) must be scoped so they do not also match `.site-once` drawings. When the preference changes to reduce mid-play, `SiteMotion` removes `data-site-motion`, the selectors stop matching, the animations are dropped and the base styles show the finished frame (MS-8.8). Stacked frames share one grid cell, so no frame change moves anything (CLS stays 0). Lighthouse flags animations of non-composited properties ([Chrome](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations)); these change opacity only.

Elements that "arrive" (a new list row, a chip) also change by opacity only. A fade plus a rise of at most 8 px (half the reveal distance) would read more lively; it is a `transform` and allowed by MS-8.10, but it is new vocabulary, so it is listed as an option in each candidate, not assumed.

### 3.3 The stage and the grids

- **Stage.** Each card gets `div.site-stage` (the drawing's box) as its first child, before the `h3`, with one fixed height per section, set from tokens and sized to the tallest drawing at 320 px wide (for example `calc(var(--space-24) * 2)` = 192 px; the design phase measures). The drawing is centred in it. DOM order is the visual order (no CSS reordering); the stage is `aria-hidden`, so screen readers still meet the heading first. Optional: a static dotted ground in the stage (`radial-gradient` of `--line` dots), cheap to paint and still.
- **Ways to type as a bento.** From 1024 px: 3 columns, the switch card `grid-column: 3; grid-row: span 2` (a tall tile with the full keypad); Keyboard and Touch fill row 1, Your view and Phones row 2. Tablet (2 columns): the switch card spans rows 2-3 in column 1. Reading order stays Keyboard, Touch, Switches, Your view, Phones. This removes the half-empty cards. The other four stages stay one height.
- **Conversation and Offline** keep their 2 × 2 grids; with equal stages the rows line up.

## 4. Inspiration

### 4.1 Mobbin (described in our own words; nothing copied)

- **Attio, feature grid** ([1](https://mobbin.com/sites/sections/9038df26-d13c-4c95-98d5-62ba4fd5fad3), [2](https://mobbin.com/sites/sections/6abd0acb-2082-425f-ac46-4c52bd82bcb9)). Six dark cards; the top half of each is the same-height stage holding a line-drawn miniature of the product (rows, chips, a key grid) on faint dotted guide lines; title and one line below. *Take:* equal stages make a grid feel designed even when the drawings differ. Our miniatures are real components, not grey bars.
- **Linear, feature cards** ([features](https://mobbin.com/sites/sections/2754727c-0d9b-426e-8f87-f3bf560afda4), [security](https://mobbin.com/sites/sections/074f5255-b1bb-4c0b-83eb-bdd26b00070c), [keyboard](https://mobbin.com/sites/sections/8b3beefe-4449-4b8c-a498-d6633521e8a8)). Miniatures cropped by the card edge; privacy cards with one icon in a soft concentric halo; a keyboard drawing with one key lit and a row of "key + action" chips beneath. *Take:* the "key + action" pairing for our Keyboard legend. The glowing halos are a glow effect we keep out.
- **Aqua, "Built for the way you work"** ([Mobbin](https://mobbin.com/sites/sections/81997816-d34c-41ef-9747-35119f13d2d9)). A ruled grid of tiles with small mono index labels; each tile holds a quiet miniature: a word list being corrected, a "custom dictionary" field with an add button, a list of saved transcripts. *Take:* close in spirit to Spell and My words and Saved phrases: show the one control that matters (add a word, save a phrase) plus its result.
- **Retool, component tiles** ([Mobbin](https://mobbin.com/sites/sections/0daad8f7-cdde-4ef2-a454-2a26d2bbe0a5)) and **Deel, business sizes** ([Mobbin](https://mobbin.com/sites/sections/fe8fa175-e2b3-4b0e-846c-3392bf916675)). Tiny toggles and checkboxes as the tile picture; a list of rows with one toggle on. **Dropbox** ([Mobbin](https://mobbin.com/sites/sections/80ef1f83-4af7-4469-894e-49e4d60350fc)) shows one "available offline" toggle row. *Take:* the Model ranking drawing can be our real toggle with its On and Off words.
- **Mixpanel, compliance cards** ([Mobbin](https://mobbin.com/sites/sections/4d22bd9a-625d-4eb8-98de-cf47e909d4d1)). A checklist miniature: lines with ticks. *Take:* "On your device" as a short list with check icons.
- **Perplexity, one shortcut** ([Mobbin](https://mobbin.com/sites/sections/30314e51-cae2-4049-8cab-46bdd7a0e5c1)) and **Cycle, bento** ([Mobbin](https://mobbin.com/sites/sections/cec6d26c-c967-4aff-bc76-7e5e5cce4699)). Two large rounded keycaps, glyph in a corner and a small label; a Themes tile with a moon icon and a sun toggle. *Take:* large drawn keys with a corner label match our Key anatomy (letters lead, digit in the corner). Theme shown as two states side by side.
- **Town, messaging features** ([Mobbin](https://mobbin.com/sites/sections/092bb957-5197-48dc-9d11-b0e5dfa4581b)) and **Plain** ([Mobbin](https://mobbin.com/sites/sections/d84b60ea-df64-48e5-a209-b2b6ce9cc79a)). Text on top, a tinted panel below with stacked messages or a voice-note row; stacked notification cards and lists cut off by the card edge. *Take:* the They said and Listen drawings show the exchange, not a feature icon. Our app has no chat bubbles, so we draw its They said strip instead.
- **Framer, "Fully responsive"** ([Mobbin](https://mobbin.com/sites/sections/4de3d936-720d-4384-8ee5-ba5f3c31edaa)). The same page in three bare frames of different widths, side by side, with no device bodies. *Take:* the pattern for "Phones, tablets and laptops" that respects MS-4.3. The device-mockup sections in the same search (Notion, Miro, ClickUp, TIDAL) draw phone bodies and show OS logos: not usable.
- **Cosmos, switching to dark mode** ([flow](https://mobbin.com/flows/e37012a0-e2ef-4cb9-bb03-92dc4c507b12)). The same settings screen in Light and Dark. *Take:* "Your view" as one small UI shown in both themes.
- **Dovetail, privacy cards** ([Mobbin](https://mobbin.com/sites/sections/28d71638-531f-486e-93e4-ce96407a5ea7)). One-colour line illustrations of objects. Not for us: the design system has no illustrations, only our components and icons.

### 4.2 Techniques and practice

- Scroll-driven animations: `animation-timeline` in Chrome 115, Safari 26, Firefox 159 (BCD, 2026-11-11). Scroll-triggered `animation-trigger`: Chrome 146 only (above).
- `@starting-style` (Chrome 117, Safari 17.5, Firefox 129) could fade a frame in from `display: none`, but stacked frames with opacity already do this without layout work; not needed.
- Avoid in drawings: SVG `stroke-dashoffset` "drawing" effects (animates a non-composited property and reads as typed-out lines), animated `box-shadow` or `filter` (non-composited), SMIL (not controlled by CSS media queries), Lottie or video (bytes, licences, reduced-motion work). All already excluded by MS-8.3 and design.md.
- Reduced motion as the base: the finished frame is the default style, and motion is added only inside `prefers-reduced-motion: no-preference` and `[data-site-motion="on"]` (the existing gating). This is the pattern MS-8.7 tests.

## 5. Candidates per box

Format for each candidate: **Shows**, **Moves** (with motion on), **Finished** (what reduced motion, no JavaScript, no support and the end of the sequence show), **Tier** and **Bytes** (gzip). Byte figures are estimates calibrated on today's drawings measured standalone (scan keypad 345 B, Show 319 B, offline chip 256 B, toggle 135 B). The document also carries the server components' RSC payload, so count the HTML figure about twice for the document budget. CSS figures are for drawing-specific styles; the shared A7 rules are about 0.3 KB once.

### 5.1 Made for both sides of a conversation

#### They said

- **A. The They said strip above the sentence (recommended).** *Shows* the app's own layout: a strip with the `said` icon, the label "They said" and the line "What do you need?", and under it the sentence well with "I need water" and its digits (the demo's build-time sentence). *Moves:* frame 1 the strip reads "Nothing yet" (the app's empty state, shortened) and the well is empty; frame 2 the line appears; frame 3 the reply appears in the well. 3 × `motion-frame` = 1.8 s. *Finished:* line and reply both shown. *Tier:* A7 (A5 works as a fallback). *Bytes:* about 350 B HTML, 0.3 KB CSS. *Note:* the drawing line changes from "Tea or coffee?" to "What do you need?" so the build-time reply fits; that is a `content.md` §4 change.
- **B. Two plain message rows.** *Shows* the other person's line on the left with the `said` icon and the spoken sentence on the right with the `speaker` icon. *Moves:* the rows appear one after the other (opacity; optional 8 px rise). *Finished:* both rows. *Tier:* A7. *Bytes:* about 250 B, 0.2 KB CSS. *Against:* the app has no chat bubbles, so this draws something that is not our UI (MS-7.1 asks for our components), and it is close to every messaging site.

Recommendation: **A**. It shows what the card says (the other person stays in view while you type) with the real strip.

#### Show and Flip

- **A. Today's Show card, with the press that causes the flip (recommended).** *Shows* the existing card: label "Show", the sentence in `candidate` type, drawn Done and Flip. *Moves:* frame 1 upright; frame 2 Flip carries the pressed ring; frame 3 the message block is turned 180° (a still frame, as today) with the buttons upright and no ring. 1.8 s. *Finished:* turned. *Tier:* A7 (today it is A5 with 2 frames; frame 2 is new). *Bytes:* +60 B on today's 319 B; no new CSS beyond `site-pressed`, which exists.
- **B. Across a table.** *Shows* the same card with a small "You" label under it and a "Person opposite" label above it, so the reader sees which side reads which way. *Moves:* as A. *Finished:* turned, labels in place. *Tier:* A7. *Bytes:* about 400 B, 0.2 KB CSS. *Against:* two more text labels in a 240 px stage at 14 px; "You" names the reader, which the copy otherwise avoids.

Recommendation: **A**. Smallest change, and the pressed Flip explains the turn.

#### Saved phrases

- **A. Save, then the list (recommended).** *Shows* frame 1: the sentence well "I need water" with a drawn secondary "Save phrase" button (`save` icon). Frame 2 (finished): a "Your phrases" panel of three rows, the new "I need water" on top and two short phrases of our own below ("Thank you", "Yes, please"), each with a quiet drawn Speak (`speaker` icon), as in `PhrasesSheet`. *Moves:* frame 1, then Save phrase gets the pressed ring, then the list replaces it. 1.8 s. *Finished:* the list. *Tier:* A7. *Bytes:* about 450 B, 0.3 KB CSS.
- **B. A stack of phrase rows.** *Shows* three phrase rows offset like a small stack, the top one with a `save` icon. *Moves:* the top row appears last (opacity, optional 8 px rise). *Finished:* the stack. *Tier:* A7. *Bytes:* about 300 B, 0.3 KB CSS. *Against:* the stack is decoration; the app shows a plain list, and B does not show that saving needs a press.

Recommendation: **A**. It draws the one condition the copy stresses: only when you press Save phrase.

#### Spell and My words

- **A. Letter columns.** *Shows* the Spell sheet idea in compact form: five narrow columns, one per key of a name (6 4 4 2 4), each listing that key's letters (`m n o`, `g h i`, `g h i`, `a b c`, `g h i`) with the chosen letter boxed (border plus `surface-sunken`, never colour alone), and above them the word "Mihai". *Moves:* the box steps from column to column (a highlight jump; the letters are visible from the start, so nothing is typed out); then the word above changes from its digits to "Mihai" in one jump. 6 × 600 ms = 3.6 s. *Finished:* all boxed, word shown. *Tier:* A7. *Bytes:* about 600 B, 0.4 KB CSS. *Fit:* 5 × 40 px + 4 × 4 px = 216 px, inside 240.
- **B. The word chip from New to Matches (recommended).** *Shows* the proof chip for the name: "Mihai" with its code 64424 as a **New word** chip (dashed border, plus icon), a drawn secondary "Add to my words" (`plus` icon), and the help line from the app. *Moves:* frame 1 the New chip; frame 2 Add to my words gets the pressed ring; frame 3 the chip is a **Matches** chip (solid border, check icon) and the line reads "In my words." 1.8 s. *Finished:* Matches chip and "In my words." *Tier:* A7. *Bytes:* about 400 B, 0.1 KB CSS (ProofChip styles exist). *Truth check:* the ProofChip README defines New as "encodes to the keys but is not in the dictionary, such as a name", which is exactly this case. `site-data.ts` should assert at build time that the name is not in the shipped dictionary and that `encodeWord` gives the code, as `getProofExample` does for its example (not found in `data/lexicon/en.v1.json` on 2026-11-11).

Recommendation: **B**, optionally with A's columns as a still strip above the chip if the stage height allows. B tells the second half of the copy ("so you spell it only once") with an existing component and links visually to the proof check above it.

### 5.2 Works the way you type

#### Keyboard

- **A. Key legend (recommended).** *Shows* four rows, each a drawn computer key and the action beside it: `4` "types g h i", `Enter` "speaks", `Backspace` "goes back", `←` `→` "pick a sentence" (arrows from the `back` icon, mirrored for the right). Keys are a new drawing element: `surface-sunken`, `line-strong` border, `radius-chip`, label in Atkinson Hyperlegible Mono, at least 40 px tall. *Moves:* each key gets the pressed ring in turn, one at a time. 4 × 600 ms = 2.4 s. *Finished:* the legend with no ring. *Tier:* A7. *Bytes:* about 450 B, 0.4 KB CSS. *Design system:* add the drawn key as a website element in `design/system/` before use (design-system.md: add what is missing first).
- **B. Keys acting on a small screen.** *Shows* a sentence well, two drawn candidates and a row of `4`, `↓`, `Enter`. *Moves:* `4` pressed twice → "hi"; `↓` → candidate 2 selected (check icon jumps); `Enter` → drawn Speak pressed. 3.0 s. *Finished:* candidate selected, Speak drawn. *Tier:* A7. *Bytes:* about 700 B, 0.4 KB CSS. *Against:* repeats the How it works story two sections later, and is busy in 240 px.

Recommendation: **A**. Every key in the copy gets a place, and it reads at a glance.

#### Touch

- **A. Two keys at true size (recommended).** *Shows* the key "2 ABC" twice, at `--key-min` (72 px) and `--key-xl` (128 px), each with its size under it in mono ("72", "128"). *Moves:* the 72 px key gets the pressed ring (one tap), then the 128 px key. 1.8 s. *Finished:* both keys, no ring. *Tier:* A7, plus an **MS-10.8 exception**: MS-10.8 requires drawn keys of 64 to 84 px. Its purpose is that drawings ignore the visitor's key-size setting; these keys still set their size inline, so the intent holds, but the 128 px key breaks the letter of it. *Bytes:* about 250 B, 0.2 KB CSS. *Fit:* 72 + 8 + 128 = 208 px, inside 240.
- **B. One tap per press.** *Shows* three keys at 64 px in a row (2 ABC, 3 DEF, 4 GHI) and under them three short items: `check` "Tap", `x` "Swipe", `x` "Long press". *Moves:* the pressed ring jumps across the three keys, one tap each. 1.8 s. *Finished:* keys and the three items. *Tier:* A7, no other change. *Bytes:* about 450 B, 0.2 KB CSS. *Against:* the `x` items look close to the rejected ProofChip and could blur what that style means.

Recommendation: **A**, with B as the fallback if the MS-10.8 exception is declined. Real sizes are honest and need no explanation.

#### One or two switches

- **A. Scan and select, played once (recommended).** *Shows* today's 64 px keypad (rows ringed with the Keypad's `is-scanning` ring) plus a drawn switch beside or under it: a 56 px circle (the `switch` icon shape) with the word "Switch". *Moves:* row 1, row 2, row 3 ringed in turn; the switch shows "pressed" (a `line-strong` inner ring, so the ember stays on the keypad); key 7, key 8, key 9 ringed; the switch pressed again. 7 × `motion-scan-step` (400 ms) = 2.8 s. *Finished:* key 9 ringed (as today), switch at rest. *Tier:* A7 (today A5 with 4 frames). *Bytes:* +150 B on today's 345 B, 0.2 KB CSS. *Layout:* the tall bento tile (section 3.3), so its 312 px keypad no longer stretches the neighbours.
- **B. Keep scroll-linked, add the switch.** *Shows* as A. *Moves:* with the scroll position, as today, the switch frame added after row 3 and after key 9. *Finished:* as A. *Tier:* A5, as it stands. *Bytes:* as A. *Against:* the freeze problem in section 3.2.

Recommendation: **A**. The drawing then shows the whole method (scan, press, scan, press) at a real setting, 0.4 s a step.

#### Your view

- **A. Night and Day side by side (recommended).** *Shows* the same small piece of the app twice in two halves: the sentence "I need water" in a well and one row of three drawn keys (4 GHI, 5 JKL, 6 MNO). The left half has `data-theme="night"`, the right `data-theme="day"` (the hero already scopes Night this way with `data-theme` on `header#top`; the token rules are attribute selectors that work on any element). Keys stay plum in both, as the design system says. *Moves:* frame 1 Night only; frame 2 both halves; frame 3 the keys step from 64 px ("Large") to 84 px ("Extra large"), both inside MS-10.8. 1.8 s. *Finished:* both halves, 84 px keys. *Tier:* A7. *Bytes:* about 600 B, 0.3 KB CSS. *Fit:* on phones the halves stack (each needs 3 × 64 + 2 × 8 = 208 px), so the stage is taller there; on tablets and desktops they sit side by side if the card is wide enough, otherwise stack. The design phase measures.
- **B. The two settings.** *Shows* two drawn segmented settings, "Theme: Night | Day" and "Keys: Large | Extra large", the chosen segment with a check icon and a stronger border, and a key preview. *Moves:* the check jumps Night → Day, then Large → Extra large, and the preview key swaps size. 1.8 s. *Finished:* the chosen states. *Tier:* A7. *Bytes:* about 450 B, 0.3 KB CSS. *Against:* it shows settings, not what changes on screen.

Recommendation: **A**. It shows the real Day theme on a Night page, which no other drawing does.

#### Phones, tablets and laptops

- **A. Three bare layout boxes (recommended).** *Shows* three plain rounded rectangles in `--surface-sunken` with a `--line` edge: tall (phone, upright), landscape (tablet, keys on the right), wide (laptop). Each holds the same blocks: a sentence bar, two suggestion lines, a keys panel, and an action bar of three small pills with the middle one outlined (Speak, never ember). No notch, camera, buttons, home bar, stand or keyboard deck, so nothing is a device body (MS-4.3). The keys panel is one block, not tiny keys, so MS-10.5 and the Keypad rules (no hidden digits) do not apply. *Moves:* the boxes appear left to right, one per frame (1.8 s). *Finished:* all three. *Tier:* A7. *Bytes:* about 500 B, 0.4 KB CSS. *Fit:* about 40 + 80 + 104 px plus gaps, inside 240.
- **B. One box that reflows.** *Shows* a single layout box. *Moves:* it jumps from the upright to the landscape to the wide arrangement (frames, opacity). *Finished:* the wide one. *Tier:* A7. *Bytes:* about 400 B, 0.3 KB CSS. *Against:* at rest it shows only one size, which is the opposite of the copy.

Recommendation: **A**. A sideways phone with the "Turn your phone upright" notice was considered and dropped: its 14 px minimum text does not fit a box that small, and it would add a fourth box.

### 5.3 Offline unless you choose

#### On your device

- **A. What stays here (recommended).** *Shows* a dashed `--line-strong` boundary labelled "This device" holding four rows with check icons: "What you type", "The dictionary", "Saved phrases", "My words" (the card's own list), and at its foot today's status pill "Offline. Using your dictionary." *Moves:* the rows appear one per frame, then the pill. 5 × 600 ms = 3.0 s. *Finished:* all rows and the pill. *Tier:* A7. *Bytes:* about 450 B (today's pill included), 0.3 KB CSS.
- **B. Connection off, typing still works.** *Shows* a sentence well with "I need water" and its Matches chips, and above it the status pill. *Moves:* frame 1 the pill reads "Online"; frame 2 "Offline. Using your dictionary."; the sentence stays the same in both frames. 1.2 s. *Finished:* offline pill and sentence. *Tier:* A7. *Bytes:* about 500 B, 0.2 KB CSS. *Against:* needs an "online" icon that `Icon.tsx` does not have (add it first), and it illustrates the lead rather than this card.

Recommendation: **A**. It is the card's sentence as a picture and keeps the existing pill.

#### Model ranking, if you turn it on

- **A. Switch on, then what is sent.** *Shows* today's drawn toggle and, under it, four items: "Your keys" with mono digits, "Matching words", "Best guesses", "Their last line". *Moves:* frame 1 Off; frame 2 On (the knob position is a frame swap, never a slide); frames 3-6 the four items appear in turn. 3.6 s. *Finished:* On with the four items. *Tier:* A7. *Bytes:* about 450 B, 0.3 KB CSS. *Against:* at rest it shows the switch On, while the default is Off.
- **B. Off and On side by side (recommended).** *Shows* two small columns. "Off" (labelled "Default"): the toggle off and "Sentences ranked on this device". "On": the toggle on and "Sent to rank:" with the four items. Provider-neutral: the card text names the provider through `providerCopy()` (MS-4.6), so the drawing does not. *Moves:* a `line-strong` outline jumps from the Off column to the On column, then the four items appear in turn. 3.0 s. *Finished:* both columns, no outline. *Tier:* A7. *Bytes:* about 550 B, 0.4 KB CSS. *Fit:* on phones the columns stack. *Wording check:* "Nothing leaves this device" was rejected for the Off column, because online voices and Listen can still send data; "Sentences ranked on this device" is true for the ranking alone.

Recommendation: **B**. The resting picture is honest about the default, and the motion still tells "turn it on, and this is what goes".

#### Voices

- **A. Two voice rows (recommended).** *Shows* a drawn picker list in the app's own label format: "Voice (en, on this device)" with a check icon, and "Voice (en, online)" with a line under it, "Sent to the browser maker". Generic names only: system voice names can carry vendor names (trademarks.md). *Moves:* frame 1 both rows, no choice; frame 2 the check lands on the on-device row; frame 3 the line under the online row appears. 1.8 s. *Finished:* as frame 3. *Tier:* A7. *Bytes:* about 300 B, 0.2 KB CSS.
- **B. Where the words go.** *Shows* the sentence with the `speaker` icon and two short routes beneath it: "On this device" → stays here (check), "Online voice" → the browser maker. *Moves:* the routes appear in turn. 1.2 s. *Finished:* both routes. *Tier:* A7. *Bytes:* about 300 B, 0.3 KB CSS. *Against:* arrows and routes are new drawing vocabulary, and the "on this device" label is what people will actually see in Settings.

Recommendation: **A**. It teaches the label people will meet in the voice picker.

#### Listen

- **A. Listen, Stop, the line (recommended).** *Shows* the They said strip with a drawn secondary "Listen" button (`mic` icon). *Moves:* frame 1 Listen; frame 2 the button reads "Stop" (`stop` icon) and a status line says "Listening" in words (accessibility rule 12: the state in words, not colour or motion); frame 3 the line "What do you need?" is filled in and the button reads Listen again. 1.8 s. *Finished:* line filled, Listen button. *Tier:* A7. *Bytes:* about 350 B, 0.2 KB CSS. *Distinct from They said:* that drawing shows the line above your reply; this one shows the Listen button's states.
- **B. Where the voice goes.** *Shows* the `mic` icon, a box "Your browser's speech service", and the text coming back into the They said strip, with a dashed edge on the service box marking that it may be off the device. *Moves:* the three parts appear in turn. 1.8 s. *Finished:* all three. *Tier:* A7. *Bytes:* about 350 B, 0.3 KB CSS. *Against:* the dashed edge carries meaning the copy has to explain ("unless the browser can do it on this device"), and the same route idea as Voices B.

Recommendation: **A**. It draws the press-to-start rule (Listen is never automatic) that the app enforces.

## 6. Cost of the recommended set

| | HTML (gzip, standalone) | Document (with RSC copy, estimate) | CSS (gzip) |
|---|---|---|---|
| 13 recommended drawings | about 5.5 KB, of which about 1 KB exists today | about +8 to 9 KB | about +3.5 KB, including the shared A7 rules and the stage |
| Headroom (2026-11-10 run) | | about 14 KB of 32 KB | about 8 KB of 16 KB |

No script is added (A7 runs from `SiteMotion`'s existing attribute), no image, font or request. Part A's changes to How it works and the proof check share the same headroom, so the design phase should measure both together with `node scripts/lighthouse.mjs --write` on a production server (with the dev server stopped first, tech.md rule 1). The figures above are estimates from standalone gzip of today's drawings, not measurements of the new page.

Layout shift: every drawing keeps its frames in one grid cell and every stage has a fixed height, so no frame change or arrival moves the page (MS-6.10 and MS-11.2's CLS ≤ 0.02 are about the demo and the page as a whole; this keeps both at 0).

## 7. What would change

If the recommendations are taken:

- **ADR-006** Decision 4: the A7 bullet (section 3.2). Decision 5 is unchanged (loops stay banned).
- **Tokens:** `motion-frame` 600 ms and `motion-scan-step` 400 ms in `design/system/tokens.json`; brand book Motion paragraph lists A7.
- **marketing-site requirements:** MS-7.4 lists the new drawings and their frames; MS-8.5 limits A5 to the drawings that keep it; a new MS-8.11 for A7 (once, ≤ 4 s, ends on the finished frame, none for `instant` cards); MS-10.8 gains one exception for the Touch drawing (or Touch B is used); MS-7.6-style build checks for the Spell name.
- **design.md:** "Drawings" (stage, bento, the drawn computer key, theme halves, layout boxes), "Motion system" (A7 row in the animation table, gating unchanged), test plan rows.
- **content.md:** the drawing texts in §4-§6 (for example "What do you need?" replaces "Tea or coffee?"; the voice and ranking labels above).
- **Design system:** the drawn computer key as a website element; an online icon only if On your device B is chosen.
- **Tests:** unit tests that each drawing's last frame is its finished state and that frame count × step ≤ 4 s; `site.mjs` checks with reduced motion (no animations, last frames only), with motion on (scroll to each grid, wait 4.5 s, only last frames visible, CLS 0), at 320 px (every drawing inside its card), and in Day; axe as today.

## 8. Open points for the product owner

1. **A7, one-time sequences on reveal.** Recommended. Without it, the drawings work as scroll-linked frames (A5) and can rest on a middle frame.
2. **Loops stay banned.** If "micro animation" was meant as small ambient loops (a pulsing mic, a blinking caret), that reopens D6.1, which this research does not recommend: the ban protects people who watch the screen for long periods.
3. **The Touch drawing at true size** needs one exception to MS-10.8, or Touch B is used.
4. **Show and Scan move from A5 to A7.** This changes two drawings that already pass their tests; part A decides separately for How it works and the proof check.
