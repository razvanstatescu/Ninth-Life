/**
 * The closing call to action (#start, content.md §11, design.md §11). A Night band with the hero's night sky in
 * both themes, so the page ends the way it opens (W2, ADR-006 amendment 2026-11-12); its "Open the app" is the
 * only ember fill in any viewport that shows it (MS-9.1), drawn exactly as the hero's (.site-cta, 64px, no Day
 * ring because the band is Night). Never marked for a reveal: it holds the logo (MS-8.4).
 *
 * Round 4 (2026-11-13, Claude Code): the Free and open source section dissolved (MS-3.1); its facts are this row of
 * four, in words the page already uses (the FAQ, the Privacy lead, the old Source lead). Typographic, with rules
 * between the items: not badges, which content.md bans because they would read as certifications. Each item reads
 * "Free: No paid tier, no ads." (a visually hidden colon). It replaces the line "Free. Works offline. No account."
 */
export const START_FACTS: readonly (readonly [title: string, line: string])[] = [
  ['Free', 'No paid tier, no ads.'],
  ['Works offline', 'After the first visit.'],
  ['No account', 'No cookies, no analytics.'],
  ['Open source', 'MIT licensed.'],
];

export function Start() {
  return (
    <section id="start" className="site-band site-night site-start" data-theme="night" aria-labelledby="start-title">
      <div className="site-wrap site-start__inner">
        <img className="site-start__icon" src="/icons/icon.svg" alt="" width={96} height={96} />
        <div className="site-head site-head--center">
          <h2 id="start-title" className="site-h2">
            Type your first sentence
          </h2>
        </div>
        <ul className="site-start__facts">
          {START_FACTS.map(([title, line]) => (
            <li key={title}>
              <strong className="site-start__fact">{title}</strong>
              <span className="nl-sr-only">: </span>
              <span className="site-start__fact-line">{line}</span>
            </li>
          ))}
        </ul>
        <div className="site-cta site-cta--center">
          <a className="nl-btn nl-btn--primary nl-btn--xl" href="/app">
            Open the app
          </a>
        </div>
        <p className="site-start__note">Type with a keyboard, by touch or with one or two switches.</p>
      </div>
    </section>
  );
}
