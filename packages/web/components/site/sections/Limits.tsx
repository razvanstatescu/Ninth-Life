/**
 * Good to know (#limits, content.md §8, design.md §8): every honest limit, visible, before the questions (MS-4.5).
 *
 * Round 4 (2026-11-13): the biggest limit is the section's lead; then two cards in the app's
 * settings-row look. "Before you start": a tile with the row's icon, a key and the approved sentence. "Testing so
 * far": each check with its state in words and border style (Done: solid edge and a check; Not yet: dashed edge),
 * never colour alone, and a visually hidden colon so it reads "Checked on real phones and tablets: Not yet". Each
 * limit is also said beside the claim it qualifies (.site-caveat in How, Results and Access; MS-4.5a). What ranking
 * sends is rankingSentText(), the list Privacy, the FAQ, /about and /llms.txt use (MS-4.6). /llms.txt reads LIMITS.
 *
 * Round 5 (2026-11-17): the one home of the limits. The Model ranking row left (Privacy says what ranking sends), and
 * the limits are no longer repeated as caveats in How, Access and Results: each is said once, here.
 */
import type { CSSProperties } from 'react';
import { Icon } from '@/components/Icon';
import { SiteIcon, external, globe } from '../icons';
import { ISSUES_URL } from '../site-data';

/** The not-a-replacement limit, first, as the lead (round 4; it was the "What it is not" item, "It" spelled out). */
export const LIMITS_LEAD = 'Ninth Life is not a replacement for an AAC device, a speech-language assessment or professional advice.';

type RowIcon = 'spell' | 'globe' | 'voice';

/** "Before you start": a key and the approved sentence, word for word (content.md §8). */
export const LIMIT_ROWS: readonly { key: string; icon: RowIcon; text: string }[] = [
  { key: 'Spelling', icon: 'spell', text: 'You need to be able to spell. Ninth Life types words, not symbols, so it does not suit someone who cannot spell yet.' },
  { key: 'Language', icon: 'globe', text: 'English only for now.' },
  { key: 'Voices', icon: 'voice', text: 'Voices depend on your device and browser.' },
];

/** "Testing so far": the two old "Not tested yet" sentences as checks with a state (the same facts). */
export const TESTING: readonly { check: string; done: boolean }[] = [
  { check: 'Checked in phone and tablet simulators', done: true },
  { check: 'Checked on real phones and tablets', done: false },
  { check: 'Tested with people who use AAC', done: false },
];

const state = (done: boolean) => (done ? 'Done' : 'Not yet');

/** Every limit as plain text, in page order (/llms.txt). */
export const LIMITS: readonly string[] = [LIMITS_LEAD, ...LIMIT_ROWS.map((r) => r.text), ...TESTING.map((t) => `${t.check}: ${state(t.done).toLowerCase()}.`)];

const reveal = (i: number) => ({ '--reveal-i': i }) as CSSProperties;

/** App icons from components/Icon.tsx, website-only ones from ../icons (round 4, decisions §1.5). */
function RowIconFor({ name }: { name: RowIcon }) {
  if (name === 'globe') return <SiteIcon d={globe} />;
  return <Icon name={name} />;
}

export function Limits() {
  return (
    <section id="limits" className="site-band" aria-labelledby="limits-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="limits-title" className="site-h2">
            Good to know
          </h2>
          <p className="site-lead">{LIMITS_LEAD}</p>
        </div>
        <div className="site-limits">
          <div className="site-card site-limits__card" data-reveal="" style={reveal(0)}>
            <h3 className="site-h3">Before you start</h3>
            <ul className="site-rows">
              {LIMIT_ROWS.map((r) => (
                <li key={r.key}>
                  <span className="site-tile">
                    <RowIconFor name={r.icon} />
                  </span>
                  <span className="site-rows__key">{r.key}</span>
                  <p className="site-rows__text">{r.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="site-card site-limits__card" data-reveal="" style={reveal(1)}>
            <h3 className="site-h3">Testing so far</h3>
            <ul className="site-limits__status">
              {TESTING.map((t) => (
                <li key={t.check}>
                  <span className="site-limits__check">{t.check}</span>
                  <span className="nl-sr-only">: </span>
                  <span className={t.done ? 'site-limits__state' : 'site-limits__state site-limits__state--not'}>
                    {t.done ? <Icon name="check" /> : null}
                    {state(t.done)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="site-links site-limits__help">
              <span>Want to help test it?</span>{' '}
              <a className="site-go site-go--out" href={ISSUES_URL}>
                Open an issue on GitHub
                <SiteIcon d={external} />
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
