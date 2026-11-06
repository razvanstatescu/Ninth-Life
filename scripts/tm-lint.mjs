#!/usr/bin/env node
// tm-lint: fail when a banned third-party trademark appears in project files.
//
// The product, website, video script and social copy must never name these
// marks (rules: no third-party trademarks in the video; our steering file
// .kiro/steering/trademarks.md). Say "9-key predictive text" instead.
//
// Usage
//   node scripts/tm-lint.mjs                 scan the whole repo (CI)
//   node scripts/tm-lint.mjs a.tsx b.md      scan only these files
//   node scripts/tm-lint.mjs --hook "{{filePath}}"
//        hook mode (Kiro PostFileSave): scans the substituted path; if Kiro left
//        the template unsubstituted, reads the path from the JSON on STDIN.
//
// In test files only, a line containing "tm-lint-allow" is skipped (for tests
// that assert a mark is absent). Everywhere else there is no opt-out.
//
// Exit codes: 0 clean, 1 at least one hit, 2 usage error.
// Plain Node 22, built-ins only.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { REPO_ROOT, readStdin, parsePayload, collectPaths, toRepoPath, debugRecord } from './lib/hook-input.mjs';

// Case-insensitive, whole words. "\b" treats letters, digits and "_" as word
// characters, so "AT91" or "T9s" do not match but "T9-style" does.
const BANNED = ['T9', 'Nokia', 'SwiftKey', 'Gboard'];
const PATTERN = new RegExp(`\\b(${BANNED.join('|')})\\b`, 'gi');

// Directories never scanned (generated, vendored or third-party content).
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', 'out', 'coverage', 'cdk.out',
  '.turbo', '.vercel', 'playwright-report', 'test-results', '.venv', '__pycache__',
]);

// Repo-relative paths (or path prefixes ending in "/") that are allowed to name
// the marks, because they define or quote the rule itself, or hold third-party
// corpora that are not our copy. Keep this list short and explain each entry.
const ALLOWED = [
  'docs/plan/00-source-plan.md',            // source plan: states the rule and cites sources
  '.kiro/steering/trademarks.md',           // the steering rule must list the banned words
  'scripts/tm-lint.mjs',                    // this file
  'docs/research/assumptions-register.md',  // research quotes, where quoting is needed
  'design/system/README.md',                // the brand rule ("Never write ...") in the design system
  'design/artboards/Logo-system.dc.html',   // "misuse" card that lists what never to draw or write
  'design/artboards/Video-social.dc.html',  // "Never" card for the video rules
  'pnpm-lock.yaml',                         // integrity hashes can contain "+T9/" by chance
  'package-lock.json',
  'yarn.lock',
  'data/lexicon/',                          // word lists derived from third-party corpora (not UI copy)
  'packages/eval/fixtures/',                // frozen third-party test sentences
  'packages/eval/.cache/',                  // downloaded eval-only datasets, never committed
];

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.icns', '.bmp', '.tiff',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp3', '.mp4', '.mov', '.webm', '.wav', '.ogg',
  '.zip', '.gz', '.br', '.zst', '.tgz', '.pdf', '.wasm', '.bin', '.onnx', '.gguf', '.sqlite',
]);
const MAX_BYTES = 5 * 1024 * 1024;

// Tests may assert that copy does NOT contain a mark. In test files only, a line
// that carries the marker "tm-lint-allow" is skipped. Product code cannot opt out.
const ALLOW_MARKER = 'tm-lint-allow';
const isTestFile = (repoPath) => /(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/.test(repoPath);

function isAllowed(repoPath) {
  return ALLOWED.some((entry) => (entry.endsWith('/') ? repoPath.startsWith(entry) : repoPath === entry));
}

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function scanFile(absPath) {
  const repoPath = toRepoPath(absPath);
  if (repoPath.startsWith('..')) return { repoPath, hits: [], skipped: 'outside repo' };
  if (isAllowed(repoPath)) return { repoPath, hits: [], skipped: 'allowed' };
  if (repoPath.split('/').some((part) => SKIP_DIRS.has(part))) return { repoPath, hits: [], skipped: 'skipped dir' };
  if (BINARY_EXT.has(extname(absPath).toLowerCase())) return { repoPath, hits: [], skipped: 'binary' };
  let stat;
  try { stat = statSync(absPath); } catch { return { repoPath, hits: [], skipped: 'missing' }; }
  if (!stat.isFile()) return { repoPath, hits: [], skipped: 'not a file' };
  if (stat.size > MAX_BYTES) return { repoPath, hits: [], skipped: 'too large' };
  const buf = readFileSync(absPath);
  if (buf.subarray(0, 8000).includes(0)) return { repoPath, hits: [], skipped: 'binary' };
  const hits = [];
  const lines = buf.toString('utf8').split(/\r?\n/);
  const testFile = isTestFile(repoPath);
  lines.forEach((line, i) => {
    if (testFile && line.includes(ALLOW_MARKER)) return;
    for (const m of line.matchAll(PATTERN)) {
      hits.push({ line: i + 1, col: m.index + 1, word: m[0], text: line.trim().slice(0, 160) });
    }
  });
  return { repoPath, hits };
}

async function filesFromHook(args) {
  const real = args.filter((a) => a && !/\{\{\s*filePath\s*\}\}/.test(a));
  if (real.length) return real;
  const raw = await readStdin();
  debugRecord('tm-lint', raw);
  const payload = parsePayload(raw);
  return payload ? [...collectPaths(payload)] : [];
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/tm-lint.mjs [--hook] [files...]');
    return 0;
  }
  const hookMode = argv.includes('--hook');
  const args = argv.filter((a) => a !== '--hook');
  if (args.some((a) => a.startsWith('--'))) {
    console.error(`tm-lint: unknown option ${args.find((a) => a.startsWith('--'))}`);
    return 2;
  }

  let files;
  if (hookMode) {
    files = (await filesFromHook(args)).map((p) => (p.startsWith('/') ? p : join(REPO_ROOT, p)));
    if (!files.length) return 0; // nothing to check; never block the agent on a missing path
  } else if (args.length) {
    files = args.map((p) => (p.startsWith('/') ? p : join(process.cwd(), p)));
  } else {
    files = [...walk(REPO_ROOT)];
  }

  let total = 0;
  let scanned = 0;
  for (const f of files) {
    if (!existsSync(f)) continue;
    const { repoPath, hits, skipped } = scanFile(f);
    if (skipped) continue;
    scanned += 1;
    for (const h of hits) {
      total += 1;
      console.error(`${repoPath}:${h.line}:${h.col}: banned trademark "${h.word}"  ${h.text}`);
    }
  }

  if (total) {
    console.error(
      `\ntm-lint: ${total} hit(s). Never name third-party phone or keyboard brands in the product, ` +
      'site, video or posts. Write "9-key predictive text" or rephrase. See .kiro/steering/trademarks.md.',
    );
    return 1;
  }
  if (!hookMode) console.log(`tm-lint: clean (${scanned} file(s) scanned).`);
  return 0;
}

main().then((code) => process.exit(code), (err) => {
  console.error(`tm-lint: ${err?.stack || err}`);
  process.exit(2);
});
