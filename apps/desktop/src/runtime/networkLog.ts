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
export function shouldTriggerWebSearch(message: string): boolean {
  const triggers = [
    '搜索', '查一下', '最新', '今天', '新闻',
    '官网', '资料', '价格', '天气', '结果',
    '比赛', '股票', '比分', '比分直播', '什么是',
    '如何', '怎么', '教程', '推荐', '排行榜',
  ];

  const lowerMessage = message.toLowerCase();
  return triggers.some(trigger => lowerMessage.includes(trigger));
}

// Network Log API
export const networkLog = {
  add: addNetworkLog,
  getAll: getNetworkLogs,
  clear: clearNetworkLogs,
  export: exportNetworkLogs,
  getStats: getNetworkLogStats,
  shouldTriggerWebSearch,
};
