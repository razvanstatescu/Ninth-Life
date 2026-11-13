/**
 * Ways to type (#access, content.md §5, design.md §5). The numbers are product settings, not eval
 * results: 72 and 128 are the key-min and key-xl tokens; 0.4 to 5 seconds is accessibility rule 9.
 * Round 2: a stage first in each box card; the switch card is a normal card in a 2-column grid (design 4.3).
 * Round 3: a one-line lead; a ground band (Results moved up); on phones each stage hugs its drawing (W1).
 * R3-P10 (2026-11-13): a secondary "Open the app" row closes the section, as after Results and Privacy, so a phone
 * reader is never ~9 screens from a way into the app (MS-1.6, MS-9.1: secondary, not an ember fill).
 * Round 4 (2026-11-13; decisions §2 "Boxes"): the switch card leads (across the grid, its stage on the
 * right of its words from 1024px), then Keyboard, Touch, Your view and Phones, tablets and laptops two by two
 * (.site-bento--4); the simulator limit sits by its claim (.site-caveat); the note carries id="accessibility" for the
 * footer's link.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { SiteIcon, info, key, keyboard, screens, view } from '../icons';
import { KeyLegend, LayoutBoxes, ScanPlay, ThemeHalves, TouchSizes, type ScanExample } from '../pictures/Access';
import { ISSUES_URL, getDemoData } from '../site-data';

/** The reveal stagger restarts in each row: the lead alone, then two cards a row (0, 1). */
const reveal = (i: number) => ({ '--reveal-i': Math.min(i, 2) }) as CSSProperties;

/**
 * The switch drawing types the demo's first press: key 4 and its word as the demo's chip writes it ("I"), from the
 * build-time decoder (MS-7.8). If the demo ever starts on another key, the drawing keeps key 4 with its digit only and
 * the unit test says so, so the page never breaks while the demo changes.
 */
function scanExample(): ScanExample {
  const demo = getDemoData();
  const first = demo.steps[0];
  const word = first && first.key === '4' && demo.fromDictionary ? (first.labels[0] ?? null) : null;
  return { key: '4', word };
}

function Card({ i, lead, drawing, icon, title, children }: { i: number; lead?: boolean; drawing: ReactNode; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className={lead ? 'site-card site-card--lead site-card--end' : 'site-card'} data-reveal="" style={reveal(i)}>
      <div className={lead ? 'site-stage site-stage--lead' : 'site-stage'} aria-hidden="true">
        {drawing}
      </div>
      <h3 className="site-h3">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

export function Access() {
  return (
    <section id="access" className="site-band" aria-labelledby="access-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="access-title" className="site-h2">
            Works the way you type
          </h2>
          <p className="site-lead">Keyboard, touch or one or two switches, on the screen you have.</p>
        </div>
        <div className="site-grid site-bento site-bento--4">
          <Card i={0} lead drawing={<ScanPlay example={scanExample()} />} icon={<Icon name="switch" />} title="One or two switches">
            <p>Row and column scanning, from 0.4 to 5 seconds a step, with no time limits. Space or Enter is the switch.</p>
          </Card>
          <Card i={0} drawing={<KeyLegend />} icon={<SiteIcon d={keyboard} />} title="Keyboard">
            <p>Number keys or the numpad. Enter speaks, Backspace goes back, arrow keys pick a sentence.</p>
          </Card>
          <Card i={1} drawing={<TouchSizes />} icon={<SiteIcon d={key} />} title="Touch">
            <p>Large keys, from 72 to 128 pixels. Single taps only: no swipes, no long presses.</p>
          </Card>
          <Card i={0} drawing={<ThemeHalves />} icon={<SiteIcon d={view} />} title="Your view">
            <p>Night or Day theme, large or extra-large keys, and Show for big text.</p>
          </Card>
          <Card i={1} drawing={<LayoutBoxes />} icon={<SiteIcon d={screens} />} title="Phones, tablets and laptops">
            <p>On phones and tablets the whole app fits on one screen and never scrolls. Phones work upright, tablets either way up.</p>
            <p className="site-caveat">
              <SiteIcon d={info} />
              <span>It has been checked in phone and tablet simulators, not yet on real phones and tablets.</span>
            </p>
          </Card>
        </div>
        <div id="accessibility" className="site-card site-card--note site-note" data-reveal="">
          <h3 className="site-h3">Accessibility</h3>
          <p>
            We aim for WCAG 2.2 AA as a minimum and check the app with automated accessibility, keyboard and switch tests. One known exception: on phones the app works in portrait only. Found a problem?{' '}
            <a href={ISSUES_URL}>Open an issue on GitHub</a>
          </p>
        </div>
        <div className="site-cta">
          <a className="nl-btn nl-btn--secondary nl-btn--xl" href="/app">
            Open the app
          </a>
        </div>
      </div>
    </section>
  );
}
