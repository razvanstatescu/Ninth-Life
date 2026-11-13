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
 */
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { RANKING_SENT_ALSO, providerCopy, rankingSentText } from '@/lib/rankingProvider';
import { SiteIcon, chart, clock, cloud, external, globe, toggle } from '../icons';
import { DeviceMap, ListenDoor, RankingDoor, VoiceDoor } from '../pictures/Privacy';
import { PRIVACY_RULES_URL, RANKING_REQUEST_URL, finishedKeys, finishedSentence, getDemoData } from '../site-data';

/** The reveal stagger restarts in each row: the lead alone, then the row of three (0, 1, 2). */
const reveal = (i: number) => ({ '--reveal-i': Math.min(i, 2) }) as CSSProperties;

/** What model ranking sends, as one sentence in a box with a cloud (real text; the drawing keeps an aria-hidden copy). */
function Sent() {
  return (
    <>
      <SiteIcon d={cloud} />
      <span>
        <span className="site-sent__label">Sent to rank:</span> {rankingSentText()}. {RANKING_SENT_ALSO}
      </span>
    </>
  );
}

function Card({ i, lead, className, drawing, icon, title, children }: { i: number; lead?: boolean; className?: string; drawing: ReactNode; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className={`site-card${lead ? ' site-card--lead' : ''}${className ? ` ${className}` : ''}`} data-reveal="" style={reveal(i)}>
      <div className={lead ? 'site-stage site-stage--lead' : 'site-stage site-stage--m'} aria-hidden="true">
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

export function Privacy() {
  const provider = providerCopy();
  const demo = getDemoData();
  return (
    <section id="privacy" className="site-band site-band--surface" aria-labelledby="privacy-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="privacy-title" className="site-h2">
            Offline unless you choose
          </h2>
          <p className="site-lead">
            Typing, the dictionary and the proof check run in your browser. After one visit the app works with no connection. No account, no cookies, no analytics, no ads.
          </p>
        </div>
        <div className="site-grid site-bento site-bento--3">
          <Card i={0} lead drawing={<DeviceMap sentence={finishedSentence(demo)} keys={finishedKeys(demo)} />} icon={<Icon name="offline" />} title="On your device">
            <p>Your saved phrases and My words are kept in your browser. Only three features send words or speech off this device: model ranking, online voices and Listen.</p>
          </Card>
          <Card i={0} className="site-card--sent" drawing={<RankingDoor sent={<Sent />} />} icon={<SiteIcon d={toggle} />} title="Model ranking, if you turn it on">
            <p className="site-sent">
              <Sent />
            </p>
            <p>It is off until you turn it on in Settings. Then Ninth Life sends these to {provider.service} to rank the sentences.</p>
          </Card>
          <Card i={1} drawing={<VoiceDoor />} icon={<Icon name="voice" />} title="Voices">
            <p>Voices marked &quot;on this device&quot; keep your words on the device; online voices send the text to the browser maker.</p>
          </Card>
          <Card i={2} drawing={<ListenDoor />} icon={<Icon name="mic" />} title="Listen">
            <p>
              The other person&apos;s voice may be sent to the browser maker (Google in Chrome, Apple in Safari) to turn it into text, unless the browser can do it on this device. Ninth Life never receives or keeps the audio.
            </p>
          </Card>
        </div>
        <div className="site-card site-card--note site-privacy-facts">
          <h3 className="site-h3">What happens to what ranking sends</h3>
          <ul className="site-facts">
            <li className="site-fact">
              <span className="site-tile">
                <SiteIcon d={globe} />
              </span>
              <span>{provider.region}</span>
            </li>
            <li className="site-fact">
              <span className="site-tile">
                <SiteIcon d={clock} />
              </span>
              <span>{provider.retention}</span>
            </li>
            <li className="site-fact">
              <span className="site-tile">
                <SiteIcon d={chart} />
              </span>
              <span>Our server logs timings and counts, never your words.</span>
            </li>
          </ul>
          <p>Check it yourself: the code is open, and your browser&apos;s storage shows no cookies.</p>
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
        <div className="site-cta">
          <a className="nl-btn nl-btn--secondary nl-btn--xl" href="/app">
            Open the app
          </a>
        </div>
      </div>
    </section>
  );
}
