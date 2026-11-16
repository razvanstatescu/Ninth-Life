// Every test starts with an empty conversation: the thread is module memory (lib/conversation.ts).
import { afterEach } from 'vitest';
import { conversationStore } from '@/lib/conversation';
import { resetSettingsSection } from '@/components/SettingsSheet';

afterEach(() => {
  conversationStore.reset();
  // Larger screens open Settings on the last group used (memory only): each test starts at Voice.
  resetSettingsSection();
});
