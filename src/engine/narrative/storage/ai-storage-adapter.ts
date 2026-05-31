import type { AIStateSnapshot } from '../../../types';

export interface AIStorageAdapter {
  load(slot?: number): Promise<AIStateSnapshot | null>;
  save(snapshot: AIStateSnapshot, slot?: number): Promise<void>;
  clear(slot?: number): Promise<void>;
}
