# ADR-003: One screen on phones and tablets; phones are portrait only

- Status: accepted
- Date: 2026-11-09
- Decided by: the user (product owner)
- Research: `docs/research/one-screen-tablets.md`, `mobile-patterns-mobbin.md`, `mobile-aac-evidence.md`

## Context
Phones are the first target and tablets the second. The owner asked for the main screen to fit the
visible screen with no scrolling, with every button, shortcut and menu reachable from it (sheets may
scroll), and for phones to be used upright only, while tablets work in both orientations.

## Decision
1. **Touch devices get a one-screen shell** (`lib/layout.ts`): `stack` in portrait (phones and
   tablets), `split` for tablets in landscape. The screen holds the header (brand, status, They said),
   the sentence card (Clear / Undo), the suggestion rows (with the Spell / "Add to my words" row), the
   keypad and the action bar [Menu] [Speak] [Show]. The main page never scrolls.
2. **Everything else is one tap away in a sheet**: Check the words (the proof panel), They said
   (also in the header), Save phrase, Spell this word, Phrases, My words, Voice, Settings (switch
   scanning on/off and speed), and About (links and the intended-purpose sentence) in the Menu.
   While switch scanning is on, the header shows a "Scanning" pill.
3. **Phones are portrait only.** A phone is a device whose shorter screen side is under 600 CSS px
   (`screen`, not the window: iOS never swaps `screen.width/height`, and an iPad window can be 375px
   wide). Held sideways, a phone shows "Turn your phone upright" instead of the keypad; the sentence is
   kept. Where the browser allows it (`screen.orientation.lock`, an installed Android app or
   fullscreen) the app also asks for a portrait lock. The manifest keeps `"orientation": "any"`,
   because it cannot tell phones from tablets.
4. Laptops and desktops (a fine pointer) keep the wide and compact layouts.

## Known accessibility exception (WCAG 2.2 SC 1.3.4 Orientation, level AA)
Restricting phones to portrait fails SC 1.3.4; asking to reorient is failure technique F100 and
locking is F97. The criterion's own example is a device mounted on a wheelchair. The owner accepted
this for phones only; tablets keep both orientations (and most mounted AAC devices are tablets).
A softer option was offered and is the way back if users need it: keep the sentence, Speak, Show and
Menu working sideways, with "Turn your phone upright to type" over the keypad only. This exception
must be stated in the accessibility statement on the About page before release.

## Consequences
- `web-ui` Req 24 (phones) and Req 25 (one screen, tablets, portrait-only phones);
  `test/e2e/responsive.mjs` checks 24 measured phone and tablet sizes, both orientations, for no page
  scroll and every control on screen.
- Amended by ADR-005: under 548px visible height (an iPhone SE in Safari with the Bottom tab bar) the
  stack shell drops its suggestion rows and Menu offers Sentences.
- Keys are sized from the measured keypad area (a ResizeObserver), not container query units, which
  Chrome resolved to 0 in this layout.
- Scope: the app at `/app`; the website at `/` rotates freely (ADR-006).
