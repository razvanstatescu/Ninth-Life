# One-page marketing site at `/`, app moved to `/app`

The change replaces the interim `/welcome` page with a static, server-rendered landing page at `/` (ten sections, a live keypad demo, drawings built from the design system's own components, a bounded website motion tier) and moves the keypad app to `/app`. `/welcome` answers 308 to `/`, the manifest starts at `/app`, and the service worker precaches `/`, `/app` and `/about`. A new spec (`marketing-site`, MS-1 to MS-13), ADR-006, steering edits, a Playwright script (`site.mjs`) and a Lighthouse runner come with it. All numbers on the page come from `RESULTS.json` at build time with the method linked, the intended-purpose sentence is the shared `NOT_A_MEDICAL_DEVICE` constant, and provider, retention and region text come from `providerCopy()`.

The two review findings from the previous pass (FAQ summaries 2px apart, MEDIUM; and the NITs on tokens, Lighthouse commit label, "wafer", Source copy, region text, optimism caveat, README credits) are fixed in the tree and match the copy in `content.md`. The recorded results are green on the final tree: Lighthouse mobile 100/100/100/100 with every byte budget met, 205 checks in `site.mjs` against the production server including three offline checks, 336 web unit tests, typecheck, tm-lint and Kiro config checks. I read these records and did not re-run the suites. `git diff` and `git status` hung in this environment, so I read changed files directly and used `git show HEAD:` to tell new lines from old.

Watch for: five NITs only, none blocking. The hero demo's hidden caption still types its digits by hand (possible drift from the decoder), the page prints the keystroke saving as "0.0%" where `RESULTS.md` prints "-0.0%" (confirmed), and the forced-colours rule for the primary button lives in `components.css` but not in the design system source (confirmed). Do not commit `marketing/demo-video/` or the dev-server screenshots under `docs/a11y/screens/` with this change.

**Verdict**: APPROVED

## High-level view

Routing, offline, copy and motion match D1 to D15 and the steering rules; I found no banned claim, trademark word, outside request, cookie or number that is not from `RESULTS.json`. The offline claim rests on a production-server run that waits for the worker to control the page. The model-ranking line carries only sample sizes and the model count (D14).

The remaining gaps are small consistency items between the new page and its sources of truth: the design system, the `RESULTS.md` number format, the decoder output behind the hidden demo caption, and KIRO_LOG.

<details>
<summary>Issues (5)</summary>

1. **Hand-typed demo caption** (likely, NIT) — `KeypadDemo.tsx` line 244 writes the digits and "i need water" as a literal string, while the rest of the demo is decoder output (MS-6.2). Build the string from `final.codes` and the demo words, or add a unit test that compares it with `getDemoData()`.
2. **Keystroke saving prints "0.0%", `RESULTS.md` prints "-0.0%"** (confirmed, NIT) — `pct()` in `site-data.ts:215` drops the sign of −0.0004. Keep the sign for this one value, or note the rounding in `content.md` §7.
3. **Forced-colours border lives only in the app CSS** (confirmed, NIT) — `.nl-btn--primary` gets a transparent border in `styles/components.css:33`, but `design/system/components/Button` and `bundle.css` do not have it. Add it to the design system first, per `design-system.md`. The a11y audit's minor finding for `.nl-key` in forced-colours mode is the same pattern.
4. **Accessibility rule 5 wording** (confirmed, NIT) — it says "the app may not" use the website motion tier, but the 250 ms cross-fade (A6, `globals.css`) also runs into and out of `/app` and `/about`, as ADR-006 allows. Name the cross-fade as the one exception in rule 5.
5. **KIRO_LOG has no row for the review-fix round** (confirmed, NIT) — add a row for the second iteration recorded in `verification.md`.

</details>

<details>
<summary>Details</summary>

### Hidden demo caption can drift from the decoder

Everything the demo shows is computed from the shipped lexicon at build time, and the chips are derived from `final`. The screen-reader caption at `KeypadDemo.tsx:244` is the exception: "Example: the keys 4, 0, 6 3 3 3, 0, 9 2 8 3 7 type "i need water". 0 is space." is a literal. It matches `content.md` §1 word for word and the digits are correct today. If the lexicon changes the top result for any of the three words, the visible demo changes and the caption stays. Building it from `final.codes` (or asserting equality with `getDemoData()` in `keypad-demo.test.tsx`) removes the hazard without changing the copy.

### Results formatting differs from the source document by a sign

`getResults()` formats B1's keystroke saving with `pct()`, which rounds −0.0004 to "0.0%". `RESULTS.md` line 18 prints "-0.0%". The sentence around it ("letter mode saves no key presses") is accurate, so nothing misleading is shown, but `product.md` says numbers are copied from `RESULTS.md`. Either format keeps the sign for negative values that round to zero or record the choice in `content.md`.

### Forced-colours rule added outside the design system

The new rule keeps the primary button's edge in forced-colours mode and is correct. It changes a shared component, so the design system (`Button` README and `bundle.css`) should carry it, and `.nl-key` could get the same treatment, which the a11y audit flagged as a minor finding on the keypad drawings.

### Commit hygiene

`marketing/demo-video/` is untracked and has not been checked for the Remotion license or asset sources. About 86 PNGs in `docs/a11y/screens/` come from the dev server and show the Next.js dev-tools badge, which is third-party UI. They are fine as audit evidence and must not be reused in the README, site or Devpost. `pnpm-lock.yaml` changes the resolution of `next` and `@serwist/next` to include the optional peer `@opentelemetry/api`; commit it together with `package.json` and confirm on the first Vercel build. These are carried over from earlier passes and need no code change.

Not tested: real phones and tablets (simulators only), a deployed Vercel build, and the production offline check on WebKit (the dev server skips it).

Pre-existing, out of scope: `app/about/page.tsx` lines 45 to 46 exist unchanged at HEAD and render "sent toAnthropic's Claude API" because JSX drops the space at the line end. Worth a one-line fix (`{' '}`) in a later change.

</details>

<details>
<summary>File map</summary>

- `packages/web/app/page.tsx`, `app/app/page.tsx`, `app/robots.ts`, `app/sw.ts`, `next.config.mjs`, `public/manifest.webmanifest`: landing at `/`, app at `/app`, redirect, precache and manifest start.
- `packages/web/components/site/**`: data, drawings, header, ten sections, footer, motion island, demo, `site.css`.
- `packages/web/lib/rankingProvider.ts`: `region` field per provider.
- `packages/web/styles/*`, `design/system/tokens.json`, `scripts/gen-tokens.mjs`: motion and size tokens, forced-colours rule, cross-fade.
- `packages/web/test/*.test.ts*`, `test/e2e/*.mjs`, `.github/workflows/ci.yml`: unit tests and Playwright checks.
- `scripts/lighthouse*.mjs`, root `package.json`, `pnpm-lock.yaml`: Lighthouse 13.6.0 runner (dev only).
- `.kiro/specs/marketing-site/**`, steering, agents, workflow, `docs/**`, `README.md`: spec, ADR-006, route docs, test docs, a11y evidence.

Full diff: `git diff HEAD` plus the untracked files from `git status --porcelain --untracked-files=all`.

</details>
