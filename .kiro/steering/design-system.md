---
inclusion: fileMatch
fileMatchPattern: ["packages/web/**/*.tsx", "packages/web/**/*.css", "packages/web/**/*.ts"]
---

# Design system: use it, do not reinvent it

The source of truth is `design/system/`:

- `design/system/README.md`: voice, color, type, shape, motion, accessibility, surfaces, logo.
- `design/system/tokens.json`: every color (Night and Day values), type style, spacing, size, radius and shadow.
- `design/system/components/<Name>/README.md` and `preview.html`: Button, Key, Keypad, ProofChip, Candidate, SpeakBar (plus Cover). Styles in `design/system/components/bundle.css`, classes prefixed `nl-`.
- `design/system/assets/Logos/`: the icon and favicon. Do not redraw them.

Read the component README before building or changing that component. If something you need is missing, add it to the design system first (tokens, then component), then use it.

## Tokens

- Use CSS custom properties named exactly like the tokens (`var(--ember)`, `var(--surface-sunken)`, `var(--space-4)`, `var(--target-min)`, `var(--radius-key)`). No raw hex, px sizes or shadows in components except where a token does not exist yet; then add the token.
- Themes: **Night** is the default and the brand; **Day** follows `prefers-color-scheme: light` or the setting. Every token has both values. Keypad keys (`--key` plum, `--on-key`) are the same in both themes.
- Spacing is a 4px scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Sizes: `target-min` 56px, `key-min` 72px, `key-size` 96px, `key-xl` 128px, `focus-width` 4px, `scan-width` 6px, `ring-width` 3px, `line-width` 2px, `target-cta` 64px (website hero buttons).
- Radii: chip 14px, key 24px, card 28px, panel 44px, pill.
- Shadows: `lift` only on the keypad panel (the one floating element); `glow-ember` only on the lit key.

## Type

- Families: **Atkinson Hyperlegible Next** for everything, **Atkinson Hyperlegible Mono** for key sequences.
- They are self-hosted: woff2 files and their OFL texts in `packages/web/public/fonts/`, `@font-face` rules in `packages/web/styles/globals.css`. Keep it that way so the app works offline. Do not hotlink Google Fonts from the browser (no `@import` of fonts.googleapis.com in app CSS; `bundle.css` does that for design previews only), because a runtime request sends every visitor's IP address to a third party.
- Do not switch to `next/font/google` on the current Next version: it knows "Atkinson Hyperlegible Next" and "Atkinson Hyperlegible Mono" only from **Next.js 15.4.0** (checked 2026-11-06); the repo pins 15.1.12, which only has the older "Atkinson Hyperlegible".
- Styles: `utterance` 40px/600 is the largest text in the app; `candidate` 26px/600; `key-letters` 30px/700 with `key-digit` 15px mono; `body-lg` 20px is default app body; `label` 16px/600 is the smallest app text; `caption` 14px website and video only.

## Components and rules that are easy to break

- **Key:** letters lead (30px bold), the digit is small in the corner. `aria-label` is "4 GHI, G H I" (visible text first for WCAG 2.5.3, then spaced letters). Lit state = ember fill + plum inner ring + `glow-ember`; only one key lit at a time. Pressed = inner ember ring, never color alone.
- **Keypad:** fixed layout (1 punctuation, 2 to 9 letters, `*` Back, `0` Space, `#` Next). Never reorder keys, hide digits or add keys. Scanning: active row gets `is-scanning`, active key `is-lit`; highlight jumps, never slides.
- **Button:** primary (ember) is one per screen and is almost always Speak (`nl-btn--xl`, 80px). Secondary, quiet and danger variants as in the README. Danger asks to confirm. A disabled Speak uses the outlined secondary look (it is not ember while nothing can be spoken). On phones and tablets Speak sits in the action bar under the keypad, between Menu and Show.
- **Candidate:** up to 5, ranked; selecting does not speak, Speak does; `aria-pressed` for selection; every listed candidate already passed the proof check.
- **ProofChip:** match (check icon, solid border), new (plus icon, dashed border), reject (x icon, struck through, never spoken). Announce the state as a word.
- **SpeakBar:** the sentence in `utterance`, the key sequence under it in mono `ink-muted`, then Speak. Empty state says "Press a key to start". Never truncate. In the phone and tablet shell the sentence card has a fixed height in whole lines (1 to 3 by screen height) and scrolls inside itself, with Clear (then Undo) on the right.
- **Icons:** inline SVG, 24px grid, 2.5px round stroke, `currentColor`. App icons all in `components/Icon.tsx` (speaker, voice, check, plus, x, back, space, gear, switch, save, menu, show, flip, spell, said, mic, stop, thread, copy, share, offline); add new app icons there in the same style. Website-only icons (round 4, 2026-11-13) are in `components/site/icons.tsx`, in the same style, so the app's bundle does not carry them. No emoji, no filled glyph sets, no pictures of people, no mascot, no cartoon cat.
- **Copy:** plain verbs, sentence case, no exclamation marks, numbers as digits. See the Write / Not table in the README.

## Spooky, but calm

Kiroween wants atmosphere; our users need calm. Night theme, the cat-ear bubble and the one ember key carry the mood. No flicker, fog animation, jump scares, dripping text or low-contrast "ghost" text in the app. The website may use the motion tier of ADR-006 (slow fades, one-time reveals of at most 16px, drawings that play a short sequence once and stay finished (A7), the How it works row playing its three steps once in order (round 4, 2026-11-13: the sticky picture and its step sync, A8, are retired), a quiet hover layer on controls (A9), a cross-fade into the app); the video may use slow fades.
