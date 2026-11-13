# Consolidated review: landing page round 2, after fixer iteration 3

2026-11-12, workflow `wf_e69aacc718000e2c`. Merges the pr-reviewer output, the semantic review
(`semantic-review.json`, `semantic-review.md`), the a11y audit (`docs/a11y/marketing-landing-v2.json`, `.md`), the
testing step's `verification.md` and the fixer's `task-landing-round2/verification.md` (iterations 1 to 3). It
replaces the iteration 2 review (R3-B1, R3-N1 to R3-N6, R3-P1, R3-P2, R3-H1, R3-H2).

**Verdict: APPROVED**

No review branch failed, all three reviewers approved, and every required check passes on the iteration 3 tree.
Nothing below blocks. The remaining items are polish, product-owner calls and housekeeping before submission.

## Inputs

| Input | Result |
|---|---|
| pr-reviewer | APPROVED, 0 blocking, 4 nits |
| semantic reviewer | approved, 0 blocking, 6 findings (non-blocking, product owner, cosmetic, nit) |
| a11y-auditor | approved, 0 blocking, 1 moderate and 5 minor findings; nothing fails WCAG 2.2 AA or an MS SHALL |
| Testing `verification.md` (after iteration 3) | every e2e script passes in Chromium and WebKit; 3 visual problems listed as non-blocking |
| Fixer `task-landing-round2/verification.md` (iteration 3) | every check passes; production build and Lighthouse not re-run |

## Checks

None of the required checks fails, so none of them is a blocking finding.

- `pnpm -r typecheck`: pass, exit 0 (fixer, iteration 3).
- `pnpm -F @ninth/web test --run`: 386 of 386 pass (fixer, iteration 3).
- `node scripts/tm-lint.mjs` on the 11 changed files: clean (fixer, iteration 3). `validate-kiro-config.mjs` and `check-kiro-not-ignored.mjs`: ok.
- `site.mjs`: Chromium 400 ok, WebKit 390 ok (testing step). This includes the new MS-7.9 chip-edge check at 14 sizes, the classic-scrollbar 320 × 568 block and the 16px drawing-text check.
- `axe.mjs`: pass, 40 ok, motion on and off, Night and Day, 1280 and 390. The a11y auditor's own 8 axe runs found 0 violations.
- `responsive.mjs`: Chromium and WebKit pass, 181 ok each, 24 sizes.
- `keyboard.mjs` (18 ok), `switch.mjs` (5 ok), `spell.mjs` (17 ok): pass.
- Boxes without a visual: none. Made for both sides has 4 of 4, Works the way you type 5 of 5 (the Accessibility note has no stage by design), Offline unless you choose 4 of 4. All 17 drawings played in view at 1280, 768 and 390 wide, and all show their finished state with reduced motion (testing step, a11y audit at 11 sizes).
- Lighthouse: not re-run on this tree (R4-N3). The last result, on the iteration 2 tree, was 100 in all four categories.

## Earlier findings

All R3 items are closed:

- **R3-B1, the old blocker, is fixed.** The typing chip's word now starts at the same x as the real chip's word. The testing step measured 0.0px difference at 1280, 768 and 390, mid-fade included.
- **R3-N1 to R3-N4 are fixed.**
- **The product owner's answers are in the code:** R3-P1 (scale-up from 1024px), R3-P2 (16px text inside drawings) and R3-N6 (Hear it is `aria-disabled`). R3-N5 was declined and stays unchanged.
- **R3-H1 is still open** and is carried over below as R4-H1.
- **R3-H2 is resolved.** The dev server answered 200 before every run.

## Blocking

None.

## Non-blocking

### Should fix in the next pass (cheap, same files)

- **R4-N1. Hear it while `aria-disabled`: pressed ring and a copied disabled look.** Sources: pr-reviewer nit 1, semantic R4-6. While the demo plays, `.nl-btn--quiet:active` still draws the pressed ring on Hear it, so a press that does nothing looks like it worked (`site.css:90`, `components.css:37`, MS-6.7). The disabled look itself is a site-only copy of the `:disabled` values in `components.css`, so the two can drift. Fix: add `.nl-btn[aria-disabled="true"]` to `components.css` beside `:disabled`, including `box-shadow: none` on `:active`, and drop the copy from `site.css`. The semantic reviewer also notes that the drawn Listen button takes its 64px height from `--target-cta`, the hero-button token. Use a spacing sum instead.
- **R4-N2. The typing chip is drawn too wide.** Source: semantic R4-1. The hidden check icon and code slots make the dashed typing chip as wide as the real chip. For about 2.5 s of each play, each word sits behind an empty icon gap and is followed by an empty tail (`r4-proof3-1280x800-2560ms.png`). Only the icon slot is needed to align the words. Fix: drop the code slot so the dashed chip ends after the word. Otherwise, accept the look and record it in design.md 4.2. Recheck with the MS-7.9 edge check and timed screenshots.
- **R4-N4. Stale rows in the spec's test table.** Source: pr-reviewer nit 2. In `.kiro/specs/marketing-site/design.md`, row 993 still says "MS-6.7 Hear it disabled while playing" and row 992 says "MS-7.4 getHowData() sentences each encode to 44". Both contradict MS-6.7, MS-7.8 and the current tests (tech rule 7). Fix: change the two cells to "aria-disabled while playing, stays focusable, ignores presses" and "MS-7.8 getHowData for 4663 with home chosen".
- **R4-N5. KIRO_LOG iteration 3 row mislabels the answers.** Source: semantic R4-5. The prompt cell says "answers on P1, P2, N6", but the answers were R3-P1, R3-P2 and R3-N6. Plain N6 is the Privacy alignment fix from iteration 2. Write the R3 prefixes, because the log feeds the write-up.

### Before submission

- **R4-N3. Lighthouse not re-measured on the final tree.** Sources: pr-reviewer nit 3, semantic R4-2, fixer iteration 3 "Not run". Iteration 3 changed about 30 CSS rules and added hidden markup (3 icons, 3 codes). The 100 scores and the 208 KB of 250 KB transfer in `docs/testing/performance.md` come from the iteration 2 tree (MS-11.1, MS-11.2). Before quoting the scores or committing, re-run task 44: build, `next start -p 3202`, then `node scripts/lighthouse.mjs --write`. This needs the person's yes to stop the dev server (tech rule 1).

### Accessibility polish (a11y audit; none fails WCAG 2.2 AA)

- **R4-A1. Ember rings in 2 or 3 drawings at once on tall viewports** (moderate). Source: a11y finding 1. At about 400 px/s, rings showed in 2 or more drawings for 1,044 ms in total at 1024 × 1366, with up to 3 at once (Keyboard, Touch, switch). At 1920 × 1080 the total was 250 ms. Smaller viewports had 0 ms. This touches accessibility rule 3. MS-7.3 and MS-8.11 hold. The V39 note covers only a fast scroll. Fix: keep a page-wide "ember busy until" time in `SiteMotion` and add the remaining time to `--play-after`. Otherwise, the product owner accepts it and the V39 note is corrected to say "on viewports tall enough to hold two rows".
- **R4-A2. Day theme press ring at 1.49:1 to 1.81:1.** Source: a11y finding 2. This is `.site-press-ring` on drawn buttons and drawn computer keys, against 8.5:1 to 9.5:1 in Night (accessibility rule 8). WCAG 1.4.11 does not apply because the drawings are `aria-hidden`. Fix: in Day, add a 2px plum inner line, as the scan ring has. Record it in the "Website drawings" section of `design/system/README.md` first.
- **R4-A3. Digits touch the letters on 64px drawn keys.** Source: a11y finding 3. On drawn keys in the How picture, the How step 1 stage and the switch drawing, the digit box and the letters box overlap by 10 × 9px, so "2" sits on the "A" (`mlv2-how-keypad-64px-zoom.png`). Fix: for 64px drawn keys only, add about 4px of top padding to `.nl-key__letters` inside `.site .nl-keypad`. Keys stay 64px (MS-10.8).
- **R4-A4. Tall drawings on short viewports play partly off screen.** Source: a11y finding 4. At 874 × 330, How step 1 plays with its well at −28..54, and the proof plays with its last row and closing lines below the fold. At 375 × 549 the proof caption starts 15px above the viewport. The finished state stays, so nothing is lost. Fix: play a drawing taller than the viewport only once its top is at or below 0. Or show How step 1 finished on viewports under about 420px tall. Or accept it for the sideways phone.
- **R4-A5. Keys lose their edges in forced colors** (carried over). Source: a11y finding 5. In the Touch drawing, the 72px and 128px keys become two bare "2 ABC" labels. Fix: `@media (forced-colors: active) { .nl-key { border: var(--line-width) solid transparent; } }`. Check `/app` too, or scope the rule to `.site .nl-key`.

### Needs the product owner

- **R4-P1. Small drawings under 1024px.** Sources: semantic R4-3, testing visual problem 1. The R3-P1 scale-up starts at 1024px, which is what the owner answered. At 768 the layouts drawing is 221 × 92 in a 672 × 216 stage, and Your view is 216 × 188 in a 384px stage. At 768 and 390 Listen fills only the top part of its 288px stage. Phones are the first target and tablets the second (product.md), so most visitors see the smaller version. Ask whether to extend the scale-up to 648px or to center these drawings below 1024px.

### Cosmetic

- **R4-C1. Text wraps inside the Privacy drawings on narrow stages.** Sources: semantic R4-4, testing visual problem 2, fixer R3-N3 note. "Offline. Using your dictionary." still wraps at 320. It is on one line at 390, 768 and 1280. At 768 and 390, "The dictionary words that match them" breaks before "them" and "Sends the text to the browser maker" breaks before "maker". Nothing is cut off. Leave it or wrap it on purpose, and record which in design.md 4.4.

### Housekeeping

- **R4-H1. 4 untracked files under `.kiro/`** (R3-H1, still open). Sources: pr-reviewer nit 4, fixer `check-kiro-not-ignored.mjs` note. `.kiro/` must be committed before submission (hackathon rule, `structure.md`). Commit only when the person asks (tech rule 3).

### Carried over, declined

- **R4-N6. Inline issue link under 56px.** Source: a11y finding 6. "Open an issue on GitHub" is 187 × 22px. WCAG 2.5.8 exempts inline links, and the product owner declined to change it (R3-N5). No action.

## Noted, not a finding

- The space reserved for the proof's closing lines stays empty until the last step (about 3.2 s), so the bottom of the panel is blank for most of the play (testing visual problem 3). The space is reserved to avoid layout shift (MS-11.2), and the design calls for it. The semantic reviewer agrees it is not a finding.

## Confirmed by the reviews

- The change covers all five parts of the user's request:
  - How it works: the picture follows the active step, and each step has its own stage.
  - The proof figure plays its check as a short sequence.
  - Every box in Made for both sides, Works the way you type and Offline unless you choose has a played drawing.
- No banned claims and none of the listed trademark words in the new copy or the rendered page (pr-reviewer, a11y, tm-lint). The intended-purpose sentence appears word for word in the footer. Google and Apple appear only as plain words in the Listen card (ADR-004).
- There is no new motion beyond ADR-006 A7 and A8, and nothing is driven by the scroll position. Keyframes change only opacity and transform. Each sequence ends within 4 s (the longest is 3.42 s), and nothing loops.
- Reduced motion, and switching to reduced motion in the middle of a play, both show finished states with 0 animations (MS-8.7, MS-8.8, MS-8.13).
- There are 0 focusable elements inside `aria-hidden` drawings. Every focus stop has a visible outline of at least 4px. Hear it stays in the Tab order while the demo plays (35 stops at 1280).
- No text inside drawings is under 16px. The only 14px text is the footer caption (R3-P2, `site-css.test.ts`).
- The model call path and the logs are unchanged. Nothing was committed, and nothing was built while the dev server ran.

## Not covered by any review

- Screen readers' spoken output, a real Windows contrast theme, Firefox, real phones and tablets, real browser zoom and real scroll momentum (a11y "Not tested here").
- A real classic scrollbar: the `site.mjs` block sets the 305px width that a scrollbar would leave.
- Lighthouse, the production build and the OFFLINE=1 runs on this tree.
- The pr-reviewer did not open the screenshots under `features/`. For iterations 1 and 2 it relied on the earlier review and the verification files, not a full diff.
