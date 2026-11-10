# ADR-005: Short phones drop the suggestion rows

- Status: accepted
- Date: 2026-11-10
- Decided by: Kiro workflow, to be confirmed by the product owner
- Extends: ADR-003 (does not supersede it)
- Research: `docs/research/mobile-aac-evidence.md` §1 and implication 1
- Spec: `.kiro/specs/iphone-se-bottom-bar-fit/`, `web-ui` Req 24.6, 24.9, 25.1

## Context
ADR-003 says the main screen never scrolls on a touch device. An iPhone SE in Safari with the Bottom
tab bar shows 495px of page. With the header already hidden and keys at their 72px floor, the stack
shell needs 548px, so the page scrolled by 53px and Speak, Menu and Show were below the screen.

## Options
1. Keys under 72px. Rejected: breaks Req 15.8 (keys at least 72px).
2. Gaps under 8px. Rejected: breaks accessibility rule 1 (8px between targets).
3. Allow a short scroll on these phones. Rejected: breaks Req 25.1 and ADR-003.
4. Merge the sentence card and the suggestion into one two-line card. Rejected: changes the card height
   rules and the keypad's neighbour (Req 24.7), a larger change for the same gain.
5. Under 548px, drop the suggestion rows and put Sentences in Menu. Chosen: the row and its gap free
   64px, the only piece big enough that is not the sentence, the keypad or Speak.

## Decision
Under 548px visible height (`STACK_SHORT_QUERY = '(max-height: 547px)'`), the stack shell shows no
suggestion rows. Menu > This sentence gains Sentences, which opens "Sentences for your keys". `#` (Next)
still cycles the readings, and Spell this word stays in Menu. Phones 548px and taller, tablets and the
split shell are unchanged.

## Consequences
- On short phones the other sentences are one tap further away (Menu, then Sentences), and the
  contextual "Add <word> to my words" row is not on the main screen (Menu > My words and Check the words
  still add words).
- `test/e2e/responsive.mjs` checks 24 measured sizes, including 375 x 495 and 402 x 654 (Safari with
  the Bottom tab bar).
- The product owner should confirm this trade-off; the way back is to remove the short rung in
  `lib/layout.ts`.
