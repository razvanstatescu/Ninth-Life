'use client';
import { useState } from 'react';
import type { Phrase } from '@/lib/storage';
import { Button } from './Button';
import { Sheet } from './Sheet';

/** Saved phrases. Stored on this device only, and only after "Save phrase". */
export function PhrasesSheet({
  open,
  phrases,
  error,
  onSpeak,
  onDelete,
  onClose,
}: {
  open: boolean;
  phrases: Phrase[];
  error: string | null;
  onSpeak: (p: Phrase) => void;
  onDelete: (p: Phrase) => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <Sheet open={open} title="Saved phrases" onClose={onClose}>
      <p className="field__help">Phrases stay on this device. Nothing is saved unless you press Save phrase.</p>
      {error ? <p className="notice notice--warn">{error}</p> : null}
      {phrases.length === 0 ? (
        <p className="field__help">No saved phrases yet. Type a sentence, then press Save phrase.</p>
      ) : (
        <ul className="phrases">
          {phrases.map((p) => (
            <li key={p.id} className="phrase">
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
    </Sheet>
  );
}
