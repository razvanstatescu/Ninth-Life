# Short phones drop the suggestion row so an iPhone SE with the Safari Bottom tab bar fits one screen

Task web-ui/51 (Req 25.1, 24.6, new 24.9). Under 548px visible height the stack shell no longer renders the suggestion section or the Spell/Add offer row, which frees 64px and lets 72px keys fit at 495px without a page scroll. The other sentences move to a new Menu > This sentence > Sentences button, and switch scanning skips the empty row. The change is gated by a `max-height: 547px` media query, so it is false on the server and in jsdom and the existing phone tests are untouched. A bugfix spec, ADR-005, requirement edits and two new measured sizes in `responsive.mjs` accompany the code.

Watch for: the bugfix task list marks a Chromium and WebKit re-measure as done, but `status.json` records no WebKit run (confirmed). The Spell and Add offer rows also disappear on short phones, and the bugfix spec only names the Add row (confirmed). The scan-skip test may not discriminate between the old and new behaviour (possible).

**Verdict**: NEEDS_CHANGES

## High-level view

The fix is a new rung at the bottom of the existing fit ladder in `lib/layout.ts`. `stackSuggestionRows` returns 0 when the new exception query matches, and `CommunicationScreen` turns that into "no `cands` section, no offer row, no suggestion cells in the scan grid". No CSS changes; the keypad area already takes leftover height. The threshold (548px) comes from the measured 53px overflow at 495px, which puts the content height at 548px.

The cost is on short phones only. The alternatives are one tap further (Menu, then Sentences), and the contextual Spell and Add rows are gone from the main screen. Spell this word stays in Menu. ADR-005 records the trade-off and says the product owner still has to confirm it, which is the right call, since this changes what people see on the smallest supported phone.

The record keeping has two gaps: the WebKit claim in the spec's task list, and the "known consequence" text that covers one of the two removed offer rows. The code and unit tests are otherwise consistent with the plan, and the checks in `status.json` (typecheck, 212 web tests, responsive, axe, keyboard, switch) all passed on Chromium.

<details>
<summary>Issues (6)</summary>

1. **WebKit re-measure claimed, not evidenced (blocking, confirmed)** — `.kiro/specs/iphone-se-bottom-bar-fit/tasks.md:11` ticks "responsive.mjs on Chromium and WebKit"; `status.json` has only the Chromium run. Run `ENGINE=webkit BASE_URL=http://localhost:3000 node test/e2e/responsive.mjs` (the bug is a Safari one) and keep the line, or reword it to Chromium only until it is run.
2. **Bugfix "Known consequence" omits the Spell row (non-blocking, confirmed)** — `bugfix.md:43` and ADR-005's consequences name only "Add <word> to my words". `CommunicationScreen.tsx:518-519` also nulls the "Spell <keys>" offer, which Req 24.4 shows when a word is not in the dictionary. Add it to both texts and say that Menu > Spell this word is the way in.
3. **"Check the words still lists the offer" not verified (non-blocking, possible)** — `bugfix.md:43-45` states it; nothing in the diff or tests shows it. Check the proof panel, or remove the clause.
4. **Scan-skip test may pass with the row present (non-blocking, possible)** — `phone.test.tsx:165-173` presses Space 5 times and asserts the actions section is scanning. It does not assert Clear as the last row (the plan asked for it) and was not shown to fail without the fix. Confirm it fails with the row rendered, or assert the row sequence directly.
5. **Fractional-height gap at the threshold (non-blocking, possible)** — `lib/layout.ts:121` uses `(max-height: 547px)`; a visible height such as 547.5px matches neither the short rung nor the 548px the row needs, leaving a sub-pixel scroll. Use `(max-height: 547.98px)` or `(height < 548px)` if fractional viewports occur. iOS usually reports integers, so low risk.
6. **Product steering and KIRO_LOG wording (non-blocking, confirmed)** — `.kiro/steering/product.md:36` still lists "suggestions" as always on the phone main screen, and the new `docs/KIRO_LOG.md:19` row claims Steering and Hook with an empty credits cell and no evidence. Add "except under 548px" to product.md and fill or trim the log row.

</details>

<details>
<summary>Details</summary>

### Offer rows removed with the suggestion row

`noSugRow` (`CommunicationScreen.tsx:517`) nulls `spellOffer` and short-circuits `phoneSuggestions` with an empty result. This matters because `phoneSuggestions(.., 0)` would report `more: true` and create a phantom scan cell; the guard avoids it. The side effect is that the in-context "Spell <keys>" and "Add X to my words" rows both vanish, so a short-phone user who types an unknown word sees an empty card with no prompt. Spell this word in Menu covers the first, and My words the second, but the bugfix spec and ADR-005 only acknowledge the second. The spec text should name both so the product owner confirms the real trade-off.

### Evidence for the fix versus what was recorded

The plan's step 5 asked for `responsive.mjs` on both engines and the spec task list says both were done, but `status.json` shows Chromium only. The bug is a Safari one and `svh` handling can differ between engines, so the WebKit run is the one that proves the fix. Run it or correct the line.

### Scan test strength

The new scan test (`phone.test.tsx:165`) is the only coverage for Req 24.8 with a missing row. With `scan2` and five Space presses it checks that `[data-section="actions"]` has `is-scanning`. If the first press only starts the scan, five presses reach row 4, which would be the suggestion row when it exists, so the test probably does discriminate. It was not run against the unfixed code, and it does not check the Clear row that the plan listed, so treat it as likely but unproven.

</details>

<details>
<summary>File map</summary>

Full diff: `.kiro/workflow-output/changes.diff`.

- `packages/web/lib/layout.ts` — `STACK_SHORT_QUERY`, `short` rung returning 0 rows
- `packages/web/components/CommunicationScreen.tsx` — `noSugRow` guards for offer, suggestions, `cands` section, Menu prop
- `packages/web/components/MenuSheet.tsx` — optional Sentences button in This sentence
- `packages/web/test/layout.test.ts`, `phone.test.tsx`, `mobile.test.tsx` — 24.9 and 25.1 tests
- `packages/web/test/e2e/responsive.mjs` — two Safari Bottom tab bar sizes, no-row assertion under 548px
- `.kiro/specs/iphone-se-bottom-bar-fit/{bugfix,design,tasks}.md` — new Bugfix spec
- `.kiro/specs/web-ui/{requirements,design,tasks}.md` — Req 24.6, 24.9, 25.1; count 22 to 24; task 51 not yet ticked
- `docs/decisions/ADR-005-…md`, `ADR-003-…md`, `docs/README.md` — new ADR, amendment note, index
- `.kiro/steering/{product,structure}.md`, `docs/plan/01-implementation-plan.md`, `docs/research/mobile-aac-evidence.md`, `docs/KIRO_LOG.md` — counts, status line, log row

</details>
