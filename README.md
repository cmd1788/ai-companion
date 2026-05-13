# AI Companion 使用指南

## 项目概述

**AI Companion** 是一个人格化AI桌面副官系统，不是普通桌宠，而是具备情绪、记忆、自主行为能力的AI伴侣。

---

## 快速开始

### 环境要求
- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Tauri CLI

### 安装运行
```bash
cd C:\Users\asus\ai-companion
pnpm install
pnpm dev
```

### 构建生产版本
```bash
pnpm build
```

---

## 使用方法

### 1. 窗口操作
- **拖动窗口**：在标题栏按住拖动
- **隐藏窗口**：点击 × 按钮
- **打开设置**：点击 ⚙️ 按钮
- **打开聊天**：点击 💬 按钮

### 2. 与AI对话
- 在输入框输入文字，按发送按钮或回车
- AI会结合角色人格和当前情绪进行回复

### 3. 互动功能
- **点击角色**：触发脸红效果 + 随机回复
- **聊天互动**：影响角色情绪状态

### 4. 设置面板
- 配置AI服务商（MiniMax）
- 配置API Key
- 选择模型
- 调整生成参数

---

## 已实现功能

### Phase 1 ✅ 完成

| 功能 | 状态 | 说明 |
|------|------|------|
| 透明悬浮窗口 | ✅ | Tauri窗口配置 |
| PNG分层角色 | ✅ | assets/ikaros |
| AI聊天 | ✅ | MiniMax API集成 |
| 基础人格 | ✅ | CharacterEngine |
| 基础情绪 | ✅ | EmotionEngine |
| 设置面板 | ✅ | SettingsPanel |

### Phase 2 ✅ 完成（刚刚完善）

| 功能 | 状态 | 说明 |
|------|------|------|
| 连续情绪值 | ✅ | 5维情绪：happiness/fatigue/loneliness/stress/affection |
| 情绪联动 | ✅ | 开心降低压力，疲劳增加压力等8条规则 |
| 情绪波动 | ✅ | 自然起伏，30秒周期，15%幅度 |
| 自动表情切换 | ✅ | 根据情绪值自动切换10种表情 |
| Idle状态机 | ✅ | 6种Idle行为：lookAround/idleTalk/sleepy/shy/excited/bored |
| 情绪衰减 | ✅ | 10秒间隔自动衰减 |

---

## 核心模块

### EmotionEngine（情绪引擎）

**情绪维度：**
```
happiness   - 开心值 (0-100)
fatigue    - 疲劳值 (0-100)
loneliness - 孤独值 (0-100)
stress     - 压力值 (0-100)
affection  - 亲密度 (0-100)
```

**情绪事件：**
| 事件 | 效果 |
|------|------|
| user_greeting | happiness +10, loneliness -5 |
| user_praise | happiness +15, affection +10 |
| user_criticize | happiness -10, stress +10 |
| user_bye | happiness -5, loneliness +15 |
| user_pet | happiness +10, fatigue -5, affection +15 |
| idle_too_long | fatigue +3, loneliness +5 |

**情绪联动规则：**
- happiness > 60 → stress -0.5, loneliness -0.3
- loneliness > 60 → affection +0.3
- fatigue > 60 → stress +0.3
- affection > 60 → happiness +0.3, loneliness -0.4

**表情计算规则：**
| 条件 | 表情 |
|------|------|
| fatigue > 75 | sleepy |
| stress > 70 | angry |
| loneliness > 70 | sad |
| happiness > 70 | happy |
| happiness > 55 | excited |
| affection > 70 | shy |
| fatigue > 50 | tired |
| loneliness > 55 | sad |
| stress > 50 | confused |
| 默认 | neutral |

### AnimationEngine（动画引擎）

**动画效果：**
- 呼吸动画（scale缓动）
- 漂浮动画（translateY正弦波）
- 眨眼动画（3秒周期）
- 表情切换（opacity过渡）

**支持表情：**
neutral, happy, sad, angry, surprised, tired, shy, confused, sleepy, excited

**状态映射：**
| CharacterState | Expression |
|----------------|------------|
| idle | neutral |
| talking | surprised |
| thinking | confused |
| happy | happy |
| sad | sad |
| angry | angry |
| sleeping | sleepy |
| excited | excited |
| listening | neutral |
| surprised | surprised |

### BehaviorEngine（行为引擎）

**状态列表：**
idle, talking, thinking, happy, sad, angry, sleeping, excited, listening, surprised

**状态转换规则：**
```
idle + USER_PET → happy
idle + USER_MESSAGE → listening
listening + AI_THINKING → thinking
thinking + AI_RESPONSE → talking
talking + IDLE_TIMEOUT → idle
idle + EMOTION_CHANGE → sad/angry/sleeping
```

### IdleScheduler（Idle调度器）

**Idle行为：**
| 行为 | 权重 | 触发条件 |
|------|------|----------|
| lookAround | 30 | 总是 |
| idleTalk | 25 | 总是 |
| sleepy | 15 | fatigue < 50时权重为0 |
| shy | 10 | loneliness >= 40 |
| excited | 10 | happiness > 60时权重×1.5 |
| bored | 10 | happiness <= 50 |

---

## 项目结构

```
C:\Users\asus\ai-companion\
├── apps/
│   └── desktop/                 # Tauri主程序
│       └── src/
│           ├── App.tsx         # 主应用
│           ├── ChatPanel.tsx   # 聊天面板
│           ├── CharacterDisplay.tsx  # 角色显示
│           ├── EmotionDisplay.tsx     # 情绪显示
│           ├── SettingsPanel.tsx      # 设置面板
│           └── store.ts        # Zustand状态管理
│
├── packages/
│   ├── core/                   # 核心常量和工具
│   ├── emotion-engine/         # 情绪引擎
│   ├── animation-engine/       # 动画引擎
│   ├── behavior-engine/        # 行为引擎
│   ├── memory-engine/          # 记忆引擎
│   ├── character-engine/       # 人格引擎
│   ├── ai-service/            # AI服务
│   ├── minimax-mcp/           # MiniMax API封装
│   └── shared/                 # 共享类型
│
├── assets/
│   └── characters/
│       └── ikaros/            # 伊卡洛斯角色资源
│           ├── base/           # 基础立绘
│           ├── eye/            # 眼睛状态
│           ├── mouth/          # 嘴巴状态
│           ├── expression/      # 表情图片
│           └── effect/          # 特效（脸红等）
│
└── config/                    # 配置文件
```

---

## 配置说明

### API配置
在设置面板中配置：
- **Provider**: minimax
- **Base URL**: https://api.minimaxi.com
- **Model**: MiniMax-M2.7-highspeed
- **API Key**: 你的API密钥

### 角色配置
当前角色：**伊卡洛斯 (Ikaros)**
- 性格：冷淡、安静、天然呆、服从型、感情表达弱
- 说话风格：冷淡平静
- 口癖：...。的哦

---

## 待开发功能

### Phase 3（计划中）
- [ ] SQLite长期记忆存储
- [ ] 向量检索召回
- [ ] 用户画像

### Phase 4（计划中）
- [ ] 主动聊天
- [ ] 时间感知
- [ ] 工作提醒

### Phase 5（长期）
- [ ] TTS语音合成
- [ ] STT语音识别
- [ ] Agent控制电脑

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.x |
| 前端 | React + TypeScript |
| 状态管理 | Zustand |
| 样式 | TailwindCSS |
| 动画 | CSS Transitions + requestAnimationFrame |
| AI服务 | MiniMax API |
| 构建工具 | Vite |

---

## 版本信息

- **当前版本**: 0.2.0
- **最近更新**: 2026-05-13 (修复Hermes测试问题)
- **项目位置**: `C:\Users\asus\ai-companion`

## 已知问题

1. 长期记忆未持久化（MemoryEngine存在但未连接SQLite）
2. TTS语音未集成到UI
3. Idle动画效果待运行时验证
