'use client';
import { useEffect, useRef, useState } from 'react';
import type { KeyFix, Punct } from '@ninth/core';
import { Button } from './Button';
import { EditedCode, editWords } from './KeyCode';
import { Sheet } from './Sheet';

/** One word of the sentence, as the sheet shows it. */
export interface FixWord {
  /** As shown ("Mihai"), or the digits while it has no word. */
  label: string;
  code: string;
  /** The mark typed after it (web-ui Req 34.7). */
  mark?: Punct;
}

/** Copy for Fix a word (web-ui Req 32). */
export const FIX = {
  title: 'Fix a word',
  lead: 'Pick the word to change.',
  readings: 'Other words for these keys',
  fixes: 'Words one key away',
  noReadings: 'No other words for these keys.',
  noFixes: 'No word is one key away.',
  retype: 'Retype this word',
  spell: 'Spell this word',
  back: 'Pick another word',
  mark: 'Mark after it',
} as const;

/** The marks in "Mark after it" (web-ui Req 34.7): the name starts with the visible word. */
export const MARK_OPTIONS: readonly { value: Punct | undefined; label: string }[] = [
  { value: undefined, label: 'None' },
  { value: '.', label: 'Full stop .' },
  { value: '?', label: 'Question mark ?' },
  { value: '!', label: 'Exclamation mark !' },
  { value: ',', label: 'Comma ,' },
];

const ROW = 4;
const spaced = (code: string) => code.split('').join(' ');
const chunks = <T,>(xs: readonly T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/**
 * Fix a word (web-ui Req 32.1-32.3, ADR-009): step 1 picks the word (skipped for a 1-word sentence), step 2 offers
 * its other readings (keys unchanged), words one key away (keys changed, the change marked), Retype and Spell. Any
 * pick closes the sheet. Nothing is spoken. Rows of at most 4 buttons, each its own scan row (Req 16.2).
 */
export function FixSheet({
  open,
  scanning,
  words,
  readingsFor,
  fixesFor,
  showWord,
  onReading,
  onFix,
  onRetype,
  onSpell,
  onMark,
  onClose,
}: {
  open: boolean;
  scanning?: boolean;
  words: readonly FixWord[];
  /** Other words for this word's keys (folded), the word on show left out. */
  readingsFor: (index: number) => string[];
  /** Up to 3 words one key away. */
  fixesFor: (index: number) => KeyFix[];
  /** The person's spelling of a folded word. */
  showWord: (w: string) => string;
  onReading: (index: number, word: string) => void;
  onFix: (index: number, fix: KeyFix) => void;
  onRetype: (index: number) => void;
  onSpell: (index: number) => void;
  /** Change the mark after word `index` (web-ui Req 34.7). */
  onMark?: (index: number, punct: Punct | undefined) => void;
  onClose: () => void;
}) {
  const single = words.length === 1;
  const [index, setIndex] = useState<number | null>(single ? 0 : null);
  // Each opening starts at step 1 (or straight at the word of a 1-word sentence), set while rendering so the first
  // frame already shows the right step (and the popover is placed for it).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setIndex(words.length === 1 ? 0 : null);
  }
  const at = index !== null && index < words.length ? index : null;
  // Each step starts with focus on its first choice (web-ui Req 36.9): the button just pressed has gone, so focus
  // would otherwise fall to the page. While scanning, focus stays on the sheet (one ember thing).
  const bodyRef = useRef<HTMLDivElement>(null);
  const step = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (!open) {
      step.current = undefined;
      return;
    }
    if (step.current === undefined) {
      step.current = at;
      return;
    }
    if (step.current === at) return;
    step.current = at;
    const d = bodyRef.current?.closest('dialog');
    if (scanning) d?.querySelector<HTMLElement>('.sheet__inner')?.focus();
    else bodyRef.current?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled)')?.focus();
  }, [open, at, scanning]);
  const word = at !== null ? words[at]! : null;
  const readings = at !== null ? readingsFor(at) : [];
  const fixes = at !== null ? fixesFor(at) : [];

  return (
    <Sheet open={open} name="fix" kind="fit" title={word ? `Fix “${word.label}”` : FIX.title} onClose={onClose} scanning={scanning}>
      <div className="fix" ref={bodyRef}>
      {at === null ? (
        <>
          <p className="fix__lead">{FIX.lead}</p>
          <div className="fix__words">
            {chunks(words.map((w, i) => ({ w, i })), ROW).map((row, r) => (
              <div className="fix__row scan-cluster" data-scan-row={`fix-words-${r}`} key={r}>
                {row.map(({ w, i }) => (
                  <Button key={i} variant="secondary" className="fix__word" aria-label={`${w.label}, keys ${spaced(w.code)}`} onClick={() => setIndex(i)} data-fix-index={i} data-autofocus={i === 0 ? '' : undefined}>
                    <span className="fix__word-text">{w.label}</span>
                    <span className="fix__word-code" aria-hidden="true">
                      {w.code}
                    </span>
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="group" aria-labelledby="fix-readings">
            <h3 className="group__title" id="fix-readings">
              {FIX.readings}
            </h3>
            {readings.length === 0 ? (
              <p className="field__help">{FIX.noReadings}</p>
            ) : (
              chunks(readings, ROW).map((row, r) => (
                <div className="fix__row scan-cluster" data-scan-row={`fix-readings-${r}`} key={r}>
                  {row.map((w, k) => (
                    <Button key={w} variant="secondary" className="fix__word" onClick={() => onReading(at, w)} data-word={w} data-autofocus={r === 0 && k === 0 ? '' : undefined}>
                      <span className="fix__word-text">{showWord(w)}</span>
                    </Button>
                  ))}
                </div>
              ))
            )}
          </section>
          <section className="group" aria-labelledby="fix-near">
            <h3 className="group__title" id="fix-near">
              {FIX.fixes}
            </h3>
            {fixes.length === 0 ? (
              <p className="field__help">{FIX.noFixes}</p>
            ) : (
              <div className="fix__row scan-cluster" data-scan-row="fix-near">
                {fixes.map((f, k) => (
                  <Button
                    key={f.word}
                    data-autofocus={readings.length === 0 && k === 0 ? '' : undefined}
                    variant="secondary"
                    className="fix__word"
                    aria-label={`${showWord(f.word)}, keys ${spaced(f.code)}, ${editWords(f.edit)}`}
                    onClick={() => onFix(at, f)}
                    data-word={f.word}
                  >
                    <span className="fix__word-text">{showWord(f.word)}</span>
                    <span className="fix__word-code" aria-hidden="true">
                      <EditedCode was={word!.code} code={f.code} srText={false} />
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </section>
          {onMark ? (
            <fieldset className="field">
              <legend className="field__label">{FIX.mark}</legend>
              <div className="seg scan-cluster" data-scan-row="fix-mark">
                {MARK_OPTIONS.map((o) => (
                  <label key={o.label} className="seg__opt">
                    <input type="radio" name="fix-mark" checked={word!.mark === o.value} onChange={() => onMark(at, o.value)} />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="menu scan-cluster" data-scan-row="fix-actions">
            <Button variant="secondary" icon="edit" onClick={() => onRetype(at)}>
              {FIX.retype}
            </Button>
            <Button variant="secondary" icon="spell" onClick={() => onSpell(at)}>
              {FIX.spell}
            </Button>
            {single ? null : (
              <Button variant="secondary" icon="back" onClick={() => setIndex(null)}>
                {FIX.back}
              </Button>
            )}
          </div>
        </>
      )}
      </div>
    </Sheet>
  );
}
