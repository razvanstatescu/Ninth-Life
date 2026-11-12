# Landing page round 2 after fixer iteration 3: played drawings, How step sync and the proof check

This pass reviews the whole round-2 tree (baseline `5434bed5`, working tree `772c2c4a`) after the fixer's iteration 3. Round 2 handles all five points of the user's request with one mechanism. Each drawing is a `data-play` root that plays a short sequence once at the play line and then rests on its finished state (A7). The desktop How picture follows the active step (A8). All 13 feature boxes in Made for both sides, Works the way you type and Offline unless you choose now have a played drawing in a stage, and the research used the Mobbin MCP. Iteration 3 fixed the one blocker from the last pass: in the proof figure, the typing chip and the real chip now have their words at the same x, so the cross-fade no longer shows two offset copies. The tester measured 0px difference at 1280, 768 and 390, mid-fade included. The other R3 items are in as well.

Watch for: the hidden icon and code slots make the dashed typing chip as wide as the real chip, so before the swap each word sits in a wide, mostly empty chip with a blank gap on its left (confirmed, `r4-proof3-1280x800-2560ms.png`). Lighthouse was not re-run on this tree. The 100 scores in `docs/testing/performance.md` come from the iteration 2 tree (confirmed). The bigger drawings start at 1024px, so on phones (the first target) and tablets Listen, Your view and the layouts drawing still sit small in large stages (confirmed, the product owner chose "from 1024px"). None of these blocks.

**Verdict**: APPROVED

## High-level view

Every required check passes on this tree: typecheck, 386 of 386 web unit tests, `site.mjs` (Chromium 400 ok, WebKit 390 ok), `axe.mjs`, `responsive.mjs` in both engines, `keyboard.mjs`, `switch.mjs`, `spell.mjs` and tm-lint (testing step and fixer, not re-run here). Lighthouse is the exception: it was not run on this tree. No new copy breaks the banned-claims or trademark rules.

The proof chip fix uses layout only. The typing chip now holds the real chip's check icon and code as `visibility: hidden` slots, so the words line up and the steps and the 3.4 s total stay the same. As a side effect, the typing state draws a wider chip than the word needs. The word's x depends only on the icon slot. The code slot only matches the real chip's width.

The R3-P1 scale-up lives in the `min-width: 1024px` block. Desktop stages now look full, but the 648 to 1023px tablet layout and the phone layout keep small drawings in large stages, the look the user called "pretty bad". That follows the product owner's answer, so it is listed for the owner, not as a defect.

Hear it now stays in the Tab order while the demo plays: `hear()` returns early and `aria-disabled` replaces `disabled` (MS-6.7, with a unit case). Its disabled look is a site-only copy of the design system's `:disabled` rules in `components.css` instead of a Button state, so the two can drift.

<details>
<summary>Issues (6)</summary>

1. **Typing chip drawn too wide with blank slots** (confirmed, non-blocking): in `ProofCheck`, the hidden check icon and code make the dashed chip as wide as the real one, so "wafer" sits behind an empty icon gap with an empty tail for about 2.5 s of every play. Keep the icon slot, which is all the alignment needs, and drop the code slot so the dashed chip ends after the word. Or accept the look on purpose and note it in design.md 4.2. Recheck with the MS-7.9 edge check and timed screenshots.
2. **Lighthouse not re-measured on the final tree** (confirmed): iteration 3 changed about 30 CSS rules and added hidden markup, and the scores in `docs/testing/performance.md` belong to the iteration 2 tree. Before quoting the scores or committing, re-run task 44 (build, `next start -p 3202`, `node scripts/lighthouse.mjs --write`) once the person agrees to stop the dev server.
3. **Small drawings under 1024px** (confirmed, product owner): at 390 and 768, Listen fills only the top half of its 288px stage, Your view is 216 × 188 in a 384px stage at 768, and the layouts drawing is 221 × 92 in a 672 × 216 stage. Phones are the first target. Ask the owner whether to extend the R3-P1 scale-up or center these drawings below 1024px.
4. **Offline pill still wraps at 320** (confirmed, cosmetic): the fixer notes that "Offline. Using your dictionary." wraps in the narrowest stages. Leave it, or let the icon drop to its own line on purpose, and say which in design.md 4.4.
5. **KIRO_LOG iteration 3 row mislabels the answers** (confirmed): the prompt cell says "the product owner's answers on P1, P2, N6", but this iteration answered R3-P1, R3-P2 and R3-N6 (Hear it). Plain "N6" is the Privacy alignment fix from iteration 2. Write the R3 prefixes, because the log feeds the write-up.
6. **Design-system ownership of two new styles** (confirmed, nit): the `aria-disabled` look for Hear it is copied into `site.css` from the `.nl-btn:disabled` and `.nl-btn--quiet:disabled` rules in `components.css`. Move it there as `.nl-btn[aria-disabled="true"]` so the two states cannot drift. The drawn Listen button uses `--target-cta`, the hero-button token, only to set a 64px height. Use a spacing sum instead.

</details>

<details>
<summary>Details</summary>

## The proof chip after the alignment fix

```
.site-cell.site-proof__chip            (justify-items: start)
 ├─ role('in',  CHIP[row]) → ProofChip:   [✓] water 92837
 └─ role('out', CHIP[row]) → typing chip: [ ] wafer [·····]   ← hidden icon slot, hidden code slot
```

The fix works for the swap itself: the edge check in `site.mjs` passes at 14 sizes, and the timed screenshots show one word gaining its icon and code. The cost shows before the swap. The proof figure plays for 3.4 s, and the typing chips are on screen from the start until steps 9 to 11. During that time each one is a dashed outline about the width of "✓ water 92837" around a word that starts one icon width in (`r4-proof3-1280x800-1500ms.png`, `-2560ms.png`). The user asked for this figure to be researched and improved visually. The empty slots make the "not checked yet" state look unfinished, not deliberate. Only the leading slot is needed to align the words. Without the code slot, the dashed edge would end after the word, and the solid edge of the real chip would grow past it during the 200 ms fade. That reads as the chip gaining its code. (confirmed)

The tester also notes that the space reserved for the closing lines stays empty until k12, so the lower third of the panel is blank for most of the play. That space prevents layout shift (MS-11.2) and is in the design, so it is not a finding.

## Where the R3-P1 scale-up stops

All of the new sizing is inside `@media (min-width: 1024px)`: the doubled layout boxes, the roomier Your view halves with the greeting in `utterance` type, and Listen's 24px gaps with a 64px drawn button. Under 1024px the stages keep the heights of the 2 × 2 grids and of V37's equal Access row, while the drawings keep their 240px-fit sizes. At 390 the Listen card shows its strip and button in the top 40% of the stage, with an empty band below (`r4-privacy-390x844-finished.png`). product.md puts phones first and tablets second, so most visitors see the smaller version. The owner answered "from 1024px", so this needs their call, not a code fix.

## Test coverage

Unit and e2e coverage grew with each fix: the MS-7.9 word-edge check at 14 sizes, a 305px layout-width block standing in for a classic scrollbar, and a 16px floor for drawing text in both `site.mjs` and `site-css.test.ts` (only `.site-footer__caption` may use `caption`). Not tested: a real classic scrollbar (the block sets the width a scrollbar would leave), Lighthouse on this tree, real nav-link jumps and scroll restoration, screen reader output, a real Windows contrast theme, Firefox, and real phones and tablets.

</details>

<details>
<summary>File map</summary>

- `packages/web/components/site/motion.ts`, `SiteMotion.tsx`: `shouldPlay`, `PLAY_LINE`, `splitInitialPlay`, `activeStep`, `howStart`; four play observers and the How step observer.
- `packages/web/components/site/pictures/roles.ts` (new): `role`, `play`, `lastChangeMs`, step types.
- `packages/web/components/site/pictures/HowScreen.tsx` (new): the step-synced app screen, the placeholder rows and the per-step stages.
- `packages/web/components/site/pictures/Conversation.tsx`, `Access.tsx`, `Privacy.tsx` (new): the 13 box drawings.
- `packages/web/components/site/Pictures.tsx`: `ProofCheck` only, with the hidden icon and code slots in the typing chip (iteration 3).
- `packages/web/components/site/KeypadPicture.tsx`: key rings, `KeyPicture`, touch and XL sizes.
- `packages/web/components/site/KeypadDemo.tsx`: Hear it `aria-disabled` while playing (iteration 3).
- `packages/web/components/site/sections/*.tsx`, `site-data.ts`, `app/page.tsx`: stages first in each card, 2-column grids, build-time How (4663) and Spell (Mihai) data.
- `packages/web/components/site/site.css`: role system, stages, grids, proof sweep, the desktop scale-up, the classic-scrollbar fits, the forced-colours block; A5 removed.
- `packages/web/lib/rankingProvider.ts`: `RANKING_SENT`.
- `design/system/tokens.json`, `packages/web/styles/tokens.css`: 6 motion tokens.
- `packages/web/test/*`, `test/e2e/site.mjs`, `test/e2e/axe.mjs`: unit and e2e coverage.
- `.kiro/specs/marketing-site/*`, `.kiro/steering/{accessibility,design-system}.md`, `.kiro/agents/a11y-auditor.json`, `design/system/README.md`, `docs/decisions/ADR-006-*.md`, `docs/research/marketing-site/*`, `docs/testing/*`, `docs/a11y/marketing-landing-v2.*`, `docs/KIRO_LOG.md`: spec, steering, ADR amendment, research, audit, performance and log.

Full diff: snapshot the working tree into a temporary index as described in `baseline.txt`, then `git --no-optional-locks -c core.fsmonitor=false diff 5434bed5cd1a1ff6ac867852a411afcccba502c3 772c2c4af2a97a2e30c69c5710aa7354b480a983 -- . ':!.agents'`.

</details>
