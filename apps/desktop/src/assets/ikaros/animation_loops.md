# 动画循环建议

## Idle 状态动画循环

### 1. 呼吸循环 (Breathing)
```
周期: 2000ms
参数: ParamBreath
曲线: ease-in-out-sine
值域: 0.0 → 1.0 → 0.0
影响: 胸部轻微起伏，身体微微上下
```

### 2. 眨眼循环 (Blink)
```
周期: 3000ms (随机 ±500ms)
触发: 每3秒一次
参数: ParamEyeLOpen, ParamEyeROpen
曲线: linear
序列: 
  - 0ms: 睁眼 (1.0)
  - 2900ms: 闭眼开始 (1.0 → 0.0, 100ms)
  - 3000ms: 闭眼保持 (0.0)
  - 3100ms: 睁眼恢复 (0.0 → 1.0, 100ms)
```

### 3. 身体漂浮 (Float)
```
周期: 3000ms
参数: ParamFloatY
曲线: sine
值域: 0px → 5px → 0px → -5px → 0px
影响: 整体身体轻微上下漂浮
```

### 4. 头发摆动 (Hair Swing)
```
周期: 2500ms
参数: ParamHairSwing
曲线: ease-in-out
值域: 0.0 → 0.3 → 0.0
触发: 跟随身体漂浮，稍微延迟
```

### 5. 眼球微动 (Eye Move)
```
周期: 4000ms
参数: ParamEyeBallX, ParamEyeBallY
曲线: random (噪声函数)
值域: X: -0.3~0.3, Y: -0.2~0.2
```

### 6. 光环脉动 (Halo Glow)
```
周期: 2000ms
参数: ParamHaloGlow
曲线: sine
值域: 0.5 → 1.0 → 0.5
效果: 光环亮度柔和呼吸
```

## 事件触发动画

### 鼠标进入 (Mouse Enter)
```
动画: active_interact
序列:
  - 身体快速看向鼠标方向
  - 表情切换到 happy
  - 翅膀轻微展开
```

### 鼠标离开 (Mouse Leave)
```
动画: idle_return
序列:
  - 平滑回到正面
  - 表情恢复到 neutral
  - 翅膀收拢
```

### 点击 (Click)
```
动画: tap_reaction
序列:
  - 眼睛闪亮 sparkle
  - 光环闪亮
  - 短暂开心表情
```

## 组合 Idle 循环

建议所有 Idle 动画同时播放，通过不同周期实现自然的随机感：

```
主循环 (breathing + float): 3000ms
副循环 (hair swing):         2500ms
眨眼检查:                    3000ms (随机±500ms)
眼球微动:                    4000ms
光环脉动:                    2000ms
```

## 状态切换过渡

| 从 → 到 | 过渡时间 | 曲线 |
|---------|---------|------|
| neutral → happy | 300ms | ease-out |
| neutral → sad | 400ms | ease-in |
| neutral → angry | 200ms | linear |
| neutral → shy | 350ms | ease-in-out |
| any → neutral | 500ms | ease-in-out |
