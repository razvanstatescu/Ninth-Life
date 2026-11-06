// Shared helpers for scripts that Kiro hooks call.
//
// Verified 2026-11-06 (see docs/research/assumptions-register.md, H-03):
// - Kiro runs a hook's command in the project root and sends the event context
//   as JSON on STDIN (https://kiro.dev/docs/hooks/).
// - PreToolUse payloads carry `hook_event_name`, `cwd`, `session_id`,
//   `tool_name` and `tool_input` (https://kiro.dev/docs/hooks/types/).
// - The `{{filePath}}` template variable is substituted into the command for
//   file triggers (https://kiro.dev/docs/ide/whats-new-v1/hooks/).
// - The field names inside `tool_input` for file-write tools are NOT documented,
//   so collectPaths() looks for every common spelling.
//
// Set KIRO_HOOK_DEBUG=1 before starting Kiro to append every raw payload to
// <os tmpdir>/ninth-life-hook-payloads.jsonl. Use it once to confirm the real
// field names, then update the register.

import { appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Read all of STDIN, or '' if STDIN is a terminal or nothing arrives in time. */
export function readStdin({ timeoutMs = 1500 } = {}) {
  if (process.stdin.isTTY) return Promise.resolve('');
  return new Promise((resolveText) => {
    let data = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { process.stdin.pause(); process.stdin.unref?.(); } catch { /* ignore */ }
      resolveText(data);
    };
    const timer = setTimeout(finish, timeoutMs);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      if (data.length > 8_000_000) finish();
    });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
  });
}

/** Parse a hook payload. Returns null when the text is empty or not JSON. */
export function parsePayload(text) {
  if (!text || !text.trim()) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

/** Optionally record raw payloads (never inside the repo) to learn their shape. */
export function debugRecord(label, rawText) {
  if (!process.env.KIRO_HOOK_DEBUG) return;
  try {
    const line = JSON.stringify({ at: new Date().toISOString(), label, raw: rawText }) + '\n';
    appendFileSync(join(tmpdir(), 'ninth-life-hook-payloads.jsonl'), line);
  } catch { /* debugging must never break a hook */ }
}

const PATH_KEYS = new Set([
  'path', 'paths', 'file', 'files', 'file_path', 'filepath', 'filePath', 'file_paths', 'filePaths',
  'filename', 'fileName', 'target', 'target_file', 'targetFile', 'target_path', 'targetPath',
  'destination', 'dest', 'new_path', 'newPath', 'old_path', 'oldPath', 'uri',
]);

/** Collect every string that looks like a file path from a tool_input-like object. */
export function collectPaths(value, depth = 0, out = new Set()) {
  if (depth > 6 || value == null) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, depth + 1, out);
    return out;
  }
  if (typeof value !== 'object') return out;
  for (const [key, v] of Object.entries(value)) {
    if (PATH_KEYS.has(key)) {
      if (typeof v === 'string') out.add(cleanPath(v));
      else if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === 'string') out.add(cleanPath(item));
          else collectPaths(item, depth + 1, out);
        }
      } else collectPaths(v, depth + 1, out);
    } else if (v && typeof v === 'object') {
      collectPaths(v, depth + 1, out);
    }
  }
  out.delete('');
  return out;
}

function cleanPath(p) {
  return p.trim().replace(/^file:\/\//, '');
}

/** Repo-relative POSIX path for an absolute or relative path. */
export function toRepoPath(p, root = REPO_ROOT) {
  const abs = isAbsolute(p) ? p : resolve(root, p);
  return relative(root, abs).split(sep).join('/');
}
