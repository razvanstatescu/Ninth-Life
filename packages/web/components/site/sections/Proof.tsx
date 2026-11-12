/**
 * The proof check (#proof, content.md §3, design.md §3). The copy column wrapper is never marked for
 * a reveal; its heading group and the rest of the column are (no nested reveals, MS-8.4). The legend
 * leads each state with its chip icon, so state is not told by colour alone (MS-9.3).
 */
import { Icon } from '@/components/Icon';
import { ProofCheck } from '../Pictures';
import { play } from '../pictures/roles';
import type { ProofExample } from '../site-data';

export function Proof({ proof }: { proof: ProofExample }) {
  return (
    <section id="proof" className="site-band site-band--surface" aria-labelledby="proof-title">
      <div className="site-wrap site-split">
        <div className="site-proof__copy">
          <div className="site-head" data-reveal="">
            <h2 id="proof-title" className="site-h2">
              Every spoken word matches the keys you pressed
            </h2>
            <p className="site-lead">
              A language model can suggest sentences. It cannot put words in your mouth. Ninth Life turns every suggested word back into keys and drops any word that does not match, so it is never spoken.
            </p>
          </div>
          <div className="site-proof__more" data-reveal="">
            <h3 className="site-h3">How to read the chips</h3>
            <ul className="site-legend">
              <li>
                <Icon name="check" />
                <span>A check: the word matches your keys and is in your words.</span>
              </li>
              <li>
                <Icon name="plus" />
                <span>A plus: the word matches your keys but is not in your words yet.</span>
              </li>
              <li>
                <Icon name="x" />
                <span>Struck through with an x: suggested, but your keys do not spell it. It is never spoken.</span>
              </li>
            </ul>
            <p>With model ranking on, the check runs on the server and again in your browser. You decide what is said: only a press of Speak speaks.</p>
            <p>
              <a className="nl-btn nl-btn--secondary" href="/app">
                Open the app
              </a>
            </p>
          </div>
        </div>
        <figure className={`site-proof ${play('sweep')}`} data-reveal="" data-play="">
          <ProofCheck proof={proof} />
        </figure>
      </div>
    </section>
  );
}
