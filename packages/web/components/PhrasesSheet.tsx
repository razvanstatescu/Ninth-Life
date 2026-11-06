'use client';
import { useState } from 'react';
import type { Phrase } from '@/lib/storage';
import { Button } from './Button';
import { Sheet } from './Sheet';

/** Quick phrases shown at first, and how many more each "More quick phrases" adds (web-ui Req 17.3). */
export const QUICK_PAGE = 12;
/** Quick phrases per scan row: a switch user picks a group of 4, then the phrase. */
export const QUICK_PER_ROW = 4;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Saved phrases (stored on this device only, and only after "Save phrase") and quick phrases
 * from the vocab pack. Choosing a phrase speaks it; nothing here is spoken on its own.
 */
export function PhrasesSheet({
  open,
  phrases,
  quickPhrases = [],
  error,
  scanning,
  onSpeak,
  onSpeakQuick,
  onDelete,
  onClose,
}: {
  open: boolean;
  phrases: Phrase[];
  /** Ready-made phrases from the vocab pack (data/packs/core-en.json). */
  quickPhrases?: readonly string[];
  error: string | null;
  /** Switch scanning drives the sheet (web-ui Req 16). */
  scanning?: boolean;
  onSpeak: (p: Phrase) => void;
  onSpeakQuick: (text: string) => void;
  onDelete: (p: Phrase) => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [shown, setShown] = useState(QUICK_PAGE);
  const quick = quickPhrases.slice(0, shown);
  return (
    <Sheet open={open} name="phrases" title="Phrases" onClose={onClose} scanning={scanning}>
      <section className="group" aria-labelledby="phrases-saved">
        <h3 className="group__title" id="phrases-saved">
          Your phrases
        </h3>
        <p className="field__help">Phrases stay on this device. Nothing is saved unless you press Save phrase.</p>
        {error ? <p className="notice notice--warn">{error}</p> : null}
        {phrases.length === 0 ? (
          <p className="field__help">No saved phrases yet. Type a sentence, then press Save phrase.</p>
        ) : (
          <ul className="phrases">
            {phrases.map((p) => (
              <li key={p.id} className="phrase scan-cluster" data-scan-row={`saved-${p.id}`}>
                <span className="phrase__text">{p.text}</span>
                <Button variant="quiet" icon="speaker" onClick={() => onSpeak(p)} aria-label={`Speak "${p.text}"`}>
                  Speak
                </Button>
                {confirming === p.id ? (
                  <>
                    <Button
                      variant="danger"
                      icon="x"
                      onClick={() => {
                        setConfirming(null);
                        onDelete(p);
                      }}
                    >
                      Delete phrase
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirming(null)}>
                      Keep
                    </Button>
                  </>
                ) : (
                  <Button variant="danger" icon="x" onClick={() => setConfirming(p.id)} aria-label={`Delete "${p.text}"`}>
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {quickPhrases.length > 0 ? (
        <section className="group" aria-labelledby="phrases-quick">
          <h3 className="group__title" id="phrases-quick">
            Quick phrases
          </h3>
          <p className="field__help">Press a phrase to speak it.</p>
          <ul className="quick" aria-labelledby="phrases-quick">
            {chunk(quick, QUICK_PER_ROW).map((group, g) => (
              <li key={g} className="quick__row scan-cluster" data-scan-row={`quick-${g}`}>
                {group.map((text) => (
                  <Button key={text} variant="quiet" icon="speaker" className="quick__phrase" onClick={() => onSpeakQuick(text)} aria-label={`Speak "${text}"`} lang="en">
                    {text}
                  </Button>
                ))}
              </li>
            ))}
          </ul>
          {shown < quickPhrases.length ? (
            <div className="scan-cluster" data-scan-row="quick-more">
              <Button variant="secondary" icon="plus" onClick={() => setShown((n) => n + QUICK_PAGE)}>
                More quick phrases
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </Sheet>
  );
}
