# Implementation Plan: web-ui task 51 (Bugfix, iPhone SE in Safari with the bottom tab bar)

Spec: `web-ui` (`.kiro/specs/web-ui/`). Exactly one line matches ID 51.

Task line (tasks.md line 138, unchecked):

> - [ ] 51. Bugfix: iPhone SE in Safari with the bottom tab bar (495px visible) needs a short scroll (Req 25.1) — a good
>       first Kiro Bugfix spec (current, expected and unchanged behaviour)

## Requirement IDs

Named by the task: **25.1**.

Depends on or touched by the fix (all in `.kiro/specs/web-ui/requirements.md`):
- **24.6** fit ladder: today it drops, in order, the second suggestion row (<760), the second sentence line (<680), then the header and key line (<620). The fix adds one more rung.
- **15.8** (phones: whole keypad and Speak visible, keys >= 72px, targets >= 56px, text >= 16px). Unchanged, and it is why keys cannot shrink.
- **24.1, 24.4, 24.5, 24.8** (section order, suggestion rows, Menu holds Save phrase and Spell this word, scan row order). Touched by dropping the row.
- **25.2** (everything else reachable in one tap from Menu or the header). Needs a Sentences entry in Menu.
- **15.10, 24.7** (keypad does not move). Unchanged, re-checked by `responsive.mjs`.
- **16.1** (scan grid reaches every control). Re-checked for the case with no suggestion row.
- Accessibility steering rules 1, 2, 11 (targets 56px with 8px gaps, text 16px, no page scroll on touch, `svh` sizing). They rule out the cheaper fixes.

New requirement to write (rule 7: every new user-facing behaviour gets an ID and a test that names it):
- **24.9** WHILE the visible height is under 540px, THE stack shell SHALL drop the suggestion rows so the main screen does not scroll with 72px keys; Sentences for the keys SHALL be one tap away in Menu > This sentence > Sentences; Spell this word stays in the same Menu group.
- Edit **25.1**: "from 549px" becomes "from 495px, an iPhone SE in Safari with the bottom tab bar".
- Edit **24.6**: its list of what drops and its "at 549px and up" become "495px and up", and add: then the suggestion rows (under 540px, Req 24.9).

## Analysis (from the code and the CSS, nothing run yet)

Stack shell height at <620px visible (header hidden, `--shell-head: 0`, safe-area bottom 0 in a Safari tab, `packages/web/styles/app.css` lines 395-545):
top pad 8 + sentence card 64 (8+48+8) + 1 suggestion row 56 (`.phone-sugg` is 68 with margin -6) + keypad min 324 (4 x 72 + 3 x 8 + 12) + action bar 64 + 3 gaps x 8 = about **540px**. It fits 549 with a few px spare and overflows 495 by about 45px. Evidence: `docs/research/mobile-aac-evidence.md` §1 (495 = SE, Safari Bottom bar, measured) and implication 1 ("design for 495-549").

Cheaper fixes are not available. Keys under 72px break Req 15.8. Gaps under 8px break accessibility rule 1. A 64 to 56px action bar plus less card padding gains about 16px, so 29px is still missing. Only the suggestion row (56 + 8 gap) is big enough. It is also the last thing Req 24.6's ladder can drop that is not the sentence, the keypad or Speak. Freed space goes to the keypad (`[data-section="pad"] { flex: 1 1 0 }`), about 19px spare at 495.

What the person keeps without the row: `#` (Next) cycles readings; the sentences sheet (`sheet === 'sentences'`, already built for "More") opens from a new Menu button; "Spell this word" is already in Menu (Req 24.5). The "Add X to my words" row has no Menu equivalent; My words (Menu > My words) still adds words. State this as a known consequence in the bugfix spec.

Behaviour is browser-only (media query), so it follows tech rule 5: `useMediaQuery`, server snapshot `false`. The new query must be the **exception** (`max-height`, false in jsdom and on the server), not a new `min-height` that is false by default, or every existing phone test (jsdom has no `matchMedia`) would lose its suggestion row.

## ADR

**ADR-005** `docs/decisions/ADR-005-short-phones-drop-suggestions.md`. Trade-off: fit the iPhone SE with the Bottom tab bar (495px) vs keep sentence alternatives on the main screen; alternatives considered: keys under 72px (rejected, Req 15.8), 4px gaps (rejected, accessibility rule 1), allowing a short scroll (rejected, ADR-003 / Req 25.1), a two-line card merge (rejected, moves the keypad's neighbour and card height rules in Req 24.7). It extends ADR-003, does not supersede it. Status accepted, date from the day of the change, "Decided by: Kiro workflow, to be confirmed by the product owner" (the decision changes what people see on small phones, so say it plainly in the final report).

## Steps (each leaves the repo buildable)

- [ ] 1. Reproduce first: add the two measured Safari sizes to `DEVICES` in `packages/web/test/e2e/responsive.mjs` and see 375x495 fail.
      Add `['iPhone SE, Safari Bottom tab bar', 375, 495, 375, 667]` and `['iPhone 17 Pro, Safari Bottom tab bar', 402, 654, 402, 874]` after the SE rows (both sizes are in `mobile-aac-evidence.md` §1 and implication 1). Update the header comment sizes if it lists them. Do not change the `check` calls yet.
      Files: `packages/web/test/e2e/responsive.mjs`
      Verify: with the dev server already running (never run `next build`): from `packages/web`, `BASE_URL=http://localhost:3000 node test/e2e/responsive.mjs`. Expect: the 375x495 row fails "the main screen does not scroll" (about 45px over); 402x654 passes. If the dev server is not reachable, stop and ask (do not start a build). Record the exact overflow and the content height at 375x549 (`scrollHeight`) in the bugfix spec; this sets the threshold in step 3.

- [ ] 2. Write the Bugfix spec and the requirement text before code (spec first).
      Create `.kiro/specs/iphone-se-bottom-bar-fit/bugfix.md` with three sections: **Current behaviour** (375x495: the main screen scrolls about the measured px; cause from the analysis above), **Expected behaviour** (EARS, from Req 25.1 and 24.9: no page scroll from 495px; suggestions dropped under 540px; Sentences in Menu), **Unchanged behaviour** (keys >= 72px, targets >= 56px with 8px gaps, text >= 16px, keypad does not move while typing, Speak/Menu/Show/Clear on screen, the 549 and taller phones keep their suggestion rows, tablets and the split shell unchanged, scan order of Req 24.8 minus the empty row). Add `design.md` (the fix in 10 lines: query constant, `stackSuggestionRows` rung, `CommunicationScreen` guard, Menu button) and `tasks.md` (this plan's code steps, each naming 25.1 / 24.9). Edit `.kiro/specs/web-ui/requirements.md` (25.1, 24.6, new 24.9 under Requirement 24) and `.kiro/specs/web-ui/design.md` (Layout section: add the short-screen rung; update "22 measured" to 24).
      Files: `.kiro/specs/iphone-se-bottom-bar-fit/{bugfix,design,tasks}.md`, `.kiro/specs/web-ui/requirements.md`, `.kiro/specs/web-ui/design.md`
      Verify: `node scripts/validate-kiro-config.mjs` passes; `node scripts/tm-lint.mjs` passes (no banned words; write "9-key predictive text" if the keypad needs a name).

- [ ] 3. Drop the suggestion rows on short screens (logic).
      In `packages/web/lib/layout.ts`: add `export const STACK_SHORT_QUERY = '(max-height: 539px)';` (set the number to one less than the smallest visible height that still fits the row, measured in step 1; 540 is the computed value). Change `stackSuggestionRows(h: { r2; r3; r4; short?: boolean }): 0 | 1 | 2 | 3 | 4` to return `0` first when `h.short`. `short` is optional so existing callers and tests keep working. In `packages/web/components/CommunicationScreen.tsx` (near line 505): pass `short: useMediaQuery(STACK_SHORT_QUERY)`. When `sugRows === 0`: `spellOffer` is `null`, `sug` is `{ items: [], more: false }` (do not call `phoneSuggestions` with 0, it would report `more: true`), so `phoneCandCells` is 0 and the scan reducer skips the row (the grid comment says empty rows are skipped), and the `cands` section is not rendered (line 783-796), so the pad's `flex: 1 1 0` takes the room. Split layout is untouched (`splitRows` is not given `short`).
      Add the Menu entry: in `packages/web/components/MenuSheet.tsx` add an optional `onSentences?: () => void` to the `sentence` prop and a `Button variant="secondary" icon="check"`-style entry labelled "Sentences" in the "This sentence" group (use the icon already used for lists in `Icon.tsx`, add none; if none fits use `check`). Pass `onSentences: sugRows === 0 ? openSentences : undefined` from `CommunicationScreen` so the button shows only when the row is gone. The existing `Sheet name="sentences"` (title "Sentences for your keys") is reused.
      Files: `packages/web/lib/layout.ts`, `packages/web/components/CommunicationScreen.tsx`, `packages/web/components/MenuSheet.tsx`
      Verify: `pnpm -F @ninth/web test --run` (existing phone, mobile, layout, scan tests still pass) and `pnpm -r typecheck`.

- [ ] 4. Tests that name the requirement (add with step 3; they must fail before it).
      - `packages/web/test/layout.test.ts`, in the "suggestion rows grow with the screen height" block: `24.9 stackSuggestionRows returns 0 when the screen is short` (also with r2/r3/r4 true) and `STACK_SHORT_QUERY` equals the max-height rung. Existing cases stay as they are.
      - `packages/web/test/phone.test.tsx`: new `describe('short phones (web-ui Req 24.9, 25.1)')` with `window.matchMedia` stubbed (`vi.stubGlobal`, matches true only for `STACK_SHORT_QUERY`, `addEventListener`/`removeEventListener` as no-ops, `vi.unstubAllGlobals()` in `afterEach`): (a) `24.9 no suggestion row, still section order speak, pad, actions`; (b) `24.9 Menu > This sentence has Sentences and it opens "Sentences for your keys"`; (c) `24.9 Sentences is absent from Menu when the row is shown` (no stub); (d) `24.9 24.8 one-switch scan skips the empty suggestion row` (copy the fake-timer pattern of the existing `24.6 one-switch scanning` test at about line 100; the rows go keypad, actions, Clear); (e) `24.9 Spell this word stays in Menu`.
      - `packages/web/test/mobile.test.tsx`: `25.1 the stack shell keeps its fit rules` reading `styles/app.css`: asserts the `min-height: calc(100svh ...)` shell rule is unchanged and no `dvh` (extends the existing svh test; no new CSS is expected).
      - `packages/web/test/e2e/responsive.mjs` (not a unit test): `shown.suggestions` must be required only when `vh >= 540`; for `vh < 540` assert `.phone-sugg` is absent, and that the page does not scroll and the keypad is on screen. Use the same threshold constant text as `STACK_SHORT_QUERY` in a comment.
      Files: `packages/web/test/layout.test.ts`, `packages/web/test/phone.test.tsx`, `packages/web/test/mobile.test.tsx`, `packages/web/test/e2e/responsive.mjs`
      Verify: `pnpm -F @ninth/web test --run` passes with the new tests listed by name; temporarily confirm (git stash of step 3 files is NOT allowed; instead run the new tests before step 3 in the working tree) that 24.9 tests fail without the code.

- [ ] 5. Re-measure in the browser, on both engines.
      With the dev server running: from `packages/web`, `BASE_URL=http://localhost:3000 node test/e2e/responsive.mjs`, then `ENGINE=webkit BASE_URL=http://localhost:3000 node test/e2e/responsive.mjs`. Expect all 24 sizes pass, including 375x495, and 375x549 / 390x699 etc. still show the suggestion row. Then `axe.mjs`, `keyboard.mjs`, `switch.mjs` with the same `BASE_URL` (the sheet and the row removal touch focus and scan order). If 375x495 still scrolls, fix the remaining px by trimming `.phone-actions .nl-btn` `min-height` 64 to 56 (still a 56px target) and nothing else; do not touch key size or gaps.
      Files: none unless the fallback above is needed (`packages/web/styles/app.css`)
      Verify: every command above exits 0.

- [ ] 6. Docs and the task tick.
      - Add `docs/decisions/ADR-005-short-phones-drop-suggestions.md` (see ADR section), and a one-line "Amended by ADR-005" note in the Consequences list of `docs/decisions/ADR-003-one-screen-portrait-phones.md`, and update its "22 measured" count to 24.
      - Update the count 22 to 24 in `.kiro/specs/web-ui/tasks.md` (49.2), `.kiro/steering/structure.md` line 14, `.kiro/steering/product.md` (the "Check layout changes" sentence), `docs/plan/01-implementation-plan.md` (F19 row). Edit only the number.
      - `.kiro/specs/web-ui/tasks.md`: change task 51 to `- [x] 51.` and add a sub-line `  - [x] 51.1 Tests: ...` listing the test files from step 4 and `test/e2e/responsive.mjs` (375x495), same style as 50 / 50.1.
      - `docs/KIRO_LOG.md`: add a row for this session if the `log-task` hook did not.
      - `docs/research/mobile-aac-evidence.md`: add one line under implication 1 saying 375x495 is now in `responsive.mjs`.
      Files: as listed
      Verify: `node scripts/tm-lint.mjs && node scripts/validate-kiro-config.mjs && node scripts/check-kiro-not-ignored.mjs`, then `pnpm -r typecheck` and `pnpm -r test --run`.

## Digest

Verified by reading (nothing was built or run; the shell here is slow, `git status` took over 2 minutes):

| File | Block to change | Test | Verified |
|---|---|---|---|
| `packages/web/lib/layout.ts` | line 109-114: `stackSuggestionRows(h: {r2;r3;r4}): 1\|2\|3\|4` and `STACK_ROWS_QUERIES`; add `STACK_SHORT_QUERY`, rung `short` | `test/layout.test.ts` "suggestion rows grow with the screen height" (calls with `{r2,r3,r4}` only, so `short` must stay optional) | read |
| `packages/web/components/CommunicationScreen.tsx` | lines 504-511 (`stackRows`, `sugRows`), 513-521 (`spellOffer`, `sug = phoneSuggestions(...)`), 538 (`phoneCandCells`), 783-796 (`cands` section), MenuSheet props near the Menu sheet | `test/phone.test.tsx`, `test/mobile.test.tsx` | read; `phoneSuggestions(.., rows=0)` returns `more: true`, so guard needed |
| `packages/web/components/MenuSheet.tsx` | lines 14-60: `sentence` prop type and "This sentence" group (Save phrase, Spell this word, Check the words, They said) | `test/phone.test.tsx` ("Menu groups") | read |
| `packages/web/components/PhoneSuggestions.tsx` | not changed; `rows` 1-4 only (class `phone-sugg--N`) | `phoneSuggestions` unit tests in `test/phone.test.tsx` | read |
| `packages/web/styles/app.css` | lines 395-545 stack shell; expected unchanged; fallback only `.phone-actions .nl-btn` min-height | `test/mobile.test.tsx` CSS reads | read |
| `packages/web/test/e2e/responsive.mjs` | `DEVICES` list (22 entries), `shown.suggestions` check | itself | read |
| `.kiro/specs/web-ui/{requirements,design,tasks}.md` | 24.6, 25.1, new 24.9, Layout section, task 51 | n/a | read |
| `docs/decisions/ADR-003-...md`, new `ADR-005-...md` | Consequences list; new file | n/a | read |

Commands (from `tech` steering and `package.json` conventions): unit `pnpm -F @ninth/web test --run`; types `pnpm -r typecheck`; e2e from `packages/web` with `BASE_URL=http://localhost:3000 node test/e2e/<name>.mjs` (add `ENGINE=webkit`); rules `node scripts/tm-lint.mjs`, `node scripts/validate-kiro-config.mjs`, `node scripts/check-kiro-not-ignored.mjs`. Never `next build` while the dev server runs. No formatter. No commit unless asked. Not verified today: which tests pass now (not run).

Guardrails for the coder: no words from the trademark list in .kiro/steering/trademarks.md anywhere; user-facing text is plain ("Sentences", sentence case, no exclamation marks); no new numbers or speed claims; the intended-purpose sentence is not touched; no `.env*` access; no new icon unless added in `components/Icon.tsx`.

## Baseline (`git -C /Users/razvanstatescu/Documents/Work/Ninth-Life status --porcelain`, taken before this plan was written)

```
?? .kiro/workflows/
```

Everything else was clean. `.kiro/workflow-output/` (this plan and `status.json`) is created by the planning step and will show as untracked; later steps should not count it, or `.kiro/workflows/`, as task changes.
