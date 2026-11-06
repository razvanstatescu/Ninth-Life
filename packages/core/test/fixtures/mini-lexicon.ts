/**
 * A tiny hand-written lexicon for tests. Codes are written out by hand (not computed with
 * encodeWord) so the example tests check the encoder against an independent source.
 * Zipf values are rough wordfreq-like magnitudes, x10, for illustration only.
 */
import type { BigramFile, LexiconFile } from '../../src/index';

export const MINI_LEXICON: LexiconFile = {
  v: 1,
  lang: 'en',
  source: 'test fixture',
  license: 'MIT',
  codes: {
    '2': [['a', 73], ['b', 45], ['c', 44]],
    '4': [['i', 72], ['h', 40], ['g', 38]],
    '26': [['an', 66], ['am', 63], ['bo', 30]],
    '43': [['he', 68], ['if', 67]],
    '46': [['in', 73], ['go', 62], ["i'm", 62]],
    '63': [['of', 73], ['me', 67]],
    '66': [['no', 66]],
    '86': [['to', 76]],
    '263': [['and', 76], ['cod', 38], ['coe', 28], ['boe', 20]],
    '669': [['now', 64]],
    '843': [['the', 77]],
    '937': [['yes', 61]],
    '968': [['you', 72]],
    '4357': [['help', 60]],
    '4663': [['good', 62], ['home', 59], ['gone', 53], ['hood', 43], ['hoof', 30], ['goof', 28]],
    '4768': [["isn't", 58]],
    '5299': [['lazy', 45], ['jazz', 44]],
    '6333': [['need', 58], ['meed', 15]],
    '6673': [['more', 65]],
    '9268': [['want', 61]],
    '37465': [['drink', 51]],
    '43556': [['hello', 54]],
    '46637': [['goods', 45], ['homes', 44]],
    '75337': [['sleep', 53]],
    '84265': [['thank', 55]],
    '92837': [['water', 56], ['waver', 25], ['yates', 22]],
    '753273': [['please', 59]],
  },
};

/** A tiny bigram table: "go home" beats "go good", and "i need" is a strong pair. */
export const MINI_BIGRAM: BigramFile = {
  v: 1,
  lang: 'en',
  source: 'test fixture',
  license: 'MIT',
  bos: '<s>',
  logp: {
    '<s>': { i: -0.8, help: -1.5 },
    i: { need: -1.2, want: -1.1 },
    go: { home: -0.9 },
    need: { water: -1.6 },
  },
  backoff: { '<s>': -0.3, i: -0.4, go: -0.5, need: -0.4 },
};
