import { safeStorage } from 'electron';
import { randomBytes, timingSafeEqual } from 'node:crypto';
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
const MAX_PROXY_REQUEST_BODY_BYTES = 10 * 1024 * 1024;
const ALLOWED_PROXY_METHODS = new Set(['GET', 'HEAD', 'POST']);
const GOOGLE_STYLE_PROVIDERS = new Set(['google']);

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
  if (url.username || url.password) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:'
    && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
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

function safeTokenEquals(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hasValidProxyToken(request: http.IncomingMessage, requestURL: URL, token: string): boolean {
  const authorization = request.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;
  return safeTokenEquals(bearerToken, token)
    || safeTokenEquals(firstHeaderValue(request.headers['x-api-key']), token)
    || safeTokenEquals(firstHeaderValue(request.headers['x-goog-api-key']), token)
    || safeTokenEquals(requestURL.searchParams.get('key') ?? undefined, token);
}

function isAllowedRendererOrigin(origin: string | undefined): boolean {
  if (!origin || origin === 'null') return true;
  const configuredDevURL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  try {
    const configuredOrigin = new URL(configuredDevURL).origin;
    const configuredPort = new URL(configuredOrigin).port || '5173';
    return origin === configuredOrigin
      || origin === `http://localhost:${configuredPort}`
      || origin === `http://127.0.0.1:${configuredPort}`;
  } catch {
    return false;
  }
}

function applyCors(request: http.IncomingMessage, response: http.ServerResponse): boolean {
  const origin = request.headers.origin;
  if (!isAllowedRendererOrigin(origin)) return false;
  if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader(
    'Access-Control-Allow-Headers',
    firstHeaderValue(request.headers['access-control-request-headers'])
      || 'authorization, content-type, x-api-key, x-goog-api-key, anthropic-version, anthropic-beta',
  );
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Private-Network', 'true');
  return true;
}

export function resolveAIProxyTarget(
  upstream: URL,
  requestPath: string,
  searchParams: URLSearchParams,
): URL | null {
  if (!requestPath.startsWith('/') || requestPath.startsWith('//')) return null;
  const target = new URL(requestPath, upstream.origin);
  const upstreamPath = upstream.pathname.replace(/\/+$/, '') || '/';
  const allowedPath = upstreamPath === '/'
    || target.pathname === upstreamPath
    || target.pathname.startsWith(`${upstreamPath}/`);
  if (target.origin !== upstream.origin || !allowedPath) return null;
  for (const [key, value] of searchParams) target.searchParams.append(key, value);
  return target;
}

async function readProxyRequestBody(request: http.IncomingMessage): Promise<Buffer> {
  const contentLength = Number(firstHeaderValue(request.headers['content-length']));
  if (Number.isFinite(contentLength) && contentLength > MAX_PROXY_REQUEST_BODY_BYTES) {
    throw new Error('REQUEST_TOO_LARGE');
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_PROXY_REQUEST_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function forwardProxyRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  token: string,
): Promise<void> {
  if (!applyCors(request, response)) {
    response.statusCode = 403;
    response.end(JSON.stringify({ error: 'Forbidden AI proxy origin' }));
    return;
  }
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }

  const method = request.method || 'GET';
  if (!ALLOWED_PROXY_METHODS.has(method)) {
    response.statusCode = 405;
    response.setHeader('Allow', 'GET, HEAD, POST, OPTIONS');
    response.end(JSON.stringify({ error: 'Unsupported AI proxy method' }));
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

  const target = resolveAIProxyTarget(
    credential.upstream,
    `/${segments.join('/')}`,
    requestURL.searchParams,
  );
  if (!target) {
    response.statusCode = 400;
    response.end(JSON.stringify({ error: 'Invalid AI proxy path' }));
    return;
  }
  if (GOOGLE_STYLE_PROVIDERS.has(credential.providerId)) {
    target.searchParams.set('key', credential.apiKey);
  } else if (safeTokenEquals(target.searchParams.get('key') ?? undefined, token)) {
    target.searchParams.delete('key');
  }

  let body: Buffer;
  try {
    body = ['GET', 'HEAD'].includes(method)
      ? Buffer.alloc(0)
      : await readProxyRequestBody(request);
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') {
      response.statusCode = 413;
      response.end(JSON.stringify({ error: 'AI proxy request body is too large' }));
      return;
    }
    throw error;
  }
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    const lower = name.toLowerCase();
    if ([
      'accept-encoding',
      'authorization',
      'connection',
      'content-length',
      'cookie',
      'host',
      'origin',
      'proxy-authorization',
      'transfer-encoding',
      'x-api-key',
      'x-goog-api-key',
    ].includes(lower)) continue;
    if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  if (ANTHROPIC_STYLE_PROVIDERS.has(credential.providerId)) {
    headers.set('x-api-key', credential.apiKey);
  } else if (GOOGLE_STYLE_PROVIDERS.has(credential.providerId)) {
    headers.set('x-goog-api-key', credential.apiKey);
  } else {
    headers.set('authorization', `Bearer ${credential.apiKey}`);
  }

  const upstreamResponse = await fetch(target, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : new Uint8Array(body),
    redirect: 'error',
  });
  response.statusCode = upstreamResponse.status;
  upstreamResponse.headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (
      !['content-encoding', 'transfer-encoding', 'content-length'].includes(lower)
      && !lower.startsWith('access-control-')
    ) {
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
