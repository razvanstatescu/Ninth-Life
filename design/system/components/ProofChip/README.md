# ProofChip

A word with its proof: did the keys the person pressed spell it.

Three states, each told apart by icon, border style and text treatment, never by color alone:

- **Matches (`nl-chip--match`)**: check icon, solid `proof-match` border, light tint. The word encodes to exactly the keys pressed and is in the dictionary.
- **New word (`nl-chip--new`)**: plus icon, dashed `proof-new` border. The word encodes to the keys but is not in the dictionary, such as a name. It can be spoken; tapping it adds it to the person's words.
- **Rejected (`nl-chip--reject`)**: x icon, `proof-reject` border, struck-through text. A model suggestion whose letters do not match the keys. It is shown in the proof panel so people can see the model was overruled, and it is never spoken.

`nl-chip__code` shows the word's key sequence in mono under `ink-muted`. Screen readers announce the state as a word ("water, matches"), so add visually hidden text when the chip is read aloud.
