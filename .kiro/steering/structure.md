---
inclusion: always
---

# Where things live

- `packages/core/` — keypad encoding, `validate()` (the proof check), lexicon and bigram model, ghost decoder, scanning reducer. Spec: `.kiro/specs/core-encoder/`, `access-modes/`.
- `packages/decoder/` — `/api/decode` logic: schema, prompt (`src/prompt.ts`), model profiles (`src/models.ts`), client (`src/llm.ts`), fetch adapter and env (`src/adapters/fetch.ts`), `scripts/live-check.ts`. Spec: `decoder-service/`.
- `packages/web/` — the app and the website. Specs: `web-ui/` (Req 1-26), `marketing-site/` (the website, MS-1 to MS-13).
  - `app/` pages: `/` the website (`app/page.tsx`), `/app` the app (`app/app/page.tsx`), `/about`; `/welcome` redirects (308) to `/`; `/robots.txt` (`app/robots.ts`); `app/api/decode/route.ts`, `app/sw.ts` (ADR-006).
  - `components/` — `CommunicationScreen.tsx` (the screen and its sheets), `Keypad`, `SpeakBar`, `PhoneSuggestions`, `AppHeader`, `PartnerTurn` (They said, Listen), `ShowMode`, `MenuSheet`, `SettingsSheet`, `SpellSheet`, `MyWordsSheet`, `PhrasesSheet`, `RotateNotice`, `Icon`.
  - `components/site/` — the website: `KeypadDemo` (hero demo), `site-data.ts` (build-time data), `site.css`; it grows `SiteHeader`, `SiteFooter`, `sections/*`, `KeypadPicture`, `Pictures`, `SiteMotion`, `motion.ts`.
  - `lib/` — `layout.ts` (wide, compact, stack, split, rotate), `composer.ts`, `sentence.ts`, `keyboard.ts`, `useScanner.ts`, `useOverlayScan.ts`, `speech.ts`, `dictation.ts`, `settings.ts`, `storage.ts`, `data.ts`, `rankingProvider.ts`, `publicEnv.mjs`.
  - `styles/` — `tokens.css` (generated from the design system), `globals.css`, `components.css`, `app.css` (layouts and the one-screen shell).
  - `test/` Vitest + Testing Library; `test/e2e/` Playwright scripts (`responsive.mjs` checks 24 phone and tablet sizes).
- `packages/eval/` — harness, `RESULTS.md` (the only numbers we may quote), fixtures with NOTICE, `.cache/` (git-ignored, never commit).
- `data/` — lexicons and bigrams (CC BY-SA 4.0, `data/NOTICE.md`).
- `design/system/` — tokens, components, logos: the visual source of truth.
- `docs/` — `README.md` (index), `architecture/` (incl. `contracts.md`), `decisions/` (ADR-000 to ADR-006 plus package ADRs), `research/`, `plan/01-implementation-plan.md` (task rows F1-F21), `testing/`, `submission/`, `kiro/README.md`, `KIRO_LOG.md`.
- `scripts/` — repo rules and hook scripts (`tm-lint`, `block-env-writes`, `block-build-during-dev`, `kiro-log`, `validate-kiro-config`).
- `.kiro/` — specs, steering, hooks, agents, MCP, powers, prompts. Must stay committed and never git-ignored (hackathon rule).
- `.claude/` — another tool's local files and worktrees; ignored by `.kiroignore`, do not edit.
