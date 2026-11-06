#!/usr/bin/env node
// check-kiro-not-ignored: fail if /.kiro (or anything in it) is git-ignored.
//
// Kiroween 2026 rules: "Your repo must contain the /.kiro directory at the root
// of the project ... Do NOT add the /.kiro directory or sub-folders to your
// .gitignore, as this could disqualify your submission."
// (https://kiroween.devpost.com/rules, checked 2026-11-06)
//
// Checks
//   1. .kiro/ exists at the repo root and is a real directory (not a symlink).
//   2. .kiro/steering and .kiro/hooks exist (specs may still be empty early on).
//   3. `git check-ignore --no-index` reports no ignore rule for .kiro or any
//      path inside it, including probe paths for every standard sub-folder.
//      This covers every .gitignore, .git/info/exclude and core.excludesFile.
//   4. With --require-tracked (CI): git tracks at least one file under .kiro/.
// Falls back to reading .gitignore when git is unavailable.
//
// Usage: node scripts/check-kiro-not-ignored.mjs [--require-tracked]
// Exit codes: 0 ok, 1 problem found. Plain Node 22, built-ins only.

import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from './lib/hook-input.mjs';

const KIRO = join(REPO_ROOT, '.kiro');
const PROBES = [
  '.kiro', '.kiro/',
  '.kiro/specs/example/requirements.md', '.kiro/specs/example/design.md', '.kiro/specs/example/tasks.md',
  '.kiro/steering/example.md', '.kiro/hooks/example.json', '.kiro/agents/example.json',
  '.kiro/settings/mcp.json', '.kiro/powers/example/POWER.md', '.kiro/prompts/example.md',
  '.kiro/skills/example/SKILL.md',
];

const problems = [];
const notes = [];

function git(args, input) {
  return spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', input });
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    out.push(relative(REPO_ROOT, full).split(sep).join('/') + (entry.isDirectory() ? '/' : ''));
    if (entry.isDirectory() && !entry.isSymbolicLink()) walk(full, out);
  }
  return out;
}

// 1 and 2: the folder itself
if (!existsSync(KIRO)) {
  problems.push('.kiro/ is missing at the repository root.');
} else if (lstatSync(KIRO).isSymbolicLink() || !lstatSync(KIRO).isDirectory()) {
  problems.push('.kiro must be a real directory at the repository root, not a symlink or file.');
} else {
  for (const sub of ['steering', 'hooks']) {
    if (!existsSync(join(KIRO, sub))) problems.push(`.kiro/${sub}/ is missing.`);
  }
  if (!existsSync(join(KIRO, 'specs'))) notes.push('.kiro/specs/ does not exist yet.');
}

// 3: ignore rules
const paths = existsSync(KIRO) ? [...new Set([...PROBES, ...walk(KIRO)])] : PROBES;
const probe = git(['check-ignore', '--no-index', '--stdin'], paths.join('\n') + '\n');
if (probe.error || probe.status === 128) {
  notes.push('git is unavailable or this is not a git work tree; falling back to reading .gitignore.');
  const gi = join(REPO_ROOT, '.gitignore');
  if (existsSync(gi)) {
    readFileSync(gi, 'utf8').split(/\r?\n/).forEach((line, i) => {
      const rule = line.trim();
      if (!rule || rule.startsWith('#') || rule.startsWith('!')) return;
      if (/\.kiro/.test(rule) || ['*', '.*', '/*', '**', '.k*', '/.*'].includes(rule)) {
        problems.push(`.gitignore:${i + 1}: rule "${rule}" may ignore .kiro.`);
      }
    });
  }
} else if (probe.status === 0) {
  const ignored = probe.stdout.split('\n').filter(Boolean);
  for (const p of ignored) {
    const why = git(['check-ignore', '--no-index', '-v', p]).stdout.trim();
    problems.push(`ignored: ${p}${why ? `  (rule: ${why.split('\t')[0]})` : ''}`);
  }
}

// 4: tracked files (CI)
if (process.argv.includes('--require-tracked')) {
  const tracked = git(['ls-files', '--', '.kiro']);
  if (tracked.status !== 0 || !tracked.stdout.trim()) {
    problems.push('git tracks no files under .kiro/ (commit the folder).');
  } else {
    notes.push(`${tracked.stdout.trim().split('\n').length} tracked file(s) under .kiro/.`);
  }
}
const untracked = git(['ls-files', '--others', '--exclude-standard', '--', '.kiro']);
if (untracked.status === 0 && untracked.stdout.trim()) {
  notes.push(`${untracked.stdout.trim().split('\n').length} untracked file(s) under .kiro/ (remember to commit them).`);
}

for (const n of notes) console.log(`note: ${n}`);
if (problems.length) {
  for (const p of problems) console.error(`check-kiro-not-ignored: ${p}`);
  console.error('The hackathon rules require /.kiro at the root and never git-ignored. Fix the rule above.');
  process.exit(1);
}
console.log('check-kiro-not-ignored: ok (.kiro is present and not ignored).');
