import { describe, expect, it } from 'vitest';
import { parseReply } from '../src/parse.js';

describe('parseReply', () => {
  it('parses the schema', () => {
    expect(parseReply('{"c":[["i","need","water"],["h","need","water"]]}')).toEqual({
      candidates: [
        ['i', 'need', 'water'],
        ['h', 'need', 'water'],
      ],
      malformed: 0,
      unparseable: false,
    });
  });

  it('tolerates code fences and prose around the JSON', () => {
    const r = parseReply('Sure!\n```json\n{"c":[["Go","Home "]]}\n```');
    expect(r.candidates).toEqual([['go', 'home']]);
  });

  it('handles braces inside strings', () => {
    expect(parseReply('{"c":[["a}b"]]}').candidates).toEqual([['a}b']]);
  });

  it('counts malformed entries', () => {
    const r = parseReply('{"c":[["ok"],"nope",[1,2],[],["fine"]]}');
    expect(r.candidates).toEqual([['ok'], ['fine']]);
    expect(r.malformed).toBe(3);
  });

  it('salvages complete candidates from a truncated reply', () => {
    const r = parseReply('{"c":[["i","need","water"],["i","need","wa');
    expect(r.unparseable).toBe(false);
    expect(r.candidates).toEqual([['i', 'need', 'water']]);
  });

  it.each(['', 'no json here', '{"x":1}', '{"c":"str"}', '{"c":[["a"', 'null', '[["a"]]'])('marks %j unparseable', (t) => {
    expect(parseReply(t).unparseable).toBe(true);
  });
});
