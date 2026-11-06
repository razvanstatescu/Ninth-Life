/**
 * IndexedDB via idb (contracts.md §4). Nothing someone says is stored unless they press
 * "Save phrase". Settings are stored so the app opens the way the person left it.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { sanitizeSettings, type Settings } from './settings';

export type Phrase = { id: string; text: string; lang: string; uses: number; lastUsed: number; pinned: boolean };

interface NinthDB extends DBSchema {
  phrases: { key: string; value: Phrase; indexes: { 'by-text': string } };
  settings: { key: string; value: Settings };
}

const DB_NAME = 'ninth-life';
const DB_VERSION = 1;
const SETTINGS_KEY = 'settings';

let dbPromise: Promise<IDBPDatabase<NinthDB>> | null = null;

export function storageAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function db(): Promise<IDBPDatabase<NinthDB>> {
  if (!storageAvailable()) return Promise.reject(new Error('IndexedDB is not available'));
  dbPromise ??= openDB<NinthDB>(DB_NAME, DB_VERSION, {
    upgrade(d) {
      const phrases = d.createObjectStore('phrases', { keyPath: 'id' });
      phrases.createIndex('by-text', 'text', { unique: false });
      d.createObjectStore('settings');
    },
  });
  return dbPromise;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Pinned first, then most recently used. */
export function sortPhrases(list: Phrase[]): Phrase[] {
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastUsed - a.lastUsed);
}

export async function listPhrases(): Promise<Phrase[]> {
  return sortPhrases(await (await db()).getAll('phrases'));
}

/** Save a phrase. Saving the same text again counts a use instead of adding a copy. */
export async function savePhrase(text: string, lang = 'en', now = Date.now()): Promise<Phrase> {
  const clean = text.trim();
  if (!clean) throw new Error('Nothing to save');
  const d = await db();
  const existing = await d.getFromIndex('phrases', 'by-text', clean);
  const phrase: Phrase = existing
    ? { ...existing, uses: existing.uses + 1, lastUsed: now }
    : { id: newId(), text: clean, lang, uses: 1, lastUsed: now, pinned: false };
  await d.put('phrases', phrase);
  return phrase;
}

export async function markPhraseUsed(id: string, now = Date.now()): Promise<void> {
  const d = await db();
  const p = await d.get('phrases', id);
  if (p) await d.put('phrases', { ...p, uses: p.uses + 1, lastUsed: now });
}

export async function deletePhrase(id: string): Promise<void> {
  await (await db()).delete('phrases', id);
}

export async function loadSettings(): Promise<Settings | null> {
  try {
    const v = await (await db()).get('settings', SETTINGS_KEY);
    return v ? sanitizeSettings(v) : null;
  } catch {
    return null;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    await (await db()).put('settings', sanitizeSettings(s), SETTINGS_KEY);
  } catch {
    /* settings still apply for this visit */
  }
}

/** Test hook: forget the cached connection. */
export function resetStorageForTests(): void {
  dbPromise = null;
}
