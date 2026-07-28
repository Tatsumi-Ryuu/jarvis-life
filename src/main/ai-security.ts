import { safeStorage } from 'electron';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';

export const SECURE_CREDENTIAL_PLACEHOLDER = '__JARVIS_SECURE_CREDENTIAL__';

interface ProviderCredential {
  apiKey: string;
  baseURL?: string;
  customModelId?: string;
}

interface ModelSelection {
  provider: string;
  modelId: string;
  displayName?: string;
}

export interface SecureAIConfig {
  providers: Record<string, ProviderCredential>;
  models: {
    daily: ModelSelection;
    important: ModelSelection;
    critical: ModelSelection;
  };
}

export interface AIProxyInfo {
  baseURL: string;
  token: string;
}

const PROVIDER_TARGETS: Record<string, string> = {
  zai: 'https://api.z.ai',
  'minimax-cn': 'https://api.minimaxi.com',
  'kimi-coding': 'https://api.kimi.com',
  'xiaomi-token-plan-cn': 'https://token-plan-cn.xiaomimimo.com',
  'opencode-go': 'https://opencode.ai',
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
  deepseek: 'https://api.deepseek.com',
  openrouter: 'https://openrouter.ai',
  google: 'https://generativelanguage.googleapis.com',
};

const ANTHROPIC_STYLE_PROVIDERS = new Set([
  'anthropic',
  'minimax-cn',
  'kimi-coding',
  'xiaomi-token-plan-cn',
]);

const CONFIG_FILENAME = 'ai-config.secure.json';
const MAX_CONFIG_LENGTH = 256 * 1024;
const MAX_FIELD_LENGTH = 4096;

let userDataDirectory = '';
let cachedConfig: SecureAIConfig | null | undefined;
let proxyServer: http.Server | null = null;
let proxyInfo: AIProxyInfo | null = null;

function configPath(): string {
  if (!userDataDirectory) throw new Error('AI security service has not been initialized');
  return path.join(userDataDirectory, CONFIG_FILENAME);
}

function safeString(value: unknown, maxLength = MAX_FIELD_LENGTH): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function normalizeConfig(input: unknown, existing?: SecureAIConfig | null): SecureAIConfig {
  if (!input || typeof input !== 'object') throw new Error('Invalid AI configuration');
  const raw = input as Record<string, unknown>;
  const rawProviders = raw.providers && typeof raw.providers === 'object'
    ? raw.providers as Record<string, unknown>
    : {};
  const providers: Record<string, ProviderCredential> = {};

  for (const [providerId, value] of Object.entries(rawProviders)) {
    if (!/^[a-z0-9-]{1,64}$/.test(providerId) || !value || typeof value !== 'object') continue;
    const credential = value as Record<string, unknown>;
    const baseURL = safeString(credential.baseURL);
    const existingCredential = existing?.providers[providerId];
    let apiKey = safeString(credential.apiKey);
    if (apiKey === SECURE_CREDENTIAL_PLACEHOLDER) {
      // The upstream origin is part of the credential's security boundary. A
      // renderer may retain a key without seeing it, but changing its target
      // requires the user to enter the key again.
      const existingBaseURL = existingCredential?.baseURL ?? '';
      apiKey = baseURL === existingBaseURL ? existingCredential?.apiKey ?? '' : '';
    }
    if (!apiKey) continue;
    const customModelId = safeString(credential.customModelId, 512);
    providers[providerId] = {
      apiKey,
      ...(baseURL ? { baseURL } : {}),
      ...(customModelId ? { customModelId } : {}),
    };
  }

  const rawModels = raw.models && typeof raw.models === 'object'
    ? raw.models as Record<string, unknown>
    : {};
  const normalizeModel = (level: string): ModelSelection => {
    const value = rawModels[level] && typeof rawModels[level] === 'object'
      ? rawModels[level] as Record<string, unknown>
      : {};
    return {
      provider: safeString(value.provider, 64),
      modelId: safeString(value.modelId, 512),
      ...(safeString(value.displayName, 512) ? { displayName: safeString(value.displayName, 512) } : {}),
    };
  };

  return {
    providers,
    models: {
      daily: normalizeModel('daily'),
      important: normalizeModel('important'),
      critical: normalizeModel('critical'),
    },
  };
}

function sanitizeConfig(config: SecureAIConfig): SecureAIConfig {
  return {
    providers: Object.fromEntries(
      Object.entries(config.providers).map(([providerId, credential]) => [
        providerId,
        {
          ...credential,
          apiKey: SECURE_CREDENTIAL_PLACEHOLDER,
        },
      ]),
    ),
    models: {
      daily: { ...config.models.daily },
      important: { ...config.models.important },
      critical: { ...config.models.critical },
    },
  };
}

function readEncryptedConfig(): SecureAIConfig | null {
  const target = configPath();
  if (!fs.existsSync(target)) return null;
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('System credential encryption is unavailable');
  }
  const wrapper = JSON.parse(fs.readFileSync(target, 'utf8')) as { version?: number; ciphertext?: string };
  if (wrapper.version !== 1 || typeof wrapper.ciphertext !== 'string') {
    throw new Error('Unsupported secure AI configuration format');
  }
  const plaintext = safeStorage.decryptString(Buffer.from(wrapper.ciphertext, 'base64'));
  if (plaintext.length > MAX_CONFIG_LENGTH) throw new Error('Secure AI configuration is too large');
  return normalizeConfig(JSON.parse(plaintext));
}

function getStoredConfig(): SecureAIConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;
  cachedConfig = readEncryptedConfig();
  return cachedConfig;
}

export function initializeAISecurity(directory: string): void {
  userDataDirectory = directory;
  cachedConfig = undefined;
}

export function loadSanitizedAIConfig(): SecureAIConfig | null {
  const config = getStoredConfig();
  return config ? sanitizeConfig(config) : null;
}

export function saveEncryptedAIConfig(input: unknown): SecureAIConfig {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统安全存储不可用，已拒绝保存 API key');
  }
  const config = normalizeConfig(input, getStoredConfig());
  const plaintext = JSON.stringify(config);
  if (plaintext.length > MAX_CONFIG_LENGTH) throw new Error('AI 配置过大');
  const ciphertext = safeStorage.encryptString(plaintext).toString('base64');
  const target = configPath();
  const temporary = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify({ version: 1, ciphertext }), {
    encoding: 'utf8',
    mode: 0o600,
  });
  fs.renameSync(temporary, target);
  cachedConfig = config;
  return sanitizeConfig(config);
}

export function clearEncryptedAIConfig(): void {
  const target = configPath();
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
  cachedConfig = null;
}

function isAllowedUpstream(url: URL): boolean {
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}

function getProxyCredential(route: 'builtin' | 'provider', providerId: string): {
  apiKey: string;
  providerId: string;
  upstream: URL;
} | null {
  if (route === 'builtin') {
    const apiKey = process.env.BUILTIN_API_KEY ?? '';
    const actualProvider = process.env.BUILTIN_PROVIDER || 'anthropic';
    const baseURL = process.env.BUILTIN_BASE_URL || PROVIDER_TARGETS[actualProvider];
    if (!apiKey || !baseURL) return null;
    const upstream = new URL(baseURL);
    return isAllowedUpstream(upstream) ? { apiKey, providerId: actualProvider, upstream } : null;
  }

  const credential = getStoredConfig()?.providers[providerId];
  const baseURL = credential?.baseURL || PROVIDER_TARGETS[providerId];
  if (!credential?.apiKey || !baseURL) return null;
  const upstream = new URL(baseURL);
  return isAllowedUpstream(upstream) ? { apiKey: credential.apiKey, providerId, upstream } : null;
}

function hasValidProxyToken(request: http.IncomingMessage, requestURL: URL, token: string): boolean {
  const authorization = request.headers.authorization;
  if (authorization === `Bearer ${token}`) return true;
  if (request.headers['x-api-key'] === token) return true;
  if (request.headers['x-goog-api-key'] === token) return true;
  return requestURL.searchParams.get('key') === token;
}

function applyCors(request: http.IncomingMessage, response: http.ServerResponse): void {
  const origin = request.headers.origin;
  if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'authorization, content-type, x-api-key, x-goog-api-key, anthropic-version, anthropic-beta',
  );
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

async function forwardProxyRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  token: string,
): Promise<void> {
  applyCors(request, response);
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }

  const requestURL = new URL(request.url || '/', 'http://127.0.0.1');
  if (!hasValidProxyToken(request, requestURL, token)) {
    response.statusCode = 401;
    response.end(JSON.stringify({ error: 'Unauthorized AI proxy request' }));
    return;
  }

  const segments = requestURL.pathname.split('/').filter(Boolean);
  const route = segments.shift();
  if (route !== 'builtin' && route !== 'provider') {
    response.statusCode = 404;
    response.end(JSON.stringify({ error: 'Unknown AI proxy route' }));
    return;
  }
  const providerId = route === 'builtin'
    ? (process.env.BUILTIN_PROVIDER || 'anthropic')
    : decodeURIComponent(segments.shift() || '');
  const credential = getProxyCredential(route, providerId);
  if (!credential) {
    response.statusCode = 503;
    response.end(JSON.stringify({ error: 'AI provider is not configured' }));
    return;
  }

  const target = new URL(`/${segments.join('/')}`, credential.upstream.origin);
  requestURL.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  if (target.searchParams.get('key') === token) target.searchParams.set('key', credential.apiKey);

  const bodyChunks: Buffer[] = [];
  for await (const chunk of request) bodyChunks.push(Buffer.from(chunk));
  const body = Buffer.concat(bodyChunks);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    const lower = name.toLowerCase();
    if (['host', 'content-length', 'authorization', 'x-api-key', 'x-goog-api-key'].includes(lower)) continue;
    if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  if (ANTHROPIC_STYLE_PROVIDERS.has(credential.providerId)) {
    headers.set('x-api-key', credential.apiKey);
  } else if (!target.searchParams.has('key')) {
    headers.set('authorization', `Bearer ${credential.apiKey}`);
  }

  const upstreamResponse = await fetch(target, {
    method: request.method || 'GET',
    headers,
    body: ['GET', 'HEAD'].includes(request.method || '') ? undefined : body,
    redirect: 'manual',
  });
  response.statusCode = upstreamResponse.status;
  upstreamResponse.headers.forEach((value, name) => {
    if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(name.toLowerCase())) {
      response.setHeader(name, value);
    }
  });
  applyCors(request, response);

  if (upstreamResponse.body) {
    const reader = upstreamResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      response.write(value);
    }
  }
  response.end();
}

export async function startAIProxy(): Promise<AIProxyInfo> {
  if (proxyInfo) return proxyInfo;
  const token = randomBytes(32).toString('base64url');
  proxyServer = http.createServer((request, response) => {
    void forwardProxyRequest(request, response, token).catch((error) => {
      console.error('[ai-proxy] Request failed:', error instanceof Error ? error.message : String(error));
      if (!response.headersSent) response.statusCode = 502;
      response.end(JSON.stringify({ error: 'AI proxy request failed' }));
    });
  });
  await new Promise<void>((resolve, reject) => {
    proxyServer!.once('error', reject);
    proxyServer!.listen(0, '127.0.0.1', () => resolve());
  });
  const address = proxyServer.address();
  if (!address || typeof address === 'string') throw new Error('Failed to start AI proxy');
  proxyInfo = {
    baseURL: `http://127.0.0.1:${address.port}`,
    token,
  };
  return proxyInfo;
}

export function getAIProxyInfo(): AIProxyInfo | null {
  return proxyInfo;
}

export async function stopAIProxy(): Promise<void> {
  const server = proxyServer;
  proxyServer = null;
  proxyInfo = null;
  if (!server) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

export function buildBuiltinProxyBaseURL(): string {
  const info = getAIProxyInfo();
  if (!info) return '';
  const provider = process.env.BUILTIN_PROVIDER || 'anthropic';
  const baseURL = process.env.BUILTIN_BASE_URL || PROVIDER_TARGETS[provider];
  if (!baseURL) return `${info.baseURL}/builtin`;
  const upstream = new URL(baseURL);
  return `${info.baseURL}/builtin${upstream.pathname.replace(/\/$/, '')}`;
}
