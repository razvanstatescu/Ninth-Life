# Design review: landing page round 2 (motion and box visuals), revision 3

Reviewed 2026-11-11: `.agents/tasks/marketing-landing-v2/design.md` (final, revision 3), `decisions.md` (V1-V17 not
reopened; V18-V31 are design-phase decisions and are reviewed), `.kiro/specs/marketing-site/` (glossary, MS-7.2-7.10,
MS-8.3, MS-8.11-8.13, MS-10.8, MS-10.9, MS-11.6; design "Round 2" R2.2-R2.3; tasks 29-44; content §2-§6), the
ADR-006 amendment (A7 and A8 as clarified for V25, V26 and V30), and `motion-v2.md` and `box-visuals.md`. I checked
the claims against `packages/web` (`SiteHeader`, `SiteFooter`, `sections/Proof.tsx`, `site.css`, `components.css`,
`globals.css`, `tsconfig.json`, `tsconfig.base.json`) and `design/system/tokens.json`, and ran
`node scripts/tm-lint.mjs` on the 7 design, spec and ADR files (clean).

This is a revision. Section A re-checks the 14 findings of revision 2. Section B lists what revision 3 gets wrong or
leaves open.

**Verdict: CHANGES_REQUESTED** (0 HIGH, 2 MEDIUM, 4 NIT).

## Coverage of the request

| Request bullet | Covered by | Result |
|---|---|---|
| How it works: better scroll animation and micro animations | 4.1 HowScreen: per-key rings (two on the repeated 6), the well text after each press, rows rising, the choice jumping, Speak to Speaking, step sync with outline, deferred start on tall screens | Covered |
| Proof figure: research and a better animation | motion-v2 §5, 4.2 (stable rows, per-line column sweep, the x on wafer, closing lines) | Covered |
| "Made for both sides": an animated visual in all 4 boxes | SaidStrip, ShowFlip, PhraseSave, WordAdd, each with a sequence | Covered |
| "Works the way you type": a visual in all 5 boxes | KeyLegend, TouchSizes, ScanPlay, ThemeHalves, LayoutBoxes, each animated, in a bento | Covered |
| "Offline": a visual in every box | DeviceBoundary, RankingSides, VoiceRows, ListenStrip, each animated | Covered |
| Mobbin for inspiration | box-visuals §3 | Covered |

Binding constraints: the ADR-006 tier as amended holds (opacity and transform only, tokens only, at most 4 s, once
per page view, no loops; the longest sequence is the switch drawing at 3,620 ms with the largest lead). Reduced
motion, no JavaScript and no IntersectionObserver show every finished state from the base styles, and `still()`
clears the How attributes. The Lighthouse and byte budgets are estimates, measured at task 44 with the 15 KB markup
gate (V24). CLS stays at 0 by construction (fixed stages, `.site-cell` stacks, overlays, `--site-how-h`). Banned
claims, the intended-purpose sentence (verbatim in content.md), trademarks (tm-lint clean) and "no third-party
assets, requests, cookies or analytics" hold. New behaviour carries MS IDs with named tests in §9 and tasks 30-41.

## A. Previous findings (revision 2)

| # | Sev. | Finding | Status | Note |
|---|---|---|---|---|
| 1 | HIGH | How never plays on tall viewports | Closed | `howStart` gives `'live'`, `'deferred'` or `'finished'`; tests and `site.mjs` at 1024 × 1366 and 1920 × 1200. The spec wording now conflicts with MS-8.13 (new finding 2) |
| 2 | HIGH | Tall drawings play below the fold | Closed for scrolling down | Two observers and `shouldPlay` work going down. Going up, `shouldPlay` plays a drawing with only its bottom edge on screen (new finding 1) |
| 3 | MEDIUM | Desktop step 1 active before the picture is in view | Closed | `--site-how-h` and the `max()` padding hold from an inner height of 632px; below it the spec sentence overstates (NIT 4) |
| 4 | MEDIUM | "Press a key to start" wraps | Closed | `label` type, about 170-176px against about 190px of room at 1024px (387 − 32 well padding − 12 gap − about 152 for the Speak button) and 208px at 320px |
| 5 | MEDIUM | MS-8.11 first change vs k1 starts | Closed | Reworded: no change before the lead, every change a whole number of steps after it |
| 6 | NIT | `--reveal-i` leads | Closed | `--play-i` per column; the placements match grid auto-placement (checked below) |
| 7 | NIT | `role('ring', 4 + c, 5 + c)` does not type-check | Unchanged | The typed tables fix the arithmetic, but indexing them does not type-check in this repo (NIT 3) |
| 8 | NIT | Ring handovers | Closed | MS-7.3 counts a handover as one ring |
| 9 | NIT | No width-overflow fallback | Closed | LayoutBoxes 226px; the labels are only "Phone", "Tablet", "Laptop" (content.md §5), so the 42px phone column holds |
| 10 | NIT | "Model ranking" title | Closed | Dropped from content.md §6 |
| 11 | NIT | A5 removal per task, totals | Closed | Tasks 36 and 37 remove their own A5 rules; totals checked |
| 12 | NIT | Caption digits read one by one | Closed | `nl-sr-only` exists in `globals.css`; MS-7.9 and task 43 |
| 13 | NIT | Key 6 shows two presses as one | Closed | Two rings, the second `.site-late`; one wording slip (NIT 5) |
| 14 | NIT | Tall switch stage empty from 648 to 1023px | Unchanged | Backlogged on purpose: V10 is the product owner's call, the screenshot is in task 43 and the alternative is written in 4.3. Accepted; not counted again |

## B. Findings in this revision

### 1. MEDIUM: a drawing entered from above plays with only its bottom edge on screen

**Where:** `shouldPlay` (3.3, R2.2, glossary "Play line", MS-8.11, V25); the handler note "it plays when the visitor
scrolls back and its bottom crosses the top line"; the §8 invariant "A drawing plays only with its whole box in view
where it fits".

**Problem:** the first branch, `rect.bottom <= 0.7 * vh + 1`, does not ask for the top to be on screen. Going up, a
drawing's bottom enters the viewport first. Both observers then call back: the play area crosses threshold 0, and the
top line starts intersecting. At that moment `bottom` is a few pixels and `top` is negative, so `shouldPlay` is
true and the drawing plays almost entirely above the viewport. This is a real path. The header nav has `#how`,
`#proof`, `#access`, `#privacy` and `#faq` (`SiteHeader.tsx`), and the footer has `#privacy` and `#access`. After
a jump, every drawing between the old and new position is above the viewport and unplayed (the design says so). When
the visitor scrolls back up, each one plays while it is mostly off screen, including the How stages and the proof
figure on phones. The same happens going down when a fast scroll carries a short drawing partly past the top. This
contradicts the §8 invariant and V25's purpose. The `site.mjs` check only scrolls down, so it would not catch it.

**Fix (keeps V1's 30% line and V25's two observers; changes only the predicate, a design-phase decision):** a drawing
that fits above the line plays only with its whole box between the top of the viewport and the line. A taller one
plays when its whole box is on screen, or when it covers the play area from the top.

```ts
export function shouldPlay(r: { top: number; bottom: number }, vh: number): boolean {
  if (r.bottom <= 0 || r.top >= vh) return false;
  const line = vh * 0.7;
  const inView = r.top >= -1 && r.bottom <= vh + 1;                    // the whole box on screen
  if (r.bottom - r.top <= line) return inView && r.bottom <= line + 1; // fits above the line
  return inView || (r.top <= 1 && r.bottom >= line - 1);               // too tall: in view, or covering the play area
}
```

The callbacks still come at the right moments:
- A short drawing going down plays at play-area ratio 1, as now.
- A short drawing going up plays when its top re-enters (ratio 1 again).
- A tall drawing going down plays when it reaches the top line, as now.
- A tall drawing going up plays when it leaves the top line with its top just inside, which is `inView`.
- A drawing a fast scroll carried partly past is no longer played half-hidden. It plays whole when the visitor
  scrolls back.

Update the glossary, MS-8.11 ("its whole box between the top of the viewport and the line, or, for a drawing too
tall for that, its whole box on screen or its top at the top of the viewport with its bottom at or below the line"),
V25, ADR-006 A7 and the 3.3 handler note. Extend `MS-8.11 shouldPlay waits for the whole box above the play line`
with these cases:
- a 216px box at 667 with top −200 (bottom 16) is false;
- a 520px box at 568 with top −300 (bottom 220) is false;
- a 520px box at 568 with top 20 (bottom 540) is true.

Add a `site.mjs` case `MS-8.11 drawings entered from above play in view` at 375 × 667 and 1280 × 800. Load at the
top, follow `#faq`, then scroll up in 40px steps. When a drawing gets `data-played="1"`, its top must be at −40px or
more and its bottom at the viewport height plus 40px or less.

### 2. MEDIUM: MS-8.13 forbids what MS-8.12 now requires for the deferred How picture

**Where:** MS-8.13, "a drawing on screen or above it ... when motion starts SHALL show its finished state and never
play", against MS-8.12, "IF the picture is on screen when motion starts AND no step is active yet, THEN ... play step
1". The same wording is in the 3.3 mount note ("a drawing on screen or above it when motion starts shows its finished
state and never plays").

**Problem:** the glossary's "Drawing" covers the desktop How picture, and MS-8.13 is not scoped to `data-play`
roots. On a 1024 × 1366 tablet the deferred picture is on screen at mount and later plays. That is right by MS-8.12
and V26, but it breaks MS-8.13 as written. A test or a later reviewer (`semantic_reviewer` and `pr-reviewer` run
against the requirements) holding the code to MS-8.13 would flag correct code. Revision 2's finding 5 was the same
kind of letter-of-the-spec conflict.

**Fix:** scope MS-8.13 to `data-play` roots and point to MS-8.12: "A played `data-play` drawing SHALL never play
again in that page view; a `data-play` drawing on screen or above it ... (the desktop How picture follows MS-8.12)".
Make the same edit in the 3.3 mount bullet and in the ADR-006 A7 bullet ("A drawing already on screen ...", where A8
already states the How exception).

### 3. NIT: the typed step tables do not type-check with `noUncheckedIndexedAccess`

**Where:** 3.2 and 4.2: `role('ring', ...SWEEP[c])`, `role('mark', SWEEP[diffAt][0])`, `DIGIT_LINE[row]`,
`CHIP[row]`.

**Problem:** `tsconfig.base.json` sets `noUncheckedIndexedAccess: true`, and `packages/web/tsconfig.json` extends it.
Indexing a `readonly Span[]` or `readonly KStep[]` with a `number` gives `Span | undefined` or `KStep | undefined`.
The spread and `role('rise', DIGIT_LINE[row])` then fail `pnpm -r typecheck`, which is the "no cast is needed" claim
of V31.

**Fix:** type the tables as tuples and index them with literal unions, or map over them:

```ts
type Column = 0 | 1 | 2 | 3 | 4;
type Row = 0 | 1 | 2;
const SWEEP: readonly [Span, Span, Span, Span, Span] = [[4, 5], [5, 6], [6, 7], [7, 8], [8, 9]];
const DIGIT_LINE: readonly [KStep, KStep, KStep] = [1, 2, 3];
const CHIP: readonly [KStep, KStep, KStep] = [9, 10, 11];
// boxes: SWEEP.map((span, c) => <span key={c} className={`site-proof__box ${role('ring', ...span)}`} />)
// rows: proof rows typed as a 3-tuple, rendered with ([..] as const).map((row: Row) => …)
```

`ProofExample.reject.diffAt` becomes `Column`, narrowed and checked once in `getProofExample` (it throws otherwise,
as today for a bad example). The same goes for `TYPING`, mapped with its index into `how.typing`.

### 4. NIT: MS-8.12's last sentence is unconditional, but V22 accepts a cut picture below 632px

MS-8.12 says "Step 1 SHALL become active only once the whole picture is in view". Below an inner height of 632px the
picture sticks at 16px before step 1 is active, and its bottom row is cut (V22, 4.1). Add "from an inner height of
632px" to the sentence. While editing it, the deferred clause says "play step 1", and 3.3 plays step 2 or 3 if a fast
scroll skips step 1. Write "play the step that became active (step 1 unless a fast scroll skipped it)".

### 5. NIT: "the ring is off for `motion-jump`" overstates the gap between the two presses of 6

The first ring fades out over [t(2), t(2) + 120 ms] and the second fades in over [t(2) + 120, t(2) + 240 ms]. Opacity
touches 0 only for an instant, so the eye sees a 240 ms dip, not 120 ms off. That matches MS-7.3 ("starting
`motion-jump` after the first has gone"), so only the prose in 3.2 and 4.1 needs fixing: "the first ring fades out,
then the second fades in, so the key visibly dips between the two presses".

### 6. NIT: the stage height table uses a 32px `candidate` line; the token is 34px

`tokens.json` gives `candidate` a 34px line, which 4.1 already uses for the hint. The Step 3 row ("text 32") then
sums to 152px, not 150px. That is still inside 160px, so only the figure changes. Use 34 in the Step 3 row.

## Verified assumptions

- `noUncheckedIndexedAccess` is on for `packages/web` through `tsconfig.base.json` (basis of NIT 3). `.nl-sr-only` is in
  `styles/globals.css`.
- The header nav links `#how`, `#proof`, `#access`, `#privacy` and `#faq`, and the footer links `#privacy` and
  `#access` (basis of finding 1).
- Type tokens: `candidate` 26/34px weight 600, `label` 16/20px weight 600, `caption` 14/20px. The hint in `label`
  type fits one line. At 1024px the How column is (976 − 48) × 5/12 ≈ 387px with no padding on the picture. The well
  padding is 16px on each side and the row gap 12px. `.nl-btn` has 24px side padding and an 8px gap, so the Speak
  cell sized by "Speaking" is about 152px and leaves about 190px for text.
- `--site-how-h` = 96 × 6 + 32 + 8 = 616px. With `padding-top: max(12svh, 616px − 50svh)`, step 1 meets the middle
  line when the picture's top is at `vh − 616`, so its bottom is at `vh`. The picture is not yet stuck while
  `vh − 616 ≥` its sticky top, which holds from 632px (16px top) and at 1024 × 768 (48px top, the picture at
  48-664).
- `howStart`'s `'deferred'` case cannot hold for a picture scrolled above the viewport. Step 1's top is the picture's
  top plus a padding below 50svh at those heights, so a picture above the viewport means step 1 is already active,
  which gives `'finished'`.
- Grid auto-placement for `--play-i`: from 1024px the explicitly placed switch card (column 3, rows 1-2) leaves
  Keyboard r1c1, Touch r1c2, Your view r2c1, Phones r2c2. From 648 to 1023px (switch at column 1, rows 2-3) it leaves
  Keyboard r1c1, Touch r1c2, Your view r2c2, Phones r3c2. The `--play-i` table matches both.
- `IntersectionObserver` with thresholds `[0, 1]` calls back when the ratio reaches 1, so a box of at most 70% of
  the viewport plays at "whole box above the line". With a zero-height root (`-100%` bottom margin, threshold 0) it
  calls back on `isIntersecting` changes, since the threshold index moves from 0 to 1. A display-none target reports
  a zero rect, and `shouldPlay` rejects it through `bottom <= 0`.
- Totals: switch 700 + 7 × 400 + 120 = 3,620 ms; proof 300 + 12 × 240 + 200 = 3,380 ms (3,780 ms with the test's
  700 ms bound); DeviceBoundary 3,300 ms; Keyboard and Model ranking 3,220 ms; How step 1 2,500 ms. All are under
  4,000 ms.
- The `.site-during` and `.site-ring` animation order (`site-out t(u)`, then `site-in t(k)`, both `backwards`) gives
  0 before t(k), 1 between, and the base 0 after, with no animation left. The late ring's `site-in` delay adds
  `--late` only to `site-in`.
- The proof section is a `.site-split` (copy `flex: 999 1 480px`, figure `1 1 380px`, `align-items: flex-start`), so
  on desktop the figure sits on the right beside the copy, as the request describes. At 1280 × 800 it plays with its
  top at about 40px, its whole box in view.
- content.md keeps the intended-purpose sentence verbatim. The new drawing text ("Press a key to start", "Phone",
  "Tablet", "Laptop") makes no banned claim and names no brand. `tm-lint` is clean on the 7 files.

## Unverified or wrong assumptions

- **Wrong:** "A drawing plays only with its whole box in view where it fits" (§8) for drawings entered from above or
  carried partly past by a fast scroll (finding 1).
- **Wrong:** "so no cast is needed" for the typed tables under this repo's `noUncheckedIndexedAccess` (NIT 3).
- **Conflict:** MS-8.13 against MS-8.12 for the deferred How picture (finding 2). Also MS-8.12 "whole picture in view"
  against V22 below 632px (NIT 4).
- **Not verified:** the hero height behind the "picture's top at about 1,100px" estimate, and so which tall viewports
  are `'deferred'`. The `site.mjs` runs at 1024 × 1366 and 1920 × 1200 cover both outcomes, because `'live'` also
  plays every step.
- **Not verified:** the zero-height-root observers (top line and middle line) in WebKit. Task 43 runs `site.mjs` with
  `ENGINE=webkit`.
- **Not verified:** the byte, CSS and element estimates of §5 and the 15 KB markup gate (tasks 39.1 and 44, V24).
