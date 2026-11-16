import type { Metadata } from 'next';
import { pageMetadata } from '@/components/site/seo';
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { SiteBar } from '@/components/site/SiteBar';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteIcon, external } from '@/components/site/icons';
import { NOTICE_URL, REPO_URL } from '@/components/site/site-data';
import { RANKING_SENT_ALSO, REPLY_TYPES_HELP, providerCopy, rankingSentText } from '@/lib/rankingProvider';
// The website's look (W3, ADR-006 amendment 2026-11-12, overturns D3): the site stylesheet, not styles/app.css.
import '@/components/site/site.css';

// Copy: marketing-site content.md "Page metadata". Canonical and og:url only with a known origin.
export const metadata: Metadata = pageMetadata({
  path: '/about',
  title: 'About Ninth Life',
  description: 'How Ninth Life checks every spoken word against your keys, what model ranking sends and to whom, and what Ninth Life is not.',
});

/**
 * /about in the website's look (W3): the site bar and a Night header like the landing page's banner, the site
 * type scale, prose at the site measure, the statement as a note card and the site footer. The bar's "Open the
 * app" replaces "Back to the keypad". The intended-purpose sentence appears once, in "What Ninth Life is not"
 * (the footer leaves it out here). What ranking sends comes from rankingSentText(), the same list as the
 * landing page; provider names, region and retention only from providerCopy() (MS-4.6).
 *
 * Round 4 (2026-11-13): "Free and open source" (the old landing Source lead and "Why it is free", word
 * for word) and "Credits" (#credits, the footer's Credits link) come before the statement; the header is #top, the
 * target of the footer's "Back to top" (MS-14.5).
 */
export default function AboutPage() {
  const provider = providerCopy();
  return (
    <div className="site">
      <a className="nl-skip" href="#main">
        Skip to content
      </a>
      <header id="top" className="site-top site-night" data-theme="night">
        <SiteBar home="/" />
        <div className="site-wrap site-about__head">
          <div className="site-head">
            <h1 className="site-h2">About Ninth Life</h1>
            <p className="site-lead">
              Ninth Life brings back 9-key predictive text as a way to talk. Press one key per letter on keys 2 to 9, and it speaks the sentence you meant.
            </p>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="site-band">
        <div className="site-wrap site-stack">
          <section className="site-prose" aria-labelledby="what">
            <h2 id="what" className="site-h3">
              What it does
            </h2>
            <p>H and I share key 4, so &quot;hi&quot; is 4 4. There is no tapping a key three times and no code to learn.</p>
            <p>
              Key 1 puts a mark after the word you just typed: press it again for ? ! or a comma. A full stop, question mark or exclamation mark starts a
              new sentence.
            </p>
            <p>It runs in your browser and works offline. You can type with a keyboard, by touch, or with one or two switches.</p>
            <p>After the other person speaks, you can pick a reply type. {REPLY_TYPES_HELP}</p>
            <p className="site-links">
              <a href="/">See the demo, the measured results and the source code</a>
            </p>
          </section>

          <section className="site-prose" aria-labelledby="proof">
            <h2 id="proof" className="site-h3">
              Every word is checked against your keys
            </h2>
            <p>
              Before anything is spoken, each word is turned back into keys and compared with the keys on screen. A word that does not match is dropped and never
              spoken. A word you finish from the word row brings its own keys; the screen marks the ones you did not press. Fix a word lets you change any word. A word one key away changes that word's keys, and the screen marks the key that changed. Nothing is changed without your press. The proof panel shows each word with its keys: a check means the word matches your keys and is in the dictionary or in My words, a plus means it
              matches but is not in the dictionary or My words yet (add it to My words), and a struck-through word was suggested but does not match.
            </p>
            <p>
              Model ranking is off by default. When you turn it on, {rankingSentText()} are sent to {provider.service}, which suggests the order of the sentences.
              {RANKING_SENT_ALSO}
              It cannot add words: everything it suggests goes through the same check, and nothing is spoken until you press Speak.
            </p>
          </section>

          <section className="site-prose" aria-labelledby="privacy">
            <h2 id="privacy" className="site-h3">
              Privacy
            </h2>
            <ul>
              <li>No account, no cookies, no analytics.</li>
              <li>Ninth Life does not store what you say. Saved phrases stay on this device, and only when you press Save phrase.</li>
              <li>
                The conversation (what they said and what you said) is kept only on the open page, never saved: it is gone when you reload, leave or close the page,
                and Clear conversation removes it sooner. Share and Copy hand the text to the app you pick.
              </li>
              <li>
                The partner strip, off unless you turn it on, shows the other person &ldquo;Typing&hellip;&rdquo; while you type and what you said after you speak.
                It never shows your words before you speak.
              </li>
              <li>
                With model ranking on, {provider.company} receives what is sent for ranking. {provider.region} {provider.retention} Our server logs timings and
                counts, never your words.
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

          {/* Round 4 (2026-11-13): the landing page's Free and open source section dissolved (MS-3.1); its
              lead and "Why it is free" live here word for word, and its credits below (the footer links to them). */}
          <section className="site-prose" aria-labelledby="free">
            <h2 id="free" className="site-h3">
              Free and open source
            </h2>
            <p>Ninth Life is free, with no paid tier, and its code is MIT licensed. The dictionary is built from open word lists and public text, credited in the repository.</p>
            <p>
              After one visit, typing, the dictionary and the proof check run on your device, and speech uses your browser&apos;s voices. Model ranking costs a little
              per sentence. We can switch it off at any time, and the app then keeps working with the offline dictionary.
            </p>
            <p className="site-links">
              <a className="site-go site-go--out" href={REPO_URL}>
                Source code on GitHub
                <SiteIcon d={external} />
              </a>
              <a className="site-go site-go--out" href={NOTICE_URL}>
                Data sources and licenses
                <SiteIcon d={external} />
              </a>
            </p>
          </section>

          <section id="credits" className="site-prose" aria-labelledby="credits-title">
            <h2 id="credits-title" className="site-h3">
              Credits
            </h2>
            <ul>
              <li>Word frequencies: wordfreq by Robyn Speer.</li>
              <li>Sentence and word-pair data: AACText by Keith Vertanen and Per Ola Kristensson, and the Turk dialogues by Keith Vertanen.</li>
              <li>Type: Atkinson Hyperlegible Next and Mono by the Braille Institute, SIL Open Font License.</li>
              <li>Model ranking: {provider.company}.</li>
            </ul>
          </section>

          <section className="site-prose" aria-labelledby="statement">
            <h2 id="statement" className="site-h3">
              What Ninth Life is not
            </h2>
            <div className="site-card site-card--note">
              <p className="site-about__statement">{NOT_A_MEDICAL_DEVICE}</p>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter home="/" statement={false} />
    </div>
  );
}
