/**
 * Questions (#faq, content.md §9, design.md §9). Native <details>, closed when the page loads, opened
 * with a press, Enter or Space and no script (MS-3.4). The list is one reveal block, never each item.
 */
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { Icon } from '@/components/Icon';
import { providerCopy } from '@/lib/rankingProvider';

export function Faq() {
  const provider = providerCopy();
  const items: readonly [string, string][] = [
    ['Is it free?', 'Yes. There is no paid tier, no ads and no account. The code is open source under the MIT license.'],
    ['Do I need to install anything?', 'No. Open it in your browser. After one visit it works offline.'],
    [
      'Can the model say something I did not type?',
      'No. Every word is turned back into keys and checked against the keys you pressed. A word that does not match is dropped. Nothing is spoken until you press Speak.',
    ],
    [
      'What does model ranking send, and to whom?',
      `Your keys, the dictionary words that match them, Ninth Life's own best guesses and the other person's last line, to ${provider.service}. It is off until you turn it on. ${provider.retention}`,
    ],
    [
      'Does it work without a connection?',
      'Yes, after the first visit. The dictionary and the proof check run on your device. Model ranking and online voices need a connection; the dictionary does not.',
    ],
    ['Which languages?', 'English first.'],
    [
      'Which devices?',
      'Phones (upright), tablets (either way up) and laptops, in a current browser. It runs in your browser, so voices and Listen depend on that browser.',
    ],
    ['Can I use it with a switch?', 'Yes, with one or two switches. Space or Enter acts as the switch, and the scan speed goes from 0.4 to 5 seconds a step.'],
    ['Is it a medical device?', `No. ${NOT_A_MEDICAL_DEVICE}`],
  ];
  return (
    <section id="faq" className="site-band site-band--surface" aria-labelledby="faq-title">
      <div className="site-wrap site-faq-wrap">
        <div className="site-head" data-reveal="">
          <h2 id="faq-title" className="site-h2">
            Questions
          </h2>
        </div>
        <div className="site-faq-list" data-reveal="">
          {items.map(([q, a]) => (
            <details key={q} className="site-faq">
              <summary>
                <span>{q}</span>
                <Icon name="plus" className="site-faq__plus" />
                <Icon name="x" className="site-faq__x" />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
