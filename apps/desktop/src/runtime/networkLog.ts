// Network Log - 联网日志模块
// 统一管理所有网络请求日志，支持 localStorage / Tauri storage

import type { NetworkLogEntry, NetworkProvider } from './runtimeTypes';

const LOG_KEY = 'ai_companion_network_logs';
const MAX_LOG_ENTRIES = 200;

let inMemoryLogs: NetworkLogEntry[] = [];

// 生成唯一ID
function generateId(): string {
  return `net_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// 从 localStorage 加载日志
function loadFromStorage(): NetworkLogEntry[] {
  try {
    const stored = localStorage.getItem(LOG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[NetworkLog] Failed to load from localStorage:', e);
  }
  return [];
}

// 保存日志到 localStorage
function saveToStorage(logs: NetworkLogEntry[]): void {
  try {
    // 只保留最近 MAX_LOG_ENTRIES 条
    const trimmed = logs.slice(-MAX_LOG_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
    inMemoryLogs = trimmed;
  } catch (e) {
    console.warn('[NetworkLog] Failed to save to localStorage:', e);
  }
}

// 添加日志
export function addNetworkLog(
  query: string,
  provider: NetworkProvider,
  resultCount: number,
  ok: boolean,
  error?: string,
  duration?: number
): NetworkLogEntry {
  const entry: NetworkLogEntry = {
    id: generateId(),
    query,
    provider,
    resultCount,
    ok,
    error,
    timestamp: Date.now(),
    duration,
  };

  const logs = loadFromStorage();
  logs.push(entry);
  saveToStorage(logs);

  console.log(`[NetworkLog] ${ok ? '✅' : '❌'} [${provider}] "${query}" -> ${resultCount} results (${duration}ms)`);

  return entry;
}

// 获取所有日志
export function getNetworkLogs(): NetworkLogEntry[] {
  return loadFromStorage();
}

// 清除日志
export function clearNetworkLogs(): void {
  localStorage.removeItem(LOG_KEY);
  inMemoryLogs = [];
  console.log('[NetworkLog] Logs cleared');
}

// 导出日志
export function exportNetworkLogs(): NetworkLogEntry[] {
  return getNetworkLogs();
}

// 获取日志统计
export function getNetworkLogStats(): {
  total: number;
  success: number;
  failed: number;
  byProvider: Record<string, number>;
} {
  const logs = loadFromStorage();
  const stats = {
    total: logs.length,
    success: logs.filter(l => l.ok).length,
    failed: logs.filter(l => !l.ok).length,
    byProvider: {} as Record<string, number>,
  };

  logs.forEach(log => {
    stats.byProvider[log.provider] = (stats.byProvider[log.provider] || 0) + 1;
  });

  return stats;
}

// 检查是否应该触发联网搜索
export interface WebSearchTriggerMatch {
  shouldTrigger: boolean;
  matchedRule: string;
  matchedKeyword: string;
}

const TRIGGER_GROUPS = [
  {
    rule: 'explicit_search_intent',
    keywords: ['联网搜索', '搜索', '搜一下', '帮我搜', '查一下', '查询', '查找', '最新', '当前', '现在', '资料', '官网'],
  },
  {
    rule: 'external_source_keyword',
    keywords: ['github', '项目', '仓库', 'repo', 'repository', 'release', 'releases', '插件', '开源'],
  },
  {
    rule: 'time_sensitive',
    keywords: ['今天', '最近', '当前版本', '价格', '天气', '新闻', '比赛', '股票'],
  },
];

export function analyzeWebSearchTrigger(message: string): WebSearchTriggerMatch {
  const query = (message || '').trim();
  const lowerMessage = query.toLowerCase();

  if (/https?:\/\//i.test(query)) {
    return { shouldTrigger: true, matchedRule: 'url', matchedKeyword: query.match(/https?:\/\//i)?.[0] || 'url' };
  }

  if (lowerMessage.includes('github.com')) {
    return { shouldTrigger: true, matchedRule: 'url', matchedKeyword: 'github.com' };
  }

  const repoMatch = query.match(/\b[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\b/);
  if (repoMatch) {
    return { shouldTrigger: true, matchedRule: 'owner_repo_format', matchedKeyword: repoMatch[0] };
  }

  for (const group of TRIGGER_GROUPS) {
    const keyword = group.keywords.find(item => lowerMessage.includes(item.toLowerCase()));
    if (keyword) {
      return { shouldTrigger: true, matchedRule: group.rule, matchedKeyword: keyword };
    }
  }

  return { shouldTrigger: false, matchedRule: 'none', matchedKeyword: '' };
}

export function shouldTriggerWebSearch(message: string): boolean {
  return analyzeWebSearchTrigger(message).shouldTrigger;
}

// Network Log API
export const networkLog = {
  add: addNetworkLog,
  getAll: getNetworkLogs,
  clear: clearNetworkLogs,
  export: exportNetworkLogs,
  getStats: getNetworkLogStats,
  analyzeTrigger: analyzeWebSearchTrigger,
  shouldTriggerWebSearch,
};
