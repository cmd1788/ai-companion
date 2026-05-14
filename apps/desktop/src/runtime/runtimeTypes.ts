// Runtime 类型定义
export type RuntimeMode = 'TAURI' | 'BROWSER_DEV' | 'TEST' | 'UNKNOWN';

export interface RuntimeStatus {
  mode: RuntimeMode;
  tauriAvailable: boolean;
  invokeAvailable: boolean;
  storageBackend: 'sqlite' | 'localStorage' | 'memory';
  startedAt: string;
  warnings: string[];
  errors: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  source?: 'user' | 'ai' | 'proactive';
}

export interface MemoryItem {
  id: string;
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

export interface InvokeResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  command: string;
  degraded?: boolean;
}

export interface ScreenCaptureResult {
  ok: boolean;
  data?: string;
  error?: string;
  degraded?: boolean;
}

export interface TTSResult {
  ok: boolean;
  path?: string;
  error?: string;
  degraded?: boolean;
}

export interface RuntimeStateExport {
  mode: string;
  tauriAvailable: boolean;
  invokeAvailable: boolean;
  storageBackend: string;
  warnings: string[];
  errors: string[];
  messageCount: number;
  memoryCount: number;
  settingsLoaded: boolean;
  emotionLoaded: boolean;
}
