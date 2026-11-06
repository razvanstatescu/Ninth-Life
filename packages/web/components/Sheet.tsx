'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

/**
 * A modal sheet on a native <dialog>: showModal() traps focus, Escape closes it, and focus
 * returns to the control that opened it. No slide-in: sheets appear in place.
 *
 * Switch scanning (web-ui Req 16): the Close button is the first scan row; children mark their
 * own rows with `data-scan-row`. While scanning, focus goes to the sheet itself, not to a button,
 * so the scan highlight stays the only ember thing on screen.
 */
export function Sheet({
  open,
  name,
  title,
  onClose,
  children,
  initialFocusId,
  scanning,
}: {
  open: boolean;
  /** Identifies the sheet for scanning (`data-overlay`). */
  name: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** id of the element to focus when the sheet opens (for example the voice picker). */
  initialFocusId?: string;
  /** Switch scanning drives this sheet. */
  scanning?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const opener = useRef<Element | null>(null);
  const scanningRef = useRef(scanning);
  scanningRef.current = scanning;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      if (scanningRef.current) innerRef.current?.focus();
      else {
        const target = initialFocusId ? document.getElementById(initialFocusId) : null;
        (target ?? d.querySelector<HTMLElement>('[data-autofocus]'))?.focus();
      }
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
      // With a switch, focus would draw a second ember ring on the screen: leave it on the page.
      if (scanningRef.current) (document.activeElement as HTMLElement | null)?.blur?.();
      else (opener.current as HTMLElement | null)?.focus?.();
    }
  }, [open, initialFocusId]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      data-overlay={name}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {open ? (
        <div className="sheet__inner" ref={innerRef} tabIndex={-1}>
          <div className="sheet__head">
            <h2 className="sheet__title" id={titleId}>
              {title}
            </h2>
            <div className="scan-cluster" data-scan-row="close">
              <Button variant="secondary" icon="x" onClick={onClose} data-autofocus="">
                Close
              </Button>
            </div>
          </div>
          <div className="sheet__body">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
