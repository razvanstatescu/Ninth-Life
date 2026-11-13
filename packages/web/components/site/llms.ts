/**
 * /llms.txt (marketing-site MS-3.8): a short Markdown summary for answer engines, served by
 * app/llms.txt/route.ts. Honest value is low (few engines fetch it; Google does not use it), so it holds
 * nothing the page does not: the definition, the intended-purpose sentence, links, the measured numbers
 * from getResults() with the results and the method linked, what model ranking sends (RANKING_SENT) and
 * the FAQ from faqItems(), the list Faq.tsx renders. Built from those values, so it cannot drift. Round 4
 * (2026-11-13, Claude Code): also the limits of Good to know (LIMITS) and the history line (HISTORY_LINE).
 * Lighthouse's llms-txt audit needs an H1, at least one [text](url) link and 50+ characters.
 */
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { RANKING_SENT, RANKING_SENT_ALSO, providerCopy, type ProviderCopy } from '@/lib/rankingProvider';
import { siteOrigin } from '@/lib/site-url';
import { faqItems, type FaqItem } from './sections/Faq';
import { LIMITS } from './sections/Limits';
import { SITE_DEFINITION, SITE_NAME } from './seo';
import { HISTORY_LINE, METHOD_URL, REPO_URL, RESULTS_URL, getResults, modelRunsLine, type SiteResults } from './site-data';

export interface LlmsInput {
  origin: URL | null;
  results: SiteResults | null;
  faq: readonly FaqItem[];
  provider: ProviderCopy;
}

export function llmsText({ origin = siteOrigin(), results = getResults(), faq = faqItems(), provider = providerCopy() }: Partial<LlmsInput> = {}): string {
  // Absolute links with a known origin; site-relative ones otherwise (never a localhost URL).
  const link = (path: string) => (origin ? new URL(path, origin).href : path);
  const out: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DEFINITION}`,
    '',
    NOT_A_MEDICAL_DEVICE,
    '',
    '## Pages',
    '',
    `- [Open the app](${link('/app')}): the keypad. It runs in your browser, with no account, and works offline after the first visit.`,
    `- [About Ninth Life](${link('/about')}): how every spoken word is checked against your keys, what model ranking sends and to whom, and what Ninth Life is not.`,
    `- [Website](${link('/')}): the demo, the measured results and the source code.`,
    '',
    '## Measured, not promised',
    '',
  ];
  if (results) {
    out.push(
      `We typed ${results.items.toLocaleString('en-US')} test sentences from public AAC text collections with a simulated typist, one press per letter, using the offline dictionary that ships with the app.`,
      '',
      `- Right sentence first: ${results.ghost.top1} of sentences, with no correction (${results.dict.top1} with word frequency alone).`,
      `- Right sentence in the top 5: ${results.ghost.top5} of sentences (${results.dict.top5} with word frequency alone).`,
      `- Right word first: ${results.ghost.wordAcc} of words, before any correction.`,
      '',
      // Round 4 (r4-results): RESULTS.md's own figure, as the page shows it ("1.00 key presses per character"), instead
      // of a keystroke-savings percentage RESULTS.md prints as "-0.0%"; the old sentence only when the figure is absent.
      `${results.ghost.pressesPerChar ? `${results.ghost.pressesPerChar} key presses per character: letter mode saves no key presses.` : `Every letter is still one press, so letter mode saves no key presses (${results.ghost.ksr} keystroke savings).`} With one switch it takes ${results.ghost.scanStepsPerChar} scan steps per character. These figures come from a simulated typist, not from studies with people.`,
      '',
      'Some test sentences, mostly short stock phrases such as "Thank you.", also appear in the text the dictionary was built from, so these figures are somewhat optimistic.',
      '',
    );
    if (results.modelRuns) out.push(modelRunsLine(results.modelRuns), '');
  } else {
    out.push('The eval results are not available in this build.', '');
  }
  out.push(
    `- [Full results](${RESULTS_URL})`,
    `- [How we measured](${METHOD_URL})`,
    '',
    '## Model ranking',
    '',
    `Off until you turn it on. When it is on, Ninth Life sends these to ${provider.service}, which suggests the order of the sentences:`,
    '',
    ...RANKING_SENT.map((s) => `- ${s}`),
    '',
    RANKING_SENT_ALSO,
    '',
    `It cannot add words: every word is checked against your keys, and nothing is spoken until you press Speak. ${provider.retention}`,
    '',
    // Round 4 (2026-11-13, Claude Code; MS-3.8): the limits of Good to know, from the list Limits.tsx renders.
    '## Good to know',
    '',
    ...LIMITS.map((l) => `- ${l}`),
    '',
    '## Questions',
    '',
  );
  for (const [q, a] of faq) out.push(`### ${q}`, '', a, '');
  // Round 4: the history line (MS-4.7) from the one constant the site footer uses.
  out.push('## Source', '', `- [Source code on GitHub](${REPO_URL}) (MIT license)`, '', HISTORY_LINE, '');
  return out.join('\n');
}
