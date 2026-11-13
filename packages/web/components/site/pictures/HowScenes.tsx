/**
 * How it works, round 4 (2026-11-13; design.md "Round 4: How it works"; MS-7.4, MS-8.11): three scenes
 * cut from the app's own screen, one per step. Each is the data-play root inside its stage; the stage is
 * aria-hidden, the parts are divs and nothing is focusable (MS-7.2). The base styles show the finished frames
 * (MS-7.5); site.css plays each once (A7), and from 1024px in story order along the row.
 *
 * 1 Press: keypad rows 1 and 2 (keys 1 to 6) on their panel. Rings on 4, 6, 6 and 3 (the second 6 is its own, late
 *   ring, V29); each digit lands one step after its press (cause, then effect).
 * 2 Pick: the app's status pill, then the decoder's top 3 for 4663 as candidate rows. The marker starts on the first
 *   row (the one shown) and the check lands on "home" (the pick). The marker is never ember (MS-7.3).
 * 3 Speak: the sentence card with the pick and its keys, drawn Speak (secondary, never primary: MS-1.6) pressed once
 *   (the one ember ring) and reading Speaking, and Show.
 */
import { Icon } from '@/components/Icon';
import { KEY_DRAWING_SIZE, KeypadPicture, type KeyRing } from '../KeypadPicture';
import type { HowData } from '../site-data';
import { play, role } from './roles';

/** 4 6 6 3, one step each. */
const RINGS: readonly KeyRing[] = [
  { key: '4', k: 0, u: 1 },
  { key: '6', k: 1, u: 2 },
  { key: '6', k: 2, u: 3, late: 'late' },
  { key: '3', k: 3, u: 4 },
];
/** The step each digit of 4663 lands at: one after its press. */
const DIGIT_STEPS = [1, 2, 3, 4] as const;
/** The step each sentence row rises at. */
const ROW_STEPS = [1, 2, 3] as const;

export function HowPress({ how }: { how: HowData }) {
  return (
    <div className={`site-drawing site-how__scene site-how__press ${play('quick')}`} data-play="">
      <KeypadPicture size={KEY_DRAWING_SIZE} rows={2} rings={RINGS} />
      <div className="site-how__digits">
        {DIGIT_STEPS.map((k, i) => (
          <span key={i} className={role('in', k)}>
            {how.code[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The row marker: a stronger edge, a sunken fill behind the text and a check, never ember (MS-7.3, MS-9.3). */
function Marker({ roles }: { roles: string }) {
  return (
    <div className={`site-cand__mark ${roles}`}>
      <Icon name="check" />
    </div>
  );
}

export function HowPick({ how }: { how: HowData }) {
  return (
    <div className={`site-drawing site-how__scene site-how__pick ${play('sweep')}`} data-play="">
      {how.labels.length > 0 ? (
        <>
          <div className="site-how__pill">
            <Icon name="check" />
            Offline dictionary ready
          </div>
          <div className="site-cands">
            {ROW_STEPS.map((k, row) => {
              const label = how.labels[row];
              if (label === undefined) return null;
              return (
                <div key={row} className={`nl-candidate site-cand ${role('rise', k)}`}>
                  {row === 0 ? <Marker roles={role('ring', 2, 4)} /> : null}
                  {row === how.chosen ? <Marker roles={role('mark', 4)} /> : null}
                  <span className="nl-candidate__rank">{row + 1}</span>
                  <span className="nl-candidate__text">{label}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function HowSpeak({ how }: { how: HowData }) {
  const chosen = how.labels[how.chosen];
  return (
    <div className={`site-drawing site-how__scene site-how__speak ${play('sweep')}`} data-play="">
      <div className="site-well">
        <div className="site-well__body">
          {chosen !== undefined ? (
            <div className="site-well__text">
              <span className={role('in', 0)}>{chosen}</span>
            </div>
          ) : null}
          <div className="site-well__keys">
            <span className={role('in', 0)}>{how.code}</span>
          </div>
        </div>
      </div>
      <div className="site-how__actions">
        <div className="nl-btn nl-btn--secondary site-drawn-btn">
          <div className={`site-press-ring ${role('ring', 1, 2)}`} />
          <Icon name="speaker" />
          <span className="site-cell">
            <span className={role('out', 2)}>Speak</span>
            <span className={role('in', 2)}>Speaking</span>
          </span>
        </div>
        <div className="nl-btn nl-btn--secondary site-drawn-btn">
          <Icon name="show" />
          Show
        </div>
      </div>
    </div>
  );
}
