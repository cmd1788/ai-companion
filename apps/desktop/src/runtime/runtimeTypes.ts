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

// ========== Network Types ==========

export type NetworkProvider = 'minimax_mcp' | 'fetch' | 'mock' | 'disabled';
export type NetworkSource = 'tauri' | 'browser' | 'mock' | 'minimax_mcp';

export interface NetworkSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedAt?: string;
}

export interface NetworkSearchResponse {
  query: string;
  results: NetworkSearchResult[];
  summary?: string;
  source: NetworkSource;
  timestamp: number;
  degraded?: boolean;
  error?: string;
}

export interface NetworkPageContent {
  url: string;
  title?: string;
  content?: string;
  excerpt?: string;
  error?: string;
  degraded?: boolean;
  source: NetworkSource;
  timestamp: number;
}

export interface NetworkStatus {
  enabled: boolean;
  provider: NetworkProvider;
  lastQuery?: string;
  lastSuccessAt?: number;
  lastError?: string;
  requestCount: number;
  errorCount: number;
  source: NetworkSource;
}

export interface NetworkLogEntry {
  id: string;
  query: string;
  provider: NetworkProvider;
  resultCount: number;
  ok: boolean;
  error?: string;
  timestamp: number;
  duration?: number;
}

export interface NetworkAPIOptions {
  provider?: NetworkProvider;
  maxResults?: number;
  autoSummarize?: boolean;
  timeout?: number;
}

export interface NetworkResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  degraded?: boolean;
  source: NetworkSource;
  timestamp: number;
}
