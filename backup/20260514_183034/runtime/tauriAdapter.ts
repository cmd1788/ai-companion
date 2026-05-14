// Tauri Adapter - 真实 Tauri Runtime 实现
import { invoke } from '@tauri-apps/api/core';
import type { InvokeResult } from './runtimeTypes';

export async function invokeSafe<T = any>(command: string, args?: Record<string, any>): Promise<InvokeResult<T>> {
  try {
    const data = await invoke<T>(command, args);
    return { ok: true, data, command };
  } catch (e: any) {
    const errorMsg = e?.message || String(e) || 'Unknown error';
    console.warn(`[TauriAdapter] ${command} failed:`, errorMsg);
    return { ok: false, error: errorMsg, command };
  }
}

export async function ping(): Promise<InvokeResult<string>> {
  return invokeSafe<string>('ping');
}

export async function saveMessage(role: string, content: string): Promise<InvokeResult<number>> {
  return invokeSafe<number>('save_message', { role, content });
}

export async function loadMessages(limit = 50): Promise<InvokeResult<any[]>> {
  return invokeSafe<any[]>('load_messages', { limit });
}

export async function saveEmotion(state: Record<string, number>): Promise<InvokeResult<void>> {
  return invokeSafe<void>('save_emotion', state);
}

export async function loadEmotion(): Promise<InvokeResult<any>> {
  return invokeSafe<any>('load_emotion');
}

export async function clearMessages(): Promise<InvokeResult<void>> {
  return invokeSafe<void>('clear_messages');
}

export async function saveMemory(content: string): Promise<InvokeResult<number>> {
  return invokeSafe<number>('save_memory', { content });
}

export async function loadMemories(): Promise<InvokeResult<any[]>> {
  return invokeSafe<any[]>('load_memories');
}

export async function captureScreen(): Promise<InvokeResult<string>> {
  return invokeSafe<string>('capture_screen');
}

export async function readFileBase64(path: string): Promise<InvokeResult<number[]>> {
  return invokeSafe<number[]>('read_file_base64', { path });
}

export async function writeBinaryFile(path: string, data: number[]): Promise<InvokeResult<void>> {
  return invokeSafe<void>('write_binary_file', { path, data });
}

export const tauriAdapter = {
  invokeSafe,
  ping,
  saveMessage,
  loadMessages,
  saveEmotion,
  loadEmotion,
  clearMessages,
  saveMemory,
  loadMemories,
  captureScreen,
  readFileBase64,
  writeBinaryFile,
};
