---
name: "ninth-life-eval"
displayName: "Ninth Life eval harness"
description: "Run the Ninth Life decoding eval (pnpm -F @ninth/eval quick / eval), read RESULTS.md, and compare baselines B0 to B4 (dictionary, ghost mode, LLM raw, LLM plus validator, lattice-constrained LLM plus validator) before and after a change."
keywords: ["eval", "evaluation", "benchmark", "baseline", "B0", "B1", "B2", "B3", "B4", "RESULTS.md", "word accuracy", "KSR", "keystroke savings", "top-1", "top-5", "ghost mode", "decoder quality", "regression"]
author: "Ninth Life team"
---

# Ninth Life eval harness

## Overview

`packages/eval` measures how well Ninth Life turns key sequences back into the sentence a person meant. It replays a frozen, licensed test set through each decoder configuration with a simulated user and reports word accuracy, sentence top-1 and top-5, keystroke savings (KSR), single-switch scan steps per character, the invalid-candidate rate before the validator, latency and cost.

The numbers in `packages/eval/RESULTS.md` are the only numbers anyone may quote in the README, the Devpost text, the video or posts (see `.kiro/steering/product.md`). This power exists so the agent measures before it claims.

## When to use this power

- After any change to `packages/core` decoding (keymap, lexicon loader, trie, beam, formatter, validator) or to the data in `data/lexicon/`.
- After any change to the decoder prompt, model choice or lattice constraint in `packages/decoder`.
- When someone asks "is it better?", "did this regress?", or wants a number for the write-up.

## The configurations

| ID | Name | What it is | Needs |
|---|---|---|---|
| B0 | dict | Classic 9-key: each code's words in frequency order, no context | offline |
| B1 | ghost | Bigram beam over the lattice (ships as ghost mode) | offline |
| B2 | LLM raw | LLM proposals with no validator; measures how often a model breaks the keys | `--llm` proposer, AWS access |
| B3 | LLM+val | LLM proposals filtered by `validate()` | `--llm` proposer, AWS access |
| B4 | lattice+val | LLM limited to lattice words and ghost beams, then `validate()` (shipping design) | `--llm` proposer, AWS access |

Targets from the plan are goals to beat, not claims: B1 word accuracy 92% or more; B4 sentence top-1 80%+ and top-5 95%+; B4 invalid spoken output 0% by construction; p50 under 900 ms, p95 under 1.5 s; under $2 per 1,000 decodes.

## Steps

1. **Quick check (seconds, offline, writes nothing):**
   ```bash
   pnpm -F @ninth/eval quick
   ```
   200-item seeded subset; prints a Markdown table. Use `--only B0,B1` to limit configs and `--seed <n>` to change the subset. Same seed and inputs must give identical metrics (latency varies).
2. **Compare with the baseline.** Read `packages/eval/RESULTS.md` (last full run). For each config report the change in word accuracy, sentence top-1, top-5 and KSR. Treat a drop of more than 0.5 points in B1 word accuracy or any B3/B4 "invalid spoken" above 0 as a regression to report before anything else.
3. **Full run (only when asked, or before freezing results):**
   ```bash
   pnpm -F @ninth/eval eval
   ```
   Full frozen test set; writes `packages/eval/RESULTS.json` and `RESULTS.md`. Commit both with the change that moved them, and say so in the PR.
4. **LLM configs (B2 to B4):** pass a proposer module, for example `pnpm -F @ninth/eval eval --llm <path-to-module>` exporting `createProposer()`. This calls Amazon Bedrock and costs money: confirm with the person first, and never run it in CI without the budget guard.
5. **Data integrity:** if the harness warns that the lexicon or bigram SHA-256 differs from `eval.lock`, the data was rebuilt after the test set was frozen. Report it; do not silently re-freeze (`pnpm -F @ninth/eval data:freeze` is a deliberate decision).

## How to report

Give a small table: config, metric, before, after, delta. State the subset (quick or full, item count, seed). Never round in our favor, never quote a quick-subset number as a final result, and never present research numbers (for example SpeakFaster) as ours.

## Troubleshooting

- `unknown option`: options go after the script name, for example `pnpm -F @ninth/eval quick --only B1`.
- Missing `data/lexicon/*.json`: build data first (`pnpm -F @ninth/eval data:venv`, `data:fetch`, `data:build`; Python 3 required).
- Method details: `docs/architecture/data-and-eval.md` and `.kiro/specs/eval-harness/`.
