'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

/**
 * A modal sheet on a native <dialog>: showModal() traps focus, Escape closes it, and focus
 * returns to the control that opened it. No slide-in: sheets appear in place.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
  initialFocusId,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** id of the element to focus when the sheet opens (for example the voice picker). */
  initialFocusId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      const target = initialFocusId ? document.getElementById(initialFocusId) : null;
      (target ?? d.querySelector<HTMLElement>('[data-autofocus]'))?.focus();
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
      (opener.current as HTMLElement | null)?.focus?.();
    }
  }, [open, initialFocusId]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {open ? (
        <div className="sheet__inner">
          <div className="sheet__head">
            <h2 className="sheet__title" id={titleId}>
              {title}
            </h2>
            <Button variant="secondary" onClick={onClose} data-autofocus="">
              Done
            </Button>
          </div>
          <div className="sheet__body">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
