---
inclusion: always
---

# Tech stack, commands and working rules

Checked against the repo on 2026-11-09. If a version or command here disagrees with `package.json`, the file wins; fix this page.

## Stack

- pnpm 10 workspace (`packageManager: pnpm@10.28.0`), Node 22 or later, TypeScript 5.6, Vitest 2.1, fast-check 3.
- `packages/web`: Next.js **15.1.12** App Router, React 19, Serwist service worker (offline), IndexedDB through `idb`. Deployed on Vercel (not yet live).
- `packages/core`: pure TypeScript (keymap, validator, lexicon, bigram model, ghost decoder, scanning). No DOM, no network.
- `packages/decoder`: the `/api/decode` handler. One provider-aware `AnthropicLlmClient` over plain `fetch` that speaks the Anthropic Messages protocol to Anthropic or to MiniMax's compatible endpoint (ADR-001, ADR-002). Default model `MiniMax-M3` when only `MINIMAX_API_KEY` is set, otherwise `claude-haiku-5-5`.
- `packages/eval`: offline baselines B0/B1 and model runs B2-B4; Python 3 only for rebuilding `data/`.
- End-to-end checks are plain Node scripts on Playwright 1.63, installed globally (Chromium and WebKit); `test/e2e/lib.mjs` finds it.
- No Prettier and no ESLint config in the repo. Do not run a formatter over files: it rewrites the whole file (quotes, wrapping) and buries the real change.

## Commands

| What | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` (root) or, from `packages/web`, `pnpm dev -H 0.0.0.0 -p 3000` to reach it from a phone on the same Wi-Fi |
| Unit tests, one package | `pnpm -F @ninth/core test --run` (also `@ninth/decoder`, `@ninth/web`, `@ninth/eval`) |
| All unit tests | `pnpm -r test` (Vitest exits after one run in CI; add `--run` locally) |
| Types | `pnpm -r typecheck` (also the `typecheck-on-stop` hook) |
| E2E (needs a running server) | from `packages/web`: `BASE_URL=http://localhost:3000 node test/e2e/<axe\|keyboard\|switch\|spell\|responsive>.mjs`; add `ENGINE=webkit` for Safari's engine |
| Eval, quick | `pnpm -F @ninth/eval quick` (offline, seconds; see the `ninth-life-eval` power) |
| Repo rules | `node scripts/tm-lint.mjs`, `node scripts/validate-kiro-config.mjs`, `node scripts/check-kiro-not-ignored.mjs` |

## Rules that come from real incidents

1. **Never run `next build` (or `pnpm -F @ninth/web build`, `pnpm build`) while the dev server is running.** Both write `packages/web/.next`; the build overwrites the dev server's chunks and the open app breaks with "Cannot find module './NNN.js'". Run the e2e scripts against the dev server instead, or stop it first. The `build-guard` hook blocks this.
2. **Never open, print or copy `.env*` files** other than `.env.example`. `packages/web/.env.local` holds the person's provider key; people add secrets themselves. The `secrets-guard` hook and `.kiroignore` back this up.
3. **Commit only when asked; never push, force-push, rewrite history or change the GitHub default branch without an explicit yes in this session.** Work happens on `main`.
4. Chrome resolved `100cqh` to 0 in the phone layout: size keys from the measured keypad box (`--pad-w`, `--pad-h`, set by a ResizeObserver in `CommunicationScreen.tsx`), not container query units.
5. A media query or `matchMedia` result can differ between the server HTML and the browser: read browser-only facts with `useSyncExternalStore` and a server snapshot of `false` (see `useDictationSupported`, `useMediaQuery`), never in a `useState` initializer.
6. Data in `data/` is built by scripts and frozen for the eval (`eval.lock`); never hand-edit lexicon JSON.
7. Every new user-facing behaviour gets a requirement in `.kiro/specs/<spec>/requirements.md` and a test that names its ID; decisions with trade-offs go in `docs/decisions/` (ADR).
