# Review of spec task web-ui/51: consolidated verdict

**Verdict: CHANGES_REQUESTED**

All three reviewers completed (a11y-auditor, pr-reviewer, semantic_reviewer). None is listed as not completed. Nobody re-ran the test suites; the reviewers read `status.json`, which shows typecheck, 212 web unit tests, and the responsive, axe, keyboard and switch e2e scripts passing on Chromium.

Reviewer verdicts:
- a11y-auditor: no blocker, no serious issue.
- pr-reviewer: approve with nits, no blocking items.
- semantic_reviewer: NEEDS_CHANGES, one blocking item.

## Blocking

**B1. Record claims a WebKit run that did not happen** (semantic_reviewer #1, confirmed)
- Where: `.kiro/specs/iphone-se-bottom-bar-fit/tasks.md:11`
- Rule: records must match evidence. The line ticks the re-measure "on Chromium and WebKit", but `status.json` has no WebKit run, and the bug is a Safari one.
- Fix: run `ENGINE=webkit BASE_URL=http://localhost:3000 node test/e2e/responsive.mjs` from `packages/web` and record the result, or reword the line to Chromium only.

## Non-blocking

**N1. Fractional heights fall between the two rules** (a11y-auditor #3, pr-reviewer, semantic_reviewer #5)
- Where: `packages/web/lib/layout.ts:121`, `layout.test.ts`, `test/e2e/responsive.mjs`, ADR-005.
- `(max-height: 547px)` is false at 547.5px, while Req 24.9 says "under 548px". a11y calculated this and did not measure it. iOS usually reports integers.
- Fix: `(max-height: 547.98px)` or `(height < 548px)`, then update the asserted string in the tests and the ADR.

**N2. Silent dictionary error on short phones** (pr-reviewer)
- Where: `CommunicationScreen.tsx:795` and `:909`.
- The new filter removes the section that carries "Dictionary not loaded. Reload to try again." on short phones.
- Fix: show the text in the sentence card for `dict.status` `'missing'` or `'error'`, or add a test and an ADR note showing where it appears.

**N3. Lost offers under 548px are under-documented** (a11y-auditor #2, semantic_reviewer #2, pr-reviewer)
- Where: `bugfix.md:43`, ADR-005 consequences, `CommunicationScreen.tsx:518-519`.
- Both "Spell <keys>" and "Add <word> to my words" are removed. The texts name only the second. Nothing on the main screen says other sentences exist.
- Fix: name both in the texts and point to Menu > Spell this word and Menu > My words. Optionally show the sentence count on the "Sentences" button and in the live region (wording needs sign-off).

**N4. Unverified claim about Check the words** (semantic_reviewer #3, pr-reviewer)
- Where: `bugfix.md:43-45`, `phone.test.tsx`.
- Fix: add a test under 24.9 that Menu > My words and Check the words still offer the word, or drop the clause.

**N5. Scan-skip test may not prove the fix** (semantic_reviewer #4)
- Where: `phone.test.tsx:165-173`.
- Fix: confirm it fails with the row rendered, or assert the row order, including Clear last.

**N6. Focus return from the Sentences sheet is untested** (pr-reviewer)
- Where: `MenuSheet.tsx:55`, `phone.test.tsx`.
- a11y checked by hand that Escape returns focus to Menu.
- Fix: add a unit test, and consider an axe pass on the open sheet.

**N7. Steering text out of date** (semantic_reviewer #6)
- Where: `.kiro/steering/product.md:36`.
- Fix: add "except under 548px".

**N8. KIRO_LOG row** (pr-reviewer, semantic_reviewer #7)
- Where: `docs/KIRO_LOG.md:19`.
- Empty credits cell, and Steering and Hook usage claimed with no evidence.
- Fix: fill the cell and trim the unsupported claims.

**N9. Task 51 not ticked** (pr-reviewer)
- Where: `.kiro/specs/web-ui/tasks.md`.
- Expected to be done by the final workflow step. Add `- [x] 51.` and a `51.1 Tests:` sub-line.

**N10. ADR-005 awaits the product owner** (pr-reviewer)
- "Decided by: Kiro workflow, to be confirmed by the product owner". Confirm before release.

**N11. Text spacing scroll, pre-existing** (a11y-auditor #1)
- Where: `.app--stack .shell-screen`.
- WCAG 1.4.12 and rule 11. With text-spacing overrides the page scrolls 60 to 71px on phone heights.
- Fix: scroll inside `.shell-screen` with a sticky action bar, or list 1.4.12 as a known exception. Product decision.

**N12. Duplicate icon** (a11y-auditor #4)
- Where: `MenuSheet.tsx:56`. "Sentences" uses the same `menu` icon as the Menu button. Use `check` or add a list icon.

**N13. Screens under 495px tall** (a11y-auditor #5)
- A 360x400 touch viewport scrolls 84px. No fix for this task. Measure a real height first and add it to `responsive.mjs`.

**N14. One-line sentence card at 495px** (a11y-auditor #6)
- Unchanged by task 51. Show mode has the full sentence.

## What passed (a11y-auditor)
No page scroll at 495, 540, 547, 548, 549, 654 and 699 tall. The suggestion row is dropped at 547 and below. Keys are 74.8px at 495. Speak is the only ember fill. Reduced motion, focus order and day contrast pass. Two-switch scanning skips the missing row. The intended-purpose sentence is in the Menu About group and on `/about`.

## Not checked by any reviewer
Real iPhone or iPad hardware and Safari, safe-area insets, VoiceOver, TalkBack or NVDA, real switch hardware and scan timing, 200% zoom on a phone, `/welcome` and the Show, Phrases, My words and Settings sheets, and a WebKit e2e run.
