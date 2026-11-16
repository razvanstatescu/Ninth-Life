# ADR-009: Word buttons, in a sheet, to fix any word

- Status: accepted
- Date: 2026-11-16
- Decided by: the lead (decision 5 of `docs/plan/02-improvement-plan.md`), to be confirmed by the product owner
- Reopens: ADR-008 option 3 (word targets)
- Spec: `web-ui` Requirement 32; code `packages/core/src/fix.ts`, `packages/web/components/FixSheet.tsx`

## Context
Only the last word could be changed (# cycles it; Back walks back through every later word). A wrong key in word
2 of 5 cost 40 presses instead of 23, and changing word 1 of 4 cost 32 instead of 16 (walkthrough,
`docs/research/improvement-plan/app-ux.md`). ADR-008 turned word targets down: words in the 40px sentence are
narrower than the 56px target rule, and scanning would need a third level (row, word, reading).

## Options
1. Tap a word in the sentence card. Rejected: "I" or "a" is far under 56px; a third scan level.
2. A row of word buttons on the main screen (what the improvement plan proposed). Rejected: the suggestion area
   holds 1 row at 548-759px and none under 548px, and the keypad must not move (ADR-003, Req 24.7), so a sentence
   of more than 3 words could not show its words at 56px; the row would also share its place with Finish the word
   (Req 31) and the sentences. A sheet has room on every screen, may scroll, and is already scanned row by row
   (Req 16.2).
3. Back through the sentence (today). Rejected: the cost above.
4. One press on the sentence (a large target) opens a sheet with one full-size button per word, then the word's other
   readings, words one key away, Retype and Spell. Chosen.

## Decision
- The sentence text is one button ("{sentence}. Fix a word", at least 56px); Menu and the laptop action row also
  have Fix a word. The sheet shows word buttons (at least 56px, text 16px or larger); scanning stays two levels per
  sheet step (row, then cell), with the sheet scanner of Req 16.2.
- Another reading keeps the keys. A word one key away changes them, only on a press, and the key line marks the
  change (a box, or a strike for a removed key, and words for screen readers). Retype replaces one word's keys in
  place, until 0.
- When a word's keys spell nothing, up to 3 words one key away are offered in the word row ("Did you mean", the
  places of Req 31). Nothing is ever fixed automatically.

## Consequences
- The claim is "every spoken word matches the keys on screen, and nothing gets there without your press"
  (decision 1, Req 31.8): the keys on screen are the ones after the person's own pick, and the change is shown.
- Fixing costs 1 press (the sentence) and 1-2 picks; by switch the sentence is a cell of the card's row.
- Retype adds an edit position to the composer: every "open word" check uses `openIndex`.
- The way back: remove the card button, the action and the sheet; Did you mean does not depend on them.
