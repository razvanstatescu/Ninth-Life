/** Good to know (#limits, content.md §8, design.md §8): the honest limits, before the questions (MS-4.5). */

export const LIMITS = [
  'You need to be able to spell. Ninth Life types words, not symbols, so it does not suit someone who cannot spell yet.',
  'Voices depend on your device and browser.',
  'English first.',
  'It has not yet been tested with people who use AAC.',
  'It has been checked in phone and tablet simulators, not yet on real phones and tablets.',
  'With model ranking on, your keys and the candidate words leave your device, as described under Privacy.',
  'It is not a replacement for an AAC device, a speech-language assessment or professional advice.',
] as const;

export function Limits() {
  return (
    <section id="limits" className="site-band" aria-labelledby="limits-title">
      <div className="site-wrap site-stack">
        <div className="site-head" data-reveal="">
          <h2 id="limits-title" className="site-h2">
            Good to know
          </h2>
        </div>
        <div className="site-card site-card--line site-limits" data-reveal="">
          <ul>
            {LIMITS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
