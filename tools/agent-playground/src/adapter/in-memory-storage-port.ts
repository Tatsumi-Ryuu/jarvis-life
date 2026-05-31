import type { SaveId } from '@/types';
import type { JarvisStoragePort, StorageEntry, StoragePortStatus, SearchHit } from '@/services/storage-port';

export class InMemoryStoragePort implements JarvisStoragePort {
  kind: 'electron-file' | 'browser-folder' = 'browser-folder';
  private files = new Map<string, string>();
  private lastSaveId: SaveId | null = null;

  async status(): Promise<StoragePortStatus> {
    return { state: 'ready', folderName: 'playground-memory' };
  }

  async requestAccess(): Promise<StoragePortStatus> {
    return { state: 'ready', folderName: 'playground-memory' };
  }

  async readText(path: string): Promise<string | null> {
    return this.files.get(this.norm(path)) ?? null;
  }

  async writeText(path: string, content: string): Promise<void> {
    this.files.set(this.norm(path), content);
    this.ensureParentDirs(this.norm(path));
  }

  async list(path: string): Promise<StorageEntry[]> {
    const prefix = this.norm(path);
    const entries = new Map<string, StorageEntry>();

    for (const key of this.files.keys()) {
      if (key === prefix || !key.startsWith(prefix + '/')) continue;
      const relative = key.slice(prefix.length + 1);
      const firstSegment = relative.split('/')[0];
      if (!entries.has(firstSegment)) {
        const isDir = relative.includes('/');
        entries.set(firstSegment, { name: firstSegment, kind: isDir ? 'directory' : 'file' });
      }
    }

    return Array.from(entries.values());
  }

  async exists(path: string): Promise<boolean> {
    const norm = this.norm(path);
    if (this.files.has(norm)) return true;
    for (const key of this.files.keys()) {
      if (key.startsWith(norm + '/')) return true;
    }
    return false;
  }

  async delete(path: string): Promise<void> {
    const norm = this.norm(path);
    const keysToDelete: string[] = [];
    for (const key of this.files.keys()) {
      if (key === norm || key.startsWith(norm + '/')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => this.files.delete(k));
  }

  async searchText(path: string, query: string): Promise<SearchHit[]> {
    const prefix = this.norm(path);
    const hits: SearchHit[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [key, content] of this.files.entries()) {
      if (!key.startsWith(prefix)) continue;
      const lowerContent = content.toLowerCase();
      const idx = lowerContent.indexOf(lowerQuery);
      if (idx >= 0) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(content.length, idx + query.length + 40);
        hits.push({ path: key, snippet: content.slice(start, end) });
      }
    }

    return hits;
  }

  writeFile(path: string, content: string): void {
    this.files.set(this.norm(path), content);
  }

  getAllFiles(): Map<string, string> {
    return new Map(this.files);
  }

  async getLastSaveId(): Promise<SaveId | null> {
    return this.lastSaveId;
  }

  async setLastSaveId(saveId: SaveId | null): Promise<void> {
    this.lastSaveId = saveId;
  }

  async hasLegacyMigrationRun(): Promise<boolean> {
    return true;
  }

  async markLegacyMigrationRun(): Promise<void> {
    return undefined;
  }

  async rebind(): Promise<StoragePortStatus> {
    return this.requestAccess();
  }

  private norm(p: string): string {
    return p.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private ensureParentDirs(filePath: string): void {
    const parts = filePath.split('/');
    parts.pop();
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
    }
  }
}
