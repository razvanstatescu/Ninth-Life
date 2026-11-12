/**
 * Offline and private (#privacy, content.md §6, design.md §6). Provider names and retention come
 * only from providerCopy() (MS-4.6). Browser makers are named only in the Listen card (MS-4.8).
 * Round 2: a 288px stage first in each card, in a 2 x 2 grid from 648px (design 4.3).
 */
import type { CSSProperties } from 'react';
import { providerCopy } from '@/lib/rankingProvider';
import { DeviceBoundary, ListenStrip, RankingSides, VoiceRows } from '../pictures/Privacy';
import { REPO_URL } from '../site-data';

const reveal = (i: number) => ({ '--reveal-i': Math.min(i, 2) }) as CSSProperties;

export function Privacy() {
  const provider = providerCopy();
  return (
    <section id="privacy" className="site-band" aria-labelledby="privacy-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="privacy-title" className="site-h2">
            Offline unless you choose
          </h2>
          <p className="site-lead">
            Typing, the dictionary and the proof check run in your browser. After one visit the app works with no connection. No account, no cookies, no analytics, no ads.
          </p>
        </div>
        <div className="site-grid site-grid--boxes site-grid--start">
          <div className="site-card site-card--line" data-reveal="" style={reveal(0)}>
            <div className="site-stage site-stage--privacy" aria-hidden="true">
              <DeviceBoundary />
            </div>
            <h3 className="site-h3">On your device</h3>
            <p>What you type, the dictionary, your saved phrases and My words. Nothing you say is saved unless you press Save phrase, and then only on this device.</p>
          </div>
          <div className="site-card site-card--line" data-reveal="" style={reveal(1)}>
            <div className="site-stage site-stage--privacy" aria-hidden="true">
              <RankingSides />
            </div>
            <h3 className="site-h3">Model ranking, if you turn it on</h3>
            <p>
              It is off until you turn it on in Settings. Then Ninth Life sends your keys, the dictionary words that match them, its own best guesses and the other person's last line to {provider.service} to rank the sentences. {provider.region} {provider.retention} Our server logs timings and counts, never your words.
            </p>
          </div>
          <div className="site-card site-card--line" data-reveal="" style={reveal(2)}>
            <div className="site-stage site-stage--privacy" aria-hidden="true">
              <VoiceRows />
            </div>
            <h3 className="site-h3">Voices</h3>
            <p>Speech uses your browser's voices. Voices marked &quot;on this device&quot; keep your words on the device; online voices send the text to the browser maker.</p>
          </div>
          <div className="site-card site-card--line" data-reveal="" style={reveal(3)}>
            <div className="site-stage site-stage--privacy" aria-hidden="true">
              <ListenStrip />
            </div>
            <h3 className="site-h3">Listen</h3>
            <p>
              Listen uses your browser's speech service. The other person's voice may be sent to the browser maker (Google in Chrome, Apple in Safari) to turn it into text, unless the browser can do it on this device. Ninth Life never receives or keeps the audio.
            </p>
          </div>
        </div>
        <p>Check it yourself: the code is open, and your browser's storage shows no cookies.</p>
        <p className="site-links">
          <a href={REPO_URL}>Read the source code</a>
        </p>
      </div>
    </section>
  );
}
