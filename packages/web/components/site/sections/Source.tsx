/**
 * Free and open source (#source, content.md §10, design.md §10). The copy column wrapper is never
 * marked for a reveal; its heading group and the rest of the column are (no nested reveals, MS-8.4).
 * The history line is stated plainly (MS-4.7); the model provider comes from providerCopy() (MS-4.6).
 */
import { providerCopy } from '@/lib/rankingProvider';
import { NOTICE_URL, REPO_URL } from '../site-data';

export function Source() {
  const provider = providerCopy();
  return (
    <section id="source" className="site-band" aria-labelledby="source-title">
      <div className="site-wrap site-split">
        <div className="site-source__copy">
          <div className="site-head" data-reveal="">
            <h2 id="source-title" className="site-h2">
              Free and open source
            </h2>
            <p className="site-lead">
              Ninth Life is free, with no paid tier, and its code is MIT licensed. The dictionary is built from open word lists and public text, credited in the repository.
            </p>
          </div>
          <div className="site-source__more" data-reveal="">
            <div className="site-source__block">
              <h3 className="site-h3">Why it is free</h3>
              <p>
                After one visit, typing, the dictionary and the proof check run on your device, and speech uses your browser&apos;s voices. Model ranking costs a little per sentence. We can switch it off at any time, and the app then keeps working with the offline dictionary.
              </p>
            </div>
            <div className="site-source__block">
              <h3 className="site-h3">Who made it</h3>
              <p>Made for Kiroween 2026. The first version was written with Claude Code by Anthropic; the work continued in Kiro.</p>
            </div>
            <p className="site-links">
              <a href={REPO_URL}>Source code on GitHub</a>
              <a href={NOTICE_URL}>Data sources and licenses</a>
              <a href="/about">About Ninth Life</a>
            </p>
          </div>
        </div>
        <div className="site-card site-card--line site-credits" data-reveal="">
          <h3 className="site-h3">Credits</h3>
          <ul>
            <li>Word frequencies: wordfreq by Robyn Speer.</li>
            <li>Sentence and word-pair data: AACText by Keith Vertanen and Per Ola Kristensson, and the Turk dialogues by Keith Vertanen.</li>
            <li>Type: Atkinson Hyperlegible Next and Mono by the Braille Institute, SIL Open Font License.</li>
            <li>Model ranking: {provider.company}.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
