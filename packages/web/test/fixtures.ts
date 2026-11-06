import { Lexicon, unigramModel, type LexiconFile } from '@ninth/core';
import type { DictState } from '@/lib/data';

/** A tiny dictionary: "I need water" and its neighbours (92837 spells water and waves). */
export const MINI_LEXICON: LexiconFile = {
  v: 1,
  lang: 'en',
  source: 'test',
  license: 'CC0',
  codes: {
    '4': [['i', 80], ['g', 30], ['h', 30]],
    '43': [['he', 60], ['if', 60]],
    '6333': [['need', 55], ['meed', 20]],
    '92837': [['water', 52], ['waves', 45]],
    '4663': [['good', 60], ['home', 58], ['gone', 50]],
    '27': [['as', 60]],
  },
};

export function miniDict(): Extract<DictState, { status: 'ready' }> {
  const lexicon = Lexicon.fromJSON(MINI_LEXICON);
  return { status: 'ready', lexicon, lm: unigramModel(lexicon), model: 'unigram', pack: null };
}
