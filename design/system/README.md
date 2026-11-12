# Ninth Life

The old keypad, back as your voice.

Ninth Life is a free web app that brings back 9-key predictive text as a way to talk. People press keys 2 to 9, one press per letter, and Ninth Life speaks the sentence they meant. A proof check makes sure every spoken word matches the keys pressed, so a language model can help rank sentences but can never put words in someone's mouth. It works offline, in any browser, with a keyboard, touch or a single switch.

This system covers the app, the website, the demo video and social cards. Night is the default theme and the brand.

> Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment.

## The idea in three shapes

- **The bubble.** A speech bubble: the product turns keys into spoken words.
- **The ears.** Two cat ears on the bubble: nine lives, and the second life of an old technology.
- **The ninth key.** Eight dark keys and one lit in ember: the life that comes back, and in the app the key you are about to choose.

Everything else stays quiet so those three carry the brand. No mascots, no faces, no cartoon cat. The cat lives only in the silhouette of the icon.

## Voice and content

Write for adults who type to talk, the people around them, and speech-language professionals. Plain, warm, exact.

- **Adult.** Many AAC tools are designed for children; this one is not. No cartoons, no "talker", no baby talk.
- **Say what it does, not who the user is.** Describe the tool ("type on 9 keys, hear your sentence") instead of labelling people. When you must name a group, use "people who use AAC". Community surveys split on "nonspeaking" and "nonverbal", so avoid both as labels.
- **Plain verbs, sentence case.** Speak, Clear, Next, Save phrase. No exclamation marks. Numbers as digits.
- **No claims we cannot prove.** Never "treats", "therapy", "clinically proven", "restores speech". Speed claims only from our own eval results, with the method linked.
- **Trademarks.** Never write "T9", "Nokia", "SwiftKey" or "Gboard" in the product, website, video or social posts. Say "9-key predictive text". Never draw a recognizable phone model.

| Write | Not |
|---|---|
| Press a key to start | Start talking with Ninth Life |
| This word matches your keys | Verified by AI |
| Not in your words yet. Add it? | Unknown word error |
| The model suggested "wafer". Your keys spell "water". | AI hallucination detected |
| Offline. Using your dictionary. | You are offline |

## Color

Four brand colors come straight from the icon: **night** `#140a2e`, **plum** `#2a1856`, **moon** `#eee8ff`, **ember** `#ffb13d`. The UI uses semantic tokens on top of them in two themes.

| Role | Tokens | Rule |
|---|---|---|
| Grounds | `ground`, `surface`, `surface-sunken` | Night by default. Day for bright rooms. |
| Text | `ink`, `ink-muted`, `link` | 6.4:1 or better on every surface in both themes. |
| Keypad | `panel`, `key`, `on-key` | Same keys in both themes, so the keypad always looks like the icon. |
| The ninth key | `ember`, `ember-deep`, `on-ember`, `ember-soft` | One ember thing per screen: the lit key, the scan highlight or Speak. Fill only, never text. Text on ember is always `on-ember`. |
| Proof | `proof-match`, `proof-new`, `proof-reject` | Always with an icon, a word and a distinct border style. Never color alone. |
| Edges | `line`, `line-strong`, `focus` | `line` is decorative; controls get `line-strong`. Focus is ember on Night and ink on Day. |

Ember on the Day ground is only 1.7:1, so in Day it appears as a fill with a plum ring, never as a line or text.

## Type

**Atkinson Hyperlegible Next** for everything, **Atkinson Hyperlegible Mono** for key sequences. Both come from the Braille Institute, are built for letterform distinction for readers with low vision, and are free under the SIL Open Font License on Google Fonts. The family is the brand's typeface: its heavy weights set titles and video cards; its regular weight carries the app.

- The sentence being spoken is the largest text in the app (`utterance`, 40px).
- On a key the letters lead (`key-letters`, 30px bold) and the digit is small (`key-digit`, 15px mono). Phone keypads do the opposite; we think in letters.
- Nothing in the app is smaller than `label` (16px). `caption` (14px) is for the website and video credits only.

## Shape, space and size

- Corners come from the key: `radius-key` is a quarter of the 96px key. Chips 14px, cards 28px, the keypad bubble 44px.
- Spacing runs on 4px: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Targets are large on purpose: `target-min` 56px for every button and chip, keys from `key-min` 72px to `key-xl` 128px. The website hero's buttons are `target-cta` 64px.
- Lines: `line-width` 2px for borders and rules, `ring-width` 3px for the pressed key's inner ring and the plum ring outside the scan highlight.
- The keypad sits on the `panel` bubble with `lift`. It is the only floating element in the app.

## Iconography

Inline SVG, 24px grid, 2.5px round stroke in `currentColor`: speaker, check, plus, x, back, space, gear, voice, switch. Icons sit beside a word; an icon alone needs an `aria-label`. No emoji, no filled glyph sets, no pictures of people.

## Motion

Scan highlights jump from row to row with a 120ms linear color change. No slides, bounces, pulses or blinking: switch users watch the screen for long stretches, and pulsing light is tiring and can be unsafe. Respect `prefers-reduced-motion`. The video may use slow fades between cards.

**Website.** The website at `/` has its own motion tier (ADR-006, `.kiro/specs/marketing-site` MS-8), and only while `prefers-reduced-motion` is `no-preference`: A1 the moon glow behind the hero fades in once; A2 the ninth key's ember ring fades in once, after a short delay; A3 the hero demo's key presses, one pressed ring at a time with a linear opacity change; A4 one-time reveals of blocks, a fade that rises at most 16px; A6 a cross-fade between `/`, `/app` and `/about`; A7 played sequences: each box drawing, the proof figure and each How it works step stage plays its short sequence once when it reaches the play line (30% above the bottom of the viewport), each change a fade with at most an 8px rise or, for rings and marks, a 120ms jump, then stays on its finished state; A8 How step sync: from 1024px the sticky How it works picture shows the step whose card has crossed the middle of the viewport and plays each step the first time it becomes active. The page uses no scroll timelines (A5, the scroll-linked frames of round 1, is gone). Animations change only `opacity` and `transform`. Never: an animated logo, pulsing, blinking, bouncing, flicker, fog, parallax, marquees, typed-out text, counted-up numbers, loops, flashes, an animation library, SMIL or a third-party file. Every duration, delay, distance and easing comes from the `motion` tokens in `tokens.json`: `motion-jump` 120ms, `motion-crossfade` 250ms, `motion-fade` 600ms, `motion-fade-slow` 900ms, `motion-delay-arrival` 300ms, `motion-stagger` 80ms, `motion-autoplay-delay` 1200ms, `motion-demo-step` 520ms, `motion-reveal-distance` 16px, `motion-state` 200ms, `motion-nudge` 8px, `motion-play-lead` 300ms, `motion-frame` 600ms, `motion-frame-quick` 400ms, `motion-sweep` 240ms, `motion-ease-out` and `motion-ease-linear`. The app keeps the rule above.

## Accessibility

WCAG 2.2 AA is the floor. Every control is a real `<button>`, `<a>` or `<input>`. Focus is always visible (`focus-width`, 3px offset). Scan speed is adjustable from 0.4 to 5 seconds, with no time limits. State is never shown by color alone. Text keeps 4.5:1 in both themes; borders, icons and focus rings keep 3:1.

## Surfaces

- **App.** Night theme by default, Day on request. Top to bottom: SpeakBar, candidates, keypad. Settings in a sheet. One ember thing on screen.
- **Website.** Night hero with the icon, the `display-xl` name and a live keypad demo. Body sections on `surface`. Footer carries the not-a-medical-device line in `caption`.
- **Video (16:9, 1920x1080).** Title and chapter cards on `night` with moon text in `display` and one ember key. Lower thirds: moon text on a plum bar, 64px safe margins. Burned-in captions in Atkinson Hyperlegible Next 40px semibold, moon on a night box at 80% opacity. Keypad tones are self-made; no third-party music or logos.
- **Social and Devpost cards.** 1:1 and 16:9: night ground, the icon, one line in `display`, the URL in `body`.

## Logo

The icon is the logo: the cat-eared bubble with 3 x 3 keys and the ember ninth key on night. Below 48px use the favicon variant, which drops the eight dark keys and keeps the ember key. The wordmark is "Ninth Life" set in Atkinson Hyperlegible Next ExtraBold beside the icon, never redrawn. Clear space is one key's width on every side. Do not recolor the ember key, rotate the icon, add a face, or put the icon on a phone.

## Components

Button, Key, Keypad, ProofChip, Candidate and SpeakBar. Styles live in `components/bundle.css` with an `nl-` prefix and read only tokens; the bundle imports the two Google Fonts.

## Website drawings

The website's feature drawings are pictures of the app, built from the components above and tokens; they are `aria-hidden`, hold nothing focusable and use `caption` (14px) only for labels under a drawn thing. One element exists only in them:

- **The drawn computer key** (the Keyboard drawing on the website): `surface-sunken` fill, a 2px `line-strong` edge, `radius-chip` corners, its label in mono 16px, 40px tall and at least 40px wide. Its pressed state is the Key's pressed ring, the 3px inner `ember` ring (`ring-width`), drawn on an overlay so the key never changes size. It is never filled with ember.
