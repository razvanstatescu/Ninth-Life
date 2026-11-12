/** In a conversation (#conversation, content.md §4, design.md §4; round 2: a stage first in each card, 4.3). */
import type { CSSProperties } from 'react';
import { PhraseSave, SaidStrip, ShowFlip, WordAdd } from '../pictures/Conversation';
import type { SpellExample } from '../site-data';

const reveal = (i: number) => ({ '--reveal-i': Math.min(i, 2) }) as CSSProperties;

export function Conversation({ sentence, keys, spell }: { sentence: string; keys: string; spell: SpellExample }) {
  return (
    <section id="conversation" className="site-band" aria-labelledby="conversation-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="conversation-title" className="site-h2">
            Made for both sides of a conversation
          </h2>
          <p className="site-lead">Ninth Life keeps the other person in view, so a conversation does not stop while a sentence is typed.</p>
        </div>
        <div className="site-grid site-grid--boxes">
          <div className="site-card" data-reveal="" style={reveal(0)}>
            <div className="site-stage" aria-hidden="true">
              <SaidStrip sentence={sentence} keys={keys} />
            </div>
            <h3 className="site-h3">They said</h3>
            <p>Type the other person's last line, or press Listen and let your browser turn their speech into text. Listen is off until you allow it.</p>
          </div>
          <div className="site-card" data-reveal="" style={reveal(1)}>
            <div className="site-stage" aria-hidden="true">
              <ShowFlip sentence={sentence} />
            </div>
            <h3 className="site-h3">Show and Flip</h3>
            <p>Show puts your sentence in big text. Flip turns it around for the person sitting opposite.</p>
          </div>
          <div className="site-card" data-reveal="" style={reveal(2)}>
            <div className="site-stage" aria-hidden="true">
              <PhraseSave sentence={sentence} />
            </div>
            <h3 className="site-h3">Saved phrases</h3>
            <p>Keep the sentences you say often. They stay on this device, and only when you press Save phrase.</p>
          </div>
          <div className="site-card" data-reveal="" style={reveal(3)}>
            <div className="site-stage" aria-hidden="true">
              <WordAdd spell={spell} />
            </div>
            <h3 className="site-h3">Spell and My words</h3>
            <p>Spell a name or a rare word letter by letter. Add it to My words so you spell it only once.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
