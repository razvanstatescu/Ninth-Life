/**
 * In a conversation: the four box drawings (design.md 4.4; MS-7.3, MS-7.4, MS-7.7, MS-7.8). Pictures,
 * not controls: aria-hidden, divs only, nothing focusable (MS-7.2). Each root is a data-play drawing
 * that plays once (A7); the base styles show the finished state (MS-7.5). Drawn buttons are
 * secondary, and ember appears only as a pressed ring (MS-7.3).
 */
import { Icon } from '@/components/Icon';
import { ProofChip } from '@/components/ProofChip';
import type { SpellExample } from '../site-data';
import { play, role } from './roles';

/** The app's They said strip: "Nothing yet." until step `at`, then the other person's line (V4, V16). */
export function Strip({ at }: { at: 1 | 3 }) {
  return (
    <div className="site-strip">
      <Icon name="said" />
      <div className="site-strip__body">
        <span className="site-strip__label">They said</span>
        <span className="site-cell site-strip__line">
          <span className={`site-strip__empty ${role('out', at)}`}>Nothing yet.</span>
          <span className={role('in', at)}>What do you need?</span>
        </span>
      </div>
    </div>
  );
}

/** They said: the line arrives, then the reply in the well with its keys. */
export function SaidStrip({ sentence, keys }: { sentence: string; keys: string }) {
  return (
    <div className={`site-drawing site-theysaid ${play('frame')}`} data-play="" aria-hidden="true">
      <Strip at={1} />
      <div className={`site-well ${role('rise', 2)}`}>
        <div className="site-well__body">
          <span className="site-well__text">{sentence}</span>
          <span className="site-well__keys">{keys}</span>
        </div>
      </div>
    </div>
  );
}

function ShowMessage({ sentence, roles }: { sentence: string; roles: string }) {
  return (
    <div className={`site-show__msg ${roles}`}>
      <p className="site-show__label">Show</p>
      <p className="site-show__text">{sentence}</p>
    </div>
  );
}

/** Show and Flip: Flip is pressed and the message is turned for the person opposite (a still layout, D6.1). */
export function ShowFlip({ sentence }: { sentence: string }) {
  return (
    <div className={`site-drawing site-showflip ${play('frame')}`} data-play="" aria-hidden="true">
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
    </div>
  );
}

/** Saved phrases: Save phrase is pressed, the list shows, the new phrase rises in on top. */
export function PhraseSave({ sentence }: { sentence: string }) {
  return (
    <div className={`site-drawing site-phrases ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-cell">
        <div className={`site-well site-phrases__well ${role('out', 2)}`}>
          <span className="site-well__text">{sentence}</span>
          <div className="nl-btn nl-btn--secondary site-drawn-btn">
            <div className={`site-press-ring ${role('ring', 1, 2)}`} />
            <Icon name="save" />
            Save phrase
          </div>
        </div>
        <div className={`site-phrases__list ${role('in', 2)}`}>
          <span className="site-phrases__head">Your phrases</span>
          <ul className="site-phrases__rows">
            <li className={role('rise', 3)}>
              <Icon name="speaker" />
              {sentence}
            </li>
            <li>
              <Icon name="speaker" />
              Thank you
            </li>
            <li>
              <Icon name="speaker" />
              Yes, please
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Spell and My words: the spelled name is New, Add to my words is pressed, and it Matches. */
export function WordAdd({ spell }: { spell: SpellExample }) {
  return (
    <div className={`site-drawing site-wordadd ${play('frame')}`} data-play="" aria-hidden="true">
      <div className="site-cell">
        <div className={`site-wordadd__step ${role('out', 2)}`}>
          <ProofChip state="new" word={spell.word} code={spell.code} />
          <span className="site-wordadd__line">Not in your words yet.</span>
          <div className="nl-btn nl-btn--secondary site-drawn-btn">
            <div className={`site-press-ring ${role('ring', 1, 2)}`} />
            <Icon name="plus" />
            Add to my words
          </div>
        </div>
        <div className={`site-wordadd__step ${role('in', 2)}`}>
          <ProofChip state="match" word={spell.word} code={spell.code} />
          <span className="site-wordadd__line">In my words.</span>
        </div>
      </div>
    </div>
  );
}
