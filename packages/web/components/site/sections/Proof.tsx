/**
 * The proof check (#proof, content.md §3, design.md §3). Round 4 (2026-11-13): the head, then the layout,
 * which is the section's one data-play root (MS-8.11, lead ruling 1.2). In DOM order it holds the figure, the four
 * steps, then the note and the button. From 1024px grid areas put the steps and the note on the left and the figure on
 * the right across both rows (no order, MS-10.9). The steps are the shared .site-step. Their numbers are the only
 * parts outside the figure that move: each number's key layer shows while its step plays, on the figure's clock (one
 * motion-sweep step = 240 ms). The step text never waits for the play.
 */
import { ProofCheck } from '../pictures/ProofCheck';
import { play, role, type KStep, type UStep } from '../pictures/roles';
import type { ProofExample } from '../site-data';

/** The four steps and when each one's number is lit: the keys, the suggestions, the sweep, the verdicts. */
const STEPS: readonly { text: string; k: KStep; u: UStep }[] = [
  { text: 'You press keys.', k: 0, u: 2 },
  { text: 'Words are suggested for them.', k: 2, u: 5 },
  { text: 'Each word is turned back into keys.', k: 5, u: 10 },
  { text: 'A word that does not match is dropped, never spoken.', k: 10, u: 13 },
];

export function Proof({ proof }: { proof: ProofExample }) {
  return (
    <section id="proof" className="site-band site-band--surface" aria-labelledby="proof-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="proof-title" className="site-h2">
            Every spoken word matches the keys on screen
          </h2>
          <p className="site-lead">A language model can suggest sentences. It cannot put words in your mouth.</p>
        </div>
        <div className={`site-proof-layout ${play('sweep')}`} data-play="">
          <ProofCheck proof={proof} />
          <ol className="site-proof-steps" role="list" data-reveal="">
            {STEPS.map((s, i) => (
              <li key={s.text} className="site-step">
                <span className="site-step__num site-cell" aria-hidden="true">
                  <span>{i + 1}</span>
                  <span className={`site-step__lit ${role('during', s.k, s.u)}`}>{i + 1}</span>
                </span>
                <span className="site-step__title">{s.text}</span>
              </li>
            ))}
          </ol>
          <div className="site-proof__more" data-reveal="">
            <p>With model ranking on, the check runs on the server and again in your browser. You decide what is said: only a press of Speak speaks.</p>
            <div className="site-cta">
              <a className="nl-btn nl-btn--secondary nl-btn--xl" href="/app">
                Open the app
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
