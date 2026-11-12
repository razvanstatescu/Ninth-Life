/**
 * Ways to type (#access, content.md §5, design.md §5). The numbers are product settings, not eval
 * results: 72 and 128 are the key-min and key-xl tokens; 0.4 to 5 seconds is accessibility rule 9.
 * Round 2: a stage first in each box card; the switch card is a normal card in a 2-column grid (design 4.3).
 */
import type { CSSProperties } from 'react';
import { KeyLegend, LayoutBoxes, ScanPlay, ThemeHalves, TouchSizes } from '../pictures/Access';
import { ISSUES_URL } from '../site-data';

const reveal = (i: number) => ({ '--reveal-i': Math.min(i, 2) }) as CSSProperties;

export function Access() {
  return (
    <section id="access" className="site-band site-band--surface" aria-labelledby="access-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="access-title" className="site-h2">
            Works the way you type
          </h2>
        </div>
        <div className="site-grid site-grid--access">
          <div className="site-card" data-reveal="" style={reveal(0)}>
            <div className="site-stage" aria-hidden="true">
              <KeyLegend />
            </div>
            <h3 className="site-h3">Keyboard</h3>
            <p>Number keys or the numpad. Enter speaks, Backspace goes back, arrow keys pick a sentence.</p>
          </div>
          <div className="site-card" data-reveal="" style={reveal(1)}>
            <div className="site-stage" aria-hidden="true">
              <TouchSizes />
            </div>
            <h3 className="site-h3">Touch</h3>
            <p>Large keys, from 72 to 128 pixels. Single taps only: no swipes, no long presses.</p>
          </div>
          <div className="site-card" data-reveal="" style={reveal(2)}>
            <div className="site-stage site-stage--switch" aria-hidden="true">
              <ScanPlay />
            </div>
            <h3 className="site-h3">One or two switches</h3>
            <p>Row and column scanning, from 0.4 to 5 seconds a step, with no time limits. Space or Enter is the switch.</p>
          </div>
          <div className="site-card" data-reveal="" style={reveal(3)}>
            <div className="site-stage" aria-hidden="true">
              <ThemeHalves />
            </div>
            <h3 className="site-h3">Your view</h3>
            <p>Night or Day theme, large or extra-large keys, and Show for big text.</p>
          </div>
          <div className="site-card" data-reveal="" style={reveal(4)}>
            <div className="site-stage" aria-hidden="true">
              <LayoutBoxes />
            </div>
            <h3 className="site-h3">Phones, tablets and laptops</h3>
            <p>
              On phones and tablets the whole app fits on one screen and never scrolls. Tablets work either way up. Phones work upright: held sideways, Ninth Life asks you to turn the phone and keeps your sentence.
            </p>
          </div>
        </div>
        <div className="site-card site-card--line site-note" data-reveal="">
          <h3 className="site-h3">Accessibility</h3>
          <p>
            We aim for WCAG 2.2 AA as a minimum and check the app with automated accessibility, keyboard and switch tests. One known exception: on phones the app works in portrait only. Found a problem?{' '}
            <a href={ISSUES_URL}>Open an issue on GitHub</a>
          </p>
        </div>
      </div>
    </section>
  );
}
