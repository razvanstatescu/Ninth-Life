# Implementation plan (living)

This is the working plan. The research document it came from is `00-source-plan.md`. Where the two
disagree, this page wins, and the reason sits in `docs/decisions/`.

- Last updated: 2026-11-06
- Submission deadline: **Dec 4, 2026, 2:00 PT**. Internal freeze Nov 26; we submit Dec 3.
- Category: Resurrection. Bonuses: Kiro Crew App, Blog, Social Blitz, Best Demo; "Ghost of Kiroween Past" if anyone registered in 2025.

## What changed from the source plan

| # | Change | Why | Record |
|---|---|---|---|
| 1 | Web app is **Next.js 15 (App Router)** instead of Vite + React | Team's home stack | ADR-000 |
| 2 | Decoder is a pure `handleDecode()` behind one Next.js Route Handler on Vercel that calls the **Anthropic API directly**; no AWS (no Lambda, CDK, Bedrock, DynamoDB) | One deploy, one vendor bill; the hard cap moves to the Anthropic Console spend limit | ADR-001 (supersedes the Lambda parts of ADR-000) |
| 3 | PWA via Serwist (`@serwist/next`) instead of Workbox directly | Serwist is the maintained Workbox successor with a Next.js integration | ADR-000 |
| 4 | Plan assumptions are tracked in `docs/research/assumptions-register.md` | Several Kiro details in the source plan were "from memory" | — |
| 5 | Next 15.1.12 / React 19.0.9 instead of 15.1.3 / 19.0.0 | Critical RCE (CVE-2025-66478 / CVE-2025-55182) in the earlier pair | ADR-000 amendment |
| 6 | Kiro hooks read the event as JSON on stdin; agents use `permissions.rules`, no hooks inside agent configs; headless CLI needs `--v3` and exact tool IDs | Verified against kiro.dev on Nov 6 | assumptions register |
| 7 | Kiro use is judged inside Technological Implementation (one of 5 equal criteria) plus the stage-one pass/fail, not as half the score | Rules page, Nov 6 | assumptions register |
| 8 | Product copy must not say the tool is "for" a named condition (e.g. ALS) | MDCG intended purpose includes promotional statements | `.kiro/steering/product.md` |
| 9 | No EU-only processing claim: model ranking sends text to Anthropic's API | Follows from change 2 | ADR-001 |
| 10 | MiniMax (Anthropic-compatible API, `MiniMax-M3`) as a second, env-selected provider; copy names the provider in use; configurable model deadline | Development continues with a MiniMax key (2026-11-09) | ADR-002 |

## Architecture at a glance

```
            browser (Next.js client component, offline via service worker)
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Keypad ─▶ digit codes ─▶ @ninth/core decodeGhost (lexicon + bigrams)       │
 │                              │                                             │
 │                              ├─▶ candidates ─▶ proof() ─▶ ProofChips        │
 │                              │                                             │
 │      (opt-in) POST lattice ──┼──▶ /api/decode ──▶ Anthropic API (Haiku)     │
 │                              │       └─ validate() every candidate          │
 │      1,500 ms timeout ───────┘ stay in ghost mode on any failure           │
 │ SpeakBar ─▶ Web Speech (local voices preferred)                            │
 └──────────────────────────────────────────────────────────────────────────┘
 decoder: packages/decoder handleDecode() + adapters/fetch.ts
   └─ web/app/api/decode  → Next.js Route Handler on Vercel (production and dev)
        guards: Vercel WAF rate-limit rule (per IP), LLM_ENABLED kill switch,
                Anthropic Console workspace spend limit (hard monthly cap)
```

## Packages and owners

| Package | What | Owner (role) | Spec |
|---|---|---|---|
| `packages/core` | keymap, validator, lexicon/trie, LM, beam, formatter, scanning reducer | A (lead) | `core-encoder`, `access-modes` |
| `packages/web` | Next.js app, design-system components, speech, settings, PWA | B | `web-ui` |
| `packages/decoder` | `handleDecode`, prompt, Anthropic client, soft limiter, kill switch, fetch adapter | A | `decoder-service` |
| `packages/eval` + `data/` | lexicon build, bigrams, eval harness, RESULTS.md | C | `eval-harness` |
| `.kiro/`, `scripts/`, `.github/` | steering, hooks, agents, MCP, power, CI | A | — |
| `ninth-life-phrase-keeper` (separate repo) | Kiro Crew app | C | its own |

## Milestones

| Gate | Date | Definition of done | Status |
|---|---|---|---|
| M0 | Nov 6 | Monorepo, contracts, design system imported, `.kiro/` skeleton, knowledge base started | done |
| M1 | Nov 11 | Ghost mode in the browser: keypad → candidates → proof → speak, offline, core PBT green | done Nov 6 (follow-ups F1–F8) |
| M2 | Nov 14 | Deployed PWA (Vercel), offline works, `/api/decode` live behind the WAF rule and spend limit, RESULTS v1 (B0/B1) | — |
| M3 | Nov 20 | LLM mode with proof panel, latency harness, model chosen (Haiku 5.5 / Haiku 4.5) | — |
| Cut 1 | Nov 23 | Drop ro/es and initials ("Phantom") mode if behind | — |
| M4 | Nov 26 | Feature freeze, a11y pass, kill-switch drill. Cut 2: drop WebGPU, drop Crew app if broken | — |
| Ship | Dec 3 | Video public, Devpost complete, `v1.0.0` tagged | — |

## Work breakdown (next 5 days)

1. **Core:** API per `docs/architecture/contracts.md`, property tests mapped to EARS requirement IDs.
2. **Data:** wordfreq lexicon, AACText/Turk bigrams (train only), core pack, NOTICE/LICENSE; eval B0/B1.
3. **Web:** the communication screen from `design/artboards/In-context-app.dc.html`, settings sheet, speech, scanning, offline.
4. **Decoder:** handler with validator, Anthropic client, fetch adapter for the Vercel route, tests (no live calls in tests).
5. **Kiro:** verified steering, hooks, agents, MCP, power, CI; KIRO_LOG entries from day 1.

## Measured so far (Nov 6)

| What | Result | Source |
|---|---|---|
| All TS tests | 275 pass (core 63, decoder 126, eval 33, web 53) + 4 Python; typecheck, build, tm-lint, Kiro config checks green (after ADR-001) | `pnpm -r test` |
| Core tests | 63 pass, incl. property tests by requirement ID | `packages/core` |
| Decoder tests | 126 pass, no API key needed (infra package removed by ADR-001) | `packages/decoder` |
| B0 dictionary order (866 items) | word acc 91.4%, sentence top-1 62.4%, top-5 91.8% | `packages/eval/RESULTS.md` |
| B1 ghost mode (866 items) | word acc 96.8%, sentence top-1 85.5%, top-5 97.1%, p95 0.65 ms | `packages/eval/RESULTS.md` |
| Data size | lexicon + bigrams 413.6 KB brotli | ADR-data-001 |

Caveat: 24.4% of AACText test sentences also occur verbatim in the training split (stock phrases),
so AACText numbers are optimistic. Report Turk (79.3% top-1) alongside.

## Plan corrections found by the team

- Plan §4.3 example codes are wrong: "need" = 6333, "water" = 92837.
- Prompt caching does not apply to Haiku 4.5 (4,096-token minimum; our prompt is ~840). It does on Haiku 5.5 (512).
- Haiku 5.5 rejects non-default `temperature`, and API version 2026-10-21 rejects `temperature` on every model; the client sends none and disables thinking on Haiku 5.5.
- Haiku 4.5's "EOL no sooner than" date (Oct 16, 2026) has passed; it may go legacy during judging.
- More in `docs/research/anthropic-models.md` and `docs/research/assumptions-register.md`.

## Follow-ups from M1 review (Nov 6)

| # | Item | Owner | Proposed fix |
|---|---|---|---|
| F1 | Phone layout: header wraps to 4 rows and the keypad sits below the fold at 390×844 | B | Icon+label header collapses to one row (Settings/Phrases into a menu sheet); keypad before sentences on phones; show 3 sentences — **done Nov 6 (f88bad7)** |
| F2 | Single-letter readings rank too high ("H need water" at rank 5) | A, C | **Done 2026-11-06:** −3 log10 one-letter penalty in core's LMs (ADR-core-002) + SCOWL acronym/non-dictionary down-weighting (ADR-data-002); B1 85.6% / 97.3%, no new unreachable items — **done Nov 6 (one-letter penalty + acronym/non-dictionary down-weighting; ADR-core-002, ADR-data-002)** |
| F3 | Scan grid order differs: web puts keypad rows first (any key ≤ 7 steps), access-modes spec puts sentences in row 0 | A, B | Keep keypad-first (Keypad README); update the access-modes spec to match — **done Nov 6** |
| F4 | Settings and Phrases sheets are not reachable by switch scanning | B | Add a scan row for Settings/Phrases/Voice, and scan inside sheets — **done Nov 6** |
| F5 | No axe check in CI | B | Add `@axe-core/playwright` to web dev deps and a CI job — **done Nov 6 (axe + keyboard + switch walkthroughs in CI e2e job)** |
| F6 | Vocab pack phrases load but are not shown | B | Quick-phrases row in the Phrases sheet — **done Nov 6** |
| F7 | Rejected model words only show as a count unless the client re-check catches them | A | **Done 2026-11-06:** additive `rejectedWords` in the decode response, struck through in the proof panel (ADR-decoder-001) — **done Nov 6 (`rejectedWords` in the decode response; ADR-decoder-001)** |
| F8 | Fonts are self-hosted because Next 15.1.3's font list lacks Atkinson Hyperlegible Next/Mono | B | Fine for offline; revisit if Next is upgraded |

## Later follow-ups (Nov 6, second pass)

| # | Item | Owner | Notes |
|---|---|---|---|
| F9 | Lexicon parse is 108.6 ms on desktop and 457 ms on a Moto G-class profile (target < 100 ms desktop); first load is 687–692 KB gzip against a 700 KB budget | A, B | Proposals in `docs/testing/performance.md`: parallel data fetch, idle-time trie build, faster `fromJSON`, compact format, trim precache — **done Nov 6: first load 530 KB, desktop parse 56 ms, slowest key 43 ms on Moto profile (ADR-data-003)** |
| F10 | Selected sentence border is ember on Night (second ember next to Speak) | design | Design-system call: use moon/ink for the selected border |
| F11 | Choosing Keyboard/Touch by switch turns scanning off with no way back by switch | B | Add a confirm step — **done Nov 6** |
| F12 | Link to `/welcome` from the app footer; precache `/welcome` | B | Small |
| F14 | Type words not in the dictionary (spell mode), My words, word pack import/export | B | **done Nov 6** (web-ui Req 19-22, `docs/architecture/vocab-packs.md`) |
| F13 | Keypad labels changed to "4 GHI, G H I" to pass WCAG 2.5.3 (label in name) | — | done Nov 6 |

D7 data: `packages/eval/reports/offensive-readings.md` — before the filter a slur appeared in the top 5 for 8 of 866 test items (0.9%), never at top 1. **Decided Nov 9 (ADR-data-004):** the build drops the 14 listed slurs, now 0 of 866; still typeable with spell mode and "Add to my words". Follow-up for C: LDNOOBW misses some slurs (about 20 candidates in the lexicon); adding one is a hash and a rebuild.

## Working agreements

- Every feature starts as a Kiro spec task that cites requirement IDs. Property tests carry the requirement ID in their names.
- Log Kiro use in `docs/KIRO_LOG.md` every day, at least 3 rows per person.
- Copy follows `design/system/README.md` (voice table) and `.kiro/steering/product.md` (banned claims, trademarks).
- Personal names from caregivers never enter this public repo. They live only in a family's private vocab-pack repo.
- No NC-licensed data in the repo, ever.

## Open decisions

| # | Question | Default if nobody decides | Owner |
|---|---|---|---|
| D1 | Letter mode default, initials mode as stretch | Yes, letter mode default | A |
| D2 | Deploy target for the decoder in production | **Decided:** Next.js route on Vercel calling the Anthropic API (ADR-001) | A |
| D3 | Model choice | Decided at M3 from eval numbers | C |
| D4 | Did anyone register for Kiroween 2025? | Ask the team | all |
| D5 | Default LLM: Haiku 5.5 (code default, `claude-haiku-5-5`, 10x cheaper, caching works) or Haiku 4.5 (`DECODE_MODEL=claude-haiku-4-5`) | Decide at M3 from B3/B4 eval | A, C |
| D6 | Turk dialogues license: web page says CC BY 4.0, download readme says CC BY-ND 3.0 | Ask Keith Vertanen; if ND, rebuild bigrams with `--no-turk` (perplexity 101 → 111) | C |
| D7 | Filter offensive words out of suggestions (wordfreq ranks some as low readings of common codes) | **Decided:** the lexicon build drops the 14 identity slurs on a hash list (`build_lexicon.py --slurs drop`); general profanity stays; a dropped word can still be spelled and added with "Add to my words". Slur in the top 5: 8 of 866 test items → 0; B0/B1 unchanged (ADR-data-004, `packages/eval/reports/offensive-readings.md`) | C |
| D8 | Keep diacritics and capitals for display (ro "mâine", names "Ana") | Add optional display spelling to `LexiconFile` before ro/es packs | A, C |
| D9 | Production origin | Same origin as the app (the route allows its own host); add preview/custom domains via `ALLOWED_ORIGINS` | A |
| D10 | Anthropic account setup | **Decided:** a dedicated Console workspace for the key, monthly spend limit $40 (the hard cap), WAF rule 10/60 s per IP (ADR-001) | A |
