// Agent Types - Agent Runtime 类型定义
// MiniMax MCP / OpenClaw Gateway / Tool Calling 走这里

export interface AgentResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  errorCode?: 'BLOCKED_GATEWAY_CONNECT' | 'BLOCKED_MCP_TOOL_NOT_AVAILABLE' | 'NETWORK_TIMEOUT' | 'UNKNOWN';
  source: 'minimax_agent';
  timestamp: number;
}

export interface BridgeStatus {
  connected: boolean;
  gateway: string;
  port: number;
  latency?: number;
  error?: string;
}

export interface SearchOptions {
  provider?: 'minimax_agent';
  timeout?: number;
  maxResults?: number;
}

export interface SearchResult {
  query: string;
  results: {
    title: string;
    url: string;
    snippet: string;
    source: string;
  }[];
  provider: string;
  timestamp: number;
}

// Agent 日志
export interface AgentLogEntry {
  method: string;
  target: string;
  status: 'connected' | 'blocked' | 'failed';
  error?: string;
  duration: number;
  timestamp: number;
}
