import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import {
  resolveAgentDir,
  resolveAgentRootFilePath,
  resolveAgentsRoot,
  resolveMemoriesDir,
  resolveMemoryFilePath,
  validateSaveId,
} from './path-guards.js';

const SAVES_DIR = path.join(app.getPath('userData'), 'saves');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEXT_FILE_EXTENSIONS = new Set(['.json', '.md', '.txt']);

const BUILTIN_PROXY_TARGETS: Record<string, string> = {
  // Coding Plan
  'zai': 'https://api.z.ai',
  'minimax-cn': 'https://api.minimaxi.com',
  'kimi-coding': 'https://api.kimi.com',
  'xiaomi-token-plan-cn': 'https://token-plan-cn.xiaomimimo.com',
  'opencode-go': 'https://opencode.ai',
  // API
  'anthropic': 'https://api.anthropic.com',
  'openai': 'https://api.openai.com',
  'deepseek': 'https://api.deepseek.com',
  'openrouter': 'https://openrouter.ai',
  'google': 'https://generativelanguage.googleapis.com',
};

function ensureSavesDir(): void {
  if (!fs.existsSync(SAVES_DIR)) {
    fs.mkdirSync(SAVES_DIR, { recursive: true });
  }
}

function resolveStoragePath(relativePath: string): string | null {
  const parts = relativePath
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.some((part) => part === '..' || part.includes('\\') || part.includes('/'))) {
    return null;
  }

  const normalizedParts = parts[0] === 'saves' ? parts.slice(1) : parts;
  const target = path.resolve(SAVES_DIR, ...normalizedParts);
  if (target !== SAVES_DIR && !target.startsWith(`${SAVES_DIR}${path.sep}`)) return null;
  return target;
}

function registerStorageIpc(): void {
  ipcMain.handle('storage:readText', async (_event, relativePath: string) => {
    const target = resolveStoragePath(relativePath);
    if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) return null;
    return fs.readFileSync(target, 'utf-8');
  });

  ipcMain.handle('storage:writeText', async (_event, relativePath: string, content: string, options?: { backup?: boolean }) => {
    const target = resolveStoragePath(relativePath);
    if (!target) return false;
    const dir = path.dirname(target);
    fs.mkdirSync(dir, { recursive: true });
    if (options?.backup && fs.existsSync(target)) {
      fs.copyFileSync(target, `${target}.bak`);
    }
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, content, 'utf-8');
    fs.renameSync(tmp, target);
    return true;
  });

  ipcMain.handle('storage:list', async (_event, relativePath: string) => {
    const target = resolveStoragePath(relativePath);
    if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) return [];
    return fs.readdirSync(target, { withFileTypes: true })
      .map((entry) => ({
        name: entry.name,
        kind: entry.isDirectory() ? 'directory' : 'file',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  ipcMain.handle('storage:exists', async (_event, relativePath: string) => {
    const target = resolveStoragePath(relativePath);
    return !!target && fs.existsSync(target);
  });

  ipcMain.handle('storage:delete', async (_event, relativePath: string) => {
    const target = resolveStoragePath(relativePath);
    if (!target || !fs.existsSync(target)) return true;
    fs.rmSync(target, { recursive: true, force: true });
    return true;
  });

  ipcMain.handle('storage:searchText', async (_event, relativePath: string, query: string) => {
    const target = resolveStoragePath(relativePath);
    if (!target || !fs.existsSync(target) || !query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    const hits: { path: string; snippet: string }[] = [];

    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (!TEXT_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
        const text = fs.readFileSync(fullPath, 'utf-8');
        const idx = text.toLowerCase().indexOf(lowerQuery);
        if (idx !== -1) {
          const rel = path.relative(SAVES_DIR, fullPath).replace(/\\/g, '/');
          hits.push({
            path: `saves/${rel}`,
            snippet: text.slice(Math.max(0, idx - 50), Math.min(text.length, idx + 120)),
          });
        }
      }
    }

    if (fs.statSync(target).isDirectory()) {
      walk(target);
    } else if (fs.statSync(target).isFile()) {
      const text = fs.readFileSync(target, 'utf-8');
      const idx = text.toLowerCase().indexOf(lowerQuery);
      if (idx !== -1) {
        const rel = path.relative(SAVES_DIR, target).replace(/\\/g, '/');
        hits.push({
          path: `saves/${rel}`,
          snippet: text.slice(Math.max(0, idx - 50), Math.min(text.length, idx + 120)),
        });
      }
    }

    return hits;
  });
}

interface SaveMeta {
  saveId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  currentMonth: number;
  aiName: string;
  playerName: string;
}

function extractMeta(bundle: Record<string, unknown>, saveId: string): SaveMeta {
  const game = bundle.game as Record<string, unknown> | undefined;
  return {
    saveId,
    name: `${(game?.aiName as string) ?? '小星'} - ${(game?.currentMonth as number) ?? 1}月`,
    createdAt: bundle.savedAt as number ?? Date.now(),
    updatedAt: bundle.savedAt as number ?? Date.now(),
    currentMonth: (game?.currentMonth as number) ?? 1,
    aiName: (game?.aiName as string) ?? '小星',
    playerName: (game?.player as Record<string, unknown> | undefined)?.name as string ?? '',
  };
}

function saveDir(saveId: string): string {
  return path.join(SAVES_DIR, saveId);
}

function saveBundlePath(saveId: string): string {
  return path.join(saveDir(saveId), 'game-state.json');
}

function registerSaveIpc(): void {
  registerStorageIpc();

  ipcMain.handle('save:list', async () => {
    ensureSavesDir();
    const entries = fs.readdirSync(SAVES_DIR, { withFileTypes: true });
    const metas: SaveMeta[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!validateSaveId(entry.name)) continue;
      const bundlePath = saveBundlePath(entry.name);
      if (!fs.existsSync(bundlePath)) continue;
      try {
        const raw = fs.readFileSync(bundlePath, 'utf-8');
        const bundle = JSON.parse(raw) as Record<string, unknown>;
        metas.push(extractMeta(bundle, entry.name));
      } catch { /* skip corrupt */ }
    }
    return metas.sort((a, b) => b.updatedAt - a.updatedAt);
  });

  ipcMain.handle('save:load', async (_event, saveId: string) => {
    if (!validateSaveId(saveId)) return null;
    const bundlePath = saveBundlePath(saveId);
    if (!fs.existsSync(bundlePath)) return null;
    try {
      const raw = fs.readFileSync(bundlePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  ipcMain.handle('save:write', async (_event, saveId: string, bundle: Record<string, unknown>) => {
    if (!validateSaveId(saveId)) return false;
    ensureSavesDir();
    const dir = saveDir(saveId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const target = saveBundlePath(saveId);
    const tmp = target + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(bundle), 'utf-8');
    fs.renameSync(tmp, target);
    return true;
  });

  ipcMain.handle('save:delete', async (_event, saveId: string) => {
    if (!validateSaveId(saveId)) return false;
    const dir = saveDir(saveId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return true;
  });

  // Memory file handlers
  registerMemoryIpc();

}

// === Memory File Service ===

function registerBuiltinIpc(): void {
  ipcMain.handle('builtin:getConfig', async () => {
    const apiKey = process.env.BUILTIN_API_KEY;
    if (!apiKey) {
      return { available: false, provider: '', modelId: '', displayName: '', displayModelName: '', apiKey: '', baseURL: '' };
    }
    const provider = process.env.BUILTIN_PROVIDER || 'anthropic';
    const modelId = process.env.BUILTIN_MODEL_ID || 'claude-sonnet-4-6';
    const baseURL = process.env.BUILTIN_BASE_URL || BUILTIN_PROXY_TARGETS[provider] || 'https://api.anthropic.com';
    return {
      available: true,
      provider,
      modelId,
      displayName: process.env.BUILTIN_DISPLAY_NAME || '内置 AI',
      displayModelName: process.env.BUILTIN_MODEL_DISPLAY || '内置 AI',
      apiKey,
      baseURL,
    };
  });
}

const ALLOWED_MEMORY_EXTENSIONS = ['.md'];
const MAX_MEMORY_FILE_SIZE = 100 * 1024; // 100 KB per file

function resolveMemoryPath(saveId: string, role: string, filename: string): string | null {
  return resolveMemoryFilePath(SAVES_DIR, saveId, role, filename);
}

function resolveAgentFilePath(saveId: string, role: string, filename: string): string | null {
  return resolveAgentRootFilePath(SAVES_DIR, saveId, role, filename);
}

function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const meta: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    try {
      meta[key] = JSON.parse(val);
    } catch {
      meta[key] = val;
    }
  }
  return meta;
}

function atomicWrite(targetPath: string, content: string): void {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Backup existing file
  if (fs.existsSync(targetPath)) {
    const backup = targetPath + '.bak';
    fs.copyFileSync(targetPath, backup);
  }
  const tmp = targetPath + '.tmp';
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, targetPath);
}

function registerMemoryIpc(): void {
  // Read a memory file (agent root or memories subdir)
  ipcMain.handle('memory:read', async (_event, saveId: string, role: string, filename: string) => {
    // Try memories/ subdir first, then agent root
    let filePath = resolveMemoryPath(saveId, role, filename);
    if (filePath && fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    filePath = resolveAgentFilePath(saveId, role, filename);
    if (filePath && fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  });

  // Write a memory file
  ipcMain.handle('memory:write', async (_event, saveId: string, role: string, filename: string, content: string) => {
    if (content.length > MAX_MEMORY_FILE_SIZE) {
      return { error: 'File exceeds maximum size limit' };
    }
    const ext = path.extname(filename);
    if (!ALLOWED_MEMORY_EXTENSIONS.includes(ext)) {
      return { error: 'Only .md files are allowed' };
    }

    // Validate frontmatter if present
    if (content.startsWith('---')) {
      const meta = parseFrontmatter(content);
      if (meta) {
        if (meta.save_id && meta.save_id !== saveId) {
          return { error: 'save_id in frontmatter does not match current save' };
        }
        if (meta.role && meta.role !== role) {
          return { error: 'role in frontmatter does not match current agent role' };
        }
      }
    }

    // Determine write path: memories/ subdir for numbered files, agent root for identity/soul/user
    const rootFiles = ['identity.md', 'soul.md', 'user.md'];
    let filePath: string | null;
    if (rootFiles.includes(filename)) {
      filePath = resolveAgentFilePath(saveId, role, filename);
    } else {
      filePath = resolveMemoryPath(saveId, role, filename);
    }

    if (!filePath) {
      return { error: 'Invalid path' };
    }

    try {
      atomicWrite(filePath, content);
      return { ok: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // List memory files for an agent
  ipcMain.handle('memory:list', async (_event, saveId: string, role: string) => {
    const base = resolveAgentDir(SAVES_DIR, saveId, role);
    if (!base) return { root: [], memories: [] };
    if (!fs.existsSync(base)) return { root: [], memories: [] };

    const rootFiles: string[] = [];
    for (const f of fs.readdirSync(base)) {
      if (f.endsWith('.md') && fs.statSync(path.join(base, f)).isFile()) {
        rootFiles.push(f);
      }
    }

    const memDir = resolveMemoriesDir(SAVES_DIR, saveId, role);
    const memoryFiles: string[] = [];
    if (memDir && fs.existsSync(memDir)) {
      for (const f of fs.readdirSync(memDir)) {
        if (f.endsWith('.md') && fs.statSync(path.join(memDir, f)).isFile()) {
          memoryFiles.push(f);
        }
      }
    }

    return { root: rootFiles, memories: memoryFiles };
  });

  // Search memory files (simple keyword search within agent directory)
  ipcMain.handle('memory:search', async (_event, saveId: string, role: string, query: string) => {
    const base = resolveAgentDir(SAVES_DIR, saveId, role);
    if (!base) return [];
    if (!fs.existsSync(base)) return [];

    const results: { filename: string; snippet: string }[] = [];
    const lowerQuery = query.toLowerCase();

    function searchDir(dir: string): void {
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, f);
        if (!fs.statSync(fullPath).isFile() || !f.endsWith('.md')) continue;
        try {
          const content = fs.readFileSync(fullPath, 'utf-8').toLowerCase();
          const idx = content.indexOf(lowerQuery);
          if (idx !== -1) {
            const snippet = content.slice(Math.max(0, idx - 50), Math.min(content.length, idx + 100));
            results.push({ filename: f, snippet });
          }
        } catch { /* skip unreadable */ }
      }
    }

    searchDir(base);
    const memDir = resolveMemoriesDir(SAVES_DIR, saveId, role);
    if (memDir) searchDir(memDir);
    return results;
  });

  // Delete all memory files for a save (called when save is deleted)
  ipcMain.handle('memory:clearSave', async (_event, saveId: string) => {
    const savePath = resolveAgentsRoot(SAVES_DIR, saveId);
    if (!savePath) return false;
    if (fs.existsSync(savePath)) {
      fs.rmSync(savePath, { recursive: true, force: true });
    }
    return true;
  });
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Jarvis Life',
    resizable: true,
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:5173' : '');

  // Dev: load Vite dev server
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    // Prod: load bundled index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerBuiltinIpc();
  registerSaveIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
