#!/usr/bin/env node
// Copies ../../data/lexicon and ../../data/packs into public/data/ so the app can fetch them
// from /data/... (contracts.md §2). Missing source files are not an error: the app shows a
// "dictionary not loaded" state instead.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../../../data');
const DEST = resolve(here, '../public/data');

const DIRS = ['lexicon', 'packs'];
const EXTRA_FILES = ['NOTICE.md', 'LICENSE'];

mkdirSync(DEST, { recursive: true });
let copied = 0;

for (const dir of DIRS) {
  const from = join(SRC, dir);
  if (!existsSync(from)) {
    console.warn(`copy-data: ${from} is missing; skipping`);
    continue;
  }
  const to = join(DEST, dir);
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const file = join(from, name);
    if (!statSync(file).isFile() || !name.endsWith('.json')) continue;
    copyFileSync(file, join(to, name));
    copied++;
  }
}
for (const name of EXTRA_FILES) {
  const file = join(SRC, name);
  if (existsSync(file)) {
    cpSync(file, join(DEST, name));
    copied++;
  }
}

// en.v2.json is what the app fetches (lib/data.ts); en.v1.json is read at build time by the landing page.
const expected = ['lexicon/en.v2.json', 'lexicon/en.v1.json', 'lexicon/en.bigram.v1.json', 'packs/core-en.json'];
for (const rel of expected) {
  if (!existsSync(join(DEST, rel))) console.warn(`copy-data: ${rel} not found; the app will run without it`);
}
console.log(`copy-data: copied ${copied} file(s) into ${DEST}`);
