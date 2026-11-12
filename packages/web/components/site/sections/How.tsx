/**
 * How it works (#how, content.md §2, design.md 4.1). From 1024px the How picture is sticky beside the
 * steps and SiteMotion's step observer drives it (A8, MS-8.12): it is not a data-play root. Under
 * 1024px the picture is hidden and each step card holds its own stage, a data-play root (A7). The
 * step label is a cell with two layers, plain and key-styled; the key layer marks the active step.
 */
import type { CSSProperties } from 'react';
import { HowScreen } from '../pictures/HowScreen';
import type { HowData } from '../site-data';

const STEPS = [
  {
    label: '01',
    part: 1,
    title: 'Press one key per letter',
    text: 'Keys 2 to 9 carry the letters. G, H and I share key 4, so "home" is 4 6 6 3, and so is "good". No tapping a key three times and no code to learn. 0 is space.',
  },
  {
    label: '02',
    part: 2,
    title: 'Pick the sentence you meant',
    text: 'Sentences appear as you type, ranked by an offline dictionary on your device. If you turn on model ranking, a language model can use what the other person just said to put the likely one first. Choosing a sentence never speaks it.',
  },
  {
    label: '03',
    part: 3,
    title: 'Hear it out loud',
    text: "Nothing is spoken until you press Speak. Your browser's voice says it. If there is no voice, Show puts the sentence in big text for the other person to read.",
  },
] as const;

export function How({ how }: { how: HowData }) {
  return (
    <section id="how" className="site-band" aria-labelledby="how-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="how-title" className="site-h2">
            How it works
          </h2>
        </div>
        <div className="site-how">
          <div className="site-how__picture" data-reveal="">
            <HowScreen how={how} part="all" />
          </div>
          <ol className="site-how__steps">
            {STEPS.map((s, i) => (
              <li key={s.label} className="site-card site-how__step" data-reveal="" style={{ '--reveal-i': Math.min(i, 2) } as CSSProperties}>
                <span className="site-step site-cell" aria-hidden="true">
                  <span>{s.label}</span>
                  <span className="site-step__key">{s.label}</span>
                </span>
                <h3 className="site-h3">{s.title}</h3>
                <p>{s.text}</p>
                <div className="site-stage site-how__stage" aria-hidden="true">
                  <HowScreen how={how} part={s.part} />
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="site-how__spell">You need to be able to spell. Ninth Life types words, not symbols.</p>
      </div>
    </section>
  );
}
