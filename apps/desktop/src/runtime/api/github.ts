// GitHub API Runtime
// 走 REST API，不走 MCP

import type { ApiResult, GitHubUser, GitHubRepo, GitHubSearchResult, GitHubReadme, ApiLogEntry } from './apiTypes';
import { tauriAdapter } from '../tauriAdapter';

// 从 localStorage 获取 Token（同步）
function getToken(): string {
  try {
    const settings = localStorage.getItem('ai_companion_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.githubToken || '';
    }
  } catch {}
  return '';
}

// 异步获取 Token - 优先从 Tauri 环境变量获取
async function getTokenAsync(): Promise<string> {
  // 1. 先尝试 localStorage
  try {
    const settings = localStorage.getItem('ai_companion_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.githubToken) return parsed.githubToken;
    }
  } catch {}

  // 2. 尝试通过 Tauri command 获取环境变量
  try {
    const result = await tauriAdapter.getEnv('GITHUB_MCP_TOKEN');
    if (result.ok && result.data) return result.data;
  } catch {}

  return '';
}

// 获取 masked token 用于日志
function getMaskedToken(token: string): string {
  if (!token || token.length < 10) return '***';
  return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
}

// API 基础配置
const API_CONFIG = {
  baseUrl: 'https://api.github.com',
  timeout: 10000,
  userAgent: 'AI-Companion/1.0',
};

// API 日志
const apiLogs: ApiLogEntry[] = [];

function logApi(method: string, endpoint: string, statusCode: number | undefined, ok: boolean, error?: string, errorCode?: string, duration = 0) {
  apiLogs.push({ method, endpoint, statusCode, ok, error, errorCode, duration, timestamp: Date.now() });
  if (apiLogs.length > 100) apiLogs.shift();
}

function getApiLogs(): ApiLogEntry[] {
  return [...apiLogs];
}

function clearApiLogs() {
  apiLogs.length = 0;
}

// 统一请求方法
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {
  const token = await getTokenAsync();
  const maskedToken = getMaskedToken(token);
  const startTime = Date.now();
  
  if (!token) {
    return {
      ok: false,
      error: 'GitHub Token not configured. Set GITHUB_MCP_TOKEN or configure in Settings.',
      errorCode: 'FAILED_AUTH',
      source: 'github_api',
      timestamp: Date.now(),
    };
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': API_CONFIG.userAgent,
        ...options?.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    if (response.status === 401) {
      logApi('GET', endpoint, 401, false, 'Bad credentials', 'FAILED_AUTH', duration);
      return {
        ok: false,
        error: 'Authentication failed. Check your GitHub Token.',
        errorCode: 'FAILED_AUTH',
        source: 'github_api',
        timestamp: Date.now(),
      };
    }
    
    if (response.status === 403) {
      const resetHeader = response.headers.get('X-RateLimit-Reset');
      logApi('GET', endpoint, 403, false, 'Rate limit or scope issue', 'FAILED_SCOPE_OR_RATE_LIMIT', duration);
      return {
        ok: false,
        error: `Rate limit exceeded or insufficient scope.${resetHeader ? ` Resets at ${new Date(parseInt(resetHeader) * 1000).toISOString()}` : ''}`,
        errorCode: 'FAILED_SCOPE_OR_RATE_LIMIT',
        source: 'github_api',
        timestamp: Date.now(),
      };
    }
    
    if (response.status === 404) {
      logApi('GET', endpoint, 404, false, 'Not found', 'NOT_FOUND', duration);
      return {
        ok: false,
        error: 'Resource not found.',
        errorCode: 'NOT_FOUND',
        source: 'github_api',
        timestamp: Date.now(),
      };
    }
    
    if (!response.ok) {
      logApi('GET', endpoint, response.status, false, `HTTP ${response.status}`, 'UNKNOWN', duration);
      return {
        ok: false,
        error: `GitHub API error: ${response.status}`,
        errorCode: 'UNKNOWN',
        source: 'github_api',
        timestamp: Date.now(),
      };
    }
    
    const data = await response.json() as T;
    logApi('GET', endpoint, 200, true, undefined, undefined, duration);
    
    return {
      ok: true,
      data,
      source: 'github_api',
      timestamp: Date.now(),
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    if (errorMessage.includes('abort')) {
      logApi('GET', endpoint, undefined, false, 'Network timeout', 'NETWORK_TIMEOUT', duration);
      return {
        ok: false,
        error: 'Request timeout. GitHub API not responding.',
        errorCode: 'NETWORK_TIMEOUT',
        source: 'github_api',
        timestamp: Date.now(),
      };
    }
    
    logApi('GET', endpoint, undefined, false, errorMessage, 'UNKNOWN', duration);
    return {
      ok: false,
      error: `Network error: ${errorMessage}`,
      errorCode: 'UNKNOWN',
      source: 'github_api',
      timestamp: Date.now(),
    };
  }
}

// GitHub API 方法
export const githubApi = {
  // 获取当前用户
  getUser: (): Promise<ApiResult<GitHubUser>> => {
    return apiRequest<GitHubUser>('/user');
  },
  
  // 获取仓库信息
  getRepo: (owner: string, repo: string): Promise<ApiResult<GitHubRepo>> => {
    return apiRequest<GitHubRepo>(`/repos/${owner}/${repo}`);
  },
  
  // 搜索仓库
  searchRepos: (query: string): Promise<ApiResult<GitHubSearchResult>> => {
    const encoded = encodeURIComponent(query);
    return apiRequest<GitHubSearchResult>(`/search/repositories?q=${encoded}&per_page=10`);
  },
  
  // 获取 README
  getReadme: (owner: string, repo: string): Promise<ApiResult<GitHubReadme>> => {
    return apiRequest<GitHubReadme>(`/repos/${owner}/${repo}/readme`);
  },
  
  // 工具方法
  getLogs: getApiLogs,
  clearLogs: clearApiLogs,
  isConfigured: (): boolean => {
    return getToken().length > 0;
  },
  isConfiguredAsync: async (): Promise<boolean> => {
    return (await getTokenAsync()).length > 0;
  },
  getMaskedToken,
  getTokenAsync,
};

// API Runtime 导出
export const apiRuntime = {
  github: githubApi,
  getLogs: getApiLogs,
  clearLogs: clearApiLogs,
};
