/**
 * Questions (#faq, content.md §9, design.md §9). Native <details>, closed when the page loads, opened
 * with a press, Enter or Space and no script (MS-3.4). The list is one reveal block, never each item.
 * Round 3: questions a visitor has after reading the page, answered only with what the app does
 * (Spell this word, Add to my words, Phrases, the manifest); "Which languages?" folded into "Which devices?" and the
 * home screen into "Do I need to install anything?"; then "Something else? Ask on GitHub".
 * Round 5 (2026-11-17): five questions, the ones no section answers; "Something else? Ask on GitHub" is the head's
 * lead, so it fills the column beside the list on desktop.
 */
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { Icon } from '@/components/Icon';
import { ISSUES_URL } from '../site-data';

/** A question and its answer, as plain text. */
export type FaqItem = readonly [question: string, answer: string];

/**
 * The questions and answers this section renders, in order. The FAQPage JSON-LD
 * (structured-data.ts) and /llms.txt read the same list, so the machine-readable copies always
 * equal the visible text. Keep this shape when the questions change.
 */
export function faqItems(): readonly FaqItem[] {
  // Round 5 (2026-11-17): only questions the page does not answer elsewhere. The switch, the model, what ranking sends,
  // working offline, names and devices are each answered once, in their own section (Access, Proof, Privacy, Conversation).
  return [
    [
      'Is it free?',
      'Yes. There is no paid tier, no ads and no account. The code is open source under the MIT license. Model ranking costs a little per sentence. We can switch it off at any time, and the app then keeps working with the offline dictionary.',
    ],
    [
      'Do I need to install anything?',
      "No. Open it in your browser. After one visit it works offline. To keep it on your home screen, use your browser's Add to Home Screen or Install option.",
    ],
    [
      'What if the sentence I meant is not first?',
      'Other sentences that match your keys are listed under it: pick one with a tap, the arrow keys or your switch. If a word is still wrong, Spell this word lets you choose the letter for each key you pressed.',
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
          <p className="site-lead site-faq__more">
            Something else? <a href={ISSUES_URL}>Ask on GitHub</a>
          </p>
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
