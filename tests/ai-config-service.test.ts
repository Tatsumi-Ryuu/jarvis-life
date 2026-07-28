import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AI_CONFIG_STORAGE_KEY,
  DEFAULT_USER_AI_CONFIG,
  SECURE_CREDENTIAL_PLACEHOLDER,
  clearUserAIConfig,
  getActiveAIConfig,
  isAIConfigured,
  loadUserAIConfig,
  saveUserAIConfig,
} from '../src/services/ai-config-service';

describe('AI config service', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    vi.unstubAllGlobals();
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] ?? null,
    });
    clearUserAIConfig();
  });

  it('loads empty providers by default when nothing is saved', () => {
    expect(loadUserAIConfig()).toEqual(DEFAULT_USER_AI_CONFIG);
    expect(getActiveAIConfig()).toBeNull();
    expect(isAIConfigured()).toBe(false);
  });

  it('saves and loads a config with providers', () => {
    const result = saveUserAIConfig({
      providers: {
        'minimax-cn': { apiKey: 'user-key' },
      },
      models: {
        daily: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
        important: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
        critical: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
      },
    });

    if (!result.ok) throw new Error(result.error);

    expect(result.config.providers['minimax-cn'].apiKey).toBe('user-key');
    expect(loadUserAIConfig()).toEqual(result.config);
    expect(isAIConfigured()).toBe(true);
    expect(localStorage.getItem(AI_CONFIG_STORAGE_KEY)).not.toContain('user-key');
    expect(JSON.parse(localStorage.getItem(AI_CONFIG_STORAGE_KEY)!).providers['minimax-cn'].apiKey).toBe('');

    const active = getActiveAIConfig()!;
    expect(active.providers['minimax-cn'].apiKey).toBe('user-key');
    expect(active.models.daily.provider).toBe('minimax-cn');
  });

  it('rejects a provider without API key', () => {
    const result = saveUserAIConfig({
      providers: {
        'minimax-cn': { apiKey: '' },
      },
      models: {
        daily: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
        important: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
        critical: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
      },
    });

    expect(result.ok).toBe(false);
  });

  it('rejects non-local http API URLs', () => {
    const result = saveUserAIConfig({
      providers: {
        'minimax-cn': { apiKey: 'user-key', baseURL: 'http://api.example.com/anthropic' },
      },
      models: {
        daily: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
        important: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
        critical: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
      },
    });

    expect(result.ok).toBe(false);
    expect(localStorage.getItem(AI_CONFIG_STORAGE_KEY)).toBeNull();
  });

  it('allows valid base URLs', () => {
    for (const baseURL of [
      'http://localhost:3000/anthropic',
      'http://127.0.0.1:3000/anthropic',
      'https://api.example.com/anthropic',
    ]) {
      const result = saveUserAIConfig({
        providers: {
          'minimax-cn': { apiKey: 'user-key', baseURL },
        },
        models: {
          daily: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
          important: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
          critical: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
        },
      });
      expect(result.ok, `expected ${baseURL} to be valid`).toBe(true);
    }
  });

  it('clears saved AI config', () => {
    const result = saveUserAIConfig({
      providers: {
        'minimax-cn': { apiKey: 'user-key' },
      },
      models: {
        daily: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
        important: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
        critical: { provider: 'minimax-cn', modelId: 'MiniMax-M2.7' },
      },
    });
    expect(result.ok).toBe(true);

    const cleared = clearUserAIConfig();

    expect(cleared).toEqual(DEFAULT_USER_AI_CONFIG);
    expect(localStorage.getItem(AI_CONFIG_STORAGE_KEY)).toBeNull();
    expect(getActiveAIConfig()).toBeNull();
  });

  it('migrates legacy config with defaultModel', () => {
    const legacy = JSON.stringify({
      enabled: true,
      apiKey: 'legacy-key',
      baseURL: 'https://api.minimaxi.com/anthropic',
      defaultModel: 'MiniMax-M2.7',
    });
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, legacy);

    const loaded = loadUserAIConfig();
    expect(loaded.providers['minimax-cn']).toBeDefined();
    expect(loaded.providers['minimax-cn'].apiKey).toBe('legacy-key');
    expect(loaded.models.daily.provider).toBe('minimax-cn');
    expect(loaded.models.daily.modelId).toBe('MiniMax-M2.7');
    expect(localStorage.getItem(AI_CONFIG_STORAGE_KEY)).not.toContain('legacy-key');
  });

  it('migrates legacy config with claude model', () => {
    const legacy = JSON.stringify({
      enabled: true,
      apiKey: 'claude-key',
      baseURL: 'https://api.anthropic.com',
      defaultModel: 'claude-sonnet-4-6',
    });
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, legacy);

    const loaded = loadUserAIConfig();
    expect(loaded.providers['anthropic']).toBeDefined();
    expect(loaded.providers['anthropic'].apiKey).toBe('claude-key');
    expect(loaded.models.daily.provider).toBe('anthropic');
    expect(loaded.models.daily.modelId).toBe('claude-sonnet-4-6');
  });

  it('uses Electron secure storage and receives only a credential placeholder', () => {
    let savedConfig: Record<string, unknown> | null = null;
    vi.stubGlobal('window', {
      jarvis: {
        isElectron: true,
        aiConfig: {
          load: () => ({ ok: true, config: savedConfig }),
          save: (config: any) => {
            savedConfig = {
              ...config,
              providers: Object.fromEntries(
                Object.entries(config.providers).map(([name, credential]: [string, any]) => [
                  name,
                  { ...credential, apiKey: SECURE_CREDENTIAL_PLACEHOLDER },
                ]),
              ),
            };
            return { ok: true, config: savedConfig };
          },
          clear: () => {
            savedConfig = null;
            return { ok: true };
          },
        },
      },
    });

    const result = saveUserAIConfig({
      providers: {
        openai: { apiKey: 'sensitive-test-value' },
      },
      models: {
        daily: { provider: 'openai', modelId: 'gpt-4o' },
        important: { provider: 'openai', modelId: 'gpt-4o' },
        critical: { provider: 'openai', modelId: 'gpt-4o' },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.providers.openai.apiKey).toBe(SECURE_CREDENTIAL_PLACEHOLDER);
    expect(localStorage.getItem(AI_CONFIG_STORAGE_KEY)).toBeNull();
  });
});
