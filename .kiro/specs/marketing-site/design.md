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
| `/about` | `app/about/page.tsx` (edited) | unchanged content; links per MS-1.4 | root layout CSS + `styles/app.css` |
| `/welcome` | removed (`app/welcome/` deleted) | 308 to `/` from `next.config.mjs` `redirects()` | none |
| `/robots.txt` | `app/robots.ts` (new, `force-static`) | `{ rules: { userAgent: '*', allow: '/' } }` | none |
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
  <main id="main" tabIndex={-1}>  how · proof · conversation · access · privacy · results · limits · faq · source · start </main>
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
`h3` and text; under the list, the spelling line in `body-lg`.

### 3. The proof check (`#proof`)

Desktop: `.site-split` (copy left `flex: 999 1 480px`, figure right `flex: 1 1 380px`), tablet and phone stacked.
Copy column (`div.site-proof__copy`, not marked for reveal): the heading group `div.site-head` (`h2`, lead), then
`div.site-proof__more` holding the legend (`h3` and a three-item list, each item led by the matching chip icon,
`check`, `plus` and `x`, so state is not only colour), the closing line and the secondary "Open the app".

`<figure class="site-proof">`: round 2 replaces the three frames with one stable layout, `ProofCheck`: see "Round
2", R2.4 (MS-7.9).

### 4. In a conversation (`#conversation`)

`h2`, lead, then a 2 × 2 grid of four cards from 648px (`.site-grid--boxes`, round 2), each starting with a stage
and its drawing: They said, Show and Flip, Saved phrases, Spell and My words. See "Round 2", R2.5 and R2.6.

### 5. Ways to type (`#access`)

Grid of five normal cards, 2 columns from 648px (round 2, MS-10.9, V37), each starting with a stage and its drawing:
Keyboard, Touch, One or two switches, Your view, Phones tablets and laptops (across both columns). See "Round 2", R2.5 and R2.6. Below the grid,
the accessibility note as a `site-card--line` with its `h3` and the issue link (no stage; it is not a feature box).

### 6. Offline and private (`#privacy`)

`h2`, lead, a 2 × 2 grid of four `site-card--line` cards from 648px (`.site-grid--boxes`, round 2), each starting
with a stage and its drawing: On your device, Model ranking, Voices, Listen. See "Round 2", R2.5 and R2.6. Then the
"Check it yourself" line with its link.

### 7. Measured, not promised (`#results`)

`h2`, lead, `<dl class="site-stats">` of three stat cards (`repeat(auto-fit, minmax(240px, 1fr))`), the
paragraph, the model line (when present), the links row. The stat value uses `display` type, static text
(MS-5.5). Cards may reveal (MS-8.4); the digits inside never animate.

### 8. Good to know (`#limits`)

`h2` and one `site-card--line` holding the list (`body`, disc markers, two columns from 1024px with
`columns: 2; column-gap: var(--space-12)`).

### 9. Questions (`#faq`)

Desktop: `h2` left (`flex: 1 1 320px`), the list right (`flex: 999 1 560px`); tablet and phone stacked. Each
`<details class="site-faq">`: `<summary>` with `min-height: var(--target-min)`, `heading` type, the question
text and an icon at the end (`plus` when closed, `x` when open, swapped with `details[open]` selectors, no
transition); `list-style: none` and `::-webkit-details-marker { display: none }` to drop the default marker;
the answer in `body`. Items are separated by a `--line-width` (2px) `--line` rule (decorative; the summary's
own focus ring shows focus), and each `.site-faq` has `padding-block: var(--space-1)`, so two closed summaries
are 4 + 2 + 4 = 10px apart (MS-10.4 asks for 8px or more). `site.mjs` checks that gap with the link groups.

### 10. Free and open source (`#source`)

`.site-split`: left `div.site-source__copy` (not marked for reveal) holding the heading group `div.site-head`
(`h2`, lead) and then `div.site-source__more` with the two `h3` blocks (Why it is free, Who made it) and the
links row; right a `site-card--line` "Credits" with its list.

### 11. Closing call to action (`#start`)

Centred column on `--surface`: the icon (96px, `alt=""`, still), `h2`, line, primary "Open the app"
(`nl-btn--primary nl-btn--xl`). It is the only ember fill in any viewport that shows it (the footer has none).
No `data-reveal` on this section, because it holds the logo.

### 12. Footer

As today's `/welcome` footer, plus the licence line, written out on tokens (R3): `site-footer` with `border-top:
2px solid var(--line)` and `padding-top: var(--space-12)`, brand image 32px, the licence line and the statement
in `caption` (14/20), `--ink-muted` (6.4:1 or better). Footer nav links follow the standalone link rule
(`min-height` and `min-width` `var(--target-min)`) and the group gap `var(--space-2) var(--space-6)`.

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
| A8 | How step sync (MS-8.12) | `SiteMotion` step observer sets `data-how-step` and `data-how-play` on `.site-how`; R2.3 | from 1024px the picture follows the step under the middle line; each step plays once; the active card is outlined | the picture's finished state, no outline |

The A5 frame keyframes, the `.site-frames` stack and the scan named timeline were removed in round 2. Parts that
replace each other now share a `.site-cell` (one grid cell), and the base styles show each drawing's finished state
(MS-7.5); see "Round 2" R2.2.

### Reveals (A4, MS-8.4)

Marked blocks (`data-reveal`), and only these:

- each section's heading group (`div.site-head`: the `h2` and its lead) in `how`, `proof`, `conversation`,
  `access`, `privacy`, `results`, `limits`, `faq` and `source`;
- each card or figure inside those sections: the How steps (`li`) and the How picture, the rest of the proof
  copy column (`div.site-proof__more`: the legend, the closing line and the button) and `figure.site-proof`, the
  four conversation cards, the five access cards and the accessibility note, the four privacy cards, the three
  stat cards (the `div` around each `dt`/`dd` pair, never the `dd`), the Good to know card, the FAQ list as a
  whole (`div.site-faq-list`, not each `details`), and the rest of the source column (`div.site-source__more`:
  the two `h3` blocks and the links row) and the Credits card.

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
- **Keys** (MS-6.5, MS-6.9, MS-10.8): rendered by `KeypadPicture` with `size={HERO_KEY_SIZE}`,
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
and the "For example" sentence, in k12. No frame labels. Last change 3.4 s.

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

- An `og:image` social card: Next needs an absolute `metadataBase` for it, and there is no deployed origin yet;
  make it when the URL exists (CHECKLIST A1).
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
