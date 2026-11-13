# Marketing site, motion v2: How it works and the proof visual

Research for two parts of the landing page at `/`: the scroll animation in How it works (`#how`) and the
animated figure beside "Every spoken word matches the keys you pressed" (`#proof`). Checked **2026-11-11**.
Research only: no product code changed. The design phase chooses from the directions below; the tier question at
the end needs the product owner.

**Sources.** The current code (`components/site/Pictures.tsx`, `sections/How.tsx`, `sections/Proof.tsx`,
`SiteMotion.tsx`, `motion.ts`, `site.css`), `.kiro/specs/marketing-site/` (MS-6, 7, 8, 11; design.md §2, §3,
"Motion system"; content.md §2, §3), ADR-006, decisions D6 to D6.2 and D8, `inspiration.md` in this folder,
`docs/a11y/marketing-landing.md`, `docs/testing/performance.md`, `design/system/` (tokens, ProofChip README, the
Motion section) and the steering files. Measurements come from throwaway Playwright scripts run against the dev
server on :3000 (kept in `/tmp`, not committed). Mobbin: 3 `search_sections` queries and 1 `search_screens` query.
Browser support: MDN browser-compat-data 8.1.8 (2026-11-02), read on 2026-11-11. Web pages are linked where they
are used. Every reference is described in words. No screenshot, image, font or animation file from anyone else
was saved or is proposed for shipping.

## Summary

| | Recommendation | Fits ADR-006 today? |
|---|---|---|
| How it works | **H2 now**: fix the timing so each frame shows while its step is read, split each step into 2 or 3 small scroll states (key pressed twice, sentences arriving, Speak turning to Speaking), mark the active step card, and give phones a picture per step. **H3 on top** if the product owner accepts amendment T1: the same states change with short 200 ms fades and 8px rises instead of hard cuts. | H2: yes, with a one-line clarification for the step marker. H3: needs T1. |
| Proof figure | **P2 now**: one stable layout in which every word stays in its row while the check builds up: suggested, turned into keys letter by letter, compared with the differing digit boxed, then the verdict chips and a "Can be spoken" line. **P3 on top** with T1: a one-pass check that sweeps column by column and draws the strike line. | P2: yes. P3: needs T1. |

H2 and P2 are CSS only (no new JavaScript), cost under 1 KB of CSS and about 1.5 to 2.5 KB of HTML after gzip, and
cause no layout shift. H3 and P3 add about 0.5 KB of script to `SiteMotion` and the T1 tokens. Lighthouse
headroom today: script 116.8 of 125 KB, CSS 8.1 of 16 KB, document 17.7 of 32 KB, Performance 100 on mobile
(`performance.md`, 2026-11-10).

## 1. Limits every idea must keep

From ADR-006 §4 and §5, D6.1, D6.2, MS-7.3, MS-8, MS-11:

- Motion only while `prefers-reduced-motion` is `no-preference` and the boot script set `data-site-motion`. With
  reduce, no JavaScript or no support, every drawing shows its finished (last) state from the base styles.
- Allowed now: the hero's arrival fades; one-time reveals (opacity plus at most 16px, 600 ms); **scroll-driven
  state changes in drawings as jumps of opacity** (MS-8.5: "in jumps with no in-between values, changing only
  opacity"); the 250 ms page cross-fade; the hero demo playing once.
- Banned: animating the logo; pulsing, blinking, bouncing, flicker, fog; parallax, marquees, typewriter loops,
  count-up numbers, any looping motion; flashing; animation libraries, SMIL, third-party files or requests.
  Anything that moves on its own for over 5 s needs Stop. Animations change only `opacity` and `transform`.
  Every duration, delay, distance and easing is a `motion-*` token.
- Drawings: built from `nl-` classes, tokens and `Icon.tsx`; `aria-hidden` except the proof's last frame (real
  ProofChips); nothing focusable; no ember fill; ember only as the Key's pressed ring or the scan ring. Proof
  states differ by icon, border style and strike-through, never colour alone. The keypad keeps its fixed layout
  with every digit shown.
- No scroll capture, snapping, smooth scrolling or scroll listeners in script (MS-8.5). Only `KeypadDemo` and
  `SiteMotion` are client components (MS-11.3). CLS at most 0.02 (MS-11.2); the demo and drawings never change
  size (MS-6.10).
- Copy: no banned claims (product.md), none of the words in trademarks.md, no number that is not in
  `packages/eval/RESULTS.md`. The drawings below carry no numbers other than key digits.

## 2. What is there now

### 2.1 How it works

**Build.** `HowFrames` stacks three frames in one grid cell (`.site-frames--how`), each a sentence well or
candidate rows above a 64px `KeypadPicture`: frame 1 well "hi" / "4 4" with key 4 ringed; frame 2 the three
build-time sentences for `44` (`hi`, `ii`, `gi`) with the first chosen; frame 3 well "Hi" with a drawn Speak
carrying the pressed ring (the finished state). On desktop (1024px and up) the picture is `position: sticky`
beside three step cards of `min-height: 40svh`, and the frames follow one named view timeline on the whole list
of steps (`--site-how`, `animation-range: contain 0% contain 100%`), switching at 1/3 and 2/3. Below 1024px the
picture sits above the steps and each frame follows its own `view()` timeline.

**Measured** (Chromium, motion on; offsets are `scrollY`; "middle step" is the step card under the viewport's
middle line):

| Size | Frame 1 to 2 | Frame 2 to 3 | Frame 2 visible for | What the reader sees |
|---|---|---|---|---|
| 1280x800 | y 1222, step 2 at the middle | y 1292, step 2 at the middle | **70px** of scroll | frame 3 ("Speak") while still reading step 2; step 3 brings no change |
| 1920x1080 | y 1242, step 2 | y 1332, step 2 | **90px** | same |
| 820x1180 (tablet) | y 1268 | y 1468 | 200px | all three frames pass while the steps are still below the picture, before any step text is on screen |
| 390x844 (phone) | y 1449 | y 1539 | **90px** | same: the picture runs through all three frames before step 1 reaches the screen |

Why: for a subject taller than the viewport, `contain` covers only (subject height minus viewport height) of
scroll. The list of steps is 1,008px tall in an 800px viewport, so the whole three-frame story runs in 208px. On
phones and tablets the frames follow the picture's own pass through the viewport, and the picture comes before
the steps.

**What is weak, besides the timing:**

1. Nothing in the text column says which step the picture shows. The cards look the same all the time, and each
   is about half empty (the 40svh minimum height is there only to make scroll distance).
2. Each change is a hard cut of the top band only. The keypad is identical in all three frames, so most of the
   picture never changes, and the part that does is swapped whole.
3. The story skips the interesting moments. Frame 1 shows "hi" already typed with one ring; the two presses of
   key 4 are not shown. Frame 2's alternatives "ii" and "gi" are real decoder output but read as noise. Frame 3
   shows a pressed Speak, but the app's own feedback (the button reading "Speaking", `SpeakBar.tsx`) is missing.
4. The frames are bottom-aligned in a 556px box, so in frames 1 and 3 the sticky picture has about 150px of empty
   space above its content.

### 2.2 The proof figure

**Build.** `<figure class="site-proof">` with the caption "Your keys: 92837" and `ProofFrames`: frame 1
"Suggested" (three `nl-chip--typing` chips in a row: water, waves, wafer); frame 2 "Checked" (an unlabelled keys
row, then each word with its code under it, the differing digit of wafer boxed); frame 3 "Dropped" (real
ProofChips stacked in a column, two matches and one struck-through reject, then the "For example..." sentence).
Each frame follows its own `view()` timeline with `contain 0% contain 100%`.

**Measured.** The finished frame appears only when the figure's top is near the top of the viewport: at
1280x800 frame 3 arrives at y 2332 with the figure's top at 92px; at 390x844 with its top at 106px. While the
figure sits in the middle of the screen, where people stop to read, it shows "Suggested" or "Checked". Frame 2
lasts 170px of scroll on desktop and 180px on a phone.

**What is weak:**

1. **Words jump around.** Frame 1 has the words in a row, frame 2 in a list with codes, frame 3 in a column of
   chips. Each cut moves every word to a new place, so the eye cannot follow "wafer" through the check.
2. **The comparison is a table of numbers.** The keys row has no label, the digits are not lined up as columns
   against the keys, and only the one wrong digit is marked. The lead says Ninth Life "turns every suggested word
   back into keys"; the picture never shows a letter turning into a key.
3. **Frame 1 is about 60% empty** (three chips at the top of a 292px box).
4. **The outcome is not shown.** The figure ends on chips. It never shows what that means for the person: the
   two matching words can be spoken, wafer never is.
5. The label "Dropped" names one of three outcomes; two words are kept.

Both drawings are otherwise sound: they meet MS-7 (no ember fill, aria-hidden frames, real chips at the end),
cause no layout shift (CLS 0.000 in the last Lighthouse run) and cost nothing on the main thread.

## 3. Inspiration (described in our own words)

### Step sequences

- **Mural, "Start strong, end smarter"** ([Mobbin](https://mobbin.com/sites/sections/94100049-8b7d-4b4a-a114-bde6f6dd71f5)).
  Five steps in a left column; the current one sits on a filled card with a line of text, the others are single
  plain lines; a large picture on the right changes with the step. *Take:* the text column must show which step
  the picture is on. *Leave:* shrinking the other steps to titles (our step text is the content).
- **incident.io, product areas** ([Mobbin](https://mobbin.com/sites/sections/0e8ee7bc-4aa3-4f1b-805f-89117f5d5d68)).
  Three rows, each led by a tall icon tile; the active row's tile has a coloured outline; a panel on the right
  shows that feature's state. *Take:* mark the active step with an outline (a shape), not a fill and not by
  dimming the others.
- **Seed, "Benefits that build over time"** ([Mobbin](https://mobbin.com/sites/sections/0a635ee3-8326-4ebe-bd7f-89a3230a8d2e))
  and **Airtable** ([Mobbin](https://mobbin.com/sites/sections/611a19af-1426-44bb-8b9a-2e9e99f797d5)). A thin vertical
  rail joins small dots or numbered labels; Airtable puts a small square marker beside the current "01 to 04"
  item. *Take:* a rail with our mono step numbers, the marker jumping from number to number.
- **FOLLOW.ART, card steps** ([Mobbin](https://mobbin.com/sites/sections/c3c85947-b979-45d6-83d5-82cc5d1e2622)).
  A row of ruler-like ticks with "Step 1" marked under the copy. *Take:* progress as discrete ticks. *Leave:* the
  tilted, overlapping cards (movement and rotation).
- **Greptile, "How Greptile reviews every PR"** ([Mobbin](https://mobbin.com/sites/sections/1b166ffd-5b9f-4579-9398-629d9779f7af)).
  Three tiles in a row, each with its own small illustration and a "STEP 01" label. *Take:* on phones each step
  can carry its own picture instead of sharing one sticky picture.
- **Kalstore** ([Mobbin](https://mobbin.com/sites/sections/7b55840d-17ad-4087-938e-b2dae6ad48a5)) stacks large step
  cards that slide over each other while scrolling, and **Graza** ([Mobbin](https://mobbin.com/sites/sections/ee5be1fd-0642-4808-8cf4-ef5c3234a18b))
  places step callouts around one illustration. Both rejected: stacking cards is sliding, and callouts around a
  picture are decoration, not our UI.

### Checks and verdicts

- **Password rules on iOS sign-up screens**: TikTok ([Mobbin](https://mobbin.com/screens/c72bbbd9-787a-4a02-840e-5aa1d2c934d4)),
  ShopBack ([Mobbin](https://mobbin.com/screens/e3b0f40b-cb3a-47d2-a177-4df6a3e3c04d)), PayPal
  ([Mobbin](https://mobbin.com/screens/65774c34-1b59-44ed-b9ab-04adb0b777d1)) and Yubo
  ([Mobbin](https://mobbin.com/screens/8c346992-997d-4aca-a9f0-0368906d7a11)). Each rule is a fixed row that turns
  from an empty circle to a check, in place, as the password is typed; Yubo shows the rules as chips that fill.
  *Take:* the most important property for our figure: **each word keeps its place while its state changes.**
- **Whereby, pre-call checks** ([Mobbin](https://mobbin.com/sites/sections/1f51e176-ec4f-4ff0-abf5-64b087715dcc)).
  A panel headed "Everything looks great" over four tiles, each with a check badge in its corner. *Take:* the
  verdict sits on each item, and one plain line sums it up.
- **GitHub, "See every update"** ([Mobbin](https://mobbin.com/sites/sections/8066bfd7-1230-4234-8176-48902571b731)).
  A side-by-side diff with removed and added rows marked by minus and plus signs as well as colour. *Take:*
  compare like with like in aligned columns, and mark the difference with a sign or a box, not colour alone.
- **Replit, comparison table** ([Mobbin](https://mobbin.com/sites/sections/20381d39-99e1-49cd-9dd8-1e8380ad3ace)).
  One verdict column of checks and another with x marks, one row per item. *Take:* a verdict column reads in one
  glance. *Leave:* the "us versus them" framing.
- **Webflow, auditing tools** ([Mobbin](https://mobbin.com/sites/sections/e9ffe3db-a1e2-49f9-8a54-30be9fd124bc)).
  An audit panel lists issues with a small count at the top. *Take:* a static summary line such as "2 of 3 match
  your keys" (never counted up).
- **Overmind, "Anomaly detection"** ([Mobbin](https://mobbin.com/sites/sections/3a7b8338-2d78-4ced-9d4b-fbe12ac7e393)).
  Shapes stream into a gate and the rejected ones are labelled "Rejects". *Take:* the idea of a gate every word
  passes through. *Leave:* the streaming and falling motion and the pixel-art costume.
- **Framer, version history** ([Mobbin](https://mobbin.com/sites/sections/c809d4ab-d6fb-446e-a6c6-d57e72e5fbda)).
  The current row is bright and older rows fade out. *Leave:* dimmed rows are low-contrast text (accessibility.md
  rule 8, and the "ghost text" ban).

### Practice and platform (web)

- **Scroll-driven animations** are now in all three engines: Chrome 115, Safari 26, Firefox 159 for
  `animation-timeline`, `animation-range`, `view-timeline`, `view-timeline-inset` and `timeline-scope` (Chrome 116)
  (MDN BCD 8.1.8). The demo site [scroll-driven-animations.style](https://scroll-driven-animations.style/) lists
  them as Baseline newly available in October 2026. They run off the main thread for compositor properties
  ([Chrome docs](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)).
- **Named-range keyframes** (`@keyframes { entry 50% {...} }`): Chrome 115, Safari 26, Firefox preview only. Do
  not rely on them.
- **Scroll-triggered animations** (`timeline-trigger`, `animation-trigger`): time-based animations that start when
  an element reaches a scroll range, without script. Chrome 145 according to the
  [Chrome team's post](https://developer.chrome.com/blog/scroll-triggered-animations), listed as Chrome 146 in
  MDN BCD; not in Safari or Firefox; marked experimental on
  [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-trigger). This is the
  native form of H3 and P3 below; today it would give Chrome a different page from Safari and Firefox.
- **`sibling-index()`** (Chrome 138, Safari 26.2, Firefox 154; [CSS-Tricks](https://css-tricks.com/almanac/functions/s/sibling-index/)):
  stagger delays without the inline `--reveal-i`. Not needed now; noted.
- **`scroll-state()` container queries** (Chrome 133 only): no.
- **Duration.** NN/g: most UI animations sit between 100 and 500 ms; simple feedback such as a checkbox is about
  100 ms; larger changes 200 to 300 ms ([NN/g](https://www.nngroup.com/articles/animation-duration/)). Our
  `motion-jump` is 120 ms; a state change of 200 ms is in the same range.
- **Reduced motion.** Write the still state first and add motion inside `no-preference`
  ([Smashing Magazine](https://www.smashingmagazine.com/2021/10/respecting-users-motion-preferences/)); the repo
  already does this. WCAG 2.3.3 calls movement added to scrolling "non-essential" and asks that it can be turned
  off ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)); 2.2.2 applies only to
  motion that starts on its own and lasts over 5 s ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)).
- **Performance.** Lighthouse flags animations that are not composited
  ([audit](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations)); `transform`
  animations do not count as layout shift ([web.dev](https://web.dev/articles/optimize-cls)). Stacked layers that
  change opacity, as today, stay the safe pattern. Every animated element may get its own compositor layer, so
  the number of animated elements is worth keeping modest (the page has 12 animations at load today and 795
  elements in all; the How frames are 147 elements, the proof frames 71).
- **The "middle line" pattern.** Scroll-story libraries decide the active step with an IntersectionObserver whose
  root margin shrinks the viewport to a line across its middle (`rootMargin: '-50% 0px -50% 0px'`); the observer
  fires only when a step crosses that line ([MDN, Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)).
  The CSS equivalent is a view timeline with `view-timeline-inset: 50%`, or the `cover 50%` point of each step,
  which is the moment its centre meets the viewport's centre at any size.

## 4. How it works: three directions

### H1. Fix the timing only (tier as is)

- **What.** One named view timeline per step (`li` 1 to 3: `view-timeline: --how-1 block` and so on, made visible
  to the picture with `timeline-scope: --how-1, --how-2, --how-3` on `.site-how`). Frame 1 needs no animation.
  Frame 2 jumps to opacity 1 at `cover 50%` of step 2 and stays; frame 3 the same on step 3. Each frame gets the
  band's opaque background, so a later frame covers the earlier one and no frame has to hide itself. The switch
  then happens when the step's centre meets the viewport's centre, at every size, scrolling either way. Phones
  and tablets: the same, with the picture placed after step 1's text instead of above all steps, or simply left
  as a still finished frame (see H2 for the better phone answer).
- **Micro animation.** None new.
- **Cost.** About 0.3 KB of CSS gzip, no HTML or JavaScript change, no main-thread work, CLS 0.
- **Verdict.** Necessary but not enough: the frames would finally match the text, but the look stays the same.

### H2. A storyboard of small states, in sync (tier as is) **(recommended base)**

H1's timing plus richer frames and a link between text and picture. Every change is still a jump of opacity
driven by the scroll position.

- **Step 1, "Press one key per letter"**, two scroll states on step 1's timeline: key 4 ringed, well "i" (the
  decoder's reading of a single 4, from `site-data.ts` at build time), digits "4"; then still ringed, well "hi",
  digits "4 4". The ring stays on between the presses, so nothing blinks. If the build-time decode of `4` is not
  "i", show what it returns.
- **Step 2, "Pick the sentence you meant"**, three states: the first candidate row appears, then the other two,
  then row 1 gets the chosen edge and check icon. The keypad stays below, unringed, and the drawn Speak stays an
  idle outline, which shows "choosing a sentence never speaks it".
- **Step 3, "Hear it out loud"**, two states: Speak with the pressed ring; then the same button reading
  "Speaking", as the app's `SpeakButton` does. No sound waves or wavy icon (that would pulse).
- **Active step.** Each card gets a 2px `--line-strong` outline layer and its `01` chip a second layer in the key
  style (`--key` fill, `--on-key` text), both on a pseudo-element or overlay whose opacity jumps on that step's
  timeline (not animated `border-color`, which is not composited and is outside MS-8.10). The other cards stay at
  full contrast. Optionally a thin rail along the left of the steps with the three mono numbers; the marker jumps
  from number to number (three stacked markers, opacity only).
- **Card height.** Cards shrink to their content; the scroll distance comes from `padding-block` on each `li`
  (about 20svh above and below), so there is no half-empty box. The picture's content is centred in its sticky
  box rather than bottom-aligned.
- **Phones and tablets (below 1024px).** No shared picture. Each step card holds its own small picture of that
  step (step 1: well plus keypad; step 2: candidate rows; step 3: well with Speak), with the same sub-states on
  the card's own `view()` timeline, finishing by the time the card's centre reaches the viewport's centre. Only
  step 1 carries a keypad, so the duplicate markup is one 12-key drawing. The desktop sticky stack and the phone
  pictures are each `display: none` at the other size.
- **Example content.** "ii" and "gi" are honest decoder output but weak. Two options for content.md (copy owner):
  keep `44` and show only the top 2 sentences, or switch the drawing and step 1 text to a word whose readings are
  all common words (for example 4663, which a 9-key dictionary reads as good, home or gone; confirm the order with
  `getHowData` at build time and show what it returns). The second explains step 2 much better but changes
  content.md §2, MS-7.4 and the `site-data` test.
- **Cost.** CSS about 2.5 KB raw, under 1 KB gzip (8.1 of 16 KB used). HTML about 4 to 6 KB raw, about 1 to 1.5 KB
  gzip (17.7 of 32 KB used), about 60 to 90 more elements. JavaScript 0. Main thread: none at load or scroll;
  opacity animations on scroll timelines are composited. CLS 0: every layer shares its cell, and nothing changes
  size. The number of scroll-linked animations rises from 12 to about 25 on the page.
- **Tier fit.** Fits ADR-006 §4 ("scroll-driven state changes in drawings, as jumps of opacity") as written. The
  active-step outline is a state change next to a drawing rather than inside one; ADR-006 and MS-8.5 should say
  so in one line ("in drawings and on the step cards beside them"). It is not a new kind of motion.
- **Reduced motion.** Each picture shows its last state (desktop: frame 3 with "Speaking"; phones: each step's
  finished picture); no card is marked active. The finished desktop picture should then read as the end of the
  story, which "Hi" plus "Speaking" does.
- **Risk.** More states per pass means more changes while scrolling fast. Each change is a small area (a row, a
  label), far below the WCAG 2.3.1 flash area, but keep each step to at most 3 states.

### H3. Short transitions on each state change (needs amendment T1) **(recommended if T1 is accepted)**

Same markup as H2. The difference is how a state arrives: instead of a cut, a 200 ms fade, rows rising 8px with
an 80 ms stagger, the chosen edge fading in, "Speak" cross-fading to "Speaking".

- **Mechanism.** Scroll timelines cannot ease a jump in time: a scroll-linked fade is either a cut or a ramp that
  stops half-way when the visitor stops scrolling. Time-based transitions need a state to change. Two ways:
  - `SiteMotion` gains one more IntersectionObserver with the middle-line root margin over the How steps (and the
    phone step cards). On a crossing it sets `data-how-step="1|2|3"` on `.site-how`; CSS transitions do the rest.
    Sub-states inside a step run as a short timed chain (for example the second press 400 ms after the first),
    under 1 s, started by that state change. Script cost about 0.4 to 0.6 KB minified, a few callbacks per pass,
    no scroll listener. Works in every browser that has IntersectionObserver, including Safari 18, which today
    shows only finished frames because scroll timelines arrived in Safari 26.
  - CSS scroll-triggered animations would do the same with no script, but only in Chrome today. Revisit when
    Safari and Firefox ship them; the IO can then go.
- **Cost.** JavaScript about 0.5 KB gzip at most (8.2 KB left in the budget). CSS similar to H2. Main thread: one
  attribute write and a style recalculation of the section on each crossing, well under 1 ms. CLS 0 (transform
  and opacity only, frames keep their cells).
- **Tier fit.** Needs T1 (section 6). It also changes MS-8.5's "jumps with no in-between values".
- **Reduced motion.** Identical to H2: `SiteMotion` does not run the observer, no attribute is set, and the base
  styles show the finished state.
- **Rejected inside this direction:** a typing caret (typewriter), a speaker with animated waves (pulsing,
  looping), zooming or tilting the sticky picture (scale morph, closer to parallax), a continuously filling
  progress bar on the rail (a scroll-scrubbed ramp; also needs an amendment for little gain).

**Recommendation for How it works.** Build H2: it fixes the measured timing fault, links text and picture, and
shows the real moments of the interaction, all inside the tier. Ask the product owner for T1; if accepted, add H3's
transitions on the same markup. If T1 is declined, H2 stands on its own.

## 5. The proof figure: three directions

### P1. Retune only (tier as is)

- **What.** Keep the three frames but put the words in the same place in every frame: three rows, one per word,
  in all frames (frame 1 plain word, frame 2 the word with its code and the boxed digit, frame 3 the ProofChip).
  Change the range so the finished frame lands when the figure's centre reaches the viewport's centre (for
  example `cover 15%` to `cover 50%`), not when it is about to leave. Rename "Dropped" to "Checked" or remove the
  labels.
- **Cost.** About 0.2 KB of CSS gzip, a small HTML change, no JavaScript, CLS 0.
- **Verdict.** Removes the two worst faults (jumping words, late finish) but the comparison stays a table of
  numbers.

### P2. Letters turn into keys, in place (tier as is) **(recommended base)**

One stable layout that builds up. Every part is present in the DOM from the start in its final place; motion only
hides the later parts until their state (additive layers, opacity jumps).

```
Your keys        9  2  8  3  7
water  ✓         w  a  t  e  r
                 9  2  8  3  7        matches
waves  ✓         w  a  v  e  s
                 9  2  8  3  7        matches
wafer  ✗         w  a  f  e  r
                 9  2 [3] 3  7        does not match
Can be spoken: water, waves. Never spoken: wafer.
```

(A sketch of the structure only; at 320px the verdict sits on the chip line above the letters, see below.)

- **Header.** "Your keys" with the five digits in five fixed columns (the figcaption, still the accessible text).
- **Rows.** Each word is a row: the ProofChip on top (the real chip, the accessible content) and an `aria-hidden`
  grid under it with the word's letters in the same five columns and each letter's key digit beneath. The
  differing digit keeps today's box (`site-digit--diff`, a shape cue) and gains a small x icon under it. Matching
  digits stay plain; the chip's word ("matches") carries the match state, so nothing rests on colour.
- **States**, on the figure's timeline, finishing when its centre meets the viewport's centre:
  1. *Suggested*: the three words in their rows, chips in the neutral typing style.
  2. *Turned into keys*: the digit line appears under every word.
  3. *Compared*: the boxed digit and its x appear on wafer.
  4. *Checked* (finished): the chips switch to their match and reject states (check, x, strike-through), and the
     closing line appears: "Can be spoken: water, waves. Never spoken: wafer." followed by today's "For
     example..." sentence.
  The chip's change is two stacked chips in one cell (typing and final), opacity only.
- **Small screens.** At 320px the figure's inner width is about 240px; five 32px columns with 8px gaps take 192px.
  The verdict stays on the chip line, so no row needs more width.
- **Copy (decorative drawing text, for content.md):** labels "Suggested", "Turned into keys", "Compared",
  "Checked" (or no labels and a static step counter), and the closing line above. It repeats what the lead and the
  legend say, as MS-7.2 requires, and matches the app's own words ("can be spoken", "will not be spoken" in
  `ProofPanel.tsx`). No claim on the banned list, no number other than key digits.
- **Ember.** None. A column marker, if one is used, is a `--line-strong` box, not the scan ring (MS-7.3 allows
  ember only as the pressed ring or the scan ring of a keypad).
- **Cost.** HTML: 15 letter cells and 15 digit cells plus 3 more chips, about 2.5 to 3.5 KB raw, under 1 KB gzip,
  about 50 to 70 more elements than today. CSS about 1.5 KB raw, about 0.5 KB gzip. JavaScript 0. Main thread:
  none. CLS 0. The figure grows from about 384px to about 430 to 470px tall, decided once by the server HTML.
- **Tier fit.** Fits as written: scroll-driven jumps of opacity in a drawing.
- **Reduced motion and no JavaScript.** Everything visible: chips in their final states, the grid with the boxed
  digit, the closing line. That is a better finished state than today's, because the comparison stays on screen.
- **Accessibility.** Screen readers get the caption, three ProofChips ("water, matches your keys") and the two
  sentences, the same as today. The letter grid is `aria-hidden` and adds nothing the text does not say. Text in
  the grid stays at 14px or more (MS-10.5).

### P3. A one-pass check (needs amendment T1) **(recommended if T1 is accepted)**

P2's layout, with the check played as a short sequence the first time the figure's centre crosses the middle
line, instead of being scrubbed by scroll:

- the digit lines fade in row after row (80 ms stagger, 200 ms each);
- a `--line-strong` column box steps across the five columns, 120 ms per column, jumping (as the app's scan
  highlight jumps), and stops on column 3, where wafer's digit gets its box and x;
- the chips change state one after another, and wafer's strike line draws from left to right (`scaleX` 0 to 1,
  200 ms, a transform);
- the closing line fades in last.

Total about 1.6 s, under the 5 s of WCAG 2.2.2, never looping. It plays once per page view, like the reveals; if
the figure is above the line when motion turns on, it shows the finished state at once. Scrolling back does not
replay it.

- **Mechanism.** The figure is already a reveal block, but reveals fire when it enters the bottom 10% of the
  viewport, too early for a sequence. `SiteMotion` would observe it on the middle line (shared with H3's observer)
  and set `data-checked` once; the CSS sequence keys off that attribute. Same script cost as H3, shared.
- **Cost.** JavaScript shared with H3 (about 0.5 KB gzip for both). CSS about 0.5 KB gzip more than P2. CLS 0.
- **Tier fit.** Needs T1: a time-based sequence inside a drawing, with the strike as a transform animation. The
  column box jumping is already allowed ("highlights jump").

### Rejected for the proof figure

| Idea | Why not |
|---|---|
| Words streaming into a gate, the wrong one falling out (the Overmind pattern) | Sliding and dropping movement (ADR-006 §5), and it hides where the word went |
| The rejected row collapsing or leaving the list | Layout change (CLS) and sliding; the app keeps rejected words visible, struck through |
| Dimming wafer after the check | Low-contrast text (rule 8); strike-through plus the x already says it |
| A word's code sliding up to overlay the keys row | Movement over 16px; aligned columns compare without moving anything |
| Showing "checked on the server and again in your browser" as two animated ticks | True only with model ranking on; the copy says it in words already, and a picture could suggest it always happens |
| A pulsing glow on the match chips | Pulsing |

**Recommendation for the proof figure.** Build P2: words keep their place, letters visibly turn into keys, the
outcome ("Can be spoken... Never spoken...") is part of the picture, and the finished state arrives while the
figure is in the middle of the screen. Inside the tier, no JavaScript. With T1, add P3's one-pass check on the
same markup.

## 6. The tier question

**What fits today.** H1, H2, P1 and P2 use only scroll-driven jumps of opacity in drawings, plus one clarification
for the How step cards (state on the cards beside a drawing, not only inside it). That clarification is wording,
not a new kind of motion; it still needs a line in ADR-006 §4 and MS-8.5.

**What needs an amendment.** H3 and P3 add time-based transitions when a drawing's state changes. Proposed
amendment **T1, "short state transitions in drawings"**, for the product owner:

> In drawings, and on the step cards beside them, a change of state caused by the visitor's scroll position may
> arrive as a transition of opacity, a move of at most `motion-nudge` (8px) or a line drawn with `scaleX`, each
> lasting at most `motion-state` (200 ms) with `motion-ease-out`; parts of one change may follow each other at
> `motion-stagger` (80 ms), and one change finishes within 2 s. It never starts on its own, never loops and never
> runs while the visitor is not scrolling past it, except for finishing a change already started. The proof check
> runs once per page view. With reduced motion, no JavaScript or no IntersectionObserver, the finished state shows.

What T1 does not change: every ban in ADR-006 §5 and D6.1 (no pulsing, blinking, bouncing, parallax, loops,
typewriter, count-up, flashing, libraries); opacity and transform only (MS-8.10); no scroll listeners, snapping or
smooth scrolling; highlights in key and scan drawings still jump; one ember fill per viewport; finished states
for reduced motion.

Why it is a reasonable step: the website already allows a 600 ms fade with a 16px move for reveals. T1 asks for
shorter (200 ms) and smaller (8px) moves, tied to the visitor's own scrolling, which WCAG 2.3.3 treats as motion
from interaction that reduced motion must remove (it would). It is still far from option C of ADR-006 (free
motion).

Why the product owner might decline it: it adds a third kind of website motion to test and explain, and it makes
the site move more than the app, whose users are the same people. H2 and P2 alone already fix every measured
fault.

**If T1 is accepted, these change:** ADR-006 (a dated amendment section), D6 (a new row), MS-8.5 (scroll state may
arrive with T1 transitions), a new MS-8 item for T1 and its once-per-view rule for the proof, MS-7.4 (frame and
state counts, example content), MS-11.3 unchanged (the observer lives in `SiteMotion`), `tokens.json`
(`motion-state` 200ms, `motion-nudge` 8px, then `pnpm -F @ninth/web tokens`), the brand book's Motion section,
`design-system.md` "Spooky, but calm", `accessibility.md` rule 5's website clause, and the `a11y-auditor` website
check.

**Tests either way:** `site.mjs` gains a sync check (at the centre of each How step, at 1280x800, 1920x1080 and
1024x768, the picture shows that step's state) and the proof check moves from "frame 3 at the end of the pass" to
"finished when the figure's centre is at the viewport's centre"; `site.test.tsx` updates the frame counts of
MS-7.4 and keeps the MS-7.2 aria-hidden checks; `site-css.test.ts` keeps "timelines only inside `@supports`" and
"the finished state shows from the base styles". With T1: the MS-8.9 check (nothing running on the document
timeline for over 5 s) covers the new sequences, and the reduced-motion run still expects
`getAnimations().length === 0`.

## 7. Open points

1. T1: accept, or keep the tier as is (then H2 and P2 only).
2. The How example: keep `44` (show 2 sentences) or move to a word with common alternatives such as 4663 (changes
   content.md §2 step 1 text, MS-7.4 and a test).
3. The proof figure's labels: four short labels, or none with the closing line doing the work.
4. The rail with step numbers on desktop: include or skip (small, but one more element that changes state).
5. Measure on a real phone once one is available: today's numbers come from desktop Chromium and emulated sizes.
