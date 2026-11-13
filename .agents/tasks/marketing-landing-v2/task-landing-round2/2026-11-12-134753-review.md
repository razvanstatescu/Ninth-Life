# Played drawings for How it works, the proof figure and all 13 feature boxes (landing round 2, final review after iteration 3)

Round 2 answers the user's five points with one mechanism. Each drawing is a `data-play` root that plays a short sequence once when it reaches the play line, then stays on its finished state (ADR-006 A7, MS-8.11). The desktop How picture follows the active step instead (A8, MS-8.12). Coverage now matches the request: How it works has a step-synced app screen plus one stage per step under 1024px, the proof figure plays its check as a column sweep, and every box has a played drawing (Made for both sides 4 of 4, Works the way you type 5 of 5 with the Accessibility note stage-less by design, Offline unless you choose 4 of 4). Iteration 3 fixed the last blocker, R3-B1 (doubled text in the proof chip cross-fade), and applied the product owner's answers on R3-P1, R3-P2 and R3-N6. This pass reread the diff against baseline `5434bed5` (tree `9e533ed9`) and confirmed the consolidated review's findings in the code; none blocks.

Watch for: Lighthouse and the production build were not re-run on the iteration 3 tree (R4-N3), so the 100 scores in `docs/testing/performance.md` describe the iteration 2 tree. On tall tablets, ember rings can show in 2 or 3 drawings at once during a slow scroll (R4-A1, likely, from the a11y audit). The aria-disabled Hear it still draws its pressed ring on press (R4-N1, confirmed).

**Verdict**: APPROVED

## High-level view

No required check fails (typecheck, 386 web unit tests, `site.mjs`, `axe.mjs`, `responsive.mjs` in both engines, `keyboard.mjs`, `switch.mjs`, `spell.mjs`, tm-lint, Kiro config checks; not re-run here). The verdict rests on the code and the visual evidence. The one check not run on this tree is Lighthouse with the production build.

The dashed typing chip now carries the real chip's icon and code as `visibility: hidden` slots, so both words start at the same x. The cost is cosmetic: for about 2.5 s of each play the dashed chip is as wide as the real one, with an empty gap before the word and an empty tail after it.

The per-row lead (`--play-i` × `motion-frame`, `--play-after` for Touch) keeps one ember ring at a time within a row, but nothing coordinates rows. A viewport tall enough to hold two rows can show rings in several drawings at once.

The rest are polish or owner calls. They cover Day-theme ring contrast, digits touching letters on 64px keys, tall drawings that play partly off screen on very short viewports, keys losing their edges in forced colors, small drawings in large stages under 1024px, and text wrapping in Privacy drawings. Two doc rows are stale: the spec test table and the KIRO_LOG iteration 3 prompt cell.

<details>
<summary>Issues (14)</summary>

1. **Lighthouse not re-measured (R4-N3)**: the build and Lighthouse numbers come from the iteration 2 tree. Before quoting scores or committing, re-run task 44 (build, `next start -p 3202`, `node scripts/lighthouse.mjs --write`) once the person agrees to stop the dev server.
2. **Ember rings in several drawings at once on tall viewports (R4-A1)**: at 1024 × 1366, rings showed in 2 or more drawings for 1,044 ms in total during a slow scroll, up to 3 at once. Add a page-wide "ember busy until" time in `SiteMotion` that feeds `--play-after`, or get the owner to accept it and correct the V39 note.
3. **Small drawings under 1024px (R4-P1, product owner)**: at 768 the layouts drawing is 221 × 92 in a 672 × 216 stage and Your view is 216 × 188 in 384px; Listen fills only the top of its 288px stage. Ask whether to extend the R3-P1 scale-up to 648px or center these drawings.
4. **aria-disabled Hear it still looks pressed (R4-N1)**: `.nl-btn--quiet:active` (components.css:37) draws its ring on a press that does nothing, and site.css:90 copies the `:disabled` look. Add `.nl-btn[aria-disabled="true"]` beside `:disabled` in components.css with `box-shadow: none` on `:active`, and drop the site copy.
5. **Hero token on a drawn button (R4-N1)**: `.site-listen > .site-drawn-btn { min-block-size: var(--target-cta) }` borrows the hero-CTA token for a 64px drawing height. Use a spacing sum.
6. **Typing chip drawn too wide (R4-N2)**: the hidden code slot leaves an empty tail after each dashed chip for about 2.5 s per play. Keep the icon slot, drop the code slot, and recheck with the MS-7.9 edge check; or record the look in design.md 4.2.
7. **Day-theme press ring at 1.49:1 to 1.81:1 (R4-A2)**: in Day, pair `.site-press-ring` with a 2px plum inner line as the scan ring has. Record it in design/system/README.md "Website drawings" first.
8. **Digits touch letters on 64px drawn keys (R4-A3)**: digit and letter boxes overlap by 10 × 9px. Add about 4px of top padding to `.nl-key__letters` inside `.site .nl-keypad` for 64px keys only.
9. **Tall drawings play partly off screen on short viewports (R4-A4)**: at 874 × 330 How step 1 plays with its well at −28..54. Play a drawing taller than the viewport only once its top is at or below 0, or accept it for the sideways phone.
10. **Keys lose their edges in forced colors (R4-A5)**: add `@media (forced-colors: active) { .site .nl-key { border: var(--line-width) solid transparent; } }`, or the unscoped rule after checking `/app`.
11. **Stale spec test table rows (R4-N4)**: `.kiro/specs/marketing-site/design.md` rows 992-993 still say "MS-7.4 getHowData() sentences each encode to 44" and "MS-6.7 Hear it disabled while playing". Change them to "MS-7.8 getHowData for 4663 with home chosen" and "aria-disabled while playing, stays focusable, ignores presses".
12. **KIRO_LOG iteration 3 row mislabels the answers (R4-N5)**: `docs/KIRO_LOG.md` line 35 says "answers on P1, P2, N6". Write R3-P1, R3-P2, R3-N6.
13. **Privacy drawing text wraps on narrow stages (R4-C1)**: the offline pill wraps at 320; two Ranking and Voices lines break before their last word at 768 and 390. Leave it or wrap on purpose, and record which in design.md 4.4.
14. **Untracked `.kiro/` files (R4-H1)**: 4 files must be committed before submission. Commit only when the person asks (tech rule 3).

</details>

<details>
<summary>Details</summary>

### The proof chip swap after R3-B1

Each word row still puts two layers in one `.site-cell` that cross-fade at `CHIP[row]` (steps 9, 10, 11 of the 240 ms sweep):

```
.site-cell.site-proof__chip  (justify-items: start)
 ├─ role('in',  CHIP[row]) → ProofChip:   [icon] word code
 └─ role('out', CHIP[row]) → typing chip: [icon] word code   (icon and code visibility: hidden)
```

The hidden slots give the dashed chip the real chip's full width, so before step 9 each dashed chip shows an icon-wide gap, the word, then an empty code-wide tail (`r4-proof3-1280x800-2560ms.png`). Only the icon slot is needed for alignment, because `justify-items: start` pins both chips to the left edge. (confirmed, cosmetic)

### Hear it as aria-disabled

`KeypadDemo.tsx` swaps `disabled={playing}` for `aria-disabled={playing || undefined}` and returns early from `hear()` while playing, so the button stays in the Tab order (35 stops at 1280) and a press during the play does not speak. The visual side is a site-only rule, `.site-demo__bar .nl-btn--quiet[aria-disabled="true"]`, which repeats the `:disabled` colour and background from `components.css`. `.nl-btn--quiet:active` still applies, so a press draws the line-strong inset ring as if it worked. That contradicts the "ignores presses" intent of MS-6.7, and the duplicated values can drift from the design system's disabled look. (confirmed)

### Cross-row ember rings

The lead formula in the motion block is `--play-lead: motion-play-lead + --play-i × motion-frame + --play-after`. `--play-i` is the card's column in its row from 648px, and Touch's `--play-after` waits for Keyboard's four quick-step rings. That keeps one ember ring at a time within a row (MS-7.3, tested in `site.test.tsx`). Rows are independent. On a 1024 × 1366 tablet the Access grid's row 1 (Keyboard, Touch) and row 2 (switch, Your view) can both reach the play line within a second at about 400 px/s. The a11y audit measured 1,044 ms in total with 2 or more drawings ringing, up to 3 at once, and 250 ms at 1920 × 1080. Accessibility rule 3 says ember marks one thing at a time. V39 accepts the cross-row case only for a fast scroll. Tablets are the second target, so this case is closer to normal use than V39 assumed. (likely: from the audit's timing run, not re-run here)

### Play range on short viewports

`shouldPlay` lets a drawing taller than the play area play when its whole box is on screen or its top is near the top of the viewport. On a sideways phone (874 × 330) the 416px How step 1 stage plays with its well at −28..54, so the first presses happen above the fold. At 375 × 549 the proof caption starts 15px above the viewport. The finished state is the meaning, so nothing is lost, but part of the sequence is unseen. (likely, a11y audit)

### Test coverage

Unit tests and `site.mjs` cover the play predicate and observers, the 4 s cap, in-row ring overlap, chip edge alignment, stage fit at 14 sizes, reduced motion and layout shift. Not tested: cross-row ember overlap, the `:active` ring on an aria-disabled button, the production build and Lighthouse on this tree, the OFFLINE=1 runs, screen readers' spoken output, a real Windows contrast theme, Firefox, and real phones and tablets.

</details>

<details>
<summary>File map</summary>

- `packages/web/components/site/motion.ts`, `SiteMotion.tsx`: `PLAY_LINE`, `shouldPlay`, `splitInitialPlay`, `activeStep`, `howStart`; four play observers and the How step observer.
- `packages/web/components/site/pictures/roles.ts`: typed `role()` and `play()` step classes, `lastChangeMs` for the 4 s cap test.
- `packages/web/components/site/pictures/HowScreen.tsx`: the step-synced screen, placeholder rows, per-step stages.
- `packages/web/components/site/pictures/Conversation.tsx`, `Access.tsx`, `Privacy.tsx`: the 13 box drawings.
- `packages/web/components/site/Pictures.tsx`: `ProofCheck`, `DigitLine`, the hidden chip slots (R3-B1).
- `packages/web/components/site/KeypadPicture.tsx`: key rings, `KeyPicture`, Touch and XL sizes.
- `packages/web/components/site/KeypadDemo.tsx`: Hear it aria-disabled while playing.
- `packages/web/components/site/sections/*.tsx`, `site-data.ts`, `app/page.tsx`: stages in cards; How (4663), spell (Mihai 64424) and proof data.
- `packages/web/components/site/site.css`: finished-state roles, stages, box grids, proof grid, the motion block (A7, A8), the 1024px scale-up, forced colors.
- `packages/web/lib/rankingProvider.ts`: `RANKING_SENT`.
- `design/system/tokens.json`, `packages/web/styles/tokens.css`: 6 motion tokens.
- `packages/web/test/*`, `test/e2e/site.mjs`, `axe.mjs`: unit and e2e coverage.
- `.kiro/specs/marketing-site/*`, `.kiro/steering/{accessibility,design-system}.md`, `.kiro/agents/a11y-auditor.json`, `design/system/README.md`, `docs/decisions/ADR-006-*.md`, `docs/research/marketing-site/*`, `docs/testing/*`, `docs/a11y/marketing-landing-v2.*`, `docs/KIRO_LOG.md`: spec, steering, research, audit, performance and log.

Full diff: snapshot the working tree into a temporary index as described in `.agents/tasks/marketing-landing-v2/baseline.txt`, then `git --no-optional-locks -c core.fsmonitor=false diff 5434bed5 9e533ed9`.

</details>
