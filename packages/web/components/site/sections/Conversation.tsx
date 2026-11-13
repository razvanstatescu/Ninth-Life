/**
 * In a conversation (#conversation, content.md §4, design.md §4; round 2: a stage first in each card, 4.3).
 * Round 3 (2026-11-12): a surface band (Results moved up, so the bands still alternate); each card's
 * title says what it does for you, with the app's feature name as a small label above it in one hgroup (P2-9).
 * Round 4 (2026-11-13; decisions §2 "Boxes"): a lead card first (They said, across the grid, its stage
 * beside its words from 1024px), then three cards in one row from 1024px (.site-bento--3); every feature name carries
 * its icon; one short line per card.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { PhraseSave, SaidTurn, ShowFlip, WordAdd } from '../pictures/Conversation';
import type { SpellExample } from '../site-data';

/** The reveal stagger restarts in each row: the lead alone, then the row of three (0, 1, 2). */
const reveal = (i: number) => ({ '--reveal-i': Math.min(i, 2) }) as CSSProperties;

function Card({ i, lead, drawing, icon, feature, title, children }: { i: number; lead?: boolean; drawing: ReactNode; icon: ReactNode; feature: string; title: string; children: ReactNode }) {
  return (
    <div className={lead ? 'site-card site-card--lead' : 'site-card'} data-reveal="" style={reveal(i)}>
      <div className={lead ? 'site-stage site-stage--lead' : 'site-stage site-stage--m'} aria-hidden="true">
        {drawing}
      </div>
      <hgroup className="site-card__titles">
        <p className="site-card__feature">
          {icon}
          {feature}
        </p>
        <h3 className="site-h3">{title}</h3>
      </hgroup>
      <p>{children}</p>
    </div>
  );
}

export function Conversation({ sentence, keys, spell }: { sentence: string; keys: string; spell: SpellExample }) {
  return (
    <section id="conversation" className="site-band site-band--surface" aria-labelledby="conversation-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="conversation-title" className="site-h2">
            Made for both sides of a conversation
          </h2>
          <p className="site-lead">Ninth Life keeps the other person in view, so a conversation does not stop while a sentence is typed.</p>
        </div>
        <div className="site-grid site-bento site-bento--3">
          <Card i={0} lead drawing={<SaidTurn sentence={sentence} keys={keys} />} icon={<Icon name="said" />} feature="They said" title="Answer what they just said">
            Type their last line, or press Listen to turn their speech into text. Listen is off until you allow it.
          </Card>
          <Card i={0} drawing={<ShowFlip sentence={sentence} />} icon={<Icon name="flip" />} feature="Show and Flip" title="Turn your words to face them">
            Show puts your sentence in big text. Flip turns it around for the person sitting opposite.
          </Card>
          <Card i={1} drawing={<PhraseSave sentence={sentence} />} icon={<Icon name="save" />} feature="Saved phrases" title="Keep what you say often">
            Press Save phrase to keep a sentence on this device. Nothing is saved until you do.
          </Card>
          <Card i={2} drawing={<WordAdd spell={spell} />} icon={<Icon name="spell" />} feature="Spell and My words" title="Spell a name once">
            Spell it letter by letter, then add it to My words. A plus means it matches your keys but is not in the dictionary or My words yet.
          </Card>
        </div>
      </div>
    </section>
  );
}
