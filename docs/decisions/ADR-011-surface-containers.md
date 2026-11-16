# ADR-011: Four surface kinds, closed by Back and by the backdrop

- Status: accepted
- Date: 2026-11-16
- Decided by: the lead (UX pass on menus, sheets and popups), to be confirmed by the product owner
- Spec: `web-ui` Requirement 36; code `packages/web/lib/surface.ts`, `packages/web/lib/useBackCloses.ts`,
  `packages/web/components/Sheet.tsx`

## Context
Every secondary surface used one container: a right-pinned `<dialog>`, 600px wide and full height. On a phone that is
a full-screen page, so Fix a word (3 buttons) or Check the words (1 line) hid the sentence being worked on and left
70% of the screen empty; on a laptop the same 3 buttons filled a 600x800 panel far from the button that opened them.
Back left the app with the sentence, a tap outside never closed anything, and the tablet Menu (bottom-left) opened on
the right. The audit and the pattern research are in the UX pass notes (iOS sheets and popovers, Material bottom
sheets and side sheets, the WAI-ARIA dialog pattern).

## Options
1. Keep one container and shorten the content. Rejected: a list and a 3-button choice still look the same, and the
   phone page still hides the sentence.
2. Native `popover="auto"` for the short surfaces. Rejected: not modal (the keypad would stay live behind it and
   scanning would need its own focus trap), and light dismiss would turn a switch press into Close.
3. One `<dialog>.showModal()` component with a kind per surface, laid out per device class. Chosen.

## Decision
- Kinds: **fit** (bottom sheet on phones; popover by its button on larger screens), **panel** (full height with a
  Done bar on phones; 440px side panel on its button's side), **dialog** (Settings: full height on phones; centred
  880px), **show** (Show mode, unchanged). Phones are screens under 600px wide; short phones (under 548px tall,
  ADR-005) get full height for every kind.
- All stay modal dialogs: inert background, Escape, focus in and back, Close as the first scan row.
- Back closes the surface on top: one history entry while anything is open, never on load, never stacked.
- The backdrop closes, except while scanning (the press is the switch), with typed text, with a question showing, and
  in the first 300ms (tremor).
- A surface opened from the Menu replaces it and has Back to Menu (second scan row).
- Every question asked inside a surface is the one `Confirm`, which carries `data-confirm`, so the backdrop rule
  cannot skip one (a tester found three hand-made confirms without the mark).
- A bottom sheet sits above the on-screen keyboard (`visualViewport`), and one that scrolls is cut through a row so
  its bottom edge shows there is more.
- Website links open in a new tab.

## Consequences
- A short surface keeps the sentence in view on a phone and sits by its button on a laptop: fewer eye and hand
  movements, the "popup, not a page" ask.
- The Done bar duplicates Close in thumb reach; it is outside the scan rows so the scan cost does not change.
- Popovers are positioned by script (no CSS anchor positioning yet, for Safari); with no known button (a switch
  press with no highlight, a deep link) a popover is centred.
- The way back: give every `Sheet` `kind="panel"` and drop `useBackCloses`; nothing is stored.
