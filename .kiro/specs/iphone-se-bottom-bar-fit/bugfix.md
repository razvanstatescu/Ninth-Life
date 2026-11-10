# Bugfix: iPhone SE in Safari with the Bottom tab bar needs a short scroll

Spec: `web-ui` task 51, Req 25.1 (and 24.6, new 24.9). Decision: ADR-005. Evidence:
`docs/research/mobile-aac-evidence.md` §1 (495px is the visible height of an iPhone SE in Safari with
the Bottom tab bar, measured in the iOS Simulator) and implication 1 ("design for 495-549").

## Current behaviour

- At 375 x 495 (iPhone SE, Safari, Bottom tab bar) the main screen scrolls by 53px, and Speak, Menu
  and Show sit below the visible screen (`test/e2e/responsive.mjs`, Chromium, before the fix).
- Cause: under 620px the stack shell already hides the header and the key line, and the keys are at
  their 72px floor. What is left needs 548px: the top padding, the one-line sentence card, one
  suggestion row, the keypad (4 rows of 72px keys with 8px gaps and padding), the action bar and the
  gaps between them. 375 x 549 fits with 1px spare; 495 is 53px short.
- The cheaper fixes do not fit the rules: keys under 72px break Req 15.8, gaps under 8px break
  accessibility rule 1, a page scroll breaks Req 25.1 and ADR-003, and a smaller action bar and card
  padding win about 16px of the 53px.

## Expected behaviour

- 25.1 ON a touch device THE main screen SHALL NOT scroll from 495px visible height (an iPhone SE in
  Safari with the Bottom tab bar) and up.
- 24.9 WHILE the visible height is under 548px, THE stack shell SHALL drop the suggestion rows, so the
  keypad and the action bar fit with 72px keys.
- 24.9 WHILE the suggestion rows are dropped, Menu > This sentence SHALL offer Sentences, which opens
  "Sentences for your keys"; Spell this word SHALL stay in the same Menu group.
- 24.9 WHILE the suggestion rows are dropped, switch scanning SHALL skip the missing row: keypad rows,
  then the action bar, then Clear (or Undo).

## Unchanged behaviour

- Keys stay at least 72px, other targets at least 56px with 8px gaps, app text at least 16px (Req 15.8,
  accessibility rules 1 and 2).
- The keypad does not move while a long sentence is typed (Req 15.10, 24.7).
- Speak, Menu, Show and Clear stay on the main screen (Req 24.2, 24.3).
- Phones 548px tall and taller (375 x 549 and up) keep their suggestion rows, Spell row and More.
- Tablets and the split shell are unchanged (the split shell does not use the short rung).
- Laptop and desktop layouts (wide, compact) are unchanged.
- The scan order of Req 24.8 is unchanged, minus the empty suggestion row.

## Known consequence

On a short phone the contextual "Add <word> to my words" row is not on the main screen. Words can still
be added from Menu > My words, and Check the words (Menu) still lists the offer.
