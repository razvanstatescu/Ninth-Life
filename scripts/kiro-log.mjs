#!/usr/bin/env node
// kiro-log: append one row to docs/KIRO_LOG.md, the dated evidence trail for the
// Kiroween write-up (plan section 5.5).
//
// Columns: Date | Who | Surface | Feature | Prompt summary | Outcome | Credits | Link
//
// Usage
//   node scripts/kiro-log.mjs task
//       Hook mode (Kiro PostTaskExec). Reads the event JSON from STDIN and logs
//       the spec task that just finished. Never fails the hook.
//   node scripts/kiro-log.mjs add --who "Ana" --surface "Kiro IDE" --feature "Spec" \
//       --prompt "core-encoder requirements" --outcome "12 EARS reqs" --credits 14 --link "<url>"
//       Manual entry. --date defaults to today (local time). Missing fields stay blank.
//
// Environment: KIRO_LOG_WHO overrides the author (otherwise git user.name);
// KIRO_LOG_SURFACE overrides the surface label in hook mode; KIRO_LOG_FILE
// overrides the log path (used by tests).
// Plain Node 22, built-ins only.

import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { userInfo } from 'node:os';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, readStdin, parsePayload, debugRecord } from './lib/hook-input.mjs';

const LOG = process.env.KIRO_LOG_FILE || join(REPO_ROOT, 'docs', 'KIRO_LOG.md');
const COLUMNS = ['Date', 'Who', 'Surface', 'Feature', 'Prompt summary', 'Outcome', 'Credits', 'Link'];
const HEADER = `| ${COLUMNS.join(' | ')} |\n|${COLUMNS.map(() => '---').join('|')}|\n`;

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function who() {
  if (process.env.KIRO_LOG_WHO) return process.env.KIRO_LOG_WHO;
  try {
    const name = execFileSync('git', ['config', 'user.name'], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (name) return name;
  } catch { /* no git or no name */ }
  try { return userInfo().username; } catch { return 'unknown'; }
}

/** Make a value safe for one Markdown table cell. */
export function cell(value) {
  return String(value ?? '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export function formatRow(entry) {
  return `| ${COLUMNS.map((c) => cell(entry[c])).join(' | ')} |\n`;
}

export function appendRow(entry, file = LOG) {
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) {
    writeFileSync(file, `# Kiro log\n\n${HEADER}`);
  }
  const text = readFileSync(file, 'utf8');
  const lastLine = text.trimEnd().split('\n').pop() ?? '';
  let prefix = text.endsWith('\n') ? '' : '\n';
  if (!lastLine.trimStart().startsWith('|')) prefix += `\n${HEADER}`; // table must be the last block
  appendFileSync(file, prefix + formatRow(entry));
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

/** Build a row from a PostTaskExec payload. Field names are not documented, so try several. */
export function rowFromTaskPayload(payload) {
  const p = payload ?? {};
  const task = p.task && typeof p.task === 'object' ? p.task : p;
  const title = pick(task, ['title', 'name', 'description', 'text', 'label']) || pick(p, ['task', 'task_title', 'task_name', 'taskName']);
  const id = pick(task, ['id', 'task_id', 'taskId', 'number']) || pick(p, ['task_id', 'taskId']);
  const specPath = pick(p, ['spec_path', 'specPath', 'spec', 'spec_name', 'specName', 'file_path', 'filePath']);
  const spec = specPath ? basename(specPath.replace(/\/tasks\.md$/, '')) : '';
  const session = pick(p, ['session_id', 'sessionId']);
  const summary = [spec && `spec ${spec}`, id && `task ${id}`, title].filter(Boolean).join(': ') ||
    'spec task finished (payload carried no task title; see KIRO_HOOK_DEBUG in docs/kiro/README.md)';
  return {
    Date: today(),
    Who: who(),
    Surface: process.env.KIRO_LOG_SURFACE || 'Kiro (PostTaskExec hook)',
    Feature: 'Spec task',
    'Prompt summary': summary,
    Outcome: 'Task reported done by Kiro; check tests before ticking it',
    Credits: '',
    Link: session ? `session ${session.slice(0, 12)}` : '',
  };
}

function parseFlags(args) {
  const map = { who: 'Who', surface: 'Surface', feature: 'Feature', prompt: 'Prompt summary', outcome: 'Outcome', credits: 'Credits', link: 'Link', date: 'Date' };
  const entry = { Date: today(), Who: who() };
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i].replace(/^--/, '');
    if (!(flag in map)) throw new Error(`unknown option --${flag}`);
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${flag} needs a value`);
    entry[map[flag]] = value;
    i += 1;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.Date)) throw new Error('--date must be YYYY-MM-DD');
  return entry;
}

async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'task') {
    try {
      const raw = await readStdin();
      debugRecord('kiro-log task', raw);
      appendRow(rowFromTaskPayload(parsePayload(raw)));
      console.log('kiro-log: task logged in docs/KIRO_LOG.md');
    } catch (err) {
      // Logging must never block or fail a spec task.
      console.log(`kiro-log: could not log task (${err?.message || err})`);
    }
    return 0;
  }
  if (mode === 'add') {
    try {
      const entry = parseFlags(rest);
      appendRow(entry);
      console.log(`kiro-log: added ${entry.Date} ${entry.Who} ${entry.Surface ?? ''}`.trim());
      return 0;
    } catch (err) {
      console.error(`kiro-log: ${err.message}`);
      return 2;
    }
  }
  console.error('Usage: node scripts/kiro-log.mjs task | add --who .. --surface .. --feature .. --prompt .. --outcome .. --credits .. --link .. [--date YYYY-MM-DD]');
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code));
}
