# Design: marketing-site

Requirements: `requirements.md` (MS-1 to MS-13). Copy: `content.md`. Decision record:
`docs/decisions/ADR-006-landing-page-at-root.md`. Product decisions D1-D15:
`.agents/tasks/marketing-landing/decisions.md`.

## Overview

The landing page grows out of the existing `/welcome` page (D12): it moves to `app/page.tsx`, keeps its
build-time demo data (`site-data.ts`), its `KeypadDemo` island and `site.css`, and gains five sections, a
set of drawings made from our own components, and a small motion system. The communication screen moves
to `app/app/page.tsx` and is otherwise untouched. The page is a static server component with exactly two
client islands (`KeypadDemo`, `SiteMotion`) and one 180-byte inline boot script. Motion is opt-in: the base
CSS and the server HTML are the finished, still page; motion rules live only inside
`@media (prefers-reduced-motion: no-preference)` and behind a `data-site-motion` attribute that only
JavaScript sets. Scroll-linked state changes are CSS scroll-driven animations that change opacity in jumps;
one-time reveals use one IntersectionObserver. The service worker keeps registering on every page and now
precaches `/`, `/app` and `/about`. Lighthouse is measured from a production build with a new root dev
dependency and `scripts/lighthouse.mjs`, in one paused step at the end.

## Technology stack (locked)

- Next.js 15.1.12 App Router, React 19.0.9, TypeScript 5.6 (as `packages/web/package.json`). No new runtime
  dependency.
- CSS: plain stylesheets with design tokens (`styles/tokens.css`, generated). Scroll-driven animations
  (`animation-timeline: view()`, named `view-timeline`, `timeline-scope`), CSS cross-document view
  transitions (`@view-transition`), `color-mix()`. No CSS-in-JS, no Tailwind, no animation library.
- Client code: two React client components and one inline script string; browser APIs `matchMedia`,
  `IntersectionObserver`, `getComputedStyle`, `document.visibilityState`, `speechSynthesis` (through
  `lib/speech.ts`).
- Service worker: Serwist 9.0.11 as today (`@serwist/next`, `app/sw.ts`).
- Tests: Vitest 2.1 + Testing Library + jsdom (unit), plain Node e2e scripts on Playwright 1.63
  (`test/e2e/`), `@axe-core/playwright` 4.14.0.
- Measurement: `lighthouse` **13.6.0** (Apache-2.0, needs Node 22.19 or later; checked on npm 2026-11-10) as a
  root `devDependency`, driven by `scripts/lighthouse.mjs` against Playwright's Chromium. Not shipped, not in CI.

## Routes, layouts and the CSS split (MS-1, MS-11.3)

| Route | File | Renders | CSS it loads |
|---|---|---|---|
| `/` | `app/page.tsx` (rewritten) | the landing page, `export const dynamic = 'force-static'` | root layout CSS + `components/site/site.css` |
| `/app` | `app/app/page.tsx` (new) | `<CommunicationScreen />`, exactly what `app/page.tsx` renders today | root layout CSS + `styles/app.css` |
| `/about` | `app/about/page.tsx` (edited; site look since round 3, W3) | its own copy in the site chrome (SiteBar, Night header, prose, SiteFooter); links per MS-1.4 | root layout CSS + `components/site/site.css` (round 3; was `styles/app.css`) |
| `/welcome` | removed (`app/welcome/` deleted) | 308 to `/` from `next.config.mjs` `redirects()` | none |
| `/robots.txt` | `app/robots.ts` (new, `force-static`) | `{ rules: { userAgent: '*', allow: '/' } }` | none |
| `/sitemap.xml` | `app/sitemap.xml/route.ts` (round 3, `force-static`) | `/`, `/about`, `/app` on the origin; 404 with no origin | none |
| `/llms.txt` | `app/llms.txt/route.ts` (round 3, `force-static`) | Markdown from `components/site/llms.ts` | none |
| 404 | `app/not-found.tsx` (round 3) | "Page not found", links to `/app` and `/` | root layout CSS |
| `/api/decode` | unchanged | | |

`app/layout.tsx` keeps the `<html>` element, `viewport` (`viewportFit: 'cover'`, no `maximumScale`),
`THEME_BOOT_SCRIPT`, both font preloads, and the imports of `tokens.css`, `globals.css` and
`components.css`. It **drops** `import '../styles/app.css'`; `app/app/page.tsx` and `app/about/page.tsx` import
it instead (`import '@/styles/app.css'`). Next.js places page CSS after layout CSS, so the cascade order the
app relies on (tokens, globals, components, app) is unchanged. This keeps `test/mobile.test.tsx`, which reads
`app/layout.tsx` and `styles/app.css` by path, valid without edits.

Why not route groups (`app/(site)`, `app/(app)`): they would move `app/layout.tsx` or add a second layout for
the same split, and D1 names `app/app/page.tsx`. Two one-line imports do the same job.

Why the mono font preload stays on `/`: the landing page shows digits in the demo, the proof figure and the
key drawings above and just below the fold, and the file is 18 KB. Keeping the root layout unchanged is less
risk than per-route preloads; the font budget (60 KB, MS-11.2) covers both files.

Links that change (MS-1.4, 1.5): `app/about/page.tsx` `<Brand href="/app" />`, "Back to the keypad"
`href="/app"`, the "See the demo…" link `href="/"`; `components/Footer.tsx` "Back to the keypad" `/app`, "How
Ninth Life works" `/`, and its comment ("The / link works offline: next.config.mjs precaches it");
`components/MenuSheet.tsx` "How Ninth Life works" `href="/"`. The communication screen itself uses absolute
URLs only (`/data/...`, `/api/decode`, `/icons/...`), so it needs no change to run at `/app`.

`next.config.mjs` gains:

```js
async redirects() {
  return [{ source: '/welcome', destination: '/', permanent: true }]; // 308 (MS-1.3, D2)
},
```

## Manifest and service worker (MS-2, D4, D5)

- `public/manifest.webmanifest`: `"start_url": "/app"`; `id` `/`, `scope` `/`, `orientation` `any` unchanged.
  No standalone-mode redirect script (D4).
- `next.config.mjs`: `additionalPrecacheEntries: [{ url: '/', revision: rev }, { url: '/app', revision: rev },
  { url: '/about', revision: rev }, ...publicEntries()]` (the `/welcome` entry goes). The landing page's JS
  chunk and `site.css` are build assets, so Serwist's build manifest already includes them. The page adds no
  file to `public/`, so `publicEntries()` and `NOT_PRECACHED` are unchanged.
- `app/sw.ts`: `fallbacks.entries: [{ url: '/app', matcher: ({ request }) => request.destination === 'document' }]`,
  and the header comment says why (an uncached page offline should open the keypad).
- Registration: unchanged (`@serwist/next` default, every page registers after the window `load` event). A
  first visit to `/` therefore installs the worker, which downloads the app's precache (about 605 KB) after
  load. Lighthouse takes LCP, FCP, Speed Index and CLS from the page load and TBT from the main thread, so the
  worker's downloads should not move the score; the final measurement checks this and reports the
  result to the product owner if the target is missed. D5 is a product decision and is not changed here.
  (The final measurement is task 28.)
- Offline edge cases: an offline request for `/welcome` (not cached, and the redirect needs the server)
  falls back to `/app`; `/` and `/about` load from the precache; `/app` reaches ghost mode as today.

## Page structure and layout (MS-3, MS-10)

Breakpoints (MS-10.1): **phone** `max-width: 599px`, **tablet** `600px` to `1023px`, **desktop**
`min-width: 1024px`. Container `.site-wrap`: `max-width: 1200px`, centred, side padding
`max(var(--space-4), env(safe-area-inset-left))` / `…-right` on phones and `max(var(--space-6), env(…))` from
600px (MS-10.6). Section bands `.site-band`: padding block `var(--space-12)` phone, `var(--space-16)` tablet,
`var(--space-24)` desktop (token usages "website section padding on phones", "website section spacing on
desktop"). Bands alternate `--ground` and `--surface` backgrounds as today. Body text `--type-body-*` (17/26),
leads `--type-body-lg-*` (20/30), section heads `display` (`font-size: clamp(36px, 8vw, var(--type-display-size))`,
`line-height: 1.08`), card titles `heading` (22/28). Raw lengths are allowed only where no token exists: the
container and text measures (1200px, 760px, 620px), grid `minmax()` widths, and the `clamp()` minimums named
here. Every colour is a token.

Standalone links (R3, MS-10.4): every standalone link (bar nav, footer nav, `.site-links a`) is `display:
inline-flex; align-items: center; justify-content: center; min-height: var(--target-min); min-width:
var(--target-min)`. Link groups (bar nav, footer nav, `.site-links`) use `gap: var(--space-2) var(--space-6)`, so
every pair of targets inside one group is at least 8px apart.

```
<div class="site">
  <script dangerouslySetInnerHTML={{ __html: SITE_MOTION_BOOT }} />   (MS-8.1, runs before the hero is parsed;
                                                  rendered like THEME_BOOT_SCRIPT in app/layout.tsx)
  <a class="nl-skip" href="#main">Skip to content</a>
  <header id="top" class="site-top" data-theme="night">   banner: bar + hero, always Night (MS-6.1)
    <div class="site-wrap site-bar"> brand · <nav aria-label="Main"> · Open the app (secondary) </div>
    <section class="site-wrap site-hero" aria-labelledby="hero-title"> copy · <KeypadDemo/> </section>
  </header>
  <main id="main" tabIndex={-1}>  how · proof · results · conversation · access · privacy · limits · faq · source · start </main>   (round 3: results moved up)
  <footer class="site-wrap site-footer"> … </footer>
  <SiteMotion />
</div>
```

The hero sits inside the banner so that no content is outside a landmark (axe `region`) while the Night sky
can wrap both the bar and the hero. Each `<section>` has `aria-labelledby` its `h2`. Components (all server
components unless marked) live in `packages/web/components/site/`:

| File | Content |
|---|---|
| `SiteHeader.tsx` | bar (brand, Main nav, header CTA) and hero copy; renders `KeypadDemo` |
| `sections/How.tsx`, `Proof.tsx`, `Conversation.tsx`, `Access.tsx`, `Privacy.tsx`, `Results.tsx`, `Limits.tsx`, `Faq.tsx`, `Source.tsx`, `Start.tsx` | one section each, copy from `content.md` |
| `SiteFooter.tsx` | footer |
| `KeypadPicture.tsx` | the 12-key drawing (no `'use client'`, no server-only import, so `KeypadDemo` can use it too) |
| `Pictures.tsx` | `ProofCheck` and re-exports; round 2 adds `pictures/HowScreen.tsx`, `pictures/{Conversation,Access,Privacy}.tsx` and `pictures/roles.ts` (R2.3-R2.6) |
| `KeypadDemo.tsx` (`'use client'`, edited) | the hero demo |
| `SiteMotion.tsx` (`'use client'`, new) | reveal observer and preference listener; renders `null` |
| `motion.ts` (new) | `SITE_MOTION_BOOT`, `msToken()`, `autoplayDecision()`, `splitInitialReveal()`, `ARRIVAL_FALLBACK_MS` (1200); pure, no React |
| `site-data.ts` (edited) | build-time data (below) |
| `site.css` (grown) | all landing styles |

`app/page.tsx` exports `metadata` (title, description, `openGraph`, `twitter` from `content.md`), `dynamic =
'force-static'`, and composes the components; it calls `getDemoData()`, `getHowData()`, `getProofExample()` and
`getResults()` once and passes plain data down.

### 0. Bar (all sizes)

Round 3 (2026-11-12): the nav shows from 960px and the bar is one row at every width; see "Round 3: hero, bar and the
try-it keypad" below, which wins over this section.

Brand link to `#top`: `/icons/favicon.svg` 44px (`alt=""`, below 48px the favicon variant) and "Ninth Life"
(24px is the existing raw value; use `--type-heading-size` 22px with weight 800). `.site-brand` is
`display: inline-flex; align-items: center; gap: var(--space-3); min-height: var(--target-min)` (MS-10.4).
Desktop: one row, brand left, nav, header CTA right (`nl-btn nl-btn--secondary`, `min-height:
var(--target-min)`). The DOM order is brand, nav, CTA, and the bar never reorders it (R2): no `order`, and no
grid placement that differs from the DOM order, at any width. From 720 to 1023px the children wrap in DOM order
(up to three rows, 12 + 56 + 8 + 56 + 8 + 56 + 12 = 208px), so the 744x1047 fold estimate is about 740px. Under
720px the `<nav>` is `display: none` (MS-3.3). The bar is `display: flex; flex-wrap: wrap; align-items: center; justify-content:
space-between; gap: var(--space-2) var(--space-3)`. Bar padding block `var(--space-3)`, so a one-row bar is
56 + 2 × 12 = 80px tall.

Phones (`max-width: 599px`) use a compact header button, carried over from today's `.site-header__cta` rule:

```css
@media (max-width: 599px) {
  .site-bar .nl-btn { padding: 0 var(--space-4); font-size: var(--type-label-size); }  /* 16px, the label size */
}
```

Widths: brand 44 + 12 + about 100 ("Ninth Life" at 22px, weight 800) = about 156px; compact "Open the app" about
135px; with the 12px gap about 303px. The content width is the viewport minus 2 × 16px, so the bar is one row
(80px) from about 352px wide. Below that (320px: 288px of content) it wraps to two rows, brand then button:
12 + 56 + 8 + 56 + 12 = 144px. MS-10.7 allows this at 320x568, because only the `h1` and the header CTA must be
visible there: bar 144, padding 24, icon 64, gap 16, `h1` 50 (48px type) = 298px, inside 568. From 600px the
default button size returns; 600-719px has no nav, and brand plus default button (about 332px) fits in one row.
`site.mjs` prints the bar's height at 320x568 and 360x668 and asserts it is at most 80px at 360x668 (MS-10.7). Nav links follow the standalone link rule of
"Page structure and layout" (R3), `label` weight, underline on hover; the nav's gap is
`var(--space-2) var(--space-6)`. The bar is not sticky (no focus obscuring, MS-9.4).

**Short landscape** (phones held sideways, MS-3.3, MS-10.7). The tablet layout's two-row bar and 112px icon
push the `h1` below the fold at 874x330. One rule, after the tablet and desktop rules in `site.css`:

```css
@media (orientation: landscape) and (max-height: 500px) {
  .site-bar nav { display: none; }                 /* one-row bar: brand + header CTA */
  .site-hero { padding-block: var(--space-4) var(--space-12); }
  .site-hero__icon { width: 48px; height: 48px; }  /* MS-6.1 allows 48px or more */
  .site-hero__name { font-size: clamp(48px, 16svh, var(--type-display-xl-size)); }
}
```

The `svh` unit is used here as the accessibility steering asks (never `dvh`); it is a viewport unit, not the
container unit that Chrome resolved to 0 (`tech.md` rule 4). The links the nav would show stay reachable: the
hero's "See how it works" and the footer nav.

### 1. Hero (MS-6.1)

Round 3 (2026-11-12): the `h1` is the promise, the icon is 48/64px, "See how it works" is a link, the demo's chips sit
under the sentence and its keys can be pressed; see "Round 3: hero, bar and the try-it keypad" below, which wins over
this section and "`KeypadDemo` changes".

Background ("Night sky", D13), on `.site-top`, which is `position: relative; isolation: isolate`:

```css
.site-top {
  background: var(--night);
  background: radial-gradient(80% 60% at 10% 100%, color-mix(in srgb, var(--plum) 70%, transparent), transparent 70%), var(--night);
}
.site-top::before {               /* the moon glow; the only layer that fades on arrival */
  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(60% 50% at 78% 18%, color-mix(in srgb, var(--moon) 8%, transparent), transparent 70%);
}
```

The first `background` line is the fallback for browsers without `color-mix()`. The lightest point behind
text is `--night` with 8% `--moon` (about `#251c3f`): `--ink-muted` reads at about 8:1 there and `--ink` higher,
so MS-9.2 holds without measuring each pixel. No stars, noise, blur or images.

Copy column: icon `/icons/icon.svg` (`alt=""`, 112px desktop and tablet, 64px phone, `border-radius` from the
icon's own tile, never animated, never inside `data-reveal`), `h1` `.site-hero__name` `font-size: clamp(48px,
14vw, var(--type-display-xl-size))` with the `display-xl` line height, weight and tracking, colour `--moon`; line
in `title` (32/38; `title-sm` 28/34 on phones); lead `body-lg`, `--ink-muted`, `max-width: 620px`; actions row (primary
`nl-btn nl-btn--primary nl-btn--xl` "Open the app", secondary `nl-btn--secondary nl-btn--xl` "See how it works",
full width on phones); note in `body`, `--ink-muted`. `components.css` gives `.nl-btn--xl` `min-height: 80px`
(the app's Speak size); the hero overrides it with `.site-hero .nl-btn--xl { min-height: var(--target-cta); }` (64px, still
above `target-min`), so the hero's buttons are 64px tall at every size.

Layout: desktop two columns (`flex: 6` copy, `flex: 5` demo, `gap: var(--space-12)`, padding block
`var(--space-16)` / `calc(var(--space-16) + var(--space-12))`, no raw 112px, R6); tablet (600-1023px) padding block
`var(--space-12)` / `var(--space-16)` (R6); tablet and phone one column, demo centred below the copy, `max-width: 400px`.
Phone hero padding block `var(--space-6)` / `var(--space-12)`; gaps between the hero copy blocks
`var(--space-4)`, `var(--space-6)` above the actions.

Fold checks (MS-10.7; `site.mjs` prints the measured bottom edges at these two sizes so the numbers can be
compared):

- 360x668 portrait, primary CTA required: bar 80 (one row with the compact phone button, see §0), padding 24, icon 64, gap 16, `h1` 52 (50.4px type,
  line height about 1.0), gap 16, line 68 (2 lines of 28/34), gap 16, lead 210 (7 lines of 20/30 at 328px
  wide), gap 24, CTA 64 = **634px**, inside 668 with 34px to spare.
- 874x330 landscape, `h1` and header CTA required: bar 80 (one row, the header CTA inside it), padding 16, icon
  48, gap 16, `h1` 53 (`16svh` = 52.8px) = **213px**, inside 330.
- 915x360 landscape: bar 80, padding 16, icon 48, gap 16, `h1` 58 (`16svh` = 57.6px) = **218px**, inside 360.

### 2. How it works (`#how`)

Round 2 (2026-11-11) replaces this section's layout and drawing: see "Round 2" below, R2.3 (MS-7.4, MS-7.8,
MS-8.12, MS-10.9). Each card keeps a mono step label (`01`, `02`, `03`, `digits` type in `.site-step`, a 56px square),
`h3` and text. Round 3 (2026-11-12, Claude Code): a one-line lead under the `h2`, no spelling line under the list,
and the runway only with motion: see "Round 3: How, Proof and Conversation" below. Round 4 (2026-11-13, Claude
Code): replaced by the three-step story row (Press, Pick, Speak), with no sticky picture, runway or step sync: see
"Round 4: How it works".

### 3. The proof check (`#proof`)

Round 3 (P2-6) replaces the round-1 `.site-split`: `div.site-wrap.site-proof-layout` holds, in DOM order, the
heading group `div.site-head.site-proof-layout__head` (`h2`, lead), the figure, then `div.site-proof__more` with the
legend (`h3` and a two-item list, each item led by the matching chip icon, `check` and `x`, so state is not only
colour; the plus moved to the Spell card, P3-3), the closing line and a `.site-cta` row with the secondary `nl-btn--xl`
"Open the app" (64px). One column below 1024px (gap 32, 48 from 600px); from 1024px a grid
`minmax(0, 1fr) minmax(0, 384px)` with areas `"head figure" "more figure"`, rows `auto 1fr`, gap 32 × 48. No
`order`, so reading order is the visual order.

`<figure class="site-proof">`: round 2 replaces the three frames with one stable layout, `ProofCheck`: see "Round
2", R2.4 (MS-7.9).

Round 4 (2026-11-13, Claude Code) replaces the layout and the figure above: see "Round 4: the proof check" at the end
of this file. In short: the head across the top, then one `data-play` root holding the figure, the four steps
(`.site-step`) and the note with its button; the legend is gone.

### 4. In a conversation (`#conversation`)

`h2`, lead, then a 2 × 2 grid of four cards from 648px (`.site-grid--boxes`, round 2), each starting with a stage
and its drawing: They said, Show and Flip, Saved phrases, Spell and My words. See "Round 2", R2.5 and R2.6. Round 3:
a surface band (Results moved up), 288px stages, benefit-first titles and finished frames with the before and the
after: see "Round 3: How, Proof and Conversation" below. Round 4: a lead card (They said) and a row of three; see
"Round 4: the box sections" below, which wins over this section.

### 5. Ways to type (`#access`)

Grid of five normal cards, 2 columns from 648px (round 2, MS-10.9, V37), each starting with a stage and its drawing:
Keyboard, Touch, One or two switches, Your view, Phones tablets and laptops (across both columns). See "Round 2", R2.5 and R2.6. Below the grid,
the accessibility note as a `site-card--note` (round 3; was `site-card--line`) with its `h3` and the issue link (no stage; it is not a feature box).
Round 3 (Claude Code): a one-line lead under the `h2`; a ground band (Results moved up, so the bands still alternate);
the grid adds `site-grid--hug`: below 600px each stage drops the shared height and hugs its drawing with `space-3` (24px in all, the MS-10.9 switch limit)
above and below (W1; one card per row, so there is no row to line up).
Round 4: the switch card leads, then four cards two by two; see "Round 4: the box sections" below, which wins.

### 6. Offline and private (`#privacy`)

`h2`, lead, a 2 × 2 grid of four `site-card` cards (round 3: every feature card has the edge; was `site-card--line`) from 648px (`.site-grid--boxes`, round 2), each starting
with a stage and its drawing: On your device, Model ranking, Voices, Listen. See "Round 2", R2.5 and R2.6. Then the
"Check it yourself" line with its link.
Round 3 (Claude Code): a surface band; the Model ranking card keeps two sentences (off by default; what is sent, from
`rankingSentText()`), so it is about as long as the others; under the grid one `.site-prose` block: `h3` "What
happens to what ranking sends", a disc list (region, retention, server logs), the "Check it yourself" line and a
`.site-links` row 8px under it pointing at the evidence (`.kiro/steering/privacy.md` and `lib/decodeClient.ts`, not
the repo root). The grid adds `site-grid--hug` (phones, as in §5).
Round 4: the On your device map leads, then the three ways out; see "Round 4: the box sections" below, which wins.

### 7. Measured, not promised (`#results`)

`h2`, lead, `<dl class="site-stats">` of three stat cards (`repeat(auto-fit, minmax(240px, 1fr))`), the
paragraph, the model line (when present), the links row. The stat value uses `display` type, static text
(MS-5.5). Cards may reveal (MS-8.4); the digits inside never animate.
Round 3 (Claude Code): right after the proof check, on a ground band. Under the stats a `site-card--note`
(`.site-results__note`, one measure plus its padding wide) holds the caveats, the simulated-typist sentence in bold
first; then `.site-prose` (ink, `--measure`) with the key-press and scan line, the per-source line
(`results.bySource`) and the model line, ending in the links row; last a `.site-cta` row with a secondary xl "Open
the app" (64px, full width on phones), the mid-page way into the app between the hero and the close (review P1-3).
Neither the note nor the prose is marked for a reveal (the A4 list is unchanged).

Round 4 (2026-11-13, Claude Code; decisions "Results", PO-1; the shared language's chart rule). The figures are graphics
now, with fewer sentences. In `.site-stack` order:
- `div.site-head` with the `h2` only: no lead with results.
- `.site-caveat.site-results__caveat`: the shared limit look; `SiteIcon` `info`, then one paragraph with the
  simulated-typist sentence in bold. Not marked for a reveal: it is visible from the first frame.
- `.site-results__grid`: one column, two from 600px. The chart card spans both columns, the two cards sit side by side,
  and the grid sets `--site-piece` to `--surface-sunken`, the piece colour on a surface card. Inside:
  - The chart card, `div.site-card.site-results__chart`, `--reveal-i` 0: a `dl.site-stats` of three
    `div.site-stats__group` (stacked with a hairline, `space-3` apart; three across from 648px, each group a CSS
    subgrid of the dl's four rows, so the titles, bars and captions line up where a title wraps). Each group holds
    its `dt`, then two `dd`s (the value line, then the meter), then the caption `dd`, and the key line follows once.
  - The by-source card, `--reveal-i` 1: an `h3` and a `ul.site-results__rows` of two value lines with meters.
  - The presses card, `--reveal-i` 2: an `h3`, then two `.site-effort` blocks split by a hairline. The first holds
    `pressExample()`'s letters over mono digits (aria-hidden), the "1.00" line and its note; the second holds the
    scan marks (`scanMarks()`, whole and part, aria-hidden) and the "3.57" line.
- `.site-results__models`: the `h3` "Model ranking" and a `ul.site-status`. Each row has an icon (`Icon` check, or
  `SiteIcon` `minus`) and a bold status word; model ids are `.site-nowrap`.
- `.site-links` with two `.site-go.site-go--out` links (`SiteIcon` `external`).
- The `.site-cta` row.

A value line (`.site-stats__line`) puts the value (`title-sm`, ink; the comparison in `heading`) and its label
(`body`, ink-muted) on one line, wrapping under it when narrow. It is static text (MS-5.5), and no role class sits on
it or around it.

A meter (`.site-meter`, not `.site-bar`, which is the site header) is a drawn piece, aria-hidden. Its track is 16px in
`--site-piece`, 4px corners, the whole (100%). Its fill (`.site-meter__fill`) is `inline-size: calc(var(--v) * 100%)`,
where `--v` is `barShare()` of the printed value, so the bar can never disagree with its label. The fill is `--ink` for
ours and `--line-strong` for word frequency alone (`.site-meter--base`). Contrast:
- `--ink` on the card: 15.1:1 Night, 17.9:1 Day.
- `--line-strong` on the card: 4.9:1 and 4.5:1; on the track: 4.4:1 and 3.7:1.
- `--ink` against `--line-strong`: 3.1:1 and 4.0:1 (`dataviz` validator: CVD and normal-vision ΔE pass, 32.9 and
  36.0).
Identity is never colour alone: every value carries its label. Forced colours give CanvasText fills on outlined
Canvas tracks, with GrayText for the comparison.

Motion: the A4 reveals of the head and the three cards, then A7 plays. The `data-play` roots are each
`.site-stats__group`, the by-source `ul` and the scan marks, all with `site-play--sweep`.
- Bar fills carry `site-grow site-k0` (ours) or `site-k1` (the comparison). In the Results block's own
  `@media (prefers-reduced-motion: no-preference)`, before the play they sit at `transform: scaleX(0)`, then
  `site-grow` runs over `motion-grow` (600ms) at t(k), `motion-ease-out`, filling backwards; `transform-origin` is the
  start edge (`:dir(rtl)` flips it).
- The marks are the existing `.site-mark` role (jump over `motion-jump`).
- No `--play-i`: the three measures play together.
- The last change ends 1,140 ms after the trigger (at most 1,600, PO-1). The base style is the full bar, so reduced
  motion and no JavaScript show the finished chart.
- `site.test.tsx` checks the timing per part and leaves these roots out of the generic MS-8.11 loop, which counts
  fades and rings.

Heights, measured in Chromium (reduced motion): at 390px the section is 2,082px against 1,961px in round 3 (the
budget is +150). 1440px: 1,378px; 768px: 1,466px; 320px: 2,522px. There is no horizontal scroll and no text under
16px at any of them.

### 8. Good to know (`#limits`)

`h2` and one `site-card--note` (round 3) holding the list (`body`, disc markers, two columns from 1024px with
`columns: 2; column-gap: var(--space-12)`).
Round 3 (Claude Code): the note card is a grid of three `.site-limits__group`s (`h3` + disc list): Before you start,
Not tested yet (with "Want to help test it?" and the issue link as a `.site-links` row), What it is not. One column,
`space-8` apart; three columns from 1024px (`column-gap: space-12`). No CSS columns, so reading order is DOM order.
Round 4 (2026-11-13, Claude Code): a lead and two cards; see "Round 4: the end of the page".

### 9. Questions (`#faq`)

Desktop: `h2` left (`flex: 1 1 320px`), the list right (`flex: 999 1 560px`); tablet and phone stacked. Each
`<details class="site-faq">`: `<summary>` with `min-height: var(--target-min)`, `heading` type, the question
text and an icon at the end (`plus` when closed, `x` when open, swapped with `details[open]` selectors, no
transition); `list-style: none` and `::-webkit-details-marker { display: none }` to drop the default marker;
the answer in `body`. Items are separated by a `--line-width` (2px) `--line` rule (decorative; the summary's
own focus ring shows focus), and each `.site-faq` has `padding-block: var(--space-1)`, so two closed summaries
are 4 + 2 + 4 = 10px apart (MS-10.4 asks for 8px or more). `site.mjs` checks that gap with the link groups.
Round 3 (Claude Code): 11 questions from `faqItems()` (the FAQPage JSON-LD and `/llms.txt` read the same list), then,
inside the list's reveal block, `p.site-links.site-faq__more` "Something else? Ask on GitHub" (`ISSUES_URL`, a 56px
link target, `space-2` after the text).

### 10. Free and open source (`#source`)

`.site-split`: left `div.site-source__copy` (not marked for reveal) holding the heading group `div.site-head`
(`h2`, lead) and then `div.site-source__more` with the two `h3` blocks (Why it is free, Who made it) and the
links row; right a `site-card--note` (round 3) "Credits" with its list.
Round 3 (Claude Code): the two `h3` blocks are `.site-prose` (ink, `--measure`, their own 8px gap); below 600px the
links row stacks (one 56px link per line) instead of wrapping one and two. The maker stays unnamed (W6).
Round 4 (2026-11-13, Claude Code): dissolved; `sections/Source.tsx` is deleted. See "Round 4: the end of the page".

### 11. Closing call to action (`#start`)

Centred column on a Night band with the banner's night sky (`.site-night`, `data-theme="night"`, round 3, W2; was `--surface`): the icon (96px, `alt=""`, still), `h2` and line (`.site-head--center`), primary "Open the app" in a `.site-cta--center` row, then the input-methods note
(`nl-btn--primary nl-btn--xl`). It is the only ember fill in any viewport that shows it (the footer has none).
No `data-reveal` on this section, because it holds the logo. Round 4 (2026-11-13, Claude Code): a facts row between
the `h2` and the button; see "Round 4: the end of the page".

### 12. Footer

As today's `/welcome` footer, plus the licence line, written out on tokens (R3): `site-footer` with `border-top:
2px solid var(--line)` and `padding-top: var(--space-12)`, brand image 32px, the licence line and the statement
in `caption` (14/20), `--ink-muted` (6.4:1 or better). Footer nav links follow the standalone link rule
(`min-height` and `min-width` `var(--target-min)`) and the group gap `var(--space-2) var(--space-6)`.
Round 4 (2026-11-13, Claude Code): rebuilt (brand column, three labelled groups, the legal block); see "Round 4: the
end of the page".

### Ember per viewport (MS-9.1, D6.2)

Only two elements have an ember background: the hero's and the closing section's "Open the app"
(`nl-btn--primary`). They are separated by the whole page, so no viewport shows both. Header, proof and
footer links into the app are secondary or plain. `site.css` never sets `background` or `background-color` to any
ember token (`--ember`, `--ember-deep`, `--ember-soft`); the demo key, the ninth key and the drawings use rings
drawn with `box-shadow` on pseudo-elements, and the drawn chosen sentence uses `--surface-sunken` with a
`--line-strong` border and a check icon.

## Drawings (MS-7)

`KeypadPicture({ size, pressed, ninth, className })` renders `div.nl-keypad.site-pad` (`aria-hidden="true"`)
with `KEY_ROWS` from `@/lib/keys` as `div.nl-key.site-key` (never `<button>`), keeping the design system's
fixed layout and digits. `size` is set as an inline style on the `.nl-keypad` element,
`style={{ '--nl-key': size } as React.CSSProperties}`. It must be inline: `components.css` has
`[data-keysize="xl"] .nl-keypad { --nl-key: clamp(var(--key-min), calc((100vw - 104px) / 3), var(--key-xl)); }`
(specificity 0,2,0), and `THEME_BOOT_SCRIPT` sets `data-keysize="xl"` on `<html>` on every page for anyone who
picked extra-large keys in the app. A `.site-pad` rule in `site.css` would lose to it, and at 1280px wide every
drawn key would grow to 128px (a 432px picture, wider than its card). An inline custom property wins over any
selector, so the drawings keep their size whatever the setting (MS-10.8). `KeypadPicture.tsx` exports the sizes
as constants, and no other file sets `--nl-key` for a drawing:

```ts
export const KEY_DRAWING_SIZE = '64px';                                   // How, Ways to type
export const HERO_KEY_SIZE = 'clamp(64px, calc((100vw - 120px) / 3), 84px)'; // the hero demo
```

(Round 4, 2026-11-13, Claude Code: `HERO_KEY_SIZE` is retired; the hero demo's keys use `KEY_DRAWING_SIZE`, see "Round 4: the hero demo".)

`size` is typed as `typeof KEY_DRAWING_SIZE | typeof HERO_KEY_SIZE`. Never below 64px (MS-10.5): at 64px
`.nl-key__letters` is 23px, `.nl-key__letters--4` 17.3px and the digit 16px. Other drawing text (rank numbers,
chip codes) is 14px or more. Frame labels use the `label` size (16px, R5), so proof frame 3's "Dropped",
which is outside `aria-hidden`, passes MS-10.5. The landing page does not load `app.css`, so the app's phone-only
`--nl-key-w` is never set there and keys stay square.

Width at 64px: drawings use a tighter panel than the app, `.site-pad { padding: var(--space-4); gap:
var(--space-2); } .site-pad .nl-keypad__row { gap: var(--space-2); }`, so the picture is
3 × 64 + 2 × 8 + 2 × 16 = **240px** wide. The Ways to type grid uses `minmax(288px, 1fr)`, so every card is
288px or wider and, after its `var(--space-6)` padding on each side, at least 240px inside. At 320px the
content width is 320 − 2 × 16 = 288px: one column, exactly wide enough. (The How picture is not in a card; its
box is the full content width on phones, 288px or more.) Every `.site-key` has a `::after` ring:

```css
.site-key::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: inset 0 0 0 3px var(--ember); opacity: 0; }                 /* the Key's pressed ring */
.site-key.is-pressed::after, .site-key--ninth::after { opacity: 1; }
/* While the demo plays, only the pressed key shows a ring. visibility does not restart A2's animation. */
.site-demo.is-playing .site-key--ninth:not(.is-pressed)::after { visibility: hidden; }
```

`ninth` is a constant `true` on the hero picture: key 9 keeps `site-key--ninth` for the life of the
component. Removing and re-adding the class would restart the arrival animation (A2) after every play.
`KeypadDemo` sets `is-playing` on its root `.site-demo` while it plays. No other `KeypadPicture` passes `ninth`.

The key keeps `--key` (plum) and `--on-key` in both themes, so the ember ring always sits on plum. The panel
uses `--panel` and `--lift` (the keypad panel is the one element the `lift` shadow is for). Drawings contain no
link, button or input (MS-7.2); drawn buttons are `div`s with `nl-btn` classes and `cursor: default`.

`components.css` gives `.nl-key` a pointer cursor and `.nl-key:active` the inner ember ring. Drawn keys are not
controls, so `site.css` resets both:

```css
.site-key { cursor: default; }
.site-key:active { box-shadow: none; }
```

`.site-key:active` has the same specificity as `.nl-key:active` (0,2,0) and wins because page CSS loads after
the layout's `components.css` (see "Routes, layouts and the CSS split"). The demo's pressed ring is the
`::after` ring above, never `:active`, so the reset does not touch it.

## Build-time data (`site-data.ts`, MS-5, MS-6.2, MS-7.6)

Server only (it uses `node:fs`); nothing here reaches the browser except the plain values passed as props.

- `readJson(...candidates: string[][])`: tries each path relative to `process.cwd()` and returns the first
  file that parses, else `null`. The lexicon and bigram reads try `public/data/lexicon/…` (copied by
  `copy-data.mjs`) and then `../../data/lexicon/…` (the repo's source of truth), so unit tests and a fresh CI
  checkout get the real dictionary.
- `getDemoData()`: unchanged algorithm (D12). It reads `en.v1.json` (the eval's file) and
  `en.bigram.v1.json`. The app ships `en.v2.json`, which loads to the same `Lexicon`, word for word and with the
  same tie-breaks (ADR-data-003, core-encoder Req 2.9), so the demo shows what the shipped dictionary gives
  (MS-6.2). Keeping v1 avoids changing `copy-data.mjs`, which copies v1 for this page. Words shown in the
  finished frame are "i need water". `getHowData()` reads the same files.
- `getHowData(): { code: '44'; sentences: string[] }`: `decodeGhost(['44'], { lexicon, lm, k: 3 })` words;
  `['hi']` when the dictionary is missing.
- `getProofExample(): ProofExample`: `keys = encodeWord('water')`; `words = ['water', 'waves', 'wafer'].map(w =>
  ({ word: w, code: encodeWord(w) }))`; matches are the words whose code equals `keys`; `reject` is the first
  word whose code differs, with `diffAt` the index of its first differing digit. IF no word is rejected or
  fewer than one matches, THEN it throws `Error('site-data: the proof example no longer shows a dropped word')`:
  the build fails, because a wrong example would be a false claim (MS-7.6).
- `getResults(read = readJson): SiteResults | null`:
  - `RESULTS.json` (`../eval/RESULTS.json`): required. B0 and B1 must exist with `status: 'ok'` and `metrics`
    whose `items` is a positive integer, `wordAcc`, `top1`, `top5` are finite in [0, 1], `ksr` finite in
    [-1, 1], `scanStepsPerChar` finite and > 0. Anything else returns `null` (MS-5.2) and logs one build-time
    `console.warn('[site] RESULTS.json is missing or invalid; the results section shows no numbers')`.
  - `RESULTS.llm.json` (`../eval/RESULTS.llm.json`): optional. Its shape (checked 2026-11-10): `{ harness,
    runs }`, where `runs` is a **plain object keyed `"<model>:<mode>"`** (today `MiniMax-M3:initials`,
    `MiniMax-M3:letter`, `MiniMax-M3.1-Flash:letter`), not an array. Each value has `model`, `mode`,
    `subset: { items, limit, seed }` and `configs: { id, label, status, metrics }[]`. If `file.runs` is not a
    non-null, non-array object, treat the file as having no runs. Iterate `Object.values(file.runs)` in key
    order; skip any value that is not an object. A run counts when: `mode === 'letter'`; `model` is a string
    for which `isModelId(model)` is true (from `@ninth/decoder`, so only models the decoder knows); `configs` is
    an array holding an entry with `id === 'B4'` and `status === 'ok'`; and the sample size (`subset.items`,
    else that B4 entry's `metrics.items`) is a positive integer. For each counted run, record the model (once)
    and the size, and its provider `MODEL_PROFILES[model].provider`. Then:
    - no counted run, or no file: `modelRuns: null`, no warning;
    - counted runs from more than one provider: `modelRuns: null` and one build warning
      `'[site] model runs come from more than one provider; content.md §7 needs new copy'`, because the line
      says "from one provider" (MS-5.3) and must never be false;
    - a file that exists but does not parse: `modelRuns: null` and one build warning.
    Model names are used only to count and to look up the provider; they are never rendered (MS-5.3, D14).
  - Returns `{ items, ghost: { wordAcc, top1, top5, ksr, scanStepsPerChar }, dict: { top1, top5 }, modelRuns:
    { sizes: number[]; count: number } | null }`; percentages formatted as today (`pct`), steps with two
    decimals. `modelNotRun` goes.
  - Round 4 (2026-11-13, Claude Code): it also returns the following, each null when missing or invalid in
    RESULTS.json, so the page leaves it out:
    - `words` (B1 `words`, a positive integer);
    - `ghost.pressesPerChar` (B1 `pressesPerChar` to two decimals);
    - `dict.wordAcc`;
    - `bySource.{aac,turk}` as `{ top1, items }` (null unless both sources have a valid top-1 and a positive item
      count).
  - New pure helpers, unit-tested:
    - `barShare(printed)`: the printed percentage as 0..1, a bar's length;
    - `scanMarks(printed)`: "3.57" is `[1, 1, 1, 0.57]`, at most 8 marks;
    - `pressExample(word = 'home')`: the letters over `encodeWord`'s digits; throws when a letter has no key;
    - `modelStatus(m, current)`: `{ count, company, models, sizes, service, serviceMeasured }` for the status rows.
    `modelRunsLine` is built from `modelStatus`, so `/llms.txt` and the page read the same values.
- `modelRunsLine(m)`: the model line of `content.md` §7 as one string (`sizes` ascending and unique, joined
  with ", " and a final " and "; "with 1 model" when `count` is 1, "with {count} models from one provider"
  otherwise); pure and unit-tested.

`site-data.ts` also exports `ISSUES_URL = `${REPO_URL}/issues`` and `NOTICE_URL = `${REPO_URL}/blob/main/data/NOTICE.md``.
The GitHub links 404 until the repository is public (`docs/submission/CHECKLIST.md` G1); that is a release item,
not a page change.

## Motion system (MS-8, D6, D6.1)

### Tokens (MS-8.2)

`design/system/tokens.json` gets a `motion` group, emitted by `scripts/gen-tokens.mjs` into `:root` (add
`'motion'` to the `['spacing', 'size', 'radius']` loop), then `pnpm -F @ninth/web tokens`:

| Token | Value | Usage (as written into tokens.json) |
|---|---|---|
| `motion-jump` | `120ms` | A highlight's colour or opacity change, linear. App and website. |
| `motion-crossfade` | `250ms` | Cross-fade between pages (view transition). No-preference only. |
| `motion-fade` | `600ms` | Website one-time reveal of a block. |
| `motion-fade-slow` | `900ms` | Website hero arrival only: the moon glow and the ninth key's ring. Once. |
| `motion-delay-arrival` | `300ms` | Delay before the ninth key's ring fades in. |
| `motion-stagger` | `80ms` | Delay between cards revealed together (at most 3 steps). |
| `motion-autoplay-delay` | `1200ms` | How long the hero demo is in view before it plays once. |
| `motion-demo-step` | `520ms` | Time between key presses in the hero demo. |
| `motion-reveal-distance` | `16px` | The most a revealed block moves. Website only. |
| `motion-ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Fades and reveals. |
| `motion-ease-linear` | `linear` | Highlights. |
| `motion-state` | `200ms` | Website: one state change inside a drawing (a fade, with at most `motion-nudge` of rise). Round 2. |
| `motion-nudge` | `8px` | Website: the most an arriving part of a drawing moves. Round 2. |
| `motion-play-lead` | `300ms` | Website: wait between a drawing reaching the play line and its first change. Round 2. |
| `motion-frame` | `600ms` | Website: time between steps of a played box drawing. Round 2. |
| `motion-frame-quick` | `400ms` | Website: time between steps of the switch and ranking drawings (the app's fastest scan step). Round 2. |
| `motion-sweep` | `240ms` | Website: time between steps of the proof check and the How sentence rows. Round 2. |

JavaScript reads the timing tokens it needs with `msToken(getComputedStyle(document.documentElement)
.getPropertyValue('--motion-demo-step'))`, which parses `"520ms"` to 520 and returns `null` for anything else;
`KeypadDemo` then falls back to `DEMO_STEP_FALLBACK_MS = 520` and `AUTOPLAY_DELAY_FALLBACK_MS = 1200`, and
`SiteMotion` to `ARRIVAL_FALLBACK_MS = 1200` (`motion-delay-arrival` plus `motion-fade-slow`); a unit test asserts
the fallbacks equal the token values.

### Gating: who decides that motion is on (MS-8.1, 8.7, 8.8)

1. **Boot script** `SITE_MOTION_BOOT` (in `motion.ts`), rendered as the first child of `.site`:
   ```js
   (function(){try{if(window.matchMedia&&matchMedia('(prefers-reduced-motion: no-preference)').matches)document.documentElement.dataset.siteMotion='pending';}catch(e){}})();
   ```
   It runs during HTML parsing, before the hero is painted, so arrival and scroll-linked animations start
   from the first frame without a flash. With no JavaScript, no attribute is set and the page stays still.
   `<html>` already has `suppressHydrationWarning`, so React does not complain about the attribute.
2. **`SiteMotion`** (client, renders `null`), in one `useEffect`:
   - `mq = matchMedia('(prefers-reduced-motion: no-preference)')`. If `!mq.matches` or there is no
     `IntersectionObserver`: delete `data-site-motion`, mark every `[data-reveal]` `data-revealed="instant"`, stop.
   - Otherwise `splitInitialReveal(elements, innerHeight)` marks every block whose `getBoundingClientRect().top <
     innerHeight` (in view or above it) `data-revealed="instant"`, then sets `data-site-motion="on"`, then
     observes the rest with one `IntersectionObserver({ rootMargin: '0px 0px -10% 0px', threshold: 0 })`; on
     intersect it sets `data-revealed="1"` and unobserves. Marking before setting `on` means nothing that is
     already visible is hidden, even for one frame.
   - One `focusin` listener on `document`: when the target is inside a `[data-reveal]` block that has no
     `data-revealed`, mark that block `instant` and unobserve it (MS-8.4: a block that gets focus before it is
     revealed stays visible, with no animation later).
   - **Arrival happens once** (MS-6.9). `SiteMotion` sets `data-site-arrived` on `<html>`: at once when motion
     is off at mount (no arrival ran), at once on a `change` to reduce, and otherwise from a timeout of
     `ARRIVAL_MS` after setting `on`. `ARRIVAL_MS` is `msToken(--motion-delay-arrival) + msToken(--motion-fade-slow)`
     (fallback 1,200 ms, equal to the token values, asserted in a unit test). A1 and A2 started while the boot
     script's `pending` was set, which is earlier than the effect, so they have finished when the timeout fires.
     A1 and A2 select `[data-site-motion]:not([data-site-arrived])`, so once the attribute is set they can never
     match again. Removing a finished `both` animation leaves the base styles (opacity 1), so nothing visibly
     changes. The attribute is never removed during the page view.
   - `mq` `change` to reduce: disconnect, delete `data-site-motion`, set `data-site-arrived`, mark all blocks
     `instant` (MS-8.8). `change` back to no-preference: run the "otherwise" branch again (reveal observer and
     `on`); `data-site-arrived` is already set, so the arrival fades do not replay.
   - Cleanup: disconnect, clear the arrival timeout and remove both listeners.
   If the JavaScript bundle never runs, `data-site-motion` stays `pending` and no block is ever hidden: hiding
   needs `on`.
3. **CSS**: every `animation`, `transition` and `animation-timeline` declaration in `site.css` sits inside
   `@media (prefers-reduced-motion: no-preference)` and under a `[data-site-motion]` selector, scroll-linked
   ones also inside `@supports (animation-timeline: view())`. The existing global rule in `globals.css`
   (`animation: none !important` under `reduce`) stays as a second guard.
4. **`KeypadDemo`** checks `matchMedia` itself before any autoplay (D6.1: JavaScript motion checks the media
   query).

### The animations, how each is built, and what reduced motion shows

| # | What | Built with | Motion on | Motion off (reduce, no JS, no support) |
|---|---|---|---|---|
| A1 | Moon glow arrives (MS-6.9) | `[data-site-motion]:not([data-site-arrived]) .site-top::before { animation: site-fade-in var(--motion-fade-slow) var(--motion-ease-out) both }` | fades 0 to 1 once on load | shown at once; never replays when the preference changes back |
| A2 | Ninth key's ember ring arrives (MS-6.9) | `[data-site-motion]:not([data-site-arrived]) .site-top .site-key--ninth::after { animation: site-fade-in var(--motion-fade-slow) var(--motion-ease-out) var(--motion-delay-arrival) both }`, scoped to the hero so no other picture can pick it up; the class never leaves key 9, and `data-site-arrived` ends the rule after the first arrival, so the animation runs once per page view | fades in once after 300 ms | shown at once; never replays when the preference changes back |
| A3 | Demo key presses (MS-6.3-6.5) | `KeypadDemo` timer, class `is-pressed`; the ring's `opacity` has `transition: opacity var(--motion-jump) var(--motion-ease-linear)` | one key ringed at a time, text swaps in jumps | Play still works, jumps with no transition; no autoplay |
| A4 | One-time reveals (MS-8.4) | `SiteMotion` + the three rules under "Reveals" below + `@keyframes site-reveal` (opacity 0 to 1, `translateY(var(--motion-reveal-distance))` to `none`) | block fades in and rises at most 16px, once | visible from the start |
| A5 | Scroll-linked frames | **Retired 2026-11-11** (ADR-006 amendment): no scroll timelines anywhere (MS-8.5) | | |
| A6 | Cross-fade into the app (MS-8.6) | `globals.css`: `@media (prefers-reduced-motion: no-preference) { @view-transition { navigation: auto; } ::view-transition-group(root) { animation-duration: var(--motion-crossfade); } }` | 250 ms cross-fade between `/`, `/app`, `/about` where supported | normal navigation |
| A7 | Played sequences (MS-8.11, MS-8.13) | `SiteMotion` play observer sets `data-played="1"` once; role classes and step classes, "Round 2" R2.2 | the drawing plays once at the play line, at most 4 s, then rests | finished state from the base styles |
| A8 | How step sync (MS-8.12) | **Retired in round 4 (2026-11-13)** with the sticky How picture: How's three scenes are A7 drawings in a sequenced row ("Round 4: How it works") | | |

The A5 frame keyframes, the `.site-frames` stack and the scan named timeline were removed in round 2. Parts that
replace each other now share a `.site-cell` (one grid cell), and the base styles show each drawing's finished state
(MS-7.5); see "Round 2" R2.2.

### Reveals (A4, MS-8.4)

Marked blocks (`data-reveal`), and only these:

- each section's heading group (`div.site-head`: the `h2` and its lead) in `how`, `proof`, `conversation`,
  `access`, `privacy`, `results`, `limits`, `faq` and `source`;
- each card or figure inside those sections: the How steps (`li`) and, since round 4, How's limit line
  (`p.site-caveat`; the How picture is gone), the rest of the proof
  copy column (`div.site-proof__more`: the legend, the closing line and the button) and `figure.site-proof`, the
  four conversation cards, the five access cards and the accessibility note, the four privacy cards, the three
  Results cards (round 4: the chart card, the by-source card and the presses card; never the `dl`, a group or a
  `dd`, and never the caveat), the Good to know card, the FAQ list as a
  whole (`div.site-faq-list`, not each `details`), and the rest of the source column (`div.site-source__more`:
  the two `h3` blocks and the links row) and the Credits card. (Round 4, 2026-11-13, Claude Code: the Good to know
  head and its two cards, `.site-limits__card` with `--reveal-i` 0 and 1, the grid `div.site-limits` unmarked; the
  source blocks are gone with the section. Proof: `figure.site-proof`, the steps `ol.site-proof-steps` and
  `div.site-proof__more`, the note and the button; their parent, the play root `div.site-proof-layout`, unmarked.)

No `[data-reveal]` element has a `[data-reveal]` ancestor (MS-8.4): the column wrappers `div.site-proof__copy`
and `div.site-source__copy`, the `ol` of How steps, the card grids and the `dl` are never marked, so no transform
or fade is applied twice.

Never marked: the bar, the hero and anything in `header#top`, the `start` section (it holds the logo), the
footer, any logo image or its ancestor, the `h1` and the hero lead.

`--reveal-i` (the stagger step) is set inline by the section component on sibling cards in one grid, as
`style={{ '--reveal-i': Math.min(i, 2) }}` (0, 1, 2, then 2 for the rest), so a row of cards appears over at most
2 × `motion-stagger` = 160 ms. Heading groups and single blocks have no `--reveal-i` (0).

CSS, all inside `@media (prefers-reduced-motion: no-preference)`:

```css
[data-site-motion="on"] [data-reveal]:not([data-revealed]) { opacity: 0; transform: translateY(var(--motion-reveal-distance)); }
[data-site-motion="on"] [data-reveal]:not([data-revealed]):focus-within { opacity: 1; transform: none; }
[data-site-motion="on"] [data-reveal][data-revealed="1"] {
  animation: site-reveal var(--motion-fade) var(--motion-ease-out) calc(var(--reveal-i, 0) * var(--motion-stagger)) both;
}
@keyframes site-reveal { from { opacity: 0; transform: translateY(var(--motion-reveal-distance)); } to { opacity: 1; transform: none; } }
```

`data-revealed="instant"` matches none of these rules, so an `instant` block is simply visible. The
`:focus-within` rule shows a hidden block on the first frame focus lands in it; `SiteMotion` then marks it
`instant` (see Gating), so the reveal animation never runs later on a block the visitor is already in. The
hidden state uses `transform`, which does not count as a layout shift.

Round-1 note, before A5 was retired. Why scroll-driven CSS for frames and an observer for reveals: frames are state tied to position, so they may
run backwards when the visitor scrolls back, and CSS keeps them off the main thread with no script. Reveals
must happen once (D6); a scroll timeline would replay them in reverse, so a single IntersectionObserver marks
each block once and the CSS animation runs on the compositor.

Not used, with the reason: smooth anchor scrolling (`scroll-behavior: smooth` moves the whole page), scroll
snapping, `position: sticky` headers, parallax, any animated `box-shadow`, `filter` or `backdrop-filter`
(non-composited and costly on phones), SMIL, Lottie, WebGL, GSAP or Motion (MS-8.3).

### `KeypadDemo` changes (MS-6.2-6.8, 6.10)

State: `step` (starts at the finished frame), `playing`, `startedBy: 'auto' | 'person' | null`, `announce`; refs
`autoplayed`, `acted`, the interval, the autoplay timeout, the latest visible ratio.

- **Observer and autoplay** (MS-6.3, MS-6.4): on mount, IF `IntersectionObserver` exists, create one observer
  (thresholds `[0, 0.1, 0.6]`) on the demo root and keep the latest `intersectionRatio` in a ref. It is created
  whatever the motion preference, because it drives two things:
  - (a) **stop**: when the ratio drops under 0.1 while playing, call `stop()`, for any play (automatic or a
    person's, motion on or off);
  - (b) **the autoplay timer**: when the ratio reaches 0.6 and `autoplayed` and `acted` are both false, start a
    `motion-autoplay-delay` timeout (unless one is already pending); clear it if the ratio drops under 0.6
    first. When it fires, call `autoplayDecision({ reduced: !mq.matches, hasObserver: true, autoplayed, acted,
    hidden: document.visibilityState === 'hidden', ratio })` and, only if it returns true, set
    `autoplayed = true` and `play('auto')`.
  `autoplayDecision` (pure, in `motion.ts`) returns true only when not reduced, the observer exists, not yet
  autoplayed, the visitor has not acted, the page is visible and the ratio is at least 0.6. With no
  `IntersectionObserver` there is no observer, no autoplay, and Play and Stop still work.
  A demo taller than the viewport height divided by 0.6 can never be 60% in view (for example at 874x330), so
  it never autoplays there. That is accepted: Play is always there.
- **Play / Stop** (MS-6.4): the button is "Play the example" before any play, "Play the example again" after a
  play has finished, "Stop" while playing. Pressing Play sets `acted = true` and `play('person')`. Stop (the
  button), the ratio falling under 0.1, `visibilitychange` to hidden, or `mq` changing to reduce all call
  `stop()`, which clears timers, sets `playing = false` and `step = last` (the finished frame, so the demo is
  never left half-typed).
- **Timing**: steps every `motion-demo-step` ms; 12 presses for "i need water", 11 steps after the first, about 5.7 s, so Stop is the
  WCAG 2.2.2 control (MS-8.9). Never loops.
- **Keys** (MS-6.5, MS-6.9, MS-10.8; round 4: `KEY_DRAWING_SIZE`, see "Round 4: the hero demo"): rendered by `KeypadPicture` with `size={HERO_KEY_SIZE}`,
  `pressed={playing ? s.key : undefined}` and `ninth` always `true` (today's `.site-demo__pad` size rule in
  `site.css` goes, because the XL setting overrides it); the root `.site-demo` gets `is-playing` while playing, which hides key 9's resting ring
  by `visibility` (see Drawings), so the pressed ring is the only ring during a play and the arrival fade never
  replays.
- **Announce** (MS-6.6): only when `startedBy === 'person'` and the play finished on its own.
- **Hear it** (MS-6.7): shown when `speechSupported()`, read after mount (`useEffect`, so server HTML and
  hydration agree); while playing it is `aria-disabled` (not `disabled`), so it keeps its place in the Tab order,
  and a press does nothing (review R3-N6); otherwise on press `speak(finishedSentence + '.', { lang: 'en', voice:
  pickVoice(window.speechSynthesis.getVoices(), undefined, 'en') })` from `lib/speech.ts`, synchronously in the
  click handler. If `speak` returns false, nothing else happens (the sentence is on screen). No voice name is
  shown anywhere.
- **No layout shift** (MS-6.10): the sentence well and the digits line each render a hidden sizer copy of
  the finished frame in the same grid cell (`visibility: hidden`, `aria-hidden="true"`), and the button's
  label sits in a grid with hidden copies of all three labels. The finished frame is the largest, so the box
  never changes size. The chip list has one fixed slot per finished word (`li.site-demo__slot`): a hidden
  copy of the finished chip (`.site-demo__chip-ghost`) sizes the slot and the live chip sits on top of it,
  starting at the slot's left edge, so a growing chip never moves the others (a centred list of growing chips
  measured a layout shift of 0.036 at 390x844). A slot whose word is not typed yet holds no live chip and is
  `aria-hidden`.
- **Caption**: a visually hidden `<p>` before the keypad picture with the example text from `content.md`.

## Round 2 (2026-11-11): played sequences, How step sync, a drawing in every box

Decisions V1-V17 (`.agents/tasks/marketing-landing-v2/decisions.md`; V18-V31 from the two design reviews), ADR-006
amendment of 2026-11-11. The full design with sizes and per-drawing notes is `.agents/tasks/marketing-landing-v2/design.md`; this section is what
binds the implementation. Requirements: MS-7.3-7.10, MS-8.5, MS-8.11-8.13, MS-10.8, MS-10.9, MS-11.6.

### R2.1 What changes

- A5 (scroll-linked frames) is retired: `site.css` loses every `animation-timeline`, `view-timeline`,
  `timeline-scope`, the nine `site-frame-KofN` keyframes and the `.site-frames` stack (MS-8.5).
- A7: drawings marked `data-play` play once at the play line and rest on their finished state (MS-8.11, MS-8.13).
- A8: from 1024px the How picture follows the step under the middle line; each step plays once (MS-8.12).
- Every card in `conversation`, `access` and `privacy` starts with a stage holding a drawing (MS-7.7); the How
  picture and the proof figure are redrawn (MS-7.8, MS-7.9).
- No new client component: both observers live in `SiteMotion` (MS-11.3). No image, font, library or request.

### R2.2 Roles, steps and triggers

Animated parts carry one role class; base styles give the finished state; motion adds the before-play state and the
animations, all inside `@media (prefers-reduced-motion: no-preference)` under `[data-site-motion="on"]`:

| Role | Base (finished) | Before play | Play (delay t(k) or t(u)) |
|---|---|---|---|
| `.site-in` | 1 | 0 | `site-in` 0 → 1, `motion-state`, `motion-ease-out`, at t(k) |
| `.site-rise` | 1 | 0, `translateY(var(--motion-nudge))` | `site-rise`, `motion-state`, at t(k) |
| `.site-out` | 0 | 1 | `site-out` 1 → 0, `motion-state`, at t(u) |
| `.site-during` | 0 | 0 | `site-out` at t(u), then `site-in` at t(k), in that list order |
| `.site-ring` | 0 | 0 | as `.site-during` over `motion-jump`, `motion-ease-linear` |
| `.site-mark` | 1 | 0 | `site-in` over `motion-jump`, `motion-ease-linear`, at t(k) |

Drawing play rules (selectors containing `[data-play]`, `[data-how-play]` or `.site-how__picture [data-s`) fill
`backwards` only (never `forwards` or `both`): a finished drawing keeps no animation and its base style is the end
state. A1, A2 and A4 keep their `both` fills. `t(k) = calc(var(--play-lead) + var(--k) * var(--play-step))`, with
`--play-lead: calc(var(--motion-play-lead) + var(--play-i, 0) * var(--motion-state))` declared on
`:is([data-play], .site-how__picture)`. `--play-i` is the card's column in its row, set inside the motion block by
layout CSS (V28): `.site-grid--boxes > :nth-child(2n)` 1 from 648px; Access from 1024px `:nth-child(2)` and
`:nth-child(5)` 1, `:nth-child(3)` 2; Access from 648 to 1023px `:nth-child(2)`, `(4)` and `(5)` 1; 0 elsewhere
(one column, How, proof). `--reveal-i` does not feed the play lead. Step classes `.site-k0`-`.site-k12` and
`.site-u0`-`.site-u13` set `--k` and `--u`; they come only from `pictures/roles.ts`: `type KStep = 0 | … | 12`,
`type UStep = 0 | … | 13`, `type Span = readonly [KStep, UStep]`, `role('in' | 'rise' | 'mark', k)`, `role('out',
u)`, `role('during', k, u)`, `role('ring', k, u, late?)` (each returns the class list, for example `'site-ring site-k1
site-u2'`; `'late'` adds `site-late`), `play('frame' | 'quick' | 'sweep' | 'type')` and `lastChangeMs`. Lists of
steps are typed tables (`TYPING`, `SWEEP`, `DIGIT_LINE`, `CHIP`), never arithmetic on step numbers. A ring handover
over `motion-jump` counts as one ring (MS-7.3); a repeated press's ring carries `.site-late` (`--late:
var(--motion-jump)`, added to its `site-in` delay) (V29). The
drawing root's class sets `--play-step`: `.site-play--frame` (`motion-frame`), `--quick` (`motion-frame-quick`),
`--sweep` (`motion-sweep`), `--type` (`motion-demo-step`). Parts that replace each other share a `.site-cell`
(`display: grid`, children in `grid-area: 1 / 1`); rings, marks and column boxes are absolute overlays.

```css
[data-site-motion="on"] [data-play]:not([data-played]) :is(.site-in, .site-mark) { opacity: 0; }
[data-site-motion="on"] [data-play]:not([data-played]) .site-rise { opacity: 0; transform: translateY(var(--motion-nudge)); }
[data-site-motion="on"] [data-play]:not([data-played]) .site-out { opacity: 1; }
[data-site-motion="on"] [data-play][data-played="1"] .site-in {
  animation: site-in var(--motion-state) var(--motion-ease-out) calc(var(--play-lead) + var(--k) * var(--play-step)) backwards;
}
```

`SiteMotion` additions (in `move()` / `still()`):

The `data-play` roots are the 13 box drawings, the proof figure and the three How per-step stages; the desktop How
picture is not one (R2.3). Pure helpers in `motion.ts`: `splitInitialPlay(elements, innerHeight)` returns `instant`
(has a box, `getClientRects().length > 0`, and its top is above `innerHeight`) and `later` (the rest, including
elements with no box); `shouldPlay(rect, innerHeight)` is false when `rect.bottom <= 0` or `rect.top >= innerHeight`;
a drawing no taller than the play area (`0.7 * innerHeight`) plays only with its whole box on screen and its bottom
at or above the line (1px allowed), a taller one with its whole box on screen or with its top at or above 1px and its
bottom at or below the line (V25, V32); `activeStep(tops, middle)` returns 0-3; `howStart(picture, innerHeight, step)` returns
`'live'` (has a box and its top is at or below `innerHeight`), `'deferred'` (has a box, top above `innerHeight`,
step 0) or `'finished'` (no box, or step 1 or more) (V26).

- Two play observers watch every `later` drawing and call one handler: the play area
  `IntersectionObserver({ rootMargin: '0px 0px -30% 0px', threshold: [0, 1] })` (ratio 1: the whole box above the
  play line) and the top line `IntersectionObserver({ rootMargin: '0px 0px -100% 0px', threshold: 0 })` (the box's
  top reaches the top of the viewport; it catches drawings taller than the play area and fast scrolls). The handler
  sets `data-played="1"` and unobserves the drawing from both when it has no `data-played` and
  `shouldPlay(entry.boundingClientRect, innerHeight)`. One observer cannot do both: a box taller than the play area
  keeps a constant ratio while it covers it, so no threshold fires when its top passes 0. In `move()`, before
  `data-site-motion="on"` is set, `instant` drawings get `data-played="instant"` (`data-play` roots on screen or
  above at mount: finished, never played, so nothing in view blinks; the desktop How picture follows MS-8.12, V33)
  and `later` ones are observed. A drawing with no box stays
  observed and plays once it is shown and `shouldPlay` holds.
- Step observer `IntersectionObserver({ rootMargin: '-50% 0px -50% 0px', threshold: 0 })` over the three
  `.site-how__step`; `activeStep(tops, innerHeight / 2)` gives 0-3; on change set `data-how-step`; if the story is
  deferred and the step is 1 or more, also set `data-how-live` and clear deferred; when above `seen`, also
  `data-how-play` and raise `seen`, else remove `data-how-play`; all in the same callback. At `move()`, before
  `"on"`, by `howStart`: `'live'` sets `data-how-live`, `seen = 0`, `data-how-step="0"`; `'deferred'` sets `seen =
  0`, `data-how-step="0"` and no `data-how-live` (the picture keeps its finished state until step 1 first becomes
  active, then the story starts there: tall viewports such as 1024 × 1366 and 1920 × 1200); `'finished'` sets
  `seen = 3`, `data-how-step` the current step, no `data-how-live`.
- `still()`: disconnect all three, every `[data-play]` to `instant`, remove `data-how-step`, `data-how-play` and
  `data-how-live`, clear deferred, `seen` 3. A later `move()` does not ask `howStart` again or set `data-how-live`.

### R2.3 How it works

`HowScreen` (`pictures/HowScreen.tsx`): the sentence well with a drawn Speak, up to three `nl-candidate` rows, the 64px
keypad. `getHowData()` returns `{ code: '4663', typing, sentences, chosen }` (`typing` the well after each press,
sentence case, decoded as the hero demo does; `sentences` the top 3; `chosen` the index of "home"); it throws as
MS-7.8 says, and without a dictionary gives digits only and no rows. Parts carry `data-s`:

| Step | Play class | Parts (role k-u) |
|---|---|---|
| 1 | `--type` | "Press a key to start" (`label` type, 16px/600, `--ink-muted`, one line in the `candidate`-line well cell) out u0; ring on 4 0-1, 6 1-2, 6 again 2-3 with `late`, 3 3-4; well `typing[0..2]` during `TYPING` (0-1, 1-2, 2-3), `typing[3]` in k3; digits likewise |
| 2 | `--sweep` | rows rise k0, k1, k2; chosen marker on row 1 ring 3-5; on row `chosen` mark k5; a `.site-out` u5 wrapper around step 1's last well text; `sentences[chosen]` in k5 |
| 3 | `--frame` | ring on Speak 0-1; "Speak" out u1; "Speaking" in k1 |

`HowScreen({ how, part })`, `part` `'all'` (desktop picture) or 1, 2, 3 (the per-step stages). Pressed rings on keys
come from `KeypadPicture`'s new `rings?: readonly { key: KeyId; k: KStep; u: UStep; late?: 'late' }[]` (`KeyId`
from `lib/keys.ts`), each rendered as a `div.site-key-ring` with `role('ring', k, u, late)` inside the key (absolute, `inset: 0`, the Key's 3px
inner ember ring).

Desktop (1024px and up): picture 5fr sticky at `top: var(--space-12)` (`var(--space-4)` when the viewport is under
680px tall; under 632px the bottom keypad row, which no step uses, is cut off while stuck, accepted), steps 7fr; cards
drop `min-height: 40svh`. From 1024px `.site-how { --site-how-h: calc(var(--space-24) * 6 + var(--space-8) +
var(--space-2)); }` (616px), `.site-how__picture { block-size: var(--site-how-h); }` and `.site-how__steps { gap:
24svh; padding-block: max(12svh, calc(var(--site-how-h) - 50svh)) 36svh; }`, so step 1 crosses the middle line only
once the whole picture is in view (V30; at an inner height of 650px the padding is 291px). **The desktop picture has
no `data-play`**; only these contexts drive it. Each part takes its step length from its own `data-s`:
`.site-how__picture [data-s="1"] { --play-step: var(--motion-demo-step); }`, `[data-s="2"]` `motion-sweep`,
`[data-s="3"]` `motion-frame`. Steps not reached (`.site-how[data-how-live]` with `data-how-step` below their
`data-s`) get the before-play declarations; `[data-how-play="N"] .site-how__picture [data-s="N"]` gets the play
declarations; anything else shows its finished state. Active card: the card is `position: relative`;
`.site-how__step::after` (`content: ''`, absolute, `inset: 0`, 2px `--line-strong`, `opacity: 0`); the label
`.site-step` is a `.site-cell` with two stacked spans of the same text, the plain one and `.site-step__key` (`--key`
fill, `--on-key` text, `opacity: 0`); for `nth-child(N)` both layers get `opacity: 1` with a `motion-state`
transition, from 1024px only.

Below 1024px the picture is `display: none` and each step card holds a `div.site-stage.site-how__stage` with its part
(`data-play` and the step's play class): step 1 the well (no Speak) and the keypad, 416px
(`calc(var(--space-24) * 4 + var(--space-8))`); step 2 the well (no Speak) and the rows, 288px
(`calc(var(--space-24) * 3)`); step 3 the well with Speak, 160px (`calc(var(--space-24) + var(--space-16))`). In the
stages the well row wraps (`.site-how__stage .site-well--row { flex-wrap: wrap; }`) and "Speak" and "Speaking" share
one `.site-cell`. Phone one column with the stage under the text, tablet two columns per card (stage 240px on the
right).

### R2.4 The proof figure (`ProofCheck`)

`figure.site-proof` with `data-play` and `--sweep`. Caption: a `nl-sr-only` span "Your keys: {proof.keys}" (the
accessible caption), then, `aria-hidden`, the label "Your keys:" and the five digits as spans in 32px columns (gap
8px, 192px) (V31). One `li` per word: a chip `.site-cell` (the real `ProofChip` in `CHIP[row]`, k9/k10/k11, an
`aria-hidden` typing chip out at the same step) and an `aria-hidden` letters-over-digits grid in the same columns,
digit line rise `DIGIT_LINE[row]` (k1/k2/k3), the dropped word's differing digit box and x `role('mark',
SWEEP[diffAt][0])`. The sweep lives in each of the 4 digit lines
(caption and 3 rows): each line is a `.site-proof__digits` grid (`repeat(5, var(--proof-col))`, `column-gap:
var(--space-2)`, `grid-auto-rows: var(--space-6)`, so 32 × 24px cells) holding its 5 digits and 5 `aria-hidden`
`span.site-proof__box` in the same cells (`grid-area: 1 / (c + 1)`, 2px `--line-strong` inset, `radius-chip`); the
boxes of column c in all 4 lines are `role('ring', ...SWEEP[c])` with `SWEEP: readonly Span[] = [[4, 5], [5, 6],
[6, 7], [7, 8], [8, 9]]` and jump together; no box crosses a chip. Then, outside `aria-hidden`, `proofSaidLine(proof)` ("Can be spoken: water, waves. Never spoken: wafer.")
and the "For example" sentence, in k12. No frame labels. Last change 3.4 s. (Superseded in round 4: see "Round 4:
the proof check".)

### R2.5 Stages and grids

`div.site-stage` (`aria-hidden`) is each box card's first child: 216px in Conversation and Access, at least 384px for
the switch card, 288px in Privacy (tokens: `calc(var(--space-24) * 2 + var(--space-6))`, `calc(var(--space-24) * 4)`,
`calc(var(--space-24) * 3)`); `--surface-sunken` on surface cards, `--surface` on sunken bands; `display: grid;
place-items: center; overflow: clip`. Conversation and Privacy use `.site-grid--boxes` (one column, then
`repeat(2, minmax(0, 1fr))` from 648px: a 2 × 2 grid, never 3 + 1); `.site-grid--2` is removed. Privacy also has
`.site-grid--start` (`align-items: start` from 648px, V38). Access is one column below 648px and, from 648px at every
width, 2 columns of normal cards (V37, replacing the bento after the round-2 review, P2): Keyboard and Touch; One or
two switches and Your view, whose stage takes the switch stage's 384px (`> :nth-child(4) > .site-stage`); Phones,
tablets and laptops across both columns (`> :nth-child(5) { grid-column: 1 / -1 }`). No tall card, no `order`.

### R2.6 Box drawings

Components in `pictures/Conversation.tsx`, `Access.tsx`, `Privacy.tsx`; each a `data-play` root.

| Box | Component | Play class | Parts (role k-u) | Finished state |
|---|---|---|---|---|
| They said | `SaidStrip` | frame | "Nothing yet." out u1; "What do you need?" in k1; reply well rise k2 | strip with the line, well "I need water" and its digits |
| Show and Flip | `ShowFlip` | frame | ring on Flip 1-2; upright card out u2; turned card in k2 | the turned card (a still layout) |
| Saved phrases | `PhraseSave` | frame | well with Save phrase out u2; ring on Save phrase 1-2; list in k2; its first row rise k3 | "Your phrases": I need water, Thank you, Yes, please |
| Spell and My words | `WordAdd` | frame | New chip, "Not in your words yet." and Add to my words out u2; ring on Add 1-2; Matches chip and "In my words." in k2 | Matches chip "Mihai 64424", "In my words." |
| Keyboard | `KeyLegend` | frame | ring on `4` 0-1, `Enter` 1-2, `Backspace` 2-3, arrows 3-4 | the legend, no ring |
| Touch | `TouchSizes` | frame | ring on the 72px key 0-1, the 128px key 1-2 | both keys, "72" and "128" |
| One or two switches | `ScanPlay` | quick | rows 1, 2, 3 ring 0-1, 1-2, 2-4; switch press 3-4; keys 7, 8 ring 4-5, 5-6; key 9 mark k6; switch press 6-7 | key 9 in the scan ring, switch at rest |
| Your view | `ThemeHalves` | frame | Day half in k1; 64px keys and "Large" out u2; 84px keys and "Extra large" in k2 | Night and Day halves, 84px keys |
| Phones, tablets and laptops | `LayoutBoxes` | frame | boxes rise k0, k1, k2 | Phone, Tablet, Laptop boxes |
| On your device | `DeviceBoundary` | frame | four rows rise k0-k3; pill rise k4 | "This device" with four rows and the offline pill |
| Model ranking | `RankingSides` | quick | outline on Off ring 0-1, on On 1-6; `RANKING_SENT` items rise k2-k5 | Off row above the On block with the list |
| Voices | `VoiceRows` | frame | check mark k1 with its line in k1; online line in k2 | both rows with their lines |
| Listen | `ListenStrip` | frame | "Nothing yet." out u3; ring on Listen 1-2; one `.site-cell` in the button with three labels: Listen out u2, Stop during 2-3, a second Listen in k3; "Listening. Ask them to speak now." during 2-3 in its own reserved row; the line in k3 | the line filled in, Listen |

Rules for every drawing: `aria-hidden`; nothing focusable; drawn buttons `div.nl-btn` with `cursor: default`; text
14px or more; no ember fill; at most one ember ring at a time (the switch press and the outlines are `--line-strong`);
the drawn computer key (Keyboard) is `surface-sunken`, 2px `line-strong`, `radius-chip`, mono 16px, 40px tall, added
to `design/system/README.md` first; the Touch keys set `--nl-key` inline from `TOUCH_MIN_SIZE` and `TOUCH_XL_SIZE`
(`var(--key-min)`, `var(--key-xl)`) on their own wrappers (MS-10.8 exception); Your view halves set `data-theme` and
re-declare `color` and `background`; layout boxes have no device features (MS-4.3) and are 36, 64 and 96px wide with
8px gaps and 16px labels (review R3-P2; doubled from 1024px, R3-P1); a width overflow narrows boxes and gaps, never
text (MS-7.7); drawing text uses `label` (16px) or larger, never `caption` (MS-10.5); from 1024px Your view and
Listen get roomier spacing and Your view's greeting `utterance` type, with stage heights unchanged (R3-P1);
`RANKING_SENT` is a new constant in `lib/rankingProvider.ts` with the four items in content.md §6 (MS-7.10), and the
drawing has no title of its own (the card's `h3` names it); voice rows use the generic name "Voice". Last change,
with the largest `--play-lead` of 700 ms as an upper bound, at most 3.62 s (the switch drawing); Saved phrases and
Listen 2.7 s, Model ranking 3.2 s. After the round-2 review (V39) the lead adds `motion-frame` per column and Touch
waits 4 × `motion-frame-quick` for the Keyboard drawing (now at the quick step), so no two ember rings in a row show
together; with the real leads every drawing still ends by 4 s (longest Model ranking 3.42 s). The switch card is a
normal card with a 384px stage (V37).

### R2.7 Budgets

Estimated after round 2 (not measured): document about 25-28 KB of 32, CSS about 12.5 KB of 16, script about 117.5 KB
of 125, total about 213 KB of 250, CLS 0. `site.test.tsx` gzips `renderToStaticMarkup` of the page and fails above
15 KB (MS-11.6). The Lighthouse check runs once more at the end (task 44).

### R2.8 Errors

`getHowData` and `getSpellExample` throw (build fails) when the dictionary is loaded and the example is no longer
true; `getHowData` without a dictionary returns digits only and warns, as the demo does. In the browser, no
IntersectionObserver or a change to reduce runs `still()`: finished states. An animation that cannot compute its
delay simply does not run; the before-play rules no longer match once `data-played` is set, so nothing stays hidden.

### R2.9 Tests

Unit (names start with the ID; the full list is in `.agents/tasks/marketing-landing-v2/design.md` §9 and in tasks
30.1-39.1):

- `site-motion.test.tsx`: `MS-8.11 a drawing reaching the play line gets data-played=1 once`; `MS-8.13 splitInitialPlay
  marks drawings in view or above at mount instant`; `MS-8.13 a hidden drawing at mount is not marked instant`;
  `MS-8.13 nothing in view changes when motion starts`; `MS-8.13 reduce during a play marks every drawing instant and
  nothing replays after no-preference`; `MS-8.12 activeStep counts the tops at or above the middle line`; `MS-8.12
  data-how-step follows the middle line and data-how-play only marks a new highest step`; `MS-8.11 shouldPlay waits
  for the whole box above the play line`; `MS-8.11 both play observers use shouldPlay and unobserve once played`;
  `MS-8.12 howStart is live below the fold, deferred in view with no active step, finished otherwise`; `MS-8.12 a How
  picture below the fold at mount is live and starts at step 0`; `MS-8.12 a How picture in view at mount with no
  active step plays from step 1`; `MS-8.12 a How picture with a step already active at mount never plays`.
- `site.test.tsx`: `MS-7.7 every box card starts with a stage holding one data-play drawing`; `MS-8.12 the desktop How
  picture has no data-play and the per-step stages each have one`; `MS-7.4 the round-2 drawings are present`; `MS-8.11
  every drawing's last change is at most 4000 ms`; `MS-8.11 every step class used on the page has a CSS rule`; `MS-7.3
  no ember fill and at most one ember ring per step`; `MS-7.3 a repeated key press is two rings, the second late`;
  `MS-7.9 the proof figure keeps its accessible text, adds the closing line and has no frame labels` (the caption's
  accessible text is exactly "Your keys: 92837", its digit grid `aria-hidden`); `MS-7.9 every digit line holds 5 sweep boxes and no box sits outside a digit
  line`; `MS-7.10 the ranking drawing lists RANKING_SENT with no count and the voice lines match the Voices card`;
  `MS-10.8 the Touch keys use TOUCH_MIN_SIZE and TOUCH_XL_SIZE`; `MS-10.9 Conversation and Privacy use site-grid--boxes
  and the switch card is site-card--tall`; MS-4.1 (copy); `MS-11.6 the page markup is at most 15 KB gzip`.
- `site-css.test.ts`: `MS-8.5 no scroll-timeline property anywhere` (from task 38); `MS-8.11 role and step rules only
  inside no-preference and [data-site-motion="on"]`; `MS-8.11 drawing play rules fill backwards only` (selectors with
  `[data-play]`, `[data-how-play]` or `.site-how__picture [data-s`; A1, A2, A4 untouched); `MS-8.12 How parts take
  --play-step from their data-s and the not-reached rules need data-how-live`; `MS-8.12 the How steps' top padding
  uses --site-how-h from 1024px`; `MS-8.11 the play lead uses --play-i, never --reveal-i`; `MS-7.5 base role rules show the
  finished state`; MS-8.10; MS-8.2; `MS-10.9 the Access bento places the switch card without order`; `MS-10.9
  site-grid--boxes has 2 columns from 648px`.
- `site-data.test.ts` MS-7.8 (How 4663, Spell Mihai, their throws), MS-7.9 (`proofSaidLine`);
  `ranking-provider.test.ts` `MS-7.10 RANKING_SENT maps to codes, lattice, beams and context.partner` (`v`, `lang`,
  `mode`, `k` excluded; `context.recent` is `[]`); `tokens.test.ts` MS-8.2 (six new tokens).

E2E `site.mjs`: MS-8.12 (step sync at 1280 × 800, 1920 × 1080, 1024 × 768, down and up; `MS-8.12 How plays every step
from the top on tall viewports` at 1024 × 1366 and 1920 × 1200; `MS-8.12 step 1 plays with the whole How picture in
view` at 1366 × 650, 1024 × 768 and 1280 × 800), `MS-8.11 tall drawings play in view` (320 × 568 and 375 × 667,
40px scroll steps: when a How stage or the proof figure gets `data-played="1"` its top is at -40px or more and its
bottom inside the viewport), MS-8.13 (a reload at `#access`
shows the drawings in view finished with no animation), MS-8.11 (each drawing finished with no animations 4.5 s after
the play line), MS-8.7 (reduced motion), MS-7.7 (no overflow in any stage, the How stages, the desktop How picture or
the proof figure at the 14 sizes and with XL keys, in width and height, with "Press a key to start" on one line at 320
and 1024px; `MS-7.7 stages in a section have equal heights`), MS-11.2 (CLS 0
while drawings play), MS-10.8 (every `.nl-key` 64-84px, Touch 72 and 128px), MS-10.9 (2 cards per row in Conversation
and Privacy at 1280 × 800 and 1920 × 1080; the switch card a normal card with its stage at most 24px taller than its
drawing at the five layout sizes; Tab order in the Access grid); MS-8.12 (the desktop placeholder rows show at step
1 and give way to the rows after step 2, V36); MS-8.11 (drawings a 150px flick passes on short phones play in view);
`axe.mjs` MS-13.1 as today.

## Round 3 (2026-11-12, Claude Code): shared primitives and one theme

Round 3 was done with Claude Code, not Kiro. Product-owner answers W1-W6 are in the ADR-006 amendment of
2026-11-12; this part covers W2, W3 and the theme review (`findings/theme.md` of the review). MS-14.

- **Primitives** (documented at the top of `components/site/site.css`; every section builds on them):
  `.site-band` (+ `--surface`), `.site-night` (the night sky: plum glow low left, moon glow high right, Night in both
  themes with `data-theme="night"`; used by the banner, `#start` and the `/about` header), `.site-wrap`
  (`--container`), `.site-stack`, `.site-split`, `.site-head` (+ `--center`), `.site-h2`, `.site-h3`, `.site-lead`,
  `.site-prose` (body 17/26, ink, `--measure`, 16px between paragraphs, a trailing `.site-links` row 8px under its
  sentence, disc lists), `.site-card` (fill + 2px `--line` edge; padding `space-6` minus the edge, so content boxes
  and stages keep their width), `.site-card--note` (edge, no fill, ink text), `.site-stage` with `--stage-s` 216,
  `--stage-m` 288, `--stage-l` 384, `.site-cta` (+ `--center`; every `nl-btn--xl` on the website is `--target-cta`,
  64px; full width on phones). `site-card--line` and `site-actions` are gone.
- **Tokens added** to `design/system/tokens.json`: `container` 1200px, `measure` 760px, `stage-s`, `stage-m`,
  `stage-l`, and the `brand` type style (22/28, 800, -0.01em).
- **One brand lockup** `.nl-brand` (+ `--small`, 32px with `body-lg` name) in `styles/components.css`: image radius
  25%, `brand` type, a 56px target as a link. Used by `SiteBar`, `SiteFooter` and `AppHeader`'s `Brand` (`/app`).
- **Links:** nav links (bar, footer) ink, label weight, underline on hover; content links `--link`, underlined,
  regular weight. The app footer's links are `body` size like the site footer's.
- **Ink rule:** ink for primary content (section paragraphs, prose, FAQ answers, list items in notes); ink-muted only
  for leads, card supporting text, captions and drawing labels.
- **Theme on first visit (W2):** `THEME_BOOT_SCRIPT` (`lib/settings.ts`) sets `data-theme="system"` outside `/app`
  when no valid `nl-theme` is stored; a stored theme wins; `/app` keeps Night from the `html` element. It only reads
  storage (MS-12.1). The app's `applyLook` stores `nl-theme` only once a theme has been chosen (not Night, or any
  theme once one is stored), so opening `/app` without choosing does not pin the website to Night.
- **Night close (W2):** `#start` is `site-band site-night` with `data-theme="night"`, so its primary looks exactly
  like the hero's in Day too (no plum Day ring).
- **Footer:** the rule runs the full window width (`footer.site-footer > .site-wrap.site-footer__inner`); nav adds
  "How we measured" (`METHOD_URL`) and "Report a problem" (`ISSUES_URL`); props `home` ("" or "/") and `statement`.
- **`/about` (W3, overturns D3):** `SiteBar home="/"` and a page head in a `.site-top.site-night` header, `main.site-band`
  with one `.site-stack` of `.site-prose` sections (`h2.site-h3`), the statement in a `.site-card--note`,
  `SiteFooter home="/" statement={false}`. It imports `site.css` (one cached stylesheet for the website) instead of
  `styles/app.css`, whose About rules were removed.

## Round 3: How, Proof and Conversation (2026-11-12, Claude Code)

Done with Claude Code, not Kiro (landing review `findings/top.md` and `findings/theme.md`; W1 of the ADR-006
amendment of 2026-11-12). Files: `sections/How.tsx`, `pictures/HowScreen.tsx`, `sections/Proof.tsx`,
`Pictures.tsx`, `sections/Conversation.tsx`, `pictures/Conversation.tsx` and their `site.css` blocks.

- **How runway (W1, amends V30).** From 1024px the base layout is still: the picture beside the steps, not sticky,
  cards `space-6` apart, no padding, so reduced motion and no JavaScript get a compact section (about 1,020px tall
  at 1280 × 800, was about 1,920). The runway is in the no-preference block under `[data-site-motion]` (set by the
  boot script before the first paint, so no layout shift): picture `position: sticky; top: var(--space-12)`
  (`space-4` under 680px tall), steps `gap: 16svh` (was 24svh) and `padding-block: max(12svh, calc(var(--site-how-h)
  - 50svh)) max(var(--space-6), calc(var(--site-how-h) + var(--space-12) - 50svh - var(--space-24) * 2))`. The top
  padding is V30's (step 1 crosses the middle line only with the whole picture in view); the bottom is what keeps
  the stuck picture whole while step 3 (a card of at least 192px) crosses the middle line, at least 24px (was 36svh).
  About 1,510px at 1280 × 800 with motion. The step sync (MS-8.12) is unchanged.
- **How lead and copy.** Lead "Three steps from the keys you press to the sentence you hear." in `.site-head`; step 02
  without model ranking (P2-5); the spelling line removed (P2-4, Good to know keeps it).
- **No placeholder rows (W1, amends V36).** In the desktop picture the three dashed `.site-cand__ghost` rows are
  gone. The rows share a `.site-cell.site-cands-cell` with one line `span.site-cands__hint` "Sentences appear here"
  (`label` type, `--ink-muted`, centred, `data-s="2"`, `role('out', 0)`): shown while step 2 has not played, fading
  as the first row rises, hidden in the finished state.
- **How keys (P3-4).** In `.site-how-screen` only, the 64px keys' letters sit under the digit: `margin-top:
  space-3`, `label` size × 1.2 for 3-letter keys, `label` size for 4-letter keys and words. Key sizes unchanged.
- **Step label and h2 on tokens.** `.site-step` weight `--type-heading-weight` (700); `.site-h2` line-height
  `calc(1em + var(--type-display-line) - var(--type-display-size))`: 60px at 56px, 40px at 36px.
- **Proof figure (P2-7, P3-3).** The last line is `"{reject}" is {code}. Your keys are {keys}.`, so "never spoken"
  appears once in the figure. The "Your keys" digits are small keycaps: 32 × 32 cells (`grid-auto-rows: space-8`),
  `--key` fill, `--on-key` text, a 2px `--line-strong` inset edge (visible on Night's sunken figure), radius 8; the
  sweep box sits 4px outside the keycap (negative margin) so it shows on the key fill.
- **Conversation (W1 amends V5-V7, P2-8, P2-9, P3-5).** `site-band site-band--surface`, so cards are
  `surface-sunken` and stages `surface`. Stages `.site-stage--conversation` (`--stage-m`, 288px). Each card's title
  is an `hgroup.site-card__titles`: `p.site-card__feature` (the app's feature name, `label` type, `--ink-muted`) then
  the benefit `h3`. Finished frames (base styles) and plays:

| Box | Plays | Finished state |
|---|---|---|
| They said | unchanged | unchanged |
| Show and Flip | ring on Flip 1-2; upright message out u2, turned in k2; a small upright `.site-show--before` card (label type, `--line` edge, ink-muted) in k2 above the main card | the small upright card above the turned card |
| Saved phrases | the well with Save phrase stays (a wrapping row, the sentence in `body-lg`); ring on Save phrase 1-2; list in k2; first row rise k3 | the well with Save phrase above "Your phrases" |
| Spell and My words | the New step (chip over "Not in your words yet.", then Add to my words) stays; ring on Add 1-2; the Matches step rises k2 | New step above the Matches chip and "In my words." |

Tests: `test/site.test.tsx` (MS-7.4, MS-7.7, MS-7.9, MS-9.3, MS-10.9, MS-3.1 bands, MS-8.4), `test/site-css.test.ts`
("How steps' top padding ... with motion only"), `test/e2e/site.mjs` (the hint line at step 1 and after step 2; the
reduced-motion layout check: no How runway, Proof figure before the legend and beside or under the head, its 64px
`.site-cta` button).

## Round 3: hero, bar and the try-it keypad (2026-11-12, Claude Code)

Done with Claude Code, not Kiro. Findings P1-1, P1-2, P2-1, P2-2 and P2-10 of the landing review and the product
owner's W1 and W4 (ADR-006 amendment of 2026-11-12). Requirements MS-3.1, MS-3.3, MS-6.1, MS-6.2, MS-6.2a, MS-6.4,
MS-6.7, MS-6.10 to MS-6.14, MS-7.2, MS-11.3. Copy: `content.md` §1. This section wins where §0, §1 and "`KeypadDemo`
changes" above say otherwise.

### Bar (W1, P2-10)

- The Main navigation shows from 960px (`@media (max-width: 959px) { .site-bar nav { display: none; } }`). Brand
  (158px), nav (525px) and the header CTA (166px) with the 12px gaps need about 921px including the side padding, so
  from 960px they are one row with room for font differences; under 960px the bar is brand and CTA. The bar is one
  row (80px) at every width from 320px; no width puts "Open the app" alone on a row any more (was MS-13.2's documented
  wrap at 720-1023px and under 352px).
- Under 352px the brand link shows its icon only: `.site-bar .nl-brand__name` is visually hidden (the clip pattern),
  so the link's accessible name stays "Ninth Life" and the lockup itself (`.nl-brand`) is not restyled.
- `SiteBar.tsx` (shared with `/about`) keeps its markup; the rules live in the bar part of `site.css`.

### Hero copy (P1-1, P1-2, P2-2)

```
p.site-hero__brand   [img.site-hero__icon 48px phone / 64px from 600px] Ninth Life   (brand type, ink)
h1.site-hero__title  <span>Type on 9 keys.</span> <span>Hear your sentence.</span>     (display, 36-56px, moon)
p.site-hero__lead    A free web app for typing to talk. Press one key per letter and hear the sentence you meant.
div.site-cta         a.nl-btn--primary.nl-btn--xl "Open the app"   a.site-hero__how "See how it works"
p.site-hero__note    Free. Works offline. No account.
```

- `h1`: `clamp(36px, 9.4vw, var(--type-display-size))`, line height 1.08, display weight and tracking, `--moon`. Each
  sentence is an inline-block span, so wide screens break between the sentences and narrow ones wrap inside them.
  Short landscape: `clamp(36px, 11svh, var(--type-display-size))`.
- The icon is 64px from 600px (was 112px), 48px on phones and in short landscape (MS-6.1's minimum).
- "See how it works" is a standalone link (56px target, `body-lg`, label weight, ink, underlined) beside the primary;
  on phones the full-width primary pushes it to its own row. The note follows the actions row.
- Phones: hero gap `--space-6`, copy gap `--space-3`, no top margin on the actions. Measured (Chromium, Night):
  390x844: h1 156-235, CTA 349-413, demo top 539, sentence bar to 625, chips to 745, their label to 779, keypad top
  795 (its top row starts on the first screen). 320x640: bar 80px (one row), demo top 577 (the sentence bar starts on
  the first screen). Before: 390x844 demo top 774, 320x640 bar 144px and demo top 862.

### Demo order (P2-1)

```
div.site-demo  (max-width 440px: the three finished chips, 426px, fit one row on desktop)
  div.site-demo__bar        sentence + digits (sizers) + Hear it
  div.site-sizer.site-demo__checked
    [try mode] ul.site-demo__chips.site-sizer__ghost (the finished chips, hidden: holds the height)
    ul.site-demo__chips aria-label="Proof check"   (example: the fixed slots; try mode: one chip per typed word)
  p.site-demo__check        Checked against the keys. <a href="#proof">How the check works</a>
  div.nl-keypad.site-pad.site-demo__keypad  role="group" aria-label="Keypad, try it"  (12 buttons, --nl-key inline)
  p#site-demo-caption.site-demo__caption   example caption, or the try-it result line
  div.site-demo__foot       button.site-demo__clear "Clear"   button.site-demo__play (the three labels in a sizer)
  p.nl-sr-only[role=status][aria-live=polite]
```

The keypad panel is as wide as the sentence bar (`.site-demo__keypad { width: 100% }`, keys centred). The caption is
visible: "One press per letter: 4 0 6333 0 92837 types “I need water”. 0 is space. Press the keys to try your own
words." The digits are `aria-hidden` with a visually hidden copy read digit by digit ("4, 0, 6 3 3 3, 0, 9 2 8 3 7").

### Try it (W4; overturns D13 and the old MS-6.2 picture rule)

- **Keys.** `KeypadDemo` renders the 12 keys itself as `<button class="nl-key site-key site-key--try">` with
  `KeyFace` (exported from `KeypadPicture.tsx`), `aria-label` from `KEY_ROWS` (the app's names), `data-try-key`, and
  key 9 keeps `site-key--ninth` (A2 still fades its ring in once). `KeypadPicture` lost its hero-only `ninth` prop;
  every other keypad is still an `aria-hidden` drawing. `.site-key--try` gets the pointer cursor and the pressed ring
  while held (`:active::after`); focus is the design system's `.nl-key:focus-visible` ring (4px, 3px offset, inside
  the panel's 16px padding).
- **Keyboard.** Roving tabindex: one Tab stop (key 1 first, then the last focused key); ArrowUp/Down/Left/Right move
  on the 4x3 grid. While a key has focus, the app's `mapKey(e, 'keyboard', 'control')` (`lib/keyboard.ts`) maps typed
  digits, `*`, `#` and Backspace to key presses (held keys do not repeat); Enter and Space stay the focused button's
  click. Nothing is captured outside the keypad.
- **Loading.** The first key press or Clear calls `import('./try-engine')` once; when it resolves, the engine's
  `loadDictionary()` (the app's `lib/data.ts`: `en.v2.json`, `en.bigram.v1.json`, `core-en.json`, with the same
  hashed URLs as `/app`, so the service worker's precache is reused) runs. Presses before the engine arrives are
  queued and replayed. No `next/dynamic`, no prefetch: the chunk is not part of the first load (checked in `site.mjs`
  by comparing requests before and after the first press).
- **Engine** (`components/site/try-engine.ts`, no `'use client'`): `press(state, key, dict)` is the app's
  `composerReducer` + `actionForKey`, with `#` as the app's Next (the next of `readings()` pinned); `view(state, dict)`
  is the app's `decodeWithPins` (k = 5) → `decodeAround` fallback → `buildSentence`, returning the top sentence's
  text, one `{ word, code, state }` per word for the ProofChips, up to 3 formatted matches and `speakable`.
- **Display.** Try mode (`.site-demo.is-trying`) shows the visitor's sentence (or "Press a key to start." muted),
  their digits, a ProofChip per word (states from the app's proof: match, new, typing, unspelled) and the result line
  in the caption: "Keys {codes} match: “Good”, “Home”, “Gone”." / loading / none / failed (`TRY_COPY`, `tryLine`). A
  pressed key shows `is-pressed` for 160ms, so a typed digit is seen to land (a state, no animation; the A3 opacity
  transition applies only with motion on).
- **Live region.** The same line, 400ms after the last change (`TRY_ANNOUNCE_MS`), polite.
- **Example and pressing** (MS-6.14). A press sets `acted`, clears the autoplay timer and, if the example plays,
  ends it on the finished frame (no announcement), so it never autoplays after a press. "Play the example" clears
  the visitor's keys and plays the example; Clear in example mode switches to an empty try mode.
- **No movement under the finger.** The chips area keeps the finished chips' height (a hidden copy in the same grid
  cell), and the well keeps its sizer, so the keypad does not move while typing until the visitor's sentence or chips
  outgrow the example's (`site.mjs` checks the keypad's top before and after 4663).
- **Budgets.** First load: `KeypadDemo` grows by the try-it UI (no decoder, no composer, no data); the engine chunk
  (core decoder, composer, sentence, data loader) and about 0.9 MB of dictionary load only after a press, as in the
  app. The SSR markup grows by the 12 buttons' names and the visible caption (MS-11.6 still under 15 KB gzip).
- **Honesty** (MS-4.2, product.md). The copy says the words match the keys; nothing says the page or a model
  understands. Results are the offline decoder's only; model ranking is never called from the website.

## Error handling

| Operation | Failure | Recoverable? | What the caller or visitor gets | Logged |
|---|---|---|---|---|
| Build: read the lexicon or bigrams | file missing or invalid | yes | demo shows digits only, How shows "hi", `fromDictionary: false` | one build `console.warn` |
| Build: `RESULTS.json` | missing, unparsable or invalid metrics | yes | MS-5.2 sentence, no numbers | one build `console.warn` |
| Build: `RESULTS.llm.json` | missing | yes | no model line | no |
| Build: `RESULTS.llm.json` | unparsable | yes | no model line | one build `console.warn` |
| Build: `RESULTS.llm.json` | `runs` not an object, or no counted run | yes | no model line | no |
| Build: `RESULTS.llm.json` | counted runs from more than one provider | yes | no model line | one build `console.warn` |
| Build: proof example | no dropped word or no match | **fatal** | build fails with the `site-data` error | the thrown error |
| Browser: no `matchMedia` or no `IntersectionObserver` | API missing | yes | still page, no autoplay, no reveal | no |
| Browser: no `animation-timeline` or no view transitions | not supported | yes | finished frames, plain navigation | no |
| Browser: no speech engine | `speechSupported()` false | yes | no Hear it button | no |
| Browser: `speak()` returns false or the engine errors | engine | yes | nothing; the sentence stays on screen | no (privacy: never log text) |
| Browser: a motion token does not parse | CSS missing | yes | fallback constants | no |
| Browser: service worker registration fails | browser | yes | page works online; offline needs a later visit | browser console only |
| `scripts/lighthouse.mjs`: bad arguments | usage | fatal | usage text, exit 2 | stderr |
| `scripts/lighthouse.mjs`: URL not reachable | no server | fatal | "No server at <url>. Build and start it first (see docs/testing/performance.md).", exit 2 | stderr |
| `scripts/lighthouse.mjs`: development server | `isDevServerHtml(html)`: the HTML matches `/\/_next\/static\/chunks\/(webpack|main-app)\.js(\?|")/` (the dev server's unhashed chunk names; checked against the Next 15.1.12 dev server on 2026-11-10, whose HTML has neither `react-refresh` nor `/_next/static/development/`; production names carry a hash, `webpack-<hash>.js`) | fatal | "This is a development server; Lighthouse needs `next start`.", exit 2 | stderr |
| `scripts/lighthouse.mjs`: a `network-requests` item has no `sessionTargetType` | Lighthouse report shape | yes | the item is counted as a page request (the stricter reading) and the report notes how many items lacked the field | stdout |
| `scripts/lighthouse.mjs`: one Lighthouse run throws | Chromium or Lighthouse | yes, once | the run is retried once, then exit 1 | stderr |
| `scripts/lighthouse.mjs`: target or budget missed | page | reported | report printed and written (with `--write`), exit 1 | stdout |

The landing page logs nothing at runtime (privacy.md: no analytics, nothing that could carry what someone typed).

## Inputs and their validation

The landing page takes no visitor input other than presses on its buttons, links and questions.

- Build-time files: validated as in "Build-time data" above; every value rendered as text goes through React's
  escaping. Model names must pass `isModelId` and are never rendered.
- `scripts/lighthouse.mjs` arguments: `--url` optional, must parse as an `http:` or `https:` URL (default
  `http://localhost:3202/`); `--runs` optional integer 1-9 (default 3); `--write` optional flag; `--preset`
  optional `mobile`, `desktop` or `both` (default `both`). Anything else: usage and exit 2.
- `e2e/site.mjs` environment: `BASE_URL` (default `http://localhost:3202`, as `lib.mjs`), `ENGINE`
  (`chromium` or `webkit`), `OFFLINE=1` (production only, see test plan).

## Invariants and who enforces them

| Invariant | Owner (enforces) | Why there | Checked by |
|---|---|---|---|
| Every sentence the page shows matches its keys | `site-data.ts` (only offline-decoder output: `decodeGhost`, and `Lexicon.completions` for the word being typed; `encodeWord` for the proof) | build time is the only place the page decodes | `site-data.test.ts` |
| Numbers come only from the harness files | `site-data.ts` `getResults()` | one reader, no hand-typed numbers | `site-data.test.ts`, `site.test.tsx` |
| Key drawings keep their size under the app's XL setting | `KeypadPicture` (inline `--nl-key` from its exported constants) | an inline custom property beats `[data-keysize="xl"] .nl-keypad`; one owner for every drawing | `site-css.test.ts`, `site.test.tsx`, `site.mjs` XL pass |
| No reveal block inside another | the section components (only the A4 elements get `data-reveal`) | markup decides nesting | `site.test.tsx` |
| Arrival fades run once per page view | `SiteMotion` (`data-site-arrived`) + the A1/A2 selectors | the one place that knows the arrival has happened | `site-motion.test.tsx`, `site-css.test.ts` |
| At most one ember fill per viewport | `site.css` (no ember backgrounds), the two `nl-btn--primary` links | CSS is where fills are set | `site-css.test.ts`, `site.mjs` |
| No motion without consent | CSS gating + `SITE_MOTION_BOOT` + `SiteMotion` + `KeypadDemo`'s own check | each layer that can start motion checks for itself | `site-css.test.ts`, `site-motion.test.tsx`, `keypad-demo.test.tsx`, `site.mjs` |
| The intended-purpose sentence is verbatim | `NOT_A_MEDICAL_DEVICE` in `Footer.tsx` | one constant for app and site | `site.test.tsx`, `footer.test.tsx` |
| Provider copy is true for the deployed provider | `providerCopy()` | set at build from the route's env | `site.test.tsx` |
| The app opens at `/app` and works offline | `manifest.webmanifest`, `next.config.mjs`, `app/sw.ts` | install and worker config | `routes.test.ts`, `site.mjs OFFLINE=1`, `perf-check.mjs` |
| No layout shift from motion or the demo | stacked frames, sizers, opacity and transform only | layout decided once, from the server HTML | `site.mjs` (CLS), Lighthouse |

## Changes to other specs, steering and docs (D10, D11)

Exact text for the implementer (tasks 21 to 25):

- `.kiro/specs/web-ui/requirements.md`
  - Introduction, add: "The communication screen is served at `/app`; `/` is the website (spec `marketing-site`,
    ADR-006)."
  - 5.1 becomes: "THE service worker SHALL precache the app shell, the documents `/app`, `/about` and `/`, fonts,
    icons and `/data/**` so ghost mode works offline after one visit to any of them, AND an uncached document
    requested offline SHALL fall back to `/app` (ADR-006)."
  - Requirement 11, add before 11.1: "These rules cover the app (`/app`, `/about` and their sheets). The website
    at `/` follows marketing-site MS-8 (ADR-006)." Add "11.3 WHEN `prefers-reduced-motion` is `no-preference`, a
    navigation between pages MAY cross-fade for `motion-crossfade` (250 ms); nothing inside the app SHALL
    animate on arrival."
  - 14.3 becomes: "THE app footer, the About page and the website footer SHALL carry: …" (sentence unchanged).
  - 23.4: "SHALL hold what the app needs offline, including the documents `/`, `/app` and `/about`, and SHALL NOT
    hold `/welcome`, the 192 and 512 px PNG icons, …" (rest unchanged).
  - 25.6, append: "The website at `/` scrolls and works in both orientations (ADR-006, marketing-site MS-10.3)."
- `.kiro/specs/web-ui/design.md`: Architecture diagram `app/app/page.tsx`; "Offline and data": "Serwist precaches
  the shell, `/app`, `/about`, `/` and every public file …; uncached documents fall back to `/app`".
- `.kiro/specs/web-ui/tasks.md`: add "56. App moved to `/app` (marketing-site tasks 3-9; Req 5.1, 14.3, 23.4)" (use the next free number if 56 is taken).
- Steering: `structure.md` (pages `/` website, `/app` the app, `/about`; `/welcome` redirects; `components/site/`;
  spec `marketing-site/`); `product.md` Devices, append "The website at `/` is a normal scrolling page and works in
  both orientations on phones (ADR-006)."; `accessibility.md` rule 5, append "The website at `/` may also use the
  website motion tier of ADR-006 (marketing-site MS-8); the app may not."; `design-system.md` "Spooky, but calm",
  replace the last sentence with "The website may use the motion tier of ADR-006 (slow fades, one-time reveals of
  at most 16px, scroll-linked state jumps, a cross-fade into the app); the video may use slow fades."; `tech.md`,
  change the E2E row's script list to `<axe|keyboard|switch|spell|responsive|site>` and add a Commands row
  "Lighthouse (production server on :3202 only) | `node scripts/lighthouse.mjs --write`"; `accessibility.md`
  "How to check", add "`test/e2e/site.mjs` for changes to the landing page (layout at 14 sizes, motion on and
  off, no-JS, privacy, keyboard)".
- `design/system/README.md` Motion: add a "Website" paragraph that lists the tier (A1-A6), the bans of MS-8.3 and
  the motion tokens; the app sentence stays.
- `.kiro/agents/a11y-auditor.json`: default route `http://localhost:3000/app` in `prompt` and `welcomeMessage`;
  add to the method "On `/`, check the website motion tier (ADR-006, marketing-site MS-8) instead of
  accessibility rule 5." `.kiro/workflows/ship-feature.workflow.json`: audit URL `http://localhost:3000/app` (the
  dev-server probe may stay on `/`). Run `node scripts/validate-kiro-config.mjs` after both.
- Docs: `docs/architecture/web.md` route map (`/`, `/app`, `/about`, `/welcome` 308, `/robots.txt`);
  `docs/testing/README.md` (layers table: axe on `/`, `/app`, `/about`; a "Landing page" row for `site.mjs`;
  rewrite "The website" section: `/` is the landing page, the app is at `/app` because of ADR-006);
  `docs/testing/performance.md` (precache notes and the Lighthouse section); `docs/plan/01-implementation-plan.md`
  (row F12 note "superseded by marketing-site: `/welcome` now redirects to `/`", new row F21 "Landing page at `/`,
  app at `/app`"); `docs/README.md` ADR list; `docs/decisions/ADR-003-one-screen-portrait-phones.md` Consequences,
  add "Scope: the app at `/app`; the website at `/` rotates freely (ADR-006)."; `README.md` License section,
  add "Development only: Lighthouse 13.6.0 (Apache-2.0), not shipped."; `docs/KIRO_LOG.md` one row per session
  (`node scripts/kiro-log.mjs add …`). Historical reports (`docs/a11y/…`, `.kiro/workflow-output/…`) stay.

## Test plan

Unit tests (Vitest, `packages/web/test/`, run by `pnpm -F @ninth/web test --run`; each `it()` name starts with
the requirement ID):

| File | Tests (requirement IDs) |
|---|---|
| `site.test.tsx` (new) | renders `app/page.tsx`'s default export: MS-3.1 one `h1`, `h2` ids in order; MS-3.2 skip link is the first link and targets `main#main`, `header#top` holds the nav and the hero, `footer` after `main`; MS-3.3 nav hrefs and their targets exist; MS-3.4 every question is a closed `details`; MS-3.5 `metadata` title, description, `openGraph`, `twitter`; MS-1.6 every "Open the app" is an `<a>` with `href="/app"` and exactly two have `nl-btn--primary`; MS-4.1 the copy matches `content.md` (see "Copy check" below); MS-4.2 the banned-claims check (see "Banned-claims check" below); MS-7.1 the only `<img>` elements are the four logo images (the bar favicon, the hero icon, the closing icon and the footer favicon) and there is no `<video>`, `<picture>` or `<canvas>`; MS-7.4 frame counts: `HowFrames` 3, `ProofFrames` 3, `ScanFrames` 4, `ShowFrames` 2 children of `.site-frames`, and the still drawings (`SaidBubble`, `RankingSwitch`, `OfflineChip`) are present; MS-8.4 the marked list: exactly the blocks of design A4 carry `data-reveal` (in `proof` and `source`, the `div.site-head` and `div.site-proof__more` / `div.site-source__more`, never the column wrappers), and sibling cards carry `--reveal-i` 0, 1, 2, 2…; MS-8.4 `document.querySelectorAll('[data-reveal] [data-reveal]').length === 0`; MS-4.3 (trademarks and brands): (a) spawn `node scripts/tm-lint.mjs` from the repo root with every file under `components/site/`, `app/page.tsx` and `.kiro/specs/marketing-site/content.md` and expect exit 0; (b) read `scripts/tm-lint.mjs` as text, take its word list from `/const BANNED = \[([^\]]*)\]/`, build the same whole-word, case-insensitive pattern, and assert no match in the rendered text (as in the copy check), in any `alt`, `aria-label` or `title` value, or in any file name under `components/site/` (the test file never spells the words, so it needs no `tm-lint-allow`); (c) no match in the rendered text for `/\b(iPhone|iPad|Pixel|Galaxy|Samsung|Android|iOS|Huawei|Xiaomi|Motorola)\b/i`, and no element inside `.site` has a class containing `phone`, `handset` or `device` (no drawn phone body); MS-9.3 each of the three legend items in `div.site-proof__more` starts with an `svg.nl-icon` whose markup equals `<Icon name="check" />`, `<Icon name="plus" />` and `<Icon name="x" />` rendered alone, in that order; frame 3's wafer chip has `data-state="reject"`, the class `nl-chip--reject` and an `.nl-chip__word` (which `components.css` strikes through: the test also reads `styles/components.css` and finds `.nl-chip--reject .nl-chip__word { text-decoration: line-through`); frame 2's differing digit is one element with `.site-digit--diff` at `reject.diffAt`; MS-10.8 and MS-10.5 every `.nl-keypad.site-pad` in the render has an inline `--nl-key` equal to `KEY_DRAWING_SIZE` or `HERO_KEY_SIZE`, and `KEY_DRAWING_SIZE === '64px'` and `HERO_KEY_SIZE` is a `clamp()` whose minimum is `64px` and maximum `84px`; MS-8.1 the rendered HTML contains the raw `SITE_MOTION_BOOT` text (not escaped); MS-4.4 footer text contains `NOT_A_MEDICAL_DEVICE` exactly and the FAQ answer is "No. " + it; MS-4.5 `#limits` precedes `#faq` and lists the §8 items; MS-4.6 `providerCopy().service` and `.retention` appear; MS-4.7 the history line, and no "Built with Kiro" or "not been measured yet"; MS-4.8 "Google", "Apple", "Chrome", "Safari" appear only inside `#privacy`'s Listen card; MS-5.1 every percentage on the page is one of `getResults()`'s values and the two links are in `#results`; MS-5.4 the simulated-typist sentence; MS-6.1 hero has `data-theme="night"`; MS-6.2 demo shows "I need water" and three `match` chips before any interaction; MS-7.2 every `.site-pad`, `.site-frames` and drawing root is `aria-hidden` (frame 3 of the proof excepted) and contains no focusable element; MS-8.4 no `data-reveal` on the hero, the closing section, the footer, or any ancestor of a logo `img`; MS-11.3 only `KeypadDemo` and `SiteMotion` are client components (`'use client'` grep over `components/site/`), AND `app/page.tsx` imports nothing outside `components/site/`, `components/Footer.tsx`, `components/Icon.tsx`, `components/ProofChip.tsx` and `lib/rankingProvider.ts`, apart from type-only imports from `next` (`import type { Metadata } from 'next'`) (its import specifiers, read as text); MS-13.3 logo images have `alt=""` |
| `site-data.test.ts` (new) | MS-5.1 `getResults()` matches `RESULTS.json` B0/B1 formatted; MS-5.2 a reader returning `null` or invalid metrics gives `null`; MS-5.3 model runs, with a fixture that copies the real shape (`runs` an object keyed `"<model>:<mode>"`, each with `subset.items` and a `configs` array): letter-mode B4 `ok` only, initials runs ignored, unknown models skipped, `runs` as an array or `null` gives `null`, runs from two providers (one MiniMax and one Claude model) give `null` and one warning, no file gives `null`, `modelRunsLine` for 1 and 2 models and for two sizes, and the line never contains a model name; one test reads the real `packages/eval/RESULTS.llm.json` and expects `modelRuns` to be `{ sizes: [200], count: 2 }`; MS-6.2 every finished word of every demo step encodes to its code (`encodeWord`), and the finished words are "i need water"; MS-7.4 `getHowData()` sentences each encode to `44`; MS-7.6 `getProofExample()` has a dropped word whose code differs at `diffAt` and the matches equal the keys |
| `site-motion.test.tsx` (new) | MS-8.1 `SITE_MOTION_BOOT` evaluated with `matchMedia` mocked: sets `pending` for no-preference, nothing for reduce, nothing when `matchMedia` is missing; MS-8.4 `SiteMotion` marks in-view and above-view blocks `instant` before setting `on`, a mocked observer entry sets `revealed="1"` once, and a `focusin` inside an unrevealed block marks it `instant` and unobserves it; MS-8.7 with reduce no attribute and every block `instant`; MS-8.8 a `change` to reduce removes the attribute; MS-6.9 (fake timers) with no-preference `data-site-arrived` is absent until `ARRIVAL_MS` after mount and set after it, with reduce at mount it is set at once, a `change` to reduce sets it at once, and after a `change` from reduce back to no-preference `data-site-motion` is `on` again while `data-site-arrived` stays set; `ARRIVAL_FALLBACK_MS` equals `motion-delay-arrival` plus `motion-fade-slow` from `tokens.json`; `msToken` parses `"520ms"`, `"1200ms"`, rejects `""` and `"fast"`; `autoplayDecision` truth table (MS-6.3) |
| `keypad-demo.test.tsx` (new) | fake timers, mocked `matchMedia`, `IntersectionObserver`, `speechSynthesis`: MS-6.2 finished frame first; MS-6.3 autoplay after 1,200 ms at 60% in view, once, not after Play or Stop was pressed, not when hidden; MS-6.4 "Stop" while playing, Stop and ratio < 0.1 and `visibilitychange` and a reduce `change` each return to the finished frame; MS-6.5 at most one `.is-pressed` key, never `is-lit`; MS-6.6 announce after a person's play only; MS-6.7 Hear it disabled while playing, calls `speak` with `lang: 'en'` synchronously in the click, hidden with no speech engine; MS-6.8 reduce: no autoplay, Play still steps, and the observer still stops a play that falls under 10% in view; MS-6.9 key 9 keeps `site-key--ninth` through a full play (checked at every step) and `.site-demo` has `is-playing` only while playing; MS-6.3 with no `IntersectionObserver` there is no autoplay and Play works; fallbacks equal the token values |
| `site-css.test.ts` (new) | reads `components/site/site.css` and `styles/globals.css` as text: MS-8.1 after removing every `@media (prefers-reduced-motion: no-preference) { … }` block (balanced braces), no `animation`, `transition` or `animation-timeline` declaration is left except `none`; in `site.css` every animation selector starts with `[data-site-motion`, and in `globals.css` the only animation rules allowed are the A6 view-transition rules inside the no-preference block and the existing reduce guard (R4); MS-13.2 (R2) `site.css` has no `order:` declaration; MS-8.2 no `\d+ms` or `\d+s` duration and no `cubic-bezier(` outside `var(--motion-…)`, and in every `animation`, `animation-timing-function`, `transition` and `transition-timing-function` value, after removing every `var(…)`, no `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `step-start`, `step-end` or `steps(` (whole words); MS-8.3 no `infinite`, no `alternate`, no `animation-iteration-count` other than 1; MS-8.5 scroll timelines only inside `@supports (animation-timeline: view())`, no `scroll-snap`, no `scroll-behavior: smooth`; MS-8.6 `globals.css` has `@view-transition { navigation: auto; }` only inside a no-preference block; MS-8.10 every `@keyframes` body sets only `opacity` and `transform`; MS-7.3 and MS-9.1 no match for `/background(-color)?:[^;]*var\(--ember/` in `site.css` (covers `--ember`, `--ember-deep` and `--ember-soft`); MS-9.2 no hex, `rgb(` or `hsl(` colour literals in `site.css`; MS-5.5 no selector containing `.site-stats dd` (or `.site-stat`) has an `animation` or `transition`, and no `data-reveal` selector names them; MS-6.9 A1 and A2 use `var(--motion-fade-slow)` and A2 uses `var(--motion-delay-arrival)`, A1's selector starts with `[data-site-motion]:not([data-site-arrived]) .site-top::before` and A2's with `[data-site-motion]:not([data-site-arrived]) .site-top`; MS-7.2 `.site-key` sets `cursor: default` and `.site-key:active` sets `box-shadow: none`; MS-7.5 the rule `.site-frames > :not(:last-child) { opacity: 0 }` exists outside any `@media` or `@supports` block; MS-8.4 the three reveal rules of design A4, including the `:focus-within` one; MS-10.1 queries `max-width: 599px` and `min-width: 1024px` exist; MS-3.3 and MS-10.7 the `(orientation: landscape) and (max-height: 500px)` rule hides `.site-bar nav`; MS-10.5 and MS-10.8 `site.css` sets no `--nl-key` at all (the drawing sizes live only in `KeypadPicture.tsx`'s constants, checked in `site.test.tsx`), and has no `.site-demo__pad` rule |
| `routes.test.ts` (new) | MS-1.1 `app/page.tsx` exports `dynamic === 'force-static'`; MS-1.2 `Page().type === CommunicationScreen` for `app/app/page.tsx`'s default export (a shallow element check: `Page()` takes no props, and the screen's behaviour is covered by its own tests and the e2e scripts through `openApp('/app')`); MS-1.7 `test/e2e/lib.mjs` source has `path = '/app'` in `openApp`, `axe.mjs` has no target with `path: '/'` and `app: true`, `.github/workflows/ci.yml` probes `$BASE_URL/app`, and `.kiro/agents/a11y-auditor.json` and `.kiro/workflows/ship-feature.workflow.json` contain `localhost:3000/app` as the audit URL; MS-3.5 the default export of `app/robots.ts` returns `rules` with `userAgent: '*'` and `allow: '/'`; MS-10.6 `site.css` uses `env(safe-area-inset-left)` and `env(safe-area-inset-right)`; MS-1.3 `next.config.mjs` text has the permanent `/welcome` to `/` redirect and `app/welcome/page.tsx` does not exist; MS-1.4 `/about` hrefs (`/app`, `/app`, `/`); MS-1.5 `MenuSheet.tsx` "How Ninth Life works" `href="/"`; MS-2.1 manifest JSON; MS-2.2 precache entries `/`, `/app`, `/about` and no `/welcome`; MS-2.3 `sw.ts` fallback `/app`; MS-11.3 `app/layout.tsx` does not import `app.css`, `app/page.tsx` does not, `app/app/page.tsx` and `app/about/page.tsx` do |
| `footer.test.tsx` (edited) | MS-1.5 `['How Ninth Life works', '/']`, `['Back to the keypad', '/app']` |
| `tokens.test.ts` (extended) | MS-8.2 every motion token is emitted on `:root` with its value |
| `lighthouse-lib.test.ts` (new) | MS-11.4 `isDevServerHtml` is true for `test/fixtures/lighthouse/dev.html` (a snippet saved from the running Next 15.1.12 dev server: its `<script src="/_next/static/chunks/webpack.js?v=…">` and `main-app.js` tags) and false for `prod.html` (the same tags with hashed names, `webpack-0f1e2d3c4b5a6978.js`); `parseArgs` defaults (`http://localhost:3202/`, 3 runs, `both`), rejects `--runs 0`, `--runs 10`, `--url ftp://x`, `--preset tablet` and unknown flags; `median` of 3 values; MS-11.2 `pageBudgets` counts `page` items by type, puts `worker` items on their own line, counts an item with no `sessionTargetType` as page, flags another origin, and does not flag a `data:` or a `blob:` item (both in the fixture); MS-11.1 `checkTargets({ performance: 94, accessibility: 100, 'best-practices': 100, seo: 100 })` fails on Performance, `checkTargets` with Performance 95 and any other category at 99 fails on that category, and 95/100/100/100 passes; MS-11.5 the source text of `scripts/lighthouse.mjs` and `scripts/lighthouse-lib.mjs` contains neither `next build` nor `pnpm build` nor `"build"` as a spawned argument (`/next\s+build|pnpm\s+(-F\s+\S+\s+)?build|['"]build['"]/`) |

**Copy check (MS-4.1).** The test reads `.kiro/specs/marketing-site/content.md`, takes sections `## 0.` to
`## 12.`, and collects every `**bold**` string that contains no `{`, and, in §9, the answer after each
`- **Question** Answer` line (R1). For any collected string that contains `{`, it splits on `/\{[^}]+\}/` and
requires every literal fragment of 8 or more characters (trimmed) to appear in the rendered text. It removes the
strings that are not in the first render by design: "Play the example again", "Stop", "Hear it" (no speech engine
in jsdom) and "The eval results are not available in this build." (results exist in the repo, so the null-results
line is skipped); the §7 model line is checked only when `getResults().modelRuns` is not null. Every remaining string must appear in
the rendered page's text, where the text is `document.body.textContent` plus every `aria-label` value, with
runs of whitespace collapsed to one space. The comparison is exact otherwise, so the components use the same
straight quotes and apostrophes as `content.md`. The copy and the test therefore cannot drift.

**Banned-claims check (MS-4.2).** From the rendered text (as above) remove: every occurrence of
`NOT_A_MEDICAL_DEVICE`, the question "Is it a medical device?", and the §8 sentence "It is not a replacement
for an AAC device, a speech-language assessment or professional advice." Then assert no match for:

```js
/\b(treat(s|ment)?|therap(y|ies|eutic)|rehabilitat\w*|recover\w*|restor\w* speech|clinically|evidence-based|approved|certified|medical device|replaces?|understands you|reads your mind|ALS|aphasia|autism|stroke|cerebral palsy|dementia)\b/i
```

None of these is a trademark word, so the test needs no `tm-lint-allow`. "keystroke" does not match `stroke`,
because there is no word boundary inside it.

E2E (plain Node + Playwright, from `packages/web`, against the dev server during implementation and against
`next start` in CI and in the final step):

- `test/e2e/site.mjs` (new; also added to CI's e2e job). Sizes `[label, width, height, screenW, screenH, touch]`:
  phone portrait 320x568, 360x668, 375x495, 390x699, 412x783; phone sideways 874x330, 915x360; tablet 744x1047,
  1133x658, 820x1094, 1180x734; desktop 1280x900, 1440x1000, 1920x1080 (neutral labels, no device names). Size
  passes build their contexts like `responsive.mjs` (R7): `browser.newContext({ viewport, screen,
  deviceScaleFactor: 2, hasTouch: touch, isMobile: touch && engine === 'chromium', reducedMotion, serviceWorkers })`
  plus the same `nl-theme` init script as `newContext`; the other runs use `newContext`. Per
  size, reduced motion, worker blocked: MS-10.2 no sideways scroll; MS-10.3 no `.rotate` and the page scrolls;
  MS-10.7 at scroll 0 the bounding boxes of the `h1` and the header CTA lie fully inside the viewport, and the
  hero CTA's too on portrait heights of 640 or more; the script prints the `h1`'s and the hero CTA's bottom
  edges at 360x668 and 874x330 so they can be compared with design §1, prints the bar's (`.site-bar`) height at
  320x568 and 360x668, and asserts it is at most 80px at 360x668 (MS-10.7, design §0); MS-10.8, MS-10.2 and
  MS-10.5 an XL pass at 320x568 and 1280x900 with `localStorage['nl-keysize'] = 'xl'` set by an init script
  (`context.addInitScript`, before the theme boot script reads it): `<html>` has `data-keysize="xl"`, nothing
  scrolls sideways, and every `.site-key` is between 64 and 84px wide (also checked in the normal passes);
  MS-10.4 sizes (width as well as height, R3) of buttons, `.nl-btn`, `.site-brand`, nav and footer links,
  `.site-links a` and `summary`, and a gap of 8px or more between every pair of targets inside one link group
  (bar nav, footer nav, `.site-links`);
  MS-10.5 computed font sizes of every text node's parent: outside `[aria-hidden="true"]` subtrees at least
  16px (14px allowed only in the footer's licence line and statement), inside them at least 14px; MS-9.1
  scrolling by half a viewport at a time, at most one visible element whose computed background colour is
  ember; MS-8.7 at the end, move the mouse to a blank spot (`page.mouse.move(1, 1)`, the Night sky beside the
  bar), wait 200 ms so any 120 ms design-system hover transition has ended (MS-8.1 exemption), then every
  `[data-reveal]` has opacity 1 and `document.getAnimations()` is empty. Motion run (1280x900 and 390x844,
  `reducedMotion: 'no-preference'`): MS-8.1 `data-site-motion` present; MS-6.3 scroll `.site-demo` into view
  with `scrollIntoView({ block: 'center' })` (at 1280x900 also once without scrolling, where the demo is already
  in view), then the button reads "Stop" within 1,200 + 1,300 ms and "Play the example again" within 10 s, and
  not "Stop" again after scrolling away and back; the step is skipped, with a printed note, at any size where
  the demo's height is more than the viewport height divided by 0.6 (it can never be 60% in view there, see
  `KeypadDemo` changes); MS-6.4 on a fresh load, Stop during the autoplay shows "I need water"; MS-8.4 a
  below-the-fold card has opacity under 1 before it is scrolled to and 1 a second after; MS-8.4 on another fresh
  load, Tab from the top into the first link inside a below-the-fold `[data-reveal]` block (the "Open an issue
  on GitHub" link in the access note) before scrolling: once it has focus, that block has opacity 1 and
  `data-revealed="instant"`, and after a further second it still has opacity 1 and no running animation;
  MS-8.9 at 1280x900 with motion on and no interaction: wait until the autoplay has finished (the button reads
  "Play the example again", within 12 s of load; the button read "Stop" for the whole play), then no
  time-based animation is running: `document.getAnimations().filter(a => a.timeline === document.timeline)`
  holds none with `playState === 'running'`. Scroll-driven animations (A5) are excluded because they report
  `running` while attached to their timeline but move only when the visitor scrolls; MS-8.5 (Chromium) the proof drawing's frame 1 is visible at the start of its
  pass and frame 3 at the end; MS-8.10 every running animation's keyframes set only opacity and transform;
  MS-8.8 `page.emulateMedia({ reducedMotion: 'reduce' })` removes the attribute and empties `getAnimations()`;
  MS-6.10 and MS-11.2 (Chromium) layout-shift entries sum under 0.02 with motion on and off, and the last
  `largest-contentful-paint` entry's element is not an `IMG`. No-JS run (`javaScriptEnabled: false`): MS-8.7 no
  attribute, all blocks visible, the demo shows "I need water". Privacy runs: (1) worker blocked (`serviceWorkers: 'block'`, the
  `newContext` default), `page.on('request')`: MS-2.5 no `/data/` request from the page; MS-12.1 no cookies in
  the context and `document.cookie === ''`, and `localStorage`/`sessionStorage` keys unchanged from what the
  context's init script set. (2) Worker allowed (`newContext(browser, { serviceWorkers: 'allow' })`),
  `context.on('request')`, which in Chromium also reports the worker's requests: MS-12.2 and MS-12.3 every
  request URL, page or worker, has the page's origin while loading, waiting 5 s for the precache, scrolling to
  the end, autoplaying and opening every question (so no analytics, embed, font, icon or script comes from
  another origin); MS-12.3 after load and again after the 5 s wait, no element matches `[role="dialog"],
  [role="alertdialog"], dialog[open]` (no consent banner). Routes: MS-1.3 `fetch('/welcome', { redirect: 'manual' })` is 308 to `/`; MS-1.2 `/app`
  through `openApp`. Keyboard: MS-3.2 and MS-13.2 the first Tab focuses "Skip to content" and Enter moves focus to
  `main`; Tab order over the bar matches the visual order at 1280x900 **and** 820x1094 (R2: after the skip link,
  the brand, the 5 nav links, then the header CTA, and the CTA's box is not above the last nav link's box); every focused element shows a 4px outline
  (MS-9.4); Enter on a `summary` opens its question (MS-3.4). `OFFLINE=1` (production only): MS-2.4 with the
  worker allowed (`newContext(browser, { serviceWorkers: 'allow' })`), visit `/` only, wait until the cache holds `/app`, go offline, load `/app` and wait for
  "Offline dictionary ready"; MS-2.6 load `/` offline and find the `h1`. `ENGINE=webkit` runs the layout checks
  (the LCP and layout-shift APIs are Chromium-only and are skipped there with a note).
- `test/e2e/axe.mjs` (edited): targets `landing /`, `app /app` (app), `about /about`, `settings sheet on /app`,
  and `landing / (motion)` with `reducedMotion: 'no-preference'` after scrolling to the end and waiting 1 s
  (MS-13.1). Night and Day, 1280 and 390.
- `test/e2e/lib.mjs` `openApp(page, path = '/app')`; `newContext` gains a `serviceWorkers` option (default
  `'block'`, so every existing caller is unchanged) passed through to `browser.newContext`; `responsive.mjs` both `goto` calls to `/app`;
  `keyboard.mjs`, `switch.mjs`, `spell.mjs` follow `openApp`; `scripts/perf-check.mjs` three `goto` calls to
  `/app` (MS-1.7). CI readiness probe `curl -sf "$BASE_URL/app"`; a new step "Landing page" runs
  `OFFLINE=1 node packages/web/test/e2e/site.mjs`.

Manual: the `a11y-auditor` agent on `/` and `/app` (accessibility steering), writing to `docs/a11y/`; a keyboard
pass by hand at 400% zoom; a look at the page in Day theme.

What stays untestable here: real phones and tablets (simulators and emulation only, an honest limit already
on the page), and real screen readers (manual, out of this task).

## Lighthouse measurement (MS-11, D8, D9)

`scripts/lighthouse.mjs`, plain Node ESM, run from the repo root. Its pure helpers live in
`scripts/lighthouse-lib.mjs` so they can be unit-tested: `parseArgs(argv)`, `isDevServerHtml(html)`,
`median(numbers)`, `pageBudgets(networkRequestItems)`, `checkTargets(medians)` and `renderReport(result)`.
Neither file runs or spells a build command (MS-11.5): the "No server" message points to
`docs/testing/performance.md`, which holds the build steps, and a unit test checks the source text. `packages/web/tsconfig.json`
has `allowJs`, so `packages/web/test/lighthouse-lib.test.ts` imports `../../../scripts/lighthouse-lib.mjs`
directly.

1. Parse arguments (see Inputs). Fetch the URL; refuse a development server with `isDevServerHtml` (see Error
   handling).
2. For each preset (`mobile`: Lighthouse's default config, which is the mobile form factor with simulated
   throttling, Slow 4G and 4x CPU; `desktop`: `lighthouse/core/config/desktop-config.js`) and each run: launch
   Chromium through Playwright (`loadPlaywright()` from `packages/web/test/e2e/lib.mjs`) with
   `{ channel: 'chromium', args: ['--remote-debugging-port=<free port>'] }`, call `lighthouse(url, { port,
   output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] },
   config)`, save `packages/web/test-results/lighthouse/<preset>-<run>.json` (git-ignored), close the browser.
   A new browser per run means a fresh profile, so every run is a first visit and the service worker installs
   as it would for a real visitor.
3. Per preset, the median of each category score; the run with the median Performance score supplies the
   metrics (FCP, LCP, TBT, CLS, Speed Index), `largest-contentful-paint-element` (node type) and the
   `network-requests` audit items. Budgets (MS-11.2) come from `pageBudgets(items)`, not from
   `resource-summary`, because it is not documented whether `resource-summary` includes the service worker's
   requests: items with `sessionTargetType === 'page'` (or no `sessionTargetType`, see Error handling) are
   summed by `resourceType` (`Script`, `Stylesheet`, `Document`, `Font`, `Image`) and in total; items from any
   other target (`worker`) are summed on a separate "Service worker" line with no budget. Every item's origin,
   page or worker, is compared with the URL's origin, except items whose URL starts with `data:` or `blob:`:
   Lighthouse can list them in `network-requests`, but they never leave the device, so they are skipped in the
   origin comparison (their bytes, normally 0 transferred, still count by type).
4. Check MS-11.1 targets (mobile) with the pure `checkTargets(medians)` (Performance 95 or more, every other
   category 100; returns the list of misses) and MS-11.2 budgets; print a Markdown block: Lighthouse version (from the
   report's `lighthouseVersion`), Chromium version, preset, URL, date, `git rev-parse --short HEAD`, the three runs'
   scores, the medians, the metrics, the budgets with pass or fail.
5. With `--write`, replace the block between `<!-- lighthouse:start -->` and `<!-- lighthouse:end -->` in
   `docs/testing/performance.md` under a heading "## Landing page (Lighthouse)" (created with the markers on the
   first write). Exit 1 when a mobile target or budget fails, 0 otherwise.

Root `package.json`: `devDependencies.lighthouse: "13.6.0"` and `scripts.lighthouse: "node scripts/lighthouse.mjs"`.

D5 asked the design phase to confirm by measuring that the worker's precache download does not move the
score. That needs a production build, and a build needs the dev server stopped (`tech.md` rule 1), which this
phase may not do. The measurement therefore moved to task 28. Task 28 reports the page and worker lines
separately; if the mobile Performance target is missed and the worker line is large, the result goes to the
product owner, because registering the worker only on `/app` would change D5.

The run (task 28) is the only time the dev server must stop: the agent asks the person (the workflow pauses),
and only after a yes: stop the dev server, `pnpm -F @ninth/web build`, start `pnpm -F @ninth/web exec next start
-p 3202` in the background, `BASE_URL=http://localhost:3202 OFFLINE=1 node test/e2e/site.mjs` (from
`packages/web`), `node scripts/lighthouse.mjs --write`, stop `next start`, and tell the person to restart `pnpm
dev` (or restart it on their yes). The build overwrites `public/sw.js`, which is git-ignored. Lighthouse is not
added to CI in this change (D9).

## Out of scope (backlog, with the reason)

- ~~An `og:image` social card~~: done in round 3 (MS-3.6), from `SITE_URL` or Vercel's production URL; see
  "Round 3: search, sharing and answer engines" below.
- A size-adjusted fallback font face to remove any font-swap reflow on slow connections: the fonts are preloaded,
  the measured CLS budget (MS-11.2) is the gate, and a fallback face changes `globals.css` for the app too.
- Lighthouse in CI (D9). Real-device checks (honest limit).
- Romanian and Spanish pages (product.md: English first).

## Responses to the first design review

Review: `.agents/tasks/marketing-landing/design-review.md` (2026-11-10, CHANGES_REQUESTED). Every finding is
addressed; none is backlogged or ignored.

| # | Finding | Response |
|---|---|---|
| 1 | MS-10.7 fails at 874x330 and 915x360 | Added the short-landscape rule (§0), amended MS-3.3, defined "visible" in MS-10.7, added worked checks at 874x330 and 915x360 (§1) and a `site-css.test.ts` check. |
| 2 | Autoplay e2e step cannot pass at 390x844 | The step scrolls `.site-demo` into view (`block: 'center'`) first and is skipped, with a note, where the demo can never be 60% in view. |
| 3 | Dev-server detection uses strings the dev server does not send | `isDevServerHtml` matches the unhashed `webpack.js` / `main-app.js` chunks; unit-tested in `lighthouse-lib.test.ts`; task 20 expects exit 2 on `:3000`, task 28 expects no refusal on `:3202`. |
| 4 | Ember regex fails on `--ember-soft` | Option (a): the chosen sentence is `surface-sunken` with a `line-strong` border and a check icon; the regex now covers every ember token. |
| 5 | Ninth-key fade replays after every play | `ninth` is always true; `.site-demo.is-playing` hides the resting ring by `visibility`; A2 scoped to `.site-top`; MS-6.9 says "once per page view"; test added. |
| 6 | Autoplay observer created only if allowed at mount | Rewritten: one observer whenever `IntersectionObserver` exists, driving stop-under-10% for every play and the 1,200 ms timer; `autoplayDecision` is called when the timer fires. |
| 7 | Reveal system names no blocks | Added "Reveals (A4)": the marked list, the never-marked list, `--reveal-i` ownership, the three CSS rules with `:focus-within`, and a `focusin` handler so a focused block never animates later; unit and e2e tests. |
| 8 | Worker requests not separated from page requests | MS-2.5 exempts the precache; MS-11.2 budgets only `sessionTargetType: 'page'` items and reports the worker separately; MS-12.2 includes worker requests; two privacy runs in `site.mjs`; the D5 measurement is recorded as moved to task 28 (here and in ADR-006). |
| 9 | Text-size check flags key drawings | Option (a): MS-10.5 exempts `aria-hidden` drawings from the 16px rule but sets 14px inside them and 64px as the smallest `--nl-key`; Ways to type moved from 56px to 64px, with the width check at 320px. |
| 10 | `runs` is an object | The shape is written out; iterate `Object.values(file.runs)`; fixture in the real shape plus a test on the real file. |
| 11 | Model line names models | Names dropped (D14 wording, "from one provider"); `getResults` enforces one provider through `MODEL_PROFILES` and gives no line otherwise. |
| 12 | Requirement IDs without a test | Added tests for MS-1.1, 1.7, 3.5 (robots), 4.1, 5.5, 6.9, 7.1, 7.4, 7.5, 8.9, 10.1, 10.6 and 11.4 (and 10.5, 3.3). |
| 13 | Banned-claims test undefined | The pattern and the removals are written out ("Banned-claims check"); the question "Is it a medical device?" is also removed, because it contains "medical device". |
| 14 | Hero CTA height vs `nl-btn--xl` | Override `.site-hero .nl-btn--xl { min-height: 64px; }` stated; fold recalculated (634px at 360x668); `site.mjs` prints the edges. |
| 15 | Boot script as text children | `dangerouslySetInnerHTML`, as `THEME_BOOT_SCRIPT`; a test checks the raw script is in the HTML. |
| 16 | MS-12.1 omits key size | MS-12.1 now says "the theme and key size settings and the motion preference". |
| 17 | 120 ms component transitions | Exempted in MS-8.1; the no-JS and reduced runs move the mouse to a blank spot and wait 200 ms before `getAnimations()`. |
| 18 | Brand target size, OFFLINE context | `.site-brand` `min-height: var(--target-min)`; `newContext` gains a `serviceWorkers` option (default `'block'`). |
| 19 | `Page()` takes no props | Shallow check `Page().type === CommunicationScreen`. |
| 20 | "On your device" contradicts itself | Copy changed to "Nothing you say is saved unless you press Save phrase, and then only on this device." |
| 21 | Precision items | Demo lexicon: v1, same `Lexicon` as the shipped v2 (stated); the MS-11.3 import check covers `app/page.tsx`; drawn candidates get `cursor: default`; ADR-006 notes the moved D5 measurement. |

One addition beyond the findings: the MS-8.9 check filters out scroll-driven animations, which report
`running` while attached to a scroll timeline even though they move only when the visitor scrolls.

## Responses to the second design review

Review: `.agents/tasks/marketing-landing/design-review.md` (2026-11-10, second review, CHANGES_REQUESTED, 4 MEDIUM,
10 NIT). Every finding is addressed; none is backlogged or ignored, and the optional tests of finding 4 are taken.

| # | Finding | Response |
|---|---|---|
| 1 | Reveal blocks nested in `proof` and `source` | §3 and §10 split each copy column into an unmarked wrapper, the `div.site-head` and `div.site-proof__more` / `div.site-source__more`; A4 marks those two instead of the columns and states the no-nesting rule; MS-8.4 says it; `site.test.tsx` asserts `[data-reveal] [data-reveal]` matches nothing. |
| 2 | The app's XL key size overrides the drawings | `KeypadPicture` sets `--nl-key` inline on `.nl-keypad` from the exported `KEY_DRAWING_SIZE` and `HERO_KEY_SIZE`; `site.css` sets no `--nl-key` and drops `.site-demo__pad`; new MS-10.8; unit checks on the constants and the inline style; a `site.mjs` XL pass at 320x568 and 1280x900 checks no sideways scroll and 64-84px keys. |
| 3 | Phone header button size unspecified | §0 states the phone rule `.site-bar .nl-btn { padding: 0 var(--space-4); font-size: var(--type-label-size); }`, the bar's flex and gap, one row from about 352px and two rows (144px) below, with the 320x568 fold worked out (298px); `site.mjs` prints the bar height at 320x568 and 360x668 and asserts at most 80px at 360x668. |
| 4 | MS-4.3, MS-9.3, MS-12.3 untested | `site.test.tsx` MS-4.3 (tm-lint spawned on the page files, its word list read from `scripts/tm-lint.mjs` and matched against rendered text, labels and file names, plus device brand names and phone-body class names) and MS-9.3 (legend icons, reject state and strike-through, `.site-digit--diff`); `site.mjs` names MS-12.3 in privacy run (2) and checks for no dialog or banner; `lighthouse-lib.test.ts` MS-11.1 `checkTargets` and MS-11.5 source check. Tasks 13.1, 17 and 20.1 list the IDs. |
| 5 | MS-7.1 counts three logos | Four: the bar favicon, the hero icon, the closing icon and the footer favicon. |
| 6 | MS-7.2 vs proof frame 3 | MS-7.2 names the exception for the proof drawing's last frame. |
| 7 | Bare `linear` easing | A3 and A5 use `var(--motion-ease-linear)`; the MS-8.2 CSS check flags timing keywords in `animation` and `transition` values after removing `var(…)`. |
| 8 | Drawn keys keep pointer and `:active` ring | `.site-key { cursor: default; } .site-key:active { box-shadow: none; }` in "Drawings", with why it wins; a `site-css.test.ts` check. |
| 9 | Arrival fades replay after reduce and back | `SiteMotion` sets `data-site-arrived` (at once when motion is off or turns off, else `ARRIVAL_MS` after `on`); A1 and A2 select `:not([data-site-arrived])`; MS-6.9 amended; `site-motion.test.tsx` and `site-css.test.ts` cases. |
| 10 | MS-11.3 import check rejects `next` | Type-only imports from `next` are allowed. |
| 11 | MS-6.2 wording | MS-6.2 and the invariants table say "the offline decoder on the shipped dictionary (`decodeGhost`, and `Lexicon.completions` for the word being typed)". |
| 12 | `og:title` reads as restoring speech | content.md: "Ninth Life: the old phone keypad, back as a way to talk". |
| 13 | Steering e2e lists miss `site.mjs` | `tech.md` E2E row gains `site`; `accessibility.md` "How to check" gains `site.mjs`. |
| 14 | `data:` and `blob:` in the origin check | Skipped in the origin comparison; a fixture item of each in `lighthouse-lib.test.ts`. |

## Responses to the third design review

Review: `.agents/tasks/marketing-landing/design-review.md` (2026-11-10, third review, CHANGES_REQUESTED, 0 HIGH,
3 MEDIUM, 4 NIT). The resolutions R1-R7 were decided in the implementation plan
(`.agents/tasks/marketing-landing/plan.md`, "Review resolutions") and are written into this design.

| # | Finding | Response |
|---|---|---|
| 1 | MEDIUM: the MS-4.1 copy check skips the FAQ answers and every sentence with a `{value}` (R1) | "Copy check" also collects each §9 answer after `- **Question** Answer`, and for a string with `{`, splits on `/\{[^}]+\}/` and requires every literal fragment of 8 or more characters (trimmed) in the rendered text. The removals stay; the §7 model line is checked only when `getResults().modelRuns` is not null; the null-results line is skipped. |
| 2 | MEDIUM: the tablet bar layout needs a visual reorder, which breaks MS-13.2 (R2) | §0: DOM order brand, nav, CTA, never reordered (no `order`, no grid placement that differs from DOM order, at any width); 720-1023px wraps in DOM order (up to 208px); the 744x1047 fold estimate is about 740px. `site.mjs` checks bar Tab order at 1280x900 and 820x1094; `site-css.test.ts` checks there is no `order:`. Chosen over reordering the DOM because it keeps the desktop layout of §0 unchanged and removes today's `order` rules. |
| 3 | MEDIUM: short links are narrower than 56px, and the footer nav has no row gap (R3) | "Page structure and layout": every standalone link is `inline-flex`, centred, `min-height` and `min-width` `var(--target-min)`; link groups use `gap: var(--space-2) var(--space-6)`. §12 footer on tokens (`border-top: 2px solid var(--line)`, `padding-top: var(--space-12)`, brand image 32px, `caption` lines). `site.mjs` MS-10.4 checks width and height and an 8px or larger gap inside each group. |
| 4 | NIT: the MS-8.1 selector check would fail on `globals.css` (R4) | The `[data-site-motion` selector rule applies to `site.css` only; in `globals.css` the only animation rules allowed are the A6 view-transition rules inside the no-preference block and the existing reduce guard. |
| 5 | NIT: the proof frame 3 label must be 16px (R5) | "Drawings": frame labels use the `label` size (16px), so "Dropped" outside `aria-hidden` passes MS-10.5. |
| 6 | NIT: the tablet hero padding is not given (R6) | §1: tablet (600-1023px) padding block `var(--space-12)` / `var(--space-16)`; desktop `var(--space-16)` / `calc(var(--space-16) + var(--space-12))`, no raw 112px. |
| 7 | NIT: `site.mjs` sizes carry screen and touch, but `newContext` cannot set them (R7) | Test plan: size passes build their contexts like `responsive.mjs` (`viewport`, `screen`, `deviceScaleFactor: 2`, `hasTouch`, `isMobile` on Chromium touch sizes, `reducedMotion`, `serviceWorkers`) plus the same `nl-theme` init script; other runs use `newContext`. |

## Round 3: search, sharing and answer engines (2026-11-12, Claude Code)

Done with Claude Code, not Kiro (findings `seo.md` of the landing review; MS-3.6 to MS-3.9, W5, W6).

- Origin: `lib/site-url.ts` `siteOrigin()` reads `SITE_URL`, then `https://${VERCEL_PROJECT_PRODUCTION_URL}`, else
  null; invalid values give null. `app/layout.tsx` sets `metadataBase` only with an origin. No origin means no
  absolute URL anywhere (Next would otherwise fall back to localhost for social images), no `Sitemap:` line and a
  404 at `/sitemap.xml` (a sitemap's `<loc>` must be absolute). `.kiro/steering/tech.md` records this.
- Metadata: `components/site/seo.ts` `pageMetadata()` gives each page its title, description, Open Graph base
  (`website`, `Ninth Life`, `en_US`; repeated because Next replaces a parent `openGraph` wholesale) and, with an
  origin, its canonical, `og:url` and the social card. Canonical is per page, never in the layout (children
  would inherit it). `SITE_DEFINITION` is the one definition.
- Social card: `public/social-card.png`, 1200x630, about 80 KB, made by `scripts/gen-og.mjs`
  (`pnpm -F @ninth/web og`, Playwright, tokens, self-hosted fonts and the logo) and committed. It is in `public/`
  but left out of the precache (`next.config.mjs` `NOT_PRECACHED`); its URL carries a content hash. Chosen over
  `app/opengraph-image.*`, whose file convention cannot be switched off without an origin (it would emit a
  localhost `og:image`), and over `next/og` (needs TTF/OTF fonts, no CSS variables, WASM in every build).
- JSON-LD: `components/site/structured-data.ts`, rendered by `app/page.tsx` before the footer; `<` escaped.
  FAQPage reads `faqItems()`, exported by `Faq.tsx` and used by its own rendering. No Person (W6), no rating.
- `/llms.txt`: `components/site/llms.ts`; low value (few answer engines fetch it) but one file and it passes
  Lighthouse's `llms-txt` audit.
- `/app`: own title and description, a visually hidden `h1` inside `main`, and the first-paint fix (see
  `docs/testing/performance.md`, "`/app` first paint").
- Tests: `test/seo.test.tsx` (all of the above), `test/site.test.tsx` MS-3.5, `test/lighthouse-lib.test.ts`
  (Agentic Browsing reported with no target).

## Round 3 polish: the final review's fixes (2026-11-13, Claude Code)

Done with Claude Code, not Kiro, after an independent final review of the website. Items R3-P1 to R3-P10 in
tasks.md; the copy is in content.md, the rules in requirements.md (MS-3.9, 4.4, 4.7, 5.3, 6.10, 6.12, 9.1, 10.5, 14.2).

- **The hero keypad never moves (R3-P1, MS-6.10).** Every part of `KeypadDemo` above the keys keeps one size whatever
  is typed. Each shares a grid cell (`.site-sizer`, one `minmax(0, 1fr)` column) with a hidden copy of the finished
  example. In try mode the sentence, the keys and the chips are `.site-demo__line`: one line, `nowrap`, clipped, and
  set right-to-left only so that an overflowing line is start-aligned and shows its end (the inner
  `.site-demo__end` reads left to right, `unicode-bidi: isolate`); a line that fits sits left (the chips centred). A
  clipped line gets a 24px mask fade on its left (`data-clipped`, set after each render). Only the last 3 words get a
  chip (`TRY_CHIPS`). The empty text "Press a key to start." is body size, one line at 320px. The caption sits in
  `.site-demo__under`: at least 3 body lines, or the example caption's height (its hidden copy), and the try-it line
  is clamped to 3 lines (the whole line stays the keypad's description and the live announcement). Measured at 12
  widths from 320 to 1920 in Chromium and WebKit, through key 1, Clear, 4663, #, ##, "He need water", 6 and 8 words
  and punctuation: the keypad, Clear and Play move 0px (`test/e2e/site.mjs` "try it steady", all 14 sizes).
- **Key faces under 80px (R3-P2).** The How screen's rule (letters under the digit at label x1.2, words at label)
  is one shared rule for the How screen, the switch drawing, the Touch drawing's 72px key and, under 360px, the
  hero's try-it keys (about 67px at 320). The switch drawing's tray pads its keys by 12px (8px only on a 320px
  window with a fine pointer, where a classic scrollbar leaves a 225px stage), so the 9px scan ring stays inside it.
- **My words (R3-P3).** The site's running text calls the person's list "My words", the app's feature name: a check
  is "in the dictionary or in My words", a plus "not in the dictionary or My words yet". The Spell drawing keeps the
  app's own strings ("Not in your words yet.", "In my words.").
- **The line after # (R3-P4).** `try-engine.ts` `view()` lists the matches for the keys alone (the same
  `decodeWithPins` with pins and choices taken off) and adds the sentence on show when # moved past them;
  `shownIndex` marks it. `tryLine()` marks it "(shown)" when it is not the first and adds no full stop after a match
  that ends in punctuation.
- **404 (R3-P5).** `app/not-found.tsx` imports site.css and renders `SiteBar` (home "/"), the head (`.site-h2`,
  `.site-lead`) and a `.site-cta` row in one Night page, then `SiteFooter`. Title "Ninth Life: page not found", own
  description; Next keeps the 404 status and `noindex`.
- **Night footer (R3-P6, lead decision extending W2).** `SiteFooter` carries `data-theme="night"` and the Night
  ground, on `/`, `/about` and the 404; its favicon tile now sits on Night as in the bar.
- **The model line (R3-P7, lead decision amending D14).** `getResults().modelRuns` carries the measured provider and
  model ids; `modelRunsLine(m, rankingProvider())` names them ("2 MiniMax models (MiniMax-M3 and
  MiniMax-M3.1-Flash)") and says "The app's model ranking uses Anthropic's Claude API, which has not been measured
  yet." while RESULTS.md has no Anthropic run (or "…, the provider measured here." when it is the same provider).
  Results and `/llms.txt` use the same function. No model-run number.
- **Smaller fixes (R3-P8).** The hero's brand line is hidden from 352 to 599px (the bar shows the brand; under 352px
  it stays as the name alone, the icon is hidden under 600px). Key 1, 0 or # before any letter answers on the line.
  Chips write "I" (the app's `formatSentence` tokens: `chipLabels()` at build time for the example, `TryWord.label`
  from `buildSentence` tokens in try mode). Clear and Play share one row on phones (Play flexes; its hidden labels
  keep its size). The per-source Results line uses plain words; the caveat card spans the stat grid. The footer
  statement is body type. "Free. Works offline. No account." in the close too. "Who made it" carries the year. The
  hero keypad's tray hugs its keys; from 600 to 1023px the demo starts at the copy's left edge. How step 3's stage
  hugs its well on phones (24px above and below).
- **Canonical of / (R3-P9).** With a `metadataBase`, Next 15 writes the canonical and `og:url` of "/" as the bare
  origin (`resolveAbsoluteUrlWithPathname`: pathname "/" becomes `origin`). The layout now sets none and
  `pageMetadata()` writes absolute URLs (canonical, `og:url`, the card image); with no base Next keeps them as
  written, so "/" is `${origin}/`, the sitemap's and the JSON-LD's URL (`test/seo.test.tsx` R3-P9 runs Next's own
  resolver both ways).
- **A row after Access (R3-P10).** A secondary "Open the app" `.site-cta` row ends Access, as Results and Privacy do.

## Round 4: shared language (2026-11-13, Claude Code)

This round was done with Claude Code, not Kiro. The product owner asked for more visuals, motion and
micro-interactions; seven agents redesigned the sections on one language, below (proposal `proposals/language.md`,
decisions `01-decisions.md` §1, both in the round's notes). Requirements: MS-7.1, MS-7.3, MS-8.2, MS-8.11 (round-4
rulings), MS-8.14, MS-8.15. Section designs follow in their own round-4 parts.

### Motion v2
Principles:
1. Motion shows cause and effect, then rests.
2. Motion is calm: small distances, one axis, no scale, spin or slide.
3. One focus at a time.
4. Things people press never move.
5. CSS first, declared in markup (`data-reveal`, `data-play`, role classes). `SiteMotion` stays the only motion
   script, and no section adds an observer or a listener.
6. Reduced motion, or no JavaScript, gives the finished page, still.

| # | Where | Trigger | Timing (tokens) | Motion off |
|---|---|---|---|---|
| A1, A2 arrival | hero only | load | `motion-fade-slow` after `motion-delay-arrival` | shown at once |
| A3 demo | hero keypad | autoplay once; Play | `motion-demo-step`; ring `motion-jump` linear | finished example |
| A4 reveal | heads, cards, figures (never the hero, `#start` or the footer) | the block enters view | `motion-fade`, rise ≤ `motion-reveal-distance`, `motion-stagger` × ≤ 2 | visible |
| A6 page cross-fade | `/`, `/app`, `/about` | navigation | `motion-crossfade` | plain navigation |
| A7 play once | every drawing in a stage | the play line | lead + k × step; parts `motion-state` (≤ `motion-nudge`), rings and marks `motion-jump`; ≤ 4,000 ms; a Results bar grows once over `motion-grow` (PO-1) | the base styles are the finished frame |
| A8 How step sync | retired in round 4, with the sticky How picture (How plays its row once, A7) | | | |
| A9 control feedback | every real control | hover, press, focus | hover layer `motion-jump` linear (opacity, `state-hover`); a link's icon `motion-state` ease-out, ≤ `motion-hint`; focus instant | colours and edges change at once; nothing moves |
| A10 live part entry | try-it chips and their checks; a question's answer | the element appears; `details` opens | chip opacity `motion-jump` linear; answer `site-rise` over `motion-state` | appears at once |

Choreography:
1. **Order.** The head reveals first, then the cards. A drawing plays only once it reaches the play line, which
   sits above the reveal line, so its card has already started to reveal.
2. **Cause before effect.** The ring arrives at t(k). At t(k + 1) it leaves and the effect arrives (a handover).
3. **At most three changes at one instant in view.** A column box drawn across lines counts as one part. Series
   arrive one per step, at most 4 items. One ember ring per drawing and per row at a time.
4. **Distances and direction.** Blocks rise ≤ 16px, parts ≤ 8px, a control's icon ≤ 4px in the direction it
   points. Nothing slides sideways, scales or spins in motion. A turned card is a still frame.
5. **Durations by size.** 120 ms for highlights (rings, marks, hover layers), 200 ms for parts, 600 ms for blocks
   and for a growing bar, 900 ms only for the hero's arrival.
6. **Easing.** Ease-out for anything arriving or fading, linear for highlights. Parts that replace each other share
   one curve and duration, so their opacities sum to 1 (no dip, no double image).
7. **Never moves.** Keys, buttons, chips and the keypad never move (MS-6.10, motor memory, keyguards).
8. **Flashes.** Rings and boxes are thin outlines. No filled area larger than a key changes more than 3 times a
   second (WCAG 2.3.1).

CSS techniques:
- **Used:**
  - transitions and the existing keyframes, on `opacity` and `transform` only, plus Results' `site-grow` (transform
    only);
  - `@starting-style` for A10 (without support, parts simply appear);
  - `:has()`;
  - `@media (hover: hover)` around every hover state, so a tap leaves no sticky hover.
- **Not used:**
  - `will-change` (browsers promote animated opacity and transform themselves);
  - `content-visibility` (it changes the boxes the observers measure and risks layout shift);
  - `transition-behavior: allow-discrete`;
  - scroll timelines;
  - JavaScript animation;
  - named view-transition groups (they animate size and position).

### Control feedback (A9) and live parts (A10), as built in `site.css`
- **The hover layer.** `.site .nl-btn:not(.site-drawn-btn)::after` and `.site .site-key--try::before`:
  - absolute, `inset: 0`, `border-radius: inherit`, `background: currentColor`, `opacity: 0`;
  - on `:hover` with `(hover: hover)`, opacity `var(--state-hover)`, except `:disabled` and `[aria-disabled="true"]`.

  The layer is the control's own text colour, so it works on ember, transparent, sunken and plum fills alike, and
  `site.css` never sets an ember background (MS-9.1). It covers `.site-icon-btn` (r4-hero) as an `.nl-btn`; with a
  4px transparent border, `inset: 0` is the 48px visible circle.
- **Secondary button.** The edge turns `--ink` on hover.
- **Ember link-button.** `.site a.nl-btn--primary:hover` keeps `--on-ember`. Without it, globals.css's `a:hover`
  (0,1,1) turned the hero's and `#start`'s "Open the app" label ink on hover, about 1.6:1 on ember. This was
  round 3's bug, made visible by the hover layer.
- **Links.** Content links and question summaries thicken their underline to `line-width` on hover.
- **Press and focus.** Press is the design system's own (`ember-deep`, the `surface-sunken` fill, the quiet button's
  inner ring, a key's ember ring). Focus is `.nl-btn:focus-visible` and the global ring, unchanged and instant.
- **`.site-go`** (a standalone link that goes somewhere): `inline-flex`, gap `space-2`, 56px tall, then a trailing
  `SiteIcon`:
  - `arrow`, turned by `turn` (`site-icon--up`, `--down` or `--left`);
  - `external` with `.site-go--out`.

  Its `--site-go-hint` points the icon's way; the motion block applies it as a transform on hover and on
  `:focus-visible`, over `motion-state`.
- **A10.**
  - Chips: `@starting-style` opacity 0 and a `motion-jump` transition on
    `.site-demo:is(.is-playing, .is-trying) .site-demo__chips:not(.site-sizer__ghost) .nl-chip` and its `> .nl-icon`.
  - Answers: `.site-faq[open] > :not(summary)` runs `site-rise` over `motion-state`, fill `backwards`.
  - All of it sits under `[data-site-motion="on"]`.

### Illustration language
- **Stage.** Every drawing sits in a `.site-stage`: `surface-sunken` in a card, `surface` on a surface band, radius
  `radius-card` − `space-2`, no edge, no shadow. The hero keypad is the exception: it is a real control.
- **Depth from fills, never shadows.** Band, card (2px `line` edge), stage, piece (`--site-piece`, the card's fill),
  keypad panel (`--panel` with `--lift`, the one shadow), key.
  - A key always sits on its panel. A key drawn outside a keypad sits on `.site-key-panel` (padding `space-2`,
    radius `radius-key` + `space-2`, `--panel`, `--lift`, keys bottom-aligned, several keys allowed): in Night the
    stage is plum, the key's own fill.
  - No glows.
- **Edges.** 2px everywhere. A drawn app component keeps its own edge; containers invented for a drawing have none.
  Dashed means a boundary or "new"; dotted means typing. Rings are `ring-width`; the scan ring is `scan-width` plus
  a plum ring.
- **Scale.** The app's own sizes:
  - keys 64px, with these exceptions: proof keys 52px (five in a row), the Touch drawing at the true 72 and 128px,
    and the hero keypad's 64px-tall real keys;
  - real ProofChips;
  - the sentence in `candidate`;
  - digits in mono `label`, ink-muted;
  - drawn buttons are secondary `nl-btn`s;
  - UI text in `label`.

  Nothing in a drawing is under 16px. Widths shrink; text never does (MS-7.7).
- **Ember means a press.** The pressed ring, or the scan highlight; one ring per drawing and per row at a time. The
  effect is drawn in ink.
  - Press ring v2: on a drawn button or a drawn computer key, `.site-press-ring` covers the 2px edge
    (`inset: −line-width`) and carries a `line-width` plum line inside the ember ring, so ember always sits on plum,
    as on the lit key, the Day primary and the scan ring.
  - Keys keep the plain ring (`.site-key-ring`).
- **Icons in drawings and titles.** Always beside their word, 24px (22px beside a word inside `nl-btn` and `nl-chip`;
  24px in an icon-only `.site-icon-btn`, where the icon is the whole face), in the
  colour of their row (titles `--ink-muted`), never ember. Proof colours only through ProofChip.
- **Charts** (lead ruling, then PO-1):
  - a bar is a drawn piece, 16px thick with 4px corners, on a `--site-piece` track;
  - our value is `--ink`, a comparison `--line-strong`;
  - the label and the number are real text beside the bar;
  - never ember, never colour alone;
  - the bar grows once from its start edge (`transform: scaleX`, `motion-grow`, the last change ≤ 1,600 ms after the
    trigger), and its finished full length is the base style.
- **Captions.**
  - In a card: feature label (`label`, ink-muted), then the `h3`, then one line (`body`, ink-muted).
  - Under drawn things: `label`, names in ink 600, values in mono ink-muted.
  - Never `caption`.
- **Facts.** `.site-tile` is a 48px tile, `radius-chip`, with a 24px ink icon. Its fill is `surface-sunken` by
  default, `surface` inside a filled card on a surface band (a note card has no fill, so its tiles stay sunken), and
  `--site-piece` in a stage. `.site-fact` is a tile and one
  short line.
- **Night and Day.** Same structure, tokens swap. The hero, `#start` and the footer are Night always.

### Icons (`components/site/icons.tsx`)
- **API.** `SiteIcon({ d, label?, className?, turn? })` plus one named export of path data per icon.
  - It renders `svg.nl-icon` (24px, 2.5px round stroke, `currentColor`; components.css).
  - Without `label` it is `aria-hidden` and not focusable; with `label` it is `role="img"` with that name.
  - `turn` (`up`, `down` or `left`) rotates the drawing inside the SVG (a still transform) and adds
    `site-icon--{turn}`, so `.site-go` points its hint the same way.
  - Circles are two arcs, so one renderer draws every icon.
- **Names.** play, replay, backspace, arrow, external, download, minus, info, report, clock, key, keypad, keyboard,
  view, screens, sun, moon, toggle, lock, cloud, globe, code, chart.
- **App icons** stay in `components/Icon.tsx` and are used from there, never copied.
- **Why a separate module.** `Icon.tsx`'s `PATHS` object cannot be tree-shaken, so adding 23 icons there would put
  about 0.8 KB gzip into the app's chunk and the site's client chunk. Named exports cost a client chunk only what it
  imports, and server components cost markup only.
- **Never drawn:** people or hands, devices with features (MS-4.3), third-party marks, sparkles, shields or badges,
  hearts.

### Shared primitives (`site.css` header list)
- **Built by r4-language:** the hover layer, `.site-go` (+ `--out`), `.site-tile`, `.site-fact`, `.site-key-panel`,
  the press ring v2, the A9 and A10 rules.
- **Built by the section owners, in the same block, reviewed against this language:** `.site-icon-btn` and
  `.site-tip` (r4-hero), `.site-step` (r4-how, reused by r4-proof) and `.site-caveat` (r4-close).
- **Not built:** `.site-card--link`, because no section makes a whole card a link.
- **Removed:** `.site-split`, the round-1 two-column wrap, unused once Source dissolved (rule and header line).

Tests: `test/site-icons.test.ts` (new), `test/site-css.test.ts` (A9, A10, the primitives, the press ring v2, the
keyframe list with Results' `site-grow`), `test/tokens.test.ts`, and the language's block in `test/e2e/site.mjs`
(hover and press never move a key or a button; the hint is at most 4px; with reduced motion nothing transforms on
hover).

## Round 4: the hero demo (2026-11-13, Claude Code)

Done with Claude Code, not Kiro. The product owner: "the right part of the hero section, too crowded, the buttons are
too big, use some icons, too big in height, find a way to remove the text from there and improve the component
visually and practically". Decisions §2 Hero (mock D approved; keep the one invitation line; option T). Requirements
MS-6.2, MS-6.2a, MS-6.3, MS-6.4, MS-6.7, MS-6.10, MS-6.12, MS-6.13, MS-6.15, MS-6.16, MS-10.8. Copy: `content.md` §1.
This section wins over "Round 3: hero, bar and the try-it keypad" and "`KeypadDemo` changes".

### Structure

```
div.site-demo[.is-playing|.is-trying][data-tips-off]       one 284px column (--site-demo-w: three 84px keys + gaps)
  div.site-demo__card                                       surface-sunken, radius-card, 12px in
    div.site-demo__said                                     at least 64px: two chip lines, or three label lines
      example   ul.site-demo__chips[aria-label="Proof check"] > li.site-sizer.site-demo__slot (ghost + live ProofChip)
      try       div.site-demo__line[data-end] > ul.site-demo__chips.site-demo__end > li > ProofChip (the last 3 words)
      no word   div.site-demo__hint > p (start, key 1, key 0 or #) [+ p.site-demo__kbd "Your keyboard works too."]
  p.site-demo__status                                       one line: the invitation, "Next: <b>Home</b>, <b>Gone</b>",
                                                            or the decoder's state
  div[role=group].nl-keypad.site-pad.site-demo__keypad      aria-describedby="site-demo-desc"; --nl-key: 64px inline
  div.site-demo__tools                                      three cells, one under each key column
    button.nl-btn.site-icon-btn.site-demo__play             replay (stop while playing) + span.site-tip--start.site-demo__label
    button.nl-btn.site-icon-btn.site-icon-btn--filled.site-demo__hear   speaker + span.site-tip (only with speech)
    button.nl-btn.site-icon-btn.site-demo__clear            x + span.site-tip--end
  p#site-demo-desc.nl-sr-only                               the example caption's words + "Your keyboard works too."
  p.nl-sr-only[role=status][aria-live=polite]               the result line (R3-P4) and a person's play
```

### The parts

- **Chips.** `ProofChip` is unchanged; hero CSS lays it out as a two-column grid: icon and word (`body-lg`, 20/28) on the
  first line, the code (mono `label`, digit tracking) under the word, so the sentence and its digits show once and
  "need" over "6333" shows one press per letter. The states keep icon, edge and text treatment (MS-9.3). The example's
  slots keep R3-P1's ghost chips (MS-6.10). In try mode `.site-demo__line > .site-demo__chips` is `inline-flex`, one
  row that shows its end.
- **Status line.** `TRY_COPY.invite` in the example, rendered after hydration (`live`), so the server HTML and a page
  without JavaScript show nothing there; while trying, `tryStatus()`: `failedShort`, `loading`, `noneShort`, or
  `view.next` shown as "Next: …".
- **Next readings.** `try-engine.ts` `TryView.next` (`nextReadings`): the lexicon's `readings()` of the last code in the
  order `press('#')` steps through them, starting after the word on show, at most `TRY_NEXT` (2), written as the chips
  write words (`formatSentence` of the sentence with that reading). Verified on the shipped dictionary: 4663 gives
  Good, then Home, Gone, Hood. Only the lazy engine chunk grows.
- **Keys.** `--nl-key: 64px` inline (`KEY_DRAWING_SIZE`); the width comes from the row: `flex: 1 1 0` between 64px and
  `--site-key-w` (`key-min` + `space-3` = 84px), so 84px wide, 80px in a 320px window with a classic scrollbar. Panel:
  8px padding, radius `radius-key` + `space-2`. The letters sit under the digit at every width (the R3-P2 face). Key 9's
  resting ring hides while playing and while trying, so at most one ember ring shows. The hover layer is A9's.
- **Toolbar.** A grid of three cells, `grid-column` per button, so Play and Clear keep their cells when there is no
  speech. Tab order = DOM order: keypad, Play, Hear it, Clear. Clear is `aria-disabled` while there is nothing to
  clear (try mode, no key since the last Clear).
- **`.site-icon-btn` + `.site-tip`** (a shared primitive, in the site.css header list; look reviewed by r4-language).
  A 56px target drawn as a 48px circle (a 4px transparent border, `background-clip: padding-box`); 2px `line-strong`
  ring; press: `surface-sunken` fill; `--filled`: `key` fill, `on-key` icon, press: an inner 3px `line-strong` ring;
  `aria-disabled`: `line` ring, `ink-muted` icon; the design system's focus ring; the A9 hover layer on `::after`. The
  name is the button's own text in `span.site-tip` (`ink` fill, `ground` text, `label` type) under the button, shown on
  `(hover: hover)` `:hover` and on `:focus-visible`; `--start` / `--end` hang it from the row's ends so it never leaves
  the column; `[data-tips-off]` on an ancestor hides it (KeypadDemo sets it on Escape and clears it when focus moves or
  the pointer leaves the toolbar); in forced colours it gets a 2px `CanvasText` edge.
- **Keyboard.** `onKeyDown` on the demo root: Escape hides the names; digits, `*`, `#` and Backspace go through the
  app's `mapKey` to `pressKey`; arrows move only from a key. A document listener covers Safari, which does not focus a
  clicked button: after a pointer press inside the demo (a capture `pointerdown` listener), keys typed while nothing
  has focus and the demo is on screen press the keys too; a pointer press elsewhere ends it. Focus is never moved by
  script (a mouse click shows no focus ring), and a key typed into another control is never taken.
- **Autoplay.** Two observers: the demo (thresholds 0, 0.1, 0.6, as before) and the toolbar (0 and `TOOLS_IN_VIEW`,
  0.99). `arm()` runs the `motion-autoplay-delay` timer only while the demo is at least 60% in view and the toolbar is
  wholly on screen; the toolbar leaving during an automatic play stops it on the finished frame (no announcement).
  `autoplayDecision` (motion.ts) is unchanged; KeypadDemo adds the toolbar condition.
- **Option T (tablets).** From 720 to 1023px wide and 600px tall: the hero is a row, `gap: space-6`, the demo fixed at
  `--site-demo-w`; the copy column is 364px or wider (388px at 744), so the `h1` wraps only between words, and the whole
  hero is on a portrait tablet's first screen. Phones held sideways keep the stacked hero (MS-10.7).

### Motion (within MS-8; no change needed)

A1 and A2 as before; A3 (the pressed ring, `motion-jump` linear) as before; the autoplay as MS-6.3 with the toolbar
condition; A10 (r4-language's rule, opacity over `motion-jump`) on the entering chips and their check icon:
`.site-demo:is(.is-playing, .is-trying) .site-demo__chips:not(.site-sizer__ghost) .nl-chip`; the names fade in over
`motion-jump` with `motion-ease-out`, after `motion-delay-arrival` on hover and at once on keyboard focus, and hide at
once. With reduced motion every change is instant; nothing moves a key or a button.

### Measured (Chromium, Night, reduced motion)

| | Round 3 | Round 4 |
|---|---|---|
| Demo height, 1440 / 390 / 320 | 758 / 814 / 833 | 476 at every width |
| Hero height at 1440x900 | 934 | 652 |
| Keypad top at 390x844 | 735 (row 1 cut) | 595 (rows 1-3 on the first screen) |
| Demo top at 768x1024 | 583 | 128 (option T) |
| Visible prose in the example | caption (2 lines) + check line | one status line |

Bytes (gzip): the demo's server markup 1,202 → 1,081 B; its client bundle (minified, React external) 7,027 → 7,418 B
(+0.39 KB, mostly the shared `SiteIcon` renderer; `KeypadDemo` itself is a little smaller); its CSS (minified) about
+0.5 KB, most of it the shared `.site-icon-btn`/`.site-tip` primitive; MS-11.6 passes.

Tests: `keypad-demo.test.tsx` (43: the finished frame, autoplay with the toolbar, Stop, the toolbar's names, Escape,
Clear unavailable, keys typed from the toolbar and with nothing focused, the status line and `tryStatus`, `next`);
`site.test.tsx` (MS-6.2 order and names; MS-4.1's first-render set); `e2e/site.mjs` (the first phone screen, the result
line in the live region, "Next:", the Tab order, the 14-size steady check on the keypad, the toolbar, the card's
height and one status line, no-JavaScript status line); `e2e/axe.mjs` (the try-it wait reads the live region).

## Round 4: How it works (2026-11-13, Claude Code)

Done with Claude Code, not Kiro. The product owner asked for "a total revamp, both in the way it looks, feels and
works"; the approved concept is the story row (proposal `proposals/how.md`, decisions §2). Requirements: MS-7.4, MS-7.7,
MS-7.8, MS-8.11 (the sequenced row), MS-8.12 (removed), MS-8.13 and MS-10.9. Files: `sections/How.tsx`,
`pictures/HowScenes.tsx` (replaces `pictures/HowScreen.tsx`), `KeypadPicture.tsx` (a `rows` prop for the crop; the
`KeyRing.s` field is gone), `site-data.ts` (`getHowData`), `SiteMotion.tsx` and `motion.ts` (the step sync, `activeStep`
and `howStart` removed), the How blocks of `site.css` and the shared `.site-step`.

**Structure.** `section#how.site-band` > `.site-wrap.site-stack`: the head (`h2`, lead "Three steps. Nothing is said
until you press Speak."), `ol.site-how__steps[role=list]` with three `li.site-how__step`, then one `p.site-caveat`
(the info icon and the spelling and language limits, r4-close's approved sentences). Each `li` carries the scene's
play class and `data-play-scope`, and holds `div.site-stage.site-how__stage[aria-hidden]` > the scene
(`div.site-drawing.site-how__scene[data-play]`, stretched to fill its stage), then `div.site-step` (the number, an `h3`
title and one line). No full keypad and no typing well (the hero shows both); no letters over digits (the proof does).

| Step | Scene (the app's own parts) | Play class | Changes (role, step) |
|---|---|---|---|
| 1 Press one key per letter | keypad rows 1 and 2 (keys 1 to 6, 64px, on the panel), the digits typed so far | `quick` (400) | rings on 4 k0-u1, 6 k1-u2, 6 again k2-u3 `late`, 3 k3-u4; each digit in one step after its press, k1-k4 |
| 2 Pick what you meant | the status pill "Offline dictionary ready", the top 3 for 4663 (Good, Home, Gone) as candidate rows | `sweep` (240) | rows rise k1, k2, k3; the marker on row 1 k2-u4; the check on Home k4 |
| 3 Hear it out loud | the sentence card ("Home", 4663), drawn Speak and Show (secondary) | `sweep` (240) | "Home" and 4663 in k0; the ring on Speak k1-u2; Speak becomes Speaking at k2 |

**Layout.** One column under 1024px: each stage hugs its scene (`space-3` above and below), the step under it, a
static chevron (`--line-strong`, `ring-width`) in the `space-12` gap. From 600px to 1023px each step puts its 320px
stage beside its text. From 1024px one row of three (`repeat(3, minmax(0, 1fr))`), every stage `--stage-m` (a
minimum), the chevrons pointing right in the gaps, level with the stages' middles. DOM order is the reading order in
every layout (no `order`). Measured: 844px at 1440 × 900 (was 1,448 with motion), 1,422px at 390 × 844 (was 1,916).

**Motion.** Each scene is an A7 drawing. From 1024px the three stages are equal, so they reach the play line together,
and `--play-after` makes them play in story order (MS-8.11's sequenced row): step 2 `calc(4 * var(--motion-frame-quick))`,
step 3 that plus `5 * var(--motion-sweep)`. Leads 300, 1,900 and 3,100 ms; last changes 2,100, 3,300 and 3,780 ms.
Below 1024px each scene plays on its own from the 300ms lead. One ember ring at a time across the row (step 1's last
ring ends at 2,020 ms, Speak's starts at 3,340). The step numbers light while their scene plays: `.site-step__lit`
carries a `during` role, and the rule `[data-site-motion="on"] [data-play-scope]:has([data-play][data-played="1"])
.site-step__lit` plays it on the scene's clock (the `li` carries the play class, and the lead rule covers
`[data-play-scope]`). Numbers hand over at 3,100 ms (2 off, 3 on). No replay (PO-2). Reduced motion, no JavaScript:
the finished frames, no number lit.

**`.site-step` (shared, with Proof).** `li` or `div.site-step` > `span.site-step__num.site-cell[aria-hidden]` (the
digit, then `span.site-step__lit` with a `during` role) + `.site-step__title` (any element; heading type unless a
section sets its own) + optional `p.site-step__line` (ink-muted, `--measure`). A grid `[tile | text]`; the tile spans
both rows and the title's padding is `max(0px, calc((tile - 1lh) / 2))`, so its first line centres on the tile at any
type size, a title-only step is as tall as the tile, and the line follows the title. Tile 48px by `--site-step-num`
(Proof sets 40px). Lit inside a play root by the A7 `.site-during` rule (Proof), beside one by `[data-play-scope]` and
`:has()` (How). Forced colours: the outline is on `.site-step__num`.

**Tests.** `site.test.tsx` (MS-7.4 scenes; MS-8.11 the How row in story order, one ember ring at a time, last
changes 2,100, 3,300 and 3,780; MS-8.12 round 4 structure, the caveat and the drawn buttons; MS-7.3 the repeated 6 on
the crop; MS-10.8 three keypads; MS-8.4 the marked blocks); `site-css.test.ts` (no step sync, sticky or runway; the
row and the offsets; the shared `.site-step` and its one `:has()` rule); `site-motion.test.tsx` (the step sync gone: a
step scope plays like any drawing, no middle-line observer); `site-data.test.ts` (`getHowData` with labels, no well
texts); `e2e/site.mjs` (the row, the column and stage order at every layout size; How stages equal in the row and
hugging below; the story order at 1280 × 800 and 1024 × 768 and one scene alone at 768 × 1024; at most one ember ring
across How; no How animation left 4.5 s after the play line).

## Round 4: the proof check (2026-11-13, Claude Code)

The product owner asked for "a more visual and intuitive visual on the right, possibly animated and coordinated with
the left section". Done with Claude Code, not Kiro (r4-proof; proposal `proposals/proof.md`, decisions §1.2 and §2
"Proof" of the round's `01-decisions.md`). Requirements: MS-7.6, MS-7.9, MS-8.4, MS-8.11, MS-9.3, MS-10.5, MS-10.9.
Files: `sections/Proof.tsx`, `pictures/ProofCheck.tsx` (new; `Pictures.tsx` is deleted), `site-data.ts`
(`getProofExample` gains `keyLetters` and two checks; `proofCanLine` and `proofNeverLine` replace `proofSaidLine`), the
proof blocks of `site.css`.

**Layout.** `section#proof` holds `div.site-wrap.site-stack`: the head (`h2`, the lead's first two sentences), then
`div.site-proof-layout.site-play--sweep[data-play]`, the section's one play root (lead ruling 1.2). In DOM order the root
holds `figure.site-proof`, `ol.site-proof-steps[role="list"]` and `div.site-proof__more` (the note and the secondary
64px "Open the app"). One column below 1024px (figure, steps, note: phones meet the figure right after the lead); from
1024px a grid `minmax(0, 1fr) max-content` with areas `"steps figure" "more figure"`, rows `auto 1fr`, gap 32 × 48, so
the steps and the note sit left and the figure (about 534px) right; no `order`. The head is `text-wrap: balance`.

**Steps.** Four `li.site-step` (the shared step, r4-how): `span.site-step__num.site-cell[aria-hidden]` (the digit and
`span.site-step__lit` with `role('during', k, u)`) and the sentence in `span.site-step__title`, with no line and no
heading. The list sets `--site-step-num` to 40px and the title to `body-lg`. Inside the root, the A7 `.site-during` rule
lights each number while its beat plays; at rest none is lit.

**Figure** (`ProofCheck`), one grid with `subgrid` lines, so a word's letters always sit under the key that types them:

- Columns: phones `repeat(5, minmax(0, 64px))` (the chips on their own line); from 600px `max-content repeat(5, 52px)`
  (the chips' column, with "Your keys" in it), gap 8 (4 under 360px), padding 16 / 24 (8 under 360px).
- `figcaption.site-proof__keys`: the `nl-sr-only` "Your keys: {keys}", then, `aria-hidden`, the label "Your keys" and
  `span.site-proof__line.site-proof__keyline`: five `span.site-keycap` (`--key` fill, `--on-key`, `radius-chip`, 56px
  tall; the digit 16px mono in the corner, the letters from `keyLetters` in `label` size at heading weight) on one
  keypad panel (its `::before`: `--panel`, `--lift`, 8px out), five column boxes and `span.site-proof__spot`.
- `ul.site-proof__rows`: per word an `li.site-proof__row` with `div.site-cell.site-proof__chip` (the real `ProofChip`
  and, `aria-hidden`, the typing chip with hidden slots) and `div.site-proof__line.site-proof__spell[aria-hidden]`: five
  `span.site-letter` (48px slots, `--site-piece` = `--surface`, `heading` size), five column boxes and, for the dropped
  word, `span.site-letter__box` in the letter at `diffAt` (a reject edge and a reject copy of the letter, `data-l`) and
  `span.site-proof__x` under it.
- `div.site-proof__closing` (a 2px `--line` rule above): `p.site-proof__said--can` (`check`, "Can be spoken: water,
  waves.") and `p.site-proof__said--never` (`x`, "Never spoken: wafer. "wafer" is 92337. Your keys are 92837."), icons
  `aria-hidden` in `--proof-match` and `--proof-reject`.

**Play** (`motion-sweep` 240 ms steps after `motion-play-lead` 300 ms; t(k) = 300 + 240k):

| Beat (number lit) | Steps | Figure |
|---|---|---|
| 1 You press keys (`during` 0-2) | k0 | the keys' outline (`ring` 0-2) |
| 2 Words are suggested (`during` 2-5) | k2, k3, k4 | the typing chips (`during` k2/k3/k4 to u10/u10/u11) |
| 3 Turned back into keys (`during` 5-10) | k5-k9 | column box c (`ring` 5+c to 6+c) in all four lines; the letters of column c rise with it (`rise` 5+c); the reject box and x (`mark` 5 + diffAt, k7 today) |
| 4 Dropped, never spoken (`during` 10-13) | k10, k11, k12 | the match chips (`in` 10), the reject chip (`in` 11), the closing lines (`in` 12) |

The last change is 3,620 ms after the trigger (number 4 off). The box and the letters it checks change in the same
step, inside the box, where the eye is; the verdicts follow the sweep as its effect (the language's "cause leads"
rule). At most three changes at once (a box handover counts as one). No ember in the section. Finished state (also
reduced motion and no JavaScript): every letter, the reject box and x, the real chips, the closing lines, no number lit.
Plays once per page view (PO-2: no replay button).

**Forced colours**: outlines for `.site-keycap`, `.site-letter__box` and `.site-proof__spot` (and `.site-proof__box`).

**Tests:**
- `site.test.tsx`:
  - MS-7.2: what the figure exposes;
  - MS-9.3: the closing lines' icons; the struck reject chip; the boxed letter with its x, not on its key;
  - MS-7.9: the caption, the keys, the two lines, the chip and typing-chip steps; the four lines with their boxes,
    letters, the spot and the mark;
  - MS-10.9 and MS-8.11: the head, then the root holding figure, steps and note; the steps' classes and lit steps;
    only the numbers move outside the figure;
  - MS-8.4: four reveal blocks.
- `site-data.test.ts`: MS-7.9 the two lines; MS-7.6 `keyLetters` and the dropped letter.
- `site-css.test.ts` (with r4-language's leave): the differing letter's mark and the forced-colours list.
- `e2e/site.mjs`:
  - the proof layout at every size;
  - the proof root among the tall drawings on phones;
  - the step numbers in step with the figure at 1280 × 800 and 390 × 844 (seek to 400, 1120, 2080, 3040 and
    3700 ms);
  - none lit with reduced motion.

## Round 4: the end of the page (2026-11-13, Claude Code)

Done with Claude Code, not Kiro, after the product owner's "'Good to know' and 'Free and open' either put the info
across the site and make it more visually appealing" and "make a better footer" (the round's `proposals/close.md`,
decisions §2). Requirements MS-3.1, MS-3.8, MS-4.4, MS-4.5, MS-4.5a, MS-4.7, MS-9.1, MS-14.5; copy in content.md §8 to
§12 and `/about`.

- **Limits beside their claims (`.site-caveat`, MS-4.5a).** One shared primitive, documented in the `site.css` header
  list: `.site .site-caveat` (flex, `space-3` gap, `--measure` wide, ink even inside a card whose `p` is ink-muted),
  its first child the info icon (`SiteIcon d={info}`), centred on the first body line. The section owners place the
  lines (How under its row, Results in its caveat note, Access in "Phones, tablets and laptops"; content.md §8).
- **Good to know (`sections/Limits.tsx`).** The `.site-head` carries the lead `LIMITS_LEAD`. `div.site-limits` is a
  grid (one column; `minmax(0, 7fr) minmax(0, 5fr)` from 1024px) of two `.site-card.site-limits__card` reveal blocks:
  - "Before you start": `ul.site-limits__rows`, each `li` a grid of `.site-tile` (the language's 48px tile) with the
    row's icon (`spell` and `voice` from `Icon.tsx`, `globe` and `toggle` from `icons.tsx`), `.site-limits__key`
    (label type) and `p.site-limits__text` (body, ink), with 2px `--line` rules between rows. On phones the tile and
    key share a line and the sentence runs under both; from 600px three columns (48px, 144px, the rest), the key
    and the sentence's first line centred on the tile by a top padding of (48px minus the line height) / 2.
  - "Testing so far": `ul.site-limits__status`, each `li` a two-column grid of `.site-limits__check`, a visually
    hidden ": " and `.site-limits__state` (a 40px pill, label type, 2px `--line-strong` edge; Done adds the app's
    `check` icon in ink; `--not` is dashed), then `.site-links.site-limits__help`.
  - Data: `LIMITS_LEAD`, `LIMIT_ROWS`, `TESTING` and `LIMITS` (plain text, page order, for `/llms.txt`).
- **The close (`sections/Start.tsx`).** `ul.site-start__facts` (`START_FACTS`) between the head and the `.site-cta`:
  2 x 2 with a cross of 2px `--line` rules under 768px, one row of four with rules between from 768px.
  `strong.site-start__fact` (heading type, ink) and `span.site-start__fact-line` (body, ink-muted), a visually hidden
  ": " between them. No icons and no pills: typographic, never badge-like (content.md "Never on the page"). The band
  stays still (never a reveal block, MS-8.4).
- **The footer (`SiteFooter.tsx`).** `footer.site-footer[data-theme=night] > .site-wrap.site-footer__inner` (a flex
  column, `space-8` apart):
  - `.site-footer__top` (one column; `4fr 8fr` from 1024px): `.site-footer__lead` (the `.nl-brand--small` lockup,
    `p.site-footer__promise`, `a.nl-btn.nl-btn--secondary` "Open the app") and `nav.site-footer__nav[aria-label=Footer]`,
    a grid of `.site-footer__group`s (an `h2.site-footer__title` in label type, ink-muted, and a `ul` of nav links):
    two columns on phones with the last group across both and its links in two columns, three from 600px.
    `footerGroups(home)` is the one list (the tests read it); links to GitHub carry `SiteIcon d={external}` after
    the word.
  - `.site-footer__legal` (a 2px `--line` top rule; statement and history side by side from 1024px):
    `p.site-footer__statement` (body, unchanged) and `p.site-footer__history` (`HISTORY_LINE`, body, ink-muted).
  - `.site-footer__end`: the licence line (`caption`) and `p.site-links` "Back to top" (`#top`, `SiteIcon d={arrow}
    turn="up"` before the word).
  - The shared link rules (56px targets, the nav-link look, the 8px group gap) still apply; the footer grid only
    overrides `display`, `align-items` and the gaps with higher specificity, so the shared rule `site-css.test.ts`
    locks is untouched.
- **`/about`** gains "Free and open source" and "Credits" (`#credits`) as `.site-prose` sections before the
  statement; its header is `#top`, as is the 404's.
- **`/llms.txt`**: "## Good to know" (the lead and the seven rows, from `LIMITS`) between Model ranking and
  Questions, and the history line after the source link.
- **The FAQ**: "Is it free?" ends with the two "Why it is free" sentences on model ranking's cost; the shape is kept,
  so the FAQPage JSON-LD and `/llms.txt` follow.
- **No theme switch** (decisions §0): MS-12.1 forbids the landing page to write storage, a choice made in the Night
  footer would change nothing on screen, and Chrome's guidance keeps overrides in settings (the app's Settings has
  Theme, and the site follows a stored choice).

Tests: `site.test.tsx` (MS-3.1 nine sections; MS-4.5 rows and states read from content.md §8; MS-4.5a the caveat
lines in How, Results and Access; MS-4.7 in the footer; MS-8.4 reveal counts; the close's facts; the footer's groups,
hrefs, icons and `#top`; the Source section gone, W6), `about.test.tsx` (the two sections, the credits, `#top`, the
history line), `seo.test.tsx` (the 404's `#top`; the limits, the history line and the key-press figure in
`/llms.txt`), and the r4-close block of `test/e2e/site.mjs` at 320, 390, 1280 and 1440px on `/`, `/about` and the
404 in the Day theme: three groups of 13 links, every one a 56px target, every anchor and `#top` with its target, the
footer Night, the history line everywhere and the statement everywhere but `/about`, each external icon right after
its last word, Back to top scrolling to the top, the two Good to know cards side by side only from 1024px, each state
right of its check, 48px tiles, and the facts row as 2 x 2 under 768px and one row from 768px.

Bytes (measured on the dev server against the round-3 page, gzip): the four blocks (Good to know, the close, the
footer, and the removed Source section) cost 178 B less in the page's HTML than in round 3, and about as much again in
the RSC payload that repeats the text; the server markup stays about 11.7 KB of the 15 KB MS-11.6 allows. CSS: the new
rules are 5.0 KB minified (0.6 KB gzip in the stylesheet's context) and 1.0 KB of round-3 rules went, about +0.4 KB
gzip. JavaScript: none (every part is a server component; the icons render to markup).

## Round 4: the box sections (2026-11-13, Claude Code)

Done with Claude Code, not Kiro. The product owner, on "Made for both sides...", "Works the way" and "Offline
unless...": "research and improve visuals in these boxes". Proposal `proposals/boxes.md` of the round (Mobbin: bento
grids, feature cards with UI fragments, privacy and accessibility sections, face-to-face translation screens, opt-in
toggles; the web: bento practice, simplified UI graphics, safer animation, privacy labels), approved with the changes
in decisions §2 "Boxes". Requirements: MS-4.6, MS-7.2, MS-7.4, MS-7.5, MS-7.7, MS-7.8, MS-7.10, MS-8.11, MS-10.9 and
the new MS-12.4. Files: `sections/{Conversation,Access,Privacy}.tsx`, `pictures/{Conversation,Access,Privacy}.tsx` and
their `site.css` blocks ("box drawings", the stage sizes, `.site-bento`, the phone hug rule, "box grids from 648px",
the desktop lead card, the `--play-i` rules).

**Layout (`.site-bento`, MS-10.9).** Each section's grid starts with a lead card (`.site-card--lead`, the shared card
look, MS-14.3): They said, One or two switches, On your device. From 1024px the lead puts its stage (7fr) beside its
words (5fr, vertically centred; title in `title-sm`, line in `body-lg`); Access's is mirrored (`.site-card--end`), so
the leads go left, right, left down the page; below 1024px the stage is on top. Then `.site-bento--3` (Conversation,
Privacy): one card a row below 648px; two, then the third across the row with its stage beside its words, from 648px;
three in one row from 1024px (309px or wider). `.site-bento--4` (Access): two a row from 648px, the stage above the
words at every width (from 1200px the layout boxes take R3-P1's doubled sizes). The cards of a row share its lines
(`grid-template-rows: subgrid`), so their stages are one height (MS-7.7) and their titles and lines are level. The DOM
order is the reading order; a lead stage placed on the right by `grid-column` holds nothing focusable or readable.

**Stages.** The lead's is `.site-stage--lead` (`stage-m`, then `stage-l` from 600px); a Conversation or Privacy row's
`.site-stage--m`; Access's rows keep `stage-s`. Drawings keep `space-4` clear of the sides (`space-2` under 360px) and,
from 600px, above and below; under 600px every box stage hugs its drawing with `space-3` above and below.

**Drawing language** (decisions §1.3; "Round 4: shared language"): one scale (the sentence in `candidate`, words in
`label`), depth from fills (the stage, the card's fill for pieces, `.site-key-panel` under every loose key: Touch's two
keys share one, each Your view half has one, the layout boxes' key blocks are panels with plum dots), press ring v2 on
drawn buttons and computer keys, ember only for a press or the scan ring, one ring per drawing and per row. A still
arrow (`.site-arrow`: `SiteIcon` `arrow`, turned) joins a cause to its result, so a finished or reduced-motion frame
tells the story. Icons sit beside their words: every box card's name carries one (`said`, `flip`, `save`, `spell`;
`switch`, `keyboard`, `key`, `view`, `screens`; `offline`, `toggle`, `voice`, `mic`), and Your view's halves `moon` and
`sun`.

| Drawing | Shows (finished frame) | Play (step; k-u) | Last change |
|---|---|---|---|
| They said (lead) | the strip with their line and Listen; an arrow; the sentence card with the reply and its keys | frame; Listen ring 1-2, Listen/Stop/Listen 1, 4; line: Nothing yet out 2, status 2-3, line in 3; arrow in 4; hint out 5, reply rise 5 | 3,500 ms |
| Show and Flip | the Show card turned between the edges "The person opposite" and "You"; Done and Flip upright | frame; Flip ring 1-2; upright out 2, turned in 2 | 1,700 |
| Saved phrases | the well with Save phrase; an arrow; the Phrases sheet "Your phrases", the new row outlined | frame; ring 1-2; arrow and sheet in 2; new row rise 3 | 2,900 |
| Spell and My words | New chip, Add to my words; an arrow; the Matches chip | frame; ring 1-2; arrow in 2; Matches rise 2 | 2,900 |
| One or two switches (lead) | the well "I" and "4", the keypad with key 4 in the scan ring, the 80px switch, "0.4 s" to "5 s" | quick; rows 1 (0-1) and 2 (1-3); press 2-3; key 4 mark 3; press 4-5; hint out 5, word in 5 | 2,500 |
| Keyboard | the keys and what they do | quick; rings 0-1, 1-2, 2-3, 3-4; each effect in one step after its ring | 2,100 |
| Touch | keys 72 and 128 on one panel, their sizes under them | frame, after Keyboard's rings; rings 0-1, 1-2; sizes in 1, 2 | 3,300 |
| Your view | Night and Day halves, keys on panels, "Extra large" | frame; Day in 1; Large to Extra large 2; Night key 3; Day key 4 | 2,900 |
| Phones, tablets and laptops | three bare layout boxes | frame; boxes rise 0, 1, 2 | 2,300 |
| On your device (lead) | the outline "This device": the well, The dictionary, Saved phrases, My words, the offline status; Model ranking, Online voices and Listen on its edge (icons only under 600px) | quick; well and rows rise 0-3; status rise 4; the ways out in 5 | 2,500 |
| Model ranking | the real text "Sent to rank: …"; an arrow up; the switch row on the outline's edge; "Off until you turn it on" | quick; outline 0-1 (line-strong); row Off out 1, On in 1; arrow in 2 | 1,300 |
| Voices | "The browser maker", the arrow "The text"; the online voice on the edge; the on-device voice inside, checked | frame; check and line in 1; online line and arrow in 2 | 2,300 |
| Listen | "The browser maker", arrows "Their voice" up and "Text" down; Listen on the edge; They said inside | quick; ring 1-2; Listen/Stop/Listen 1, 5; line: Nothing yet out 2, status 2-4, line in 4; arrows in 3 | 3,700 |

Times are for the largest lead (a third column from 1024px waits 1,200 ms more; Touch waits 1,600 ms). At most three
parts change at one instant (language rule 3), so They said, Your view and Listen take extra steps. Ember rings in a
row never overlap: Conversation's row 900-1,500, 1,500-2,100 and 2,100-2,700 ms; Privacy's only ring is Listen's;
Access's rows as in round 2.

**The ranking card's real text (MS-4.6, MS-7.2).** `.site-card--sent` is a grid: the stage and `p.site-sent` share row
1, the `h3` is row 2 and the line row 3, so the real text sits at the top of the stage while its DOM place is after the
`h3` (a heading reader meets it under "Model ranking, if you turn it on"). The drawing holds the same text as an
`aria-hidden`, `visibility: hidden` copy (`.site-sent--room`) that keeps its room at every width; the real text's margin
equals the stage's padding (`--site-sent-pad`: `space-4`, `space-3` on phones), so both wrap alike.

**Privacy facts.** A note card: the `h3` "What happens to what ranking sends", three `.site-fact` rows (globe, clock,
chart) with `{provider.region}`, `{provider.retention}` and the log line, the "Check it yourself" line, and the two
evidence links as `.site-go--out` with the `external` icon.

**The Night bug.** Loose plum keys sat on a stage of the same colour (`--key` and `--surface-sunken` are both #2a1856 in
Night), so Touch's keys, the layout boxes' key blocks and the Night half's key vanished; every loose key now sits on a
key panel.

**Honesty.** "Only three features send words or speech off this device: model ranking, online voices and Listen." was
checked against every network call in the app (MS-12.4). The drawings name no provider and no browser maker, show no
voice as the default (`pickVoice` may pick an online voice) and draw no lock, shield or badge. No class name says
"device" (MS-4.3): `.site-bound` is the outline.

Tests: `site.test.tsx` (MS-4.6, MS-7.4, MS-7.7, MS-8.11 leads and per-row rings, MS-7.3, MS-7.10, MS-10.9, MS-8.4
`--reveal-i` per row, the note cards, the phone hug rule), `site-css.test.ts` (the stage sizes, the bento columns and
subgrid rows, the `--play-i` rules), `ranking-provider.test.ts` (the §6 entry keeps the order), `e2e/site.mjs` (equal
stages per row with the lead on its own, the hug on phones, the cards per row, the switch lead's stage, the Access
order).
