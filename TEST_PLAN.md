# AI Companion 项目测试计划书

## 项目概述
构建一个人格化AI桌面副官系统，具备情绪、记忆、自主行为能力。

## 技术架构
- Tauri (桌面框架)
- React + TypeScript (前端)
- PixiJS (动画)
- SQLite (记忆存储)
- MiniMax API (AI服务)

## 核心模块

### 1. EmotionEngine (情绪引擎)
**功能：**
- 情绪联动系统（开心降低压力/孤独，疲劳增加压力等）
- 情绪波动系统（自然起伏）
- 情绪衰减循环（10秒间隔）
- calculateExpression() 计算当前表情

**测试点：**
- [ ] 情绪事件处理（user_greeting, user_praise等）
- [ ] 情绪联动效果
- [ ] 情绪波动
- [ ] 表情计算逻辑

### 2. AnimationEngine (动画引擎)
**功能：**
- 呼吸/眨眼/漂浮动画
- 表情切换：neutral, happy, sad, angry, surprised, tired, shy, confused, sleepy, excited
- 脸红效果

**测试点：**
- [ ] 动画状态机
- [ ] 表情切换
- [ ] 资源加载

### 3. BehaviorEngine (行为引擎)
**功能：**
- 状态机转换
- 情绪检查循环
- 状态：idle, talking, thinking, happy, sad, angry, sleeping, excited, listening, surprised

**测试点：**
- [ ] 状态转换
- [ ] 情绪→状态映射

### 4. IdleScheduler (Idle调度器)
**功能：**
- Idle行为选择（权重系统）
- 行为：lookAround, idleTalk, sleepy, shy, excited, bored

**测试点：**
- [ ] 行为权重计算
- [ ] 行为触发

### 5. MemoryEngine (记忆引擎)
**功能：**
- 短期记忆
- 长期记忆
- 记忆召回

### 6. AIService (AI服务)
**功能：**
- Prompt构建
- MiniMax API调用

## 测试场景

### 场景1：情绪变化测试
1. 用户打招呼 → happiness +10, loneliness -5
2. 用户夸奖 → happiness +15, affection +10
3. 用户批评 → happiness -10, stress +10
4. Idle太久 → fatigue +3, loneliness +5

### 场景2：表情切换测试
- fatigue > 75 → sleepy
- stress > 70 → angry
- loneliness > 70 → sad
- happiness > 70 → happy

### 场景3：状态转换测试
- idle + USER_PET → happy
- idle + USER_MESSAGE → listening
- talking + IDLE_TIMEOUT → idle

## 项目位置
`C:\Users\asus\ai-companion`

## 运行命令
```bash
cd C:\Users\asus\ai-companion
pnpm install
pnpm dev
```

## 待验证
1. EmotionEngine的情绪联动是否正确
2. AnimationEngine的表情切换是否正确
3. BehaviorEngine的状态转换是否正确
4. Idle行为是否反馈到情绪系统
5. 整体UI交互是否流畅
