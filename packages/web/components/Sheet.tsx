'use client';
import { useContext, useEffect, useId, useRef, type ReactNode } from 'react';
import { SURFACE_PHONE_QUERY, SurfaceContext, backdropCloses, boxOf, holdsText, panelSide, placePopover, showsConfirm, type SurfaceKind } from '@/lib/surface';
import { Button } from './Button';

/**
 * A modal surface on a native <dialog> (web-ui Req 36, ADR-011): showModal() makes the rest of the page inert,
 * Escape closes it, and focus returns to the control that opened it. No slide-in: surfaces appear in place.
 *
 * `kind` picks the container (lib/surface.ts): fit (a bottom sheet on phones, a popover by its button on larger
 * screens), panel (full height on phones with a Done bar at the bottom, a 440px side panel on larger screens) or
 * dialog (Settings: full height on phones, a centred 880px dialog on larger screens).
 *
 * Switch scanning (web-ui Req 16): the Close button is the first scan row, Back to Menu (when the Menu opened
 * this) the second; children mark their own rows with `data-scan-row`. The Done bar is not a scan row (Close is
 * already the first). While scanning, focus goes to the sheet itself, not to a button, so the scan highlight
 * stays the only ember thing on screen, and a press on the backdrop is the switch, never Close.
 */
export function Sheet({
  open,
  name,
  title,
  onClose,
  children,
  initialFocusId,
  scanning,
  kind = 'panel',
  back: ownBack,
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
  /** The container (web-ui Req 36.1). */
  kind?: SurfaceKind;
  /** A Back of the surface's own (Settings: All settings), in place of Back to Menu; null for none. */
  back?: { label: string; onBack: () => void } | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const opener = useRef<Element | null>(null);
  const openedAt = useRef(0);
  const downOnBackdrop = useRef(false);
  const scanningRef = useRef(scanning);
  scanningRef.current = scanning;
  const surface = useContext(SurfaceContext);
  const anchorRef = useRef(surface.anchor);
  anchorRef.current = surface.anchor;
  const back = open ? (ownBack !== undefined ? ownBack : surface.back) : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      // A surface that replaces another (Menu > Settings, or Back to the Menu) returns focus to the control on the
      // main screen that opened the first one, never to a button inside the surface it replaced.
      const active = document.activeElement;
      opener.current = active && active !== document.body && !active.closest('dialog') ? active : (anchorRef.current() ?? active);
      openedAt.current = Date.now();
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      place(d, kind, anchorRef.current());
      if (scanningRef.current) innerRef.current?.focus();
      else {
        const target = initialFocusId ? document.getElementById(initialFocusId) : null;
        (target ?? d.querySelector<HTMLElement>('.sheet__body [data-autofocus]') ?? d.querySelector<HTMLElement>('[data-autofocus]'))?.focus();
      }
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
      // With a switch, focus would draw a second ember ring on the screen: leave it on the page. When another
      // surface has already taken its place, it holds the focus.
      if (scanningRef.current) (document.activeElement as HTMLElement | null)?.blur?.();
      else if (!document.querySelector('dialog[open]')) (opener.current as HTMLElement | null)?.focus?.();
    }
  }, [open, initialFocusId, kind]);

  // Keep a popover by its button (and inside the screen) as the content or the window changes size.
  useEffect(() => {
    const d = ref.current;
    if (!open || !d || typeof window === 'undefined') return;
    const again = () => place(d, kind, anchorRef.current());
    window.addEventListener('resize', again);
    // The on-screen keyboard shrinks the visual viewport (web-ui Req 39.1): a bottom sheet rises above it.
    const vv = window.visualViewport;
    vv?.addEventListener('resize', again);
    vv?.addEventListener('scroll', again);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(again) : null;
    if (ro && innerRef.current) ro.observe(innerRef.current);
    return () => {
      window.removeEventListener('resize', again);
      vv?.removeEventListener('resize', again);
      vv?.removeEventListener('scroll', again);
      ro?.disconnect();
    };
  }, [open, kind]);

  const mayClose = () => {
    const d = ref.current;
    return !!d && backdropCloses({ scanning: !!scanningRef.current, hasText: holdsText(d), confirming: showsConfirm(d), openedAgoMs: Date.now() - openedAt.current });
  };

  return (
    <dialog
      ref={ref}
      className={`sheet sheet--${kind}`}
      data-overlay={name}
      data-kind={kind}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A press that starts and ends on the backdrop (the dialog itself, outside its content) closes it.
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === ref.current;
      }}
      onClick={(e) => {
        const onBackdrop = e.target === ref.current && downOnBackdrop.current;
        downOnBackdrop.current = false;
        if (onBackdrop && mayClose()) onClose();
      }}
    >
      {open ? (
        <div className="sheet__inner" ref={innerRef} tabIndex={-1}>
          {kind === 'fit' ? <div className="sheet__grabber" aria-hidden="true" /> : null}
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
          {back ? (
            <div className="sheet__back">
              <div className="scan-cluster" data-scan-row="back">
                <Button variant="quiet" icon="back" onClick={back.onBack} data-action="back">
                  {back.label}
                </Button>
              </div>
            </div>
          ) : null}
          <div className="sheet__body">{children}</div>
          {kind === 'panel' ? (
            // Phones: Done in thumb reach at the bottom. Not a scan row: Close is already the first one.
            <div className="sheet__foot">
              <Button variant="secondary" onClick={onClose} data-action="done" tabIndex={-1} aria-label={`Done, close ${title}`}>
                Done
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * A bottom sheet that scrolls shows it (web-ui Req 37.1): its bottom edge cuts through a control, never through the gap
 * between two, so a part of the next row is always in view. The sheet is made shorter until the edge is halfway
 * down the last control it reaches.
 */
function peek(d: HTMLDialogElement): void {
  // Short phones (ADR-005): every surface is the whole screen, never shortened.
  if (typeof window.matchMedia === 'function' && window.matchMedia('(max-height: 547px)').matches) return;
  const body = d.querySelector<HTMLElement>('.sheet__body');
  if (!body || body.scrollHeight <= body.clientHeight + 1) return;
  const edge = body.getBoundingClientRect().bottom;
  const ctrls = [...body.querySelectorAll<HTMLElement>('button, a[href], input, select')].map((c) => c.getBoundingClientRect()).filter((r) => r.height > 0);
  if (ctrls.some((r) => r.top < edge - 16 && r.bottom > edge + 16)) return;
  const last = ctrls.filter((r) => r.top < edge - 16).pop();
  if (!last) return;
  const cut = edge - (last.top + last.height / 2);
  if (cut > 0) d.style.maxHeight = `${Math.floor(d.getBoundingClientRect().height - cut)}px`;
}

/** Lay the open dialog out for its kind and the screen: a popover's place, or a panel's side. */
function place(d: HTMLDialogElement, kind: SurfaceKind, anchor: Element | null): void {
  if (typeof window === 'undefined') return;
  const phone = typeof window.matchMedia === 'function' && window.matchMedia(SURFACE_PHONE_QUERY).matches;
  const vp = { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight };
  if (kind === 'panel') {
    d.dataset.side = phone ? 'full' : panelSide(boxOf(anchor), vp.width);
    return;
  }
  d.style.removeProperty('max-height');
  d.style.removeProperty('bottom');
  if (kind !== 'fit' || phone) {
    d.style.removeProperty('top');
    d.style.removeProperty('left');
    delete d.dataset.side;
    if (kind === 'fit' && phone) {
      // A keyboard covers the bottom of the layout viewport: sit on top of it, as tall as the room above allows.
      const vv = window.visualViewport;
      const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
      if (kb > 40 && vv) {
        d.style.top = 'auto';
        d.style.bottom = `${Math.round(kb)}px`;
        d.style.maxHeight = `${Math.floor(vv.height)}px`;
        d.dataset.keyboard = 'up';
        // Done (a form's submit) stays in view above the keyboard, even when the room is short (web-ui Req 39.1).
        d.querySelector<HTMLElement>('form button[type="submit"]')?.scrollIntoView?.({ block: 'nearest' });
        return;
      }
      delete d.dataset.keyboard;
      peek(d);
    }
    return;
  }
  const at = placePopover(boxOf(anchor), { width: d.offsetWidth, height: d.offsetHeight }, vp);
  if (at.maxHeight) d.style.maxHeight = `${at.maxHeight}px`;
  d.style.top = `${Math.round(at.top)}px`;
  d.style.left = `${Math.round(at.left)}px`;
  d.dataset.side = at.side;
}

