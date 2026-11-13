# Verification: landing page round 2 (testing phase, after fixer iteration 3)

2026-11-12, Chromium and WebKit through the globally installed Playwright 1.63, plus the Playwright MCP browser
(Chromium). Dev server on :3000, run by the orchestrator: not restarted, nothing built, nothing committed, no product
code changed in this step. Compared against `design.md` (revision 3 plus the iteration 2 and 3 notes), `plan.md`, the
FEAT-001 to FEAT-004 findings and the fixer's `task-landing-round2/verification.md` (iterations 1 to 3).

## Dev server

- `curl http://localhost:3000/` answered 200 in 0.04 s before any run.
- MCP browser console during this step's walks: 0 errors, 0 warnings. (The session-wide log still holds older
  entries from before the last restart: `/_next/static/css/app/app/page.css` 404s and a refused hot-update
  connection. None of them came from this step. `responsive.mjs` passed, so `/app` got its stylesheet.)

## Commands and results

All from `packages/web`, run one after another in one detached shell, output to `/tmp/r2e2e3/<script>.log`:

```
BASE_URL=http://localhost:3000 node test/e2e/site.mjs
BASE_URL=http://localhost:3000 node test/e2e/axe.mjs
BASE_URL=http://localhost:3000 node test/e2e/responsive.mjs
BASE_URL=http://localhost:3000 node test/e2e/keyboard.mjs
BASE_URL=http://localhost:3000 node test/e2e/switch.mjs
BASE_URL=http://localhost:3000 node test/e2e/spell.mjs
ENGINE=webkit BASE_URL=http://localhost:3000 node test/e2e/site.mjs
ENGINE=webkit BASE_URL=http://localhost:3000 node test/e2e/responsive.mjs
```

| Script | Result |
|---|---|
| `site.mjs` (Chromium) | **pass**, exit 0, 400 ok, 0 failed, "site: all checks passed" (17 more than iteration 2: the MS-7.9 chip-edge check at 14 sizes, the classic-scrollbar 320 × 568 block, 16px text inside drawings) |
| `axe.mjs` | **pass**, exit 0, 40 ok, "axe: all checks passed" (`/`, `/` with motion, `/app`, `/about`, Settings; Night and Day; 1280 and 390) |
| `responsive.mjs` (Chromium) | **pass**, exit 0, 181 ok, 24 sizes |
| `keyboard.mjs` | **pass**, exit 0, 18 ok |
| `switch.mjs` | **pass**, exit 0, 5 ok |
| `spell.mjs` | **pass**, exit 0, 17 ok |
| `ENGINE=webkit site.mjs` | **pass**, exit 0, 390 ok. Layout shift and LCP are checked in Chromium only; the OFFLINE=1 runs are skipped because they need a production build. |
| `ENGINE=webkit responsive.mjs` | **pass**, exit 0, 181 ok |

Not rerun here: `pnpm -r typecheck`, `pnpm -F @ninth/web test --run` (386 of 386), tm-lint and the Kiro config
checks. The fixer ran them on this tree in iteration 3. Lighthouse was not run either, because it needs the dev
server stopped.

## Playwright MCP checks

Method: load `/` with motion on, scroll in 40px steps, and record each `data-play` drawing's box at the step where it
gets `data-played`. Take timed screenshots while How and the proof play, and measure the two `.nl-chip__word` left
edges per proof row at 2,560, 2,800 and 3,040 ms (the chip cross-fades). Once everything has finished, measure every
box card's stage and drawing, the width of the proof figure, the size of the offline pill, any text inside a drawing
under 16px and any sideways scroll. Then take section screenshots. Scripts (git-ignored):
`.playwright-mcp/r4-how.js`, `r4-walk.js`, `r4-reduce.js`. Screenshots are in `screens/` with the prefix `r4-`. The
small round icon at the left edge of some screenshots is the Next.js dev indicator, not part of the page.

### Desktop, 1280 × 800

- **How it works (sticky picture, step sync).** At load the How section is live and on step 0. Step 1 plays at
  scroll 982 with the whole picture in view (164-780 of 800, 24 animations). Step 2 plays at 1382 (12 animations),
  step 3 at 1822 (5 animations). Step 1 at 900 ms shows "I'm" and "4 6", the ember ring on 6, and the three dashed
  placeholder rows (`r4-how-1280-step1-900ms.png`). Step 2 at 350 ms: row 1 "good" has replaced its placeholder
  while rows 2 and 3 still show theirs (`-step2-350ms.png`). After step 2 the placeholder opacities are 0, 0, 0. The
  walk ends on "Home", with home chosen and checked and the button reading "Speaking" (`r4-how-1280-end.png`). The
  step outline follows the active step (0, 0, 1 at the end).
- **Proof figure.** It plays at scroll 2840 with its box at 114-768 of 800, and is 380px wide. At 1,500 ms the
  sweep is on column 2 and wafer's "3" is still muted (`r4-proof3-1280x800-1500ms.png`). At 2,560 ms water and
  waves are real chips, wafer is still the dashed typing chip, and the 3 is boxed with the x
  (`-2560ms.png`). **The doubled chip text is fixed (R3-B1).** In every row the two word layers start at the same x
  (899.8 / 899.8px) at all three sample times, including mid-fade (row 2 at 2,560 ms: opacities 0.68 / 0.32). At
  3,600 ms all chips are real and both closing lines show (`-3600ms.png`).
- **Made for both sides (4 of 4).** Each card has a 516 × 216 stage with its own drawing, all played and inside
  their stages. The finished states are: They said with "I need water"; Show turned by Flip; the phrases list; and
  the Matches chip "Mihai 64424" with "In my words." (`r4-conversation-1280x800-finished.png`).
- **Works the way you type (5 of 5).** All five drawings played and fit: Keyboard (4, Enter, Backspace, the Up and
  Down pair), Touch (72 and 128), One or two switches (scan ends on 9, the Switch button), Your view and Phones,
  tablets and laptops. The R3-P1 scale-up shows from 1024px: Your view is 320 × 264 in its 384px stage, and the
  layouts drawing is 440 × 156 in a 1104 × 216 stage. The Accessibility note has no stage, as designed
  (`r4-access-1280x800-finished.png`).
- **Offline unless you choose (4 of 4).** All four drawings played and fit their 512 × 288 stages: On your device
  336 × 224 (the pill is on one line), Model ranking 336 × 204, Voices 336 × 160, Listen 336 × 214
  (`r4-privacy-1280x800-finished.png`).
- After the walk: 0 drawings unplayed, 0 drawing animations running, no text inside drawings under 16px (R3-P2), no
  sideways scroll.

### Tablet, 768 × 1024

All 17 drawings played with the whole box in view: How stages at 308-698, 428-706 and 561-711; the proof at
293-947; the box drawings between 461 and 711. 0 unplayed, 0 running, nothing over its stage, no text under 16px, no
sideways scroll.

- How: one card per step, with the text on the left and the stage on the right. The keypad panel sits inside its
  stage (`r4-how-768x1024-finished.png`). Timed shots: `r4-how-screen{0,1,2}-768x1024-{700,1500,2600}ms.png`.
- The proof figure is now 384px wide (R3-N4; it was about 720). The chip words line up at 88.0 / 88.0px through the
  cross-fade (`r4-proof-768x1024-finished.png`, timed `r4-proof3-768x1024-*ms.png`).
- Conversation: cards equal per row (420, 420 / 394, 394).
- Access: Keyboard and Touch in row 1, Switch and Your view in row 2 (stages 300 × 384), Phones across both columns
  (672 × 216).
- Privacy: the offline pill is on one line (270 × 40, R3-N3). Cards are top-aligned: 496 / 758 and 496 / 574
  (`r4-privacy-768x1024-finished.png`).

### Phone, 390 × 844

All 17 drawings played inside the viewport: How stage 1 at 247-637, the proof at 177-831, the box drawings between
326 and 590. 0 unplayed, 0 running, nothing over its stage, no text under 16px, no sideways scroll. The layout is
one column with each stage under its text. Step 3's well fits Speak on the same row at this width, so its drawing is
82px tall in the 160px stage. The proof chip words line up at 80.0 / 80.0px through the cross-fade. Screenshots:
`r4-{how,proof,conversation,access,privacy}-390x844-finished.png`, plus timed How stage and proof shots
(`r4-how-screen0-390x844-700ms.png` shows "I", "4", ring on 4).

### Reduced motion (390 × 844, 768 × 1024, 1280 × 800)

The results were the same at all three sizes:

- No `data-site-motion` attribute, and all 17 drawings are `data-played="instant"`.
- `document.getAnimations()` is empty after scrolling to the end.
- `.site-how` has no `data-how-step`, `-play` or `-live`, and the step outlines are at opacity 0.
- The three placeholder rows are at opacity 0.
- Each proof row shows the real chip (opacity 1) with the typing chip at 0.
- Wafer's boxed digit is in ink (`rgb(243, 238, 255)`, opacity 1).

Every section shows its finished state. How ends on step 3 ("Home", home chosen, "Speaking"); the proof shows real
chips, the boxed 3 with the x and both closing lines; each box drawing shows its finished state. Screenshots:
`r4-reduce-{how,proof,conversation,access,privacy}-{390x844,768x1024,1280x800}.png`.

### Findings from the previous testing pass, rechecked

| Earlier finding | Now |
|---|---|
| 1. Proof chip cross-fade shows doubled, offset text | **Fixed** (R3-B1). The word edges match to 0.0px at 1280, 768 and 390, mid-fade included. |
| 2. Proof hugs the left of a 720px panel on tablets | **Fixed** (R3-N4). The figure is 384px wide at 768. |
| 3. Offline pill wraps at 768 | **Fixed** (R3-N3). It is 270 × 40, one line, at 390, 768 and 1280. Ragged Privacy rows remain, as the product owner accepted in N6. |
| 4. Small drawings in large stages | **Fixed from 1024px** (R3-P1). Under 1024px they stay small (see 1 below). |
| Review R3-N1: clipping at 320 with a classic scrollbar | Covered by the new `site.mjs` block, which passes in both engines. |
| Review R3-P2: 14px text in drawings | **Fixed.** 0 elements under 16px at all three sizes; `site.mjs` checks it too. |

## Visual problems found (none blocks; for the next iteration's coder or the product owner)

1. **Tablet (648-1023px): small drawings in large stages.** The R3-P1 scale-up starts at 1024px, so at 768 the
   layouts drawing is 221 × 92 in a 672 × 216 stage. Your view is 216 × 188 in a 384px stage (to match the switch
   stage in its row), and Listen fills only the top 166px of its 288px stage (`r4-access-768x1024-finished.png`,
   `r4-privacy-768x1024-finished.png`). This follows the owner's "from 1024px" answer; extending the scale-up to
   648px for the Phones card would need a yes.
2. **Privacy at 768 and 390: lines wrap inside drawings.** "The dictionary words that match them" breaks before
   "them", and "Sends the text to the browser maker" breaks before "maker" (`r4-privacy-768x1024-finished.png`).
   This is cosmetic, and nothing is cut off.
3. **Proof figure while it plays.** The space reserved for the closing lines (about 200px) stays empty until the
   last step (k12, about 3.2 s), so the bottom of the panel is blank for most of the sequence
   (`r4-proof3-1280x800-1500ms.png`). This is by design: the space is reserved to avoid layout shift. Noted only
   because the user asked for this figure to look better.
