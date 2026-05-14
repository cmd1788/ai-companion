// MiniMax Agent Runtime
// 走 Agent Runtime / MCP / OpenClaw Gateway

import type { AgentResult, BridgeStatus, SearchOptions, SearchResult, AgentLogEntry } from './agentTypes';

// OpenClaw Gateway 配置
const BRIDGE_CONFIG = {
  wsUrl: 'ws://127.0.0.1:18789',
  httpUrl: 'http://127.0.0.1:18789',
  timeout: 5000,
};

// Agent 日志
const agentLogs: AgentLogEntry[] = [];

function logAgent(method: string, target: string, status: 'connected' | 'blocked' | 'failed', error?: string, duration = 0) {
  agentLogs.push({ method, target, status, error, duration, timestamp: Date.now() });
  if (agentLogs.length > 100) agentLogs.shift();
}

function getAgentLogs(): AgentLogEntry[] {
  return [...agentLogs];
}

function clearAgentLogs() {
  agentLogs.length = 0;
}

// 检查 Gateway 连接状态
async function checkGatewayStatus(): Promise<BridgeStatus> {
  const startTime = Date.now();
  
  try {
    // 尝试 TCP 连接检测
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BRIDGE_CONFIG.timeout);
    
    const response = await fetch(`${BRIDGE_CONFIG.httpUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return {
        connected: true,
        gateway: '127.0.0.1',
        port: 18789,
        latency,
      };
    }
    
    return {
      connected: false,
      gateway: '127.0.0.1',
      port: 18789,
      error: `HTTP ${response.status}`,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      gateway: '127.0.0.1',
      port: 18789,
      error: errorMessage.includes('abort') ? 'Connection timeout' : errorMessage,
    };
  }
}

// MiniMax Agent 方法
export const minimaxAgent = {
  // 测试 Bridge 连接
  testBridge: async (): Promise<AgentResult<BridgeStatus>> => {
    const startTime = Date.now();
    
    try {
      const status = await checkGatewayStatus();
      const duration = Date.now() - startTime;
      
      if (status.connected) {
        logAgent('testBridge', '127.0.0.1:18789', 'connected', undefined, duration);
        return {
          ok: true,
          data: status,
          source: 'minimax_agent',
          timestamp: Date.now(),
        };
      } else {
        logAgent('testBridge', '127.0.0.1:18789', 'blocked', status.error, duration);
        return {
          ok: false,
          error: `BLOCKED_GATEWAY_CONNECT: ${status.error}`,
          errorCode: 'BLOCKED_GATEWAY_CONNECT',
          source: 'minimax_agent',
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logAgent('testBridge', '127.0.0.1:18789', 'failed', errorMessage, duration);
      return {
        ok: false,
        error: `BLOCKED_GATEWAY_CONNECT: ${errorMessage}`,
        errorCode: 'BLOCKED_GATEWAY_CONNECT',
        source: 'minimax_agent',
        timestamp: Date.now(),
      };
    }
  },
  
  // 获取状态
  getStatus: async (): Promise<AgentResult<{ gateway: BridgeStatus; mcpAvailable: boolean }>> => {
    const gatewayStatus = await checkGatewayStatus();
    
    return {
      ok: gatewayStatus.connected,
      data: {
        gateway: gatewayStatus,
        mcpAvailable: gatewayStatus.connected, // 如果 Gateway 通，认为 MCP 可用
      },
      error: gatewayStatus.connected ? undefined : `Gateway disconnected: ${gatewayStatus.error}`,
      errorCode: gatewayStatus.connected ? undefined : 'BLOCKED_GATEWAY_CONNECT',
      source: 'minimax_agent',
      timestamp: Date.now(),
    };
  },
  
  // 搜索 (通过 OpenClaw Gateway / MiniMax MCP)
  search: async (query: string, options?: SearchOptions): Promise<AgentResult<SearchResult>> => {
    const startTime = Date.now();
    
    // 先检查 Gateway 状态
    const status = await checkGatewayStatus();
    
    if (!status.connected) {
      const duration = Date.now() - startTime;
      logAgent('search', '127.0.0.1:18789', 'blocked', 'Gateway not connected', duration);
      return {
        ok: false,
        error: 'BLOCKED_GATEWAY_CONNECT: OpenClaw Gateway not running on port 18789',
        errorCode: 'BLOCKED_GATEWAY_CONNECT',
        source: 'minimax_agent',
        timestamp: Date.now(),
      };
    }
    
    // Gateway 连接但需要实际调用 MCP Tool
    // 这里暂时返回 BLOCKED_MCP_TOOL_NOT_AVAILABLE，因为需要实际的 MCP Bridge 实现
    const duration = Date.now() - startTime;
    logAgent('search', '127.0.0.1:18789', 'blocked', 'MCP Tool not implemented', duration);
    return {
      ok: false,
      error: 'BLOCKED_MCP_TOOL_NOT_AVAILABLE: MiniMax MCP search tool not configured',
      errorCode: 'BLOCKED_MCP_TOOL_NOT_AVAILABLE',
      source: 'minimax_agent',
      timestamp: Date.now(),
    };
  },
  
  // 工具方法
  getLogs: getAgentLogs,
  clearLogs: clearAgentLogs,
  getBridgeConfig: () => ({ ...BRIDGE_CONFIG }),
};

// Agent Runtime 导出
export const agentRuntime = {
  minimax: minimaxAgent,
  getLogs: getAgentLogs,
  clearLogs: clearAgentLogs,
};
