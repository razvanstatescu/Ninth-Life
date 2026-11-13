# Marketing landing page: product decisions

Status: **decided** (2026-11-10). The product owner answered "all recommended": every recommendation below was accepted as written. The options and trade-offs stay as the record; the final list is in "Decisions" at the end.

Sources: `docs/research/marketing-site/repo-audit.md`, `inspiration.md`, `structure-content.md`; `.kiro/steering/product.md`, `accessibility.md`, `design-system.md`, `tech.md`; `docs/decisions/ADR-003-one-screen-portrait-phones.md`.

Key fact from the audit: a landing page already exists at `/welcome` (hero with a build-time keypad demo, how it works, proof check, ways to type, privacy, results, footer). It has no spec requirement and no unit test. The app sits at `/`, and `docs/testing/README.md` records "the app stays at `/` because it is the PWA start URL". This task reverses that, so it needs a new ADR.

---

## Q1. Where the app goes, and what happens to the other routes

### Q1a. App route name

| Option | For | Against |
|---|---|---|
| **`/app`** (recommended) | Plain and predictable; matches the "Open the app" button label used across the site; the research copy already assumes it | Folder reads `app/app/page.tsx` in the Next App Router, a little awkward for developers only |
| `/talk` | Short, a verb, friendly in a shared link | Less obvious to someone looking for "the app"; leans toward a speech claim |
| `/keypad` | Describes the screen | Longer; the screen is more than the keypad (sentence, suggestions, They said) |

### Q1b. `/welcome`

- **Permanent redirect (308) to `/`** (recommended): old links, bookmarks and the CI readiness probe keep working; one line in `next.config.mjs`.
- Delete it: less to maintain, but old links 404.

### Q1c. `/about`

- **Keep `/about` as the app's own page** (recommended). Its links to `/` ("Back to the keypad", the brand) change to `/app`; its "How Ninth Life works" link points at `/`. It stays precached, so it works offline from inside the installed app.
- Fold About into the landing page: one page fewer, but the installed app would open the marketing page for its own help text, and About's detail (WCAG statement, provider copy) would lengthen the landing page.

### Q1d. PWA manifest

- **`start_url: "/app"`, keep `id: "/"` and `scope: "/"`** (recommended). The home-screen icon opens the keypad; an installed app stays the same app (same `id`); `/about` and `/` still open inside the installed window.
- Narrow `scope` to `/app`: tidier, but `/about` would then open in a browser tab, outside the installed app.
- Installed copies made before the move would still open `/`. The app is not deployed yet, so **recommend no special handling** (testers reinstall). The alternative, a small script on `/` that sends standalone-mode visits to `/app`, adds JavaScript to every landing-page visit for a case that barely exists.

### Q1e. Service worker

- **Precache `/app`, `/about` and `/`; drop `/welcome`; offline fallback for documents becomes `/app`** (recommended). The landing HTML is small (about 8 KB gzip today); keeping it precached means a link to the site also works offline.
- **Keep registering the worker on the landing page** (recommended), so "after one visit the app works with no connection" stays true for people who only saw the website. Cost: the app's precache (about 605 KB) downloads after the page loads, including during a Lighthouse run. Lighthouse's score metrics (LCP, TBT, CLS, FCP, Speed Index) are taken before that, so the score should not drop; the design phase confirms it with a measurement.
- Alternative: register only on `/app`. Lighter landing visit, but the offline promise then needs one visit to the app itself, and the copy must say so.
- All `/` links in the app (`Footer.tsx`, `MenuSheet.tsx`, `about/page.tsx`), the e2e helpers (`openApp` default path), `responsive.mjs`, `perf-check.mjs`, `footer.test.tsx`, the CI probe, the a11y-auditor default route and the ship-feature workflow's audit URL move to `/app`.

---

## Q2. Motion: do the app's rules bind the marketing page?

Current rules: `accessibility.md` rule 5 and web-ui Req 11 forbid pulsing, blinking, sliding and bouncing, allow at most a 120 ms colour change, and remove all motion under `prefers-reduced-motion`. `design-system.md` grants the website hero "slow fades". `design/system/README.md` says "No slides, bounces, pulses or blinking" without limiting it to the app. The logo must never be animated. You asked for rich animated visuals.

| Option | What is allowed on the landing page | Trade-off |
|---|---|---|
| A. App rules unchanged | Jumps, the 120 ms colour change, slow opacity fades, scroll-linked state jumps, the replaying keypad demo | No rule changes; still lively, but no element ever moves position. May read as quieter than "rich animations" |
| **B. A bounded website motion tier** (recommended) | Everything in A, plus one-time reveal moves of at most 16 px with a fade, scroll-driven animations, a cross-fade into the app, and a once-only autoplay of the keypad demo with a visible Stop | Matches your request while keeping the reasons behind the rules (switch users, tiring or unsafe motion). Needs a short ADR and edits to steering and the design-system README |
| C. Free motion on the website | Parallax, morphs, marquees, looping ambient effects, with a reduced-motion fallback | Most "rich", but off-brand ("spooky, but calm"), heavier JavaScript, and risky for the people the product is for |

Under every option, these stay: never animate the logo; no pulsing, blinking, bouncing, flicker, fog, parallax, marquees, typewriter loops, count-up numbers or looping motion; nothing flashes (WCAG 2.3.1); anything that moves on its own for over 5 seconds has a pause or stop control (2.2.2); all motion is opt-in inside `prefers-reduced-motion: no-preference`, and with reduce (or no JavaScript) every section shows its finished state; pictures of the keypad, scan highlight and proof chips behave as in the app (highlights jump, never slide); motion durations and easings become tokens in `design/system/tokens.json` first; no animation library and no third-party request (CSS and a small client island only).

Related, the ember rule on a scrolling page: **recommend "one ember fill per viewport"**. The hero's "Open the app" is the ember fill, the demo shows the current key with the pressed ring (not lit), and the closing call to action is the only ember fill in its viewport.

---

## Q3. Portrait-only phones on the landing page

- **The landing page works in both orientations on phones and scrolls normally** (recommended). ADR-003's reasons (one screen, keys that never move, keyguards) are about the keypad screen. A scrolling document has none of them, and WCAG 1.3.4 is then met on the website. The app at `/app` keeps the "Turn your phone upright" notice.
- Apply the rotate notice to the landing page too: consistent, but it adds a needless WCAG 1.3.4 failure to a page people meet first, often from a shared link.

---

## Q4. "Very good Lighthouse score": target and how to measure

### Target

| Option | Target | Trade-off |
|---|---|---|
| **A** (recommended) | Lighthouse **mobile** preset on `/`: Performance at least 95, Accessibility, Best Practices and SEO 100. Desktop also measured and reported, no separate target | Hard but reachable with a static page, text LCP and a small client island; leaves room for run-to-run noise |
| B | 100 in all four, mobile | A strong headline, but Performance on mobile swings a few points between runs, so it can fail on noise |
| C | 90 or more in all four (Lighthouse's green band) | Easy; weaker than "very good" |

Score is the median of 3 runs. Alongside it, design sets budgets for the page (largest paint is text, no layout shift, landing JavaScript and CSS weight) so a regression shows before a Lighthouse run.

### Measuring

Lighthouse needs a production build; a build must not run while the dev server runs (`tech.md` rule 1, `build-guard` hook). Lighthouse is not installed.

| Option | How | Trade-off |
|---|---|---|
| **A** (recommended) | Add `lighthouse` (Apache-2.0, licence recorded) as a root dev dependency and a script `scripts/lighthouse.mjs` that runs against `next start -p 3202`. Implementation and e2e run against the dev server; one final step pauses and asks you to stop the dev server (or say yes so the agent stops it), then builds, measures, writes the numbers to `docs/testing/performance.md`, and you restart dev | Repeatable, one pause; no worktree |
| B | Build in a separate copy of the repo while dev runs | No pause for you, but the hook blocks it and it needs your explicit yes each time; the brief says no worktree |
| C | Skip Lighthouse; use the existing `scripts/perf-check.mjs` metrics on a production build | No new dependency, but it gives no Lighthouse score, which is what you asked for |

Adding Lighthouse to CI: recommend not in this task (the CI job can follow once the target holds).

---

## Q5. Which spec holds the requirements, and what steering and docs change

| Option | Trade-off |
|---|---|
| **A. New spec `.kiro/specs/marketing-site/`** (requirements, design, tasks with its own IDs) **plus amendments to `web-ui`** for the route move (app at `/app`, Req 5.1 and 23.4 precache, Req 14.3 sentence placement, Req 11 motion scope) (recommended) | Keeps web-ui about the app (Req 1-26); the site gets its own IDs and tests |
| B. Add web-ui Req 27 and up | One spec, but it mixes the scrolling website with the one-screen app rules |

Files that change under either option: a new ADR (`docs/decisions/ADR-006-landing-page-at-root.md`: app at `/app`, manifest, worker, motion tier, orientation); `.kiro/steering/structure.md` (routes, new spec); `product.md` (Devices: the website scrolls and rotates; the website footer in the intended-purpose list is already there); `accessibility.md` rule 5 and `design-system.md` "Spooky, but calm" (website motion clause, if Q2 = B); `tech.md` (Lighthouse command); `design/system/README.md` Motion and `tokens.json` (motion tokens); `.kiro/agents/a11y-auditor.json` (default route `/app`, website motion check); `.kiro/workflows/ship-feature.workflow.json` (audit URL); `docs/architecture/web.md` route map; `docs/testing/README.md` and `performance.md`; `docs/plan/01-implementation-plan.md`; `docs/KIRO_LOG.md`.

---

## Q6. Visual direction and content (from the research)

- **Q6a. Build on `/welcome` or start over.** Recommend **growing the new `/` from `/welcome`**: keep `KeypadDemo`, `site-data.ts` (build-time decoder output and results) and `site.css`, add the missing sections (In a conversation, Good to know, Questions, Free and open source with credits, closing call to action) and the motion. Starting over costs more and loses a page that already passes axe in CI.
- **Q6b. Look.** Recommend the research's combined direction: a still Night-sky ground (CSS gradients, no images), the live keypad as the hero with the ninth key fading to ember on arrival, scroll-linked state changes in the body (keys lighting per step, the proof check moving suggested to checked to dropped, the scan highlight jumping row by row), and small component drawings instead of screenshots. Hero stays Night in both themes; body sections follow Night or Day. The alternative, a quieter mostly static page, does not meet your request.
- **Q6c. Model-ranking numbers.** Recommend **no model number on the page**: one line saying model ranking was measured on 200-sentence samples with two models from one provider, linking to the full results. Showing 95.5% honestly needs the sample size, the same-items offline figure (84.5%) and the 24.8% of calls past the 1.2 s deadline beside it. Alternative: show it with all three caveats.
- **Facts corrected whatever you choose:** "Model ranking has not been measured yet" goes (it now has been); "Built with Kiro for Kiroween 2026" becomes "Made for Kiroween 2026.".

---

## Decisions

Made 2026-11-10. Who: the product owner, by accepting every recommendation ("all recommended"). Design and implementation treat these as fixed; changing one needs a new answer from the product owner.

| ID | Decision | Who | Why |
|---|---|---|---|
| D1 | The app moves from `/` to **`/app`** (`packages/web/app/app/page.tsx`). | Recommendation accepted | Plain and predictable, and it matches the "Open the app" label used on every call to action. |
| D2 | **`/welcome` permanently redirects (308) to `/`**, set in `next.config.mjs`; its page file is removed and its content moves to `/`. | Recommendation accepted | Old links, bookmarks and the CI readiness probe keep working, at the cost of one config line. |
| D3 | **`/about` stays as the app's own page.** Its links to `/` (brand, "Back to the keypad") go to `/app`, and "How Ninth Life works" (in `/about`, `Footer.tsx`, `MenuSheet.tsx`) goes to `/`. | Recommendation accepted | The installed app keeps its help text offline, and the landing page does not grow with About's detail. |
| D4 | Manifest: **`start_url: "/app"`, keep `id: "/"` and `scope: "/"`**, `orientation: "any"` unchanged. Copies installed before the move get no special handling and no standalone redirect script. | Recommendation accepted | The home-screen icon opens the keypad, and an installed app stays the same app. The app is not deployed yet, so few old installs exist, and a redirect script would add JavaScript to every landing visit. |
| D5 | Service worker: **precache `/app`, `/about` and `/`; drop `/welcome`; the offline document fallback in `app/sw.ts` becomes `/app`; the worker keeps registering on every page, including `/`.** Every reference to `/` as the app moves to `/app`: `Footer.tsx`, `MenuSheet.tsx`, `about/page.tsx`, `test/e2e/lib.mjs` `openApp` default, `responsive.mjs`, `axe.mjs` targets, `scripts/perf-check.mjs`, `footer.test.tsx`, the CI probe, the a11y-auditor default route and the ship-feature audit URL. | Recommendation accepted | "After one visit the app works with no connection" stays true for people who only saw the website. The landing HTML is small. The precache download happens after Lighthouse takes its score metrics; the design phase confirms this by measuring. |
| D6 | Motion: **a bounded website motion tier**, recorded in an ADR and in steering. On top of the app's rules (jumps, the 120 ms colour change, slow opacity fades), the marketing page may use: scroll-driven CSS animations; one-time reveals of an opacity fade plus a move of at most 16 px; a cross-fade into the app (`@view-transition`, plain `<a href>`); and a keypad demo that autoplays once when in view, with a visible Stop. | Recommendation accepted | It meets the request for rich animation while keeping the reasons behind the rules: switch users watch the screen for long periods, and pulsing light is tiring or unsafe. |
| D6.1 | These stay banned under D6: animating the logo; pulsing, blinking, bouncing, flicker, fog; parallax, marquees, typewriter loops, count-up numbers, any looping motion; flashing (WCAG 2.3.1); animation libraries and third-party files or requests. Anything that moves on its own for more than 5 s has a pause or stop control (2.2.2). Motion is opt-in only, inside `prefers-reduced-motion: no-preference`. With reduce, no JavaScript or no support, every section shows its finished state; JavaScript motion checks the media query itself. Drawings of the keypad, scan highlight and proof chips behave as in the app (highlights jump, never slide). Durations and easings become tokens in `design/system/tokens.json` before any animation uses them. Only CSS and a small client island are used. The LCP text (`h1`, lead) is never faded in. | Recommendation accepted | These limits keep the extra motion safe and the page light. |
| D6.2 | Ember on the scrolling page: **one ember fill per viewport.** The hero's "Open the app" is the ember fill there, the demo's current key uses the pressed ring (not lit), and the closing call to action is the only ember fill in its viewport. | Recommendation accepted | It applies `accessibility.md` rule 3 to a page that scrolls. |
| D7 | Phones held sideways: **the landing page scrolls and works in both orientations** (it meets WCAG 1.3.4). Only `/app` keeps the "Turn your phone upright" notice (ADR-003 unchanged for the app). | Recommendation accepted | ADR-003's reasons (one screen, keys that never move, keyguards) apply only to the keypad screen. |
| D8 | Lighthouse target: **mobile preset on `/`, median of 3 runs: Performance ≥ 95; Accessibility, Best Practices and SEO = 100.** Desktop is measured and reported with no separate target. Design also sets landing budgets: text LCP, CLS about 0, and a cap on landing JavaScript and CSS weight. | Recommendation accepted | Reachable with a static page, a text LCP and a small island, with margin for run-to-run noise on Performance. |
| D9 | Measuring: **add `lighthouse` (Apache-2.0, licence recorded) as a root dev dependency, plus `scripts/lighthouse.mjs`, run against `next start -p 3202`.** Implementation and e2e run against the dev server. One final step pauses and asks the product owner to stop the dev server, or to let the agent stop it. Then it builds, measures, writes the results to `docs/testing/performance.md` (Lighthouse version, mode, URL, the four scores) and dev restarts. No separate repo copy or worktree. Lighthouse is not added to CI in this task. | Recommendation accepted | Repeatable, with one pause. It respects `tech.md` rule 1 and the `build-guard` hook, and the brief rules out a worktree. |
| D10 | Spec home: **a new spec `.kiro/specs/marketing-site/`** (requirements, design, tasks with their own IDs and tests that name them), **plus amendments to `web-ui`** for the move: app at `/app`, Req 5.1 and 23.4 precache, Req 14.3 sentence placement, Req 11 motion scope (app only; website rules in marketing-site). | Recommendation accepted | web-ui stays about the one-screen app (Req 1-26), and the scrolling site gets its own requirements. |
| D11 | Records and docs that change: a new **`docs/decisions/ADR-006-landing-page-at-root.md`** (app at `/app`, manifest, worker, website motion tier, orientation; reverses the "app stays at `/`" note in `docs/testing/README.md`). Also `.kiro/steering/structure.md`, `product.md` (Devices: the website scrolls and rotates), `accessibility.md` rule 5 and `design-system.md` "Spooky, but calm" (website motion clause), `tech.md` (Lighthouse command), `design/system/README.md` Motion and `tokens.json` (motion tokens, then `pnpm -F @ninth/web tokens`), `.kiro/agents/a11y-auditor.json` (default route `/app`, website motion check), `.kiro/workflows/ship-feature.workflow.json` (audit URL), `docs/architecture/web.md` route map, `docs/testing/README.md` and `performance.md`, `docs/plan/01-implementation-plan.md`, and `docs/KIRO_LOG.md`. Historical reports (`docs/a11y/…`, `.kiro/workflow-output/review.md`) stay as they are. | Recommendation accepted | It keeps steering, the auditor and the docs in line with the new routes and rules. |
| D12 | **Grow the new `/` from `/welcome`:** keep `KeypadDemo`, `site-data.ts` (build-time decoder output and results) and `site.css`. Add the sections In a conversation, Good to know, Questions (native `<details>`), Free and open source with credits, and a closing call to action. | Recommendation accepted | The existing page already passes axe in CI, and starting over costs more. |
| D13 | Look: **a still Night-sky ground** (CSS gradients, no images), **a live keypad hero** with the ninth key fading to ember on arrival (a key drawing, not the logo), **scroll-linked state changes** (keys lighting per step; proof check suggested → checked → dropped; scan highlight jumping row by row), and **small drawings of our own components** instead of screenshots. The hero stays Night in both themes; body sections follow Night or Day. | Recommendation accepted | It is the research's combined direction: rich, on-brand, and cheap to load. |
| D14 | **No model-ranking number on the page.** One line says model ranking was measured on 200-sentence samples with two models from one provider and links to the full results. Offline B0/B1 numbers come from `RESULTS.json` at build time with the method linked. | Recommendation accepted | Quoting 95.5% honestly needs the sample size, the same-items offline 84.5% and the 24.8% of calls past the deadline beside it. |
| D15 | Corrections whatever else changes: drop "Model ranking has not been measured yet". Replace "Built with Kiro for Kiroween 2026" with "Made for Kiroween 2026." | Recommendation accepted | The first line is no longer true (`RESULTS.md` has model runs). The second is a plain, accurate line. |
