/**
 * In a conversation: the four box drawings (design.md 4.4; MS-7.3, MS-7.4, MS-7.5, MS-7.7, MS-7.8). Pictures, not
 * controls: aria-hidden, divs only, nothing focusable (MS-7.2). Each root is a data-play drawing that plays once
 * (A7); the base styles show the finished state (MS-7.5). Drawn buttons are secondary, and ember appears only as a
 * pressed ring (MS-7.3).
 *
 * Round 4 (2026-11-13, Claude Code; decisions §2 "Boxes"): one scale (the sentence in `candidate` type), a still
 * arrow from each cause to its result so a finished or reduced-motion frame tells the story, the Show card turned
 * between the two edges of the table (amends W1 for Show and Flip: the edges replace the small upright card), and
 * the saved phrases as the app's Phrases sheet. Cause leads, effect follows: a ring at step k, its result at k + 1.
 */
import { Icon } from '@/components/Icon';
import { ProofChip } from '@/components/ProofChip';
import { SiteIcon, arrow } from '../icons';
import type { SpellExample } from '../site-data';
import type { ReactNode } from 'react';
import { play, role, type KStep } from './roles';

/** A still arrow from a cause to its result; it fades in at step k of the play (round 4). */
export function Arrow({ k, turn = 'down', label }: { k: KStep; turn?: 'up' | 'down'; label?: string }) {
  return (
    <span className={`site-arrow ${role('in', k)}`}>
      <SiteIcon d={arrow} turn={turn} />
      {label ? <span className="site-arrow__label">{label}</span> : null}
    </span>
  );
}

/**
 * The app's They said strip. Its line is one cell: "Nothing yet." until step `from`, then the Listen status in words
 * while it listens (accessibility rule 12), then the other person's line from step `at` (V4, V16).
 */
export function Strip({ from, at, children }: { from: 2; at: 3 | 4; children?: ReactNode }) {
  return (
    <div className="site-strip">
      <Icon name="said" />
      <div className="site-strip__body">
        <span className="site-strip__label">They said</span>
        <span className="site-cell site-strip__line">
          <span className={`site-strip__empty ${role('out', from)}`}>Nothing yet.</span>
          <span className={`site-strip__status ${role('during', from, at)}`}>Listening. Ask them to speak now.</span>
          <span className={role('in', at)}>What do you need?</span>
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * The drawn Listen button: pressed at step 1 (the one ember ring, until step 2), it reads Stop while it listens and
 * Listen again from step `back`.
 */
export function ListenButton({ back }: { back: 4 | 5 }) {
  return (
    <div className="nl-btn nl-btn--secondary site-drawn-btn site-listen">
      <div className={`site-press-ring ${role('ring', 1, 2)}`} />
      <span className="site-cell">
        <span className={`site-listen__label ${role('out', 1)}`}>
          <Icon name="mic" />
          Listen
        </span>
        <span className={`site-listen__label ${role('during', 1, back)}`}>
          <Icon name="stop" />
          Stop
        </span>
        <span className={`site-listen__label ${role('in', back)}`}>
          <Icon name="mic" />
          Listen
        </span>
      </span>
    </div>
  );
}

/**
 * They said (the section's lead): Listen is pressed (1), the strip says it is listening (2), the other person's line
 * arrives (3), Listen comes back with an arrow to the reply (4), and the reply forms in the sentence card with its keys
 * (5). At most three changes at one instant (language rule 3); last change 3,500 ms after the trigger.
 */
export function SaidTurn({ sentence, keys }: { sentence: string; keys: string }) {
  return (
    <div className={`site-drawing site-turn ${play('frame')}`} data-play="" aria-hidden="true">
      <Strip from={2} at={3}>
        <ListenButton back={4} />
      </Strip>
      <Arrow k={4} />
      <div className="site-well">
        <span className="site-cell">
          <span className={`site-well__hint ${role('out', 5)}`}>Press a key to start</span>
          <span className={`site-well__body ${role('rise', 5)}`}>
            <span className="site-well__text">{sentence}</span>
            <span className="site-well__keys">{keys}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

function ShowMessage({ sentence, roles }: { sentence: string; roles: string }) {
  return (
    <div className={`site-show__msg ${roles}`}>
      <p className="site-show__label">Show this to the other person</p>
      <p className="site-show__text">{sentence}</p>
    </div>
  );
}

/**
 * Show and Flip on a table: the far edge is the person opposite, the near edge is you. Flip is pressed and the
 * message turns to face them (a cross-fade between two still frames, never a rotation in motion), while Done and Flip
 * stay upright for you, as in the app's Show mode.
 */
export function ShowFlip({ sentence }: { sentence: string }) {
  return (
    <div className={`site-drawing site-table ${play('frame')}`} data-play="" aria-hidden="true">
      <span className="site-edge">The person opposite</span>
      <div className="site-show">
        <div className="site-cell">
          <ShowMessage sentence={sentence} roles={role('out', 2)} />
          <ShowMessage sentence={sentence} roles={`site-show__msg--flipped ${role('in', 2)}`} />
        </div>
        <div className="site-show__actions">
          <div className="nl-btn nl-btn--secondary site-drawn-btn">Done</div>
          <div className="nl-btn nl-btn--secondary site-drawn-btn">
            <div className={`site-press-ring ${role('ring', 1, 2)}`} />
            <Icon name="flip" />
            Flip
          </div>
        </div>
      </div>
      <span className="site-edge">You</span>
    </div>
  );
}

/** Saved phrases: Save phrase is pressed, the Phrases sheet shows "Your phrases", and the new phrase rises in on top. */
export function PhraseSave({ sentence }: { sentence: string }) {
  return (
    <div className={`site-drawing site-save ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-well site-well--row">
        <span className="site-well__text">{sentence}</span>
        <div className="nl-btn nl-btn--secondary site-drawn-btn">
          <div className={`site-press-ring ${role('ring', 1, 2)}`} />
          <Icon name="save" />
          Save phrase
        </div>
      </div>
      <Arrow k={2} />
      <div className={`site-sheet ${role('in', 2)}`}>
        <span className="site-sheet__title">Your phrases</span>
        <ul className="site-sheet__rows">
          <li className={`site-sheet__new ${role('rise', 3)}`}>
            <Icon name="speaker" />
            {sentence}
          </li>
          <li>
            <Icon name="speaker" />
            Thank you
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Spell and My words: the spelled name is New, Add to my words is pressed, and it Matches (MS-7.8). */
export function WordAdd({ spell }: { spell: SpellExample }) {
  return (
    <div className={`site-drawing site-spell ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-spell__row">
        <ProofChip state="new" word={spell.word} code={spell.code} />
        <span className="site-spell__line">Not in your words yet.</span>
      </div>
      <div className="nl-btn nl-btn--secondary site-drawn-btn">
        <div className={`site-press-ring ${role('ring', 1, 2)}`} />
        <Icon name="plus" />
        Add to my words
      </div>
      <Arrow k={2} />
      <div className={`site-spell__row ${role('rise', 2)}`}>
        <ProofChip state="match" word={spell.word} code={spell.code} />
        <span className="site-spell__line">In my words.</span>
      </div>
    </div>
  );
}
