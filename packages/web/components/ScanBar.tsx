import { formatSeconds, type AccessMode } from '@/lib/settings';
import type { ScanPhase } from '@ninth/core';
import { Button } from './Button';

/** The speed control under the keypad (artboard: "Switch scanning: 1.2 s a step"). */
export function ScanBar({
  access,
  scanMs,
  phase,
  onSlower,
  onFaster,
  onTurnOn,
}: {
  access: AccessMode;
  scanMs: number;
  phase: ScanPhase;
  onSlower: () => void;
  onFaster: () => void;
  onTurnOn: () => void;
}) {
  const scanning = access === 'scan1' || access === 'scan2';
  if (!scanning) {
    return (
      <div className="scanbar order-scan">
        <span className="scanbar__text">Switch scanning is off</span>
        <Button variant="secondary" onClick={onTurnOn}>
          Turn on
        </Button>
      </div>
    );
  }
  const status =
    phase === 'idle'
      ? access === 'scan1'
        ? 'Press your switch (Space or Enter) to start scanning.'
        : 'Press Space to move the highlight, Enter to choose.'
      : phase === 'paused'
        ? 'Scanning paused. Press your switch to start again.'
        : access === 'scan1'
          ? 'Press your switch to choose the row, then the key.'
          : 'Space moves the highlight. Enter chooses.';
  return (
    <>
      <div className="scanbar order-scan">
        <span className="scanbar__text">
          {access === 'scan1' ? `Switch scanning: ${formatSeconds(scanMs)} a step` : 'Step scanning with 2 switches'}
        </span>
        {access === 'scan1' ? (
          <>
            <Button variant="secondary" onClick={onSlower} aria-label={`Slower, now ${formatSeconds(scanMs)} a step`}>
              Slower
            </Button>
            <Button variant="secondary" onClick={onFaster} aria-label={`Faster, now ${formatSeconds(scanMs)} a step`}>
              Faster
            </Button>
          </>
        ) : null}
      </div>
      <p className="scan-status order-scan" role="status" aria-live="polite">
        {status}
      </p>
    </>
  );
}
