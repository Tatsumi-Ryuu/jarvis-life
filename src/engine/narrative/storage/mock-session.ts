interface SessionEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export class MockSessionStorage {
  private sessions: Map<string, SessionEntry[]> = new Map();

  getSession(sessionId: string): SessionEntry[] {
    return this.sessions.get(sessionId) ?? [];
  }

  append(sessionId: string, entry: SessionEntry): void {
    const session = this.sessions.get(sessionId) ?? [];
    session.push(entry);
    this.sessions.set(sessionId, session);
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  clearAll(): void {
    this.sessions.clear();
  }

  getLastN(sessionId: string, n: number): SessionEntry[] {
    const session = this.getSession(sessionId);
    return session.slice(-n);
  }
}

let _instance: MockSessionStorage | null = null;

export function getMockSessionStorage(): MockSessionStorage {
  if (!_instance) {
    _instance = new MockSessionStorage();
  }
  return _instance;
}
