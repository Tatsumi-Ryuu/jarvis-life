import {
  err,
  FileError,
  ExecutionError,
  ok,
  type ExecutionEnv,
  type FileErrorCode,
  type FileInfo,
  type Result,
} from '@earendil-works/pi-agent-core';
import { getStoragePort, type JarvisStoragePort } from '../../../services/storage-port';

function normalizeParts(path: string): string[] {
  const parts = path
    .replaceAll('\\', '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== '.');

  for (const part of parts) {
    if (part === '..' || part.includes('/')) {
      throw new FileError('invalid', `Invalid path segment: ${part}`, path);
    }
  }

  return parts;
}

function normalizePath(path: string): string {
  if (path === '/' || path.trim() === '') return '/';
  return `/${normalizeParts(path).join('/')}`;
}

function portPath(path: string): string {
  return normalizePath(path).replace(/^\//, '');
}

function basename(path: string): string {
  return normalizeParts(path).at(-1) ?? '';
}

function toFileError(error: unknown, path?: string, code: FileErrorCode = 'unknown'): FileError {
  if (error instanceof FileError) return error;
  return new FileError(code, error instanceof Error ? error.message : String(error), path);
}

async function wrap<T>(
  path: string | undefined,
  fn: () => Promise<T>,
): Promise<Result<T, FileError>> {
  try {
    return ok<T, FileError>(await fn());
  } catch (error) {
    return err<T, FileError>(toFileError(error, path));
  }
}

export class StoragePortExecutionEnv implements ExecutionEnv {
  readonly cwd = '/';
  private readonly port: JarvisStoragePort;

  constructor(port: JarvisStoragePort = getStoragePort()) {
    this.port = port;
  }

  async absolutePath(path: string): Promise<Result<string, FileError>> {
    return wrap(path, async () => normalizePath(path));
  }

  async joinPath(parts: string[]): Promise<Result<string, FileError>> {
    return wrap(undefined, async () => normalizePath(parts.join('/')));
  }

  async readTextFile(path: string): Promise<Result<string, FileError>> {
    return wrap(path, async () => {
      const content = await this.port.readText(portPath(path));
      if (content === null) {
        throw new FileError('not_found', `File not found: ${path}`, normalizePath(path));
      }
      return content;
    });
  }

  async readTextLines(path: string, options?: { maxLines?: number }): Promise<Result<string[], FileError>> {
    return wrap(path, async () => {
      const content = await this.port.readText(portPath(path));
      if (content === null) {
        throw new FileError('not_found', `File not found: ${path}`, normalizePath(path));
      }
      const lines = content.split(/\r?\n/);
      return typeof options?.maxLines === 'number' ? lines.slice(0, options.maxLines) : lines;
    });
  }

  async readBinaryFile(path: string): Promise<Result<Uint8Array, FileError>> {
    return wrap(path, async () => {
      const content = await this.port.readText(portPath(path));
      if (content === null) {
        throw new FileError('not_found', `File not found: ${path}`, normalizePath(path));
      }
      return new TextEncoder().encode(content);
    });
  }

  async writeFile(path: string, content: string | Uint8Array): Promise<Result<void, FileError>> {
    return wrap(path, async () => {
      const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
      await this.port.writeText(portPath(path), text);
    });
  }

  async appendFile(path: string, content: string | Uint8Array): Promise<Result<void, FileError>> {
    return wrap(path, async () => {
      const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
      const existing = await this.port.readText(portPath(path));
      await this.port.writeText(portPath(path), `${existing ?? ''}${text}`);
    });
  }

  async fileInfo(path: string): Promise<Result<FileInfo, FileError>> {
    return wrap(path, async () => {
      const absolute = normalizePath(path);
      const name = basename(absolute) || '/';
      const asFile = await this.port.readText(portPath(absolute));
      if (asFile !== null) {
        return {
          name,
          path: absolute,
          kind: 'file',
          size: new TextEncoder().encode(asFile).byteLength,
          mtimeMs: 0,
        };
      }

      const exists = await this.port.exists(portPath(absolute));
      if (!exists) {
        throw new FileError('not_found', `Path not found: ${path}`, absolute);
      }

      return { name, path: absolute, kind: 'directory', size: 0, mtimeMs: 0 };
    });
  }

  async listDir(path: string): Promise<Result<FileInfo[], FileError>> {
    return wrap(path, async () => {
      const absolute = normalizePath(path);
      const entries = await this.port.list(portPath(absolute));
      return entries.map((entry) => ({
        name: entry.name,
        path: normalizePath(`${absolute}/${entry.name}`),
        kind: entry.kind,
        size: 0,
        mtimeMs: 0,
      }));
    });
  }

  async canonicalPath(path: string): Promise<Result<string, FileError>> {
    return this.absolutePath(path);
  }

  async exists(path: string): Promise<Result<boolean, FileError>> {
    return wrap(path, async () => this.port.exists(portPath(path)));
  }

  async createDir(path: string): Promise<Result<void, FileError>> {
    return wrap(path, async () => {
      const marker = normalizePath(`${path}/.keep`);
      await this.port.writeText(portPath(marker), '');
      await this.port.delete(portPath(marker));
    });
  }

  async remove(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<Result<void, FileError>> {
    return wrap(path, async () => {
      if (!options?.force && !await this.port.exists(portPath(path))) {
        throw new FileError('not_found', `Path not found: ${path}`, normalizePath(path));
      }
      await this.port.delete(portPath(path));
    });
  }

  async createTempDir(prefix = 'tmp-'): Promise<Result<string, FileError>> {
    return wrap(undefined, async () => {
      const path = `/tmp/${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const marker = `${path}/.keep`;
      await this.port.writeText(portPath(marker), '');
      await this.port.delete(portPath(marker));
      return path;
    });
  }

  async createTempFile(options?: { prefix?: string; suffix?: string }): Promise<Result<string, FileError>> {
    return wrap(undefined, async () => {
      const path = `/tmp/${options?.prefix ?? ''}${Date.now()}-${Math.random().toString(36).slice(2, 8)}${options?.suffix ?? ''}`;
      await this.port.writeText(portPath(path), '');
      return path;
    });
  }

  async cleanup(): Promise<void> {
    return undefined;
  }

  async exec(): Promise<Result<{ stdout: string; stderr: string; exitCode: number }, ExecutionError>> {
    return err(new ExecutionError('shell_unavailable', 'Shell execution is not supported in game AI agents.'));
  }
}

export function getStoragePortExecutionEnv(): StoragePortExecutionEnv {
  return new StoragePortExecutionEnv();
}
