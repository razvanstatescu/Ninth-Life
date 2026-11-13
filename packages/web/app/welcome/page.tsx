import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { RECENT_SETTING, SENT_FOR_RANKING, providerCopy } from '@/lib/rankingProvider';
import { ProofChip } from '@/components/ProofChip';
import { KeypadDemo } from '@/components/site/KeypadDemo';
import { METHOD_URL, REPO_URL, RESULTS_URL, getDemoData, getResults } from '@/components/site/site-data';
import '@/components/site/site.css';

/**
 * The website (design/artboards/In-context-web.dc.html). The app stays at / because it is the PWA
 * start URL and must be one tap away; this page explains it. Statically rendered at build time.
 */
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Ninth Life: press keys, hear your sentence',
  description:
    'Ninth Life brings back 9-key predictive text as a way to talk. Press one key per letter and it speaks the sentence you meant, after checking every word against your keys. Free, works offline, no account.',
};

export default function WelcomePage() {
  const demo = getDemoData();
  const results = getResults();

  return (
    <div className="site">
      <a className="nl-skip" href="#main">
        Skip to content
      </a>

      {/* The hero is Night in both themes (brand book, Surfaces: Website). */}
      <div className="site-hero" data-theme="night">
        <header className="site-wrap site-header">
          <a className="site-brand" href="/welcome">
            {/* Below 48px the favicon variant is used (brand book, Logo). */}
            <img src="/icons/favicon.svg" alt="" width={44} height={44} />
            <span>Ninth Life</span>
          </a>
          <nav aria-label="Main" className="site-nav">
            <a href="#how">How it works</a>
            <a href="#proof">Proof</a>
            <a href="#access">Ways to type</a>
            <a href="#privacy">Privacy</a>
          </nav>
          <a className="nl-btn nl-btn--secondary site-header__cta" href="/">
            Open the app
          </a>
        </header>

        <section className="site-wrap site-hero__body" aria-labelledby="hero-title">
          <div className="site-hero__copy">
            <img className="site-hero__icon" src="/icons/icon.svg" alt="" width={112} height={112} />
            <h1 id="hero-title" className="site-hero__name">
              Ninth Life
            </h1>
            <p className="site-hero__line">Press keys. Hear your sentence.</p>
            <p className="site-hero__lead">
              Ninth Life brings back 9-key predictive text as a voice. Press one key per letter on any device, and it speaks the sentence you meant, after
              checking every word against the keys you pressed.
            </p>
            <div className="site-actions">
              {/* The one ember thing on this screen. */}
              <a className="nl-btn nl-btn--primary nl-btn--xl" href="/">
                Try it in your browser
              </a>
              <a className="nl-btn nl-btn--secondary nl-btn--xl" href="#how">
                See how it works
              </a>
            </div>
            <p className="site-hero__note">Free. Works offline. No account.</p>
          </div>
          <div className="site-hero__demo">
            <KeypadDemo data={demo} />
          </div>
        </section>
      </div>

      <main id="main" tabIndex={-1}>
        <section id="how" className="site-band site-band--surface" aria-labelledby="how-title">
          <div className="site-wrap site-stack">
            <h2 id="how-title" className="site-h2">
              How it works
            </h2>
            <ol className="site-grid site-grid--3">
              <li className="site-card">
                <span className="site-step" aria-hidden="true">
                  1
                </span>
                <h3 className="site-h3">Press one key per letter</h3>
                <p>H and I share key 4, so &quot;hi&quot; is 4 4. No tapping a key three times, no code to learn. 0 is space.</p>
              </li>
              <li className="site-card">
                <span className="site-step" aria-hidden="true">
                  2
                </span>
                <h3 className="site-h3">Pick the sentence you meant</h3>
                <p>
                  Sentences appear as you type. An offline dictionary ranks them on your device, with no network. If you turn on model ranking, a language model can
                  use what the other person just said to put the likely one first.
                </p>
              </li>
              <li className="site-card">
                <span className="site-step" aria-hidden="true">
                  3
                </span>
                <h3 className="site-h3">Hear it out loud</h3>
                <p>Nothing is spoken until you press Speak. Your browser&apos;s voice says it, and the dictionary keeps working when the connection drops.</p>
              </li>
            </ol>
          </div>
        </section>

        <section id="proof" className="site-band" aria-labelledby="proof-title">
          <div className="site-wrap site-split">
            <div className="site-split__main site-stack site-stack--tight">
              <h2 id="proof-title" className="site-h2">
                Every word is checked against your keys
              </h2>
              <p className="site-lead">
                A language model can suggest sentences. It cannot put words in your mouth. Ninth Life turns every suggested word back into keys and drops anything
                that does not match, so it is never spoken.
              </p>
            </div>
            <figure className="site-proof">
              <figcaption className="site-proof__keys">Your keys: 92837</figcaption>
              <ul className="site-proof__chips">
                <li>
                  <ProofChip state="match" word="water" code="92837" />
                </li>
                <li>
                  <ProofChip state="match" word="waves" code="92837" />
                </li>
                <li>
                  <ProofChip state="reject" word="wafer" code="92337" />
                </li>
              </ul>
              <p>Wafer is 92337. If it were suggested, it would be checked and dropped.</p>
            </figure>
          </div>
        </section>

        <section id="access" className="site-band site-band--surface" aria-labelledby="access-title">
          <div className="site-wrap site-stack">
            <h2 id="access-title" className="site-h2">
              Works the way you type
            </h2>
            <ul className="site-grid site-grid--4">
              <li className="site-card">
                <h3 className="site-h3">Keyboard</h3>
                <p>Number keys or the numpad. Enter speaks, Backspace goes back, arrow keys pick a sentence.</p>
              </li>
              <li className="site-card">
                <h3 className="site-h3">Touch</h3>
                <p>Keys from 72 to 128 pixels. No swipes, no long presses.</p>
              </li>
              <li className="site-card">
                <h3 className="site-h3">One or two switches</h3>
                <p>Row and column scanning, from 0.4 to 5 seconds a step, with no time limits. Space or Enter is the switch.</p>
              </li>
              <li className="site-card">
                <h3 className="site-h3">Your view</h3>
                <p>Night or Day theme, large or extra-large keys, and a big-text screen to show your sentence when there is no voice.</p>
              </li>
            </ul>
          </div>
        </section>

        <section id="privacy" className="site-band" aria-labelledby="privacy-title">
          <div className="site-wrap site-stack">
            <h2 id="privacy-title" className="site-h2">
              Private by default
            </h2>
            <div className="site-grid site-grid--2">
              <div className="site-card site-card--line">
                <h3 className="site-h3">
                  <Icon name="offline" /> Offline unless you choose
                </h3>
                <p>
                  Typing, the dictionary and the proof check run in your browser. After one visit the app works with no connection. No account, no cookies, no
                  analytics, no ads. Saved phrases stay on your device, and only when you press Save phrase. The conversation on screen is never saved and is
                  gone when you reload, leave or close the page.
                </p>
              </div>
              <div className="site-card site-card--line">
                <h3 className="site-h3">
                  <Icon name="gear" /> Model ranking is opt-in
                </h3>
                <p>
                  It is off until you turn it on in Settings. Then Ninth Life sends {SENT_FOR_RANKING} to {providerCopy().service} to
                  rank the sentences, and the last 3 things you said only if you also turn on
                  &quot;{RECENT_SETTING}&quot;. Processing is not limited to the EU. {providerCopy().retention} Our server logs timings and counts, never your words.
                </p>
              </div>
              <div className="site-card site-card--line">
                <h3 className="site-h3">
                  <Icon name="voice" /> Voices
                </h3>
                <p>
                  Speech uses your browser&apos;s voices. Voices marked &quot;on this device&quot; keep your words on the device; online voices send the text to the
                  browser maker.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="results" className="site-band site-band--surface" aria-labelledby="results-title">
          <div className="site-wrap site-stack">
            <h2 id="results-title" className="site-h2">
              Measured, not promised
            </h2>
            {results ? (
              <>
                <p className="site-lead">
                  We typed {results.items.toLocaleString('en-US')} test sentences from public AAC text collections with a simulated typist, one press per letter, using
                  the offline dictionary that ships with the app.
                </p>
                <dl className="site-grid site-grid--3 site-stats">
                  <div className="site-card">
                    <dt>Right sentence first</dt>
                    <dd className="site-stat">{results.ghost.top1}</dd>
                    <dd>of sentences, with no correction ({results.dict.top1} with word frequency alone).</dd>
                  </div>
                  <div className="site-card">
                    <dt>Right sentence in the top 5</dt>
                    <dd className="site-stat">{results.ghost.top5}</dd>
                    <dd>of sentences ({results.dict.top5} with word frequency alone).</dd>
                  </div>
                  <div className="site-card">
                    <dt>Right word first</dt>
                    <dd className="site-stat">{results.ghost.wordAcc}</dd>
                    <dd>of words, before any correction.</dd>
                  </div>
                </dl>
                <p>
                  Every letter is still one press, so letter mode saves no key presses ({results.ghost.ksr} keystroke savings). With one switch it takes{' '}
                  {results.ghost.scanStepsPerChar} scan steps per character.{' '}
                  {results.modelNotRun ? 'Model ranking has not been measured yet, so we quote no number for it. ' : ''}
                  These figures come from a simulated typist, not from studies with people.
                </p>
              </>
            ) : (
              <p className="site-lead">The eval results are not available in this build.</p>
            )}
            <p className="site-links">
              <a href={RESULTS_URL}>Read the full results</a>
              <a href={METHOD_URL}>How we measured</a>
            </p>
          </div>
        </section>

        <section id="source" className="site-band" aria-labelledby="source-title">
          <div className="site-wrap site-split">
            <div className="site-split__main site-stack site-stack--tight">
              <h2 id="source-title" className="site-h2">
                Free and open source
              </h2>
              <p className="site-lead">
                Ninth Life is free, with no paid tier, and its code is MIT licensed. The dictionary is built from open word lists and public text, credited in the
                repository. Built with Kiro for Kiroween 2026.
              </p>
              <p className="site-links">
                <a href={REPO_URL}>Source code on GitHub</a>
                <a href="/about">About Ninth Life</a>
              </p>
            </div>
            <div className="site-card site-card--line site-limits">
              <h3 className="site-h3">Good to know</h3>
              <ul>
                <li>You need to be able to spell: Ninth Life types words, not symbols.</li>
                <li>Voices depend on your device and browser.</li>
                <li>English first. It has not yet been tested with people who use AAC.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-wrap site-footer">
        <div className="site-footer__row">
          <div className="site-footer__brand">
            <img src="/icons/favicon.svg" alt="" width={32} height={32} />
            <span className="site-footer__name">Ninth Life</span>
            <span>Free and open source. Built with Kiro for Kiroween 2026.</span>
          </div>
          <nav aria-label="Footer" className="site-footer__nav">
            <a href="/">Open the app</a>
            <a href={REPO_URL}>Source code</a>
            <a href="#access">Accessibility</a>
            <a href="#privacy">Privacy</a>
            <a href="/about">About</a>
          </nav>
        </div>
        <p className="site-footer__statement">{NOT_A_MEDICAL_DEVICE}</p>
      </footer>
    </div>
  );
}
