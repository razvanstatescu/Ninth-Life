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
| M0 | Nov 6 | Monorepo, contracts, design system imported, `.kiro/` skeleton, knowledge base started | in progress |
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
