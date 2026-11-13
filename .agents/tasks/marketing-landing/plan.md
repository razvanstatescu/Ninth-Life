# Implementation Plan: marketing-site (landing page at `/`, app at `/app`)

Sources: `.kiro/specs/marketing-site/{requirements,design,tasks,content}.md` (MS-1 to MS-13, tasks 1-28),
`docs/decisions/ADR-006-landing-page-at-root.md`, decisions D1-D15 in `decisions.md`, and the third design review
(`design-review.md`: 0 HIGH, 3 MEDIUM, 4 NIT, left open when the design loop was closed). This plan resolves those
seven findings as R1-R7 below and writes them into `design.md` first (step 1), so every later step builds from one
design.

Rules for every step: work on `main` in this checkout; **do not commit or push**; never run `next build` /
`pnpm build` / `pnpm -F @ninth/web build` while the dev server runs (only step 30 builds, after a yes); never open
`.env*` other than `.env.example`; no formatter; every new `it()` name starts with its requirement ID; copy word for
word from `content.md`; run `node scripts/tm-lint.mjs <changed files>` on every file a step touches. The shell here is
slow: one command per call, explicit timeouts (600000 ms for test runs). Tick each task in
`.kiro/specs/marketing-site/tasks.md` when its step is done.

Dev-server check before any e2e step: `curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3000/app`
(before step 2 lands: `/`). Not 200: `send_message` severity `warning`, ask the person to start `pnpm dev`, wait.

## Review resolutions (R1-R7), decided here

- **R1 (MS-4.1 copy check).** Besides `**bold**` strings with no `{`, collect, in §9, the answer after each
  `- **Question** Answer` line; and for any collected string that contains `{`, split on `/\{[^}]+\}/` and require
  every literal fragment of 8 or more characters (trimmed) to appear in the rendered text. Keep the existing removals;
  check the §7 model line only when `getResults().modelRuns` is not null, and skip the null-results line.
- **R2 (bar order, MS-13.2).** Keep DOM order brand, nav, CTA and never reorder it: no `order`, no grid placement
  that differs from DOM order, at any width. From 720 to 1023px the children wrap in DOM order (up to three rows,
  12 + 56 + 8 + 56 + 8 + 56 + 12 = 208px); the 744x1047 fold estimate becomes about 740px. `site.mjs` checks bar Tab
  order at 1280x900 **and** 820x1094 (after the skip link: brand, the 5 nav links, then the header CTA; the CTA's box
  is not above the last nav link's box). Chosen over reordering the DOM because it keeps the desktop layout of
  design §0 unchanged and removes today's `order` rules.
- **R3 (MS-10.4 link targets).** Every standalone link (bar nav, footer nav, `.site-links a`) is `display:
  inline-flex; align-items: center; justify-content: center; min-height: var(--target-min); min-width:
  var(--target-min)`. Link groups (bar nav, footer nav, `.site-links`) use `gap: var(--space-2) var(--space-6)`.
  Footer written out on tokens: `border-top: 2px solid var(--line)`, `padding-top: var(--space-12)`, brand image
  32px, licence line and statement in `caption`. `site.mjs` MS-10.4 checks width as well as height, and an 8px or
  larger gap between every pair of targets inside one group.
- **R4 (MS-8.1 selector check).** "Every animation selector starts with `[data-site-motion`" applies to `site.css`
  only; in `globals.css` the only animation rules allowed are the A6 view-transition rules inside the no-preference
  block and the existing reduce guard.
- **R5 (frame labels).** Frame labels use the `label` size (16px), so proof frame 3's "Dropped" (outside
  `aria-hidden`) passes MS-10.5.
- **R6 (hero padding).** Tablet (600-1023px) hero padding block `var(--space-12)` / `var(--space-16)`; desktop
  `var(--space-16)` / `calc(var(--space-16) + var(--space-12))` (no raw 112px).
- **R7 (`site.mjs` contexts).** Size passes build their contexts like `responsive.mjs`: `browser.newContext({
  viewport, screen, deviceScaleFactor: 2, hasTouch: touch, isMobile: touch && engine === 'chromium', reducedMotion,
  serviceWorkers })` plus the same `nl-theme` init script as `newContext`; other runs use `newContext`.

## FEAT-001: route move, tooling and route docs

- [ ] 1. Write R1-R7 into the spec: `design.md` (§0 bar, "Page structure and layout" link rule, §1 padding, §12
      footer, Drawings frame-label size, test plan `site-css.test.ts` MS-8.1, `site.mjs` sizes/MS-10.4/Tab order,
      Copy check) and add "## Responses to the third design review" (one row per finding); in `tasks.md` add the
      R3/R2 checks to tasks 13, 13.1 and 17.
      Files: `.kiro/specs/marketing-site/design.md`, `.kiro/specs/marketing-site/tasks.md`
      IDs: MS-4.1, MS-10.4, MS-10.5, MS-13.2, MS-8.1; task 1.
      Verify: `node scripts/tm-lint.mjs .kiro/specs/marketing-site/design.md .kiro/specs/marketing-site/tasks.md` clean.

- [ ] 2. Move the app and the page CSS. New `app/app/page.tsx` renders `<CommunicationScreen />` and imports
      `@/styles/app.css` (with the doc comment from today's `app/page.tsx`); `app/layout.tsx` drops
      `import '../styles/app.css'` (keep the comment that mentions app.css safe areas accurate);
      `app/about/page.tsx` adds `import '@/styles/app.css'`. Move today's `app/welcome/page.tsx` to `app/page.tsx`
      as an interim landing page (export renamed `HomePage`; the hero wrapper gets `id="top"` and the brand
      `href="#top"`; every
      "Open the app"/"Try it in your browser" `href="/app"`; doc comment says the app is at `/app` per ADR-006); delete
      `app/welcome/`. Step 12 replaces this page.
      Files: `packages/web/app/app/page.tsx` (new), `packages/web/app/page.tsx`, `packages/web/app/layout.tsx`,
      `packages/web/app/about/page.tsx`, `packages/web/app/welcome/page.tsx` (deleted)
      IDs: MS-1.1, MS-1.2, MS-1.3 (file gone), MS-11.3; tasks 3, 5 (part).
      Verify: `pnpm -r typecheck`; `pnpm -F @ninth/web test --run` (mobile.test.tsx and layout.test.ts still pass:
      they read `app/layout.tsx` and `styles/app.css` by path).

- [ ] 3. Links: `/about` `<Brand href="/app" />`, "Back to the keypad" `href="/app"`, "See the demo, the measured
      results and the source code" `href="/"`; `Footer.tsx` "Back to the keypad" `/app`, "How Ninth Life works" `/`,
      comment "The / link works offline: next.config.mjs precaches it"; `MenuSheet.tsx` "How Ninth Life works"
      `href="/"`. Update `test/footer.test.tsx` expectations to `['How Ninth Life works', '/']` and
      `['Back to the keypad', '/app']`, names prefixed `MS-1.5`.
      Files: `packages/web/app/about/page.tsx`, `packages/web/components/Footer.tsx`,
      `packages/web/components/MenuSheet.tsx`, `packages/web/test/footer.test.tsx`
      IDs: MS-1.4, MS-1.5; tasks 4, 4.1.
      Verify: `pnpm -F @ninth/web test --run` — footer.test.tsx passes.

- [ ] 4. Config: `next.config.mjs` `additionalPrecacheEntries` `/`, `/app`, `/about` (no `/welcome`) and
      `async redirects() { return [{ source: '/welcome', destination: '/', permanent: true }]; }` in `nextConfig`;
      `public/manifest.webmanifest` `"start_url": "/app"` (`id`, `scope`, `orientation` unchanged); `app/sw.ts`
      fallback `url: '/app'` and a header-comment line (an uncached page offline opens the keypad); new
      `app/robots.ts` (`export const dynamic = 'force-static'`; default export returns
      `{ rules: { userAgent: '*', allow: '/' } }` typed `MetadataRoute.Robots` via `import type`).
      Files: `packages/web/next.config.mjs`, `packages/web/public/manifest.webmanifest`, `packages/web/app/sw.ts`,
      `packages/web/app/robots.ts` (new)
      IDs: MS-1.3, MS-2.1, MS-2.2, MS-2.3, MS-3.5; tasks 5, 6.
      Verify: `pnpm -r typecheck`; `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://localhost:3000/welcome`
      prints `308 http://localhost:3000/`. Next reads `next.config.mjs` only at start: if it prints 404, ask the
      person (`send_message` warning) to restart `pnpm dev`, then check again.

- [ ] 5. New `test/routes.test.ts` with the route assertions of design "Test plan": MS-1.1 `dynamic ===
      'force-static'` (import `@/app/page`), MS-1.2 `Page().type === CommunicationScreen`, MS-1.3, MS-1.4, MS-1.5
      (MenuSheet source), MS-2.1 (manifest JSON), MS-2.2, MS-2.3, MS-3.5 (robots), MS-11.3 (layout, app/page, app/app,
      about CSS imports, read as text), MS-1.7 (lib.mjs, axe.mjs, ci.yml, a11y-auditor.json, ship-feature.workflow.json
      read as text). MS-10.6 is added in step 14.
      Files: `packages/web/test/routes.test.ts` (new)
      IDs: as listed; task 7.
      Verify: `pnpm -F @ninth/web test --run` — routes.test.ts passes after step 6 and 7 land (write it now, run it
      after step 7).

- [ ] 6. Tooling to `/app`: `test/e2e/lib.mjs` `openApp(page, path = '/app')` and `newContext(..., { serviceWorkers =
      'block' })` passed to `browser.newContext`; `responsive.mjs` rotate-notice `goto(BASE_URL + '/app')` (its
      `openApp(page)` follows the default); `axe.mjs` targets `landing /` (`/`), `app /app` (app), `about /about`,
      `settings sheet on /app` (step 23 adds the motion target); `scripts/perf-check.mjs` three `goto(BASE_URL + '/')`
      to `'/app'`; `.github/workflows/ci.yml` probe `curl -sf -o /dev/null "$BASE_URL/app"`.
      Files: `packages/web/test/e2e/lib.mjs`, `packages/web/test/e2e/responsive.mjs`, `packages/web/test/e2e/axe.mjs`,
      `scripts/perf-check.mjs`, `.github/workflows/ci.yml`
      IDs: MS-1.7; task 8.
      Verify: step 9 runs them.

- [ ] 7. Agents: `.kiro/agents/a11y-auditor.json` default route `http://localhost:3000/app` in `prompt` and
      `welcomeMessage`, and the method line "On `/`, check the website motion tier (ADR-006, marketing-site MS-8)
      instead of accessibility rule 5."; `.kiro/workflows/ship-feature.workflow.json` audit URL
      `http://localhost:3000/app` (the curl dev-server probes may stay on `/`). Edit the JSON strings in place.
      Files: `.kiro/agents/a11y-auditor.json`, `.kiro/workflows/ship-feature.workflow.json`
      IDs: MS-1.7; task 9.
      Verify: `node scripts/validate-kiro-config.mjs` and `node scripts/check-kiro-not-ignored.mjs` pass;
      `pnpm -F @ninth/web test --run` — routes.test.ts passes.

- [ ] 8. Route docs, text as in design "Changes to other specs, steering and docs": web-ui requirements
      (introduction, 5.1, Req 11 scope note and 11.3, 14.3, 23.4, 25.6), web-ui design (diagram, offline), web-ui
      tasks new row 56; steering `structure.md` (routes `/` website, `/app`, `/about`, `/welcome` 308, `/robots.txt`;
      `components/site/` files; spec `marketing-site/`), `product.md` Devices sentence; `docs/architecture/web.md`
      route map; `docs/README.md` ADR-006 line after ADR-005; ADR-003 Consequences scope line;
      `docs/plan/01-implementation-plan.md` F12 note and row F21; `docs/testing/README.md` axe row (`/`, `/app`,
      `/about`) and the rewritten "The website" section; `docs/testing/performance.md` precache notes (`/`, `/app`,
      `/about`).
      Files: `.kiro/specs/web-ui/{requirements,design,tasks}.md`, `.kiro/steering/structure.md`,
      `.kiro/steering/product.md`, `docs/architecture/web.md`, `docs/README.md`,
      `docs/decisions/ADR-003-one-screen-portrait-phones.md`, `docs/plan/01-implementation-plan.md`,
      `docs/testing/README.md`, `docs/testing/performance.md`
      IDs: D10, D11; tasks 21, 22 (structure, product), 24 (route parts).
      Verify: `node scripts/tm-lint.mjs <those files>` clean; `node scripts/validate-kiro-config.mjs` passes.

- [ ] 9. FEAT-001 verification and log. Dev-server check, then from `packages/web` with
      `BASE_URL=http://localhost:3000`: `keyboard.mjs`, `switch.mjs`, `spell.mjs`, `responsive.mjs`, `axe.mjs` all
      pass against `/app`; `ENGINE=webkit node test/e2e/responsive.mjs` passes. Add a KIRO_LOG row.
      Files: `docs/KIRO_LOG.md` (via `node scripts/kiro-log.mjs add …`)
      Verify: `pnpm -r typecheck`, `pnpm -F @ninth/web test --run` all green; the five e2e scripts end "all checks passed".

## FEAT-002: the static landing page (no motion yet)

- [ ] 10. Rewrite `components/site/site-data.ts` per design "Build-time data": `readJson(...candidates: string[][])`
      with the `public/data/lexicon/…` then `../../data/lexicon/…` fallback; `getDemoData()` (same algorithm);
      `getHowData()` (`decodeGhost(['44'], { k: 3 })`, `['hi']` fallback); `getProofExample()` (throws
      `site-data: the proof example no longer shows a dropped word`); `getResults(read = readJson)` with metric
      validation, one `console.warn`, `modelRuns: { sizes, count } | null` from `RESULTS.llm.json` (`runs` object,
      `Object.values`, letter mode, `isModelId`, B4 `ok`, one provider via `MODEL_PROFILES[model].provider`,
      warnings as the table says), `modelNotRun` removed; `modelRunsLine(m)`; `ISSUES_URL`, `NOTICE_URL`. Update the
      file comment (`/`, not `/welcome`). Fix the interim `app/page.tsx` (it uses `results.modelNotRun`): drop that
      clause. New `test/site-data.test.ts` (fixture in the real `RESULTS.llm.json` shape; one test on the real file
      expecting `{ sizes: [200], count: 2 }`).
      Files: `packages/web/components/site/site-data.ts`, `packages/web/app/page.tsx`,
      `packages/web/test/site-data.test.ts` (new)
      IDs: MS-5.1, MS-5.2, MS-5.3, MS-6.2, MS-7.4, MS-7.6; tasks 10, 10.1.
      Verify: `pnpm -F @ninth/web test --run` — site-data.test.ts passes; `pnpm -r typecheck`.

- [ ] 11. Drawings: `components/site/KeypadPicture.tsx` (exports `KEY_DRAWING_SIZE = '64px'`, `HERO_KEY_SIZE =
      'clamp(64px, calc((100vw - 120px) / 3), 84px)'`; props `size`, `pressed?`, `ninth?`, `className?`; renders
      `div.nl-keypad.site-pad` `aria-hidden="true"` with inline `--nl-key`, rows from `KEY_ROWS` as
      `div.nl-key.site-key` (`is-pressed`, `site-key--ninth` on key 9 when `ninth`); no `'use client'`, no server-only
      import) and `components/site/Pictures.tsx` (`HowFrames`, `ProofFrames`, `ScanFrames`, `ShowFrames`, `SaidBubble`,
      `RankingSwitch`, `OfflineChip` as design §2-§6: `.site-frames` stacks with `site-frame--KofN` children, the
      last frame is the finished state, frame labels in `label` size (R5), proof frames 1-2 `aria-hidden`, frame 3
      real `ProofChip`s, `.site-digit--diff` at `reject.diffAt`, `.site-cand--chosen` with the `check` icon, drawn
      buttons as `div.nl-btn`, no ember fill, nothing focusable).
      Files: `packages/web/components/site/KeypadPicture.tsx` (new), `packages/web/components/site/Pictures.tsx` (new)
      IDs: MS-7.1-7.5, MS-9.3, MS-10.5, MS-10.8; task 11.
      Verify: `pnpm -r typecheck`. Tests in step 14.

- [ ] 12. Page: `SiteHeader.tsx` (bar in DOM order brand, nav, CTA per R2; hero), `sections/{How,Proof,Conversation,
      Access,Privacy,Results,Limits,Faq,Source,Start}.tsx`, `SiteFooter.tsx`, and `app/page.tsx` rewritten
      (`force-static`, `metadata` from content.md "Page metadata" with `openGraph` and `twitter`, structure of design
      "Page structure and layout": `div.site` > skip link, `header#top.site-top[data-theme=night]`, `main#main`,
      footer). Copy word for word from `content.md` (straight quotes); `providerCopy()` and `NOT_A_MEDICAL_DEVICE`
      used, never retyped; `data-reveal` on exactly the A4 blocks with `--reveal-i` 0,1,2,2…; nothing marked inside
      another. `KeypadDemo`: replace its inline keypad with `<KeypadPicture size={HERO_KEY_SIZE} pressed={playing ?
      s.key : undefined} ninth />` and add `is-playing` on `.site-demo` while playing (the rest of the demo changes
      come in step 19). `SITE_MOTION_BOOT` and `<SiteMotion />` are added in step 17.
      Files: `packages/web/components/site/SiteHeader.tsx`, `packages/web/components/site/sections/*.tsx`,
      `packages/web/components/site/SiteFooter.tsx` (all new), `packages/web/app/page.tsx`,
      `packages/web/components/site/KeypadDemo.tsx`
      IDs: MS-1.1, MS-1.6, MS-3.1-3.5, MS-4.1-4.8, MS-5.1-5.5, MS-6.1, MS-6.2, MS-7.1, MS-8.4, MS-9.1, MS-13.3; task 12.
      Verify: `pnpm -r typecheck`; `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` is 200.

- [ ] 13. `site.css` rewritten for the new markup (static only, no animation): bar (`.site-bar` flex-wrap, no
      `order` anywhere, R2; `.site-brand` 56px; phone compact button rule; nav hidden under 720px), standalone link
      rule and group gaps (R3), hero Night sky on `.site-top` + `::before` glow, `.site-hero .nl-btn--xl {
      min-height: 64px; }`, hero paddings (R6), short-landscape rule after the tablet/desktop rules, every section's
      phone/tablet/desktop layout (§2-§11; Ways to type `minmax(288px, 1fr)`), `.site-pad` panel, `.site-key` ring
      `::after`, `.site-key { cursor: default; }`, `.site-key:active { box-shadow: none; }`,
      `.site-frames .nl-candidate { cursor: default; }`, `.site-frames` base stack with
      `.site-frames > :not(:last-child) { opacity: 0 }` outside any at-rule, footer on tokens (R3), safe-area side
      padding with `env(safe-area-inset-left/right)`, tokens only, no ember background, no `--nl-key`, no
      `.site-demo__pad`.
      Files: `packages/web/components/site/site.css`
      IDs: MS-3.3, MS-6.1, MS-7.2, MS-7.5, MS-9.1, MS-9.2, MS-9.3, MS-9.4, MS-10.1-10.8; task 13.
      Verify: look at `http://localhost:3000/` at 360, 820 and 1280 wide with the Playwright MCP or a quick script;
      no sideways scroll.

- [ ] 14. Tests: new `test/site.test.tsx` (every case in design "Test plan" for `site.test.tsx`, with the R1 copy
      check, the banned-claims check, the MS-4.3 tm-lint spawn and word-list checks, MS-9.3, MS-10.8, MS-8.4 no
      nesting, MS-11.3 imports; MS-8.1 boot-script case is added in step 17); new `test/site-css.test.ts` with the
      static cases (MS-7.2, MS-7.3/9.1 ember regex, MS-7.5, MS-9.2 no colour literals, MS-10.1, MS-3.3/10.7 landscape
      rule, MS-10.5/10.8 no `--nl-key` and no `.site-demo__pad`, no `order:` in `site.css` for R2); add MS-10.6 to
      `routes.test.ts`.
      Files: `packages/web/test/site.test.tsx` (new), `packages/web/test/site-css.test.ts` (new),
      `packages/web/test/routes.test.ts`
      IDs: as listed; tasks 13.1, 15.1 (static part).
      Verify: `pnpm -F @ninth/web test --run` all green; `node scripts/tm-lint.mjs` on every file under
      `components/site/`, `app/page.tsx` and the new tests clean.

- [ ] 15. FEAT-002 verification and log: `pnpm -r typecheck`; web tests; dev-server check, then
      `BASE_URL=http://localhost:3000 node test/e2e/axe.mjs` passes on `landing /`; KIRO_LOG row.
      Files: `docs/KIRO_LOG.md`
      Verify: as stated.

## FEAT-003: motion and the hero demo

- [ ] 16. Motion tokens: `motion` group in `design/system/tokens.json` (the 11 tokens of the design table, each with
      its usage text); `'motion'` added to the loop in `packages/web/scripts/gen-tokens.mjs` (line 79); run
      `pnpm -F @ninth/web tokens`; extend `test/tokens.test.ts` with an `MS-8.2` case (every motion token on `:root`
      with its value). Add the "Website" paragraph to `design/system/README.md` Motion (tier A1-A6, MS-8.3 bans, the
      motion tokens; the app sentence stays).
      Files: `design/system/tokens.json`, `packages/web/scripts/gen-tokens.mjs`, `packages/web/styles/tokens.css`
      (generated), `packages/web/test/tokens.test.ts`, `design/system/README.md`
      IDs: MS-8.2, MS-8.3; tasks 2, 2.1, 23.
      Verify: `pnpm -F @ninth/web test --run` — tokens.test.ts passes, including "matches the committed styles/tokens.css".

- [ ] 17. `components/site/motion.ts` (`SITE_MOTION_BOOT` exactly as design "Gating" 1, `msToken`,
      `autoplayDecision`, `splitInitialReveal`, `ARRIVAL_FALLBACK_MS = 1200`; pure) and `components/site/SiteMotion.tsx`
      (`'use client'`, renders `null`, one `useEffect`: reduce/no-observer branch, `splitInitialReveal` then
      `data-site-motion="on"`, one observer `rootMargin '0px 0px -10% 0px'`, `focusin` marking, `data-site-arrived`
      rules, `change` handling, cleanup). In `app/page.tsx` render the boot script as the first child of `.site` and
      `<SiteMotion />` last. New `test/site-motion.test.tsx`; add the MS-8.1 raw-boot-script case to `site.test.tsx`.
      Files: `packages/web/components/site/motion.ts` (new), `packages/web/components/site/SiteMotion.tsx` (new),
      `packages/web/app/page.tsx`, `packages/web/test/site-motion.test.tsx` (new), `packages/web/test/site.test.tsx`
      IDs: MS-6.3, MS-6.9, MS-8.1, MS-8.4, MS-8.7, MS-8.8; tasks 14, 14.1.
      Verify: `pnpm -F @ninth/web test --run` — site-motion.test.tsx and site.test.tsx pass.

- [ ] 18. Motion CSS in `site.css`, all inside `@media (prefers-reduced-motion: no-preference)` and under
      `[data-site-motion…]`: A1, A2 (`:not([data-site-arrived])`, A2 scoped to `.site-top`), the ninth-key
      `visibility` rule while `.site-demo.is-playing`, A3 ring transition with `var(--motion-ease-linear)`, the three
      A4 reveal rules and `@keyframes site-reveal`, A5 inside `@supports (animation-timeline: view())` with the nine
      frame keyframes and the desktop `--site-how` named timeline. A6 in `styles/globals.css` inside a no-preference
      block. Extend `test/site-css.test.ts` with the motion cases (MS-8.1 with R4 scope, MS-8.2 no bare durations or
      easing keywords, MS-8.3, MS-8.5, MS-8.6, MS-8.10, MS-5.5, MS-6.9, MS-8.4 rules).
      Files: `packages/web/components/site/site.css`, `packages/web/styles/globals.css`,
      `packages/web/test/site-css.test.ts`
      IDs: MS-5.5, MS-6.9, MS-8.1-8.6, MS-8.10; tasks 15, 15.1.
      Verify: `pnpm -F @ninth/web test --run` all green.

- [ ] 19. `KeypadDemo.tsx` per design "`KeypadDemo` changes": one observer when `IntersectionObserver` exists
      (thresholds `[0, 0.1, 0.6]`; stop under 0.1 for any play; autoplay timer at 0.6 then `autoplayDecision`),
      `acted`/`autoplayed` refs, Stop to the finished frame on button, out of view, hidden page or reduce `change`;
      button labels "Play the example" / "Play the example again" / "Stop" with hidden sizer copies; sentence, digits
      and chip sizers; announce only after a person's play; Hear it via `speak(…, { lang: 'en', voice: pickVoice(…,
      undefined, 'en') })` shown after `speechSupported()` in `useEffect`, disabled while playing; timings from
      `msToken` with `DEMO_STEP_FALLBACK_MS = 520`, `AUTOPLAY_DELAY_FALLBACK_MS = 1200`; visually hidden caption from
      content.md §1. New `test/keypad-demo.test.tsx`.
      Files: `packages/web/components/site/KeypadDemo.tsx`, `packages/web/test/keypad-demo.test.tsx` (new)
      IDs: MS-6.2-6.10, MS-8.9; tasks 16, 16.1.
      Verify: `pnpm -F @ninth/web test --run` — keypad-demo.test.tsx passes.

- [ ] 20. Motion steering: `accessibility.md` rule 5 append, `design-system.md` "Spooky, but calm" last sentence (text
      in design "Changes to other specs").
      Files: `.kiro/steering/accessibility.md`, `.kiro/steering/design-system.md`
      IDs: D6, D11; task 22 (part).
      Verify: `node scripts/validate-kiro-config.mjs`; tm-lint clean.

- [ ] 21. FEAT-003 verification and log: typecheck, web tests, axe on the dev server; open `/` with
      `reducedMotion: 'no-preference'` and check by hand (Playwright MCP) that the demo autoplays once and Stop works;
      KIRO_LOG row.
      Files: `docs/KIRO_LOG.md`

## FEAT-004: e2e and Lighthouse tooling

- [ ] 22. New `test/e2e/site.mjs` with every check of design "E2E … site.mjs" plus R2 (Tab order also at 820x1094),
      R3 (width and 8px in-group gaps) and R7 (size-pass contexts like `responsive.mjs`); `OFFLINE=1` runs only
      against production. CI: a step "Landing page" after "Phones and tablets" running
      `OFFLINE=1 node packages/web/test/e2e/site.mjs` with `if: ${{ !cancelled() }}`; job name lists it.
      Files: `packages/web/test/e2e/site.mjs` (new), `.github/workflows/ci.yml`
      IDs: MS-1.2, MS-1.3, MS-2.4-2.6, MS-3.2, MS-3.4, MS-6.3, MS-6.4, MS-6.10, MS-8.1, MS-8.4, MS-8.5, MS-8.7-8.10,
      MS-9.1, MS-9.4, MS-10.2-10.5, MS-10.7, MS-10.8, MS-11.2, MS-12.1-12.3, MS-13.2; task 17.
      Verify: dev-server check; `BASE_URL=http://localhost:3000 node test/e2e/site.mjs` and
      `ENGINE=webkit BASE_URL=http://localhost:3000 node test/e2e/site.mjs` end "all checks passed" (OFFLINE runs
      skipped with a note on the dev server). Fix the page, not the check, when a check fails for a real reason.

- [ ] 23. `axe.mjs` final targets: add `landing / (motion)` (`reducedMotion: 'no-preference'`, scroll to the end, wait
      1 s); `newContext` gets the motion option.
      Files: `packages/web/test/e2e/axe.mjs`
      IDs: MS-13.1; task 18.
      Verify: `BASE_URL=http://localhost:3000 node test/e2e/axe.mjs` passes.

- [ ] 24. Root `package.json`: `devDependencies.lighthouse: "13.6.0"`, `scripts.lighthouse: "node
      scripts/lighthouse.mjs"`; `pnpm install` (timeout 600000; updates `pnpm-lock.yaml`); README License line
      "Development only: Lighthouse 13.6.0 (Apache-2.0), not shipped."
      Files: `package.json`, `pnpm-lock.yaml`, `README.md`
      IDs: MS-11.4; task 19.
      Verify: `node -e "import('lighthouse').then(m=>console.log(typeof m.default))"` from the repo root prints `function`.

- [ ] 25. `scripts/lighthouse-lib.mjs` (`parseArgs`, `isDevServerHtml`, `median`, `pageBudgets` with `data:`/`blob:`
      skipped in the origin check, `checkTargets`, `renderReport`) and `scripts/lighthouse.mjs` (refuses a dev server,
      Playwright Chromium with a debugging port, 3 runs per preset, medians, budgets by `sessionTargetType`, worker line,
      `--write` between `<!-- lighthouse:start -->` / `<!-- lighthouse:end -->` in `docs/testing/performance.md`, exit
      codes); neither spells a build command. Fixtures `test/fixtures/lighthouse/dev.html` (saved from
      `curl -s http://localhost:3000/` script tags), `prod.html` (hashed names), `network-requests.json`; new
      `test/lighthouse-lib.test.ts`.
      Files: `scripts/lighthouse-lib.mjs`, `scripts/lighthouse.mjs`, `packages/web/test/lighthouse-lib.test.ts`,
      `packages/web/test/fixtures/lighthouse/{dev.html,prod.html,network-requests.json}` (all new)
      IDs: MS-11.1, MS-11.2, MS-11.4, MS-11.5; tasks 20, 20.1.
      Verify: `pnpm -F @ninth/web test --run` — lighthouse-lib.test.ts passes; `node scripts/lighthouse.mjs --url
      http://localhost:3000/` exits 2 with the development-server message.

- [ ] 26. Test docs: `tech.md` E2E row `<axe|keyboard|switch|spell|responsive|site>` and the Lighthouse Commands row;
      `accessibility.md` "How to check" `site.mjs` line; `docs/testing/README.md` Landing page row;
      `docs/testing/performance.md` "## Landing page (Lighthouse)" section with how to run (stop dev, build,
      `next start -p 3202`, `node scripts/lighthouse.mjs --write`) and empty markers. KIRO_LOG row.
      Files: `.kiro/steering/tech.md`, `.kiro/steering/accessibility.md`, `docs/testing/README.md`,
      `docs/testing/performance.md`, `docs/KIRO_LOG.md`
      IDs: D9, D11; tasks 22 (part), 24 (part), 25.
      Verify: `node scripts/validate-kiro-config.mjs`; tm-lint clean.

## FEAT-005: testing on every size, accessibility, Lighthouse

- [ ] 27. Full check against the dev server (task 26): from `packages/web` `site.mjs`, `axe.mjs`, `keyboard.mjs`,
      `switch.mjs`, `spell.mjs`, `responsive.mjs` (Chromium), then `ENGINE=webkit` for `responsive.mjs` and `site.mjs`;
      from the root `pnpm -r typecheck`, `pnpm -F @ninth/web test --run`, `node scripts/tm-lint.mjs <every changed
      file>`, `node scripts/validate-kiro-config.mjs`, `node scripts/check-kiro-not-ignored.mjs`. Record each command
      and result in `.agents/tasks/marketing-landing/verification.md`. `site.mjs` covers phone (320x568 to 412x783,
      sideways 874x330, 915x360), tablet (744x1047, 1133x658, 820x1094, 1180x734) and desktop (1280x900, 1440x1000,
      1920x1080).

- [ ] 28. Accessibility (task 27): run the `a11y-auditor` agent on `http://localhost:3000/` and `/app` (if it cannot be
      dispatched, do its method with the Playwright MCP: keyboard-only pass, 200% and 400% zoom, Day theme, reduced
      motion and motion on); report under `docs/a11y/`; fix serious findings, record the rest.

- [ ] 29. Ask before the build (task 28): `send_message` severity `warning`: "Lighthouse needs a production build.
      May I stop the dev server on :3000 (or will you stop it)?" Wait for the answer.

- [ ] 30. After the yes: stop the dev server; `pnpm -F @ninth/web build`; `pnpm -F @ninth/web exec next start -p 3202`
      in the background; from `packages/web` `BASE_URL=http://localhost:3202 OFFLINE=1 node test/e2e/site.mjs`; from
      the root `node scripts/perf-check.mjs --runs 3` and `node scripts/lighthouse.mjs --write`; stop `next start`;
      restart `pnpm dev` only on the person's word. Record the four mobile medians, desktop scores, page and worker
      byte lines in `docs/testing/performance.md` (the script writes it) and `verification.md`; report any missed target
      or budget to the product owner (D5 note).

- [ ] 31. Tick tasks 26-28 and any remaining boxes in `tasks.md`; KIRO_LOG row for the verification session.

## Digest

What I read, by file, with the block each step changes and the test that covers it. Not verified during planning:
the shell hung on `pnpm -F @ninth/web test --run` (400 s) and on several `ls`/`git status` calls, as in the setup
step; so "tests that pass today" is not confirmed here. The dev server at :3000 answered (HTML of the `/welcome` page
with `/_next/static/css/app/welcome/page.css?v=…`; dev assets are unhashed, the input for `dev.html`).

- `packages/web/app/page.tsx` (5 lines): `export default function Page() { return <CommunicationScreen />; }` → moves
  verbatim to `app/app/page.tsx` (+ `import '@/styles/app.css'`). Covered by routes.test.ts MS-1.2.
- `packages/web/app/welcome/page.tsx` (263 lines): `WelcomePage` with `site`, `site-hero` > `header.site-header`
  (brand `href="/welcome"`, nav 4 links, CTA `href="/"`), hero body, `main#main` sections how/proof/access/privacy/
  results/source, footer (`Built with Kiro…`, nav `/`). Uses `results.modelNotRun` (line ~205). Step 2 moves it to
  `/`; step 12 replaces it.
- `packages/web/app/layout.tsx`: imports `tokens.css`, `globals.css`, `components.css`, `'../styles/app.css'` (line 7,
  removed in step 2); `THEME_BOOT_SCRIPT` via `dangerouslySetInnerHTML` (pattern for the motion boot script);
  `<html … suppressHydrationWarning>`. Covered by mobile.test.tsx (reads layout by path) and routes.test.ts MS-11.3.
- `packages/web/app/about/page.tsx`: `<Brand href="/" />` (line 17), "Back to the keypad" `href="/"` (line 18),
  `href="/welcome"` "See the demo…" (line 33). Step 3. routes.test.ts MS-1.4.
- `packages/web/components/Footer.tsx`: `NOT_A_MEDICAL_DEVICE` (line 2-3); comment line 4; line 10 `href="/"` Back to
  the keypad; line 11 `href="/welcome"`. Step 3. footer.test.tsx.
- `packages/web/components/MenuSheet.tsx` line 113: `<a className="nl-btn nl-btn--secondary" href="/welcome">` How
  Ninth Life works. Step 3. routes.test.ts MS-1.5.
- `packages/web/next.config.mjs`: `additionalPrecacheEntries: [{ url: '/', … }, { url: '/about', … }, { url:
  '/welcome', … }, ...publicEntries()]` inside `withSerwistInit({…})`; `nextConfig` has `headers()` but no
  `redirects()`. Step 4. routes.test.ts MS-1.3, MS-2.2.
- `packages/web/app/sw.ts`: `fallbacks: { entries: [{ url: '/', matcher: ({ request }) => request.destination ===
  'document' }] }`. Step 4. routes.test.ts MS-2.3.
- `packages/web/public/manifest.webmanifest`: `"id": "/"`, `"start_url": "/"`, `"scope": "/"`. Step 4. MS-2.1.
- `packages/web/components/site/KeypadDemo.tsx` (128 lines): `STEP_MS = 520`; `stop`/`play` with `setInterval`; inline
  `div.nl-keypad.site-demo__pad` over `KEY_ROWS` with `nl-key site-demo__key is-pressed`; `hear()` uses
  `speechSynthesis` directly; button label switch; chips via `ProofChip` `match|typing`. Step 12 (picture), step 19
  (full). keypad-demo.test.tsx.
- `packages/web/components/site/site-data.ts` (148 lines): `REPO_URL`, `RESULTS_URL`, `METHOD_URL`, `DEMO_WORDS`,
  `readJson<T>(...parts)` (single path), `getDemoData()` (cached; reads `public/data/lexicon/en.v1.json` and
  `en.bigram.v1.json`), `getResults()` (reads `../eval/RESULTS.json`, `pct`, `modelNotRun`). Step 10.
  site-data.test.ts.
- `packages/web/components/site/site.css` (167 lines): `.site-header__cta { order: 3 }` and phone `order: 2` /
  `.site-nav { order: 3 }` (removed for R2); `.site-footer__nav { gap: 0 20px }` (R3); `.site-demo__pad` with
  `--nl-key` (removed); raw px values (24px brand, 22px lead, 18px band p, 28px padding). Step 13 rewrites, step 18
  adds motion. site-css.test.ts.
- `packages/web/scripts/gen-tokens.mjs` line 79: `for (const group of ['spacing', 'size', 'radius'])`. Step 16.
  tokens.test.ts.
- `packages/web/test/tokens.test.ts`: `buildTokensCss(tokens)`; "matches the committed styles/tokens.css". Step 16.
- `packages/web/test/footer.test.tsx`: expects `['How Ninth Life works', '/welcome']` twice and `['Back to the keypad',
  '/']`. Step 3.
- `packages/web/test/e2e/lib.mjs`: `newContext(browser, { theme, width, height, reducedMotion = 'reduce' })` with
  `serviceWorkers: 'block'` hard-coded; `openApp(page, path = '/')`. Step 6.
- `packages/web/test/e2e/axe.mjs` `TARGETS`: `app /`, `welcome /welcome`, `about /about`, `settings sheet on /`.
  Steps 6, 23.
- `packages/web/test/e2e/responsive.mjs` line 70: `page.goto(BASE_URL + '/', …)` for the rotate notice; line 82
  `openApp(page)`. Step 6. keyboard/switch/spell use `openApp(page)` and follow the default.
- `scripts/perf-check.mjs` lines 262, 305, 380: `page.goto(BASE_URL + '/', …)`. Step 6.
- `.github/workflows/ci.yml` line 90: `curl -sf -o /dev/null "$BASE_URL/welcome"`; e2e steps axe, keyboard, switch,
  responsive (line 105), perf report. Steps 6, 22.
- `.kiro/agents/a11y-auditor.json`: `prompt` and `welcomeMessage` say `default http://localhost:3000/`. Step 7.
- `.kiro/workflows/ship-feature.workflow.json` line 57: "Audit the Ninth Life app at http://localhost:3000/"; lines 43
  and 90 curl probes on `/` (may stay). Step 7.
- `package.json` (root): devDependencies typescript, vitest, fast-check, @types/node; no lighthouse. Step 24.
- `packages/web/vitest.config.ts`: jsdom, `include: ['test/**/*.test.{ts,tsx}']`, alias `@`. All new unit tests live
  under `packages/web/test/`.
- `@ninth/decoder` index exports `MODEL_PROFILES`, `isModelId`; `lib/speech.ts` exports `speechSupported`,
  `pickVoice(voices, uri?, lang = 'en')`, `speak(text, opts)` (returns boolean); `lib/rankingProvider.ts`
  `providerCopy()`.
- `.kiro/specs/web-ui/tasks.md`: last row is 55, so the new row is 56. `docs/README.md` ADR list ends at ADR-005
  (line 28). `README.md` has `## License` (line 63).
