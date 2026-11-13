/**
 * Questions (#faq, content.md §9, design.md §9). Native <details>, closed when the page loads, opened
 * with a press, Enter or Space and no script (MS-3.4). The list is one reveal block, never each item.
 * Round 3 (Claude Code): questions a visitor has after reading the page, answered only with what the app does
 * (Spell this word, Add to my words, Phrases, the manifest); "Which languages?" folded into "Which devices?" and the
 * home screen into "Do I need to install anything?"; then "Something else? Ask on GitHub".
 */
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { Icon } from '@/components/Icon';
import { RANKING_SENT_ALSO, providerCopy, rankingSentText } from '@/lib/rankingProvider';
import { ISSUES_URL } from '../site-data';

/** A question and its answer, as plain text. */
export type FaqItem = readonly [question: string, answer: string];

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The questions and answers this section renders, in order. The FAQPage JSON-LD
 * (structured-data.ts) and /llms.txt read the same list, so the machine-readable copies always
 * equal the visible text. Keep this shape when the questions change.
 */
export function faqItems(): readonly FaqItem[] {
  const provider = providerCopy();
  return [
    // Round 4 (2026-11-13, Claude Code): the last two sentences are "Why it is free" from the dissolved Source section,
    // word for word, so the page still says that ranking can be switched off (content.md §9).
    [
      'Is it free?',
      'Yes. There is no paid tier, no ads and no account. The code is open source under the MIT license. Model ranking costs a little per sentence. We can switch it off at any time, and the app then keeps working with the offline dictionary.',
    ],
    [
      'Do I need to install anything?',
      "No. Open it in your browser. After one visit it works offline. To keep it on your home screen, use your browser's Add to Home Screen or Install option.",
    ],
    [
      'Which devices and languages?',
      'Phones (upright), tablets (either way up) and laptops, in a current browser. It runs in your browser, so voices and Listen depend on that browser. English only for now.',
    ],
    [
      'What if the sentence I meant is not first?',
      'Other sentences that match your keys are listed under it: pick one with a tap, the arrow keys or your switch. If a word is still wrong, Spell this word lets you choose the letter for each key you pressed.',
    ],
    [
      'Can I type names and my own words?',
      'Yes. When a word is not in the dictionary, choose Spell this word, then Add to my words. My words stay on this device and come up when you type their keys.',
    ],
    ['Can I use it with a switch?', 'Yes, with one or two switches. Space or Enter acts as the switch, and the scan speed goes from 0.4 to 5 seconds a step.'],
    [
      'Can the model say something I did not type?',
      'No. Every word is turned back into keys and checked against the keys you pressed. A word that does not match is dropped. Nothing is spoken until you press Speak.',
    ],
    [
      'What does model ranking send, and to whom?',
      `${capitalise(rankingSentText())}, to ${provider.service}. ${RANKING_SENT_ALSO} It is off until you turn it on. ${provider.retention}`,
    ],
    [
      'Does it work without a connection?',
      'Yes, after the first visit. The dictionary and the proof check run on your device. Model ranking and online voices need a connection; the dictionary does not.',
    ],
    [
      'Where are my saved phrases?',
      "In your browser on this device, nowhere else. Nothing is saved unless you press Save phrase. Delete one in Phrases; clearing this site's data in your browser deletes them all, with My words.",
    ],
    ['Is it a medical device?', `No. ${NOT_A_MEDICAL_DEVICE}`],
  ];
}

export function Faq() {
  const items = faqItems();
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
          <p className="site-links site-faq__more">
            <span>Something else?</span>{' '}
            <a href={ISSUES_URL}>Ask on GitHub</a>
          </p>
        </div>
      </div>
    </section>
  );
}
