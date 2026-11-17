/**
 * Measured, not promised (#results, content.md §7, design.md §7). Every number comes from getResults()
 * (packages/eval/RESULTS.json, RESULTS.llm.json), with the results and the method linked in the same section (MS-5).
 * Numbers are static text: the cards may reveal, the digits never move (MS-5.5). No number from a model run appears
 * here (MS-5.3, D14); round 3 (R3-P7, lead decision) names the provider and models that were measured.
 *
 * Round 4 (2026-11-13; decisions "Results", PO-1): the caveat first, as a compact note; then the measures
 * as paired bars (Ninth Life offline against word frequency alone), the by-source chart, presses and scan steps, the
 * model-ranking status rows and the links. A bar is a drawn piece (aria-hidden) whose length is its printed value
 * (barShare) on a full track from 0; the value and its label are real text beside it. The bars grow once from their
 * start edge as a data-play sequence (PO-1, MS-8.11 round-4 amendment); reduced motion and no JavaScript show them full.
 * Round 5 (2026-11-17): after Privacy, right before Good to know, whose Testing so far card says what has not been
 * tested yet (the caveat no longer repeats it); no closing "Open the app" row.
 */
import type { CSSProperties } from 'react';
import { Icon } from '@/components/Icon';
import { SiteIcon, external, info, minus } from '../icons';
import { play, type KStep } from '../pictures/roles';
import { METHOD_URL, RESULTS_URL, barShare, modelStatus, pressExample, scanMarks, type ModelRuns, type SiteResults } from '../site-data';

const reveal = (i: number) => ({ '--reveal-i': Math.min(i, 2) }) as CSSProperties;

/** A bar part that grows once at step k (site.css "Results bars"; the step classes are those of pictures/roles.ts). */
const grow = (k: KStep) => `site-grow site-k${k}`;

/** A drawn bar: a full track (the whole) and a fill as long as the printed value. */
function Bar({ value, k, base = false }: { value: string; k: KStep; base?: boolean }) {
  return (
    <span className={base ? 'site-meter site-meter--base' : 'site-meter'} aria-hidden="true">
      <span className={`site-meter__fill ${grow(k)}`} style={{ '--v': barShare(value) } as CSSProperties} />
    </span>
  );
}

/** One measure of the chart: Ninth Life offline first, word frequency alone under it, then what it counts. */
function Measure({ title, ours, base, of }: { title: string; ours: string; base: string; of: string }) {
  return (
    <div className={`site-stats__group ${play('sweep')}`} data-play="">
      <dt>{title}</dt>
      <dd className="site-stats__row">
        <span className="site-stats__line">
          <span className="site-stats__value">{ours}</span> <span>Ninth Life, offline</span>
        </span>
        <Bar value={ours} k={0} />
      </dd>
      <dd className="site-stats__row site-stats__row--base">
        <span className="site-stats__line">
          <span className="site-stats__value">{base}</span> <span>Word frequency alone</span>
        </span>
        <Bar value={base} k={1} base />
      </dd>
      <dd className="site-stats__of">{of}</dd>
    </div>
  );
}

/** The model ids, never broken inside an id, joined as the model line joins them ("a, b and c"). */
function ModelIds({ ids }: { ids: readonly string[] }) {
  return (
    <>
      {ids.map((id, i) => (
        <span key={id}>
          {i === 0 ? '' : i === ids.length - 1 ? ' and ' : ', '}
          <span className="site-nowrap">{id}</span>
        </span>
      ))}
    </>
  );
}

/** Model ranking's status (content.md §7, round 4): what was measured, and whether the build's provider is that one. */
function ModelStatusRows({ runs }: { runs: ModelRuns }) {
  const s = modelStatus(runs);
  return (
    <div className="site-results__models">
      <h3 className="site-h3">Model ranking</h3>
      <ul className="site-status">
        <li>
          <Icon name="check" />
          <span>
            <strong>Measured</strong> with {s.count} {s.company} {s.count === 1 ? 'model' : 'models'} (<ModelIds ids={s.models} />), on samples of {s.sizes} sentences, with how often a reply came too late.
            {s.serviceMeasured ? ` The app's model ranking uses ${s.service}, the provider measured here.` : null}
          </span>
        </li>
        {s.serviceMeasured ? null : (
          <li>
            <SiteIcon d={minus} />
            <span>
              <strong>Not measured yet:</strong> {s.service}, which the app&apos;s model ranking uses.
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

function Links() {
  return (
    <p className="site-links">
      <a className="site-go site-go--out" href={RESULTS_URL}>
        Full results
        <SiteIcon d={external} />
      </a>
      <a className="site-go site-go--out" href={METHOD_URL}>
        How we measured
        <SiteIcon d={external} />
      </a>
    </p>
  );
}

export function Results({ results }: { results: SiteResults | null }) {
  const sentences = results ? `of ${results.items.toLocaleString('en-US')} sentences` : '';
  return (
    <section id="results" className="site-band site-band--surface" aria-labelledby="results-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="results-title" className="site-h2">
            Measured, not promised
          </h2>
          {/* Round 4: no lead with results (phone length); its facts are in the chart captions, the presses card and the
              "Ninth Life, offline" label, and the caveat follows the title. */}
          {results ? null : <p className="site-lead">The eval results are not available in this build.</p>}
        </div>
        {results ? (
          <>
            <div className="site-caveat site-results__caveat">
              <SiteIcon d={info} />
              <p>
                <strong>These figures come from a simulated typist, not from studies with people.</strong> Some test sentences also appear in the dictionary&apos;s source text, so the figures are somewhat optimistic.
              </p>
            </div>
            <div className="site-results__grid">
              <div className="site-card site-results__chart" data-reveal="" style={reveal(0)}>
                <dl className="site-stats">
                  <Measure title="Right sentence first" ours={results.ghost.top1} base={results.dict.top1} of={`${sentences}, with no correction`} />
                  <Measure title="Right sentence in the top 5" ours={results.ghost.top5} base={results.dict.top5} of={sentences} />
                  <Measure
                    title="Right word first"
                    ours={results.ghost.wordAcc}
                    base={results.dict.wordAcc}
                    of={results.words ? `of ${results.words.toLocaleString('en-US')} words, before any correction` : 'of words, before any correction'}
                  />
                </dl>
                <p className="site-results__key">Word frequency alone: the same dictionary, ranked without word pairs.</p>
              </div>
              {results.bySource ? (
                <div className="site-card site-results__card" data-reveal="" style={reveal(1)}>
                  <h3 className="site-h3">Right sentence first, by source</h3>
                  <ul className={`site-results__rows ${play('sweep')}`} data-play="">
                    <li>
                      <span className="site-stats__line">
                        <span className="site-stats__value">{results.bySource.aac.top1}</span> <span>of {results.bySource.aac.items.toLocaleString('en-US')} AAC sentences</span>
                      </span>
                      <Bar value={results.bySource.aac.top1} k={0} />
                    </li>
                    <li>
                      <span className="site-stats__line">
                        <span className="site-stats__value">{results.bySource.turk.top1}</span> <span>of {results.bySource.turk.items.toLocaleString('en-US')} dialogue replies</span>
                      </span>
                      <Bar value={results.bySource.turk.top1} k={1} />
                    </li>
                  </ul>
                  <p>The replies are longer and more varied.</p>
                </div>
              ) : null}
              <div className="site-card site-results__card" data-reveal="" style={reveal(results.bySource ? 2 : 1)}>
                <h3 className="site-h3">Presses and scan steps</h3>
                <div className="site-effort">
                  {/* One press per letter: the How example's letters over their keys (pressExample, encodeWord). */}
                  <span className="site-effort__word" aria-hidden="true">
                    {pressExample().map(([letter, digit], i) => (
                      <span key={i}>
                        <span>{letter}</span>
                        <span>{digit}</span>
                      </span>
                    ))}
                  </span>
                  {results.ghost.pressesPerChar ? (
                    <>
                      <p className="site-stats__line">
                        <span className="site-stats__value">{results.ghost.pressesPerChar}</span> <span>key presses per character</span>
                      </p>
                      <p className="site-effort__note">
                        {results.finish
                          ? `Typing every letter. With Finish the word, ${results.finish.pressesPerChar}: ${results.finish.ksr} fewer. Real people save less.`
                          : 'Every letter is one press.'}
                      </p>
                    </>
                  ) : (
                    <p className="site-effort__note">Every letter is one press ({results.ghost.ksr} keystroke savings without Finish the word).</p>
                  )}
                </div>
                <div className="site-effort">
                  <span className={`site-effort__marks ${play('sweep')}`} data-play="" aria-hidden="true">
                    {scanMarks(results.ghost.scanStepsPerChar).map((part, i) => (
                      <span key={i} className={`site-effort__mark site-mark site-k${Math.min(i, 12) as KStep}`}>
                        <span style={{ '--v': part } as CSSProperties} />
                      </span>
                    ))}
                  </span>
                  <p className="site-stats__line">
                    <span className="site-stats__value">{results.ghost.scanStepsPerChar}</span> <span>scan steps per character, with one switch</span>
                  </p>
                </div>
              </div>
            </div>
            {results.modelRuns ? <ModelStatusRows runs={results.modelRuns} /> : null}
            <Links />
          </>
        ) : (
          <Links />
        )}
      </div>
    </section>
  );
}

