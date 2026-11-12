/**
 * How it works: one small app screen that the three steps act on (design.md 4.1; MS-7.3, MS-8.12).
 * The sentence well, up to three sentence rows and the 64px keypad. A picture, not a control:
 * aria-hidden, divs only, nothing focusable (MS-7.2). The drawn Speak is secondary, never primary
 * (MS-1.6), and ember appears only as a pressed ring (MS-7.3).
 *
 * part 'all' is the desktop picture: not a data-play root; its parts carry data-s (the step they
 * belong to) and site.css plays them from .site-how's data-how-step and data-how-play (A8).
 * parts 1-3 are the per-step stages under 1024px: each a data-play root that plays once (A7).
 * The base styles show the finished state of every step: well "Home", "4 6 6 3", the chosen row,
 * Speak reading "Speaking", no ring (MS-7.5).
 */
import { Icon } from '@/components/Icon';
import { KEY_DRAWING_SIZE, KeypadPicture, type KeyRing } from '../KeypadPicture';
import type { HowData } from '../site-data';
import { play, role, type Span } from './roles';

type Part = 'all' | 1 | 2 | 3;

/** The well's first three texts and digits show from one press until the next; typing[3] stays (k3). */
const TYPING: readonly [Span, Span, Span] = [[0, 1], [1, 2], [2, 3]];
const PRESSES = [0, 1, 2] as const;
const ROWS = [0, 1, 2] as const;

/** 4 6 6 3. The second 6 is its own, late ring, so the key dips between the two presses (V29, V35). */
const RINGS: readonly KeyRing[] = [
  { key: '4', k: 0, u: 1, s: '1' },
  { key: '6', k: 1, u: 2, s: '1' },
  { key: '6', k: 2, u: 3, late: 'late', s: '1' },
  { key: '3', k: 3, u: 4, s: '1' },
];

const PLAY = { 1: play('type'), 2: play('sweep'), 3: play('frame') } as const;

const capitalize = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
/** The digits of the first n presses, spaced: "4 6 6". */
const pressed = (code: string, n: number) => code.slice(0, n).split('').join(' ');

function Well({ how, part }: { how: HowData; part: Part }) {
  const chosen = how.sentences[how.chosen];
  const typing = part === 'all' || part === 1;
  const choosing = (part === 'all' || part === 2) && chosen !== undefined;
  const speak = part === 'all' || part === 3;
  const last = typing ? (
    <span data-s="1" className={role('in', 3)}>
      {how.typing[3]}
    </span>
  ) : (
    <span>{how.typing[3]}</span>
  );
  let text = last;
  if (choosing) {
    text = (
      <>
        <span data-s="2" className={role('out', 5)}>
          {last}
        </span>
        <span data-s="2" className={role('in', 5)}>
          {capitalize(chosen)}
        </span>
      </>
    );
  } else if (part === 3 && chosen !== undefined) {
    text = <span>{capitalize(chosen)}</span>;
  }
  return (
    <div className={speak ? 'site-well site-well--row' : 'site-well'}>
      <div className="site-well__body">
        <div className="site-cell site-well__text">
          {typing ? (
            <span data-s="1" className={`site-well__hint ${role('out', 0)}`}>
              Press a key to start
            </span>
          ) : null}
          {typing
            ? PRESSES.map((i) => (
                <span key={i} data-s="1" className={role('during', ...TYPING[i])}>
                  {how.typing[i]}
                </span>
              ))
            : null}
          {text}
        </div>
        <div className="site-cell site-well__keys">
          {typing ? (
            <>
              {PRESSES.map((i) => (
                <span key={i} data-s="1" className={role('during', ...TYPING[i])}>
                  {pressed(how.code, i + 1)}
                </span>
              ))}
              <span data-s="1" className={role('in', 3)}>
                {pressed(how.code, 4)}
              </span>
            </>
          ) : (
            <span>{pressed(how.code, 4)}</span>
          )}
        </div>
      </div>
      {speak ? (
        <div className="nl-btn nl-btn--secondary site-drawn-btn">
          <div data-s="3" className={`site-press-ring ${role('ring', 0, 1)}`} />
          <Icon name="speaker" />
          <span className="site-cell">
            <span data-s="3" className={role('out', 1)}>
              Speak
            </span>
            <span data-s="3" className={role('in', 1)}>
              Speaking
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** The chosen marker: a stronger edge, a sunken fill behind the text and a check, never ember (MS-7.3). */
function Marker({ roles }: { roles: string }) {
  return (
    <div data-s="2" className={`site-cand__mark ${roles}`}>
      <Icon name="check" />
    </div>
  );
}

/**
 * The sentence rows. In the desktop picture (ghosts) each row shares a cell with a faint empty row, a
 * placeholder that shows while step 2 has not played and fades out as its row rises in (P1), so the
 * picture has no empty band at step 1. The finished state hides the placeholders (.site-out).
 */
function Rows({ how, ghosts }: { how: HowData; ghosts: boolean }) {
  return (
    <div className="site-cands">
      {ROWS.map((row) => {
        const sentence = how.sentences[row];
        if (sentence === undefined) return null;
        const cand = (
          <div key={row} data-s="2" className={`nl-candidate site-cand ${role('rise', row)}`}>
            {row === 0 ? <Marker roles={role('ring', 3, 5)} /> : null}
            {row === how.chosen ? <Marker roles={role('mark', 5)} /> : null}
            <span className="nl-candidate__rank">{row + 1}</span>
            <span className="nl-candidate__text">{sentence}</span>
          </div>
        );
        if (!ghosts) return cand;
        return (
          <div key={row} className="site-cell">
            <div data-s="2" className={`site-cand__ghost ${role('out', row)}`} />
            {cand}
          </div>
        );
      })}
    </div>
  );
}

export function HowScreen({ how, part }: { how: HowData; part: Part }) {
  const rows = (part === 'all' || part === 2) && how.sentences.length > 0;
  const keypad = part === 'all' || part === 1;
  const body = (
    <>
      <Well how={how} part={part} />
      {rows ? <Rows how={how} ghosts={part === 'all'} /> : null}
      {keypad ? <KeypadPicture size={KEY_DRAWING_SIZE} rings={RINGS} /> : null}
    </>
  );
  if (part === 'all') {
    return (
      <div className="site-drawing site-how-screen" aria-hidden="true">
        {body}
      </div>
    );
  }
  return (
    <div className={`site-drawing site-how-screen ${PLAY[part]}`} data-play="" aria-hidden="true">
      {body}
    </div>
  );
}
