---
inclusion: always
---

# Trademarks and third-party material

The rules say the demo video "must not include third party trademarks, or copyrighted music or other material unless the Entrant has permission". We apply the same rule to the product, website, README, Devpost text and social posts, so nothing has to be scrubbed later.

## Never write these words

T9, Nokia, SwiftKey, Gboard — in any letter case, as a whole word or part of a name (`T9Mode`, `nokiaKeys`, `swiftkey-like`). Not in UI copy, alt text, file names, identifiers, comments, commit messages, test names, docs, the video script or posts.

Say instead: **"9-key predictive text"**, "the old phone keypad", "the 12-key keypad", "keypad decoding", "one press per letter".

Exceptions, because they must name the words to state the rule: this file, `scripts/tm-lint.mjs`, `docs/research/assumptions-register.md`, the source plan `docs/plan/00-source-plan.md`, the brand rules in `design/system/README.md` and two "never" cards in `design/artboards/`. A test that asserts a word is absent may add `tm-lint-allow` on that line (test files only).

`node scripts/tm-lint.mjs` enforces this in CI and in the `trademark-guard` hook on every agent save. It matches whole words only, so a glued identifier such as `T9Mode` slips through: name things `nineKey…` or `keypad…` from the start.

## Also off limits

- Drawings or photos of a recognizable phone model, phone-maker logos, keyboard-app logos, OS logos.
- Third-party voice names on screen in the video (system voice pickers can show vendor names; use a neutral voice or crop the picker).
- Copyrighted music or sound effects. Keypad tones are self-made; any other audio is original or CC0 with a source note.
- Other apps' screenshots or UI.

## Fine to name

- Kiro and AWS (the sponsor), Amazon Bedrock and the model we call, in the Kiro write-up, README credits and the video's Kiro section.
- Open-source and data sources in credits and NOTICE files, with their licenses (for example wordfreq, AACText, Atkinson Hyperlegible from the Braille Institute).
- Research papers by citation.
