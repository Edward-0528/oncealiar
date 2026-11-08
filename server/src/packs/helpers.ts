import type { Topic } from '@oncealiar/shared';

/** Small helper so pack files stay readable: topic(id, name, emoji, [16 words]). */
export function topic(id: string, name: string, emoji: string, words: string[]): Topic {
  return { id, name, emoji, words };
}
