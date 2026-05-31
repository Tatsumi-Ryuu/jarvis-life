import type { SaveId } from '../types';
import { isElectron } from './electron-save-storage';

export type StoragePortStatus =
  | { state: 'ready'; folderName?: string }
  | { state: 'needs-binding' }
  | { state: 'needs-permission'; folderName?: string }
  | { state: 'unavailable'; reason: string };

export interface StorageEntry {
  name: string;
  kind: 'file' | 'directory';
}

export interface SearchHit {
  path: string;
  snippet: string;
}

export interface JarvisStoragePort {
  kind: 'electron-file' | 'browser-folder';
  status(): Promise<StoragePortStatus>;
  requestAccess(): Promise<StoragePortStatus>;
  readText(path: string): Promise<string | null>;
  writeText(path: string, content: string, options?: { backup?: boolean }): Promise<void>;
  list(path: string): Promise<StorageEntry[]>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  searchText(path: string, query: string): Promise<SearchHit[]>;
}

export interface BrowserStorageControls {
  rebind(): Promise<StoragePortStatus>;
}

type FileSystemPermissionMode = 'read' | 'readwrite';
type FileSystemHandleKind = 'file' | 'directory';

interface FileSystemHandlePermissionDescriptor {
  mode?: FileSystemPermissionMode;
}

interface FileSystemHandle {
  readonly kind: FileSystemHandleKind;
  readonly name: string;
  queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory';
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  values(): AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: FileSystemPermissionMode }) => Promise<FileSystemDirectoryHandle>;
  }
}

const DB_NAME = 'jarvis-life-storage';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const ROOT_HANDLE_KEY = 'root';
const LAST_SAVE_KEY = 'last-save-id';
const LEGACY_MIGRATION_KEY_PREFIX = 'legacy-migration-v2';
const DATA_FOLDER_CANDIDATES = ['JarvisData', 'JarvisLife'];

const TEXT_FILE_EXTENSIONS = new Set(['.json', '.md', '.txt']);

function normalizePath(path: string): string[] {
  return path
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== '.');
}

function validateParts(parts: string[]): void {
  for (const part of parts) {
    if (part === '..' || part.includes('\\') || part.includes('/')) {
      throw new Error(`Invalid storage path segment: ${part}`);
    }
  }
}

function fileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
  });
  db.close();
}

async function idbDelete(key: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'));
  });
  db.close();
}

async function ensurePermission(handle: FileSystemDirectoryHandle, request = false): Promise<boolean> {
  const descriptor = { mode: 'readwrite' as const };
  if (handle.queryPermission) {
    const current = await handle.queryPermission(descriptor);
    if (current === 'granted') return true;
  }
  if (request && handle.requestPermission) {
    return (await handle.requestPermission(descriptor)) === 'granted';
  }
  return false;
}

async function getDirectory(
  root: FileSystemDirectoryHandle,
  parts: string[],
  options: { create?: boolean } = {},
): Promise<FileSystemDirectoryHandle> {
  validateParts(parts);
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, options);
  }
  return dir;
}

async function tryGetDirectory(
  root: FileSystemDirectoryHandle,
  parts: string[],
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await getDirectory(root, parts);
  } catch {
    return null;
  }
}

async function getParentDirectory(
  root: FileSystemDirectoryHandle,
  path: string,
  options: { create?: boolean } = {},
): Promise<{ dir: FileSystemDirectoryHandle; name: string }> {
  const parts = normalizePath(path);
  if (parts.length === 0) throw new Error('Path must point to a file or directory');
  validateParts(parts);
  const name = parts[parts.length - 1];
  const dir = await getDirectory(root, parts.slice(0, -1), options);
  return { dir, name };
}

async function getPathHandle(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle | FileSystemFileHandle | null> {
  const parts = normalizePath(path);
  if (parts.length === 0) return root;
  const parent = await getParentDirectory(root, path).catch(() => null);
  if (!parent) return null;
  const { dir, name } = parent;
  try {
    return await dir.getFileHandle(name);
  } catch {
    try {
      return await dir.getDirectoryHandle(name);
    } catch {
      return null;
    }
  }
}

async function readFileIfExists(root: FileSystemDirectoryHandle, path: string): Promise<string | null> {
  try {
    const { dir, name } = await getParentDirectory(root, path);
    const file = await dir.getFileHandle(name);
    return await (await file.getFile()).text();
  } catch {
    return null;
  }
}

async function writeFile(
  root: FileSystemDirectoryHandle,
  path: string,
  content: string,
  options: { backup?: boolean } = {},
): Promise<void> {
  const { dir, name } = await getParentDirectory(root, path, { create: true });
  if (options.backup) {
    try {
      const existing = await dir.getFileHandle(name);
      const existingText = await (await existing.getFile()).text();
      const backup = await dir.getFileHandle(`${name}.bak`, { create: true });
      const backupWriter = await backup.createWritable();
      await backupWriter.write(existingText);
      await backupWriter.close();
    } catch {
      // No existing file to back up.
    }
  }
  const file = await dir.getFileHandle(name, { create: true });
  const writer = await file.createWritable();
  await writer.write(content);
  await writer.close();
}

async function searchDirectory(
  root: FileSystemDirectoryHandle,
  basePath: string,
  query: string,
): Promise<SearchHit[]> {
  const dir = await getDirectory(root, normalizePath(basePath));
  const hits: SearchHit[] = [];
  const lowerQuery = query.toLowerCase();

  async function walk(current: FileSystemDirectoryHandle, prefix: string): Promise<void> {
    for await (const handle of current.values()) {
      const childPath = prefix ? `${prefix}/${handle.name}` : handle.name;
      if (handle.kind === 'directory') {
        await walk(handle, childPath);
        continue;
      }
      if (!TEXT_FILE_EXTENSIONS.has(fileExtension(handle.name))) continue;
      const text = await (await handle.getFile()).text();
      const lower = text.toLowerCase();
      const idx = lower.indexOf(lowerQuery);
      if (idx !== -1) {
        hits.push({
          path: childPath,
          snippet: text.slice(Math.max(0, idx - 50), Math.min(text.length, idx + 120)),
        });
      }
    }
  }

  await walk(dir, normalizePath(basePath).join('/'));
  return hits;
}

class BrowserFolderStoragePort implements JarvisStoragePort {
  readonly kind = 'browser-folder' as const;
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private dataRootHandle: FileSystemDirectoryHandle | null = null;

  async status(): Promise<StoragePortStatus> {
    if (typeof window === 'undefined') {
      return { state: 'unavailable', reason: '当前运行环境没有浏览器文件夹访问能力。' };
    }
    if (!window.showDirectoryPicker) {
      return { state: 'unavailable', reason: '当前浏览器不支持本地文件夹存档，请使用 Chrome 或 Edge。' };
    }
    const handle = await this.getRootHandle();
    if (!handle) return { state: 'needs-binding' };
    return (await ensurePermission(handle))
      ? { state: 'ready', folderName: handle.name }
      : { state: 'needs-permission', folderName: handle.name };
  }

  async requestAccess(): Promise<StoragePortStatus> {
    if (typeof window === 'undefined') {
      return { state: 'unavailable', reason: '当前运行环境没有浏览器文件夹访问能力。' };
    }
    if (!window.showDirectoryPicker) {
      return { state: 'unavailable', reason: '当前浏览器不支持本地文件夹存档，请使用 Chrome 或 Edge。' };
    }

    const existing = await this.getRootHandle();
    if (existing && await ensurePermission(existing, true)) {
      this.dataRootHandle = await initializeRoot(existing);
      return { state: 'ready', folderName: existing.name };
    }

    try {
      const selected = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (!await ensurePermission(selected, true)) {
        return { state: 'needs-permission' };
      }
      this.rootHandle = selected;
      this.dataRootHandle = null;
      await idbSet(ROOT_HANDLE_KEY, selected);
      this.dataRootHandle = await initializeRoot(selected);
      if (navigator.storage?.persist) {
        await navigator.storage.persist().catch(() => false);
      }
      return { state: 'ready', folderName: selected.name };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { state: 'needs-binding' };
      }
      return { state: 'unavailable', reason: error instanceof Error ? error.message : '无法访问本地存档文件夹。' };
    }
  }

  async rebind(): Promise<StoragePortStatus> {
    if (typeof window === 'undefined') {
      return { state: 'unavailable', reason: '当前运行环境没有浏览器文件夹访问能力。' };
    }
    if (!window.showDirectoryPicker) {
      return { state: 'unavailable', reason: '当前浏览器不支持本地文件夹存档，请使用 Chrome 或 Edge。' };
    }

    try {
      const selected = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (!await ensurePermission(selected, true)) {
        return { state: 'needs-permission' };
      }
      const dataRoot = await initializeRoot(selected);
      this.rootHandle = selected;
      this.dataRootHandle = dataRoot;
      await idbSet(ROOT_HANDLE_KEY, selected);
      await idbDelete(LAST_SAVE_KEY);
      if (navigator.storage?.persist) {
        await navigator.storage.persist().catch(() => false);
      }
      return { state: 'ready', folderName: selected.name };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return this.status();
      }
      return { state: 'unavailable', reason: error instanceof Error ? error.message : '无法访问本地存档文件夹。' };
    }
  }

  async readText(path: string): Promise<string | null> {
    return readFileIfExists(await this.requireReadyDataRoot(), path);
  }

  async writeText(path: string, content: string, options?: { backup?: boolean }): Promise<void> {
    await writeFile(await this.requireReadyDataRoot(), path, content, options);
  }

  async list(path: string): Promise<StorageEntry[]> {
    const dir = await getDirectory(await this.requireReadyDataRoot(), normalizePath(path));
    const entries: StorageEntry[] = [];
    for await (const handle of dir.values()) {
      entries.push({ name: handle.name, kind: handle.kind });
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  async exists(path: string): Promise<boolean> {
    return (await getPathHandle(await this.requireReadyDataRoot(), path)) !== null;
  }

  async delete(path: string): Promise<void> {
    const { dir, name } = await getParentDirectory(await this.requireReadyDataRoot(), path);
    await dir.removeEntry(name, { recursive: true }).catch(() => undefined);
  }

  async searchText(path: string, query: string): Promise<SearchHit[]> {
    if (!query.trim()) return [];
    return searchDirectory(await this.requireReadyDataRoot(), path, query);
  }

  async getLastSaveId(): Promise<SaveId | null> {
    return idbGet<SaveId>(LAST_SAVE_KEY);
  }

  async setLastSaveId(saveId: SaveId | null): Promise<void> {
    if (saveId) await idbSet(LAST_SAVE_KEY, saveId);
    else await idbDelete(LAST_SAVE_KEY);
  }

  async hasLegacyMigrationRun(): Promise<boolean> {
    return (await idbGet<boolean>(await this.legacyMigrationKey())) === true;
  }

  async markLegacyMigrationRun(): Promise<void> {
    await idbSet(await this.legacyMigrationKey(), true);
  }

  private async getRootHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (this.rootHandle) return this.rootHandle;
    this.rootHandle = await idbGet<FileSystemDirectoryHandle>(ROOT_HANDLE_KEY);
    return this.rootHandle;
  }

  private async requireReadyRoot(): Promise<FileSystemDirectoryHandle> {
    const handle = await this.getRootHandle();
    if (!handle) throw new Error('网页端尚未绑定本地存档文件夹。');
    if (!await ensurePermission(handle, true)) {
      throw new Error('网页端本地存档文件夹权限已失效，请重新连接。');
    }
    return handle;
  }

  private async requireReadyDataRoot(): Promise<FileSystemDirectoryHandle> {
    if (this.dataRootHandle) return this.dataRootHandle;
    const root = await this.requireReadyRoot();
    this.dataRootHandle = await initializeRoot(root);
    return this.dataRootHandle;
  }

  private async legacyMigrationKey(): Promise<string> {
    const root = await this.getRootHandle();
    const dataRoot = this.dataRootHandle ?? (root ? await initializeRoot(root) : null);
    return `${LEGACY_MIGRATION_KEY_PREFIX}:${root?.name ?? 'unbound'}:${dataRoot?.name ?? 'root'}`;
  }
}

class ElectronFileStoragePort implements JarvisStoragePort {
  readonly kind = 'electron-file' as const;

  async status(): Promise<StoragePortStatus> {
    return window.jarvis?.storage
      ? { state: 'ready', folderName: '应用数据目录' }
      : { state: 'unavailable', reason: 'Electron storage IPC is unavailable.' };
  }

  async requestAccess(): Promise<StoragePortStatus> {
    return this.status();
  }

  async readText(path: string): Promise<string | null> {
    return window.jarvis!.storage.readText(path);
  }

  async writeText(path: string, content: string, options?: { backup?: boolean }): Promise<void> {
    await window.jarvis!.storage.writeText(path, content, options);
  }

  async list(path: string): Promise<StorageEntry[]> {
    return window.jarvis!.storage.list(path);
  }

  async exists(path: string): Promise<boolean> {
    return window.jarvis!.storage.exists(path);
  }

  async delete(path: string): Promise<void> {
    await window.jarvis!.storage.delete(path);
  }

  async searchText(path: string, query: string): Promise<SearchHit[]> {
    return window.jarvis!.storage.searchText(path, query);
  }
}

async function initializeRoot(root: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  if (await tryGetDirectory(root, ['saves'])) {
    return root;
  }

  for (const folderName of DATA_FOLDER_CANDIDATES) {
    const candidate = await tryGetDirectory(root, [folderName]);
    if (candidate && await tryGetDirectory(candidate, ['saves'])) {
      return candidate;
    }
  }

  if (DATA_FOLDER_CANDIDATES.includes(root.name)) {
    await root.getDirectoryHandle('saves', { create: true });
    return root;
  }

  const dataRoot = await root.getDirectoryHandle(DATA_FOLDER_CANDIDATES[0], { create: true });
  await dataRoot.getDirectoryHandle('saves', { create: true });
  return dataRoot;
}

let singletonPort: JarvisStoragePort | null = null;

export function getStoragePort(): JarvisStoragePort {
  if (!singletonPort) {
    singletonPort = isElectron() ? new ElectronFileStoragePort() : new BrowserFolderStoragePort();
  }
  return singletonPort;
}

export function setStoragePort(port: JarvisStoragePort): void {
  singletonPort = port;
}

export function isBrowserFolderPort(port: JarvisStoragePort): port is BrowserFolderStoragePort {
  return port.kind === 'browser-folder';
}

export async function getLastBrowserSaveId(): Promise<SaveId | null> {
  const port = getStoragePort();
  return isBrowserFolderPort(port) ? port.getLastSaveId() : null;
}

export async function setLastBrowserSaveId(saveId: SaveId | null): Promise<void> {
  const port = getStoragePort();
  if (isBrowserFolderPort(port)) {
    await port.setLastSaveId(saveId);
  }
}

export async function hasBrowserLegacyMigrationRun(): Promise<boolean> {
  const port = getStoragePort();
  return isBrowserFolderPort(port) ? port.hasLegacyMigrationRun() : true;
}

export async function markBrowserLegacyMigrationRun(): Promise<void> {
  const port = getStoragePort();
  if (isBrowserFolderPort(port)) {
    await port.markLegacyMigrationRun();
  }
}

export async function rebindBrowserFolder(): Promise<StoragePortStatus> {
  const port = getStoragePort();
  if (!isBrowserFolderPort(port)) return port.status();
  return port.rebind();
}
