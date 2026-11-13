import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as core from '../src/index';

const SRC = join(__dirname, '..', 'src');

describe('core-encoder: portability', () => {
  it('Req 7.1 src uses no DOM and no Node-only APIs', () => {
    const banned = [
      /from\s+['"](node:|fs|path|os|crypto|buffer|stream|child_process)['"/]/,
      /\brequire\s*\(/,
      /\b(window|document|navigator|localStorage|sessionStorage|indexedDB)\b\s*[.[]/,
      /\b(process|Buffer|__dirname|__filename)\b\s*[.[(]/,
    ];
    for (const f of readdirSync(SRC).filter((f) => f.endsWith('.ts'))) {
      const text = readFileSync(join(SRC, f), 'utf8');
      for (const re of banned) expect(re.test(text), `${f} matches ${re}`).toBe(false);
    }
  });

  it('Req 7.2 index re-exports the whole contract surface', () => {
    for (const name of [
      'KEYMAP', 'KEY_LETTERS', 'normalize', 'encodeWord', 'encodeSentence', 'tokenize',
      'validate', 'proof', 'Lexicon', 'unigramModel', 'bigramModel',
      'lattice', 'beam', 'decodeGhost', 'formatSentence', 'initialScan', 'scanReducer',
      'rankByIntent', 'intentCue', 'isReplyIntent', 'REPLY_INTENTS', 'INTENT_WEIGHT',
    ]) {
      expect(core, name).toHaveProperty(name);
    }
  });
});
