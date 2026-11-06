/**
 * Plan F11, web-ui Req 16.7: in a scan mode, choosing Keyboard or Touch in Settings asks first
 * ("Turn off switch scanning?"), with Cancel first in scan order, because a switch user cannot turn
 * scanning back on once it is off.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { miniDict } from './fixtures';

function sw(key: ' ' | 'Enter') {
  act(() => {
    fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
    fireEvent.keyUp(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
  });
}
const litRow = () => document.querySelector('[data-scan-state="row"]')?.getAttribute('data-scan-row') ?? null;
const litCell = () => document.querySelector('[data-scan-state="lit"]')?.textContent?.trim() ?? null;
function moveToRow(name: string) {
  for (let i = 0; i < 40 && litRow() !== name; i++) sw(' ');
  expect(litRow()).toBe(name);
}
function moveToCell(text: string) {
  for (let i = 0; i < 10 && litCell() !== text; i++) sw(' ');
  expect(litCell()).toBe(text);
}
const sheet = () => document.querySelector<HTMLElement>('dialog[data-overlay="settings"][open]');
const rows = () => [...sheet()!.querySelectorAll('[data-scan-row]')].map((r) => r.getAttribute('data-scan-row'));
const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement;
/** The sheet scanner re-reads its rows in a MutationObserver (a microtask): let it run. */
const flushRows = () => act(async () => {});

/** Open Settings with two switches and choose `way` in the Access row by switch. */
async function chooseBySwitch(way: 'Keyboard' | 'Touch') {
  render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  moveToRow('access');
  sw('Enter');
  moveToCell(way);
  sw('Enter');
  await flushRows();
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('turning switch scanning off asks first (plan F11, web-ui Req 16.7)', () => {
  it('Req 16.7: choosing Keyboard by switch asks, and the question comes straight after Close with Cancel first', async () => {
    await chooseBySwitch('Keyboard');
    const q = screen.getByRole('alertdialog', { name: 'Turn off switch scanning?' });
    expect(q.textContent).toContain('You will need a keyboard or touch to turn it back on.');
    expect(rows()).toEqual(['close', 'confirm-scan-off']);
    expect(within(q).getAllByRole('button').map((b) => b.textContent)).toEqual(['Cancel', 'Turn off, use Keyboard']);
    // Nothing has changed yet: the setting is still Two switches.
    expect(screen.queryByRole('radio')).toBeNull();
    moveToRow('confirm-scan-off');
    sw('Enter');
    expect(litCell()).toBe('Cancel'); // the first cell a switch user reaches
  });

  it('Req 16.7: Cancel by switch keeps Two switches, and scanning goes on after Close', async () => {
    await chooseBySwitch('Keyboard');
    moveToRow('confirm-scan-off');
    sw('Enter');
    moveToCell('Cancel');
    sw('Enter');
    await flushRows();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(radio('Two switches').checked).toBe(true);
    moveToRow('close');
    sw('Enter');
    sw('Enter');
    expect(sheet()).toBeNull();
    expect(screen.getByText('Step scanning with 2 switches')).toBeTruthy();
  });

  it('Req 16.7: "Turn off, use Touch" by switch turns scanning off once the sheet closes', async () => {
    await chooseBySwitch('Touch');
    moveToRow('confirm-scan-off');
    sw('Enter');
    moveToCell('Turn off, use Touch');
    sw('Enter');
    await flushRows();
    expect(radio('Touch').checked).toBe(true);
    moveToRow('close');
    sw('Enter');
    sw('Enter');
    expect(sheet()).toBeNull();
    expect(screen.getByText('Switch scanning is off')).toBeTruthy();
  });

  it('Req 16.7 + 16.6: while asking, focus rests on the question (not a button) and the scan highlight is the one ember thing', async () => {
    await chooseBySwitch('Keyboard');
    expect(document.activeElement?.getAttribute('role')).toBe('alertdialog');
    expect(document.querySelectorAll('[data-scan-state]')).toHaveLength(1);
  });

  it('Req 16.7: a tap on Touch in a scan mode asks too; Cancel by tap keeps One switch', async () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'scan1', acceptDelayMs: 0 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(radio('Touch'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(radio('One switch').checked).toBe(true);
  });

  it('Req 16.7: closing the sheet while asking changes nothing, and the next open shows Settings again', async () => {
    await chooseBySwitch('Keyboard');
    fireEvent.click(within(sheet()!).getByRole('button', { name: 'Close' }));
    expect(sheet()).toBeNull();
    expect(screen.getByText('Step scanning with 2 switches')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(radio('Two switches').checked).toBe(true);
  });

  it('Req 16.7: no question between the two scan modes, or when scanning is not on', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(radio('One switch'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(radio('One switch').checked).toBe(true);
    cleanup();
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'keyboard' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(radio('One switch'));
    fireEvent.click(radio('Touch')); // scanning was never on while the sheet was open: nothing to lose
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(radio('Touch').checked).toBe(true);
  });
});
