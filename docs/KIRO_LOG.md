# Kiro log

The dated evidence trail for the Kiroween 2026 write-up: what each of us did with Kiro, on which surface, with which feature, and what came of it. It feeds `docs/submission/KIRO_WRITEUP.md`, so keep it honest. A row that says something did not work is as useful as one that says it did.

How to add rows:

- Spec tasks are logged automatically by the `log-task` hook (`.kiro/hooks/task-traceability.json`, PostTaskExec). Fill in the credits later.
- Everything else, by hand or with the script:
  `node scripts/kiro-log.mjs add --who "<name>" --surface "Kiro IDE" --feature "Steering" --prompt "<one line>" --outcome "<what happened>" --credits <n> --link "<PR, CI run or screenshot>"`
- Aim for at least 3 rows per person per day (plan section 5.5). Surfaces: Kiro IDE, Kiro CLI, Kiro CLI headless (CI), Kiro Web, Kiro Crew. Features: Spec, PBT, Hook, Steering, Custom agent, MCP, Power, Vibe.
- Credits: read them from the Kiro usage view at the end of the session. Leave blank rather than guess.

The table must stay the last block in this file; the script appends to it.

| Date | Who | Surface | Feature | Prompt summary | Outcome | Credits | Link |
|---|---|---|---|---|---|---|---|
| 2026-11-06 | Claude (lead session) | Claude Code, preparing Kiro config | Steering, Hook, Custom agent, MCP, Power, CLI headless (config only) | Verified the plan's Kiro assumptions against kiro.dev docs and wrote the first `.kiro/` steering, hooks, agents, MCP config, eval power, prompts, CI workflows and helper scripts | Scaffold prepared outside Kiro, so it is not Kiro usage and earns no Kiro credit. Kiro sessions start next: open the repo in the Kiro IDE, confirm hooks, agents and MCP servers load, then run the first spec | 0 (not Kiro) | docs/research/assumptions-register.md |
| 2026-11-09 | Claude (Claude Code session) | Claude Code, preparing Kiro config | Steering, Hook, Spec, Custom agent, Power (config only) | Bring .kiro up to date before moving the work into Kiro: MiniMax (ADR-002), phone-first one-screen shell and portrait-only phones (ADR-003), Listen (ADR-004) | New steering tech.md and structure.md; product, accessibility, design-system, privacy, voice, trademarks updated; build-guard hook and .kiroignore; reviewer, auditor, review prompt and eval power updated; web-ui tasks 46-55, decoder DS-7.7-7.10 and task 15, eval Req 8 for MiniMax. Done outside Kiro, | 0 | docs/kiro/README.md |
| 2026-11-10 | Kiro (ship-feature workflow, coder step) | Kiro, workflow | Spec (Bugfix), Steering, Hook | web-ui task 51: iPhone SE in Safari with the Bottom tab bar (495px) scrolled 53px | Bugfix spec `iphone-se-bottom-bar-fit`, web-ui Req 24.9 (suggestion rows drop under 548px, Sentences in Menu), Req 24.6 and 25.1 edited, ADR-005 (to be confirmed by the product owner); tests in layout, phone, mobile and `responsive.mjs` (24 sizes) |  | .kiro/specs/iphone-se-bottom-bar-fit/bugfix.md |
| 2026-11-11 | Claude (Claude Code session, team of subagents) | Claude Code, outside Kiro | Spec, Steering (docs only) | Conversation thread (web-ui Req 27, ADR-007), quick replies (Req 28), reply types Agree/Disagree/Ask that only re-order sentences (Req 29, DS-9, ADR-008), on branch feature/conversation-replies | Built, reviewed and checked outside Kiro, so it is not Kiro usage and earns no Kiro credit. Unit, typecheck, tm-lint and e2e (responsive, axe, keyboard, switch, conversation) pass in Chromium and WebKit; no effect of reply types is claimed (RESULTS.md has none) | 0 (not Kiro) | branch feature/conversation-replies |
