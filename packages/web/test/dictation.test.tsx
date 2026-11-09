// Voice to text for "They said" (web-ui Req 26, ADR-004), with a fake SpeechRecognition.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerTurn } from '@/components/PartnerTurn';
import { dictationLang, dictationProblem, joinHeard, startDictation, type RecognitionCtor } from '@/lib/dictation';
import { DEFAULT_SETTINGS, sanitizeSettings } from '@/lib/settings';

class FakeRecognition {
  static last: FakeRecognition | null = null;
  static available: RecognitionCtor['available'] = undefined;
  lang = '';
  continuous = true;
  interimResults = false;
  maxAlternatives = 0;
  processLocally?: boolean;
  started = 0;
  stopped = 0;
  aborted = 0;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    this.started++;
  }
  stop() {
    this.stopped++;
  }
  abort() {
    this.aborted++;
  }
  /** The browser hearing words: each part is [transcript, isFinal]. */
  hear(...parts: [string, boolean][]) {
    const results = parts.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f }));
    act(() => this.onresult?.({ results }));
  }
  end(error?: string) {
    act(() => {
      if (error) this.onerror?.({ error });
      this.onend?.();
    });
  }
}

const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };

beforeEach(() => {
  FakeRecognition.last = null;
  FakeRecognition.available = undefined;
  w.webkitSpeechRecognition = FakeRecognition;
});
afterEach(() => {
  cleanup();
  delete w.webkitSpeechRecognition;
  delete w.SpeechRecognition;
});

const field = () => screen.getByRole('textbox', { name: 'They said' }) as HTMLInputElement;
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function open(allowed: boolean, onAllow = vi.fn(), onChange = vi.fn(), value = '') {
  render(<PartnerTurn value={value} onChange={onChange} startEditing dictation={{ allowed, onAllow }} />);
  return { onAllow, onChange };
}

describe('voice to text helpers', () => {
  it('maps browser errors to what to tell the person; a stop they asked for is no problem', () => {
    expect(dictationProblem('aborted')).toBeNull();
    expect(dictationProblem('not-allowed')).toBe('blocked');
    expect(dictationProblem('audio-capture')).toBe('no-mic');
    expect(dictationProblem('no-speech')).toBe('no-speech');
    expect(dictationProblem('network')).toBe('offline');
    expect(dictationProblem('service-not-allowed')).toBe('unavailable');
    expect(dictationProblem('something-new')).toBe('failed');
  });

  it('joins what was typed with what was heard, within the limit', () => {
    expect(joinHeard('', ' do you want  tea ', 280)).toBe('do you want tea');
    expect(joinHeard('Hi.', 'do you want tea', 280)).toBe('Hi. do you want tea');
    expect(joinHeard('abc', 'defgh', 6)).toBe('abc de');
  });

  it('listens in English, in the browser’s variety when it is English', () => {
    expect(dictationLang('en-GB')).toBe('en-GB');
    expect(dictationLang('ro-RO')).toBe('en-US');
    expect(dictationLang(undefined)).toBe('en-US');
  });

  it('keeps recognition on the device when the browser can', async () => {
    FakeRecognition.available = vi.fn(async () => 'available');
    startDictation({ lang: 'en-US', onText: () => undefined, onEnd: () => undefined, ctor: FakeRecognition as unknown as RecognitionCtor });
    await vi.waitFor(() => expect(FakeRecognition.last!.started).toBe(1));
    expect(FakeRecognition.last!.processLocally).toBe(true);
    expect(FakeRecognition.available).toHaveBeenCalledWith({ langs: ['en-US'], processLocally: true });
  });

  it('falls back to the browser’s service when the language is not on the device', async () => {
    FakeRecognition.available = vi.fn(async () => 'downloadable');
    startDictation({ lang: 'en-US', onText: () => undefined, onEnd: () => undefined, ctor: FakeRecognition as unknown as RecognitionCtor });
    await vi.waitFor(() => expect(FakeRecognition.last!.started).toBe(1));
    expect(FakeRecognition.last!.processLocally).toBeUndefined();
  });

  it('the setting is off unless it was turned on', () => {
    expect(DEFAULT_SETTINGS.dictation).toBe(false);
    expect(sanitizeSettings({ dictation: 'yes' }).dictation).toBe(false);
    expect(sanitizeSettings({ dictation: true }).dictation).toBe(true);
  });
});

describe('They said: Listen (web-ui Req 26)', () => {
  it('26.1 no Listen button where the browser has no speech recognition', () => {
    delete w.webkitSpeechRecognition;
    open(true);
    expect(screen.queryByRole('button', { name: 'Listen' })).toBeNull();
    expect(field().placeholder).toBe('Type what the other person said');
  });

  it('26.2 the first Listen explains where the audio goes; Not now starts nothing', () => {
    const { onAllow } = open(false);
    press('Listen');
    expect(screen.getByText(/may be sent to the browser maker \(Google in Chrome, Apple in Safari\)/)).toBeTruthy();
    expect(FakeRecognition.last).toBeNull();
    press('Not now');
    expect(screen.queryByText(/may be sent to the browser maker/)).toBeNull();
    expect(FakeRecognition.last).toBeNull();
    expect(onAllow).not.toHaveBeenCalled();
  });

  it('26.3 Allow and listen remembers the choice and listens for one phrase; the words fill the field as they are heard', () => {
    const { onAllow, onChange } = open(false);
    press('Listen');
    press('Allow and listen');
    expect(onAllow).toHaveBeenCalledTimes(1);
    const rec = FakeRecognition.last!;
    expect(rec.started).toBe(1);
    expect(rec.continuous).toBe(false);
    expect(rec.interimResults).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('Listening. Ask them to speak now.');
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();
    rec.hear(['do you want', false]);
    expect(field().value).toBe('do you want');
    rec.hear(['do you want', true], [' some tea', false]);
    expect(field().value).toBe('do you want some tea');
    rec.end();
    expect(screen.getByRole('button', { name: 'Listen' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('');
    press('Done');
    expect(onChange).toHaveBeenCalledWith('do you want some tea');
  });

  it('26.4 once allowed, Listen starts at once; Stop keeps what was heard', () => {
    open(true);
    press('Listen');
    const rec = FakeRecognition.last!;
    expect(rec.started).toBe(1);
    rec.hear(['tea please', false]);
    press('Stop');
    expect(rec.stopped).toBe(1);
    expect(field().value).toBe('tea please');
  });

  it('26.5 problems are said in words: a blocked microphone, nothing heard', () => {
    open(true);
    press('Listen');
    FakeRecognition.last!.end('not-allowed');
    expect(screen.getByRole('status').textContent).toMatch(/microphone is blocked/i);
    press('Listen');
    FakeRecognition.last!.end('no-speech');
    expect(screen.getByRole('status').textContent).toMatch(/nothing was heard/i);
  });

  it('26.6 Cancel and closing turn the microphone off and keep the old line', () => {
    const { onChange } = open(true, vi.fn(), vi.fn(), 'Hello');
    press('Listen');
    const rec = FakeRecognition.last!;
    rec.hear(['something else', false]);
    press('Cancel');
    expect(rec.aborted).toBe(1);
    expect(onChange).not.toHaveBeenCalled();
    cleanup();
    open(true);
    press('Listen');
    const rec2 = FakeRecognition.last!;
    cleanup();
    expect(rec2.aborted).toBe(1);
  });

  it('typing while listening stops listening and keeps the typed text', () => {
    open(true);
    press('Listen');
    const rec = FakeRecognition.last!;
    fireEvent.change(field(), { target: { value: 'typed' } });
    expect(rec.aborted).toBe(1);
    expect(field().value).toBe('typed');
  });
});
