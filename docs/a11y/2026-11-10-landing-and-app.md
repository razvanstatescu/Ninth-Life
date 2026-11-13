# Accessibility audit: the website `/` and the app `/app` (marketing-site FEAT-005)

Date: 2026-11-10. Method: the `a11y-auditor` method (`.kiro/agents/a11y-auditor.json`) carried out by the FEAT-005 workflow step with the Playwright MCP (Chromium), because the step could not dispatch the agent itself. Dev server at `http://localhost:3000`.
Scope: `/` (marketing-site MS-1 to MS-13) and `/app` after the route move (ADR-006).

This report lists what was checked and what was found. It does not state that the site or the app is WCAG compliant or accessible.
Screenshots are in `docs/a11y/screens/` (file names start with `site-` and `app-`).

## Summary

| # | Severity | Criterion or rule | Where | Finding |
|---|---|---|---|---|
| 1 | minor | Accessibility rule 1 (56px targets); WCAG 2.5.8 | `/`, Access section, "Open an issue on GitHub" | An inline link inside a sentence: 187x22px at 1280 wide, 205x48px at 320 wide. WCAG 2.5.8 exempts inline links, and design R3 sets 56px for standalone links only |
| 2 | minor | WCAG 2.4.11 Focus Not Obscured (Minimum) | `/`, FAQ `summary` "Which devices?" at 390x844 | When Tab scrolls the summary into view it ends 0.1px above the viewport bottom, so the lower edge of the 4px outline is cut off. The control and most of the ring stay visible, so 2.4.11 passes |

No blocker, no serious and no moderate finding.

## What passed

`/` (the website):

- Keyboard only, 1280x800, Night and Day, motion off and on: 35 to 38 Tab stops (the count changes with Hear it and the theme). The order starts with Skip to content, Ninth Life, the five bar links (How it works, Proof check, Ways to type, Privacy, Questions) and then Open the app. Every stop has a 3 to 4px solid outline, and none is covered by another element. One more stop, `nextjs-portal`, belongs to the development overlay and is not in a production build.
- 390x844 Day with motion on: 39 stops, all with an outline and none covered. The one edge case is finding 2.
- Reflow: no sideways scroll at 1280x800, at 640x400 (200% zoom), at 320x200 (400% zoom) or at 320x640. The bar is `position: static`, so at 400% zoom it scrolls away and covers nothing (`site-night-320x200-zoom400*.png`).
- Text size: the smallest visible text is 14px, and only in `.site-footer__caption` (the licence line and the intended-purpose statement). Rule 2 allows the 14px `caption` size in the website footer.
- Day theme (`nl-theme=day`): the background is `rgb(247, 244, 255)` (`site-day-1280x800.png`, `site-day-390x844.png`).
- Reduced motion, Night and Day: no `data-site-motion` attribute, all `[data-reveal]` blocks at opacity 1, `document.getAnimations()` empty, and no autoplay.
- Motion on (MS-8): the demo read "Stop" 2.5 s after load and "Play the example again" 8.5 s after load. It played once. After scrolling to the end, no time-based animation was running and every block on screen was revealed.
- Automated and scripted checks on the same server: `axe.mjs` (landing `/`, landing `/` with motion, Night and Day, 1280 and 390 wide: 0 violations) and `site.mjs` in Chromium and WebKit (target sizes and 8px gaps, at most one ember fill on screen, focus outlines, Tab order across the bar at 1280x900 and 820x1094, layout shift, no-JS, privacy). See `.agents/tasks/marketing-landing/verification.md`.

`/app` (the app):

- 1280x800, 640x400 (200%), 320x200 (400%) and 320x640, after typing `43556`: no sideways scroll. Every visible control is at least 56x56px. Keys are 96px at 1280x800, 87px at 640x400, 72px at 320x200 and 74px at 320x640, so never under 72px. The smallest text is 16px. The only item under 56px is the sentence `p#utterance`, which has `tabindex="0"` so it can scroll. It is text, not a control.
- At 320x200 and 1280x800 the page scrolls vertically on a desktop (no touch) context. That is expected: the one-screen rule (rule 11) applies to touch devices, and `responsive.mjs` checks it at 24 sizes.
- Keyboard (digits, Enter, Backspace, arrows), switch scanning, Spell, the 24 phone and tablet sizes, and axe in Night and Day: `keyboard.mjs`, `switch.mjs`, `spell.mjs`, `responsive.mjs` (Chromium and WebKit) and `axe.mjs` all passed.

## Findings

### 1. Inline issue link is smaller than the 56px rule (minor)

- Rule: accessibility rule 1 asks for 56px targets. WCAG 2.5.8 exempts targets inside a sentence. Design R3 applies the 56px box to standalone links (bar, footer, `.site-links`).
- Where: `components/site/sections/Access.tsx`, the link at the end of the accessibility paragraph.
- Evidence: 187x22px at 1280x800 and 205x48px at 320x640, measured with `getBoundingClientRect`.
- Smallest fix, if wanted: move the link out of the sentence into a `.site-links` row so it gets the 56px box. That changes the layout of the copy, so it needs a content decision. Not changed here.

### 2. Focus ring clipped by 4px at the viewport bottom (minor)

- Criterion: WCAG 2.4.11 (passes, because the item is not entirely hidden). Design rule: visible focus.
- Where: FAQ `summary` elements (seen on "Which devices?" at 390x844, motion on).
- Evidence: after the focus scroll, the box runs from 788.1 to 844.1px in an 844px viewport. `scroll-behavior` is `auto`, and the position did not change after 700 ms.
- Smallest fix: `scroll-margin-block: var(--space-2)` on focusable elements in `site.css`, so the browser leaves room for the outline. Not changed here because the finding is minor.

## Not tested here

- Screen readers (VoiceOver, TalkBack, NVDA) and real switch hardware.
- Real phones and tablets. Phone and tablet sizes were checked only in emulation (`site.mjs` and `responsive.mjs` in Chromium and WebKit).
- The Day theme on `/app` by hand: the app's saved settings set the theme back to Night after load, so the MCP pass saw Night. `axe.mjs` checks `/app` in Day through its own theme setup and reported 0 violations.
- Windows high-contrast mode (forced colors).
