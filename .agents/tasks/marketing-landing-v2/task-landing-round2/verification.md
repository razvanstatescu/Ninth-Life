# Verification: landing page round 2 (plan step 15, marketing-site task 43)

Iteration 1, 2026-11-11. Dev server on :3000 (not restarted, not built). Nothing committed.

## Dev server

- `curl` `/` 200 (0.03 s), `/app` 200.
- **Problem found:** the dev server answers 404 for `/_next/static/css/app/app/page.css`, the stylesheet that
  carries `styles/app.css` for `/app` (`packages/web/.next/static/css/app/app/` has been empty since 16:04;
  console: "Failed to load resource: 404 ... /_next/static/css/app/app/page.css"). `/app` renders with no
  layout CSS. `styles/app.css` and `app/app/page.tsx` are unchanged in the working tree; touching them did not
  make the server emit the file. The orchestrator restarted the dev server (`pnpm dev` from the root); after
  that every stylesheet linked from `/app` answered 200 and `responsive.mjs` was rerun.

## Seams fixed

1. **Tall drawing entered from above (left open by FEAT-004).** The proof figure at 320 × 568 (680px, taller
   than the viewport) got no observer call while `shouldPlay` held when the visitor scrolled up into it: the top
   line reports the top leaving the line one scroll step late, with the top already inside the viewport, so the
   figure stayed in its before-play state. `SiteMotion.tsx`: the top-line observer now has its own handler
   (`onTopLine`) that remembers whether each drawing was on the line; when one that was on it leaves with its top
   below the top of the viewport, `shouldPlay` is asked about the box at the crossing (top 0, same height). Other
   entries and the other two observers are unchanged, and `shouldPlay` is unchanged.
   - Unit: new `MS-8.11 a drawing taller than the viewport entered from above plays as its top leaves the top
     line` in `test/site-motion.test.tsx` (`fire` takes an optional `isIntersecting`).
   - E2E: `site.mjs` "entered from above" now also runs at 320 × 568; a drawing taller than the viewport is
     checked by its top only (as the "tall drawings" block already does). Passes: 17 of 17 played in view.
   - Docs: new "Top line, leaving downwards" bullet in `design.md` 3.3; the "Still open" sentence removed.
2. **axe with motion on measured drawings mid-fade.** `axe.mjs` "landing / (motion)" failed 4 of 4 runs on
   `color-contrast` for parts of played drawings (`.site-phrases__rows > .site-k3.site-rise`, the proof's typing
   chip `.site-u11`): `scrollToEnd` waited 1 s, and round-2 sequences run up to 4 s (MS-8.11). The finished
   states pass (the reduced-motion runs had 0 violations). `scrollToEnd` now also waits for every running
   animation to finish (at most 6 s). No page change.

## Checks

| Check | Result |
|---|---|
| `node test/e2e/site.mjs` (Chromium) | pass, exit 0, "site: all checks passed" (first run, before the fixes, was cut off at exit 130 by the shell; rerun after the fixes) |
| `ENGINE=webkit node test/e2e/site.mjs` | pass, exit 0 (layout shift and LCP checked in Chromium only, as before) |
| `node test/e2e/axe.mjs` | first run: 4 failed (the motion runs, mid-fade, see seam 2); after the fix: pass, 0 violations on `/`, `/` with motion, `/app`, `/about`, Settings, Night and Day, 1280 and 390 |
| `node test/e2e/keyboard.mjs` | pass, exit 0 |
| `node test/e2e/switch.mjs` | pass, exit 0 |
| `node test/e2e/spell.mjs` | pass, exit 0 |
| `node test/e2e/responsive.mjs` (Chromium) | first run: fail, 79 checks, every `/app` layout check, because the dev server did not serve `/app`'s stylesheet (above). After the orchestrator restarted the dev server: pass, exit 0, "responsive: all checks passed" (24 sizes) |
| `ENGINE=webkit node test/e2e/responsive.mjs` | first run: fail, same cause. After the restart: pass, exit 0 |
| `pnpm -r typecheck` | pass, exit 0 |
| `pnpm -F @ninth/web test --run` | pass, 378 of 378 (32 files), exit 0 |
| `node scripts/tm-lint.mjs <changed files>` | clean (21 + 17 files: site components, pictures, sections, tests, e2e, spec, steering, docs) |
| `node scripts/validate-kiro-config.mjs` | ok (10 hooks), exit 0 |
| `node scripts/check-kiro-not-ignored.mjs` | ok, exit 0 |
| MS-11.6 markup at most 15 KB gzip | pass (`site.test.tsx` case; FEAT-003 measured 9,165 bytes; this step adds no markup) |

## Proof caption (MS-7.9)

VoiceOver was not available to this agent. In the Playwright accessibility snapshot of `/` (Chromium, 768 × 1024)
the proof figure is `figure "Your keys: 92837"` and its caption's only exposed text is "Your keys: 92837"; the
visible label and digit grid are `aria-hidden`. The rows expose the chips ("water, matches your keys. Keys 9 2 8 3
7.", "waves, ...", "wafer, does not match your keys, will not be spoken. Keys 9 2 3 3 7.") and the closing lines
"Can be spoken: water, waves. Never spoken: wafer." and the "For example" line.

## Access section at 768 × 1024 (V10, for the product owner)

Screenshot: `features/access-768x1024.png` (the section, after all 5 drawings played). The bento has 2 columns:
Keyboard and Touch on the first row, the tall "One or two switches" card (348 × 864px) on the left of rows 2-3,
with Your view and "Phones, tablets and laptops" stacked on the right. The switch stage grows with its rows, so the
keypad and switch sit in the middle of a tall, mostly empty stage. V10 stands; the alternative in the full design
4.3 needs the product owner's yes.

## Spec and log

- `.kiro/specs/marketing-site/tasks.md`: task 43 ticked (30-42 were already ticked by FEAT-001 to FEAT-004).
- `docs/KIRO_LOG.md`: one row for this step (`node scripts/kiro-log.mjs add`, credits blank).
- The `a11y-auditor` custom agent could not be started from this step; the MS-13 audit of `/` here is `axe.mjs`
  (0 violations, motion on and off) plus the keyboard checks in `site.mjs`.

## Not done in this step

- Task 44 (production build, Lighthouse) is the workflow's next step and needs a yes to stop the dev server.

---

# Iteration 2, 2026-11-11/12: fixes for review.md and verdict.json (CHANGES_REQUESTED)

Dev server on :3000 not restarted and not built; `/` 200, `/app` 200. Nothing committed.

## Findings fixed

| ID | Change |
|---|---|
| B1 | `pictures/Access.tsx` `KeyLegend`: the arrow pair is now Up and Down (`.site-kbd--up`, `.site-kbd--down`: the `back` icon with a still `rotate(90deg)` / `rotate(-90deg)`), the only arrows `lib/keyboard.ts` maps to picking a sentence; `.site-kbd--right` and its `scaleX(-1)` removed. `site.test.tsx` checks the pair's classes and that `mapKey` moves on ArrowUp/ArrowDown and ignores ArrowLeft/ArrowRight. design.md 4.4 table and Keyboard bullet, decisions.md V8 corrected. |
| B2 + N1 | `motion.ts` `shouldPlay` (new export `PLAY_LINE = 0.7`): a drawing that fits above the line also plays with its whole box on screen and its top in the top band (top 30% of the viewport), so its window is at least 30% of the viewport (the 376px switch drawing: 8px to 165px at 375 × 549, 23px to 170px at 320 × 568). A drawing too tall for the line covers the play area only with its top at most one band above the top (the 680px proof figure at 320 × 568 landing at top −283 no longer plays). `SiteMotion.tsx`: the top-line substitution (box at top 0) applies only when the real top is at most one band below the top, so a jump below the fold does not play the drawing; a fourth play observer, the top band (`rootMargin: '0px 0px -70% 0px'`, threshold 0), calls back as a drawing's top enters the band. Range recorded in design.md 3.3 ("Play range") and in the glossary and MS-8.11 of `.kiro/specs/marketing-site/requirements.md`. Unit: new boundary cases in "shouldPlay waits for the whole box", "a jump that lands mid-figure", "a jump that carries a drawing from the top line below the fold". E2E: `site.mjs` "flick 375x549" and "flick 320x568" (150px steps to #faq: every drawing whose top went above the viewport played, each in view, the switch drawing played); `stepScroll` takes a `by` step. |
| B3 | `.site-digit--diff { color: var(--ink) }` removed. The box now draws an ink copy of the digit (`.site-digit__box::before { content: attr(data-d) }`, `data-d` set in `Pictures.tsx` `DigitLine`), so the digit is `ink-muted` like the others until its box appears at the mark step, and the finished state (reduced motion, no JavaScript) still shows it in ink. No colour animation (opacity only). Unit case in `site-css.test.ts`; design.md proof bullet updated. |
| N2 | `site-motion.test.tsx`: "the whole-viewport observer plays a drawing taller than the play area once it is whole in view" (finds it by `rootMargin: '0px'`, checks its thresholds) and "the top band plays a drawing a flick carried past its play-line window". |
| N3 | `/400` (empty curl cookie jar) removed. `docs/a11y/.tmp-motion-run.js` and `.tmp-contrast.js` were already gone. |
| N4 | `docs/KIRO_LOG.md`: FEAT-001 and FEAT-002 "who" cells now `marketing-landing-v2 workflow wf_e69aacc718000e2c, FEAT-00N`; the cut outcome cells of FEAT-002, FEAT-003 and FEAT-004 finished from their FEAT findings. |
| N5 | `SITE_MOTION_BOOT` comment no longer mentions the removed scroll-linked frames (A5). |
| N8 | `site.css`: every stage height (`.site-stage` 216px, `--privacy` 288px, `--switch` 384px, the three How stages) is now `min-block-size`, so text-spacing overrides grow a stage instead of clipping it. At normal spacing nothing changes (site.mjs stage fit and equal-height checks pass at all sizes). MS-7.7 and the Stage glossary entry say "minimum". `site-css.test.ts` updated, plus a check that no stage rule sets a plain `block-size`. |
| N9 | `site.css`: one `@media (forced-colors: active)` block: inset outlines in `CanvasText` for the press and key rings, the key's pressed ring, the switch press, the ranking outline, the proof sweep and digit boxes, the layout boxes' keys and Speak pill and the How step labels; the scan ring in `Highlight`; the toggle keeps its own system colours (`forced-color-adjust: none`, knob `CanvasText` off and `Canvas` on). Unit case in `site-css.test.ts`. Not checked in a real Windows contrast theme. |

## Findings sent to the product owner

P1, P2, N6, N7, N10 and T44 change what the visitor sees or need the dev server stopped, so they went to the
product owner (send_message, warning). The answers and the fixes are in "Iteration 2, part 2" below.

## Checks (iteration 2)

| Check | Result |
|---|---|
| `pnpm -F @ninth/web test --run` | pass, 384 of 384 (32 files), exit 0 (first run: 2 failures in `site-css.test.ts` that still expected the fixed stage `block-size`; updated for N8) |
| `pnpm -r typecheck` | pass, exit 0 |
| `node test/e2e/site.mjs` (Chromium) | pass, exit 0, "site: all checks passed", including the new flick checks (17 played; switch played) |
| `ENGINE=webkit node test/e2e/site.mjs` | pass, exit 0 |
| `node test/e2e/axe.mjs` | pass, exit 0, "axe: all checks passed" |
| `node test/e2e/keyboard.mjs`, `switch.mjs`, `spell.mjs` | pass, exit 0 each |
| `node test/e2e/responsive.mjs` (Chromium) | pass, exit 0 |
| `ENGINE=webkit node test/e2e/responsive.mjs` | pass, exit 0, "responsive: all checks passed" |
| `node scripts/tm-lint.mjs <13 changed files>` | clean |
| `node scripts/validate-kiro-config.mjs` | ok (10 hooks), exit 0 |
| `node scripts/check-kiro-not-ignored.mjs` | ok, exit 0 (note: 4 untracked files under `.kiro/`) |
| MS-11.6 markup at most 15 KB gzip | pass (`site.test.tsx`; this iteration adds one `data-d` attribute) |

The flick checks were not run against the old `shouldPlay`, so they are not shown to fail without the fix; the unit
boundary cases are (the 150, 165 and −283 cases return the other answer under the old predicate).

## Iteration 2, part 2, 2026-11-12: the product owner's answers (P1, P2, N6, N7, N10, T44)

| ID | Answer | Change |
|---|---|---|
| P1 | Fill the band with placeholder rows that fill in at step 2 | `pictures/HowScreen.tsx` `Rows` (desktop picture only): each sentence row shares a `.site-cell` with `.site-cand__ghost` (dashed `--line` edge, two `--line` bars), `data-s="2"`, `role('out', row)`. Shown while step 2 has not played, fades out as its row rises in; the finished state hides it; same cell, no layout shift. Screenshot `features/how-picture-step1-1280x800-iter2.png` (step 1: three placeholder rows between the well and the keypad). V36, design.md 4.1. |
| P2 | Switch box a normal card at every width | `sections/Access.tsx`: no `site-card--tall`. `site.css`: the bento rules (648 and 1024px) removed; Access is 2 columns from 648px at every width; Your view's stage takes the switch stage's 384px (`> :nth-child(4) > .site-stage`), Phones, tablets and laptops spans both columns. The switch stage is 8px taller than its drawing at every layout size (was about 830px at 768 and 686px at 1280). Screenshots `features/access-768x1024-iter2.png`, `access-1280x800-iter2.png`. V10 marked replaced, V37; design.md 4.3, 3.2 table; `.kiro` requirements MS-7.7 (equal heights per row in Access) and MS-10.9, `.kiro` design R2.5 and section 5. |
| N6 | `align-items: start` for that row | Privacy grid gets `site-grid--start` (`align-items: start` from 648px). Screenshot `features/privacy-768x1024-iter2.png`. V38. |
| N7 | Keep one ember ring at a time and the 4 s cap | Lead = `motion-play-lead` + `--play-i` × `motion-frame` (was `motion-state`) + `--play-after`. Touch waits `4 × motion-frame-quick` for the Keyboard drawing, which now plays at the quick step (0.4 s). Both rules hold, so no exception: `site.test.tsx` computes every part against 4 s with the real leads (longest Model ranking 3.42 s; Touch 3.22 s) and checks that no two ember rings in a row of two cards overlap. Two different rows can still overlap if a fast scroll brings both to the play line together (recorded in V39 and design.md 3.2). `.kiro` MS-8.11 and design.md 4.4 updated. |
| N10 | Padding inside the 240px stage; smaller keypad only if padding alone does not fit | It did not fit (the 240px keypad panel fills 240px), so: `.site-how__stage { padding-inline: var(--space-2) }` and the drawn keypad panel inside pads its keys by 8px instead of 16 (224px wide). Keys stay 64px, stage heights unchanged. Screenshot `features/how-stage1-320x568-iter2.png`. V40. |
| T44 | Yes, stop the dev server for the build and Lighthouse | Done after the dev-server e2e passed (below). |

Tests changed: `site.test.tsx` (MS-10.9 normal switch card and the Privacy class; MS-8.11 per-card leads and the
ring-overlap check), `site-css.test.ts` (Access grid, lead formula, column rules), `e2e/site.mjs` (Access stages equal
per row; the switch card normal with a snug stage at 5 layout sizes; the placeholder rows at step 1 and after step 2
at 1366 × 650, 1024 × 768 and 1280 × 800).

### Checks (iteration 2, part 2)

| Check | Result |
|---|---|
| `pnpm -F @ninth/web test --run` | pass, 384 of 384 (first run: 2 failures, a literal `0ms` fallback against MS-8.2 and a too-wide `grid-row` regex; both fixed) |
| `pnpm -r typecheck` | pass, exit 0 |
| `site.mjs` Chromium | first run: 3 failures in the new "rows replace the placeholders" check (the test looked for step 2 after it had already scrolled past it; the page state was right: ghosts 0, rows 1). Test fixed; rerun: pass, "site: all checks passed" |
| `ENGINE=webkit site.mjs` | pass, exit 0 (ran with the fixed check) |
| `axe.mjs`, `keyboard.mjs`, `switch.mjs`, `spell.mjs` | pass, exit 0 each |
| `responsive.mjs` Chromium and WebKit | pass, exit 0 each |
| `tm-lint` on the 12 changed files | clean |
| `validate-kiro-config.mjs`, `check-kiro-not-ignored.mjs` | ok, exit 0 |
| MS-11.6 markup at most 15 KB gzip | pass (`site.test.tsx`; 3 placeholder divs added) |
| Production build (`pnpm -F @ninth/web build`, after stopping the dev server on :3000) | pass; `/` 3.93 kB, first load JS 118 kB |
| `node scripts/lighthouse.mjs --write` on `next start -p 3202` | pass, exit 0. Medians of 3 runs, mobile and desktop: Performance, Accessibility, Best Practices and SEO all 100. Mobile: FCP and LCP 1,054 ms, TBT 0 ms, CLS 0.000; transferred 208.0 KB of 250 KB (script 117.7, stylesheet 10.6, document 22.7, font 51.1, image 4.4 KB), every budget met. Written to `docs/testing/performance.md`. Task 44 ticked. |

The production server on :3202 is stopped. The dev server on :3000 is stopped and must be restarted by the person
(`pnpm dev` from the root).

---

# Iteration 3, 2026-11-12: fixes for review.md and verdict.json (R3, CHANGES_REQUESTED)

Dev server on :3000 (restarted by the person; not restarted or built by this step): `/` 200 (0.20 s), `/app` 200
(R3-H2). Nothing committed (R3-H1: the 4 untracked `.kiro/` files are left for the person to commit when asked).

## Findings fixed

| ID | Change |
|---|---|
| R3-B1 | `Pictures.tsx` `ProofCheck`: the dashed typing chip now holds the real chip's icon (`<Icon name="check">`) and code as hidden slots (`.site-proof__slot { visibility: hidden }`), so both `.nl-chip__word` elements start at the same x and the 200 ms cross-fade no longer shows two offset copies. Steps, timing and the 3.4 s total unchanged (MS-8.11 4 s cap test passes). `site.mjs`: new MS-7.9 check at all 14 sizes that the two word left edges in each row match within 1px (0px at every size). Timed screenshots `features/r3-proof-1280x800-{2560,2800,3040}ms-iter3.png` and `r3-proof-390x844-*-iter3.png`: typing and real chips line up word on word. design.md 4.2 updated. |
| R3-N1 | `site.css`: the switch drawing's panel pads its keys by 8px (`.site-scan .nl-keypad.site-pad`, the ring grid likewise), 224px wide. The How stage's padding is `clamp(0px, (100% - 224px) / 2, 8px)` in token terms, so it shrinks to 0.5px in a 225px stage and stays 8px at 240px and wider. `site.mjs`: new "classic scrollbar 320x568" block (no touch; headless Chromium and WebKit hide scrollbars, so it sets the 305px layout width a 15px scrollbar leaves): no sideways scroll, every drawing fits its stage (16 stages), equal stage heights. |
| R3-N2 | `docs/KIRO_LOG.md`: the iteration 2 row's outcome now ends "Privacy cards keep their height". |
| R3-N3 | `site.css` `.site-boundary__pill`: gap 4px and side padding 12px, as a proof chip; about 275px wide, one line in the 280px drawing at 768 (it measured 282.5px before). Still wraps at 320. |
| R3-N4 | `site.css` `.site-proof`: `max-inline-size: calc(var(--space-24) * 4)` (384px). At 768 the figure is 384px wide (was about 720); at 1280 it stays 380px. |

## The product owner's answers (R3-P1, R3-P2, R3-N5, R3-N6)

| ID | Answer | Change |
|---|---|---|
| R3-P1 | Yes: scale up from 1024px, CSS only, stage heights unchanged | `site.css` `@media (min-width: 1024px)`: layout boxes doubled with their inner bars, lines, pills and gaps (72 × 128, 128 × 96, 192 × 120): 440 × 156 in the 216px stage (was 224 × 92). Your view: halves padded 24/32px, gaps 12-16px, the greeting in `utterance` type: 320 × 264 in the 384px stage (was 216 × 188). Listen: gaps 24px, strip padding 16px, the drawn button 64px tall: 336 × 214 in 288 (was 336 × 166). Drawn keys stay 64 and 84px (MS-10.8). Screenshots `features/access-1280x800-iter3.png`, `privacy-1280x800-iter3.png`, `access-768x1024-iter3.png`, `privacy-768x1024-iter3.png`. |
| R3-P2 | `label` (16px) where it fits; narrow the boxes, no exception | `.site-keylegend__what`, `.site-ranking__sent`, `.site-themes__label` and `.site-layouts__label` use `label`. The landscape layout box is 64 × 48 (was 72 × 52), so the row is 222px at 305 and 320. Every drawing fits its stage at 305, 320, 768, 1024, 1280 and 1920 (measured). `site.mjs` MS-10.5 now asks 16px inside drawings too (only the footer caption may be 14px), and passes at all 14 sizes; `site-css.test.ts` new case: `--type-caption-size` is used only by `.site-footer__caption`. `.kiro` MS-10.5, `.kiro` design.md drawing rules and design.md 4.4 updated. |
| R3-N5 | No | Unchanged. |
| R3-N6 | Yes: aria-disabled, ignore presses, a test naming the requirement | `KeypadDemo.tsx`: Hear it has `aria-disabled="true"` while playing instead of `disabled`, and `hear()` returns early while playing; `site.css` draws it as the disabled quiet button. `keypad-demo.test.tsx` "MS-6.7 Hear it is aria-disabled while playing, stays focusable, ignores presses, …"; `site-css.test.ts` MS-6.7 case. `.kiro` MS-6.7, design.md and content.md updated. |

## Checks (iteration 3, all on the final tree, run once)

| Check | Result |
|---|---|
| `pnpm -F @ninth/web test --run` | pass, 386 of 386, exit 0 |
| `pnpm -r typecheck` | pass, exit 0 |
| `node test/e2e/site.mjs` (Chromium) | pass, exit 0, "site: all checks passed" (incl. the new MS-7.9 chip-edge and classic-scrollbar checks and the 16px drawing-text check) |
| `ENGINE=webkit node test/e2e/site.mjs` | pass, exit 0 |
| `node test/e2e/axe.mjs` | pass, exit 0, "axe: all checks passed" |
| `node test/e2e/keyboard.mjs`, `switch.mjs`, `spell.mjs` | pass, exit 0 each |
| `node test/e2e/responsive.mjs` Chromium and WebKit | pass, exit 0 each |
| `node scripts/tm-lint.mjs` on the 11 changed files | clean |
| `node scripts/validate-kiro-config.mjs` | ok (10 hooks), exit 0 |
| `node scripts/check-kiro-not-ignored.mjs` | ok, exit 0 (note: 4 untracked files under `.kiro/`) |
| MS-11.6 markup at most 15 KB gzip | pass (`site.test.tsx`; this iteration adds 3 hidden icons and 3 hidden codes) |

Not run: production build and Lighthouse (they need the dev server stopped; the person asked to be asked first).
The CSS changes are small (about 30 rules), so the stylesheet budget is not expected to move much; Lighthouse was
100 in all four categories on the iteration 2 tree.

Files changed in this iteration: `packages/web/components/site/Pictures.tsx`, `site.css`, `KeypadDemo.tsx`;
`packages/web/test/e2e/site.mjs`, `test/site-css.test.ts`, `test/keypad-demo.test.tsx`; `.kiro/specs/marketing-site/`
`requirements.md`, `design.md`, `content.md`; `.agents/tasks/marketing-landing-v2/design.md`; `docs/KIRO_LOG.md`
(row cut fixed, iteration 3 row added); this file; screenshots in `features/` (`*-iter3.png`).
