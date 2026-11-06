# Design system (knowledge base)

The Ninth Life design system is the source of truth for every surface: the app, the website, the
demo video and social cards. This page explains where it lives and how code uses it. The brand book
itself is `design/system/README.md`; read it before touching UI or copy.

## Where things live

| Source | Path in repo | Origin |
|---|---|---|
| Brand book (voice, color, type, motion, a11y, logo rules) | `design/system/README.md` | Design System artifact "Ninth Life" |
| Tokens (two themes: `night` default, `day`) | `design/system/tokens.json` | same |
| Component reference CSS (`nl-` prefix) | `design/system/components/bundle.css` | same |
| Component guidelines + reference markup | `design/system/components/<Name>/{README.md,preview.html}` | same |
| Logos (icon, favicon variant) | `design/system/assets/Logos/*.svg` | same |
| Brand canvas artboards (direction, logo, colour/type, interface kit, app, website, video/social) | `design/artboards/*.dc.html` | Design canvas "Ninth Life brand" |

The artifacts on claude.ai are the editable originals:
- Design system: https://claude.ai/artifact/1Vov6WZtZzFNW7NgQ4NBfD
- Brand canvas: https://claude.ai/artifact/HPSybdpN47LkWyXkCYmePB

When the design system changes there, copy the changed files into `design/` and regenerate tokens
(`pnpm -F @ninth/web exec node scripts/gen-tokens.mjs`). Code never edits `design/` directly; propose
changes in the artifact first.

## The three ideas

- **The bubble:** a speech bubble. Keys become spoken words.
- **The ears:** two cat ears on the bubble. Nine lives; the second life of an old technology.
- **The ninth key:** eight dark keys and one lit in ember. In the app, the key you are about to choose.

No mascots, no faces, no cartoon cat, no phone drawings.

## Tokens in one table

| Family | Tokens | Rule of thumb |
|---|---|---|
| Brand | `night #140a2e`, `plum #2a1856`, `moon #eee8ff`, `ember #ffb13d` | Straight from the icon |
| Grounds | `ground`, `surface`, `surface-sunken` | Night by default, Day for bright rooms |
| Text | `ink`, `ink-muted`, `link` | ≥ 6.4:1 on every surface in both themes |
| Keypad | `panel`, `key`, `on-key` | Same keys in both themes |
| Ember | `ember`, `ember-deep`, `on-ember`, `ember-soft` | **One ember thing per screen.** Fill only, never text |
| Proof | `proof-match`, `proof-new`, `proof-reject` | Always icon + word + border style, never color alone |
| Edges | `line`, `line-strong`, `focus` | Controls use `line-strong`; focus is ember on Night, ink on Day |
| Type | Atkinson Hyperlegible Next + Mono | `utterance` 40px is the largest app text; nothing under 16px in the app |
| Space | 4, 8, 12, 16, 24, 32, 48, 64, 96 | 4px grid |
| Size | `target-min` 56, `key-min` 72, `key-size` 96, `key-xl` 128 | Large on purpose: tremor, head pointers |
| Radius | chip 14, key 24, card 28, panel 44, pill 999 | From the 96px key |
| Shadow | `glow-ember`, `lift` | `lift` only on the keypad panel and sheets |

## Components → code

| Design-system component | CSS class | React component (packages/web) | Notes |
|---|---|---|---|
| Button | `nl-btn` `--primary/--secondary/--quiet/--danger/--xl` | `components/Button.tsx` | Primary is almost always Speak |
| Key | `nl-key`, `is-lit` | `components/Key.tsx` | Letters lead, digit small; `aria-label="4 GHI, G H I"` (WCAG 2.5.3) |
| Keypad | `nl-keypad`, `nl-keypad__row`, `is-scanning` | `components/Keypad.tsx` | Fixed layout; scan highlight jumps, never slides |
| ProofChip | `nl-chip--match/--new/--reject` | `components/ProofChip.tsx` | Rejected words are struck through and never spoken |
| Candidate | `nl-candidate`, `is-selected` | `components/Candidate.tsx` | Selecting does not speak; `aria-pressed` |
| SpeakBar | `nl-speakbar` | `components/SpeakBar.tsx` | Never truncate what someone is about to say |

(The web owner keeps the right-hand columns accurate in `docs/architecture/web.md`.)

## Voice in one minute

Plain, warm, exact, adult. Sentence case, plain verbs (Speak, Clear, Next, Save phrase), digits for
numbers, no exclamation marks. Describe the tool, not the person. Never "treats", "therapy",
"clinically proven", "restores speech". Never name phone brands or their predictive-text products;
say "9-key predictive text".

| Write | Not |
|---|---|
| Press a key to start | Start talking with Ninth Life |
| This word matches your keys | Verified by AI |
| Not in your words yet. Add it? | Unknown word error |
| Offline. Using your dictionary. | You are offline |

## Accessibility floor

WCAG 2.2 AA. Real `<button>`/`<a>`/`<input>`; visible focus (4px, 3px offset); scan speed adjustable
0.4–5 s with no time limits; state never by color alone; text 4.5:1, UI edges and icons 3:1; respect
`prefers-reduced-motion`; no pulsing or blinking.
