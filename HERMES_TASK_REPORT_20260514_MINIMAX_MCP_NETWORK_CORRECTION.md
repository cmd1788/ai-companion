# AI Companion MiniMax MCP 联网能力 - 修正报告

## 执行时间: 2025-05-14 21:05

---

## 修正说明

### 原报告错误

原报告错误地将 **Bing API Key** 作为主联网方案，并认为 MiniMax 没有搜索 API。

### 修正内容

1. **移除所有硬编码 API Key** - `store.ts` 和 `mcpService.ts` 中的 `REAL_API_KEY` 已清空
2. **新增 MiniMax MCP Provider** - `minimax_mcp` 作为主联网方向
3. **新增 API Key 输入界面** - password 模式，masked 显示
4. **新增 Key 连接测试** - 在设置界面测试连通性
5. **新增 webSearch 函数** - mcpService.ts 中添加 MiniMax 搜索接口

---

## 安全性验证 ✅

| 检查项 | 结果 |
|--------|------|
| store.ts 硬编码 Key | ❌ 已清空 → ✅ |
| mcpService.ts 硬编码 Key | ❌ 已移除 → ✅ |
| 日志中无 API Key | ✅ 无泄露 |
| Key 输入 password 模式 | ✅ 已实现 |
| Key 不上传 Git | ✅ 设置界面填写 |

---

## Provider 架构

```
networkSettings.provider 支持:
├── minimax_mcp  ← 主方向 (MiniMax 联网搜索)
├── mock         ← 测试模式
├── fetch        ← 浏览器直接请求
└── disabled     ← 关闭
```

---

## 分层状态

```
UNIT_LEVEL:             ✅ PASSED
  ├── runtimeTypes.ts NetworkProvider/Source ✅
  ├── mcpService.ts webSearch() ✅
  ├── browserAdapter.ts searchMiniMaxMCP() ✅
  └── runtimeAdapter.ts minimax_mcp 分支 ✅

INTEGRATION_LEVEL:      ✅ PASSED
  ├── ChatPanel → runtime.network ✅
  ├── store.ts networkSettings ✅
  ├── SettingsPanel MiniMax Key 输入 ✅
  └── 联网触发关键词检测 ✅

BROWSER_RUNTIME_LEVEL:  ✅ PASSED
  ├── E2E 16步测试 (Mock) ✅ 15/15 PASS
  ├── 联网标识显示 ✅
  └── localStorage 日志 ✅

TAURI_RUNTIME_LEVEL:    ⚠️ PARTIAL
  ├── Rust web_search command ✅ 编译通过
  ├── EXE 生成 ✅ 17.2 MB
  └── MiniMax MCP Bridge 🔴 未实现

MINIMAX_MCP_LEVEL:      🔴 BLOCKED_MCP_BRIDGE
  ├── MiniMax REST API 搜索端点 ✅ 测试过
  ├── 端点返回 404 ❌
  └── MCP Bridge 方案: 待确认

REAL_NETWORK_LEVEL:     🔴 BLOCKED_MCP_BRIDGE
  ├── MiniMax 搜索 API: 404 ❌
  ├── 需要 Coding Agent / OpenClaw MCP Bridge
  └── 或实现国内搜索 API (百度/360)

KEY_SECURITY_LEVEL:     ✅ PASSED
  ├── 硬编码 Key 已清空 ✅
  ├── API Key 从设置读取 ✅
  ├── 日志无 Key 泄露 ✅
  └── password 输入模式 ✅

E2E_LEVEL:              ⚠️ PARTIAL
  ├── Browser Mock ✅ 15/15 PASS
  └── Tauri Real ⏳ 未执行

OVERALL:                ⚠️ PARTIAL
```

---

## MiniMax MCP 搜索能力确认

### 测试结果

| 端点 | 方法 | 结果 |
|------|------|------|
| `https://api.minimax.chat/v1/search` | POST | 404 ❌ |
| `https://api.minimax.chat/v1/web_search` | POST | 404 ❌ |
| `https://api.minimax.chat/v1/coding/agent` | POST | 404 ❌ |
| `https://api.minimax.chat/v1/models` | GET | 401 (需要 Key) ✅ |

**结论**: MiniMax **REST API** 没有搜索端点。"联网搜索 MCP" 可能通过以下方式提供:

1. **Coding Agent / OpenClaw** - 通过 Agent 工具调用搜索能力
2. **MiniMax MCP Server** - 独立的 MCP 服务 (需要单独部署)
3. **MiniMax 套餐特定功能** - 可能需要套餐支持联网搜索

---

## 阻塞项分析

| 阻塞项 | 类型 | 说明 |
|--------|------|------|
| MiniMax 搜索 REST API | API 不存在 | v1/search 返回 404 |
| MCP Bridge | 未实现 | 需要独立的 bridge 方案 |
| Tauri E2E | 未测试 | Preview 模式无 Tauri runtime |

---

## 已实现功能

### 1. API Key 安全存储
```typescript
// store.ts
const REAL_API_KEY = ''; // 不再硬编码

// mcpService.ts  
function getApiKey(): string {
  return useAppStore.getState().aiConfig?.apiKey || '';
}
```

### 2. MiniMax MCP Provider
```typescript
// runtimeTypes.ts
export type NetworkProvider = 'minimax_mcp' | 'fetch' | 'mock' | 'disabled';
```

### 3. 设置界面 Key 输入
- password 模式输入
- masked 状态显示
- 连接测试按钮
- 日志显示

---

## 下一步

### 激活 MiniMax 联网搜索需要:

1. **确认 MiniMax 套餐支持**
   - 联系 MiniMax 确认是否有联网搜索 MCP 工具
   - 确认 Coding Agent / OpenClaw 的搜索能力调用方式

2. **实现 MCP Bridge**
   - 如果 MiniMax 有 MCP Server，配置连接
   - 如果需要 Agent 方式，修改 mcpService.webSearch()

3. **Tauri E2E 测试**
   - 运行 EXE 测试真实联网流程

---

## Commit

```bash
# 新增更改
M  apps/desktop/src/mcpService.ts       # 移除硬编码 Key，新增 webSearch
M  apps/desktop/src/store.ts           # 清空 REAL_API_KEY
M  apps/desktop/src/runtimeTypes.ts    # minimax_mcp provider
M  apps/desktop/src/runtimeAdapter.ts   # minimax_mcp 分支
M  apps/desktop/src/browserAdapter.ts  # searchMiniMaxMCP
M  apps/desktop/src/SettingsPanel.tsx  # Key 输入 UI
```

---

## 报告输出

```
D:/AI文件/hermes_file/log/HERMES_TASK_REPORT_20260514_MINIMAX_MCP_NETWORK_CORRECTION.md
```

---

**最终状态**

```
OVERALL: ⚠️ PARTIAL

阻塞原因: BLOCKED_MCP_BRIDGE
修复方案: 确认 MiniMax 联网搜索 MCP 工具的实现方式
```