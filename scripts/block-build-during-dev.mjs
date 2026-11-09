#!/usr/bin/env node
// block-build-during-dev: Kiro PreToolUse hook (shell tools) that stops the agent from running a
// production Next.js build while the dev server is running.
//
// Why: `next build` and `next dev` share packages/web/.next. A build overwrites the dev server's
// chunks and the open app breaks with "Cannot find module './NNN.js'" until .next is deleted and
// the dev server restarted (it happened on 2026-11-09). See .kiro/steering/tech.md rule 1.
//
// How Kiro calls it: the event arrives as JSON on STDIN ({ tool_name, tool_input: { command } });
// exit 2 blocks the call and STDERR goes back to the model; exit 0 lets it run (print nothing then).
//
// What is blocked: a shell command that runs `next build`, `pnpm build`, `pnpm -r build`,
// `pnpm -F @ninth/web build` / `--filter @ninth/web build`, or `npm run build` inside packages/web,
// while a `next dev` process is running on this machine. Everything else passes. On Windows, or
// when the process list cannot be read, it passes (a guard rail, not a lock).

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readStdin, parsePayload, debugRecord } from './lib/hook-input.mjs';

/** True when the shell command would run a Next.js production build of the web app. */
export function isWebBuild(command) {
  const cmd = String(command ?? '');
  return cmd
    .split(/&&|\|\||[;|\n]/)
    .map((s) => s.trim())
    .some((s) =>
      /(^|\s|\/)next\s+build(\s|$)/.test(s) ||
      /^(npx\s+)?pnpm\s+(-r\s+|--recursive\s+)?(run\s+)?build(\s|$)/.test(s) ||
      /^pnpm\s+(-F|--filter)[\s=]+(@ninth\/web|web|\.\/packages\/web)\s+(run\s+)?build(\s|$)/.test(s) ||
      /^npm\s+run\s+build(\s|$)/.test(s),
    );
}

/** Command lines of running processes, or null when they cannot be listed. */
function processList() {
  if (process.platform === 'win32') return null;
  try {
    return execFileSync('ps', ['-axo', 'command'], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/** True when a `next dev` server appears in the process list text. */
export function devServerRunning(psText) {
  if (!psText) return false;
  return psText.split('\n').some((line) => /next(\/dist\/bin\/next|\.js)?\s+dev(\s|$)/.test(line) || /\bnext-server\b.*\bdev\b/.test(line));
}

async function main() {
  const raw = await readStdin();
  debugRecord('block-build-during-dev', raw);
  const payload = parsePayload(raw);
  const input = payload ? (payload.tool_input ?? payload.toolInput ?? payload.input ?? payload) : null;
  const command = input && typeof input === 'object' ? (input.command ?? input.cmd ?? input.script) : raw;
  if (!isWebBuild(command)) return 0;
  if (!devServerRunning(processList())) return 0;
  console.error(
    'build-guard: blocked a Next.js production build because `next dev` is running. ' +
      'Both use packages/web/.next, so the build would break the running app. ' +
      'Run the e2e scripts against the dev server (BASE_URL=http://localhost:3000), use `pnpm -r typecheck`, ' +
      'or ask the person to stop the dev server first.',
  );
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`build-guard: internal error: ${err?.stack || err}`);
      process.exit(1);
    },
  );
}
