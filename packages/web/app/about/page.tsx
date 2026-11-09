import type { Metadata } from 'next';
import { Brand } from '@/components/AppHeader';
import { Footer, NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { providerCopy } from '@/lib/rankingProvider';

export const metadata: Metadata = {
  title: 'About Ninth Life',
  description: 'What Ninth Life does, how the proof check works, and what it is not.',
};

export default function AboutPage() {
  const provider = providerCopy();
  return (
    <div className="app">
      <div className="app__inner">
        <header className="app-header">
          <Brand href="/" />
          <a className="nl-btn nl-btn--secondary" href="/">
            Back to the keypad
          </a>
        </header>
        <main className="page">
          <h1>About Ninth Life</h1>

          <section aria-labelledby="what">
            <h2 id="what">What it does</h2>
            <p>
              Ninth Life brings back 9-key predictive text as a way to talk. Press one key per letter on keys 2 to 9, and it speaks the sentence you meant. H and I share
              key 4, so &quot;hi&quot; is 4 4. There is no tapping a key three times and no code to learn.
            </p>
            <p>It runs in your browser and works offline. You can type with a keyboard, by touch, or with one or two switches.</p>
            <p>
              <a href="/welcome">See the demo, the measured results and the source code</a>
            </p>
          </section>

          <section aria-labelledby="proof">
            <h2 id="proof">Every word is checked against your keys</h2>
            <p>
              Before anything is spoken, each word is turned back into keys and compared with the keys you pressed. A word that does not match is dropped and never
              spoken. The proof panel shows each word with its keys: a check means the word matches your keys and is in your dictionary, a plus means it matches but
              is not in your words yet, and a struck-through word was suggested but does not match.
            </p>
            <p>
              Model ranking is off by default. When you turn it on, your keys, the dictionary words for them and the last thing the other person said are sent to
              {provider.service}, which suggests the order of the sentences. It cannot add words: everything it suggests goes through the same check, and
              nothing is spoken until you press Speak.
            </p>
          </section>

          <section aria-labelledby="privacy">
            <h2 id="privacy">Privacy</h2>
            <ul>
              <li>No account, no cookies, no analytics.</li>
              <li>Ninth Life does not store what you say. Saved phrases stay on this device, and only when you press Save phrase.</li>
              <li>
                With model ranking on, {provider.company} receives what is sent for ranking. {provider.retention}
              </li>
              <li>
                Speech uses your browser&apos;s voices. Voices marked &quot;on this device&quot; keep your words on the device; online voices send the text to the
                browser maker.
              </li>
              <li>
                Listen in They said uses your browser&apos;s speech service: the other person&apos;s voice may be sent to the browser maker (Google in Chrome,
                Apple in Safari) to turn it into text, unless the browser can do it on this device. It is off until you allow it, and Ninth Life never receives or
                keeps the audio.
              </li>
            </ul>
          </section>

          <section aria-labelledby="statement">
            <h2 id="statement">What Ninth Life is not</h2>
            <p className="statement">{NOT_A_MEDICAL_DEVICE}</p>
          </section>
        </main>
        <Footer about={false} />
      </div>
    </div>
  );
}
