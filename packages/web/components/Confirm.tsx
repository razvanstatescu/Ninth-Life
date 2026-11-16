'use client';
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import type { IconName } from './Icon';

/**
 * The one confirm (web-ui Req 39.3), inline in the surface that owns the action: the question in bold (and a line under
 * it when needed), then the safe choice (Keep or Cancel, secondary) first, then the action. Side by side from 600px,
 * stacked below. A red frame only when the action cannot be undone. The safe choice has focus; while switch scanning
 * the question itself does (no second ember ring), and the pair is one scan row with the safe choice its first cell.
 * `data-confirm` keeps a press on the backdrop from closing the surface while it is asked (Req 36.4).
 */
export interface ConfirmHandle {
  focus(): void;
}
export const Confirm = forwardRef<
  ConfirmHandle,
  {
    question: string;
    detail?: ReactNode;
    safe?: string;
    action: string;
    actionIcon?: IconName;
    onSafe: () => void;
    onAction: () => void;
    /** Cannot be undone: the red frame and a danger button. */
    irreversible?: boolean;
    /** Switch scanning drives the surface. */
    scanning?: boolean;
    /** The scan row's name. */
    scanRow: string;
    /** alertdialog for a question that stops everything (Turn off switch scanning?); group otherwise. */
    role?: 'group' | 'alertdialog';
    /** Identifies the confirm (`data-confirm`). */
    name: string;
    className?: string;
  }
>(function Confirm({ question, detail, safe = 'Keep', action, actionIcon, onSafe, onAction, irreversible = false, scanning = false, scanRow, role = 'group', name, className }, ref) {
  const qId = useId();
  const dId = useId();
  const box = useRef<HTMLDivElement>(null);
  const safeRef = useRef<HTMLButtonElement>(null);
  const focus = () => (scanning ? box.current?.focus() : safeRef.current?.focus());
  useImperativeHandle(ref, () => ({ focus }));
  useEffect(() => {
    focus();
  }, []); // when the question appears
  return (
    <div
      ref={box}
      className={['confirm', irreversible ? 'confirm--danger' : '', className ?? ''].filter(Boolean).join(' ')}
      role={role}
      aria-labelledby={qId}
      aria-describedby={detail ? dId : undefined}
      tabIndex={-1}
      data-confirm={name}
    >
      <p className="confirm__q" id={qId}>
        {question}
      </p>
      {detail ? (
        <p className="confirm__detail" id={dId}>
          {detail}
        </p>
      ) : null}
      <div className="confirm__buttons scan-cluster" data-scan-row={scanRow}>
        <Button ref={safeRef} variant="secondary" onClick={onSafe}>
          {safe}
        </Button>
        <Button variant={irreversible ? 'danger' : 'secondary'} icon={actionIcon} onClick={onAction}>
          {action}
        </Button>
      </div>
    </div>
  );
});
