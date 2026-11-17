/**
 * Offline and private (#privacy, content.md §6, design.md §6). Provider names and retention come
 * only from providerCopy() (MS-4.6). Browser makers are named only in the Listen card (MS-4.8).
 * Round 2: a 288px stage first in each card, in a 2 x 2 grid from 648px (design 4.3).
 * Round 3: a surface band (Results moved up); the Model ranking card keeps what is sent
 * (rankingSentText(), the same list as Limits, the FAQ and /about) and the region, retention and log lines move to
 * a list under the grid; "Check it yourself" links to the evidence; on phones each stage hugs its drawing (W1).
 * The section ends on a secondary xl "Open the app" in a .site-cta row (verifier, 2026-11-13): on a 390px phone the
 * Results row and the closing one were about 14 screens apart. Only the hero and #start are ember primaries.
 * Round 4 (2026-11-13; decisions §2 "Boxes"): the On your device map leads, then the three ways out
 * (model ranking, online voices, Listen) in one row from 1024px (.site-bento--3). What ranking sends is real text drawn
 * at the top of its card's stage, after the card's h3 in the DOM (MS-7.2 exception; .site-card--sent), and the card
 * copy no longer repeats it. The region, retention and log lines are .site-fact rows in a note card.
 * The lead's sentence "Only three features send words or speech off this device: model ranking, online voices and
 * Listen." was checked against every network call in the app (2026-11-13): the dictionary files (same origin),
 * /api/decode only with model ranking on (lib/decodeClient.ts), a word pack's link (the link only, lib/vocabPack.ts),
 * the service worker (same-origin files; decode network-only), and the browser's own speech services (online voices,
 * Listen). Nothing else sends words or speech.
 * Round 5 (2026-11-17): the map leads, then one card lists the three ways out as rows (icon tile, name, what goes and
 * where), in Good to know's row look. It replaces the three door cards, which repeated the map with their own outlines,
 * and the separate note card: the region, retention and log lines sit under Model ranking, the links close the card.
 * This is the one place that lists what ranking sends (Good to know and the FAQ no longer repeat it). No closing
 * "Open the app" row: the sticky bar carries it.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { RANKING_SENT_ALSO, providerCopy, rankingSentText } from '@/lib/rankingProvider';
import { SiteIcon, external, toggle } from '../icons';
import { DeviceMap } from '../pictures/Privacy';
import { PRIVACY_RULES_URL, RANKING_REQUEST_URL, finishedKeys, finishedSentence, getDemoData } from '../site-data';

const reveal = (i: number) => ({ '--reveal-i': i }) as CSSProperties;

/** One way out: its icon tile, its name, then what it sends and to whom (the .site-rows look of Good to know). */
function Way({ icon, name, children }: { icon: ReactNode; name: string; children: ReactNode }) {
  return (
    <li>
      <span className="site-tile">{icon}</span>
      <h4 className="site-rows__key">{name}</h4>
      <div className="site-rows__text">{children}</div>
    </li>
  );
}

export function Privacy() {
  const provider = providerCopy();
  const demo = getDemoData();
  const sent = rankingSentText();
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
        <div className="site-card site-card--lead" data-reveal="" style={reveal(0)}>
          <div className="site-stage site-stage--lead" aria-hidden="true">
            <DeviceMap sentence={finishedSentence(demo)} keys={finishedKeys(demo)} />
          </div>
          <h3 className="site-h3">
            <Icon name="offline" />
            On your device
          </h3>
          <p>Your saved phrases and My words are kept in your browser. Only three features send words or speech off this device: model ranking, online voices and Listen.</p>
        </div>
        <div className="site-card site-rows-card" data-reveal="" style={reveal(1)}>
          <h3 className="site-h3">What leaves this device, and only when you use it</h3>
          <ul className="site-rows">
            <Way icon={<SiteIcon d={toggle} />} name="Model ranking">
              <p>
                Off until you turn it on in Settings. Then Ninth Life sends {sent} to {provider.service} to rank the sentences. {RANKING_SENT_ALSO}
              </p>
              <ul className="site-rows__facts">
                <li>{provider.region}</li>
                <li>{provider.retention}</li>
                <li>Our server logs timings and counts, never your words.</li>
              </ul>
            </Way>
            <Way icon={<Icon name="voice" />} name="Online voices">
              <p>Voices marked &quot;on this device&quot; keep your words on the device; online voices send the text to the browser maker.</p>
            </Way>
            <Way icon={<Icon name="mic" />} name="Listen">
              <p>
                The other person&apos;s voice may be sent to the browser maker (Google in Chrome, Apple in Safari) to turn it into text, unless the browser can do it on this device. Ninth Life never receives or keeps the audio.
              </p>
            </Way>
          </ul>
          <p className="site-rows-card__check">Check it yourself: the code is open, and your browser&apos;s storage shows no cookies.</p>
          <p className="site-links">
            <a className="site-go site-go--out" href={PRIVACY_RULES_URL}>
              The privacy rules the code follows
              <SiteIcon d={external} />
            </a>
            <a className="site-go site-go--out" href={RANKING_REQUEST_URL}>
              The code that builds the ranking request
              <SiteIcon d={external} />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
