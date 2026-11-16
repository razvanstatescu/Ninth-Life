'use client';
import { SENT_FOR_RANKING, providerCopy } from '@/lib/rankingProvider';
import type { StatusLine } from '@/lib/status';
import { StatusPill } from './AppHeader';
import { Sheet } from './Sheet';

/** One sentence that says what a status means and what to do about it (web-ui Req 37.6). */
export function statusExplained(text: string): string {
  if (text === 'Offline dictionary ready') return 'Your keys turn into words on this device, with or without a connection.';
  if (text === 'Loading your dictionary') return 'Your keys show as digits until the dictionary is ready. It loads once, then works offline.';
  if (text === 'Dictionary not loaded') return 'Your keys still show as digits. Reload the page to try again; after one load it works offline.';
  if (text.startsWith('Offline')) return 'There is no connection. Typing, sentences and speaking still work from your dictionary.';
  if (text === 'Model ranking on') return `${SENT_FOR_RANKING[0]?.toUpperCase() ?? ''}${SENT_FOR_RANKING.slice(1)} are sent to ${providerCopy().service} to rank your sentences. Turn it off in Settings.`;
  if (text === 'Model ranking paused offline') return 'Model ranking is on but needs a connection, so your dictionary ranks the sentences for now.';
  if (text === 'Model ranking off') return 'Your sentences are ranked on this device and nothing is sent. Model ranking is in Settings.';
  return '';
}

/**
 * Status (web-ui Req 37.6): what the header's status button sums up, one line each with what it means. A short sheet on
 * phones (Menu > Status), a popover under the status button on larger screens.
 */
export function StatusSheet({ open, scanning, status, onClose }: { open: boolean; scanning?: boolean; status: StatusLine[]; onClose: () => void }) {
  return (
    <Sheet open={open} name="status" kind="fit" title="Status" onClose={onClose} scanning={scanning}>
      <ul className="status-list">
        {status.map((l) => (
          <li key={l.text} className="status-list__item">
            <StatusPill icon={l.icon} tone={l.tone}>
              {l.text}
            </StatusPill>
            <p className="field__help">{statusExplained(l.text)}</p>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
