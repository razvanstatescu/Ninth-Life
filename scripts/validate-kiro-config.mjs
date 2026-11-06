#!/usr/bin/env node
// validate-kiro-config: static checks for the committed .kiro/ configuration, so a
// typo in a hook or agent file fails CI instead of silently switching a feature off.
//
// Rules come from the Kiro docs as checked on 2026-11-06 (see
// docs/research/assumptions-register.md): hooks v1 schema and PascalCase triggers
// (https://kiro.dev/docs/hooks/), steering front matter
// (https://kiro.dev/docs/steering/), agent config fields
// (https://kiro.dev/docs/custom-agents/configuration-reference/), MCP config
// (https://kiro.dev/docs/mcp/configuration/), powers (https://kiro.dev/docs/powers/create/).
//
// Usage: node scripts/validate-kiro-config.mjs     Exit 0 ok, 1 errors found.
// Plain Node 22, built-ins only.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { REPO_ROOT } from './lib/hook-input.mjs';

const KIRO = join(REPO_ROOT, '.kiro');
const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

const TRIGGERS = new Set([
  'SessionStart', 'Stop', 'UserPromptSubmit', 'PreTaskExec', 'PostTaskExec',
  'PreToolUse', 'PostToolUse', 'PostFileCreate', 'PostFileSave', 'PostFileDelete',
]);
const NO_MATCHER = new Set(['SessionStart', 'Stop', 'PreTaskExec', 'PostTaskExec']);
const SECRET_PATTERNS = [/gh[pousr]_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /\bsk-[A-Za-z0-9]{20,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bksk_[A-Za-z0-9]{8,}/, /\bxox[abp]-[A-Za-z0-9-]{10,}/];

const rel = (p) => p.slice(REPO_ROOT.length + 1);
const listJson = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : []);

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(rel(file), `invalid JSON (${e.message})`);
    return undefined;
  }
}

/** Minimal YAML front matter reader: top-level `key: value` lines, strings or flow arrays. */
function frontMatter(file) {
  const text = readFileSync(file, 'utf8');
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const end = text.indexOf('\n---', 4);
  if (end < 0) return null;
  const out = {};
  for (const line of text.slice(4, end).split(/\r?\n/)) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('[')) {
      try { v = JSON.parse(v); } catch { /* keep the raw string */ }
    } else v = v.replace(/^["']|["']$/g, '');
    out[m[1]] = v;
  }
  return out;
}

// Hooks
const hookNames = new Map();
for (const file of listJson(join(KIRO, 'hooks'))) {
  const doc = readJson(file);
  if (!doc) continue;
  const f = rel(file);
  if (doc.version !== 'v1') err(f, 'version must be "v1"');
  if (!Array.isArray(doc.hooks) || !doc.hooks.length) { err(f, 'hooks must be a non-empty array'); continue; }
  doc.hooks.forEach((h, i) => {
    const at = `${f} hooks[${i}]`;
    if (!h.name) err(at, 'name is required');
    else if (hookNames.has(h.name)) err(at, `duplicate hook name "${h.name}" (also in ${hookNames.get(h.name)})`);
    else hookNames.set(h.name, f);
    if (!TRIGGERS.has(h.trigger)) err(at, `unknown trigger "${h.trigger}" (use PascalCase v1 names)`);
    if (h.matcher !== undefined) {
      if (NO_MATCHER.has(h.trigger)) warn(at, `${h.trigger} has no matcher subject; the matcher is ignored`);
      try { new RegExp(h.matcher); } catch { warn(at, `matcher is not a valid JavaScript regex: ${h.matcher}`); }
    }
    const a = h.action ?? {};
    if (a.type === 'command') {
      if (!a.command) err(at, 'command action needs action.command');
      for (const m of String(a.command ?? '').matchAll(/node\s+(scripts\/[\w./-]+\.mjs)/g)) {
        if (!existsSync(join(REPO_ROOT, m[1]))) err(at, `script ${m[1]} does not exist`);
      }
    } else if (a.type === 'agent') {
      if (!a.prompt) err(at, 'agent action needs action.prompt');
      if (h.timeout !== undefined) warn(at, 'timeout is ignored for agent actions');
    } else err(at, 'action.type must be "command" or "agent"');
    if (h.timeout !== undefined && !(Number.isInteger(h.timeout) && h.timeout >= 0)) err(at, 'timeout must be a whole number of seconds (0 disables)');
    if (h.enabled !== undefined && typeof h.enabled !== 'boolean') err(at, 'enabled must be true or false');
  });
}

// Agents
for (const file of listJson(join(KIRO, 'agents'))) {
  const a = readJson(file);
  if (!a) continue;
  const f = rel(file);
  if (a.name && a.name !== basename(file, '.json')) warn(f, `name "${a.name}" differs from the file name`);
  if (!a.description) warn(f, 'add a description (shown in the agent picker)');
  if ('hooks' in a) err(f, 'inline "hooks" are CLI-only and the IDE ignores agents that contain them; use .kiro/hooks/*.json');
  if (('allowedTools' in a || 'toolsSettings' in a) && !a.permissions) err(f, 'allowedTools/toolsSettings without permissions is a CLI 2.x profile that V3 skips; use permissions.rules');
  if (a.tools !== undefined && !Array.isArray(a.tools) && a.tools !== '*') err(f, 'tools must be an array');
  for (const r of a.resources ?? []) {
    if (typeof r === 'string' && !/^(file|skill):\/\//.test(r)) err(f, `resource "${r}" must start with file:// or skill://`);
  }
  for (const rule of a.permissions?.rules ?? []) {
    if (!['allow', 'ask', 'deny'].includes(rule.effect)) err(f, `permission effect "${rule.effect}" must be allow, ask or deny`);
    if (!rule.capability) err(f, 'permission rule needs a capability');
  }
}

// MCP
const mcpFile = join(KIRO, 'settings', 'mcp.json');
if (existsSync(mcpFile)) {
  const m = readJson(mcpFile);
  if (m) {
    if (!m.mcpServers || typeof m.mcpServers !== 'object') err('.kiro/settings/mcp.json', 'mcpServers object is required');
    for (const [name, s] of Object.entries(m.mcpServers ?? {})) {
      const at = `.kiro/settings/mcp.json ${name}`;
      if (!s.command && !s.url) err(at, 'needs command (local) or url (remote)');
      if (s.url && !/^https:\/\//.test(s.url) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(s.url)) err(at, 'remote url must be https (or http on localhost)');
      const values = [...Object.values(s.headers ?? {}), ...Object.values(s.env ?? {}), ...(s.args ?? [])].map(String);
      for (const v of values) {
        if (SECRET_PATTERNS.some((re) => re.test(v))) err(at, 'looks like a literal secret; use ${ENV_VAR} interpolation');
        if (/^(Bearer|token)\s+(?!\$\{)/i.test(v)) err(at, 'Authorization value must come from ${ENV_VAR}');
      }
    }
  }
}

// Steering
const steeringDir = join(KIRO, 'steering');
for (const name of existsSync(steeringDir) ? readdirSync(steeringDir).filter((n) => n.endsWith('.md')) : []) {
  const file = join(steeringDir, name);
  const f = rel(file);
  const fm = frontMatter(file);
  if (!fm) { warn(f, 'no front matter: Kiro treats it as inclusion: always'); continue; }
  const mode = fm.inclusion ?? 'always';
  if (!['always', 'fileMatch', 'manual', 'auto'].includes(mode)) err(f, `inclusion "${mode}" must be always, fileMatch, manual or auto`);
  if (mode === 'fileMatch' && !fm.fileMatchPattern) err(f, 'fileMatch needs fileMatchPattern (string or array)');
  if (mode === 'auto' && (!fm.name || !fm.description)) err(f, 'auto needs name and description');
}

// Powers
const powersDir = join(KIRO, 'powers');
for (const name of existsSync(powersDir) ? readdirSync(powersDir) : []) {
  const dir = join(powersDir, name);
  if (!statSync(dir).isDirectory()) continue;
  const f = rel(dir);
  const plugin = join(dir, 'plugin.json');
  const power = join(dir, 'POWER.md');
  if (existsSync(plugin)) {
    const p = readJson(plugin);
    for (const k of ['name', 'version', 'description', 'author', 'keywords']) if (p && !(k in p)) err(`${f}/plugin.json`, `missing ${k}`);
  } else if (existsSync(power)) {
    const fm = frontMatter(power);
    if (!fm) err(`${f}/POWER.md`, 'needs YAML front matter');
    else for (const k of ['name', 'description', 'keywords']) if (!fm[k]) err(`${f}/POWER.md`, `front matter missing ${k}`);
  } else err(f, 'a power needs plugin.json or POWER.md at its root');
}

for (const w of warnings) console.log(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`validate-kiro-config: ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`validate-kiro-config: ok (${hookNames.size} hooks).`);
