// MCP Bridge - AI Companion 与 MiniMax MCP Tool 的桥接层
// 
// 通讯架构:
//   AI Companion → mcpBridge → Hermes/OpenClaw Gateway → MiniMax MCP Tool
//
// 优先级:
//   1. WebSocket (Hermes Gateway)
//   2. HTTP (localhost:8080)
//   3. Tauri IPC (如果 Hermes 在 Tauri 进程中运行)

import type { NetworkSearchResponse, NetworkSearchResult } from './runtimeTypes';

// Bridge 状态
export type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'blocked';

interface BridgeState {
  status: BridgeStatus;
  lastError?: string;
  connectedAt?: number;
  requestCount: number;
}

let bridgeState: BridgeState = {
  status: 'disconnected',
  requestCount: 0,
};

// ========== Bridge 配置 ==========

const BRIDGE_CONFIG = {
  // OpenClaw Gateway WebSocket (正确端口: 18789)
  wsUrl: 'ws://localhost:18789',
  // HTTP Fallback
  httpUrl: 'http://localhost:18789',
  // 连接超时
  timeout: 5000,
  // 重试次数
  retries: 2,
};

// ========== Bridge 工具函数 ==========

function setBridgeStatus(status: BridgeStatus, error?: string): void {
  bridgeState.status = status;
  bridgeState.lastError = error;
  if (status === 'connected') {
    bridgeState.connectedAt = Date.now();
  }
  console.log(`[MCP Bridge] Status: ${status}${error ? `, Error: ${error}` : ''}`);
}

function getBridgeStatus(): BridgeState {
  return { ...bridgeState };
}

function isBridgeConnected(): boolean {
  return bridgeState.status === 'connected';
}

// ========== 核心 Bridge 函数 ==========

// 搜索请求
async function bridgeSearch(
  query: string,
  options?: { maxResults?: number; timeout?: number }
): Promise<NetworkSearchResponse> {
  const maxResults = options?.maxResults || 5;
  const timeout = options?.timeout || BRIDGE_CONFIG.timeout;

  bridgeState.requestCount++;
  console.log(`[MCP Bridge] bridgeSearch("${query}", maxResults=${maxResults})`);

  // 如果 Bridge 被阻断，直接返回
  if (bridgeState.status === 'blocked') {
    return {
      query,
      results: [],
      source: 'minimax_mcp_bridge',
      timestamp: Date.now(),
      degraded: true,
      error: 'MCP Bridge is blocked. Please check Hermes/OpenClaw gateway.',
    };
  }

  // 尝试 WebSocket 连接
  try {
    const result = await tryWebSocketSearch(query, maxResults, timeout);
    if (result.ok) {
      setBridgeStatus('connected');
      return result;
    }
  } catch (e: any) {
    console.warn(`[MCP Bridge] WebSocket failed: ${e.message}`);
  }

  // 尝试 HTTP Fallback
  try {
    const result = await tryHttpSearch(query, maxResults, timeout);
    if (result.ok) {
      setBridgeStatus('connected');
      return result;
    }
  } catch (e: any) {
    console.warn(`[MCP Bridge] HTTP failed: ${e.message}`);
  }

  // Bridge 不可用
  setBridgeStatus('disconnected', 'No bridge available');
  return {
    query,
    results: [],
    source: 'minimax_mcp_bridge',
    timestamp: Date.now(),
    degraded: true,
    error: 'BLOCKED_MCP_BRIDGE: Hermes/OpenClaw gateway not available. Please start Hermes gateway.',
  };
}

// WebSocket 搜索尝试
async function tryWebSocketSearch(
  query: string,
  maxResults: number,
  timeout: number
): Promise<NetworkSearchResponse> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('WebSocket timeout'));
    }, timeout);

    try {
      const ws = new WebSocket(BRIDGE_CONFIG.wsUrl);

      ws.onopen = () => {
        console.log('[MCP Bridge] WebSocket connected');
        setBridgeStatus('connecting');
        
        // 发送搜索请求
        ws.send(JSON.stringify({
          type: 'search',
          query,
          maxResults,
          provider: 'minimax_mcp',
        }));
      };

      ws.onmessage = (event) => {
        clearTimeout(timer);
        try {
          const data = JSON.parse(event.data);
          ws.close();
          
          if (data.error) {
            resolve({
              query,
              results: [],
              source: 'minimax_mcp_bridge',
              timestamp: Date.now(),
              degraded: true,
              error: data.error,
            });
            return;
          }

          resolve({
            query,
            results: data.results || [],
            source: 'minimax_mcp_bridge',
            timestamp: Date.now(),
            summary: `通过 MCP Bridge 找到 ${data.results?.length || 0} 条结果`,
          });
        } catch (e: any) {
          ws.close();
          reject(new Error(`Parse error: ${e.message}`));
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timer);
        ws.close();
        reject(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        clearTimeout(timer);
      };
    } catch (e: any) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

// HTTP 搜索尝试
async function tryHttpSearch(
  query: string,
  maxResults: number,
  timeout: number
): Promise<NetworkSearchResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(BRIDGE_CONFIG.httpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'search',
        query,
        maxResults,
        provider: 'minimax_mcp',
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return {
        query,
        results: [],
        source: 'minimax_mcp_bridge',
        timestamp: Date.now(),
        degraded: true,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      query,
      results: data.results || [],
      source: 'minimax_mcp_bridge',
      timestamp: Date.now(),
      summary: `通过 MCP Bridge 找到 ${data.results?.length || 0} 条结果`,
    };
  } catch (e: any) {
    clearTimeout(timer);
    throw e;
  }
}

// 测试 Bridge 连接
async function testBridge(): Promise<{ ok: boolean; error?: string; latency?: number }> {
  console.log('[MCP Bridge] Testing connection...');
  setBridgeStatus('connecting');

  const start = Date.now();

  try {
    // 尝试 HTTP 健康检查
    const response = await fetch(`${BRIDGE_CONFIG.httpUrl}/health`, {
      method: 'GET',
      timeout: 3000,
    });

    const latency = Date.now() - start;

    if (response.ok) {
      setBridgeStatus('connected');
      return { ok: true, latency };
    }

    setBridgeStatus('blocked', `HTTP ${response.status}`);
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (e: any) {
    const latency = Date.now() - start;
    setBridgeStatus('disconnected', e.message);
    return { ok: false, error: e.message };
  }
}

// 阻止 Bridge
function blockBridge(reason?: string): void {
  setBridgeStatus('blocked', reason);
  console.warn(`[MCP Bridge] Blocked: ${reason || 'No reason provided'}`);
}

// 取消阻止
function unblockBridge(): void {
  setBridgeStatus('disconnected');
  console.log('[MCP Bridge] Unblocked');
}

// ========== 导出 ==========

export const mcpBridge = {
  search: bridgeSearch,
  test: testBridge,
  getStatus: getBridgeStatus,
  isConnected: isBridgeConnected,
  block: blockBridge,
  unblock: unblockBridge,
  config: BRIDGE_CONFIG,
};

export type { BridgeState };
export default mcpBridge;
