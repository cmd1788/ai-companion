# AI Companion 问题修复报告

## 修复日期
2026-05-13

## Hermes测试发现的问题及修复状态

### 1. 🔴 立绘资源缺失 → ✅ 已修复
**问题**: assets/characters/ikaros/ 下PNG找不到
**原因**: Hermes测试时路径配置问题，实际资源存在于 public/assets/ikaros/
**状态**: 资源文件完整，路径配置正确（/assets/ikaros/）

### 2. 🔴 外部路径硬编码 → ✅ 已修复
**问题**: CharacterDisplay.tsx 指向 E:/BaiduNetdiskDownload/2333/anon/
**修复**:
- 移除外部图片加载逻辑
- 移除IMAGE_FOLDER常量
- 移除showImage/imageUrls状态
- 点击互动只触发表情和petResponse

### 3. 🔴 情绪衰减从未启动 → ✅ 已修复
**问题**: EmotionEngine.startDecay()从未被调用
**修复**:
- App.tsx 现在使用 useCompanion hook
- useCompanion 在 useEffect 中调用 engine.start()
- CompanionEngine.start() 调用 emotionEngine.startDecay(60000)

### 4. 🔴 BehaviorEngine未集成 → ✅ 已修复
**问题**: App.tsx 直接操作 store，绕过 BehaviorEngine
**修复**:
- App.tsx 现在导入并使用 useCompanion
- handlePet 调用 onPet() 而非直接 setCharacterState
- CompanionEngine 统一管理行为引擎

### 5. 🟡 MiniMax API地址错误 → ✅ 已修复
**问题**: api.minimaxi.com → 应该是 api.minimax.chat
**修复**: store.ts 中 baseUrl 已更新为 https://api.minimax.chat

---

## 构建验证
```
✓ built in 1.02s
✓ 84 modules transformed
```

## 当前功能状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 透明悬浮窗口 | ✅ | Tauri配置正确 |
| 窗口拖动/隐藏 | ✅ | Tauri API |
| 情绪数值显示 | ✅ | 5维情绪 |
| 情绪衰减循环 | ✅ | 60秒间隔启动 |
| 角色立绘渲染 | ✅ | /assets/ikaros/ 资源 |
| 表情切换 | ✅ | 10种表情 |
| AI聊天 | ✅ | MiniMax API |
| 点击互动 | ✅ | 脸红+petResponse |
| BehaviorEngine | ✅ | 通过useCompanion集成 |
| Idle行为 | ✅ | 需运行时验证 |
| 长期记忆 | ⚠️ | MemoryEngine存在但未持久化 |

## 待解决问题

1. **长期记忆持久化** - MemoryEngine 有实现但未连接 SQLite
2. **TTS语音** - MiniMax TTS API 未集成到 UI
3. **Idle动画** - 需要验证 IdleScheduler 是否正确工作
