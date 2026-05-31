const EVENT_DIALOGUE_PREFIX = 'jarvis-life:event-dialogue';

function getSessionStorage(): Storage | null {
  return typeof window !== 'undefined' && window.sessionStorage
    ? window.sessionStorage
    : null;
}

export function buildSaveScopedKey(prefix: string, saveId: string, ...parts: string[]): string {
  return [prefix, saveId, ...parts].join(':');
}

export function buildEventDialogueDraftKey(saveId: string, eventId: string): string {
  return buildSaveScopedKey(EVENT_DIALOGUE_PREFIX, saveId, eventId);
}

export function removeEventDialogueDraft(saveId: string, eventId: string): void {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(buildEventDialogueDraftKey(saveId, eventId));
}

export function clearEventDialogueDrafts(saveId?: string): void {
  const storage = getSessionStorage();
  if (!storage) return;

  const prefix = saveId
    ? `${EVENT_DIALOGUE_PREFIX}:${saveId}:`
    : `${EVENT_DIALOGUE_PREFIX}:`;

  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    storage.removeItem(key);
  }
}
