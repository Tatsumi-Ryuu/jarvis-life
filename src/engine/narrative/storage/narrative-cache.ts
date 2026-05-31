import type { NarrativeCacheEntry } from '../../../types';

interface CacheEntry {
  key: string;
  value: NarrativeCacheEntry;
  timestamp: number;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export class NarrativeCache {
  private cache: Map<string, CacheEntry> = new Map();

  get(key: string): NarrativeCacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: NarrativeCacheEntry): void {
    this.cache.set(key, { key, value, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

let _instance: NarrativeCache | null = null;

export function getNarrativeCache(): NarrativeCache {
  if (!_instance) {
    _instance = new NarrativeCache();
  }
  return _instance;
}
