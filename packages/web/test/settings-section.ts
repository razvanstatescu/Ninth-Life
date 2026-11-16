// Settings opens on its groups (web-ui Req 38): a test picks the group before it reaches a setting, as a person would.
import { fireEvent } from '@testing-library/react';

/** Press the Settings group whose name starts with `title` ("Ways to type", "Typing", ...). */
export function openSection(title: string): void {
  const d = document.querySelector('dialog[data-overlay="settings"][open]');
  const b = [...(d?.querySelectorAll<HTMLButtonElement>('.settings__item') ?? [])].find((x) => x.querySelector('.menu-row__label')?.textContent === title);
  if (!b) throw new Error(`No Settings group "${title}"`);
  fireEvent.click(b);
}
