# Candidate

One full-sentence reading of the keys pressed, ready to speak.

Candidates come from the offline dictionary first and are re-ranked by the language model when it is on. Every candidate on this list has already passed the proof check: each word encodes to its keys. Show up to 5, ranked; the rank number doubles as a shortcut (press 1 to 5).

- **Default**: `surface` fill, `line` border, sentence at 26px semibold.
- **Selected (`is-selected`)**: `ember-soft` fill and a `focus` ring; the rank badge turns ember. Selecting does not speak; Speak does.

The example shows real ambiguity: 92837 spells both "water" and "waves". Context decides the order; the person decides the sentence. Use `aria-pressed` for selection.
