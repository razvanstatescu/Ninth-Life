# How we used Kiro (write-up skeleton)

Draft for the Devpost "how Kiro was used" write-up. One section per rules prompt, in the rules' order
(assumptions register R-09; plan §5.5). Last updated 2026-11-06.

**Rules for filling this in**

- Every claim about Kiro must point to a dated row in [`docs/KIRO_LOG.md`](../KIRO_LOG.md), a file in the repo, a CI
  run, or a screenshot in `docs/kiro/evidence/`. No evidence, no sentence.
- **TODO** marks text that can only come from real Kiro sessions. Do not fill a TODO from memory or from the plan.
- Facts already true in the repo are pre-filled with links. As of 2026-11-06 the whole `.kiro/` folder was written
  **outside Kiro** in a preparation session ([KIRO_LOG row 1](../KIRO_LOG.md): "Scaffold prepared outside Kiro, so it is
  not Kiro usage"). So the files below are configuration ready for Kiro, not evidence that Kiro used them. Say so in
  the final text if it is still true at submission.
- Numbers only from [`packages/eval/RESULTS.md`](../../packages/eval/RESULTS.md) or from the Kiro usage view.
- Judges score Kiro use under Technological Implementation ("variety of Kiro tools used impactfully ... experimentation"),
  and judging may use automated analysis (R-02). Keep each section explicit: what, why, one concrete example, effect.

---

## 1. Kiro IDE, CLI, Web and Crew: how did they differ for us?

**In the repo now**

- Headless CLI review job: [`.github/workflows/kiro-review.yml`](../../.github/workflows/kiro-review.yml) runs
  `kiro-cli chat --v3 --no-interactive --agent pr-reviewer` on PRs labelled `kiro-review`, with the prompt in
  [`.kiro/prompts/pr-review.md`](../../.kiro/prompts/pr-review.md). Flags corrected against the docs (register C-02, C-03).
- Surface notes we verified in the docs (not in use): PBT extraction is IDE-only (P-02); hooks do not run in Kiro Web
  (H-07); Kiro Web loads custom agents only as sub-agents (A-04); Kiro Web needs Pro or higher (MO-02).
- Crew app plan (separate repo "Phrase Keeper"): plan §5.3; manifest facts in register K-01 to K-06.

**TODO (evidence from sessions)**

- TODO: IDE: which specs and tasks were run there, with dates (KIRO_LOG rows).
- TODO: CLI V3 interactive: one scripted task, what differed from the IDE.
- TODO: CLI headless: link to a CI run that posted a review comment, and one thing the review caught (or did not).
- TODO: Web: the one documented Web session (what task, what differed: no hooks, sub-agents only).
- TODO: Crew: the Phrase Keeper app running in the Crew dashboard (screenshot), repo URL, or "dropped at Cut 2 on Nov 26".
- TODO: one paragraph: which surface we would use for what next time, and why.

## 2. Custom agents: which ones, in which Kiro app, and what impact?

**In the repo now**

| Agent | File | What it may do |
|---|---|---|
| `a11y-auditor` | [`.kiro/agents/a11y-auditor.json`](../../.kiro/agents/a11y-auditor.json) | Audits a route with the Playwright MCP against WCAG 2.2 AA and the design system; may write only `docs/a11y/` |
| `license-checker` | [`.kiro/agents/license-checker.json`](../../.kiro/agents/license-checker.json) | Read-only license and NOTICE audit of `data/`, fixtures, dependencies and assets |
| `pr-reviewer` | [`.kiro/agents/pr-reviewer.json`](../../.kiro/agents/pr-reviewer.json) | Read-only reviewer: no writes, no shell, no MCP; used headless in CI |

All three use `permissions.rules` (not the legacy `allowedTools`) and no inline hooks, because the IDE ignores agents
that contain hooks (register A-03, H-09). `scripts/validate-kiro-config.mjs` checks this in CI.

**TODO**

- TODO: one real finding from each agent, with the report or PR comment and the fix commit
  (`docs/a11y/<date>-<route>.md`; a NOTICE gap; a CI review comment).
- TODO: which Kiro surface each ran on.
- TODO: impact in one line each (what we would have missed).

## 3. Agent hooks: which workflows did they automate, and what improved?

**In the repo now** (10 hooks in 7 files, v1 schema; table in [`docs/kiro/README.md`](../kiro/README.md#hooks))

| Hook | Trigger | Action |
|---|---|---|
| `core-pbt-on-save` | PostFileSave on `packages/core` | core tests, output to STDERR so failures reach the agent |
| `trademark-guard`, `trademark-guard-new-files` | PostFileSave, PostFileCreate | `node scripts/tm-lint.mjs --hook "{{filePath}}"` |
| `task-needs-requirement` | PreTaskExec | agent prompt: name the requirement IDs and covering tests |
| `log-task` | PostTaskExec | `node scripts/kiro-log.mjs task` appends to KIRO_LOG |
| `claims-guard` | UserPromptSubmit (copy-related prompts) | agent prompt: banned claims, trademarks, intended purpose |
| `secrets-guard`, `secrets-guard-shell` | PreToolUse | `node scripts/block-env-writes.mjs` exits 2 to block `.env*` writes |
| `typecheck-on-stop` | Stop | `pnpm -r typecheck` |

Design choices from the docs: exit 2 blocks only reliably for PreToolUse; STDOUT on exit 0 is added to the agent's
context, so guards print nothing on success (register H-06). Hook files: [`.kiro/hooks/`](../../.kiro/hooks/).

**TODO**

- TODO: screenshot of `secrets-guard` blocking a `.env` write in a Kiro session (the exit-2 message).
- TODO: a `core-pbt-on-save` failure the agent saw and then fixed (KIRO_LOG row, commit).
- TODO: a `trademark-guard` catch, if one happens naturally (do not stage one and present it as natural).
- TODO: `log-task` rows in KIRO_LOG produced by the hook (count them at submission).
- TODO: the real hook payload field names (register H-03), recorded with `KIRO_HOOK_DEBUG=1`.
- TODO: what improved, in one line per hook, from the log.

## 4. Spec-driven development: how did you structure specs, and how did it compare to vibe coding?

**In the repo now**

- 5 specs with EARS requirements, design and tasks: [`.kiro/specs/`](../../.kiro/specs/) (`core-encoder`,
  `access-modes`, `web-ui`, `decoder-service`, `eval-harness`). Tasks name the requirement IDs they satisfy, and test
  names carry requirement IDs (for example `Req 1.2 normalization invariance` in core, `Req 18.x` in
  `packages/web/test/speech-robustness.test.ts`).
- Spec changes driven by review findings are traceable: web-ui Req 15-17 come from the M1 review follow-ups F1, F4, F6
  ([implementation plan](../plan/01-implementation-plan.md#follow-ups-from-m1-review-nov-6)); Req 18 (speech robustness)
  from [`docs/research/web-speech.md`](../research/web-speech.md).

These specs were written outside Kiro so far; they are not yet evidence of Kiro's spec workflow.

**TODO**

- TODO: which spec was created or refined in Kiro (requirements → design → tasks), with screenshots of the spec panel.
- TODO: the planned comparison: scanning v0 vibe-coded in a throwaway branch, then rebuilt from the access-modes spec;
  bug count and time for both (plan §5.5, `docs/kiro/README.md` step 5). If not run, say "not run".
- TODO: one thing the spec process caught that vibe coding missed, or the reverse.

## 5. Steering: how did you use it, and which strategy mattered most?

**In the repo now** (7 files in [`.kiro/steering/`](../../.kiro/steering/))

| File | Inclusion | Purpose |
|---|---|---|
| `product.md` | always | Users, non-goals, the intended-purpose sentence, banned claims |
| `trademarks.md` | always | Banned trademark words and third-party material |
| `accessibility.md` | fileMatch (web `.tsx`, `.css`) | WCAG 2.2 AA and design-system rules |
| `design-system.md` | fileMatch (web `.tsx/.ts/.css`) | Tokens, components, font loading |
| `privacy.md` | fileMatch (`packages/decoder/**`, `packages/web/app/api/**`) | No bodies in logs, no cookies, model calls only from the route |
| `voice.md` | auto (also `/voice`) | Web Speech rules |
| `data-licenses.md` | auto (also `/data-licenses`) | Dataset, font and asset licenses |

Custom agents list their steering in `resources` because the docs disagree on whether agents inherit steering
(register S-05).

**TODO**

- TODO: the with/without comparison: one component generated with and without `accessibility.md` (diff of target
  sizes, focus, labels).
- TODO: a prompt where `claims-guard` or `product.md` changed copy (before/after).
- TODO: which inclusion mode mattered most, and why, from what actually happened.

## 6. MCP: what did it let you do that you could not otherwise?

**In the repo now**: [`.kiro/settings/mcp.json`](../../.kiro/settings/mcp.json) with Context7 (remote), Playwright
(pinned `@playwright/mcp@0.0.84`), AWS Knowledge and GitHub (PAT via `${GITHUB_PAT}`, never in the file). Choices
verified against the servers' docs (register M-01 to M-06).

**TODO**

- TODO: a Context7 doc lookup that changed code (transcript excerpt, commit).
- TODO: a Playwright MCP walkthrough by `a11y-auditor` with screenshots.
- TODO: an AWS Knowledge lookup that answered a question (or drop the server if unused; no AWS infrastructure since ADR-001).
- TODO: a Phrase Keeper PR opened through the GitHub MCP.

## 7. Property-based testing: what did it catch, and which requirements did it cover?

**In the repo now** (from [`docs/architecture/core.md` "PBT findings"](../architecture/core.md#pbt-findings))

- **Finding 1, a real bug found and fixed:** the `Req 1.2 normalization invariance` property (fast-check) failed when
  the apostrophe generator was widened to ´ (U+00B4) and ` (U+0060). Shrunk counterexamples
  `{"plain":"aa","decorated":"a´a"}` and ``{"plain":"aa","decorated":"a`a"}``: expected `"22"`, got `null`. Cause: NFKD
  turns ´ into a space plus a combining accent, so "isn´t" became "isn t". Fix: `normalize` folds both to `'`
  (`packages/core/src/keymap.ts`, ADR-core-001 §2).
- **Finding 2:** the first decorated-word generator shrank badly (19 shrinks to a 12-character mess); a flat
  generator shrank the same failure to ``a`a`` in 10 steps.
- **Finding 3:** a mutation check killed every mutant but one after two generators were widened (the `startsWith`
  initials-validator mutant first survived every property). Table in core.md.
- Properties are named by requirement ID: encoder (core-encoder Req 1.x), lexicon (Req 2.x), validator soundness and
  completeness (Req 3.x), `decodeGhost` output always validates (Req 5.3), formatting never changes a word (Req 6.4),
  scanning reachability and pauses (access-modes Req 1.5, 3.2, 3.3), eval determinism (eval-harness spec). Test files:
  [`packages/core/test/`](../../packages/core/test/).

**Honesty note:** these findings came from the fast-check suite run with `pnpm`, not from a logged Kiro session. They are
PBT evidence, not yet Kiro evidence.

**TODO**

- TODO: IDE screenshot of a property linked to its EARS requirement and task (PBT is IDE-only, register P-02).
- TODO: any counterexample found while working in Kiro, with requirement ID, test file and fix commit.

## 8. Kiro powers: which ones, and what third-party tooling did they bring?

**In the repo now**: custom power [`.kiro/powers/ninth-life-eval/POWER.md`](../../.kiro/powers/ninth-life-eval/POWER.md)
(legacy POWER.md format, still supported; teaches the agent to run `pnpm -F @ninth/eval quick` / `eval` and compare
configs before quoting numbers). Installation is per user (register PW-01, PW-02). Catalog powers: the CDK power is no
longer needed after ADR-001 (no AWS infrastructure).

**TODO**

- TODO: install screenshot (Powers panel, "Import power from a folder").
- TODO: a session where the power ran the eval and reported deltas against RESULTS.md.
- TODO: the conversion to the Agent Plugins format with the "Build a Power" power, if done (register PW-01).
- TODO: any catalog power actually used, and what it brought.

---

## Credits and models (for the closing paragraph)

- TODO: credits used per person, from the Kiro usage view (leave blank rather than guess; KIRO_LOG "Credits" column).
- TODO: models used (exact IDs from `/model`, register A-05).

## Before submitting

- [ ] Every TODO filled from evidence or the section says plainly what was not done
- [ ] No banned trademark words (`node scripts/tm-lint.mjs`)
- [ ] The intended-purpose sentence appears in the Devpost text (it does not need to be in this write-up)
- [ ] Links work on the public repo
