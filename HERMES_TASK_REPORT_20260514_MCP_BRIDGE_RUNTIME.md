# AI Companion MCP Bridge Runtime - 分层状态报告

## 执行时间: 2025-05-14 21:20

---

## MCP Bridge 架构

### 调用链

```
AI Companion
    ↓
runtime.network.search()
    ↓
mcpBridge.search()
    ↓
Hermes/OpenClaw Gateway
    ↓
MiniMax MCP Tool
    ↓
结构化搜索结果
```

### Bridge 通讯方式

| 优先级 | 方式 | 端点 |
|--------|------|------|
| 1 | WebSocket | ws://localhost:8080/bridge |
| 2 | HTTP | http://localhost:8080/bridge |
| 3 | Tauri IPC | (预留) |

### Bridge 返回格式

```typescript
{
  ok: boolean,
  source: "minimax_mcp_bridge",
  query: string,
  results: [
    { title, url, snippet, source }
  ],
  error?: string,
  degraded?: boolean,
  timestamp: number
}
```

---

## 新增模块

### apps/desktop/src/runtime/mcpBridge.ts

```typescript
export const mcpBridge = {
  search: bridgeSearch,      // 搜索请求
  test: testBridge,          // 测试连接
  getStatus: getBridgeStatus, // 获取状态
  isConnected: isBridgeConnected, // 连接状态
  block: blockBridge,        // 阻止 Bridge
  unblock: unblockBridge,    // 取消阻止
};
```

### Bridge 状态

```typescript
type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'blocked';
```

---

## 分层状态

```
UNIT_LEVEL:             ✅ PASSED
  ├── mcpBridge.ts ✅
  ├── runtimeTypes.ts (minimax_mcp_bridge) ✅
  ├── runtimeAdapter.ts (bridge 分支) ✅
  ├── browserAdapter.ts (searchMiniMaxMCP) ✅
  └── store.ts (REAL_API_KEY 清空) ✅

INTEGRATION_LEVEL:      ✅ PASSED
  ├── ChatPanel → runtime.network ✅
  ├── SettingsPanel → mcpBridge UI ✅
  ├── Provider 选择 → minimax_mcp_bridge ✅
  └── networkSettings → store ✅

BROWSER_RUNTIME_LEVEL: ✅ PASSED
  ├── mcpBridge 模块加载 ✅
  ├── Provider 选项存在 ✅
  ├── Mock E2E 15/15 PASS ✅
  └── localStorage 日志 ✅

TAURI_RUNTIME_LEVEL:   ⚠️ PARTIAL
  ├── Rust web_search command ✅
  ├── EXE 生成 ✅
  └── MiniMax MCP Bridge 调用 🔴 未实现

MCP_BRIDGE_LEVEL:      ⚠️ PARTIAL
  ├── mcpBridge.ts 模块 ✅
  ├── Hermes Gateway 连接 🔴 BLOCKED
  ├── WebSocket 尝试 ✅
  ├── HTTP Fallback ✅
  └── Bridge 状态机 ✅

MINIMAX_MCP_LEVEL:     ⚠️ PARTIAL
  ├── MCP Tool 接口设计 ✅
  ├── Bridge 调用链 ✅
  └── MiniMax MCP Tool 🔴 未接入

REAL_NETWORK_LEVEL:     🔴 BLOCKED_MCP_BRIDGE
  ├── Bridge 不可用
  └── Hermes Gateway 未运行

KEY_SECURITY_LEVEL:    ✅ PASSED
  ├── API Key 不硬编码 ✅
  ├── 日志无 Key 泄露 ✅
  └── password 输入模式 ✅

E2E_LEVEL:             ⚠️ PARTIAL
  ├── Browser Mock ✅
  ├── MCP Bridge UI ✅
  └── Tauri Real ⏳

OVERALL:               ⚠️ PARTIAL
```

---

## 阻塞项

| 阻塞项 | 类型 | 说明 |
|--------|------|------|
| Hermes/OpenClaw Gateway | 服务未运行 | ws://localhost:8080 未启动 |
| MiniMax MCP Tool | 未接入 | 需要配置 MCP Server |

---

## 激活 MCP Bridge

### 1. 启动 Hermes Gateway

```bash
# 启动 Hermes OpenClaw Gateway
hermes gateway start --port 8080
```

### 2. 配置 MiniMax MCP Server

在 Hermes 配置中添加 MiniMax MCP:

```yaml
mcpServers:
  minimax:
    command: npx
    args: ["@minimax/mcp-server"]
    env:
      MINIMAX_API_KEY: "${MINIMAX_API_KEY}"
```

### 3. 在 AI Companion 中启用

1. 打开设置 → 🌐 联网
2. 选择 "🔗 MiniMax MCP Bridge"
3. 填写 MiniMax API Key
4. 点击 "测试 Bridge"

---

## 设置界面更新

### Provider 选择

```
🔗 MiniMax MCP Bridge（推荐）
🔮 Mock
🌍 Browser Fetch
❌ 禁用
```

### Bridge 状态显示

```
状态: [未连接] / [连接中] / [已连接] / [已阻止]
网关: ws://localhost:8080/bridge
HTTP: http://localhost:8080/bridge
```

### 测试按钮

- "测试 Bridge" - 测试 Hermes Gateway 连接
- "🔍 测试 MCP Bridge" - 测试完整搜索流程

---

## 已验证功能

| 功能 | 状态 |
|------|------|
| mcpBridge.ts 模块 | ✅ |
| minimax_mcp_bridge provider | ✅ |
| SettingsPanel UI | ✅ |
| runtimeAdapter 集成 | ✅ |
| E2E Browser 测试 | ✅ |
| API Key 安全存储 | ✅ |

---

## 下一步

1. **启动 Hermes Gateway** - 使 ws://localhost:8080 可用
2. **配置 MiniMax MCP** - 在 Hermes 中添加 MCP Server
3. **测试 Bridge 连接** - 验证端到端搜索
4. **Tauri E2E** - 在 EXE 中测试真实联网

---

## 报告

```
D:/AI文件/hermes_file/log/HERMES_TASK_REPORT_20260514_MCP_BRIDGE_RUNTIME.md
```

---

**最终状态**

```
OVERALL: ⚠️ PARTIAL

阻塞原因: Hermes/OpenClaw Gateway 未运行
修复方案: 启动 Hermes Gateway + 配置 MiniMax MCP Server
```
