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
| 2 | Decoder is a pure `handleDecode()` with a Lambda adapter and a Next.js Route Handler adapter | Keep the AWS cost controls; allow a one-deploy fallback on Vercel | ADR-000 |
| 3 | PWA via Serwist (`@serwist/next`) instead of Workbox directly | Serwist is the maintained Workbox successor with a Next.js integration | ADR-000 |
| 4 | Plan assumptions are tracked in `docs/research/assumptions-register.md` | Several Kiro details in the source plan were "from memory" | — |

## Architecture at a glance

```
            browser (Next.js client component, offline via service worker)
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Keypad ─▶ digit codes ─▶ @ninth/core decodeGhost (lexicon + bigrams)       │
 │                              │                                             │
 │                              ├─▶ candidates ─▶ proof() ─▶ ProofChips        │
 │                              │                                             │
 │      (opt-in) POST lattice ──┼──▶ decoder ──▶ Bedrock Haiku (EU)            │
 │                              │       └─ validate() every candidate          │
 │      1,500 ms timeout ───────┘ stay in ghost mode on any failure           │
 │ SpeakBar ─▶ Web Speech (local voices preferred)                            │
 └──────────────────────────────────────────────────────────────────────────┘
 decoder: packages/decoder handleDecode()
   ├─ adapters/lambda.ts  → API Gateway HTTP API, eu-central-1 (production)
   └─ web/app/api/decode  → Next.js Route Handler (dev, Vercel fallback)
```

## Packages and owners

| Package | What | Owner (role) | Spec |
|---|---|---|---|
| `packages/core` | keymap, validator, lexicon/trie, LM, beam, formatter, scanning reducer | A (lead) | `core-encoder`, `access-modes` |
| `packages/web` | Next.js app, design-system components, speech, settings, PWA | B | `web-ui` |
| `packages/decoder` | `handleDecode`, prompt, Bedrock client, quotas, flags | A | `decoder-service` |
| `packages/infra` | CDK: HTTP API, Lambda, DynamoDB, SSM, Budgets kill switch | A | `decoder-service` |
| `packages/eval` + `data/` | lexicon build, bigrams, eval harness, RESULTS.md | C | `eval-harness` |
| `.kiro/`, `scripts/`, `.github/` | steering, hooks, agents, MCP, power, CI | A | — |
| `ninth-life-phrase-keeper` (separate repo) | Kiro Crew app | C | its own |

## Milestones

| Gate | Date | Definition of done | Status |
|---|---|---|---|
| M0 | Nov 6 | Monorepo, contracts, design system imported, `.kiro/` skeleton, knowledge base started | done |
| M1 | Nov 11 | Ghost mode in the browser: keypad → candidates → proof → speak, offline, core PBT green | in progress (started Nov 6) |
| M2 | Nov 14 | Deployed PWA (Vercel), offline works, decoder Lambda synthesizes, RESULTS v1 (B0/B1) | — |
| M3 | Nov 20 | LLM mode with proof panel, latency harness, model chosen (Haiku 4.5 / newer Haiku / Nova Micro) | — |
| Cut 1 | Nov 23 | Drop ro/es and initials ("Phantom") mode if behind | — |
| M4 | Nov 26 | Feature freeze, a11y pass, kill-switch drill. Cut 2: drop WebGPU, drop Crew app if broken | — |
| Ship | Dec 3 | Video public, Devpost complete, `v1.0.0` tagged | — |

## Work breakdown (next 5 days)

1. **Core:** API per `docs/architecture/contracts.md`, property tests mapped to EARS requirement IDs.
2. **Data:** wordfreq lexicon, AACText/Turk bigrams (train only), core pack, NOTICE/LICENSE; eval B0/B1.
3. **Web:** the communication screen from `design/artboards/In-context-app.dc.html`, settings sheet, speech, scanning, offline.
4. **Decoder/infra:** handler with validator and quotas, Bedrock client, CDK stack, tests (no deploy yet).
5. **Kiro:** verified steering, hooks, agents, MCP, power, CI; KIRO_LOG entries from day 1.

## Measured so far (Nov 6)

| What | Result | Source |
|---|---|---|
| Core tests | 63 pass, incl. property tests by requirement ID | `packages/core` |
| Decoder + infra tests | 117 + 18 pass; CDK synthesizes without credentials | `packages/decoder`, `packages/infra` |
| B0 dictionary order (866 items) | word acc 91.4%, sentence top-1 62.4%, top-5 91.8% | `packages/eval/RESULTS.md` |
| B1 ghost mode (866 items) | word acc 96.8%, sentence top-1 85.5%, top-5 97.1%, p95 0.65 ms | `packages/eval/RESULTS.md` |
| Data size | lexicon + bigrams 413.6 KB brotli | ADR-data-001 |

Caveat: 24.4% of AACText test sentences also occur verbatim in the training split (stock phrases),
so AACText numbers are optimistic. Report Turk (79.3% top-1) alongside.

## Plan corrections found by the team

- Plan §4.3 example codes are wrong: "need" = 6333, "water" = 92837.
- Prompt caching does not apply to Haiku 4.5 (4,096-token minimum; our prompt is ~840). It does on Haiku 5.5 (512).
- Haiku 5.5 rejects `temperature`; the client omits it and disables thinking.
- AWS Budgets actions cannot invoke Lambda; we use a budget notification → SNS → kill-switch Lambda.
- Haiku 4.5's "EOL no sooner than" date (Oct 16, 2026) has passed; it may go legacy during judging.
- More in `docs/research/bedrock-models.md` and `docs/research/assumptions-register.md`.

## Follow-ups from M1 review (Nov 6)

| # | Item | Owner | Proposed fix |
|---|---|---|---|
| F1 | Phone layout: header wraps to 4 rows and the keypad sits below the fold at 390×844 | B | Icon+label header collapses to one row (Settings/Phrases into a menu sheet); keypad before sentences on phones; show 3 sentences |
| F2 | Single-letter readings rank too high ("H need water" at rank 5) | A, C | Penalize one-letter words other than "a" and "i" in the unigram model, or drop them from the lexicon |
| F3 | Scan grid order differs: web puts keypad rows first (any key ≤ 7 steps), access-modes spec puts sentences in row 0 | A, B | Keep keypad-first (Keypad README); update the access-modes spec to match |
| F4 | Settings and Phrases sheets are not reachable by switch scanning | B | Add a scan row for Settings/Phrases/Voice, and scan inside sheets |
| F5 | No axe check in CI | B | Add `@axe-core/playwright` to web dev deps and a CI job |
| F6 | Vocab pack phrases load but are not shown | B | Quick-phrases row in the Phrases sheet |
| F7 | Rejected model words only show as a count unless the client re-check catches them | A | Return rejected words (not just a count) from the decoder so the proof panel can strike them through, as the design shows |
| F8 | Fonts are self-hosted because Next 15.1.3's font list lacks Atkinson Hyperlegible Next/Mono | B | Fine for offline; revisit if Next is upgraded |

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
| D2 | Deploy target for the decoder in production | Lambda (ADR-000) | A |
| D3 | Model choice | Decided at M3 from eval numbers | C |
| D4 | Did anyone register for Kiroween 2025? | Ask the team | all |
| D5 | Default LLM: Haiku 4.5 (plan baseline) or Haiku 5.5 (~8x cheaper, prompt caching works) | Decide at M3 from B3/B4 eval | A, C |
| D6 | Turk dialogues license: web page says CC BY 4.0, download readme says CC BY-ND 3.0 | Ask Keith Vertanen; if ND, rebuild bigrams with `--no-turk` (perplexity 101 → 111) | C |
| D7 | Filter offensive words out of suggestions (wordfreq ranks some as low readings of common codes) | Recommended yes: a short blocklist applied at lexicon build, words still typeable via "add word" | C |
| D8 | Keep diacritics and capitals for display (ro "mâine", names "Ana") | Add optional display spelling to `LexiconFile` before ro/es packs | A, C |
| D9 | Production web origin for the decoder CORS allowlist | Set when the Vercel domain exists (M2) | A |
| D10 | Decoder AWS account | Use a dedicated account: the budget cannot filter Claude-on-Bedrock (billed via Marketplace) | A |
