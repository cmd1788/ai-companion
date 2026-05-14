// Storage Adapter - localStorage 后备存储 (Browser/Dev/Test 模式)
import type { Message, MemoryItem, EmotionState, InvokeResult } from './runtimeTypes';

const KEYS = {
  messages: 'ai_companion_messages',
  memories: 'ai_companion_memories',
  emotion: 'ai_companion_emotion',
  settings: 'ai_companion_settings',
  character: 'ai_companion_character',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Messages
export function saveMessage(role: string, content: string, source?: string): InvokeResult<number> {
  try {
    const messages = loadMessagesLocal();
    const newMsg: Message = {
      id: generateId(),
      role: role as 'user' | 'assistant' | 'system',
      content,
      timestamp: Date.now(),
      source: source as any,
    };
    messages.push(newMsg);
    // Keep last 100 messages
    const trimmed = messages.slice(-100);
    localStorage.setItem(KEYS.messages, JSON.stringify(trimmed));
    return { ok: true, data: trimmed.length, command: 'localStorage.saveMessage' };
  } catch (e: any) {
    return { ok: false, error: String(e), command: 'localStorage.saveMessage' };
  }
}

export function loadMessagesLocal(limit = 50): Message[] {
  try {
    const raw = localStorage.getItem(KEYS.messages);
    if (!raw) return [];
    const messages: Message[] = JSON.parse(raw);
    return messages.slice(-limit);
  } catch {
    return [];
  }
}

export function clearMessagesLocal(): InvokeResult<void> {
  try {
    localStorage.removeItem(KEYS.messages);
    return { ok: true, command: 'localStorage.clearMessages' };
  } catch (e: any) {
    return { ok: false, error: String(e), command: 'localStorage.clearMessages' };
  }
}

// Memories
export function saveMemoryLocal(content: string): InvokeResult<number> {
  try {
    const memories = loadMemoriesLocal();
    const newMem: MemoryItem = {
      id: generateId(),
      content,
      timestamp: Date.now(),
    };
    memories.push(newMem);
    localStorage.setItem(KEYS.memories, JSON.stringify(memories));
    return { ok: true, data: memories.length, command: 'localStorage.saveMemory' };
  } catch (e: any) {
    return { ok: false, error: String(e), command: 'localStorage.saveMemory' };
  }
}

export function loadMemoriesLocal(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(KEYS.memories);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearMemoriesLocal(): InvokeResult<void> {
  try {
    localStorage.removeItem(KEYS.memories);
    return { ok: true, command: 'localStorage.clearMemories' };
  } catch (e: any) {
    return { ok: false, error: String(e), command: 'localStorage.clearMemories' };
  }
}

// Emotion
export function saveEmotionLocal(state: EmotionState): InvokeResult<void> {
  try {
    localStorage.setItem(KEYS.emotion, JSON.stringify(state));
    return { ok: true, command: 'localStorage.saveEmotion' };
  } catch (e: any) {
    return { ok: false, error: String(e), command: 'localStorage.saveEmotion' };
  }
}

export function loadEmotionLocal(): InvokeResult<EmotionState> {
  try {
    const raw = localStorage.getItem(KEYS.emotion);
    if (!raw) {
      return { ok: false, error: 'No emotion data', command: 'localStorage.loadEmotion' };
    }
    return { ok: true, data: JSON.parse(raw), command: 'localStorage.loadEmotion' };
  } catch (e: any) {
    return { ok: false, error: String(e), command: 'localStorage.loadEmotion' };
  }
}

// Generic storage
export function getItem(key: string): any {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: any): InvokeResult<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true, command: `localStorage.setItem(${key})` };
  } catch (e: any) {
    return { ok: false, error: String(e), command: `localStorage.setItem(${key})` };
  }
}

export const storageAdapter = {
  saveMessage,
  loadMessages: loadMessagesLocal,
  clearMessages: clearMessagesLocal,
  saveMemory: saveMemoryLocal,
  loadMemories: loadMemoriesLocal,
  clearMemories: clearMemoriesLocal,
  saveEmotion: saveEmotionLocal,
  loadEmotion: loadEmotionLocal,
  getItem,
  setItem,
};
