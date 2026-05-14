import { invoke } from '@tauri-apps/api/core';

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface EmotionState {
  happiness: number;
  fatigue: number;
  loneliness: number;
  stress: number;
  affection: number;
}

export interface Memory {
  id: number;
  content: string;
  timestamp: number;
}

export async function initDatabase(): Promise<void> {
  console.log('[DB] Using Rust SQLite backend');
  try {
    await invoke<string>('ping');
  } catch (e) {
    console.error('[DB] Ping error:', e);
  }
}

export async function saveMessage(role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
  try {
    await invoke<number>('save_message', { role, content });
    console.log('[DB] Message saved');
  } catch (e) {
    console.error('[DB] save_message error:', e);
    throw e;
  }
}

export async function loadMessages(limit = 50): Promise<Message[]> {
  try {
    const messages = await invoke<Message[]>('load_messages', { limit });
    return messages;
  } catch (e) {
    console.error('[DB] load_messages error:', e);
    return [];
  }
}

export async function saveEmotion(state: EmotionState): Promise<void> {
  try {
    await invoke('save_emotion', {
      happiness: state.happiness,
      fatigue: state.fatigue,
      loneliness: state.loneliness,
      stress: state.stress,
      affection: state.affection
    });
  } catch (e) {
    console.error('[DB] save_emotion error:', e);
  }
}

export async function loadEmotion(): Promise<EmotionState | null> {
  try {
    return await invoke<EmotionState>('load_emotion');
  } catch (e) {
    console.error('[DB] load_emotion error:', e);
    return null;
  }
}

export async function clearMessages(): Promise<void> {
  try {
    await invoke('clear_messages');
  } catch (e) {
    console.error('[DB] clear_messages error:', e);
  }
}

// 记忆功能
export async function saveMemory(content: string): Promise<void> {
  try {
    await invoke<number>('save_memory', { content });
    console.log('[DB] Memory saved:', content.substring(0, 30));
  } catch (e) {
    console.error('[DB] save_memory error:', e);
  }
}

export async function loadMemories(): Promise<Memory[]> {
  try {
    const memories = await invoke<Memory[]>('load_memories');
    console.log('[DB] Loaded', memories.length, 'memories');
    return memories;
  } catch (e) {
    console.error('[DB] load_memories error:', e);
    return [];
  }
}
