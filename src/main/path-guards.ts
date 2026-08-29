import * as path from 'node:path';

const VALID_AGENT_ROLES = new Set(['companion', 'evaluator', 'narrator', 'opponent']);

export function validateSaveId(saveId: string): boolean {
  return /^save-[a-zA-Z0-9_-]+$/.test(saveId);
}

export function validateAgentRole(role: string): boolean {
  return VALID_AGENT_ROLES.has(role);
}

export function sanitizeMemoryFilename(name: string): boolean {
  return /^[a-zA-Z0-9_-]+\.md$/.test(name) && !name.includes('..');
}

export function isWithinDir(baseDir: string, candidatePath: string): boolean {
  const base = path.resolve(baseDir);
  const candidate = path.resolve(candidatePath);
  return candidate === base || candidate.startsWith(`${base}${path.sep}`);
}

export function resolveStoragePath(
  savesDir: string,
  relativePath: string,
  options: { allowRoot?: boolean } = {},
): string | null {
  if (typeof relativePath !== 'string') return null;

  const parts = relativePath
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.some((part) => (
    part === '.'
    || part === '..'
    || part.includes('\\')
    || part.includes('/')
    || part.includes(':')
    || part.includes('\0')
  ))) {
    return null;
  }

  const normalizedParts = parts[0] === 'saves' ? parts.slice(1) : parts;
  const root = path.resolve(savesDir);
  const target = path.resolve(root, ...normalizedParts);
  if (!isWithinDir(root, target)) return null;
  if (target === root && options.allowRoot === false) return null;
  return target;
}

export function resolveAgentsRoot(savesDir: string, saveId: string): string | null {
  if (!validateSaveId(saveId)) return null;
  const root = path.resolve(savesDir);
  const resolved = path.resolve(root, saveId, 'agents');
  return isWithinDir(root, resolved) ? resolved : null;
}

export function resolveAgentDir(savesDir: string, saveId: string, role: string): string | null {
  if (!validateAgentRole(role)) return null;
  const agentsRoot = resolveAgentsRoot(savesDir, saveId);
  if (!agentsRoot) return null;
  const resolved = path.resolve(agentsRoot, role);
  return isWithinDir(agentsRoot, resolved) ? resolved : null;
}

export function resolveMemoriesDir(savesDir: string, saveId: string, role: string): string | null {
  const agentDir = resolveAgentDir(savesDir, saveId, role);
  if (!agentDir) return null;
  const resolved = path.resolve(agentDir, 'memories');
  return isWithinDir(agentDir, resolved) ? resolved : null;
}

export function resolveMemoryFilePath(
  savesDir: string,
  saveId: string,
  role: string,
  filename: string,
): string | null {
  if (!sanitizeMemoryFilename(filename)) return null;
  const memoriesDir = resolveMemoriesDir(savesDir, saveId, role);
  if (!memoriesDir) return null;
  const resolved = path.resolve(memoriesDir, filename);
  return isWithinDir(memoriesDir, resolved) ? resolved : null;
}

export function resolveAgentRootFilePath(
  savesDir: string,
  saveId: string,
  role: string,
  filename: string,
): string | null {
  if (!sanitizeMemoryFilename(filename)) return null;
  const agentDir = resolveAgentDir(savesDir, saveId, role);
  if (!agentDir) return null;
  const resolved = path.resolve(agentDir, filename);
  return isWithinDir(agentDir, resolved) ? resolved : null;
}
