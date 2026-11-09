---
inclusion: fileMatch
fileMatchPattern: ["packages/web/**/*.tsx", "packages/web/**/*.css"]
---

# Accessibility rules for the web app

WCAG 2.2 AA is the floor, not the goal. The people who use this may type with one switch, low vision, tremor or fatigue, for hours. When a rule here and a convenience conflict, the rule wins. Visual rules come from `design/system/README.md`; see also `design-system.md`.

## Hard rules (check every component against these)

1. **Targets.** Every button, chip and candidate is at least `target-min` **56px** tall and wide (WCAG 2.5.8 only asks for 24px). Keypad keys are `key-min` 72px to `key-xl` 128px, default `key-size` 96px. Keep at least 8px between targets.
2. **Text size.** Nothing in the app is smaller than **16px** (`label`). `caption` (14px) is for the website footer and video credits only, never inside the app. The sentence being spoken is the largest text (`utterance`, 40px).
3. **One ember thing per screen.** Ember (`--ember`) marks exactly one thing at a time: the lit key, the scan highlight, or the Speak button. Ember is a fill, never text and never a hairline; text on ember is `--on-ember`.
4. **Never color alone** (WCAG 1.4.1). Proof states (match, new, reject), selection, errors and the scan highlight each also carry an icon, a word, a border style or a shape change. Rejected words are also struck through.
5. **No pulsing, blinking, sliding or bouncing.** The scan highlight jumps with at most a 120ms linear color change. Nothing flashes (2.3.1). Honor `prefers-reduced-motion` (2.3.3) by removing even that transition.
6. **Real controls.** Use `<button>`, `<a href>`, `<input>`, `<select>`. No clickable `<div>`. An icon-only control needs `aria-label`; icons normally sit beside a word. The icon-only controls we have (Clear ×, the They said bubble) are 56px squares with a plain name. When a control shows text, its accessible name must start with or contain that text (2.5.3).
7. **Focus** is always visible (2.4.7) with `--focus-width` in `--focus` and a 3px offset, and never hidden behind the sticky SpeakBar or a sheet (2.4.11). Focus order follows the visual order: SpeakBar, candidates, keypad, actions.
8. **Contrast.** Text 4.5:1, large text 3:1, UI borders, icons and focus rings 3:1 (1.4.3, 1.4.11) in both Night and Day themes. Use the tokens; they were checked. Do not invent colors.
9. **Timing** (2.2.1). Scan speed is adjustable from 400 to 5,000 ms (default 1,200), loops before pausing are adjustable (default 3), and accept delay (default 150 ms) debounces tremor. Nothing times out, and nothing is spoken or committed automatically.
10. **No gestures only** (2.5.1, 2.5.7). No swipes, drags, multi-finger or long-press-only actions. Long-press is off by default.

11. **Phones and tablets: one screen** (web-ui Req 24, 25; ADR-003). The main screen never scrolls on a touch device; everything that does not fit goes into a sheet (sheets may scroll). Keys never move while a long sentence is typed (keyguards and motor memory). Respect the safe areas (`env(safe-area-inset-*)`) and size from `svh`, never `dvh`. Phones are portrait only by decision (a known 1.3.4 exception, stated on the About page before release): do not add a landscape phone layout without a new ADR.
12. **Microphone and speech** (web-ui Req 26). Listen is pressed by someone, never automatic; while listening the button reads Stop and a status line says so in words, not by color or motion.

## Keyboard, switch and screen reader

- Keyboard only: numpad and top-row digits type; Enter speaks; Backspace deletes; arrow keys move between candidates; `0` is space; `1` is punctuation. Candidate ranks 1 to 5 are shortcuts (`design/system/components/Candidate/README.md`); because digits also type letters, the web-ui spec must say exactly when a digit picks a candidate. Every action has a key.
- Switches: Space and Enter are the common switch-interface keys. 1-switch auto scan: first press picks the row, second picks the cell. 2-switch step scan: switch A advances, switch B selects. Any cell is reachable in at most rows + longest row highlight steps and exactly 2 selects (property-tested in `@ninth/core`).
- Whole-screen touch can act as a switch.
- Screen readers: keys read as their visible text, then the letters spaced out ("4 GHI, G H I"): the name starts with the visible text so voice-control users can say it (WCAG 2.5.3 label in name), and the spaced letters stop screen readers from saying "ghi" as a word. Keep a space between the digit and letters in the DOM. Candidates are a list with `aria-pressed` on the selected one. New candidates are announced in a polite live region (4.1.3), not assertive. Proof chips announce the state as a word ("water, matches").
- Text reflows at 320px wide and stays usable at 200% zoom and with WCAG text-spacing overrides (1.4.4, 1.4.10, 1.4.12). Never truncate the sentence about to be spoken.

## How to check

- Unit tests name the requirement IDs (`packages/web/test/*.test.tsx`).
- With the dev server running, from `packages/web`: `BASE_URL=http://localhost:3000 node test/e2e/axe.mjs` (zero serious or critical violations), `keyboard.mjs`, `switch.mjs`, `spell.mjs`, and `responsive.mjs` for any layout change (also with `ENGINE=webkit`).
- Run the `a11y-auditor` custom agent on any route you changed (it uses the Playwright MCP and writes findings to `docs/a11y/`).
- Try it yourself with the keyboard only, then with one key as a switch at 400 ms and at 5 s, and on a real phone in portrait.
