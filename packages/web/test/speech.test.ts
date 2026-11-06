import { describe, expect, it } from 'vitest';
import { chunkText, pickVoice, sortVoices, type VoiceLike } from '@/lib/speech';

const v = (name: string, lang: string, localService: boolean, isDefault = false): VoiceLike => ({ voiceURI: name, name, lang, localService, default: isDefault });

describe('speech', () => {
  it('puts on-device voices in the right language first', () => {
    const list = [v('Cloud en', 'en-US', false, true), v('Local fr', 'fr-FR', true), v('Local en', 'en-GB', true)];
    expect(sortVoices(list).map((x) => x.name)).toEqual(['Local en', 'Local fr', 'Cloud en']);
  });

  it('keeps a saved voice if it exists', () => {
    const list = [v('A', 'en-US', true), v('B', 'en-US', false)];
    expect(pickVoice(list, 'B')?.name).toBe('B');
    expect(pickVoice(list, 'gone')?.name).toBe('A');
    expect(pickVoice([], undefined)).toBeUndefined();
  });

  it('chunks long text at sentence and word boundaries', () => {
    expect(chunkText('I need water')).toEqual(['I need water']);
    expect(chunkText('   ')).toEqual([]);
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ') + '. Second sentence here.';
    const chunks = chunkText(long, 80);
    expect(chunks.every((c) => c.length <= 80)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(long);
  });

  it('splits a single overlong word', () => {
    expect(chunkText('a'.repeat(25), 10)).toEqual(['a'.repeat(10), 'a'.repeat(10), 'a'.repeat(5)]);
  });
});
