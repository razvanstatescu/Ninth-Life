/**
 * How it works (#how, content.md §2, design.md "Round 4: How it works"). Round 4 (2026-11-13, Claude Code): three
 * steps, Press, Pick and Speak, each a stage holding its scene (pictures/HowScenes.tsx, a data-play root) and then a
 * .site-step (number, title, one line). One column under 1024px, the stage beside its text from 600px, one row from
 * 1024px, where site.css plays the scenes once in story order (MS-8.11). Each step is a [data-play-scope], so its
 * number lights while its scene plays (.site-step, :has()). The limits these steps carry (spelling, English) follow
 * the row as one .site-caveat. The sticky picture, its runway and the step sync (A8, MS-8.12) are gone.
 */
import type { CSSProperties } from 'react';
import { HowPick, HowPress, HowSpeak } from '../pictures/HowScenes';
import { play, role, type PlayClass } from '../pictures/roles';
import { SiteIcon, info } from '../icons';
import type { HowData } from '../site-data';

const STEPS: readonly {
  n: 1 | 2 | 3;
  play: PlayClass;
  /** The number's lit layer: on while the step's scene plays. */
  lit: string;
  Scene: typeof HowPress;
  title: string;
  line: string;
}[] = [
  {
    n: 1,
    play: 'quick',
    lit: role('during', 0, 4),
    Scene: HowPress,
    title: 'Press one key per letter',
    line: 'G, H and I share key 4, so "home" and "good" are both 4663.',
  },
  {
    n: 2,
    play: 'sweep',
    lit: role('during', 1, 5),
    Scene: HowPick,
    title: 'Pick what you meant',
    line: 'Ranked by an offline dictionary on your device. Picking one never speaks it.',
  },
  {
    n: 3,
    play: 'sweep',
    lit: role('during', 0, 2),
    Scene: HowSpeak,
    title: 'Hear it out loud',
    line: "Your browser's voice says it. With no voice, Show puts it in big text.",
  },
];

export function How({ how }: { how: HowData }) {
  return (
    <section id="how" className="site-band" aria-labelledby="how-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="how-title" className="site-h2">
            How it works
          </h2>
          <p className="site-lead">Three steps. Nothing is said until you press Speak.</p>
        </div>
        <ol className="site-how__steps" role="list">
          {STEPS.map(({ n, play: p, lit, Scene, title, line }, i) => (
            <li key={n} className={`site-how__step ${play(p)}`} data-play-scope="" data-reveal="" style={{ '--reveal-i': i } as CSSProperties}>
              <div className="site-stage site-how__stage" aria-hidden="true">
                <Scene how={how} />
              </div>
              <div className="site-step">
                <span className="site-step__num site-cell" aria-hidden="true">
                  <span>{n}</span>
                  <span className={`site-step__lit ${lit}`}>{n}</span>
                </span>
                <h3 className="site-step__title">{title}</h3>
                <p className="site-step__line">{line}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="site-caveat" data-reveal="">
          <SiteIcon d={info} />
          <span>You need to be able to spell. Ninth Life types words, not symbols. English only for now.</span>
        </p>
      </div>
    </section>
  );
}
