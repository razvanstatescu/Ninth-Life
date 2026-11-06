'use client';
import { useEffect, useRef } from 'react';
import { Button } from './Button';

/** Big-text show mode: for when there is no voice, or a noisy room. */
export function ShowMode({ text, reason, onClose }: { text: string | null; reason: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (text && !d.open) {
      opener.current = document.activeElement;
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!text && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
      (opener.current as HTMLElement | null)?.focus?.();
    }
  }, [text]);
  return (
    <dialog
      ref={ref}
      className="show"
      aria-label="Your sentence in big text"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {text ? (
        <div className="show__inner">
          <p className="show__label">{reason ?? 'Show this to the other person'}</p>
          <p className="show__text" lang="en">
            {text}
          </p>
          <Button variant="secondary" size="xl" onClick={onClose} data-autofocus="">
            Done
          </Button>
        </div>
      ) : null}
    </dialog>
  );
}
