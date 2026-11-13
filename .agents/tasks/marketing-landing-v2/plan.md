# Implementation plan: landing page round 2 (played sequences, How step sync, a drawing in every box)

Source of truth: `design.md` (revision 3) and `decisions.md` (V1-V31) in this folder, the spec in
`.kiro/specs/marketing-site/` (MS-7.3-7.10, MS-8.5, MS-8.11-8.13, MS-10.8, MS-10.9, MS-11.6; design "Round 2"
R2.1-R2.9; tasks 30-44; content.md §2-§6, already updated in the design phase) and the ADR-006 amendment of
2026-11-11. Each step below maps to one spec task row and names the requirement IDs and the tests that carry them.
Repo: `/Users/razvanstatescu/Documents/Work/Ninth-Life`, branch `main`, round-1 work uncommitted in the tree. **No
commit, no push** (the user asked; `tech.md` rule 3). No formatter over any file. No `next build` while the dev
server runs.

## Baseline (measured 2026-11-11 during planning)

- `pnpm -r typecheck`: passes.
- `pnpm -F @ninth/web test --run`: 335 of 336 pass. The one failure is expected: `site.test.tsx` "MS-4.1 the page
  shows the copy of content.md" fails because content.md §2-§6 already holds the round-2 copy (step 1 text, the
  drawing text). It turns green at step 11, when the last drawing lands. Every step must leave **every other** web
  test and the type check passing.
- Shell quirks seen in this checkout: `git status` / `git add` hang unless run as
  `git --no-optional-locks -c core.fsmonitor=false …`; vitest run in the foreground of the agent shell hung, so run
  tests with output to a file (`pnpm -F @ninth/web test --run > /tmp/nl-web.log 2>&1; echo exit $? >> /tmp/nl-web.log`)
  and read the file.
- Dev server: `http://localhost:3000/` answered 200 during planning, `/app` answered 404 once (first compile or a
  stale server). The e2e steps must confirm both `/` and `/app` answer 200 first and pause to ask if not.

## Decision taken in this plan (the last design review)

The third design review (`design-review.md`, CHANGES_REQUESTED, 0 HIGH, 2 MEDIUM, 4 NIT) arrived after the design
loop was closed. The plan closes the findings that would otherwise make code wrong or tests fail, with the reviewer's
own fixes. None of them changes a product call (V1's 30% line and "plays once where the visitor sees it" stand):

- Finding 1 (MEDIUM): use the reviewer's `shouldPlay` (whole box on screen; a short drawing also above the line; a
  tall one in view or covering the play area from the top), so a drawing entered from above never plays with only
  its bottom edge on screen. Recorded as V32.
- Finding 2 (MEDIUM): scope MS-8.13 to `data-play` roots, the desktop How picture follows MS-8.12. V33.
- NIT 3: type the step tables as tuples and `diffAt` as `0 | 1 | 2 | 3 | 4` (`noUncheckedIndexedAccess` is on). V34.
- NIT 4: MS-8.12's last sentence gets "from an inner height of 632px", and the deferred clause plays "the step that
  became active". V35.
- NITs 5 and 6 are prose only (the ring dip, the 34px line); fixed in design.md text, no code effect.

## How the steps are grouped for the workflow

FEAT files in `task-landing-round2/` (context in `task-landing-round2/context.json`), run in this order in the one
checkout: FEAT-001 = steps 1-6 (foundations), FEAT-002 = steps 7-8 (How and proof), FEAT-003 = steps 9-11 (the 13
box drawings, the end of A5), FEAT-004 = steps 12-14 (e2e, steering, docs, Kiro log). Step 15 is the verification
and review loop; step 16 is the workflow's Lighthouse step.

## Steps

- [ ] 1. Record the review-3 resolutions in the docs (no code).
      Add V32-V35 to `decisions.md`; in `design.md` replace the `shouldPlay` body in 3.3 with the reviewer's
      version and its callback notes, scope the 3.3 mount bullet to `data-play` roots, write the tuple tables in
      3.2/4.2, fix the 4.1 Step 3 row (34px line, 152px) and the ring-dip sentence; in `requirements.md` change the
      "Play line" glossary entry, MS-8.11 ("its whole box between the top of the viewport and the line, or, for a
      drawing too tall for that, its whole box on screen or its top at the top of the viewport with its bottom at or
      below the line"), MS-8.12 (the 632px clause, "the step that became active") and MS-8.13 (scoped to `data-play`
      roots); the same edits in the spec `design.md` R2.2 `shouldPlay` sentence and the ADR-006 amendment A7 bullet;
      a line under tasks.md task 29 "revised after the third review (V32-V35)".
      Files: `.agents/tasks/marketing-landing-v2/decisions.md`, `.agents/tasks/marketing-landing-v2/design.md`,
      `.kiro/specs/marketing-site/requirements.md`, `.kiro/specs/marketing-site/design.md`,
      `.kiro/specs/marketing-site/tasks.md`, `docs/decisions/ADR-006-landing-page-at-root.md`.
      Requirements: MS-8.11, MS-8.12, MS-8.13. Tests: none (docs).
      Verify: `node scripts/tm-lint.mjs <the six files>` exits 0.

- [ ] 2. Tokens (task 30). Append `motion-state` 200ms, `motion-nudge` 8px, `motion-play-lead` 300ms,
      `motion-frame` 600ms, `motion-frame-quick` 400ms, `motion-sweep` 240ms to the `motion.tokens` array in
      `design/system/tokens.json`, after `motion-reveal-distance` and before the two easings (usage text as in
      design.md 3.1), then `pnpm -F @ninth/web tokens`. Add the six names to the exact list in the existing
      `MS-8.2 emits every motion token on :root with its value` case (same order) and a new case
      `MS-8.2 the round-2 motion tokens are on :root with their values`.
      Files: `design/system/tokens.json`, `packages/web/styles/tokens.css` (generated),
      `packages/web/test/tokens.test.ts`.
      Requirements: MS-8.2. Tests: `test/tokens.test.ts` (both MS-8.2 cases, and "matches the committed
      styles/tokens.css").
      Verify: `pnpm -F @ninth/web test --run test/tokens.test.ts` passes.

- [ ] 3. `RANKING_SENT` (task 31). Export
      `RANKING_SENT = ['Your keys', 'The dictionary words that match them', "Ninth Life's own best guesses", "The other person's last line"] as const`
      from `lib/rankingProvider.ts` with a comment naming the request fields. New
      `test/ranking-provider.test.ts`: `MS-7.10 RANKING_SENT maps to codes, lattice, beams and context.partner`
      (call `buildRequest(['4663'], [['home','good']], 'Tea?', 'letter', 5, [['home']])`, assert `codes`, `lattice`,
      `beams`, `context.partner` are filled, `context.recent` is `[]`, the keys of the request are exactly
      `v, lang, mode, codes, lattice, beams, context, k`, and the four items appear in that order in the Privacy
      card copy of content.md §6 and the §9 answer, lower-cased).
      Files: `packages/web/lib/rankingProvider.ts`, `packages/web/test/ranking-provider.test.ts` (new).
      Requirements: MS-7.10. Tests: the new file.
      Verify: `pnpm -F @ninth/web test --run test/ranking-provider.test.ts` passes.

- [ ] 4. Build-time data (task 32). In `site-data.ts`: `HowData` becomes
      `{ code: '4663'; typing: [string, string, string, string]; sentences: string[]; chosen: number }` with
      `getHowData()` decoding each prefix 4, 46, 466, 4663 the way `getDemoData` does (`decodeGhost` k 1, else
      `lexicon.completions(code, 1)[0]`), sentence-cased with `sentenceCase`; `sentences` = top 3 of
      `decodeGhost(['4663'], k 3)`; `chosen` = index of "home"; throws when the dictionary is loaded and
      `encodeWord('home')` or `encodeWord('good')` is not `4663` or "home" is not in the top 3; with no dictionary
      returns digits only (`typing` "4", "4 6", "4 6 6", "4 6 6 3", `sentences` [], `chosen` −1). New
      `SpellExample` + `getSpellExample()` (`{ word: 'Mihai', code: encodeWord('mihai') }`, throws if the code is not
      `64424` or `dictionary().lexicon` has "mihai"; check the `Lexicon` API in `@ninth/core` for the membership
      call). New `proofSaidLine(proof)` → `Can be spoken: water, waves. Never spoken: wafer.` New
      `finishedKeys(demo)` → `demo.proof.map(p => p.code).join(' ')` ("4 6333 92837"). `ProofExample.reject.diffAt`
      typed `ProofColumn = 0 | 1 | 2 | 3 | 4`, narrowed once (throw if out of range) (V34). Replace the
      `MS-7.4 every How it works sentence encodes to 44` case in `test/site-data.test.ts` with the four task-32.1
      cases. `sections/How.tsx` still passes `how.sentences` to `HowFrames` until step 7 (type-compatible).
      Files: `packages/web/components/site/site-data.ts`, `packages/web/test/site-data.test.ts`.
      Requirements: MS-7.8, MS-7.9. Tests: `MS-7.8 getHowData returns the decoder's well texts and top 3 for 4663 with
      home chosen`, `MS-7.8 getHowData throws when home is not in the top 3` (inject a fake lexicon through a
      test-only parameter, as `getResults(read)` does), `MS-7.8 getSpellExample is Mihai 64424 and throws when the
      dictionary has it`, `MS-7.9 proofSaidLine names the matches and the dropped word`.
      Verify: `pnpm -F @ninth/web test --run test/site-data.test.ts` passes; `pnpm -r typecheck` passes.

- [ ] 5. Motion logic (task 33). In `motion.ts` add `splitInitialPlay`, `shouldPlay` (the V32 body), `activeStep`,
      `howStart` with the signatures of design.md 3.3. In `SiteMotion.tsx`, inside the existing `move()`/`still()`
      pair: before `root.dataset.siteMotion = 'on'`, run `splitInitialPlay` over `[data-play]:not([data-played])`
      (instant → `data-played="instant"`), read `activeStep` and `howStart` once (only on the first `move()`), then
      create the play-area observer (`rootMargin '0px 0px -30% 0px'`, `threshold [0, 1]`), the top-line observer
      (`'0px 0px -100% 0px'`, `0`) with one handler (`shouldPlay(entry.boundingClientRect, innerHeight)` → set
      `data-played="1"`, unobserve from both), and the step observer (`'-50% 0px -50% 0px'`, `0`) over
      `.site-how__step` that writes `data-how-step`, `data-how-live`, `data-how-play` on `.site-how` as 3.3 says.
      Create each new observer **only when its targets exist** and **before** the reveal observer, so the existing
      tests' `lastObserver()` is still the reveal observer. `still()` disconnects all, sets every `[data-play]` to
      `instant`, removes the three How attributes, sets `seen` 3. Cleanup disconnects all.
      Files: `packages/web/components/site/motion.ts`, `packages/web/components/site/SiteMotion.tsx`,
      `packages/web/test/site-motion.test.tsx`.
      Requirements: MS-8.8, MS-8.11, MS-8.12, MS-8.13. Tests: the 13 task-33.1 cases in `site-motion.test.tsx`
      (fixtures: `[data-play]` divs with `data-top`/`data-bottom`, a `data-nobox` one whose mocked
      `getClientRects()` has length 0, and a `.site-how` with a `.site-how__picture` and three `.site-how__step`;
      mock `getBoundingClientRect` to return `top` and `bottom`, and `getClientRects` on `HTMLElement.prototype`).
      Extend `MS-8.11 shouldPlay waits for the whole box above the play line` with the reviewer's cases (216px box at
      667: top 300 false, top 250 true, top −200 false; 520px box at 568: top 10 true, top 0 true, top −300 false,
      top 20 true; bottom ≤ 0 false).
      Verify: `pnpm -F @ninth/web test --run test/site-motion.test.tsx` passes (old and new cases).

- [ ] 6. The shared drawing kit (task 34, plus the helpers of tasks 35 and 38). New `components/site/pictures/roles.ts`
      (`KStep`, `UStep`, `Span`, `PlayClass`, `role`, `play`, `lastChangeMs`; overloads as design.md 3.2).
      `KeypadPicture.tsx`: `KeyRing` and the optional `rings` prop (one `div.site-key-ring` with
      `role('ring', k, u, late)` inside the key's `div.nl-key`), constants `KEY_DRAWING_XL_SIZE = '84px'`,
      `TOUCH_MIN_SIZE = 'var(--key-min)'`, `TOUCH_XL_SIZE = 'var(--key-xl)'`, and a single-key drawing
      `KeyPicture({ id, size, rings?, className? })` that sets `--nl-key` inline on its own wrapper (outside
      `.nl-keypad`, so `[data-keysize="xl"] .nl-keypad` cannot reach it). `site.css` additions (A5 stays for now):
      base role rules outside every at-rule, the finished state of design.md 3.2
      (`.site-out, .site-during, .site-ring { opacity: 0; }`; `.site-in`, `.site-rise`, `.site-mark` keep the
      default opacity 1), `.site-cell`, `.site-stage` (heights per section via modifier classes from tokens),
      `.site-key-ring`, `.site-drawn-btn { position: relative }`, `.site-drawing .nl-candidate { cursor: default }`,
      `.site-grid--boxes` (1 column, 2 from 648px), the Access bento (`.site-card--tall` grid placement from 648px and
      1024px, growing stage), and inside the existing `no-preference` block: step classes `.site-k0`-`.site-k12`
      (`--k`), `.site-u0`-`.site-u13` (`--u`), the four `.site-play--*` (`--play-step`),
      `:is([data-play], .site-how__picture) { --play-lead: calc(var(--motion-play-lead) + var(--play-i, 0) * var(--motion-state)); }`,
      the `--play-i` column rules in the grid media queries, the before-play rules and the play rules of 3.2 with
      fill `backwards`, three `@keyframes` (`site-in`, `site-out`, `site-rise`). The ring's late press: declare
      `--late: calc(var(--motion-jump) * 0)` on `.site-ring` and `.site-ring.site-late { --late: var(--motion-jump); }`
      and add `+ var(--late)` to the ring's `site-in` delay; never write `0ms` (the MS-8.2 test bans unit literals in
      `site.css`). Tests: in `site-css.test.ts` widen the MS-8.2 var allow-list from `--(motion|reveal-i)` to
      `--(motion|reveal-i|play-lead|play-step|k|u|late)\b` and add the six task-34.1 cases; the fill test selects rules
      whose selector matches `/\[data-play|\[data-how-play|site-how__picture/`. New `test/site-roles.test.ts`:
      `MS-8.11 role and play build the step classes` and `MS-8.11 lastChangeMs adds the lead, the step and the change`.
      In `site.test.tsx` add `MS-11.6 the page markup is at most 15 KB gzip` (`zlib.gzipSync(renderToStaticMarkup(<HomePage />))`)
      and write today's measured size in its comment **before** any drawing lands; if it is already over 15 KB, stop
      and report (V24).
      Files: `packages/web/components/site/pictures/roles.ts` (new), `packages/web/components/site/KeypadPicture.tsx`,
      `packages/web/components/site/site.css`, `packages/web/test/site-css.test.ts`,
      `packages/web/test/site-roles.test.ts` (new), `packages/web/test/site.test.tsx`.
      Requirements: MS-7.5, MS-7.7, MS-8.2, MS-8.10, MS-8.11, MS-10.9, MS-11.6. Tests: `MS-8.11 role and step rules
      only inside no-preference and [data-site-motion="on"]`, `MS-8.11 drawing play rules fill backwards only`,
      `MS-7.5 base role rules show the finished state`, `MS-10.9 the Access bento places the switch card without
      order`, `MS-10.9 site-grid--boxes has 2 columns from 648px`, `MS-8.11 the play lead uses --play-i, never
      --reveal-i`, the two roles cases, `MS-11.6 …`; all old site-css cases still pass.
      Verify: `pnpm -F @ninth/web test --run` (only MS-4.1 fails, as at baseline) and `pnpm -r typecheck` pass.

- [ ] 7. How it works (task 35; needs 4-6). New `pictures/HowScreen.tsx` (`{ how: HowData; part: 'all' | 1 | 2 | 3 }`,
      `TYPING` as a tuple mapped with its index into `how.typing`, rings on keys 4, 6, 6 (`late`), 3 through
      `KeypadPicture rings`, "Press a key to start" in `label` type, rows only when `how.sentences.length`, the chosen
      overlay, Speak/Speaking in one `.site-cell`; every animated part carries `data-s`; drawn Speak is
      `nl-btn--secondary`, never primary). `sections/How.tsx`: step 1 text of content.md §2; the picture
      `.site-how__picture` keeps `data-reveal`, holds `HowScreen part="all"`, **no `data-play`**; each step card holds
      `div.site-stage.site-how__stage` (`aria-hidden`) with `HowScreen part={n}` as a `data-play` root with
      `play('type' | 'sweep' | 'frame')`; the step label becomes a `.site-cell` with the plain span and
      `.site-step__key`. `site.css`: the How desktop block (`--site-how-h`, `block-size`, sticky top, the short-window
      rule, the steps' gap and `max()` top padding, `min-height` removed), the per-`data-s` `--play-step`, the
      not-reached and play contexts (with `data-how-live`), the outline `::after` and label layer with its
      transition, stage heights 416/288/160px, the wrapping stage well; remove the How scroll timeline
      (`timeline-scope: --site-how`, `view-timeline: --site-how`, the `.site-frames--how` timeline rule) and
      `HowFrames` from `Pictures.tsx`. Tests: in `site.test.tsx` drop the `#how .site-frames--how` line of MS-7.4,
      change the MS-10.8 pad count from 5 to 4 (hero, How picture, How stage 1, scan), add `MS-8.12 the desktop How
      picture has no data-play and the per-step stages each have one` and `MS-7.3 a repeated key press is two rings,
      the second late`; in `site-css.test.ts` drop the two `--site-how` expectations of the MS-8.5 case and add
      `MS-8.12 How parts take --play-step from their data-s and the not-reached rules need data-how-live` and
      `MS-8.12 the How steps' top padding uses --site-how-h from 1024px`.
      Files: `packages/web/components/site/pictures/HowScreen.tsx` (new), `packages/web/components/site/sections/How.tsx`,
      `packages/web/components/site/Pictures.tsx`, `packages/web/components/site/site.css`,
      `packages/web/test/site.test.tsx`, `packages/web/test/site-css.test.ts`.
      Requirements: MS-4.1, MS-7.3, MS-7.4, MS-7.7, MS-7.8, MS-8.12, MS-10.9. Tests: as listed.
      Verify: web tests (only MS-4.1 may still fail, now on a later string) and typecheck pass.

- [ ] 8. The proof figure (task 36; needs 4 and 6). `ProofFrames` becomes `ProofCheck` in `Pictures.tsx`
      (`figure.site-proof` gets `data-play` and `play('sweep')` in `sections/Proof.tsx`; the figcaption holds the
      `nl-sr-only` "Your keys: {proof.keys}" and the `aria-hidden` label and 5-digit grid with its 5 sweep boxes;
      one `li` per word with the chip cell (real `ProofChip` `role('in', CHIP[row])` and the `aria-hidden` typing chip
      `role('out', CHIP[row])`), the `aria-hidden` letters/digits grid with its digit line `role('rise',
      DIGIT_LINE[row])`, the 5 boxes `SWEEP.map(span => role('ring', ...span))`, the diff box and `x` icon
      `role('mark', SWEEP[proof.reject.diffAt][0])`; then `p.site-proof__said` (`proofSaidLine`) and the "For
      example" line, both `role('in', 12)`, outside `aria-hidden`). Tables are tuples (V34). Remove the proof's frame
      labels and its own frame CSS (`.site-frames--proof …`, `.site-checks*`, `.site-frame__label` if no other user).
      Tests: in `site.test.tsx` replace the proof parts of MS-7.2, MS-7.4 and MS-9.3 (the reject chip, the boxed digit
      at index `diffAt` among the wafer line's `.site-digit` spans, its `li` holds wafer) and add `MS-7.9 the proof
      figure keeps its accessible text, adds the closing line and has no frame labels` and `MS-7.9 every digit line
      holds 5 sweep boxes and no box sits outside a digit line`.
      Files: `packages/web/components/site/Pictures.tsx`, `packages/web/components/site/sections/Proof.tsx`,
      `packages/web/components/site/site.css`, `packages/web/test/site.test.tsx`.
      Requirements: MS-7.2, MS-7.6, MS-7.9, MS-8.5, MS-9.3. Tests: as listed.
      Verify: web tests (only MS-4.1 may fail) and typecheck pass.

- [ ] 9. Conversation drawings (task 37; needs 4 and 6). New `pictures/Conversation.tsx` with `SaidStrip`,
      `ShowFlip`, `PhraseSave`, `WordAdd` (design.md 4.4 rows; sentence and keys from `finishedSentence(demo)` and
      `finishedKeys(demo)`, the spell chip from `getSpellExample()`; real `ProofChip` `new` and `match` states inside
      the `aria-hidden` drawing). `sections/Conversation.tsx`: `site-grid--boxes`, a 216px `.site-stage` first in each
      card; `app/page.tsx` passes the keys and the spell example. Remove `SaidBubble`, `ShowFrames`, `ShowCard` and the
      Show A5 use from `Pictures.tsx` and the `.site-said` CSS. Class names must not contain "phone", "handset" or
      "device" (MS-4.3 test). Tests: replace the `.site-frames--show` and `.site-said` lines of MS-7.4 with the
      Conversation part of `MS-7.4 the round-2 drawings are present`.
      Files: `packages/web/components/site/pictures/Conversation.tsx` (new), `packages/web/components/site/sections/Conversation.tsx`,
      `packages/web/components/site/Pictures.tsx`, `packages/web/app/page.tsx`, `packages/web/components/site/site.css`,
      `packages/web/test/site.test.tsx`.
      Requirements: MS-7.1-7.5, MS-7.7, MS-7.8, MS-10.9. Tests: as listed.
      Verify: web tests (only MS-4.1 may fail) and typecheck pass.

- [ ] 10. Access drawings and the end of A5 (task 38; needs 6). Add "Website drawings" (the drawn computer key) to
      `design/system/README.md` first. New `pictures/Access.tsx`: `KeyLegend`, `TouchSizes` (two `KeyPicture` keys at
      `TOUCH_MIN_SIZE` and `TOUCH_XL_SIZE`, class `site-key--touch`), `ScanPlay` (keypad plus `.site-scan__rings`
      overlay with `--row1`-`--row3`, `--key7`, `--key8`, `--key9`, and the drawn switch), `ThemeHalves` (scoped
      `data-theme="night"`/`"day"` halves, `KeyPicture` at `KEY_DRAWING_SIZE` and `KEY_DRAWING_XL_SIZE` in one cell),
      `LayoutBoxes` (36/72/96px boxes, 14px labels; classes `--upright`, `--landscape`, `--wide`). `sections/Access.tsx`:
      stages first, switch card `site-card--tall`. Remove `ScanFrames` and **all remaining A5**: the
      `@supports (animation-timeline: view())` block, the nine `site-frame-*` keyframes, `.site-frames`, `.site-frame*`
      rules and the scan named timeline. Tests: `site-css.test.ts` replaces the MS-8.5 case with `MS-8.5 no
      scroll-timeline property anywhere`, replaces the `.site-frames` MS-7.5 case (now covered by `MS-7.5 base role
      rules…`), points the MS-7.2 cursor check at `.site-drawing .nl-candidate`, lowers MS-8.10's keyframe count to the
      real one (site-fade-in, site-reveal, site-in, site-out, site-rise plus globals.css) and asserts those names;
      `site.test.tsx` replaces the scan line of MS-7.4 with the Access part, and adds `MS-10.8 the Touch keys use
      TOUCH_MIN_SIZE and TOUCH_XL_SIZE` (and the ThemeHalves keys use 64/84px inline).
      Files: `design/system/README.md`, `packages/web/components/site/pictures/Access.tsx` (new),
      `packages/web/components/site/KeypadPicture.tsx`, `packages/web/components/site/sections/Access.tsx`,
      `packages/web/components/site/Pictures.tsx`, `packages/web/components/site/site.css`,
      `packages/web/test/site-css.test.ts`, `packages/web/test/site.test.tsx`.
      Requirements: MS-4.3, MS-7.1-7.5, MS-7.7, MS-8.5, MS-10.8, MS-10.9. Tests: as listed.
      Verify: web tests (only MS-4.1 may fail) and typecheck pass.

- [ ] 11. Privacy drawings and the page-wide tests (task 39; needs 3, 6). New `pictures/Privacy.tsx`:
      `DeviceBoundary` (class `site-boundary`), `RankingSides` (`RANKING_SENT`, no count, no provider), `VoiceRows`,
      `ListenStrip` (three labels in one cell, reserved status row). `sections/Privacy.tsx`: `site-grid--boxes`, 288px
      stages. Remove `RankingSwitch`, `OfflineChip`, their CSS and `.site-grid--2`. Tests (task 39.1, in
      `site.test.tsx`): `MS-7.7 every box card starts with a stage holding one data-play drawing`, the final `MS-7.4
      the round-2 drawings are present` (13 boxes plus How and proof), `MS-8.11 every drawing's last change is at most
      4000 ms` (`lastChangeMs` per part with the root's play class, lead 700 ms), `MS-8.11 every step class used on the
      page has a CSS rule`, `MS-7.3 no ember fill and at most one ember ring per step`, `MS-7.10 the ranking drawing
      lists RANKING_SENT with no count and the voice lines match the Voices card`, `MS-10.9 Conversation and Privacy
      use site-grid--boxes and the switch card is site-card--tall`; MS-4.1 now passes; MS-11.6 stays under 15 KB (if
      not, stop and report).
      Files: `packages/web/components/site/pictures/Privacy.tsx` (new), `packages/web/components/site/sections/Privacy.tsx`,
      `packages/web/components/site/Pictures.tsx`, `packages/web/components/site/site.css`, `packages/web/test/site.test.tsx`.
      Requirements: MS-4.1, MS-4.6, MS-4.8, MS-7.1-7.5, MS-7.7, MS-7.10, MS-8.11, MS-10.9, MS-11.6. Tests: as listed.
      Verify: `pnpm -F @ninth/web test --run` passes in full (336+ tests, 0 failures); `pnpm -r typecheck` passes.

- [ ] 12. Steering and design-system text (task 40). `accessibility.md` rule 5 and `design-system.md` "Spooky, but
      calm" name played sequences and How step sync instead of scroll-linked state jumps; `design/system/README.md`
      Motion paragraph lists A7 and A8, drops A5 and adds the six new tokens; `.kiro/agents/a11y-auditor.json`
      website motion check text.
      Files: `.kiro/steering/accessibility.md`, `.kiro/steering/design-system.md`, `design/system/README.md`,
      `.kiro/agents/a11y-auditor.json`.
      Requirements: MS-8.3, MS-8.11. Verify: `node scripts/validate-kiro-config.mjs` and `node scripts/tm-lint.mjs
      <files>` exit 0.

- [ ] 13. End-to-end checks (task 41). In `test/e2e/site.mjs` remove section F's scroll-linked frame check and add
      the task-41 checks plus the reviewer's `MS-8.11 drawings entered from above play in view` (375x667 and 1280x800:
      load at the top, follow `#faq`, scroll up in 40px steps; when a drawing gets `data-played="1"` its top ≥ −40 and
      its bottom ≤ viewport + 40). The 64-84px key check selects `.nl-key:not(.site-key--touch)`; the Touch keys are
      checked at exactly 72 and 128px. Keep the existing checks (autoplay, reveals, no-JS, privacy, keyboard).
      Files: `packages/web/test/e2e/site.mjs`.
      Requirements: MS-7.7, MS-8.7, MS-8.11, MS-8.12, MS-8.13, MS-10.8, MS-10.9, MS-11.2.
      Verify: with the dev server on :3000 (`/` and `/app` 200), from `packages/web`:
      `BASE_URL=http://localhost:3000 node test/e2e/site.mjs` exits 0.

- [ ] 14. Docs and the Kiro log (task 42). `docs/testing/README.md` "The website" lists the round-2 motion checks.
      `docs/KIRO_LOG.md` rows with `node scripts/kiro-log.mjs add` (credits left blank, as the log asks):
      1. `--date 2026-11-11 --who "Kiro (marketing-landing-v2 workflow wf_e69aacc718000e2c, research, design and reviews)" --surface "Kiro, workflow" --feature "Spec, MCP" --prompt "Landing page round 2: research the How it works and proof motion, a micro animated visual in all 13 boxes (Mobbin MCP for inspiration)" --outcome "docs/research/marketing-site/motion-v2.md and box-visuals.md; design revisions 1-3 with three design reviews; decisions V1-V35; ADR-006 amendment; marketing-site MS-7.3-7.10, MS-8.11-8.13, MS-10.9, MS-11.6; tasks 29-44" --link ".agents/tasks/marketing-landing-v2/design.md"`
      2. one row per implementation part, `--who "Kiro (marketing-landing-v2 workflow, FEAT-00N)" --surface "Kiro, workflow" --feature "Spec" --prompt "marketing-site tasks <n-m>: <title>" --outcome "<files, test counts, what failed>" --link ".kiro/specs/marketing-site/tasks.md"`
         (the step that finishes each part adds its own row; this step adds any that are missing);
      3. the verification step (15) adds a row with the e2e, WebKit and audit results; the Lighthouse step (16) adds
         one with the scores.
      Files: `docs/testing/README.md`, `docs/KIRO_LOG.md`. Verify: `node scripts/tm-lint.mjs docs/KIRO_LOG.md
      docs/testing/README.md` exits 0; the rows render as table rows (one line each).

- [ ] 15. Verify (task 43). With the dev server on :3000 (pause and ask if `/` or `/app` is not 200; never build or
      restart it): from `packages/web` `site.mjs`, `axe.mjs`, `keyboard.mjs`, `switch.mjs`, `spell.mjs`,
      `responsive.mjs` (Chromium), then `ENGINE=webkit` for `site.mjs` and `responsive.mjs`; from the root
      `pnpm -r typecheck`, `pnpm -F @ninth/web test --run`, `node scripts/tm-lint.mjs <changed files>`,
      `node scripts/validate-kiro-config.mjs`, `node scripts/check-kiro-not-ignored.mjs`; a11y audit of `/` (MS-13);
      the proof caption reads "Your keys: 92837" (MS-7.9; accessibility tree in Playwright if VoiceOver is not
      available, said so in the report); a screenshot of `#access` at 768x1024 in the report for the product owner
      (V10, the tall switch stage); tick tasks 30-43 in `tasks.md`.
      Requirements: MS-7.9, MS-13. Verify: every command exits 0; findings fixed or listed.

- [ ] 16. Production check (task 44, the workflow's Lighthouse step). Only after the person says yes to stopping the
      dev server: build, `next start -p 3202`, `OFFLINE=1 node test/e2e/site.mjs`, `node scripts/perf-check.mjs --runs 3`,
      `node scripts/lighthouse.mjs --write`; report scores and bytes against design.md §5 / spec R2.7; tick task 44.
      Requirements: MS-11.1, MS-11.2, MS-11.6.

## Digest

What was read, the block each step changes, the test that covers it.

| File | Block to change | Covered by | Read / verified |
|---|---|---|---|
| `design/system/tokens.json` | `motion.tokens` array (lines 118-132): 11 entries, `motion-reveal-distance` then the two easings | `tokens.test.ts` MS-8.2 (exact name list) and "matches the committed styles/tokens.css" | read; tokens tests pass today (6) |
| `packages/web/test/tokens.test.ts` | `MS-8.2 emits every motion token on :root with its value`: `toEqual([...11 names])` | itself | read |
| `packages/web/lib/rankingProvider.ts` | add `RANKING_SENT` after `PROVIDER_COPY` | new `ranking-provider.test.ts` | read; `buildRequest(codes, lat, partner, mode, k = 5, beams = [])` in `lib/decodeClient.ts` sets `context: { recent: [] }`, `beams` only when non-empty, `partner` trimmed |
| `packages/web/components/site/site-data.ts` | `HowData` / `getHowData()` (today `code: '44'`, `sentences` from `decodeGhost(['44'])`, fallback `['hi']`); `ProofExample.reject.diffAt: number`; add `getSpellExample`, `proofSaidLine`, `finishedKeys`; `dictionary()` cache and `getDemoData`'s completion fallback are the patterns | `site-data.test.ts` (13 pass today; `MS-7.4 every How it works sentence encodes to 44` is replaced) | read |
| `packages/web/components/site/motion.ts` | add 4 helpers next to `splitInitialReveal` (takes `getBoundingClientRect().top < viewportHeight`) | `site-motion.test.tsx` | read; 16 pass today |
| `packages/web/components/site/SiteMotion.tsx` | `useEffect`: `still()`, `move()` (marks instant, sets `"on"`, creates the reveal observer `'0px 0px -10% 0px'`), `onFocus`, `onChange`, cleanup | `site-motion.test.tsx` (`FakeObserver`, `lastObserver()` must stay the reveal observer; `getBoundingClientRect` mocked from `data-top`) | read |
| `packages/web/components/site/KeypadPicture.tsx` | `KeypadPicture({ size, pressed, ninth, className })`, `KEY_DRAWING_SIZE '64px'`, `HERO_KEY_SIZE`, `KeyDrawingSize`; keys are `div.nl-key.site-key` | `site.test.tsx` MS-10.8 (pads `toHaveLength(5)` today, inline `--nl-key` in the two constants) | read; `.nl-key` sizes from `--nl-key` (components.css 49), the XL rule targets only `.nl-keypad` (74) |
| `packages/web/components/site/pictures/roles.ts` | new | `site-roles.test.ts` (new), `site.test.tsx` MS-8.11 totals and step-class rule tests | n/a |
| `packages/web/components/site/Pictures.tsx` | `HowFrames`, `Digits`, `ProofFrames`, `ScanFrames`, `ShowCard`, `ShowFrames`, `SaidBubble`, `RankingSwitch`, `OfflineChip`; all go except `ProofCheck` (from `ProofFrames`) and re-exports | `site.test.tsx` MS-7.2, MS-7.4, MS-9.3 | read |
| `packages/web/components/site/sections/How.tsx` | `STEPS[0].text` (old "hi" copy), `.site-how__picture` with `data-reveal` and `HowFrames`, step cards with `--reveal-i` | `site.test.tsx` MS-4.1, MS-8.4 (#how has 5 reveal marks; keep them), new MS-8.12 / MS-7.3 cases | read |
| `packages/web/components/site/sections/Proof.tsx` | `figure.site-proof` (has `data-reveal`; keep it) with the plain figcaption and `ProofFrames` | MS-7.9, MS-9.3, MS-8.4 (#proof 3 marks) | read |
| `packages/web/components/site/sections/Conversation.tsx` | `site-grid site-grid--2`, four cards (`--reveal-i` 0,1,2,2), `SaidBubble`, `ShowFrames` | MS-7.4, MS-7.7, MS-8.4, MS-10.9 | read |
| `packages/web/components/site/sections/Access.tsx` | `site-grid site-grid--access`, five cards, `ScanFrames` inside the switch card after its text, then the `.site-note` card | MS-7.4, MS-7.7, MS-8.4 (#access 7 marks), MS-10.9 | read |
| `packages/web/components/site/sections/Privacy.tsx` | `site-grid site-grid--2` of four `site-card--line` cards, `OfflineChip`, `RankingSwitch` | MS-4.6, MS-4.8, MS-7.10, MS-8.4 (#privacy 5 marks) | read |
| `packages/web/app/page.tsx` | `HomePage`: `getDemoData`, `getHowData`, `getProofExample`, `getResults`; `<Conversation sentence={finishedSentence(demo)} />` | MS-11.3 (imports only `@/components/site/…` plus 4 allowed) | read |
| `packages/web/components/site/site.css` | drawings block (lines 104-196: `.site-pad`, `.site-key::after`, `.site-frames*`, `.site-well*`, `.site-cands`, `.site-cand--chosen`, proof, scan overlay, show, still drawings); grids (214-219: `.site-grid`, `--access`); How (222-231); `@media (min-width: 600px)` `.site-grid--2`; desktop How (336-339: sticky `top: var(--space-24)`, `min-height: 40svh`); motion block (350-411: A1-A4, the A5 `@supports` block with 9 frame rules, scan and How timelines, 9 keyframes); the short-landscape block must stay last | `site-css.test.ts` (20 pass today): MS-8.1 (motion rules under `[data-site-motion`), MS-8.2 (no `\d+m?s` literals; motion values may only use `var(--motion…)`/`--reveal-i`), MS-8.5 (A5 rules asserted, rewritten in steps 7 and 10), MS-8.10 (≥ 11 keyframes), MS-7.5 / MS-7.2 (`.site-frames` rules), MS-10.5 (no `--nl-key` in CSS), MS-13.2 (no `order`), MS-3.3 (landscape block last), MS-9.2 (no colour literals) | read |
| `packages/web/test/site.test.tsx` | MS-7.4 (frame counts), MS-7.2, MS-9.3, MS-10.8 (5 pads); MS-4.3 forbids classes matching `/phone|handset|device/i`; MS-1.6 allows exactly 2 `.nl-btn--primary`; MS-4.1 reads every bold string of content.md | itself | read; 31 of 32 pass today (MS-4.1 fails, expected) |
| `packages/web/test/e2e/site.mjs` | section F (lines 453-476: `.site-frames--proof` scroll-frame check); key-size checks at 165 and 285 use `.site-key` widths 64-84 | itself | read the parts listed; not run (needs the dev server) |
| `docs/KIRO_LOG.md` | table rows; last row 2026-11-11 (round-1 audit and finalize); no round-2 row yet | `node scripts/kiro-log.mjs add …` (usage at `scripts/kiro-log.mjs` 11-13, 144) | read |

Commands verified during planning: `pnpm -r typecheck` (exit 0); `pnpm -F @ninth/web test --run` (335 pass, 1
expected fail); `npx vitest run test/site*.ts* test/tokens.test.ts` from `packages/web` (86 of 87, same fail).
