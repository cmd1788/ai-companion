# AI Companion MiniMax 独立联网功能备份报告

**生成时间**: 2026-05-17
**OVERALL: BACKUP_PUSHED**

---

## 1. 当前备份时间

2026-05-17

---

## 2. 项目根目录

```
C:\Users\asus\ai-companion
```

---

## 3. Git 当前分支

```
* master
```

---

## 4. Git remote

```
origin  https://github.com/cmd1788/ai-companion.git (fetch)
origin  https://github.com/cmd1788/ai-companion.git (push)
```

---

## 5. commit hash

```
6fd94aa
```

**Commit 信息**: `backup: minimax web search independent provider`
**9 files changed**, 501 insertions(+), 70 deletions(-)

---

## 6. Push 是否成功

**✅ SUCCESS**

```
be2818b..6fd94aa  master -> master
```

本地 commit 已推送到 GitHub。

---

## 7. 当前总体状态

**PARTIAL_MOCK_ONLY** - MiniMax 搜索主链路已实现，实机完整闭环未验证。

---

## 8. 已完成联网改动

### 核心目标

AI Companion 不再依赖 OpenClaw Gateway (127.0.0.1:18789)，使用 MiniMax API Key 通过 MCP stdio 接口实现联网搜索。

### 架构对比

**旧默认链路** (废弃):
```
AI Companion
→ OpenClaw Gateway (127.0.0.1:18789)
→ Hermes MCP Bridge
→ provider=mock
```

**新默认链路**:
```
AI Companion
→ runtimeAdapter.search()
→ tauriAdapter.webSearch()
→ Rust web_search command
→ uvx minimax-coding-plan-mcp
→ JSON-RPC stdio
→ MiniMax web_search
→ 返回 organic[] 搜索结果
→ 注入 AI prompt
→ MiniMax 对话模型生成回答
```

---

## 9. 涉及代码路径

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `apps/desktop/src/store.ts` | 新增 | 设置迁移逻辑 |
| `apps/desktop/src/runtime/runtimeTypes.ts` | 新增 | minimax_web_search provider 类型 |
| `apps/desktop/src/runtime/runtimeAdapter.ts` | 修改 | 搜索路由逻辑 |
| `apps/desktop/src/runtime/tauriAdapter.ts` | 修改 | api_key 参数名修复 |
| `apps/desktop/src/runtime/browserAdapter.ts` | 修改 | source 命名调整 |
| `apps/desktop/src/SettingsPanel.tsx` | 新增 | MiniMax Web Search 选项 + 重置按钮 |
| `apps/desktop/src-tauri/src/lib.rs` | 新增 | Rust MCP stdio 客户端 |
| `apps/desktop/src/ChatPanel.tsx` | 修改 | 错误诊断增强 |
| `apps/desktop/src/proactiveChat.ts` | 修改 | 错误诊断增强 |

---

## 10. 每个文件改了什么

### 10.1 `apps/desktop/src/store.ts`

**改动**: +133 行

```
- enableWebSearch 默认值: false → true
- provider 默认值: 'mock' → 'minimax_web_search'
- 新增 settingsVersion: 2
- 新增 migrateNetworkSettings() 函数
- 新增 resetNetworkSettings() store action
- 新增 LEGACY_BRIDGE_PROVIDERS 常量
- localStorage 旧配置自动迁移到 minimax_web_search
```

**关键代码片段**:
```typescript
// 迁移旧 bridge/mock provider 到 minimax_web_search
function migrateNetworkSettings(settings: NetworkSettings): NetworkSettings {
  if (settings.settingsVersion >= 2) return settings;
  
  const legacyProviders = ['mock', 'minimax_mcp_bridge', 'openclaw_bridge', 'mcp_bridge', 'browser_mock'];
  
  if (legacyProviders.includes(settings.provider)) {
    console.log('[NetworkSettings] NETWORK_SETTINGS_MIGRATED', {
      old_provider: settings.provider,
      new_provider: 'minimax_web_search',
      enableWebSearch: true,
    });
  }
  
  return {
    ...settings,
    enableWebSearch: settings.enableWebSearch ?? true,
    provider: legacyProviders.includes(settings.provider) ? 'minimax_web_search' : settings.provider,
    settingsVersion: 2,
  };
}
```

### 10.2 `apps/desktop/src/runtime/runtimeTypes.ts`

**改动**: 新增 provider 类型

```typescript
export type NetworkProvider = 
  | 'minimax_web_search'  // 新增 - MiniMax MCP stdio 搜索
  | 'minimax'            // 保留 - MiniMax 原生 API
  | 'fetch'              // 保留 - fetch API
  | 'mock'               // 保留 - 测试用
  | 'disabled'           // 保留 - 禁用联网
  | 'minimax_mcp_bridge' // 降级 - 可选，非默认
  | 'minimax_agent'      // 保留
  | 'openclaw_bridge';    // 降级 - 可选，非默认
```

### 10.3 `apps/desktop/src/runtime/runtimeAdapter.ts`

**改动**: +18 行

```typescript
// 添加 getSettings 导入 (使用 useAppStore.getState())
import { useAppStore } from '../store';

// search() 方法中添加 provider 判断
const provider = networkSettings?.provider || 'minimax_web_search';

if (provider !== 'mock' && provider !== 'disabled') {
  // 走 minimax_web_search / minimax / minimax_mcp_bridge 路由
  const apiKey = useAppStore.getState()?.apiSettings?.apiKey;
  const result = await tauriAdapter.webSearch(query, maxResults, apiKey);
  // ...
}
```

### 10.4 `apps/desktop/src/runtime/tauriAdapter.ts`

**改动**: 1 行 - apiKey → api_key

```typescript
// 修复参数名匹配 Rust 期望的 snake_case
const result = await invokeSafe<RustSearchResult>('web_search', { 
  query, 
  api_key: apiKey || null  // apiKey → api_key
});
```

### 10.5 `apps/desktop/src/runtime/browserAdapter.ts`

**改动**: source 命名调整

```typescript
// 浏览器 fallback 时 source 标签调整
source: provider === 'minimax_web_search' 
  ? 'minimax_web_search' 
  : 'browser_adapter',
```

### 10.6 `apps/desktop/src/SettingsPanel.tsx`

**改动**: +50 行

```
- 新增 "MiniMax Web Search" 供应商选项
- 新增 "重置联网设置" 按钮
- OpenClaw Bridge 降级为可选
- Mock 标记为 "测试模式"
```

**重置按钮功能**:
```typescript
<button onClick={() => {
  useAppStore.getState().resetNetworkSettings();
  alert('联网设置已重置为 MiniMax Web Search');
}}>
  重置联网设置
</button>
```

### 10.7 `apps/desktop/src-tauri/src/lib.rs`

**改动**: +204 行

```rust
// web_search command 实现
#[tauri::command]
pub async fn web_search(query: String, api_key: Option<String>) 
    -> Result<Vec<SearchResult>, String> {
    
    // 构建 MCP stdio 客户端
    let mut child = Command::new(
        "C:\\Users\\asus\\AppData\\Roaming\\Python\\Python312\\Scripts\\uvx.exe"
    )
    .arg("minimax-coding-plan-mcp")
    .env("MINIMAX_API_KEY", api_key.unwrap_or_default())
    .env("MINIMAX_API_HOST", "https://api.minimax.chat")
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .spawn()
    .map_err(|e| e.to_string())?;

    // JSON-RPC 握手协议
    // 1. initialize
    // 2. notifications/initialized  
    // 3. tools/list
    // 4. tools/call (minimax_web_search)
    
    // 解析 organic[] 数组返回 SearchResult
    let organic = result["organic"].as_array()
        .ok_or("No organic results")?;
    
    Ok(organic.iter().map(|item| SearchResult {
        title: item["title"].as_str().unwrap_or("").to_string(),
        link: item["link"].as_str().unwrap_or("").to_string(),
        snippet: item["snippet"].as_str().unwrap_or("").to_string(),
    }).collect())
}
```

**不输出 Key 的日志**:
```rust
println!("[WebSearch] Starting MiniMax MCP stdio search for: {}", query);
println!("[WebSearch] MCP results count: {}", results.len());
// 不打印 MINIMAX_API_KEY
```

### 10.8 `apps/desktop/src/ChatPanel.tsx`

**改动**: +错误诊断增强

```typescript
// 新增 MODEL_DEBUG 日志
console.log('[Chat] MODEL_DEBUG', {
  response_ok: response.ok,
  status: response.status,
  choices_length: choices.length,
  content_length: content.length,
  reasoning_content_length: reasoningContent.length,
  finish_reason,
  error_message: error.message,
});

// 新增错误类型诊断
- MODEL_API_ERROR: API 调用失败
- MODEL_EMPTY_CHOICES: choices 为空
- MODEL_EMPTY_CONTENT: content 和 reasoningContent 都为空
```

### 10.9 `apps/desktop/src/proactiveChat.ts`

**改动**: +错误诊断增强

```typescript
// 新增 PROACTIVE_MODEL_API_KEY_MISSING
// 新增 PROACTIVE_MODEL_EMPTY_CONTENT
```

---

## 11. 当前仍未解决的问题

### 问题 1: Tauri 实机完整闭环未验证

**现象**: 
- React 根 div 上的 `win.startDragging()` / `onMouseDown` 拖拽逻辑覆盖交互区域
- 设置面板无法可靠关闭
- 按钮点击被拖拽事件拦截
- 无法稳定完成 "发送搜索 → AI 回复" 完整实机闭环

**证据**:
- 截图 `09_network_tab2.png`: 设置面板停留在联网设置页
- 截图 `14_gear_toggle.png`: 无法关闭设置面板
- Vision AI 确认 "🌐 已联网搜索" 已触发，但 UI 阻塞

**根因**: 
```
React App.tsx 根 div 上绑定 onMouseDown → win.startDragging()
这会拦截所有子元素的鼠标事件
无论 e.stopPropagation() 如何设置
```

**建议**:
1. 移除根 div 的 onMouseDown 拖拽
2. 改为标题栏区域拖拽
3. 对按钮、输入框、select、switch 添加 stopPropagation
4. 重新做完整实机搜索测试

### 问题 2: 网络阻塞导致 GitHub Push 失败

**现象**:
```
fatal: unable to access 'https://github.com/cmd1788/ai-companion.git/':
Recv failure: Connection was reset
```

**影响**: 本地 commit `6fd94aa` 已就绪，等待网络恢复后可 push。

---

## 12. 下一步建议

### 优先级 1: 修复 Tauri UI 拖拽阻塞

**文件**: `apps/desktop/src/App.tsx`

```typescript
// 当前 (有问题)
<div onMouseDown={(e) => {
  e.preventDefault();
  win.startDragging();
}}>

// 建议修复为
// 1. 完全移除根 div 的 onMouseDown
// 2. 使用 Tauri 标题栏或在特定区域拖拽
// 3. 对按钮等交互元素添加 onMouseDown={(e) => e.stopPropagation()}
```

### 优先级 2: 实机搜索闭环测试

修复拖拽后，执行以下测试:
1. 打开设置 → 确认 provider = minimax_web_search
2. 输入: "搜索 GitHub JucieOvo 项目"
3. 确认 🌐 已联网搜索 系统消息
4. 确认 AI 回复包含真实搜索结果摘要
5. 截图保存

### 优先级 3: GitHub Push

网络恢复后执行:
```bash
cd C:\Users\asus\ai-companion
git push origin master
```

---

## 13. 风险提醒

### 风险 1: MiniMax MCP 包依赖 uvx

当前依赖 `uvx minimax-coding-plan-mcp`，需要:
- `uvx` 在 PATH 中或使用完整路径
- `minimax-coding-plan-mcp` 包可用
- MINIMAX_API_KEY 正确配置

### 风险 2: settingsVersion 迁移不可逆

当前 migration 将所有旧 provider 迁移到 `minimax_web_search`，如果用户需要恢复到 OpenClaw Bridge，需要手动在设置中选择。

### 风险 3: Tauri 拖拽问题影响所有按钮

这个问题影响整个应用的按钮点击，不只是设置面板。如果不修复，用户无法正常使用应用。

---

## 14. 已验证内容

| 验证项 | 状态 | 证据 |
|--------|------|------|
| MiniMax MCP Terminal 测试 | ✅ | uvx 返回 organic 数组 |
| uvx 完整路径配置 | ✅ | C:\Users\asus\AppData\Roaming\Python\Python312\Scripts\uvx.exe |
| MINIMAX_API_HOST 设置 | ✅ | https://api.minimax.chat |
| Rust MCP 客户端实现 | ✅ | lib.rs +204 行 |
| pnpm build | ✅ | Frontend 构建通过 |
| cargo build | ✅ | Rust 构建通过 |
| settingsVersion=2 | ✅ | store.ts |
| migrateNetworkSettings | ✅ | store.ts |
| resetNetworkSettings | ✅ | store.ts |
| MiniMax Web Search 选项 | ✅ | SettingsPanel.tsx |
| 重置联网设置按钮 | ✅ | SettingsPanel.tsx |
| provider 默认迁移 | ✅ | mock/bridge → minimax_web_search |
| 不访问 127.0.0.1:18789 | ✅ | 只有用户选择才连接 |
| api_key 参数修复 | ✅ | tauriAdapter.ts |

---

## 15. 提交文件清单

```
apps/desktop/src-tauri/src/lib.rs
apps/desktop/src/ChatPanel.tsx
apps/desktop/src/SettingsPanel.tsx
apps/desktop/src/proactiveChat.ts
apps/desktop/src/runtime/browserAdapter.ts
apps/desktop/src/runtime/runtimeAdapter.ts
apps/desktop/src/runtime/runtimeTypes.ts
apps/desktop/src/runtime/tauriAdapter.ts
apps/desktop/src/store.ts
```

**未提交** (已还原):
- `apps/desktop/tsconfig.tsbuildinfo` - 构建缓存，不需要提交

---

## 16. .gitignore 确认

```
node_modules/
dist/
target/
```

**无敏感文件泄露风险**。
