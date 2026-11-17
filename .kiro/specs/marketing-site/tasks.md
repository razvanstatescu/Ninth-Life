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

## Round 3 (2026-11-12)

(landing review; product-owner answers W1-W6 in the ADR-006 amendment of
2026-11-12). Each builder adds its own tasks here.

- [x] R3-S1. Tokens: `container`, `measure`, `stage-s/m/l` and the `brand` type style in `design/system/tokens.json`,
      `styles/tokens.css` regenerated (`test/tokens.test.ts`)
- [x] R3-S2. Shared primitives in `site.css`, documented at its top: `.site-night`, `.site-head--center`,
      `.site-prose`, `.site-card` with the edge + `.site-card--note` (no `site-card--line`), stage tokens, `.site-cta`
      (every `nl-btn--xl` 64px), nav vs content links, the ink rule, raw measures on tokens; Privacy, Access, Limits
      and Source moved to the card classes (`test/site.test.tsx` "shared primitives", `test/site-css.test.ts`)
- [x] R3-S3. One brand lockup `.nl-brand` in `components.css`, used by `SiteBar`, `SiteFooter` and `Brand`
      (`AppHeader.tsx`, so `/app` too); `app.css` brand rules removed, app footer links `body` size and on tokens
      (`test/site.test.tsx`)
- [x] R3-S4. W2: `THEME_BOOT_SCRIPT` follows the device on first visits outside `/app` (`test/settings.test.ts`);
      `#start` is a Night band with the night sky and its primary in `.site-cta` (`test/site.test.tsx`); `applyLook`
      stores `nl-theme` only once a theme is chosen, so a visit to `/app` keeps W2 (`test/settings.test.ts`)
- [x] R3-S5. `SiteBar.tsx` (bar shared by `/` and `/about`); `SiteFooter` full-width rule, "How we measured" and
      "Report a problem", `home` and `statement` props (`test/site.test.tsx`, `test/about.test.tsx`)
- [x] R3-S6. W3: `/about` in the site look, "sent to" space fix, `rankingSentText()` (one list of what ranking
      sends), region and server-log lines, one copy of the intended-purpose sentence (`test/about.test.tsx`,
      `test/ranking-provider.test.ts`, `test/routes.test.ts` MS-1.4 and MS-11.3)
- [x] R3-S7. `.nl-skip` type on tokens (`globals.css`); requirements MS-1.4, 1.5, 4.4, 9.1, 11.3 and new MS-14;
      design.md "Round 3"; content.md §11, §12 and `/about`; ADR-006 amendment 2026-11-12 (W1-W6)
- [x] R3-SEO1. Site origin and per-page canonical/`og:url` (`lib/site-url.ts`, `components/site/seo.ts`, layout
      `metadataBase`), `/about` and `/app` titles and descriptions, `og:locale` `en_US` (MS-3.5, MS-3.6, MS-3.9;
      `test/seo.test.tsx`, `test/site.test.tsx` MS-3.5)
- [x] R3-SEO2. `/sitemap.xml` (404 with no origin) and the `Sitemap:` line; robots.txt keeps one `*` group, W5
      recorded in `app/robots.ts` (MS-3.6; `test/seo.test.tsx`, `test/routes.test.ts` MS-3.5)
- [x] R3-SEO3. Social card `public/social-card.png` from `scripts/gen-og.mjs`, not precached (MS-3.6; `test/seo.test.tsx`)
- [x] R3-SEO4. JSON-LD WebSite + WebApplication + FAQPage from `faqItems()` (exported by `Faq.tsx`), no Person (W6)
      (MS-3.7; `test/seo.test.tsx`)
- [x] R3-SEO5. One definition (`SITE_DEFINITION`) in the layout, manifest, JSON-LD, `/llms.txt` and README; `/llms.txt`
      (MS-3.8; `test/seo.test.tsx`)
- [x] R3-SEO6. `app/not-found.tsx`; `/app` visually hidden `h1`; `/app` first-paint layout shift fixed (`styles/app.css`
      first-paint rule, keypad measured before paint in `CommunicationScreen.tsx`) (MS-3.9; `test/seo.test.tsx`,
      Lighthouse on `/app`, `test/e2e/responsive.mjs`)
- [x] R3-SEO7. `scripts/lighthouse.mjs` reports Agentic Browsing with no target; `docs/testing/performance.md`
      (`test/lighthouse-lib.test.ts`)
- [x] R3-M1. W1 How runway: the desktop base layout is still (no sticky, cards 24px apart, no padding); the sticky picture
      and the runway (V30 top padding, 16svh gaps, bottom padding only for step 3) only under `[data-site-motion]` in
      the no-preference block; one-line lead under the `h2`; step sync unchanged (MS-8.12; `test/site-css.test.ts`,
      `test/e2e/site.mjs` step sync and the reduced-motion layout check)
- [x] R3-M2. How copy and picture: step 02 trimmed, the spelling line removed (Good to know keeps it), the dashed
      placeholder rows replaced by one faint "Sentences appear here" line (amends V36), roomier 64px key letters in the
      How screen (content.md §2; `test/site.test.tsx` MS-4.1, `test/e2e/site.mjs` MS-8.12 step 1 and step 2 checks)
- [x] R3-M3. Proof: DOM order head, figure, legend; grid areas from 1024px (no `order`); the shorter last line of the
      figure; the legend without the plus; "Your keys" as small keycaps; the button in a `.site-cta` row as a 64px
      secondary (content.md §3; `test/site.test.tsx` MS-7.9, MS-9.3, MS-8.4, MS-1.6; `test/e2e/site.mjs` layout check)
- [x] R3-M4. Conversation: a surface band; 288px stages; benefit-first `h3`s with the feature name as a small label in an
      `hgroup`; Show and Flip, Saved phrases and Spell and My words finished frames show the before and the after
      (amends V5-V7); the plus explained in the Spell card (content.md §4; `test/site.test.tsx` MS-7.4, MS-7.7,
      MS-10.9, MS-3.1)
- [x] R3-M5. `.site-step` weight and `.site-h2` line-height on tokens (`test/site-css.test.ts` MS-9.2 tokens only)
- [x] R3-B1. Results right after the proof check (`app/page.tsx` section list; MS-3.1) with the bands still alternating:
      Results and Access ground, Privacy surface (`test/site.test.tsx` MS-3.1 and "lower sections" band check)
- [x] R3-B2. Results: the simulated-typist caveat first, in a `site-card--note` under the numbers; the rest in
      `.site-prose`; the per-source line from `getResults().bySource` (RESULTS.md "By source"); a secondary xl "Open the
      app" `.site-cta` row last (content.md §7; MS-5.1, MS-5.4, MS-1.6; `test/site.test.tsx` MS-5.1, MS-1.6, "lower
      sections" Results, `test/site-data.test.ts`)
- [x] R3-B3. Good to know in three labelled groups, items word for word, the ranking item from `rankingSentText()`, a
      "Want to help test it?" issue link; a grid, no CSS columns (content.md §8; MS-4.5, MS-4.6; `test/site.test.tsx`
      MS-4.5)
- [x] R3-B4. Questions: 11 items from `faqItems()` (the FAQPage JSON-LD and `/llms.txt` keep reading it), new
      questions answered only with what the app does, "Something else? Ask on GitHub" (content.md §9; MS-3.4;
      `test/site.test.tsx` MS-3.4 and "lower sections" FAQ, `test/seo.test.tsx` FAQPage equality)
- [x] R3-B5. Privacy: the Model ranking card trimmed to two sentences with `rankingSentText()`; region, retention and log
      lines in a `.site-prose` list under the grid; "Check it yourself" links to `.kiro/steering/privacy.md` and
      `lib/decodeClient.ts` (content.md §6; MS-4.6; `test/site.test.tsx` MS-4.6, MS-10.9)
- [x] R3-B6. Access one-line lead; W1: below 600px the Access and Privacy stages hug their drawings (`site-grid--hug`,
      12px above and below) (content.md §5; MS-7.7; `test/site.test.tsx` "lower sections", `test/e2e/site.mjs` stage
      checks per row on phones and the hug check)
- [x] R3-B7. Source: `.site-prose` blocks, links stacked on phones, maker unnamed (W6) (content.md §10;
      `test/site.test.tsx` "lower sections" Source)
- [x] R3-H1. Hero copy: the `h1` is the promise "Type on 9 keys. Hear your sentence." (matches the `<title>`), "Ninth
      Life" as the brand line with the icon (48px phones, 64px from 600px), the lead starting "A free web app for typing
      to talk.", "See how it works" as a link beside the primary, the note under them (content.md §1; MS-3.1, MS-6.1;
      `test/site.test.tsx` MS-3.1, MS-6.1, `test/e2e/site.mjs` offline h1)
- [x] R3-H2. W1 phones: the demo's sentence, chips and label on the first screen at 390x844, the sentence bar starting on
      it at 320x640 (MS-6.2a; `test/e2e/site.mjs` "try it" fold checks)
- [x] R3-H3. Demo order: chips under the sentence with "Checked against the keys." and a link to `#proof`, the visible
      caption, Clear and Play last; demo 440px wide so the finished chips fit one row on desktop (content.md §1; MS-6.2;
      `test/site.test.tsx` MS-6.2, `test/keypad-demo.test.tsx` via `.site-demo__play`)
- [x] R3-H4. W1 bar: the nav from 960px, one row at every width, icon-only brand under 352px (`SiteBar.tsx` doc,
      `site.css` bar rules; MS-3.3; `test/site-css.test.ts` MS-3.3, `test/e2e/site.mjs` keyboard bar order at 820x1094
      and the one-row bar checks)
- [x] R3-H5. W4 try-it keypad: 12 real buttons (roving tabindex, arrows, digits/`*`/`#`/Backspace while focused, Clear),
      `components/site/try-engine.ts` loaded by dynamic import on the first press and the app's `loadDictionary()`
      after it; the app's composer and decoder; the result line visible and announced politely; a press stops the
      autoplay; "Play the example" goes back (content.md §1; MS-6.11 to MS-6.14, MS-7.2, MS-11.3;
      `test/keypad-demo.test.tsx` "try it", `test/site.test.tsx` MS-6.11 and MS-7.2, `test/e2e/site.mjs` "try it":
      nothing under `/data/` and no new script before the first press, 4663 → good/home/gone, keyboard, focus ring,
      no keypad movement, live region, reduced motion)
- [x] R3-H6. design.md "Round 3: hero, bar and the try-it keypad"; requirements MS-3.1, 3.3, 6.1, 6.2, 6.2a, 6.4, 6.7,
      6.10-6.14, 7.2, 11.3; screenshots in the review scratchpad (`shots/B-hero/`)
- [x] R3-V1. Verifier fixes (2026-11-13): a secondary xl "Open the app" `.site-cta` row ends Privacy, so a
      phone never goes ~14 screens without one (content.md §6; MS-1.6, MS-9.1; `test/site.test.tsx` MS-1.6,
      `test/e2e/site.mjs` mid-page rows); Good to know says "English only for now." like the FAQ (only an English
      dictionary and English word packs exist; content.md §8; `test/site.test.tsx` MS-4.5); the Source history line
      is the one sentence "Made for Kiroween 2026." (MS-4.7;
      content.md §10; `test/site.test.tsx` MS-4.7); the `/app` first-paint rule in `styles/app.css` checked
      against `chooseLayout()` (`test/layout.test.ts`)

### Round 3 polish (2026-11-13): the final review's fixes

- [x] R3-P1. The hero keypad never moves: one-line sentence and keys that show their end, the last 3 chips in one
      reserved row, the empty text at body size, the caption held to 3 lines in a reserved box (design.md "Round 3
      polish"; MS-6.10; `test/e2e/site.mjs` "try it steady" at all 14 sizes in Chromium and WebKit: key 1, Clear,
      4663, #, Clear, 43 0 6333 0 92837, an 8-word sentence; `test/keypad-demo.test.tsx`)
- [x] R3-P2. Key faces under 80px use the How rule (switch drawing, Touch 72px key, hero keys under 360px); the scan
      ring sits inside the switch tray (`site.css`; `test/e2e/site.mjs` drawings within their stages)
- [x] R3-P3. "My words" in the site copy: Proof legend, Spell card, FAQ, `/about` (content.md §3, §4, §9, `/about`;
      `test/site.test.tsx` MS-4.1)
- [x] R3-P4. After # the try-it line lists every match and marks the one on show (`try-engine.ts` `matches`,
      `shownIndex`; `KeypadDemo.tsx` `tryLine()`; MS-6.12; `test/keypad-demo.test.tsx` R3-P4, `test/e2e/site.mjs`)
- [x] R3-P5. The 404 page in the site look, title "Ninth Life: page not found" and its own description, still 404 and
      `noindex` (`app/not-found.tsx`; MS-3.9; `test/seo.test.tsx` MS-3.9 and R3-P5)
- [x] R3-P6. The footer is Night in both themes on `/`, `/about` and the 404 (lead decision extending W2; MS-14.2;
      `test/site.test.tsx` footer)
- [x] R3-P7. Results and `/llms.txt` name the measured provider and models and say Anthropic's Claude API (this
      build's ranking provider) has not been measured yet (lead decision amending D14; MS-5.3; content.md §7;
      `test/site-data.test.ts` R3-P7)
- [x] R3-P8. Smaller fixes: hero brand line off on phones; key 1/0/# feedback; no doubled full stop; chips write "I";
      Clear and Play on one row on phones; plain-word per-source line; caveat card as wide as the stat grid; footer
      statement in body type; "Free. Works offline. No account." in the close; the year in "Who made it"; the hero
      tray hugs its keys; the demo left-aligned 600-1023px; How step 3 stage hugs on phones (content.md §1, §7, §10,
      §11, §12; MS-4.4, 4.7, 10.5; `test/site.test.tsx`, `test/keypad-demo.test.tsx` R3-P8)
- [x] R3-P9. The canonical and `og:url` of `/` are `${origin}/`: no `metadataBase`, absolute URLs from `pageMetadata()`
      (MS-3.9; `test/seo.test.tsx` R3-P9, checked on the production build in landing-perf)
- [x] R3-P10. A secondary "Open the app" row ends Access (content.md §5; MS-1.6, MS-9.1; `test/site.test.tsx` MS-1.6,
      `test/e2e/site.mjs` mid-page rows)
- Not done here, by decision: Privacy cards of equal height (V38 stays); the Day visitor's jump into the Night app (as
  designed, W2); the GitHub links answer 404 until the product owner makes the repository public (release item G1).

## Round 4 (2026-11-13)
a visual and motion review on one shared language (design.md "Round 4: shared
language"). The other round-4 builders add their own tasks under this heading.

### Shared language (r4-language)
- [x] L1. `components/site/icons.tsx`: `SiteIcon` and 23 website icons as named path exports (the union of the round's
      proposals). The app's icons stay in `components/Icon.tsx`. (MS-7.1; `test/site-icons.test.ts`)
- [x] L2. Tokens: `motion-hint` 4px and `motion-grow` 600ms (for r4-results, PO-1), and `state-hover` 0.08 in a new
      `state` group. Changed `tokens.json`, `scripts/gen-tokens.mjs` and the generated `styles/tokens.css`, plus the
      README Motion, Iconography and Website drawings sections. (MS-8.2; `test/tokens.test.ts`)
- [x] L3. Shared primitives in `site.css`: the hover layer (A9), `.site-go`, `.site-tile`, `.site-fact`,
      `.site-key-panel`, the press ring v2, the A9 and A10 rules in the motion block, and the header list. Not built:
      `.site-card--link` (no section uses it). (MS-7.3, MS-8.14, MS-8.15; `test/site-css.test.ts`)
- [x] L4. The steering icon line in `.kiro/steering/design-system.md` (decisions §1.5).
- [x] L5. Spec: MS-7.1, MS-7.3, MS-8.2, the MS-8.11 rulings, MS-8.14 and MS-8.15; design.md "Round 4: shared
      language"; this list.
- [x] L6. Tests.
      - `test/site-icons.test.tsx`: 9 tests (the 24px grid with the stroke inside, no app icon repeated, the
        renderer, the app never importing the module).
      - `test/site-css.test.ts`: A9, A10, `.site-go`, the tiles, `.site-key-panel`, press ring v2, the header, and the
        keyframe list with Results' `site-grow`.
      - `test/tokens.test.ts`: the new tokens.
      - `test/e2e/site.mjs`: the control-feedback block, 21 checks, passing in Chromium and WebKit.
      - Also fixed on the way: a hovered ember link turned its label ink through globals' `a:hover` (now on-ember,
        MS-9.2).
      - The round-2 box-grid assertions in `site-css.test.ts` were updated by r4-boxes to its final grid. On the
        integrated page: `site-css.test.ts` 39/39, `site-icons.test.tsx` 9/9, `tokens.test.ts` 8/8; the full web
        suite 493/493.
      - Also: `.site-split` removed (unused); the steering lines on the retired A8 amended (accessibility.md rule 5,
        design-system.md "Spooky, but calm").

### The hero demo (r4-hero)
- [x] D1. `KeypadDemo.tsx` as a small app screen: the sentence card (the example's slots and the try chips, each word
      over its keys), the status line (the invitation after hydration, "Next:", the decoder's state), the 64px keypad,
      the toolbar (Play the example / Stop, Hear it, Clear); no caption, no check label, no "again". (MS-6.2, MS-6.4,
      MS-6.7, MS-6.10)
- [x] D2. `.site-icon-btn` + `.site-tip` in the shared part of `site.css` and its header list; the demo block, the keys'
      rules, the tooltip fade in the motion block, the tooltip's forced-colour edge, option T for 720-1023px tablets.
      (MS-6.15, MS-10.8)
- [x] D3. `try-engine.ts`: `TryView.next` (the readings # gives next). (MS-6.12)
- [x] D4. Keyboard: keys typed anywhere in the demo, and with nothing focused after a press in it (Safari); Escape hides
      the names; the autoplay waits for its Stop to be on screen. (MS-6.3, MS-6.16)
- [x] D5. Spec: MS-6.2, 6.2a, 6.3, 6.4, 6.7, 6.10, 6.12, 6.13, 6.15, 6.16, MS-10.8; design.md "Round 4: the hero demo";
      content.md §1.
- [x] D6. Tests: `keypad-demo.test.tsx` (43), `site.test.tsx` (MS-6.2, MS-4.1), the hero blocks of `e2e/site.mjs`, the
      try-it wait of `e2e/axe.mjs`.

### The end of the page: Good to know, Free and open source, the close, the footer (r4-close)
- [x] C1. `.site-caveat` in the shared block of `site.css` (an info icon and one sentence in ink, never fainter than
      its claim), built first for How, Results and Access. (MS-4.5a)
- [x] C2. Good to know: `sections/Limits.tsx` (the not-a-replacement lead; "Before you start" rows with `.site-tile`
      icons, a key and the approved sentence; "Testing so far" rows with Done / Not yet in words and border style;
      `LIMITS` for `/llms.txt`) and its `site.css` block. (MS-4.5)
- [x] C3. Free and open source dissolved: `sections/Source.tsx` deleted and dropped from `app/page.tsx`; the close's
      facts row (`sections/Start.tsx`, `START_FACTS`); "Is it free?" ends with the two "Why it is free" sentences
      (`Faq.tsx`, shape kept). (MS-3.1, amends D12)
- [x] C4. The footer: `SiteFooter.tsx` rebuilt (brand, promise and a secondary "Open the app"; Product, Trust and
      Project groups from `footerGroups()`; statement, `HISTORY_LINE` from `site-data.ts`, licence line, Back to top);
      `#top` on `/about` and the 404. (MS-4.4, MS-4.7, MS-9.1)
- [x] C5. `/about`: "Free and open source" and "Credits" (`#credits`). (MS-14.5)
- [x] C6. `/llms.txt`: the limits of Good to know and the history line (`llms.ts`). (MS-3.8)
- [x] C7. Spec: requirements MS-3.1, MS-3.8, MS-4.4, MS-4.5, MS-4.5a, MS-4.7, MS-9.1, MS-14.5; design.md "Round 4: the
      end of the page"; content.md §8 to §12 and `/about`.
- [x] C8. Tests: `site.test.tsx`, `about.test.tsx`, `seo.test.tsx`, the close and footer checks in
      `test/e2e/site.mjs`; the done list of the brief: typecheck, vitest (493 passed), tm-lint clean; the r4-close e2e
      block (104 checks, Chromium and WebKit), `axe`, `keyboard` and `responsive` in both engines. The full `site.mjs`
      run is the lead's, on the integrated page.
- [x] C9. `/llms.txt` gives RESULTS.md's own key-press figure as the page does ("1.00 key presses per character:
      letter mode saves no key presses."), not a "-0.0%" keystroke saving; the link reads "Full results" (r4-results).

### How it works (r4-how)
- [x] H1. The story row: `sections/How.tsx` (three `li` steps, each a stage with its scene and a `.site-step`, then
      one `.site-caveat`) and `pictures/HowScenes.tsx` (Press: keypad rows 1 and 2 and the digits; Pick: the status pill
      and the top 3 with the pick on Home; Speak: the card, Speak to Speaking, Show); `pictures/HowScreen.tsx` deleted;
      `KeypadPicture` `rows` prop; `getHowData` without the well texts, with sentence-case labels. (MS-7.4, MS-7.8)
- [x] H2. `SiteMotion.tsx` and `motion.ts`: the A8 step sync, `activeStep` and `howStart` removed; no replay helper
      (PO-2). (MS-8.12 removed, MS-8.13)
- [x] H3. `site.css`: the shared `.site-step` (title-only steps on any element, `--site-step-num`, lit by A7 inside a
      root or by `[data-play-scope]` + `:has()` beside one), the How blocks (one column, the stage beside its text from
      600px, one row from 1024px, chevrons), the story-order offsets; the A8 block, the runway and the stage heights of
      round 2 removed. (MS-7.7, MS-8.11, MS-10.9)
- [x] H4. Spec: MS-7.4, MS-7.7, MS-7.8, MS-8.12 (removed), MS-8.13, MS-10.9 and the round-4 note; design.md "Round 4:
      How it works" (A8 retired); content.md §2.
- [ ] H5. Tests: `site.test.tsx`, `site-css.test.ts`, `site-motion.test.tsx`, `site-data.test.ts` and the How checks of
      `test/e2e/site.mjs`; the done list of the brief (typecheck, vitest, tm-lint, e2e in Chromium and WebKit).

### The proof check (r4-proof)
- [x] P1. `site-data.ts` `getProofExample`: `keyLetters` from `KEY_LETTERS`; it throws when a word does not have one
      letter per key or when the dropped letter is on the key pressed there; `proofCanLine` and `proofNeverLine`
      replace `proofSaidLine`. (MS-7.6, MS-7.9)
- [x] P2. `pictures/ProofCheck.tsx` (new; `Pictures.tsx` deleted): one grid; the five drawn keys with their letters on a
      keypad panel; per word its ProofChip and its letters under the keys; the dropped letter boxed with an x; the two
      closing lines led by the chips' icons; the play steps of design.md "Round 4: the proof check". (MS-7.2, MS-7.9,
      MS-9.3)
- [x] P3. `sections/Proof.tsx`: the head, then the layout as the one `data-play` root (figure, the four `.site-step`
      steps with their lit numbers, the note and the button); the legend removed; `site.css` proof blocks (subgrid,
      600px and 1024px layouts, 360px fit, forced colours). (MS-8.4, MS-8.11, MS-10.5, MS-10.9)
- [x] P4. Spec: MS-7.6, MS-7.9, MS-8.11 (the proof root), MS-9.3, MS-10.5, MS-10.9 and the round-4 note; design.md §3,
      A4, R2.4 and "Round 4: the proof check"; content.md §3.
- [x] P5. Tests: `site.test.tsx`, `site-data.test.ts`, the two proof assertions of `site-css.test.ts`, and the proof
      checks of `test/e2e/site.mjs` (layout, tall root, the numbers in step with the figure). Typecheck, vitest (493
      tests) and tm-lint pass; the proof's e2e checks pass in Chromium (run alone, 33 checks). The full e2e suites in
      Chromium and WebKit are the lead's integrated run.

### Measured, not promised (r4-results)
- [x] R1. `site-data.ts` `getResults`: `words`, `ghost.pressesPerChar`, `dict.wordAcc` and `bySource.{aac,turk}.items`,
      each left out when missing or invalid; the helpers `barShare`, `scanMarks`, `pressExample` and `modelStatus`
      (`modelRunsLine` is built from `modelStatus`, so `/llms.txt` reads the same values). (MS-5.1, MS-5.3, MS-5.4)
- [x] R2. `sections/Results.tsx`: the caveat first (`.site-caveat`, with the not-yet-tested limit), the paired bars
      for the three measures, the by-source card, the presses-and-scan-steps card, the model-ranking status rows and
      the `.site-go` links. There is no lead with results (the phone budget). (MS-5.1-5.5)
- [x] R3. `site.css` Results block: `.site-meter` (16px, 4px corners, a `--site-piece` track, ink and line-strong
      fills), the subgrid chart, the cards, the status rows and forced colours. The bars grow once (`site-grow`,
      `motion-grow`, ending 1,140 ms after the trigger; PO-1). (MS-5.5, MS-8.11)
- [x] R4. Spec: MS-5.1, MS-5.3, MS-5.4 and MS-5.5, the MS-8.11 Results roots and the round-4 note; design.md §7, A4
      and Build-time data; content.md §7 (every figure with its RESULTS.md line).
- [x] R5. Tests: `site-data.test.ts` (the new fields, the helpers, `modelStatus`); `site.test.tsx` (the Results
      structure, bar length = printed value, grow timing ≤ 1,600 ms, the MS-5.1 allowed set, A4 steps, note cards);
      `test/e2e/site.mjs` (the Results bars and the caveat first).

### The box sections: Conversation, Access, Privacy (r4-boxes)
- [x] B1. The grids: a lead card per section (They said; One or two switches, first in Access's DOM; On your device)
      and `.site-bento--3` / `--4` rows whose cards share their lines (subgrid); stage sizes `--lead` and `--m`; all
      three sections hug on phones; the `--play-i` column rules (at most 2). (MS-7.7, MS-8.11, MS-10.9)
- [x] B2. The thirteen drawings redrawn in the shared language (`pictures/{Conversation,Access,Privacy}.tsx`): arrows
      from cause to result, keys on key panels (the Night bug), press ring v2, at most three changes at one instant;
      Privacy's dashed outline with its three ways out; the switch types the demo's first key. (MS-7.3-7.5, MS-7.8)
- [x] B3. Copy (content.md §4-§6): shorter lines with the same facts; the approved sentence "Only three features send
      words or speech off this device: model ranking, online voices and Listen." checked against every network call;
      the simulator limit in Phones, tablets and laptops; `id="accessibility"` on the note; icons on every card name.
      (MS-4.1, MS-4.5a, MS-12.4)
- [x] B4. The ranking card's sent list as real text from `rankingSentText()`, drawn in the stage after the `h3` in the
      DOM, and the card's line no longer repeats it; the privacy facts as `.site-fact` rows in a note card. (MS-4.6,
      MS-7.2, MS-7.10)
- [x] B5. Spec: MS-4.6, MS-7.2, MS-7.4, MS-7.5, MS-7.7, MS-7.8, MS-7.10, MS-8.11, MS-10.9, MS-12.4 and the round-4 note;
      design.md "Round 4: the box sections"; content.md §4-§6.
- [x] B6. Tests: `site.test.tsx` (the box parts of MS-7.4, MS-7.7, MS-8.11, MS-7.3, MS-7.10, MS-10.9, MS-4.6, the
      reveal steps, the note cards, the hug rule), `site-css.test.ts` (the four box-grid assertions, with the lead's
      leave), `ranking-provider.test.ts` (the §6 entry), `e2e/site.mjs` (per-row stages, the hug, cards per row, the
      switch lead).

## Round 5: one place for each fact (2026-11-17)

- [x] C1. Order How, Proof, Conversation, Access, Privacy, Results, Good to know, Questions, the close; re-alternate
      the bands (`app/page.tsx`, the sections' band classes).
- [x] C2. Say each fact once: drop How's and Access's caveats, the Results caveat's people sentence, Good to know's
      Model ranking row and six FAQ questions; update Access for laptops and They said for quick replies and reply
      types (content.md "Round 5").
- [x] C3. Fix the bar to the top of every website page; drop the four mid-page "Open the app" rows.
- [x] C4. Privacy: the map, then one card of rows; remove the door drawings and their CSS; share `.site-rows`.
- [x] C5. Details: soft lift in stages, ember-only scan ring, label type for drawn numbers, How's code tracking,
      `/about` spacing and naming.
- [x] C6. Tests: `site.test.tsx`, `site-css.test.ts`, `ranking-provider.test.ts`, `e2e/site.mjs`.

