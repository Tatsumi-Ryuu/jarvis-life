import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  isWithinDir,
  resolveAgentDir,
  resolveAgentRootFilePath,
  resolveAgentsRoot,
  resolveMemoriesDir,
  resolveMemoryFilePath,
} from '../src/main/path-guards';

describe('Electron path guards', () => {
  const savesDir = path.resolve('/tmp/jarvis-life-saves');

  it('resolves valid save and agent memory paths inside the saves directory', () => {
    expect(resolveAgentsRoot(savesDir, 'save-alpha')).toBe(
      path.join(savesDir, 'save-alpha', 'agents'),
    );
    expect(resolveAgentDir(savesDir, 'save-alpha', 'companion')).toBe(
      path.join(savesDir, 'save-alpha', 'agents', 'companion'),
    );
    expect(resolveMemoriesDir(savesDir, 'save-alpha', 'companion')).toBe(
      path.join(savesDir, 'save-alpha', 'agents', 'companion', 'memories'),
    );
    expect(resolveMemoryFilePath(savesDir, 'save-alpha', 'companion', '0001.md')).toBe(
      path.join(savesDir, 'save-alpha', 'agents', 'companion', 'memories', '0001.md'),
    );
    expect(resolveAgentRootFilePath(savesDir, 'save-alpha', 'companion', 'identity.md')).toBe(
      path.join(savesDir, 'save-alpha', 'agents', 'companion', 'identity.md'),
    );
  });

  it('rejects traversal through save id, role, and filename inputs', () => {
    expect(resolveAgentsRoot(savesDir, '../save-alpha')).toBeNull();
    expect(resolveAgentsRoot(savesDir, 'save-alpha/../../outside')).toBeNull();
    expect(resolveAgentDir(savesDir, 'save-alpha', '../companion')).toBeNull();
    expect(resolveAgentDir(savesDir, 'save-alpha', 'admin')).toBeNull();
    expect(resolveMemoryFilePath(savesDir, 'save-alpha', 'companion', '../0001.md')).toBeNull();
    expect(resolveMemoryFilePath(savesDir, 'save-alpha', 'companion', '0001.txt')).toBeNull();
    expect(resolveAgentRootFilePath(savesDir, 'save-alpha', 'companion', '/tmp/evil.md')).toBeNull();
  });

  it('does not treat sibling directories with the same prefix as contained paths', () => {
    expect(isWithinDir('/tmp/saves', '/tmp/saves/file.md')).toBe(true);
    expect(isWithinDir('/tmp/saves', '/tmp/saves')).toBe(true);
    expect(isWithinDir('/tmp/saves', '/tmp/saves2/file.md')).toBe(false);
  });
});
