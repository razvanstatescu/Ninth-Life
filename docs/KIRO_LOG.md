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
