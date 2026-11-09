'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

/**
 * Big-text show mode: for when there is no voice, or a noisy room. Flip turns the message 180 degrees
 * for the person across the table; Done and Flip stay upright for the person holding the phone. Every
 * major text AAC app has this, and iOS cannot lock the screen's orientation from a web page, so it
 * is a CSS rotation (docs/research/mobile-aac-evidence.md). It opens unflipped every time.
 */
export function ShowMode({
  text,
  reason,
  scanning,
  onClose,
}: {
  text: string | null;
  reason: string | null;
  /** Switch scanning: Done is the one scan row, and focus stays off it (one ember thing). */
  scanning?: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const scanningRef = useRef(scanning);
  scanningRef.current = scanning;
  const opener = useRef<Element | null>(null);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (text && !d.open) {
      setFlipped(false);
      opener.current = document.activeElement;
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      if (scanningRef.current) innerRef.current?.focus();
      else d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!text && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
      if (scanningRef.current) (document.activeElement as HTMLElement | null)?.blur?.();
      else (opener.current as HTMLElement | null)?.focus?.();
    }
  }, [text]);
  return (
    <dialog
      ref={ref}
      className="show"
      data-overlay="show"
      aria-label="Your sentence in big text"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {text ? (
        <div className="show__inner" ref={innerRef} tabIndex={-1}>
          <div className={flipped ? 'show__message is-flipped' : 'show__message'} data-flipped={flipped ? 'true' : undefined}>
            <p className="show__label">{reason ?? 'Show this to the other person'}</p>
            <p className="show__text" lang="en">
              {text}
            </p>
          </div>
          <div className="show__actions scan-cluster" data-scan-row="done">
            <Button variant="secondary" size="xl" onClick={onClose} data-autofocus="">
              Done
            </Button>
            <Button variant="secondary" size="xl" icon="flip" onClick={() => setFlipped((f) => !f)} aria-pressed={flipped} data-action="flip">
              Flip
            </Button>
          </div>
          <p className="nl-sr-only" aria-live="polite">
            {flipped ? 'Text flipped for the person across from you.' : ''}
          </p>
        </div>
      ) : null}
    </dialog>
  );
}
