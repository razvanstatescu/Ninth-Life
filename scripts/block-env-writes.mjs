#!/usr/bin/env node
// block-env-writes: Kiro PreToolUse hook that stops the agent from writing
// secrets files (.env, .env.local, .env.production, .envrc, ...).
//
// How Kiro calls it (verified 2026-11-06, docs/research/assumptions-register.md H-03, H-05):
// - The event arrives as JSON on STDIN: { hook_event_name, cwd, session_id,
//   tool_name, tool_input }  (https://kiro.dev/docs/hooks/types/).
// - Exit code 2 blocks the tool call and STDERR goes back to the model
//   (https://kiro.dev/docs/ide/whats-new-v1/hooks/, https://kiro.dev/docs/reference/exit-codes/).
// - Exit 0 lets the call proceed. We print nothing then, because STDOUT on
//   exit 0 is added to the agent's context.
//
// What is blocked: any write-tool path, or shell write target, whose file or
// folder name starts with ".env". Allowed: ".env.example" (placeholders only;
// .gitignore keeps it trackable).
//
// Limits: a shell command that writes through an interpreter (node -e, python -c)
// is not parsed. The hook is a guard rail, not a sandbox; CI and review still apply.

import { pathToFileURL } from 'node:url';
import { readStdin, parsePayload, collectPaths, debugRecord } from './lib/hook-input.mjs';

const ALLOW = new Set(['.env.example']);
const WRITE_COMMANDS = new Set(['tee', 'cp', 'mv', 'install', 'touch', 'truncate', 'ln', 'rsync', 'dd', 'sed', 'perl']);

export function isEnvPath(p) {
  const parts = String(p).replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.some((part, i) => {
    if (!/^\.env/i.test(part)) return false;
    const isLast = i === parts.length - 1;
    return !(isLast && ALLOW.has(part.toLowerCase()));
  });
}

/** Very small shell tokenizer: splits on whitespace, keeps quoted strings. */
function tokenize(segment) {
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g;
  for (const m of segment.matchAll(re)) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

/** Paths a shell command may write to. Errs on the side of listing too many. */
export function shellWriteTargets(command) {
  const targets = new Set();
  const cmd = String(command);
  // Redirections: >, >>, >|, 1>, 2>>, &>, &>>
  for (const m of cmd.matchAll(/(?:\d|&)?>>?\|?\s*("([^"]*)"|'([^']*)'|[^\s;|&<>()]+)/g)) {
    const raw = m[2] ?? m[3] ?? m[1];
    if (raw && !raw.startsWith('&')) targets.add(raw);
  }
  for (const segment of cmd.split(/&&|\|\||[;|&\n]/)) {
    let tokens = tokenize(segment.trim());
    while (tokens.length && (/^\w+=/.test(tokens[0]) || ['sudo', 'env', 'command', 'exec', 'nohup'].includes(tokens[0]))) {
      tokens = tokens.slice(1);
    }
    if (!tokens.length) continue;
    const name = tokens[0].split('/').pop();
    if (!WRITE_COMMANDS.has(name)) continue;
    if ((name === 'sed' || name === 'perl') && !tokens.some((t) => /^-[a-zA-Z]*i/.test(t))) continue;
    for (const t of tokens.slice(1)) {
      if (t.startsWith('-')) continue;
      targets.add(t.startsWith('of=') ? t.slice(3) : t);
    }
  }
  return [...targets];
}

function pathsFromUnparsed(raw) {
  const out = new Set();
  for (const m of raw.matchAll(/"(?:path|file_path|filePath|target_file|targetFile|filename)"\s*:\s*"([^"]+)"/g)) out.add(m[1]);
  return [...out];
}

async function main() {
  const raw = await readStdin();
  debugRecord('block-env-writes', raw);
  const payload = parsePayload(raw);

  let candidates = [];
  let toolName = 'unknown tool';
  if (payload) {
    toolName = payload.tool_name ?? payload.toolName ?? toolName;
    const input = payload.tool_input ?? payload.toolInput ?? payload.input ?? payload;
    candidates = [...collectPaths(input)];
    const command = input && typeof input === 'object' ? (input.command ?? input.cmd ?? input.script) : undefined;
    if (typeof command === 'string') candidates.push(...shellWriteTargets(command));
  } else if (raw) {
    candidates = pathsFromUnparsed(raw);
  }

  const blocked = candidates.filter(isEnvPath);
  if (blocked.length) {
    console.error(
      `secrets-guard: blocked ${toolName} on ${blocked.join(', ')}. ` +
      'Files named .env* hold secrets and the agent must not write them. ' +
      'Ask a human to edit that file, or put placeholder values in .env.example.',
    );
    return 2;
  }
  return 0;
}

// Run only when executed directly (tests import the helpers).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code), (err) => {
    // Fail closed only when we know it is a secrets path; an internal error should
    // not freeze every write, so report it as a hook error (exit 1, not a block).
    console.error(`secrets-guard: internal error: ${err?.stack || err}`);
    process.exit(1);
  });
}
