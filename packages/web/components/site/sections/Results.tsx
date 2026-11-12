/**
 * Measured, not promised (#results, content.md §7, design.md §7). Every number comes from
 * getResults() (packages/eval/RESULTS.json, RESULTS.llm.json), with the results and the method linked
 * in the same section (MS-5). Numbers are static text: the stat cards may reveal, the digits never move
 * (MS-5.5). No model or provider name appears here (MS-5.3, D14).
 */
import type { CSSProperties } from 'react';
import { METHOD_URL, RESULTS_URL, modelRunsLine, type SiteResults } from '../site-data';

const reveal = (i: number) => ({ '--reveal-i': Math.min(i, 2) }) as CSSProperties;

export function Results({ results }: { results: SiteResults | null }) {
  return (
    <section id="results" className="site-band site-band--surface" aria-labelledby="results-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="results-title" className="site-h2">
            Measured, not promised
          </h2>
          {results ? (
            <p className="site-lead">
              We typed {results.items.toLocaleString('en-US')} test sentences from public AAC text collections with a simulated typist, one press per letter, using the offline dictionary that ships with the app.
            </p>
          ) : (
            <p className="site-lead">The eval results are not available in this build.</p>
          )}
        </div>
        {results ? (
          <>
            <dl className="site-grid site-stats">
              <div className="site-card" data-reveal="" style={reveal(0)}>
                <dt>Right sentence first</dt>
                <dd className="site-stats__value">{results.ghost.top1}</dd>
                <dd>of sentences, with no correction ({results.dict.top1} with word frequency alone).</dd>
              </div>
              <div className="site-card" data-reveal="" style={reveal(1)}>
                <dt>Right sentence in the top 5</dt>
                <dd className="site-stats__value">{results.ghost.top5}</dd>
                <dd>of sentences ({results.dict.top5} with word frequency alone).</dd>
              </div>
              <div className="site-card" data-reveal="" style={reveal(2)}>
                <dt>Right word first</dt>
                <dd className="site-stats__value">{results.ghost.wordAcc}</dd>
                <dd>of words, before any correction.</dd>
              </div>
            </dl>
            <p>
              Every letter is still one press, so letter mode saves no key presses ({results.ghost.ksr} keystroke savings). With one switch it takes {results.ghost.scanStepsPerChar} scan steps per character. These figures come from a simulated typist, not from studies with people.
            </p>
            <p>
              Some test sentences, mostly short stock phrases such as &quot;Thank you.&quot;, also appear in the text the dictionary was built from, so these figures are somewhat optimistic.
            </p>
            {results.modelRuns ? <p>{modelRunsLine(results.modelRuns)}</p> : null}
          </>
        ) : null}
        <p className="site-links">
          <a href={RESULTS_URL}>Read the full results</a>
          <a href={METHOD_URL}>How we measured</a>
        </p>
      </div>
    </section>
  );
}
