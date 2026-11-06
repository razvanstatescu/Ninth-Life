/**
 * What the status pills say. Wide screens show each state as its own pill; the compact header
 * shows one pill that sums them up, with the full text for screen readers (web-ui Req 15.2).
 */
export type DictStatus = 'loading' | 'ready' | 'missing' | 'error';
export type PillTone = 'ok' | 'warn' | 'info';
export type PillIcon = 'check' | 'x' | 'offline';

export interface StatusLine {
  text: string;
  icon?: PillIcon;
  tone?: PillTone;
}

export function statusLines(dict: DictStatus, online: boolean, llm: boolean): StatusLine[] {
  const lines: StatusLine[] = [];
  if (dict === 'ready') lines.push({ text: 'Offline dictionary ready', icon: 'check', tone: 'ok' });
  else if (dict === 'loading') lines.push({ text: 'Loading your dictionary' });
  else lines.push({ text: 'Dictionary not loaded', icon: 'x', tone: 'warn' });
  if (!online) lines.push({ text: dict === 'ready' ? 'Offline. Using your dictionary.' : 'Offline', icon: 'offline', tone: 'info' });
  lines.push({ text: llm ? (online ? 'Model ranking on' : 'Model ranking paused offline') : 'Model ranking off' });
  return lines;
}

/** One short pill for the compact header. The most important state wins. */
export function statusSummary(dict: DictStatus, online: boolean, llm: boolean): StatusLine & { full: string } {
  const full = statusLines(dict, online, llm)
    .map((l) => l.text.replace(/\.$/, ''))
    .join('. ')
    .concat('.');
  if (dict === 'missing' || dict === 'error') return { text: 'No dictionary', icon: 'x', tone: 'warn', full };
  if (dict === 'loading') return { text: 'Loading', full };
  if (!online) return { text: 'Offline', icon: 'offline', tone: 'info', full };
  if (llm) return { text: 'Model on', icon: 'check', tone: 'ok', full };
  return { text: 'On device', icon: 'check', tone: 'ok', full };
}
