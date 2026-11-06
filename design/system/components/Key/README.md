# Key

One keypad key: the letters lead, the digit sits small in the corner.

Phone keypads print the digit big and the letters tiny. Ninth Life users think in letters, so the hierarchy flips: `nl-key__letters` (30px bold) is the label, `nl-key__digit` (15px mono) is a hint for people who learned the old phones.

- **Default**: plum fill, on-key text, `radius-key` corners, `key-size` (96px). Use `key-min` (72px) on narrow phones and `key-xl` (128px) when the Extra-large keys setting is on.
- **Lit (`is-lit`)**: ember fill, plum inner ring and `glow-ember`. It marks the one key the scanner or the user is on. Only one key is lit at a time.
- **Function key (`nl-key__word`)**: a word instead of letters: Space (0), Next (#), Back (*), Punctuation (1).

Accessibility: `aria-label` reads the digit and the letters spaced out ("4, G H I") so screen readers do not say "ghi". Pressed state is an inner ember ring, never a color change alone.
