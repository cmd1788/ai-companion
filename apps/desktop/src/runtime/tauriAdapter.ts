// Tauri Adapter - 真实 Tauri Runtime 实现
import { invoke } from '@tauri-apps/api/core';
import type { InvokeResult, NetworkSearchResponse } from './runtimeTypes';

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

export async function getEnv(name: string): Promise<InvokeResult<string>> {
  return invokeSafe<string>('get_env', { name });
}

export async function fetchUrl(url: string): Promise<InvokeResult<string>> {
  return invokeSafe<string>('fetch_url', { url });
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

export async function readPhotoDir(path: string): Promise<InvokeResult<string[]>> {
  return invokeSafe<string[]>('read_photo_dir', { path });
}

export async function readFileBase64(path: string): Promise<InvokeResult<number[]>> {
  return invokeSafe<number[]>('read_file_base64', { path });
}

export async function writeBinaryFile(path: string, data: number[]): Promise<InvokeResult<void>> {
  return invokeSafe<void>('write_binary_file', { path, data });
}

// ========== Network Commands - Tauri 真实实现 ==========

interface RustSearchResult {
  ok: boolean;
  results: Array<{title: string; url: string; snippet: string}>;
  source: string;
  error?: string;
}

export async function webSearch(query: string, apiKey?: string): Promise<InvokeResult<NetworkSearchResponse>> {
  try {
    const result = await invokeSafe<RustSearchResult>('web_search', { query, apiKey: apiKey || null });

    if (!result.ok || !result.data) {
      return {
        ok: false,
        error: result.error || 'Search failed',
        command: 'web_search',
        degraded: true,
      };
    }

    const data = result.data;
    if (!data.ok) {
      return {
        ok: false,
        error: data.error || 'Search API error',
        command: 'web_search',
        degraded: true,
      };
    }

    return {
      ok: true,
      data: {
        query,
        results: data.results,
        source: data.source as any,
        timestamp: Date.now(),
        summary: `找到 ${data.results.length} 条相关结果`,
      },
      command: 'web_search',
    };
  } catch (e: any) {
    const errorMsg = e?.message || String(e) || 'Unknown error';
    return {
      ok: false,
      error: errorMsg,
      command: 'web_search',
      degraded: true,
    };
  }
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
  webSearch,
  fetchUrl,
};
