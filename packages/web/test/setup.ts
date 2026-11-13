// Every test starts with an empty conversation: the thread is module memory (lib/conversation.ts).
import { afterEach } from 'vitest';
import { conversationStore } from '@/lib/conversation';

afterEach(() => conversationStore.reset());
