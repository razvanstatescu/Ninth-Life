import { core, items, lex, lm } from './common.ts';
console.log(items.length, lex.size);
console.log(core.decodeGhost(['4','6333','92837'], { lexicon: lex, lm, k: 3 }).map((c: any) => c.words.join(' ')));
