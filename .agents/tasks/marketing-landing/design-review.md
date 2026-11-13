# Design review: marketing-site (third review, after the second revision)

Reviewed: `.kiro/specs/marketing-site/{requirements,design,tasks,content}.md` and
`docs/decisions/ADR-006-landing-page-at-root.md`. Checked against `.agents/tasks/marketing-landing/decisions.md`
(D1-D15, binding), `docs/research/marketing-site/`, the steering files and the current source in `packages/web`
(`components.css`, `globals.css`, `tokens.css`, `site.css`, `KeypadDemo.tsx`, `ProofChip.tsx`, `Icon.tsx`,
`lib/keys.ts`, `lib/settings.ts`, `app/layout.tsx`, `app/page.tsx`, `next.config.mjs`, `test/e2e/*.mjs`,
`scripts/tm-lint.mjs`, `scripts/perf-check.mjs`, `.github/workflows/ci.yml`). Date: 2026-11-10. Prior review: the
second version of this file (CHANGES_REQUESTED, 0 HIGH, 4 MEDIUM, 10 NIT).

**Verdict: CHANGES_REQUESTED** (0 HIGH, 3 MEDIUM, 4 NIT).

The revision closes all 14 findings of the second review. The route move is still fully covered. The motion,
layout and Lighthouse requirements are testable as written. Three new gaps block implementation. The copy check
for MS-4.1 skips the FAQ answers and every sentence with a build-time value, including the model-ranking privacy
text. The tablet bar layout can only be built by reordering the bar visually, which breaks MS-13.2. Footer and
nav links such as "About" are narrower than the 56px that MS-10.4 requires, and the footer nav has no row gap.

## Status of the second review's findings

| # | Second review finding | Status | Note |
|---|---|---|---|
| 1 | MEDIUM: nested reveal blocks in `proof` and `source` | Closed | A4 marks `div.site-proof__more` and `div.site-source__more`; the column wrappers are never marked; MS-8.4 forbids nesting; `site.test.tsx` checks `[data-reveal] [data-reveal]`. |
| 2 | MEDIUM: the XL key size overrides the drawings | Closed | Inline `--nl-key` on `.nl-keypad` from `KEY_DRAWING_SIZE` / `HERO_KEY_SIZE`; MS-10.8; `site.css` sets no `--nl-key`; XL pass in `site.mjs`. An inline custom property on the `.nl-keypad` element beats both `.nl-keypad` (0,1,0) and `[data-keysize="xl"] .nl-keypad` (0,2,0). |
| 3 | MEDIUM: phone header button size | Closed | Compact rule stated; one row from about 352px; two rows at 320 (144px) allowed; 80px assertion at 360x668. |
| 4 | MEDIUM: MS-4.3, MS-9.3, MS-12.3 untested | Closed | All three have named tests; MS-11.1 and MS-11.5 too. |
| 5 | NIT: logo image count | Closed | Four images. |
| 6 | NIT: MS-7.2 and proof frame 3 | Closed | |
| 7 | NIT: bare `linear` | Closed | A3 and A5 use `var(--motion-ease-linear)`; the CSS test flags the keywords. |
| 8 | NIT: drawn keys' cursor and `:active` ring | Closed | Both reset; specificity reasoning is right (0,2,0, page CSS after layout CSS). |
| 9 | NIT: arrival fades replay | Closed | `data-site-arrived`, `:not([data-site-arrived])`, test case. |
| 10 | NIT: `next` type import | Closed | |
| 11 | NIT: MS-6.2 wording | Closed | |
| 12 | NIT: `og:title` | Closed | |
| 13 | NIT: steering lists miss `site.mjs` | Closed | |
| 14 | NIT: `data:` and `blob:` in the origin check | Closed | |

## Findings

### 1. MEDIUM: the MS-4.1 copy check skips the FAQ answers and every sentence with a `{value}`
**Where:** design "Copy check (MS-4.1)"; content.md §3, §6, §7, §9, §10.
**Problem:** The check collects only `**bold**` strings that contain no `{`. In content.md §9 only the questions are
bold; the 9 answers are plain text after the bold question, so none is checked. Every string with a placeholder
is skipped as well: the "Model ranking, if you turn it on" privacy card ("Processing is not limited to the EU. … Our
server logs timings and counts, never your words."), the results lead, the three stat `dd` texts, the results
paragraph, the model line, the proof "For example…" sentence and the Credits line "Model ranking: {provider.company}."
MS-4.6 and MS-5.4 check a few fragments, but the rest of the privacy disclosure and all the FAQ answers can drift
from content.md, or be left out, without any test failing. These are the sentences `product.md` cares most about
(privacy limits, "Can the model say something I did not type?").
**Fix:** Extend the copy check in the design (and task 13.1):
- In §9, for each list line of the form `- **Question** Answer`, also collect `Answer` (the text after the closing
  `**`, trimmed), with any `{…}` handled as below.
- For a string that contains `{`, split it on `/\{[^}]+\}/` and require every literal fragment that is 8 or more
  characters long after trimming to appear in the rendered text. Example: the privacy card yields "It is off until
  you turn it on in Settings. Then Ninth Life sends your keys, the dictionary words that match them, its own best
  guesses and the other person's last line to", "to rank the sentences. Processing is not limited to the EU." and
  "Our server logs timings and counts, never your words."
- Keep the existing removals. The null-results line stays removed, and the model line is checked only when
  `getResults().modelRuns` is not null.

### 2. MEDIUM: the tablet bar layout needs a visual reorder, which breaks MS-13.2 focus order
**Where:** design §0 ("Tablet 720-1023px: row 1 brand and CTA, row 2 the nav, wrapping"), the structure sketch
(`brand · <nav> · Open the app`); MS-13.2 ("every control SHALL be reachable in visual order"); the keyboard e2e
checks Tab order over the bar only at 1280.
**Problem:** The DOM order is brand, nav, CTA. One flex-wrap row can put the CTA on row 1 beside the brand and the
nav on row 2 only with `order` or grid placement. Today's `site.css` does exactly that (`.site-header__cta { order: 2 }`,
`.site-nav { order: 3; flex: 1 1 100% }`). Then Tab goes brand, nav links (row 2), CTA (row 1), while the eye reads
brand, CTA, nav. That breaks MS-13.2, and nothing tests it, because the Tab-order check runs only at 1280, where the
bar is one row. The design does not say how the tablet layout is built, so the implementer is likely to keep
today's `order` rules.
**Fix:** Add to §0: "The bar never reorders its children: no `order`, no grid placement that differs from DOM order
(brand, nav, CTA), at any width (MS-13.2). From 720 to 1023px the children wrap in DOM order: the brand, then the
nav, then the CTA, as space allows (up to three rows: 12 + 56 + 8 + 56 + 8 + 56 + 12 = 208px)." Update the tablet
fold estimate (744x1047: about 740px with a 208px bar, still inside the 1047px viewport and not required by
MS-10.7). In `site.mjs`, run the bar Tab-order check at 820x1094 too (the first Tabs after the skip link focus the
brand, then the 5 nav links, then the header CTA, and the CTA's box is not above the last nav link's box). If the
product owner prefers brand and CTA on one row, the alternative is to change the DOM order to brand, CTA, nav and
lay out desktop as brand, CTA, nav as well. Pick one and write it down.

### 3. MEDIUM: short links are narrower than 56px, and the footer nav has no row gap (MS-10.4)
**Where:** design §0 (nav links: `min-height` only), §12 ("As today's `/welcome` footer … Footer nav links have
`min-height: var(--target-min)`"); MS-10.4 ("at least 56px tall and wide, with at least 8px between them"); the
`site.mjs` MS-10.4 size check.
**Problem:** Only `min-height` is specified. "About" in the footer nav at 17px weight 600 is about 47px wide, and
"Privacy" (header and footer) is close to 56px. They fail the "wide" half of MS-10.4, and the `site.mjs` size check
fails on them. Today's footer nav uses `gap: 0 20px`, which the design carries over ("As today's"). When the
footer links wrap on a phone, the rows touch (0px apart, MS-10.4 asks for 8px), and 20px is not on the spacing scale.
**Fix:** Add to "Page structure and layout": "Every standalone link (bar nav, footer nav, `.site-links a`) is
`display: inline-flex; align-items: center; justify-content: center; min-height: var(--target-min); min-width:
var(--target-min)`. Link groups use `gap: var(--space-2) var(--space-6)` (bar nav, footer nav, `.site-links`)." In
§12, replace "As today's `/welcome` footer" with the footer rules written out on tokens (footer nav gap as above,
`padding-top: var(--space-12)`, brand image 32px). In `site.mjs`, MS-10.4 checks width as well as height and, for
each pair of targets in one group, a gap of at least 8px between their boxes.

### 4. NIT: the MS-8.1 selector check would fail on `globals.css`
**Where:** test plan `site-css.test.ts`: "reads `site.css` and `globals.css` … every animation selector starts with
`[data-site-motion`".
**Problem:** `globals.css` holds `::view-transition-group(root) { animation-duration: … }` (A6) and the reduce guard
`*, *::before, *::after { animation: none !important }`. Neither starts with `[data-site-motion`.
**Fix:** "every animation selector **in `site.css`** starts with `[data-site-motion`; in `globals.css` the only
animation rules are the A6 view-transition rules inside the no-preference block and the existing reduce guard".

### 5. NIT: the proof frame 3 label must be 16px, not 14px
**Where:** design "Drawings" ("Other drawing text (rank numbers, chip codes, frame labels) is 14px or more"); §3
(frame 3 is not `aria-hidden`); MS-10.5; the `site.mjs` text-size check (16px outside `aria-hidden` subtrees).
**Fix:** "Frame labels are `label` size (16px), so frame 3's 'Dropped', which is outside `aria-hidden`, passes
MS-10.5." Or make the label element itself `aria-hidden` and state that.

### 6. NIT: the tablet hero padding is not given
**Where:** design §1 (phone `var(--space-6)` / `var(--space-12)`, desktop `var(--space-16)` / 112px; tablet not stated).
**Fix:** "Tablet (600-1023px): padding block `var(--space-12)` / `var(--space-16)`." Also replace the raw 112px
with `calc(var(--space-16) + var(--space-12))`, or say it is the allowed raw value.

### 7. NIT: `site.mjs` sizes carry screen and touch, but `newContext` cannot set them
**Where:** test plan `site.mjs` sizes `[label, width, height, screenW, screenH, touch]`; `lib.mjs` `newContext` (takes
`theme`, `width`, `height`, `reducedMotion`, plus the new `serviceWorkers`).
**Fix:** "The size passes build their contexts like `responsive.mjs` (`browser.newContext({ viewport, screen,
deviceScaleFactor: 2, hasTouch: touch, isMobile: touch && engine === 'chromium', reducedMotion, serviceWorkers })`
plus the same theme init script). Other runs use `newContext`."

## Verified assumptions
- `components.css`: `.nl-keypad` sets `--nl-key` on itself (0,1,0) and `[data-keysize="xl"] .nl-keypad` overrides it
  (0,2,0); an inline `--nl-key` on that element wins over both. `.nl-key` is `position: relative` (the `::after`
  ring works), has width `var(--nl-key-w, var(--nl-key, …))`, and `--nl-key-w` is set only in `app.css`.
  `.nl-key:active` is the inner ember ring; `.nl-key__letters` is `min(30px, 0.36 × --nl-key)` (23px at 64px).
  `.nl-chip--reject .nl-chip__word { text-decoration: line-through; … }` exists, as the MS-9.3 test expects.
  Component transitions are 120 ms and sit inside `no-preference`.
- `ProofChip` renders `data-state`, the class `nl-chip--{state}`, the `check` / `plus` / `x` icon and
  `.nl-chip__word`. `Icon` has `check`, `plus`, `x`, `said`, `offline`, `speaker`. `lib/keys.ts` exports `KEY_ROWS`.
- `lib/settings.ts`: `KEYSIZE_KEY = 'nl-keysize'`; `THEME_BOOT_SCRIPT` sets `data-keysize` to `l` or `xl` from it,
  so the `site.mjs` XL init script is right.
- `scripts/tm-lint.mjs` has `const BANNED = [ … ];` on one line, so the MS-4.3 regex `/const BANNED = \[([^\]]*)\]/`
  reads it.
- Every in-app link to `/` or `/welcome` is a plain `<a>` (no `next/link`), so `/` never runs with `app.css` left
  over from a client-side navigation. `app/page.tsx` today only renders `<CommunicationScreen />`. No unit test
  imports `app/page`, `app/welcome` or `app/about`. `mobile.test.tsx` and `layout.test.ts` read `app/layout.tsx`
  and `styles/app.css` by path and stay valid once `app.css` moves out of the layout.
- `app.css` holds no rule the landing page needs. `.nl-sr-only` and `.nl-skip` are in `globals.css`.
- `globals.css` has the reduce guard (`transition` and `animation: none !important`).
- `next.config.mjs` precaches `/`, `/about`, `/welcome` today; the route move edits that one line. `NOT_PRECACHED`
  leaves out `en.v1.json`. The worker is disabled in development.
- Places that mean "the app at `/`", all listed in the design and tasks: `Footer.tsx` (link and comment),
  `MenuSheet.tsx`, `about/page.tsx` (brand, "Back to the keypad", the `/welcome` link), `manifest.webmanifest`
  `start_url`, `next.config.mjs`, `app/sw.ts`, `lib.mjs` `openApp(page, path = '/')`, `axe.mjs` targets,
  `responsive.mjs`, `scripts/perf-check.mjs` (3 `goto` calls to `BASE_URL + '/'`), `ci.yml` probe
  `"$BASE_URL/welcome"`, the a11y-auditor and ship-feature configs, `structure.md`, `docs/testing/README.md`
  (axe row and "The website"), `docs/testing/performance.md`, `docs/plan/01-implementation-plan.md` F12.
- `responsive.mjs` builds its own contexts with `screen`, `hasTouch` and `isMobile`; `newContext` always blocks the
  worker today.
- Hero contrast: `--plum` at 70% over `--night` is about `#23144b` (relative luminance about 0.014), darker than
  `--night` with 8% `--moon` (about `#251c3f`, about 0.015), so the MS-9.2 bound holds at the plum glow behind the
  bottom-left copy too.
- Fold arithmetic: 360x668 634px, 375x495 about 236px (only the `h1` and header CTA needed), 874x330 213px,
  915x360 218px; 390x699 and 412x783 have more room than 360x668. The bar fits on one row at 1024px (about 875px of
  content in 976px).
- Drawing widths: the 64px picture is 240px, inside a 288px card minus 2 × 24px padding. `HERO_KEY_SIZE` is about
  66.7px at 320px wide (about 248px picture) and 84px from 372px up. Both stay in the 64-84px range of MS-10.8.
- The banned-claims regex does not match "keystroke", "replacement" or any line of content.md once the listed
  removals are made.
- `node scripts/tm-lint.mjs` on the five spec and ADR files: clean (5 files scanned).

## Unverified or wrong assumptions
- **Wrong:** "Tablet 720-1023px: row 1 brand and CTA, row 2 the nav" can be built without breaking the visual
  focus order (finding 2).
- **Wrong:** the footer "As today's `/welcome` footer" meets MS-10.4. Its `gap: 0 20px` and the short "About" link
  do not (finding 3).
- **Wrong:** the copy check makes it true that the page "cannot drift" from content.md. It covers only bold strings
  with no placeholder (finding 1).
- **Unverified:** the 125 KB script budget (MS-11.2) and Performance ≥ 95 with the worker registering on `/`. Both
  are measured only in task 28, which reports a miss to the product owner.
- **Unverified:** the nav width (about 531px for the 5 links at 17px, weight 600, 24px gaps). It decides where the
  bar wraps between 720 and 1023px. `site.mjs` prints bar heights, so the implementation will show it.
- **Unverified:** whether Lighthouse 13's `network-requests` items carry `sessionTargetType`. The design handles a
  missing field.
