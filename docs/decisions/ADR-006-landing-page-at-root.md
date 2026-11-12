# ADR-006: The website at `/`, the app at `/app`, and a website motion tier

- Status: accepted, amended 2026-11-11 (played sequences and How step sync, see the end)
- Date: 2026-11-10
- Decided by: the product owner, who accepted every recommendation in
  `.agents/tasks/marketing-landing/decisions.md` (D1-D15)
- Reverses: the note in `docs/testing/README.md` ("The app stays at `/` because it is the PWA start URL")
- Leaves in force: ADR-003 for the app (one screen, phones portrait only)
- Research: `docs/research/marketing-site/repo-audit.md`, `inspiration.md`, `structure-content.md`
- Spec: `.kiro/specs/marketing-site/` (MS-1 to MS-13); amends `web-ui` Req 5.1, 11, 14.3, 23.4, 25.6

## Context

The product owner asked for a one-page marketing website at `/` with rich, animated visuals, optimized for
phones, tablets and desktops, with a very good Lighthouse score, and for the app to move to another route.
Until now the communication screen was at `/` (the PWA start URL) and a draft website lived at `/welcome`.

Three existing rules pull against the request:

1. The app's motion rules (`accessibility.md` rule 5, web-ui Req 11, the brand book's Motion section) forbid
   sliding and allow at most a 120 ms colour change. They were written for people who watch a scanning keypad
   for hours. The brand book grants the website only "slow fades".
2. "One ember thing per screen" (`accessibility.md` rule 3) assumes a screen that does not scroll.
3. ADR-003 makes phones portrait only. Its reasons (one screen, keys that never move, keyguards) are about
   the keypad screen.

## Options considered

**App route:** `/app` (chosen; plain, and it matches the "Open the app" label), `/talk` (friendly but less
obvious, and it leans toward a speech claim), `/keypad` (describes only part of the screen).

**`/welcome`:** a 308 redirect to `/` (chosen; old links and the CI probe keep working for one config line), or
delete it (old links 404).

**`/about`:** keep it as the app's own page (chosen; the installed app keeps its help offline, and the landing
page does not grow with the WCAG and provider detail), or fold it into the landing page.

**Manifest:** `start_url: /app` with `id` and `scope` kept at `/` (chosen; the icon opens the keypad, an installed
app stays the same app, `/about` stays inside the installed window), or narrow `scope` to `/app` (then `/about`
opens in a browser tab). A script on `/` that sends standalone visits to `/app` was rejected: it would add
JavaScript to every landing visit for installs that barely exist (the app is not deployed yet).

**Service worker:** keep registering on every page and precache `/`, `/app` and `/about`, with `/app` as the
offline fallback (chosen; "after one visit the app works with no connection" stays true for people who only
saw the website), or register only on `/app` (a lighter first visit, but the offline promise would need a visit
to the app itself).

**Motion on the website:**

| Option | Allowed | Why not, or why |
|---|---|---|
| A. App rules unchanged | jumps, the 120 ms change, slow fades | quieter than "rich animations" |
| **B. A bounded website tier** (chosen) | A, plus scroll-driven animations, one-time reveals (fade plus a move of at most 16px), a cross-fade into the app, and a demo that plays once on its own with a visible Stop | meets the request and keeps the reasons behind the rules |
| C. Free motion with a reduced-motion fallback | parallax, morphs, marquees, loops | off-brand, heavier, and risky for the people the product is for |

**Ember on a scrolling page:** "one ember fill per viewport" (chosen): the hero's "Open the app" is that fill; the
demo's current key and the drawings use rings, never fills; the closing call to action is the only fill in its
viewport.

**Phones held sideways on the website:** scroll and work in both orientations (chosen; WCAG 1.3.4 is met there),
or show the "Turn your phone upright" notice there too (a needless failure on the page people meet first).

## Decision

1. The communication screen is served at `/app` (`packages/web/app/app/page.tsx`). `/` is the website,
   statically rendered. `/welcome` answers 308 to `/`. `/about` stays; its links into the app go to `/app` and
   "How Ninth Life works" goes to `/`.
2. The manifest's `start_url` is `/app`; `id` and `scope` stay `/`; `orientation` stays `any`. No redirect script
   for old installs.
3. The service worker registers on every page, precaches `/`, `/app` and `/about` (not `/welcome`), and serves
   `/app` for an uncached document offline.
4. The website may use this motion tier, and only while `prefers-reduced-motion` is `no-preference` and
   JavaScript has confirmed it (the cross-fade needs only the media query):
   - a slow fade on arrival (the hero's moon glow and the ninth key's ember ring, 900 ms, once);
   - one-time reveals of below-the-fold blocks: opacity plus a move of at most 16px, 600 ms;
   - scroll-driven state changes in drawings, as jumps of opacity (keys and rows ringed in turn, the proof
     check going suggested, checked, dropped, Show turning for the person opposite);
   - a 250 ms cross-fade between pages through `@view-transition` and plain links;
   - the hero keypad demo playing once on its own when it is in view, with Stop visible; highlights jump.
5. Still banned on the website: animating the logo; pulsing, blinking, bouncing, flicker, fog; parallax,
   marquees, typewriter loops, count-up numbers and any looping motion; flashing (WCAG 2.3.1); animation
   libraries and third-party files or requests. Anything that moves on its own for over 5 s has Stop (2.2.2).
   With reduced motion, no JavaScript or no browser support, every section shows its finished state. The `h1`
   and the lead are never faded in. Animations change only opacity and transform. Durations, delays, distances
   and easings are `motion-*` tokens in `design/system/tokens.json`.
6. At most one ember fill is on screen at any scroll position.
7. The website scrolls and works in both orientations on phones; the app keeps ADR-003.
8. Lighthouse target for `/`, mobile preset, median of 3 runs on a production build: Performance at least 95,
   Accessibility, Best Practices and SEO 100; desktop reported. Measured with `lighthouse` as a root dev
   dependency and `scripts/lighthouse.mjs` against `next start`, in one step that first asks to stop the dev
   server (`tech.md` rule 1). Not in CI yet.

## Consequences

- Bookmarks of `/` now open the website. "Open the app" is in its first screen on every size.
- Copies installed before the change still start at `/`; testers reinstall or tap "Open the app". The app is not
  deployed, so this affects only test installs.
- A first visit to the website downloads the app's precache (about 605 KB) after the page has loaded. The
  Lighthouse run checks that the score holds; if it does not, the result goes to the product owner, because
  registering only on `/app` would change the offline promise. D5 asked the design phase to confirm this by
  measuring; the measurement moved to the final production check (marketing-site task 28), because it needs a
  build and a build may not run while the dev server does (`tech.md` rule 1). Lighthouse budgets count only the
  page's own requests; the worker's downloads are reported on their own line.
- `web-ui` Req 11 now covers the app only; the website's motion rules are marketing-site MS-8. Steering
  (`accessibility.md` rule 5, `design-system.md`), the brand book's Motion section and the `a11y-auditor` agent
  gain a website clause. The app's own motion does not change, apart from the 250 ms page cross-fade.
- The root layout no longer loads `app.css`; the app and `/about` import it, so the website does not pay for the
  app's one-screen styles.
- Every place that meant "the app is at `/`" moves to `/app`: e2e helpers, `axe.mjs`, `responsive.mjs`,
  `perf-check.mjs`, the CI probe, the auditor's default route and the ship-feature workflow's audit URL.
- The way back is small: point `start_url`, the fallback and the links at `/` again and move the page file.

## Amendment 2026-11-11: played sequences and How step sync

- Decided by: the product owner, who accepted every recommendation of the round-2 design ("all recommended",
  `.agents/tasks/marketing-landing-v2/decisions.md` V1-V17)
- Research: `docs/research/marketing-site/motion-v2.md`, `box-visuals.md`
- Design: `.agents/tasks/marketing-landing-v2/design.md`; spec `.kiro/specs/marketing-site/` MS-8.11 to MS-8.13

**Context.** Scroll-driven frame changes (Decision 4, third bullet) were measured on the built page: the How it
works frames all passed within 70-90px of scroll on desktop and before the step text was on screen on phones; the
proof figure reached its finished frame only as it was leaving the screen; box drawings stopped on middle frames
wherever the visitor stopped scrolling. The product owner then asked for better micro animations in How it works and
the proof figure, and for an animated drawing in every feature box.

**Options.** (a) Keep the tier: scroll-linked jumps only, retimed; no easing and the freeze stays. (b) **Played
sequences** (chosen): each drawing plays a short sequence once when it reaches a line in the viewport and rests on
its finished state. (c) As (b), but replay on every re-entry: more motion for no new information. (d) Ambient loops
(a pulsing mic, a blinking caret): rejected, it reopens the loop ban that protects people who watch the screen for
long periods. Native CSS scroll-triggered animations were considered for (b) and set aside: on 2026-11-11 only
Chrome ships them, and they would bypass the motion gating `SiteMotion` already does.

**Decision 4 changes:**

- Added, *played sequences in drawings (A7)*: when a drawing first reaches the play line (30% above the bottom of the
  viewport), it may play its sequence once per page view. Each change fades over `motion-state` (200 ms) with at most
  `motion-nudge` (8px) of rise; rings, scan highlights and marks jump over `motion-jump` (120 ms, linear); the last
  change comes at most 4 s after the trigger. It then rests on its finished state. A `data-play` drawing already on
  screen or scrolled past when motion starts shows its finished state and never plays, as reveals do (clarified after
  the round-2 design review, decision V19: this only removes motion, so nothing in view changes when the script
  starts; the desktop How picture is not a `data-play` root and follows A8, V33).
  A drawing reaches the play line when its whole box is between the top of the viewport and the line or, if it is
  too tall for that, when its whole box is on screen or its top is at the top of the viewport with its bottom at or
  below the line, so a sequence plays with the drawing in view, also when the visitor scrolls back up to it
  (clarified after the second review, V25, and the third, V32; the line itself is unchanged).
- Added, *How step sync (A8)*: on desktop the sticky How picture follows the step card under the middle line of the
  viewport. Each step's sequence plays the first time that step becomes active; later visits show its finished state.
  The active card shows an outline that fades in over `motion-state`. If a step is already active when motion starts
  (a reload mid-section), every step shows its finished state and none plays (V19). If the picture is on screen when
  motion starts but no step is active yet (tall screens, where How starts within the first screen), it keeps its
  finished state until step 1 first becomes active, and the story then plays from step 1 (V26, after the second
  review). Step 1 becomes active only once the whole picture is in view (V30).
- Removed: scroll-driven frame changes (`animation-timeline`). The site no longer uses scroll timelines.

**Decision 5 is unchanged:** no animated logo; no pulsing, blinking, bouncing, flicker, fog, parallax, marquees,
typewriter text, count-up numbers or looping motion; no flashing; no libraries or third-party files; opacity and
transform only; every timing a `motion-*` token. Nothing moves on its own for more than 5 s, so no new Stop is
needed (WCAG 2.2.2). With reduced motion, no JavaScript or no IntersectionObserver every section shows its finished
state, and a change to reduce during a play shows it at once.

**Also decided:** one exception to MS-10.8 (drawn keys 64-84px): the Touch drawing shows key 2 ABC at its true
sizes, 72px and 128px (`key-min`, `key-xl`), still sized inline so the app's key-size setting cannot change it.

**Consequences.** Six new tokens (`motion-state`, `motion-nudge`, `motion-play-lead`, `motion-frame`,
`motion-frame-quick`, `motion-sweep`). `SiteMotion` gains three IntersectionObservers (two for the play line, one for
the How steps; about 0.7 KB of script); no new client component. MS-8.5 now forbids scroll timelines instead of describing them; MS-8.11 to MS-8.13 are new.
Steering (`accessibility.md` rule 5, `design-system.md` "Spooky, but calm"), the brand book's Motion paragraph and
the `a11y-auditor` website check name A7 and A8. The app's motion rules do not change. The way back: drop the
`data-play` attributes and the observers; every drawing then shows its finished state.
