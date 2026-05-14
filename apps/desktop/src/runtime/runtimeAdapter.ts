// Runtime Adapter - 统一 Runtime API
// 自动检测运行环境，选择 Tauri 或 Browser 实现

import type { RuntimeMode, RuntimeStatus, Message, MemoryItem, EmotionState, RuntimeStateExport, InvokeResult } from './runtimeTypes';
import { tauriAdapter } from './tauriAdapter';
import { browserAdapter } from './browserAdapter';
import { storageAdapter } from './storageAdapter';

// Runtime 状态
let runtimeStatus: RuntimeStatus = {
  mode: 'UNKNOWN',
  tauriAvailable: false,
  invokeAvailable: false,
  storageBackend: 'memory',
  startedAt: new Date().toISOString(),
  warnings: [],
  errors: [],
};

// 检测函数
function detectRuntime(): RuntimeMode {
  // 检查 Playwright 环境
  if (typeof window !== 'undefined') {
    const userAgent = window.navigator?.userAgent || '';
    if (userAgent.includes('Playwright') || userAgent.includes('Puppeteer')) {
      return 'TEST';
    }
    
    // 检查 localhost
    if (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1') {
      return 'BROWSER_DEV';
    }
    
    // 检查 Tauri
    if (typeof (window as any).__TAURI__ !== 'undefined') {
      return 'TAURI';
    }
  }
  return 'UNKNOWN';
}

// 初始化 Runtime
async function initRuntime(): Promise<RuntimeStatus> {
  const mode = detectRuntime();
  runtimeStatus.mode = mode;
  
  console.log(`[Runtime] Detected mode: ${mode}`);
  
  if (mode === 'TAURI') {
    runtimeStatus.tauriAvailable = true;
    runtimeStatus.invokeAvailable = true;
    runtimeStatus.storageBackend = 'sqlite';
    
    // 测试 Tauri 连接
    const result = await tauriAdapter.ping();
    if (result.ok) {
      console.log('[Runtime] Tauri connection OK');
    } else {
      runtimeStatus.warnings.push(`Tauri ping failed: ${result.error}`);
      runtimeStatus.invokeAvailable = false;
      runtimeStatus.storageBackend = 'localStorage';
    }
  } else if (mode === 'BROWSER_DEV' || mode === 'TEST') {
    runtimeStatus.tauriAvailable = false;
    runtimeStatus.invokeAvailable = false;
    runtimeStatus.storageBackend = 'localStorage';
    runtimeStatus.warnings.push(`Running in ${mode} mode - using localStorage fallback`);
  } else {
    runtimeStatus.storageBackend = 'memory';
    runtimeStatus.errors.push('Unknown runtime mode - using in-memory storage');
  }
  
  return runtimeStatus;
}

// 获取运行时状态
function getRuntimeStatus(): RuntimeStatus {
  return { ...runtimeStatus };
}

// 判断是否为 Tauri 模式
function isTauriRuntime(): boolean {
  return runtimeStatus.mode === 'TAURI';
}

// 判断是否为浏览器模式
function isBrowserRuntime(): boolean {
  return runtimeStatus.mode === 'BROWSER_DEV' || runtimeStatus.mode === 'TEST';
}

// 判断是否为测试模式
function isTestRuntime(): boolean {
  return runtimeStatus.mode === 'TEST';
}

// 消息 API
const messagesAPI = {
  save: async (role: string, content: string, source?: string): Promise<InvokeResult<number>> => {
    if (isTauriRuntime()) {
      const result = await tauriAdapter.saveMessage(role, content);
      if (!result.ok) {
        console.warn('[Runtime] Tauri saveMessage failed, falling back to localStorage');
        return storageAdapter.saveMessage(role, content, source);
      }
      return result;
    } else {
      return storageAdapter.saveMessage(role, content, source);
    }
  },
  
  load: async (limit = 50): Promise<Message[]> => {
    if (isTauriRuntime()) {
      const result = await tauriAdapter.loadMessages(limit);
      if (result.ok && result.data) return result.data;
    }
    return storageAdapter.loadMessages(limit);
  },
  
  clear: async (): Promise<InvokeResult<void>> => {
    if (isTauriRuntime()) {
      const result = await tauriAdapter.clearMessages();
      if (!result.ok) {
        console.warn('[Runtime] Tauri clearMessages failed, falling back to localStorage');
        return storageAdapter.clearMessages();
      }
      return result;
    } else {
      return storageAdapter.clearMessages();
    }
  },
};

// 记忆 API
const memoriesAPI = {
  save: async (content: string): Promise<InvokeResult<number>> => {
    if (isTauriRuntime()) {
      const result = await tauriAdapter.saveMemory(content);
      if (!result.ok) {
        console.warn('[Runtime] Tauri saveMemory failed, falling back to localStorage');
        return storageAdapter.saveMemory(content);
      }
      return result;
    } else {
      return storageAdapter.saveMemory(content);
    }
  },
  
  load: async (): Promise<MemoryItem[]> => {
    if (isTauriRuntime()) {
      const result = await tauriAdapter.loadMemories();
      if (result.ok && result.data) return result.data;
    }
    return storageAdapter.loadMemories();
  },
  
  clear: async (): Promise<InvokeResult<void>> => {
    return storageAdapter.clearMemories();
  },
};

// 情绪 API
const emotionAPI = {
  save: async (state: EmotionState): Promise<InvokeResult<void>> => {
    if (isTauriRuntime()) {
      const result = await tauriAdapter.saveEmotion(state as any);
      if (!result.ok) {
        console.warn('[Runtime] Tauri saveEmotion failed, falling back to localStorage');
        return storageAdapter.saveEmotion(state);
      }
      return result;
    } else {
      return storageAdapter.saveEmotion(state);
    }
  },
  
  load: async (): Promise<EmotionState | null> => {
    if (isTauriRuntime()) {
      const result = await tauriAdapter.loadEmotion();
      if (result.ok && result.data) return result.data;
    }
    const local = storageAdapter.loadEmotion();
    if (local.ok && local.data) return local.data;
    return null;
  },
};

// 截屏 API
const screenAPI = {
  capture: async (): Promise<{ ok: boolean; data?: string; error?: string }> => {
    if (isTauriRuntime()) {
      const result = await tauriAdapter.captureScreen();
      return result;
    } else {
      return browserAdapter.captureScreen();
    }
  },
};

// TTS API
const ttsAPI = {
  speak: async (_text: string): Promise<{ ok: boolean; error?: string }> => {
    // TTS 在 Tauri 模式下由 mcpService 处理
    // Browser 模式下返回降级信息
    return { ok: false, error: 'TTS via runtime (use mcpService.textToSpeech in Tauri mode)' };
  },
};

// 诊断 API
const diagnosticsAPI = {
  ping: async (): Promise<InvokeResult<string>> => {
    if (isTauriRuntime()) {
      return await tauriAdapter.ping();
    } else {
      return { ok: true, data: `Browser runtime (${runtimeStatus.mode})`, command: 'browser.ping' };
    }
  },
  
  exportState: async (): Promise<RuntimeStateExport> => {
    const messages = await messagesAPI.load();
    const memories = await memoriesAPI.load();
    
    return {
      mode: runtimeStatus.mode,
      tauriAvailable: runtimeStatus.tauriAvailable,
      invokeAvailable: runtimeStatus.invokeAvailable,
      storageBackend: runtimeStatus.storageBackend,
      warnings: runtimeStatus.warnings,
      errors: runtimeStatus.errors,
      messageCount: messages.length,
      memoryCount: memories.length,
      settingsLoaded: true,
      emotionLoaded: true,
    };
  },
};

// 统一 Runtime 对象
export const runtime = {
  status: runtimeStatus,
  init: initRuntime,
  getStatus: getRuntimeStatus,
  isTauri: isTauriRuntime,
  isBrowser: isBrowserRuntime,
  isTest: isTestRuntime,
  
  messages: messagesAPI,
  memories: memoriesAPI,
  emotion: emotionAPI,
  screen: screenAPI,
  tts: ttsAPI,
  diagnostics: diagnosticsAPI,
};

export default runtime;
