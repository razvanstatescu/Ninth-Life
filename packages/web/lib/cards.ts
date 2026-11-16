/**
 * Fixed texts for Show a card and Phone calls (web-ui Req 35.2, 35.3). Sentence case, plain words, no claims.
 * Shown or spoken only on a press.
 */

/** Show a card: big text for the other person, shown (never spoken). */
export const SHOW_CARDS: readonly string[] = [
  'I type to talk. Please wait for me.',
  'I can hear you. I answer by typing.',
  'Please give me a moment to type.',
  'Please ask me, not the person with me.',
];

/** Phone calls: opening lines that speak on a press. Nothing here promises that a call can hear them. */
export const PHONE_LINES: readonly string[] = [
  'Hello. I type and my device speaks for me. Please wait while I type.',
  'Please stay on the line. I am typing.',
  'Please speak slowly. I answer by typing.',
  'Can you hear me?',
];

export const PHONE_CALLS_HELP =
  'Ninth Life cannot speak into a phone call. These lines help when the call can hear this device, for example a call on speaker on another phone.';
