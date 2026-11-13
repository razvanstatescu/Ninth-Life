# ADR-006: The website at `/`, the app at `/app`, and a website motion tier

- Status: accepted, amended 2026-11-11 (played sequences and How step sync) and 2026-11-12 (Claude Code review,
  product owner answers W1-W6), see the end
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

## 2026-11-12 amendment (Claude Code review, product owner answers)

- Decided by: the product owner, answering the lead's questions after a landing-page review (2026-11-12)
- Done with: Claude Code (not Kiro). Review findings: the lead's `findings/top.md`, `bottom.md`, `theme.md`, `seo.md`
- Spec: `.kiro/specs/marketing-site/` round 3 (requirements MS-14 and the lines each builder changed, design.md
  "Round 3", content.md, tasks.md "Round 3 (2026-11-12, Claude Code)")

**Context.** A section-by-section review of `/` and `/about` (Playwright in Chromium and WebKit, 320 to 1440px, Night
and Day, reduced motion) found that the landing page held one system inside its sections, but that its edges did not:
loose paragraphs without a measure, two card looks for the same content, three brand lockups, a closing call to action
80px tall where the hero's is 64px (and ringed in Day), and an `/about` page set in the app's type that read as another
product. It also found a runway of empty space in How it works on phones, a hero keypad that only plays, and open
questions on AI crawlers and naming the maker. The lead put six questions to the product owner.

**Decisions.**

- **W1, tighter layouts: approved.** How it works gets a shorter runway (reduced motion: no sticky spacing; with
  motion: a lede and less bottom padding); Conversation's resting frames show before and after; Access and Privacy
  stages shrink to their drawings on phones; the header nav is hidden under about 900px so "Open the app" never
  wraps (icon only under 352px); no dashed placeholder rows in How step 1. Amends V5, V6, V7, V30, V36, V37,
  MS-3.3 and MS-13.2.
- **W2, Night close and the device theme: approved.** `#start` is a Night band with the hero's night sky, so the page
  ends the way it opens. First-time visitors (no stored `nl-theme`) get Day or Night from `prefers-color-scheme` on
  the landing page and `/about` (`data-theme="system"`, set by `THEME_BOOT_SCRIPT` before the first paint); a stored
  choice still wins; the hero stays Night always; `/app` keeps Night as its default. Amends D13's "body sections
  follow Night or Day" (they now follow the device until the person picks a theme) and design.md §11.
- **W3, `/about` in the website's look: approved, overturns D3** (and Decision 1's "`/about` stays the app's own
  page" as far as its look goes; it stays a separate, precached page with its own copy). `/about` gets the site bar,
  type scale, prose measure, note card and site footer, and loads the site stylesheet instead of `styles/app.css`.
  "Back to the keypad" becomes the bar's "Open the app". The intended-purpose sentence appears once on the page.
- **W4, a try-it hero keypad: approved, overturns D13 (the demo only plays) and MS-6.2.** Visitors can press the hero
  keypad and see real offline-decoder results (for example 4663: good, home, gone). Nothing extra loads until the
  first press (a dynamic import and a data fetch on first interaction), so first-load bytes and the Lighthouse budget
  stay as they are; keys work by keyboard and touch with visible focus; there is a Clear or Backspace; results are only
  words that match the keys, said plainly, never "it understands you"; reduced motion is respected; the autoplay demo
  still shows its finished example before any press.
- **W5, AI crawlers: allow all.** `robots.txt` keeps the `*` allow rule and adds `Sitemap:`; a comment in `robots.ts`
  records W5.
- **W6, the maker: not named anywhere.** No `Person` in JSON-LD; the Source section is unchanged on that point.

**Also decided by the lead** (within the existing decisions): the hero `h1` becomes the promise "Type on 9 keys. Hear
your sentence.", with "Ninth Life" as the brand in the bar and a small line above; the section order becomes How,
Proof, Results, Conversation, Access, Privacy, Limits, Questions, Source, Start, with a secondary "Open the app" row
after Results; every statement of what model ranking sends lists the same four items (`RANKING_SENT`).

**Also decided by the lead after the final review (2026-11-13):** the site footer is Night on every page (`/`,
`/about`, the 404), so the page ends the way it opens in Day too (extends W2); secondary "Open the app" rows also end
Access and Privacy; Results and `llms.txt` name the models the model-ranking numbers come from (two MiniMax models)
and say that the configured provider, Anthropic's Claude API, has not been measured yet (amends D14 and MS-5.3, which
only banned the phrase "Model ranking has not been measured yet"); the person's word list is called "My words"
everywhere on the site.

**Consequences.**

- Decision 6 (one ember fill per viewport) is unchanged: the fills are still the hero's and the closing "Open the
  app", now both on Night and both 64px (`target-cta`). Mid-page rows use secondary buttons.
- Shared website primitives (`.site-night`, `.site-prose`, `.site-card` / `--note`, `.site-cta`, stage tokens) and one
  brand lockup (`.nl-brand`, also used by `/app`) are documented at the top of `components/site/site.css`; new tokens
  `container`, `measure`, `stage-s/m/l` and the `brand` type style are in `design/system/tokens.json`.
- The app looks the same: `/app` defaults to Night (the `html` element's theme) and a chosen theme still wins on every
  page. What changes is the mirror: `applyLook` (`lib/settings.ts`) stores `nl-theme` only once the person has chosen
  a theme (a theme other than Night, or any theme once one is stored, so a switch back to Night is kept). Opening the
  app without choosing one no longer stores Night, so the website keeps following the device. Choosing Night while
  Night is already selected stores nothing, as nothing changes.
- The way back for W2: drop the `else` branch of `THEME_BOOT_SCRIPT` and the condition in `applyLook`, and the
  `site-night` class and `data-theme` on `#start`. For W3: import `styles/app.css` in `app/about/page.tsx` again and restore its old body (git history).

## 2026-11-13 amendment (round 4: visual and motion review, Claude Code)

**Context.** After round 3 the product owner asked for a second pass on the look and the motion: a lighter hero demo
(less height, icon buttons, no caption text), a total revamp of How it works, an animated proof figure in step with its
text, graphics instead of prose in Results, better drawings in the Conversation, Access and Privacy boxes, the content of
Good to know and Free and open source spread across the site or made visual, and a better footer. The work was done
with Claude Code (a lead and a team of subagents) on branch `feature/landing-review`, not in Kiro: the spec lines it
changed are marked "Round 4 (2026-11-13, Claude Code)" and the work is logged in `docs/KIRO_LOG.md`.

**Product owner answers (2026-11-13).**

- **X1, Results bars grow once.** A chart bar may grow once along its axis (transform `scaleX` from its start edge,
  `motion-grow`, the last change at most 1,600 ms after the trigger). The numbers stay static text (MS-5.5 unchanged);
  reduced motion and no JavaScript show full bars. Amends MS-8.11.
- **X2, no replay.** No "Play again" button: every drawing still plays once per page view and then rests on its
  finished frame (MS-8.13 unchanged on that point).

**Decided by the lead** (within the product owner's round-4 request and the existing decisions; each in the spec):

- **One shared language** for every section: one stage style with depth from fills (the keypad panel's lift is the only
  shadow); a drawn key always sits on its panel (this fixes Night, where plum keys vanished on a plum stage); the press
  ring on drawn buttons carries a plum line inside the ember ring (so ember never sits on a light fill); control
  feedback A9 (an opacity-only hover layer; keys and buttons never move) and live-part entry A10 (try-it chips, the FAQ
  answer); new tokens `motion-hint`, `motion-grow` and `state-hover`; website-only icons in
  `components/site/icons.tsx`, in the app's icon style, so the app's bundle does not carry them (the icon line in
  `.kiro/steering/design-system.md` is amended to say so). MS-7.1, MS-7.3, MS-8.2, new MS-8.14 and MS-8.15.
- **Hero demo** as a small app screen: the sentence as proof chips with each word over its keys, one reserved status
  line ("Press the keys to try it." in the example), 64px keys, three icon buttons (Play the example / Stop, Hear it,
  Clear) whose names show on hover and keyboard focus; the caption, the check line and the pill buttons are gone;
  digit keys, `*`, `#` and Backspace work while focus is in the demo; from 720px the demo sits beside the copy. The
  keypad still never moves (MS-6.10). MS-6.2-6.4, 6.7, 6.10, 6.12, 6.13, new 6.15 and 6.16, MS-10.8.
- **How it works** is a "Press → Pick → Speak" row of three small stages of the app's own screen that plays once, in
  order (last change at 3,780 ms); the sticky picture, its runway and the step sync are gone. This retires A8 and
  MS-8.12 (and with them V26, V30, V35 and W1's How runway); MS-8.11 gains the sequenced-row lead.
- **Proof**: the figure draws five keys, each suggested word's letters under the key that types them, and the letter
  that does not match boxed and struck; four short steps on the left light in time with it. One play root may wrap both
  columns (MS-8.11, MS-7.9). The claim wording (D15) is unchanged.
- **Results** as graphics: paired bars against word frequency alone, a by-source chart, presses and scan steps, and the
  model-ranking status as two rows (measured with two MiniMax models; Anthropic's Claude API not measured yet). The
  caveat comes first; every figure is still from `packages/eval/RESULTS.md`. MS-5.1, 5.3, 5.4.
- **Boxes**: one wide lead card per section, then a row of three (Conversation, Privacy) or two by two (Access);
  drawings show cause and result; the Privacy ranking figure's list of what is sent is real text (an MS-7.2 exception)
  and the card copy no longer repeats it; new sentence "Only three features send words or speech off this device: model
  ranking, online voices and Listen." (checked against every network call in the app). The MS-8.11 column lead allows
  up to 2 columns. MS-4.6, MS-7.x, MS-10.9, MS-12.x; W1 (Show and Flip finished frame), V14, V37 and R3-P1.
- **The end of the page**: each limit also sits next to the claim it qualifies (`.site-caveat` in How, Results and
  Access), and Good to know keeps them all in one place as two cards (Before you start; Testing so far, with Done and
  Not yet in words and border style). "Free and open source" is no longer a section (amends D12 and MS-3.1): its facts
  are a row in the Night close (Free, Works offline, No account, Open source), "Why it is free" and the credits are on
  `/about`, and its links and the history line are in the footer. The footer has three link groups (Product, Trust,
  Project), the statement, the history line, the licence line and Back to top, on every page. `/llms.txt` lists the
  limits and the history line. MS-3.8, 4.4, 4.5, new 4.5a, 4.7, 9.1, 14.5.
- **Not taken**: a longer play cap (4,800 ms), a real 180° Flip, a sliding toggle knob, and a theme switch on the site
  (MS-12.1: the landing page writes no storage; the app's Settings has Theme and the site follows it).

**Consequences.** Decision 6 (one ember fill per viewport) is unchanged. The website still loads no third-party file
and uses no animation library; the motion is CSS on `opacity` and `transform`, played by the one `SiteMotion` script,
which is smaller than before (the step sync is gone). The way back for any part is the git history of
`feature/landing-review`.
