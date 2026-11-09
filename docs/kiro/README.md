# Kiro in Ninth Life

How this repo uses Kiro, what every file under `.kiro/` does, how we work in Kiro day to day, what it costs, and what evidence we must capture for the write-up. Facts about Kiro were checked against kiro.dev on 2026-11-06; each one has a row in `docs/research/assumptions-register.md` (IDs in brackets).

The hackathon judges Kiro use under **Technological Implementation** ("How thoroughly and skillfully does the project use Kiro? ... Was a variety of Kiro tools used impactfully? ... Was there experimentation?"), and "insufficient use of Kiro will result in disqualification" [R-02]. The evidence trail is `docs/KIRO_LOG.md`.

## First Kiro session (each teammate, once)

1. Open the repo in Kiro IDE 1.x and trust the workspace (workspace agents only load in a trusted workspace [A-01]).
2. **Agent Hooks panel:** 10 hooks from 7 files should be listed, none with a "legacy" badge. If one is missing, run `node scripts/validate-kiro-config.mjs`.
3. **Steering panel:** 9 files. `product.md`, `tech.md`, `structure.md` and `trademarks.md` are always on; open a `.tsx` under `packages/web/` and check `accessibility.md` and `design-system.md` join the context.
4. **Agent Ignore Files:** in Settings, add `.kiroignore` to `kiroAgent.agentIgnoreFiles` so the IDE honours the root `.kiroignore` (secrets, eval downloads, `.next`, `.claude/`). Kiro CLI V3 reads it on its own. Then ask the agent to open `packages/web/.env.local`: it must refuse or fail.
5. **Memory:** off by default. Turn on "Use and learn" (Memory view, gear) if you want Kiro to keep corrections between sessions; rules that must always hold stay in steering.
6. **MCP panel:** `context7`, `playwright`, `aws-knowledge`, `mobbin`, `github`. Mobbin (UI patterns from real apps, for design research) signs in with OAuth on first use: a browser window opens for your Mobbin account; no key is stored. For GitHub, create a fine-grained PAT, `export GITHUB_PAT=...` before starting Kiro, and add `GITHUB_PAT` under Settings, "Mcp Approved Env Vars" [M-02]. Never paste the token into `mcp.json`.
7. **Powers panel:** Add Custom Power, "Import power from a folder", choose `.kiro/powers/ninth-life-eval/` [PW-02]. Catalog powers are optional; the CDK power is no longer needed (no AWS infrastructure since ADR-001) [PW-03].
8. **Confirm the hook payload format** (closes open question H-03): quit Kiro, start it with `KIRO_HOOK_DEBUG=1` in the environment, ask the agent to edit one file, then read `ninth-life-hook-payloads.jsonl` in your OS temp folder (`/tmp` on Linux and macOS). Put the real field names into the register. Turn the variable off afterwards.
9. **Check model IDs** with `/model` (or the model picker) and record the exact ID for Haiku 5.5 [A-05]; set it as the `KIRO_REVIEW_MODEL` repository variable.
10. Request your hackathon credits (Kiro user ID or AWS account ID; deadline Dec 1, 2026, 12:00 pm PT; allow 48 business hours) [R-04].
11. Log the session: `node scripts/kiro-log.mjs add --who "<you>" --surface "Kiro IDE" --feature "Setup" --prompt "first session checks" --outcome "<what loaded, what did not>"`.

## File map

| Path | What it is | Used by | Owner |
|---|---|---|---|
| `.kiro/specs/<name>/` | `requirements.md` (EARS), `design.md`, `tasks.md` per feature: core-encoder, decoder-service, access-modes, web-ui, eval-harness | IDE (spec panel, task runner, PBT), CLI V3 (`/spec new`, `/spec run`), Web. PBT extraction and the property hover are IDE-only [P-02, P-03] | package owners |
| `.kiro/steering/product.md` | Users, devices (phones first, portrait-only phones), non-goals, the intended-purpose sentence, banned claims, the honest tool history. `inclusion: always` | IDE, CLI (all engines), Web | lead |
| `.kiro/steering/tech.md` | Stack, versions, commands, and rules from real incidents (no build next to a running dev server, no formatter, no secrets, no push without a yes). `inclusion: always` | IDE, CLI, Web | lead |
| `.kiro/steering/structure.md` | Where things live, package by package. `inclusion: always` | IDE, CLI, Web | lead |
| `.kiro/steering/trademarks.md` | Banned trademark words and other third-party material. `inclusion: always` | IDE, CLI, Web | lead |
| `.kiro/steering/accessibility.md` | WCAG 2.2 AA plus design-system rules (56px targets, 16px text, one ember thing, never color alone, no pulsing). `fileMatch` on `packages/web/**/*.tsx`, `*.css` | IDE, CLI V3, Web [S-04] | web owner |
| `.kiro/steering/design-system.md` | Pointer to `design/system/`, token and component rules, font loading. `fileMatch` on web `.tsx/.ts/.css` | IDE, CLI V3, Web | web owner |
| `.kiro/steering/privacy.md` | No bodies in logs, model calls only from `/api/decode` to the Anthropic API, no cookies, salted IP hashes. `fileMatch` on `packages/decoder/**`, `packages/web/app/api/**` | IDE, CLI V3, Web | lead |
| `.kiro/steering/voice.md` | Web Speech API rules. `inclusion: auto` (also `/voice`) | IDE, CLI V3, Web | web owner |
| `.kiro/steering/data-licenses.md` | Dataset, font and asset licenses; NOTICE rules. `inclusion: auto` (also `/data-licenses`) | IDE, CLI V3, Web | data owner |
| `.kiro/hooks/*.json` | 10 hooks in the v1 schema (table below) | IDE and CLI V3, including headless V3 runs; **not** Kiro Web; file triggers fire only on agent edits [H-01, H-07, C-04] | lead |
| `.kiro/agents/a11y-auditor.json` | Audits a route with the Playwright MCP against WCAG 2.2 AA and the design system; writes only `docs/a11y/` | IDE, CLI (select with `/agent` or `--agent`); Web only as a sub-agent [A-04] | web owner |
| `.kiro/agents/license-checker.json` | Read-only license and NOTICE audit of `data/`, fixtures, dependencies and assets; may run `git ls-files` and `pnpm licenses list` | IDE, CLI | data owner |
| `.kiro/agents/pr-reviewer.json` | Read-only reviewer: no writes, no shell, no MCP | CLI headless in CI, plus IDE and CLI by hand | lead |
| `.kiro/settings/mcp.json` | Workspace MCP servers; secrets only as `${VAR}` | IDE, CLI, Web (Web reads it from the repo; set env values in the Web sandbox settings) [M-01] | lead |
| `.kiro/powers/ninth-life-eval/POWER.md` | Teaches the agent to run `pnpm -F @ninth/eval quick` / `eval` and compare B0 to B4 before claiming numbers. Legacy POWER.md format (still supported) [PW-01] | Installed per user: IDE, CLI V3 (`kiro-cli powers install .kiro/powers/ninth-life-eval`), Web (upload) | eval owner |
| `.kiro/prompts/pr-review.md` | The review instructions. A CLI workspace prompt (`/pr-review` in V3, `@pr-review` on older engines) and the text CI feeds to `pr-reviewer` | CLI, CI | lead |
| `scripts/tm-lint.mjs` | Banned-trademark scan (whole words, any case). Hook and CI | hooks, CI | lead |
| `scripts/block-env-writes.mjs` | PreToolUse guard: exit 2 blocks writes to `.env*` (not `.env.example`) | hooks | lead |
| `scripts/block-build-during-dev.mjs` | PreToolUse guard: exit 2 blocks `next build` / `pnpm build` while `next dev` runs | hooks | lead |
| `.kiroignore` (repo root) | Files the agent must not read: `.env*`, eval downloads, `.next`, `node_modules`, `.claude/` | IDE (after the setting above), CLI V3; not Web yet | lead |
| `scripts/kiro-log.mjs` | Appends rows to `docs/KIRO_LOG.md` (`task` from the hook, `add` by hand) | hooks, people | everyone |
| `scripts/check-kiro-not-ignored.mjs` | Fails if `/.kiro` is missing, untracked (with `--require-tracked`) or git-ignored | CI | lead |
| `scripts/validate-kiro-config.mjs` | Static checks of hooks, agents, MCP, steering and powers against the documented schema | CI | lead |
| `.github/workflows/ci.yml` | Rules job (tm-lint, `.kiro` checks) and build job (frozen install, typecheck, test, web build) | GitHub Actions | lead |
| `.github/workflows/kiro-review.yml` | Label-gated headless Kiro review with `pr-reviewer`, posted as a PR comment | GitHub Actions + Kiro CLI | lead |
| `.github/workflows/eval.yml` | Manual and weekly eval (quick or full), RESULTS uploaded as an artifact | GitHub Actions | eval owner |
| `docs/KIRO_LOG.md` | Dated evidence trail | everyone | everyone |

### Hooks

| Hook (file) | Trigger | Matcher | Action | Credits |
|---|---|---|---|---|
| `core-pbt-on-save` (`core-pbt-on-save.json`) | PostFileSave | `packages/core/(src\|test)/.*\.ts$` | `pnpm -F @ninth/core test --run --reporter=dot 1>&2` (failures reach the agent) | none |
| `trademark-guard` (`trademark-guard.json`) | PostFileSave | text-like extensions | `node scripts/tm-lint.mjs --hook "{{filePath}}"` | none |
| `trademark-guard-new-files` (same file) | PostFileCreate | same | same | none |
| `task-needs-requirement` (`task-traceability.json`) | PreTaskExec | — | agent prompt: name requirement IDs and covering properties, or stop | yes, small |
| `log-task` (same file) | PostTaskExec | — | `node scripts/kiro-log.mjs task` | none |
| `claims-guard` (`claims-guard.json`) | UserPromptSubmit | prompt mentions copy, README, video, Devpost, posts and similar | agent prompt: check banned claims, trademarks, intended purpose | yes, only on matching prompts |
| `secrets-guard` (`secrets-guard.json`) | PreToolUse | `write\|Write\|replace\|Replace\|append\|Append` | `node scripts/block-env-writes.mjs` (exit 2 blocks) | none |
| `secrets-guard-shell` (same file) | PreToolUse | `shell\|bash\|Bash\|pwsh\|execute_cmd` | same script, parses the shell command | none |
| `typecheck-on-stop` (`typecheck-on-stop.json`) | Stop | — | `pnpm -r typecheck 1>&2` | none |
| `build-guard` (`build-guard.json`) | PreToolUse | `shell\|bash\|Bash\|pwsh\|execute_cmd` | `node scripts/block-build-during-dev.mjs` (exit 2 blocks a production build while the dev server runs) | none |

Why the `1>&2`: on exit 0 Kiro adds the command's STDOUT to the agent's context, and on failure it sends STDERR to the agent [H-06]. Sending tool output to STDERR keeps passing runs quiet and failing runs informative.

## Working in Kiro, day to day

1. **Spec first.** New feature or non-trivial change: start a spec (IDE: Specs `+`; CLI V3: `/spec new <name>`). Requirements in EARS ("WHEN ..., THE ... SHALL ..."), each with an ID. Turn on property-based tests for logic in `packages/core` and the validator; Kiro extracts properties from EARS requirements in the design phase (IDE only).
2. **Review the design** against `docs/architecture/contracts.md`. A contract change needs a note in `docs/decisions/`.
3. **Run tasks one at a time** at first. The `task-needs-requirement` hook makes the agent name the requirement and test for each task; the `core-pbt-on-save` hook runs the core tests on every agent save; `typecheck-on-stop` checks types after each turn; `log-task` adds a row to the log.
4. **When a property fails**, keep the shrunk counterexample: paste it into the log (expect apostrophes, diacritics, empty input). These are the best PBT evidence we can show.
5. **Vibe on purpose, once.** Build scanning v0 without a spec in a throwaway branch, count bugs and time, then rebuild it from the access-modes spec. Log both; it answers the "spec vs vibe" prompt with numbers.
6. **Use the agents:** `a11y-auditor` after any UI change (start `pnpm dev` first); `license-checker` whenever `data/`, fixtures, fonts or assets change; `pr-reviewer` by hand on big PRs, or add the `kiro-review` label to get it in CI.
7. **Use the power** before quoting any number: ask "run the eval and compare with RESULTS.md"; it activates `ninth-life-eval`.
8. **MCP:** Context7 for current docs of Next.js, Serwist, fast-check; Playwright for walkthroughs and screenshots; AWS Knowledge for Kiro and AWS docs; GitHub for the Phrase Keeper repo. Save a short transcript excerpt when one of them changes a decision.
9. **Try each surface once on purpose:** IDE for specs and PBT, CLI V3 for a scripted task, one Kiro Web session (Pro or higher) on a small issue, Kiro Crew for the Phrase Keeper app. Note what differed.
10. **Log as you go:** at least 3 rows per person per day in `docs/KIRO_LOG.md`.

### CI setup (repository settings)

- Secret `KIRO_API_KEY`: a Kiro API key (`ksk_...`) from app.kiro.dev, which needs a Pro, Pro+, Pro Max or Power subscription; credits used by the key come out of that subscription [C-02].
- Variable `KIRO_REVIEW_MODEL` (optional): the exact Haiku 5.5 model ID once confirmed [A-05].
- Label `kiro-review`: add it to a PR to get a review on every push; remove it to stop. Forks never get a review (no secrets).

## Credit budget

Estimates from plan section 5.4, with multipliers corrected on 2026-11-06 [MO-01]. Budget assumes all three of us get 4,000 hackathon credits (12,000), which expire on Dec 31, 2026.

| Use | Model (multiplier) | Est. credits |
|---|---|---|
| 5 specs: requirements, design, analysis | Claude Sonnet 5.5 (1.3x) | 1,200 |
| About 60 spec tasks | Auto (1.0x) | 4,200 |
| PBT generation and failure triage | Auto (1.0x) | 900 |
| Agent-action hooks (`task-needs-requirement`, `claims-guard`) | session model; Haiku 5.5 (0.06x) where it fits | 400 |
| Headless CI reviews (about 40) | Haiku 5.5 (0.06x up to 100K tokens, 0.3x above) | 200, from the CI key owner's subscription |
| Crew app (Phrase Keeper) | Auto (1.0x) | 900 |
| Docs, write-up, debugging | Auto (1.0x) | 1,800 |
| Reserve | | 2,400 |

Rules: Sonnet 5.5 for specs and hard bugs only; Auto for implementation; Haiku 5.5 (now generally available, not experimental) for routine edits, hooks and CI. Opus 5.5 is 2.0x: ask first. Keep CI prompts under 100K tokens (the workflow truncates the diff at 150 KB). Command hooks cost nothing. Check usage every 3 days; above 500 credits a day per person, move routine work to Haiku. Not yet confirmed: whether hackathon credits redeemed on the CI key owner's account also pay for API-key usage.

## Evidence checklist, mapped to the write-up prompts

The rules ask for a write-up on how Kiro was used, with these prompts [R-09]. Keep raw evidence in `docs/kiro/evidence/` (screenshots, transcript excerpts, CI links) and reference it from `docs/KIRO_LOG.md`.

| Write-up prompt (rules) | What we show | Evidence to capture | Done |
|---|---|---|---|
| Kiro IDE, CLI, Web, Crew: how did they differ? | IDE for specs and PBT; CLI V3 headless in CI; one Web session; Crew for Phrase Keeper | Dated log rows per surface; CI run link with a posted review; a Web session screenshot; Crew app running in the dashboard | [ ] |
| Custom agents: which, in which Kiro app, impact? | `a11y-auditor`, `license-checker`, `pr-reviewer` | Agent JSON; one real finding from each (an `docs/a11y/` report, a NOTICE gap, a PR comment) and the fix commit | [ ] |
| Agent hooks: which workflows, what improved? | 10 hooks above | `log-task` rows; a screenshot of `secrets-guard` blocking a `.env` write (exit 2 message); a `core-pbt-on-save` failure the agent then fixed; a `trademark-guard` catch | [ ] |
| Spec-driven development: structure, effect, vs vibe coding | 5 specs with EARS IDs; scanning v0 vibe vs spec rebuild | Spec files; task list with requirement IDs; bug count and time for both scanning versions | [ ] |
| Steering: how, which strategy mattered most | 9 files: always (product, tech, structure, trademarks), fileMatch (accessibility, design-system, privacy), auto (voice, data-licenses) | One component generated with and without `accessibility.md` (diff of target sizes, focus, labels); a prompt where `claims-guard` changed copy | [ ] |
| MCP: what it enabled | Context7, Playwright, AWS Knowledge, GitHub | Transcript excerpts: a doc lookup that changed code, a Playwright walkthrough with screenshots, a model or API lookup, a Phrase Keeper PR opened through GitHub MCP | [ ] |
| Property-based testing: what it caught, which requirements | Encoder, validator soundness and completeness, scanning reachability bound, eval determinism | Every shrunk counterexample with the requirement ID, test file and fix commit; IDE screenshot of a property linked to its requirement | [ ] |
| Kiro powers: which, what third-party tooling | custom `ninth-life-eval` (and its conversion to the Agent Plugins format) | Install screenshot; a session where the power ran the eval and reported deltas; `POWER.md` | [ ] |

Before submitting, also check: `/.kiro` committed and not ignored (CI), no banned words anywhere (CI), the intended-purpose sentence verbatim in app, README, site, Devpost and video, every number traced to `packages/eval/RESULTS.md`.

## Still to verify in the first Kiro sessions

From the register: hook payload field names for file and task triggers (H-03); which pages are right about exit codes for UserPromptSubmit and PreTaskExec (H-06); whether custom agents inherit steering by default (S-05); exact model IDs (A-05); Crew third-party app setting (K-05); and the Next.js upgrade for the RSC security fix (W-05, owned by the web package).
