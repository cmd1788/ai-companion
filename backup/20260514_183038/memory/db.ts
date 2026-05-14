// Memory/DB Layer - 使用 Runtime Adapter
// 不直接调用 invoke，所有操作通过 runtime API
// 支持 Tauri (SQLite) 和 Browser (localStorage) 模式

import { runtime } from '../runtime/runtimeAdapter';
import type { EmotionState } from '../runtime/runtimeTypes';

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Memory {
  id: number;
  content: string;
  timestamp: number;
}

// 初始化数据库连接
export async function initDatabase(): Promise<void> {
  console.log('[DB] Initializing with Runtime Adapter');
  const status = await runtime.init();
  console.log('[DB] Runtime mode:', status.mode, '| Storage:', status.storageBackend);
  
  // 诊断 ping
  const pingResult = await runtime.diagnostics.ping();
  console.log('[DB] Ping result:', pingResult);
}

// 保存消息
export async function saveMessage(role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
  const result = await runtime.messages.save(role, content);
  if (result.ok) {
    console.log('[DB] Message saved via runtime');
  } else {
    console.warn('[DB] saveMessage warning:', result.error);
  }
}

// 加载消息
export async function loadMessages(limit = 50): Promise<Message[]> {
  const messages = await runtime.messages.load(limit);
  return messages.map((m, i) => ({
    id: i,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));
}

// 保存情绪
export async function saveEmotion(state: EmotionState): Promise<void> {
  const result = await runtime.emotion.save(state);
  if (!result.ok) {
    console.warn('[DB] saveEmotion warning:', result.error);
  }
}

// 加载情绪
export async function loadEmotion(): Promise<EmotionState | null> {
  return await runtime.emotion.load();
}

// 清空消息
export async function clearMessages(): Promise<void> {
  await runtime.messages.clear();
}

// 保存记忆
export async function saveMemory(content: string): Promise<void> {
  const result = await runtime.memories.save(content);
  if (result.ok) {
    console.log('[DB] Memory saved via runtime');
  } else {
    console.warn('[DB] saveMemory warning:', result.error);
  }
}

// 加载记忆
export async function loadMemories(): Promise<Memory[]> {
  const items = await runtime.memories.load();
  return items.map((m, i) => ({
    id: i,
    content: m.content,
    timestamp: m.timestamp,
  }));
}
