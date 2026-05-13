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

export async function initDatabase(): Promise<void> {
  console.log('[DB] Using Rust SQLite backend - testing with ping...');
  try {
    const result = await invoke<string>('ping');
    console.log('[DB] Ping result:', result);
  } catch (e) {
    console.error('[DB] Ping error:', e);
  }
}

export async function saveMessage(role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
  console.log('[DB] Calling save_message invoke for:', role, '-', content.substring(0, 20));
  try {
    const result = await invoke<number>('save_message', { role, content });
    console.log('[DB] save_message result:', result);
  } catch (e) {
    console.error('[DB] save_message error:', e);
    throw e; // 重新抛出以便上层知晓
  }
}

export async function loadMessages(limit = 50): Promise<Message[]> {
  console.log('[DB] Calling load_messages invoke with limit:', limit);
  try {
    const messages = await invoke<Message[]>('load_messages', { limit });
    console.log('[DB] load_messages result:', JSON.stringify(messages));
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
    console.log('[DB] Emotion saved via Rust');
  } catch (e) {
    console.error('[DB] save_emotion error:', e);
  }
}

export async function loadEmotion(): Promise<EmotionState | null> {
  try {
    const emotion = await invoke<EmotionState>('load_emotion');
    console.log('[DB] Emotion loaded via Rust');
    return emotion;
  } catch (e) {
    console.error('[DB] load_emotion error:', e);
    return null;
  }
}

export async function clearMessages(): Promise<void> {
  try {
    await invoke('clear_messages');
    console.log('[DB] Messages cleared via Rust');
  } catch (e) {
    console.error('[DB] clear_messages error:', e);
  }
}
