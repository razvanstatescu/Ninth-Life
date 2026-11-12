# Tasks: marketing-site

Requirements: `requirements.md`. Design: `design.md`. Copy: `content.md`. Decision: ADR-006.
Work on `main` in this checkout; never run `next build` while `pnpm dev` runs (only task 28 builds, after a yes).
No formatter over files. Each task leaves `pnpm -r typecheck` and `pnpm -F @ninth/web test --run` passing.

## Foundations
- [x] 1. ADR-006 (route move, manifest, worker, website motion tier, ember per viewport, orientation) and this spec
      (design phase, 2026-11-10; revised after the first and second design reviews)
- [x] 2. Motion tokens: the `motion` group in `design/system/tokens.json` (design.md table), `'motion'` added to the
      shared loop in `packages/web/scripts/gen-tokens.mjs`, then `pnpm -F @ninth/web tokens` (MS-8.2)
  - [x] 2.1 `test/tokens.test.ts`: every motion token is on `:root` with its value; the committed `tokens.css` still
        equals the generator output (MS-8.2)

## Route move (app to `/app`)
- [x] 3. `app/app/page.tsx` renders `<CommunicationScreen />` and imports `@/styles/app.css`; `app/layout.tsx` drops
      the `app.css` import; `app/about/page.tsx` imports it (MS-1.2, MS-11.3)
- [x] 4. Links: `/about` brand and "Back to the keypad" to `/app`, "See the demo…" to `/`; `Footer.tsx` "Back to the
      keypad" `/app`, "How Ninth Life works" `/` and its comment; `MenuSheet.tsx` "How Ninth Life works" `/`
      (MS-1.4, MS-1.5)
  - [x] 4.1 `test/footer.test.tsx` updated to the new hrefs (MS-1.5)
- [x] 5. Delete `app/welcome/`; `redirects()` in `next.config.mjs` (`/welcome` to `/`, permanent); `app/robots.ts`
      (MS-1.3, MS-3.5)
- [x] 6. `manifest.webmanifest` `start_url` `/app`; precache `/`, `/app`, `/about` (no `/welcome`); `app/sw.ts`
      document fallback `/app` and its comment (MS-2.1, MS-2.2, MS-2.3)
- [x] 7. `test/routes.test.ts`: `force-static`, `Page().type === CommunicationScreen`, redirect, links, manifest,
      precache, fallback, tooling URLs, robots, safe areas, CSS imports (MS-1.1, MS-1.2, MS-1.3, MS-1.4, MS-1.5,
      MS-1.7, MS-2.1, MS-2.2, MS-2.3, MS-3.5, MS-10.6, MS-11.3); the MS-10.6 safe-area case is added with the
      landing page's `site.css` (plan step 14)
- [x] 8. Tooling to `/app`: `test/e2e/lib.mjs` `openApp` default and the `serviceWorkers` option of `newContext`
      (default `'block'`), `responsive.mjs` (both `goto`), `axe.mjs` app and settings targets,
      `scripts/perf-check.mjs` (3 `goto`), `.github/workflows/ci.yml` readiness probe `$BASE_URL/app` (MS-1.7)
- [x] 9. `.kiro/agents/a11y-auditor.json` default route `/app` and the website motion check;
      `.kiro/workflows/ship-feature.workflow.json` audit URL `/app`; `node scripts/validate-kiro-config.mjs` passes
      (MS-1.7)

## Landing page
- [x] 10. `components/site/site-data.ts`: `readJson` with the repo `data/` fallback, `getHowData`, `getProofExample`
      (throws when no word is dropped), `getResults` with validation and `modelRuns: { sizes, count }` from
      `RESULTS.llm.json` (`runs` is an object; `isModelId` and one provider via `MODEL_PROFILES`; no names kept),
      `modelRunsLine`, `ISSUES_URL`, `NOTICE_URL`; `modelNotRun` removed (MS-5.1, MS-5.2, MS-5.3, MS-6.2, MS-7.4,
      MS-7.6)
  - [x] 10.1 `test/site-data.test.ts`, with a fixture in the real `RESULTS.llm.json` shape and one test on the real
        file (MS-5.1, MS-5.2, MS-5.3, MS-6.2, MS-7.4, MS-7.6)
- [x] 11. `KeypadPicture.tsx` and `Pictures.tsx` (`HowFrames`, `ProofFrames`, `ScanFrames`, `ShowFrames`,
      `SaidBubble`, `RankingSwitch`, `OfflineChip`): our classes, tokens and `Icon` only, `aria-hidden`, nothing
      focusable, no ember fill (the chosen sentence is `surface-sunken`, `line-strong` border and a check icon),
      key size as an inline `--nl-key` on `.nl-keypad` from the exported `KEY_DRAWING_SIZE` and `HERO_KEY_SIZE`
      (so the app's XL setting cannot override it), the tighter `.site-pad`, last frame is the finished state
      (MS-7.1, MS-7.2, MS-7.3, MS-7.4, MS-7.5, MS-9.3, MS-10.5, MS-10.8)
- [x] 12. `SiteHeader.tsx`, `sections/*.tsx`, `SiteFooter.tsx` and `app/page.tsx` (`force-static`, `metadata`, the
      boot script through `dangerouslySetInnerHTML`, which lands with task 14), with the copy of `content.md` word for word, `data-reveal`
      on exactly the blocks of design.md A4 (in `proof` and `source`: `div.site-head` and
      `div.site-proof__more` / `div.site-source__more`, never the column wrappers; no marked block inside
      another) and `--reveal-i` 0-2 on sibling cards, `providerCopy()` and
      `NOT_A_MEDICAL_DEVICE` used, never retyped (MS-1.1, MS-1.6, MS-3.1-3.5, MS-4.1-4.8, MS-5.1-5.5, MS-6.1,
      MS-7.1, MS-8.4, MS-9.1, MS-13.3)
- [x] 13. `site.css`: bar (`.site-brand` 56px target, flex-wrap and gaps, the phone rule `.site-bar .nl-btn {
      padding: 0 var(--space-4); font-size: var(--type-label-size); }`), hero Night sky and the 64px hero button
      override, the short landscape rule, every section's phone, tablet and desktop layout (Ways to type grid
      `minmax(288px, 1fr)`), footer, safe areas, tokens only, no ember backgrounds, no `--nl-key` and no
      `.site-demo__pad` rule, `cursor: default` on drawn candidates, `.site-key { cursor: default; }` and
      `.site-key:active { box-shadow: none; }`, no `order` anywhere (the bar keeps DOM order brand, nav, CTA and
      wraps in it, R2), every standalone link `inline-flex` with `min-height` and `min-width` `var(--target-min)`
      and link groups at `gap: var(--space-2) var(--space-6)`, the footer on tokens (R3), tablet and desktop hero
      padding on tokens (R6), frame labels at the `label` size (R5) (MS-3.3, MS-6.1, MS-7.2, MS-9.1, MS-9.2,
      MS-9.3, MS-9.4, MS-10.1-10.8, MS-13.2)
  - [x] 13.1 `test/site.test.tsx` (the MS-8.1 boot-script case lands with task 14), including the copy check against `content.md` (with the §9 answers and the
        literal fragments of strings with `{…}`, R1), the banned-claims check, the
        trademark and brand check (tm-lint spawned, its word list over rendered text, labels and file names),
        the proof-state check, the no-nested-reveal check and the key-size constants of design.md (MS-1.6,
        MS-3.1-3.5, MS-4.1-4.8, MS-5.1, MS-5.4, MS-6.1, MS-6.2, MS-7.1, MS-7.2, MS-7.4, MS-8.1, MS-8.4, MS-9.3,
        MS-10.5, MS-10.8, MS-11.3, MS-13.3)

## Motion
- [x] 14. `components/site/motion.ts` (`SITE_MOTION_BOOT`, `msToken`, `autoplayDecision`, `splitInitialReveal`) and
      `SiteMotion.tsx` (reveal observer, `focusin` marking, preference listener, `data-site-arrived` after the
      first arrival or at once when motion is off, `ARRIVAL_FALLBACK_MS`); the boot script is the first child of
      `.site` (MS-6.9, MS-8.1, MS-8.4, MS-8.7, MS-8.8)
  - [x] 14.1 `test/site-motion.test.tsx`, including a `focusin` inside an unrevealed block marking it `instant`
        and unobserving it, and `data-site-arrived` staying set after reduce and back (MS-6.3, MS-6.9, MS-8.1,
        MS-8.4, MS-8.7, MS-8.8)
- [x] 15. Motion CSS: arrival fades A1-A2 under `[data-site-motion]:not([data-site-arrived])` (A2 scoped to
      `.site-top`), every easing a `var(--motion-ease-*)` token (no bare `linear`), the ninth-key `visibility` rule during play,
      reveals A4 (hidden, `:focus-within` and revealed rules), scroll-linked frames A5 with the nine frame
      keyframes, all inside `prefers-reduced-motion: no-preference` and `[data-site-motion]`; the cross-fade A6 in
      `globals.css` (MS-6.9, MS-8.1-8.6, MS-8.10)
  - [x] 15.1 `test/site-css.test.ts` (MS-3.3, MS-5.5, MS-6.9, MS-7.2, MS-7.3, MS-7.5, MS-8.1, MS-8.2, MS-8.3,
        MS-8.4, MS-8.5, MS-8.6, MS-8.10, MS-9.1, MS-9.2, MS-10.1, MS-10.5, MS-10.7, MS-10.8)
- [x] 16. `KeypadDemo.tsx`: one observer whenever `IntersectionObserver` exists (stop under 10% for any play; the
      autoplay timer at 60%, then `autoplayDecision`), Stop to the finished frame (button, out of view, hidden
      page, reduce), `KeypadPicture` with `size={HERO_KEY_SIZE}`, `ninth` always true and `is-playing` on `.site-demo`, sizers, announce
      only for a person's play, Hear it through `lib/speech.ts` with `lang: 'en'` and `pickVoice`, token timings
      with fallbacks (MS-6.2-6.10, MS-8.9)
  - [x] 16.1 `test/keypad-demo.test.tsx` (MS-6.2-6.10)

## End-to-end checks
- [x] 17. `test/e2e/site.mjs` (sizes with the fold and bar-height printouts and the 80px bar check at 360x668,
      the XL key-size pass at 320x568 and 1280x900, size-pass contexts built like `responsive.mjs` (R7),
      MS-10.4 width and height and an 8px or larger gap inside each link group (R3), bar Tab order at 1280x900
      and 820x1094 (R2), motion with `scrollIntoView` before the autoplay step, the
      Tab-into-a-hidden-block step, MS-8.9, no-JS, the two privacy runs with the no-dialog check, routes,
      keyboard and `OFFLINE=1` runs of design.md); a CI step "Landing page" running
      `OFFLINE=1 node packages/web/test/e2e/site.mjs` (MS-1.2, MS-1.3, MS-2.4, MS-2.5, MS-2.6, MS-3.2, MS-3.4,
      MS-6.3, MS-6.4, MS-6.10, MS-8.1, MS-8.4, MS-8.5, MS-8.7, MS-8.8, MS-8.9, MS-8.10, MS-9.1, MS-9.4,
      MS-10.2-10.5, MS-10.7, MS-10.8, MS-11.2, MS-12.1, MS-12.2, MS-12.3, MS-13.2)
- [x] 18. `test/e2e/axe.mjs`: `landing /`, `landing / (motion)` after scrolling to the end, `app /app`,
      `about /about`, `settings sheet on /app` (MS-13.1)

## Lighthouse
- [x] 19. Root `package.json`: `devDependencies.lighthouse` `13.6.0`, `scripts.lighthouse`; `pnpm install`; README
      License line "Development only: Lighthouse 13.6.0 (Apache-2.0), not shipped." (MS-11.4; data-licenses rule 5)
- [x] 20. `scripts/lighthouse-lib.mjs` (`parseArgs`, `isDevServerHtml`, `median`, `pageBudgets` with `data:` and
      `blob:` skipped in the origin check, `checkTargets`, `renderReport`; no build command in either file) and
      `scripts/lighthouse.mjs` (dev-server refusal, Playwright Chromium on a debugging port, 3 runs per preset,
      medians, page budgets by `sessionTargetType` with the worker on its own line, `--write` into
      `docs/testing/performance.md`, exit codes); run it once against the dev server on `:3000` and expect exit 2
      (MS-11.1, MS-11.2, MS-11.4, MS-11.5)
  - [x] 20.1 `packages/web/test/lighthouse-lib.test.ts` with `test/fixtures/lighthouse/dev.html` (saved from the dev
        server) and `prod.html` (hashed chunk names), a `network-requests` fixture with one `data:` and one
        `blob:` item, `checkTargets` cases and the no-build source check (MS-11.1, MS-11.2, MS-11.4, MS-11.5)

## Specs, steering and docs (D10, D11)
- [x] 21. `web-ui` requirements 5.1, 11 (scope and 11.3), 14.3, 23.4, 25.6 and the introduction; `web-ui` design
      (diagram, offline); `web-ui` tasks new row; text as in design.md "Changes to other specs"
- [x] 22. Steering: `structure.md`, `product.md` (Devices), `accessibility.md` (rule 5 and `site.mjs` in "How to
      check"), `design-system.md` ("Spooky, but calm"), `tech.md` (`site` in the E2E row, Lighthouse command)
- [x] 23. `design/system/README.md` Motion: the website tier, the bans and the motion tokens (MS-8.2, MS-8.3)
- [x] 24. Docs: `docs/architecture/web.md` route map, `docs/testing/README.md` (layers, Landing page row, "The
      website"), `docs/testing/performance.md` precache notes, `docs/plan/01-implementation-plan.md` (F12 note, F21),
      `docs/README.md` ADR list, ADR-003 scope note
- [x] 25. `docs/KIRO_LOG.md`: one row per implementation session (`node scripts/kiro-log.mjs add …`)

## Verify
- [x] 26. With the dev server on :3000, from `packages/web`: `site.mjs`, `axe.mjs`, `keyboard.mjs`, `switch.mjs`,
      `spell.mjs`, `responsive.mjs` (Chromium, then `ENGINE=webkit` for `responsive.mjs` and `site.mjs`); from the
      root `pnpm -r typecheck`, `pnpm -F @ninth/web test --run`, `node scripts/tm-lint.mjs <changed files>`,
      `node scripts/validate-kiro-config.mjs`, `node scripts/check-kiro-not-ignored.mjs`
- [x] 27. `a11y-auditor` on `http://localhost:3000/` and `/app`; fix serious findings, record the rest (MS-13)
- [x] 28. Production check, after the person says yes to stopping the dev server: build, `next start -p 3202`,
      `OFFLINE=1 node test/e2e/site.mjs`, `node scripts/perf-check.mjs --runs 3`, `node scripts/lighthouse.mjs
      --write` (it must not refuse `:3202`, which confirms the dev-server detector on a real production server);
      stop the server; restart `pnpm dev` on their word; report the scores, the page and worker byte lines (this
      is the D5 measurement, moved here from the design phase) and any missed target or budget to the product
      owner (MS-2.4, MS-2.6, MS-11.1, MS-11.2, MS-11.4, MS-11.5)

## Round 2: played sequences, How step sync, a drawing in every box (2026-11-11)
Decisions V1-V17 (`.agents/tasks/marketing-landing-v2/decisions.md`), ADR-006 amendment of 2026-11-11, design.md
"Round 2" (R2.1-R2.9), full design `.agents/tasks/marketing-landing-v2/design.md`. Same rules as above: no build while
`pnpm dev` runs (only task 44 builds, after a yes), no formatter, each task leaves typecheck and the web tests passing.

- [x] 29. Design phase: decisions V1-V17, the ADR-006 amendment, MS-7.3-7.10, MS-8.5, MS-8.11-8.13, MS-10.8, MS-10.9,
      MS-11.6, design.md "Round 2", content.md §2-§6 (2026-11-11); revised after the design review (V18-V24; MS-7.2,
      MS-7.7, MS-7.9, MS-7.10, MS-8.3, MS-8.11-8.13, MS-10.8, MS-10.9) and after the second review (V25-V31; the
      "Play line" glossary entry, MS-7.3, MS-7.7, MS-7.9, MS-8.11, MS-8.12, content.md §2 and §6, ADR-006 A7 and A8)
      Revised after the third review (V32-V35): `shouldPlay` (the "Play line" entry, MS-8.11, ADR-006 A7), MS-8.12
      (from 632px; the step that became active), MS-8.13 scoped to `data-play` roots, tuple step tables.
- [x] 30. Tokens `motion-state`, `motion-nudge`, `motion-play-lead`, `motion-frame`, `motion-frame-quick`,
      `motion-sweep` in `design/system/tokens.json`, then `pnpm -F @ninth/web tokens` (MS-8.2)
  - [x] 30.1 `test/tokens.test.ts`: `MS-8.2 the round-2 motion tokens are on :root with their values`
- [x] 31. `lib/rankingProvider.ts`: export `RANKING_SENT` (the four items of content.md §6) (MS-7.10)
  - [x] 31.1 `test/ranking-provider.test.ts` (new): `MS-7.10 RANKING_SENT maps to codes, lattice, beams and
        context.partner` (items 1-4 in that order, each field filled by `buildRequest`; `v`, `lang`, `mode`, `k` not
        listed; `context.recent` is `[]`)
- [x] 32. `site-data.ts`: `getHowData()` for `4663` (`typing`, `sentences`, `chosen`, throws, digits-only fallback),
      `getSpellExample()`, `proofSaidLine()` (MS-7.8, MS-7.9)
  - [x] 32.1 `test/site-data.test.ts`: `MS-7.8 getHowData returns the decoder's well texts and top 3 for 4663 with home
        chosen`, `MS-7.8 getHowData throws when home is not in the top 3`, `MS-7.8 getSpellExample is Mihai 64424 and
        throws when the dictionary has it`, `MS-7.9 proofSaidLine names the matches and the dropped word`
- [x] 33. `motion.ts` (`splitInitialPlay` with the no-box rule, `shouldPlay`, `activeStep`, `howStart` returning
      `'live' | 'deferred' | 'finished'`) and `SiteMotion.tsx` (the two play observers, play area and top line, with
      one handler; the step observer with the deferred start; `data-how-live`; `still()` and `move()` changes;
      cleanup) (MS-8.11, MS-8.12, MS-8.13, MS-8.8)
  - [x] 33.1 `test/site-motion.test.tsx`: `MS-8.11 a drawing reaching the play line gets data-played=1 once`, `MS-8.13
        splitInitialPlay marks drawings in view or above at mount instant`, `MS-8.13 a hidden drawing at mount is not
        marked instant`, `MS-8.13 nothing in view changes when motion starts`, `MS-8.13 reduce during a play marks every
        drawing instant and nothing replays after no-preference`, `MS-8.12 activeStep counts the tops at or above the
        middle line`, `MS-8.12 data-how-step follows the middle line and data-how-play only marks a new highest step`,
        `MS-8.11 shouldPlay waits for the whole box above the play line`, `MS-8.11 both play observers use shouldPlay
        and unobserve once played`, `MS-8.12 howStart is live below the fold, deferred in view with no active step,
        finished otherwise`, `MS-8.12 a How picture below the fold at mount is live and starts at step 0`, `MS-8.12 a
        How picture in view at mount with no active step plays from step 1`, `MS-8.12 a How picture with a step
        already active at mount never plays`
- [x] 34. `site.css`, additions only (the A5 rules stay until the drawings that use them are replaced, tasks 35-38):
      the role rules, step classes `.site-k0`-`.site-k12` and `.site-u0`-`.site-u13`, `.site-late`, play classes,
      `--play-lead` on `:is([data-play], .site-how__picture)` from `--play-i`, the `--play-i` column rules, `.site-cell`, `.site-stage`, `.site-key-ring`, `.site-grid--boxes`
      (`.site-grid--2` stays until task 39 moves its last user), the Access bento with `.site-card--tall` and its growing stage (R2.2, R2.5); fill
      `backwards` only on drawing play rules (MS-8.10, MS-8.11, MS-7.7, MS-10.9)
  - [x] 34.1 `test/site-css.test.ts`: `MS-8.11 role and step rules only inside no-preference and [data-site-motion="on"]`,
        `MS-8.11 drawing play rules fill backwards only` (scoped to `[data-play]`, `[data-how-play]` and
        `.site-how__picture [data-s` selectors; A1, A2, A4 untouched), `MS-7.5 base role rules show the finished state`,
        `MS-10.9 the Access bento places the switch card without order`, `MS-10.9 site-grid--boxes has 2 columns from
        648px`, `MS-8.11 the play lead uses --play-i, never --reveal-i`
- [x] 35. `pictures/roles.ts` (`KStep`, `UStep`, `Span`, `role` with the `'late'` ring, `play`, `lastChangeMs`), the
      `rings` prop on `KeypadPicture` (`late?`), and `pictures/HowScreen.tsx` (`part` `'all'` | 1 | 2 | 3, the `TYPING`
      table, two rings on key 6, "Press a key to start" in `label` type); `sections/How.tsx` with the sticky picture
      (no `data-play`) and the per-step stages (416, 288, 160px, wrapping well); in `site.css` the How desktop contexts
      with `data-how-live`, the per-`data-s` `--play-step`, `--site-how-h` as the picture's `block-size` and in the
      steps' top padding, the short-window sticky top, the active-step outline and the two-span label, and remove the
      How scroll timeline (`timeline-scope`, `view-timeline: --site-how`) and the How frame-count case; step 1 copy of
      content.md §2 (MS-7.3, MS-7.4, MS-7.7, MS-7.8, MS-8.12, MS-10.9, MS-4.1)
  - [x] 35.1 `test/site.test.tsx`: replace the `HowFrames` frame-count case with `MS-8.12 the desktop How picture has no
        data-play and the per-step stages each have one`, and add `MS-7.3 a repeated key press is two rings, the second
        late`; `test/site-css.test.ts`: `MS-8.12 How parts take --play-step from their data-s and the not-reached rules
        need data-how-live`, `MS-8.12 the How steps' top padding uses --site-how-h from 1024px`
- [x] 36. `ProofCheck` in `Pictures.tsx` (4 digit lines, each with 5 sweep boxes from the `SWEEP` table; the
      `DIGIT_LINE` and `CHIP` tables; the caption's `nl-sr-only` "Your keys: …" with the visible label and digit grid
      `aria-hidden`) and `sections/Proof.tsx`; remove the proof figure's own A5 rules from `site.css` (its
      `view-timeline` and frame classes; the shared `site-frame-*` keyframes stay until task 38) (MS-7.2, MS-7.6,
      MS-7.9, MS-8.5, MS-9.3)
  - [x] 36.1 `test/site.test.tsx`: replace the `ProofFrames` cases with `MS-7.9 the proof figure keeps its accessible
        text, adds the closing line and has no frame labels` (caption text exactly "Your keys: 92837", digit grid
        `aria-hidden`) and `MS-7.9 every digit line holds 5 sweep boxes and no box
        sits outside a digit line`
- [x] 37. `pictures/Conversation.tsx` (`SaidStrip`, `ShowFlip`, `PhraseSave`, `WordAdd`) and the stages in
      `sections/Conversation.tsx` with `.site-grid--boxes`; remove the Show drawing's own A5 rules from `site.css` (its
      timeline and frame classes; the shared keyframes stay until task 38) (MS-7.1-7.5, MS-7.7, MS-7.8, MS-8.5,
      MS-10.9)
  - [x] 37.1 `test/site.test.tsx`: replace the `ShowFrames` and `SaidBubble` cases with the Conversation part of
        `MS-7.4 the round-2 drawings are present`
- [x] 38. The drawn computer key in `design/system/README.md` ("Website drawings"); `pictures/Access.tsx` (`KeyLegend`,
      `TouchSizes`, `ScanPlay` with `.site-scan__rings`, `ThemeHalves`, `LayoutBoxes`), `TOUCH_MIN_SIZE` and
      `TOUCH_XL_SIZE` in `KeypadPicture.tsx`, `LayoutBoxes` at 36, 72 and 96px wide with 14px labels, stages in
      `sections/Access.tsx` (switch card `.site-card--tall`); this is
      the last drawing that used `.site-frames`, so remove the rest of A5 here: every scroll-timeline property, the
      `site-frame-*` keyframes, `.site-frames` and its frame classes, the scan named timeline (MS-4.3, MS-7.1-7.5,
      MS-7.7, MS-8.5, MS-10.8, MS-10.9)
  - [x] 38.1 `test/site-css.test.ts`: `MS-8.5 no scroll-timeline property anywhere`, and the old A5 cases removed;
        `test/site.test.tsx`: replace the `ScanFrames` case with the Access part of `MS-7.4 the round-2 drawings are
        present`, and `MS-10.8 the Touch keys use TOUCH_MIN_SIZE and TOUCH_XL_SIZE`
- [x] 39. `pictures/Privacy.tsx` (`DeviceBoundary`, `RankingSides`, `VoiceRows`, `ListenStrip` with its three labels
      in one cell) and stages (288px) in `sections/Privacy.tsx` with `.site-grid--boxes`; remove `.site-grid--2` (MS-4.6, MS-4.8, MS-7.1-7.5,
      MS-7.7, MS-7.10, MS-10.9)
  - [x] 39.1 `test/site.test.tsx` for tasks 35-39: `MS-7.7 every box card starts with a stage holding one data-play
        drawing`, `MS-7.4 the round-2 drawings are present` (all 13 plus How and proof; replaces the `RankingSwitch` and
        `OfflineChip` cases), `MS-8.11 every drawing's last change is at most 4000 ms`, `MS-8.11 every step class used on
        the page has a CSS rule`, `MS-7.3 no ember fill and at most one ember ring per step`, `MS-7.10 the ranking
        drawing lists RANKING_SENT with no count and the voice lines match the Voices card`, `MS-10.9 Conversation and
        Privacy use site-grid--boxes and the switch card is site-card--tall`, `MS-4.1` copy against content.md,
        `MS-11.6 the page markup is at most 15 KB gzip` (record today's figure in a comment first; if the page is over
        15 KB, stop and report)
- [x] 40. Steering and design system text: `accessibility.md` rule 5 and `design-system.md` "Spooky, but calm" name
      played sequences and How step sync; `design/system/README.md` Motion paragraph lists A7 and A8 and drops A5;
      `.kiro/agents/a11y-auditor.json` website motion check; `node scripts/validate-kiro-config.mjs` (MS-8.3, MS-8.11)
- [x] 41. `test/e2e/site.mjs`: step sync at 1280x800, 1920x1080 and 1024x768 down and up (MS-8.12); `MS-8.12 How plays
      every step from the top on tall viewports` at 1024x1366 and 1920x1200; `MS-8.12 step 1 plays with the whole How
      picture in view` at 1366x650, 1024x768 and 1280x800; `MS-8.11 tall drawings play in view` at 320x568 and 375x667
      (40px scroll steps; when a How stage or the proof figure gets `data-played="1"`, its top is at -40px or more and
      its bottom inside the viewport); "Press a key to start" on one line at 320px and 1024px (MS-7.7); a reload at
      `#access` shows the drawings in view finished with no animation (MS-8.13); each drawing finished with no animations
      4.5 s after the play line (MS-8.11); reduced motion finished states and no animations (MS-8.7); no overflow in any
      stage, the How stages, the desktop How picture or the proof figure at the 14 sizes and with XL keys, and `MS-7.7
      stages in a section have equal heights` (MS-7.7); CLS 0 while drawings play (MS-11.2); every `.nl-key` 64-84px
      except Touch 72 and 128px (MS-10.8); 2 cards per row in Conversation and Privacy at 1280x800 and 1920x1080, the
      tall card's last child within 24px of its inner bottom at 1280x800 and 768x1024, Tab order in the bento (MS-10.9);
      the A5 checks removed
- [x] 42. Docs: `docs/testing/README.md` (the website motion checks), `docs/KIRO_LOG.md` rows
      (`node scripts/kiro-log.mjs add …`)
- [x] 43. Verify with the dev server on :3000 as task 26 (Chromium, then `ENGINE=webkit` for `site.mjs` and
      `responsive.mjs`), `node scripts/tm-lint.mjs <changed files>`; `a11y-auditor` on `/` (MS-13); VoiceOver reads the
      proof caption as "Your keys: 92837" (MS-7.9); a screenshot of the Access section at 768x1024 in the verification
      report, for the product owner to judge the tall switch stage (V10 stands; the alternative in the full design
      4.3 needs their yes)
- [x] 44. Production check as task 28, after the person says yes to stopping the dev server; report the scores and
      byte lines against the estimates in design.md R2.7 (MS-11.1, MS-11.2, MS-11.6)
