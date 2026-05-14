# Live2D 参数建议文档

## 层级结构

| 层级 | 名称 | 说明 |
|------|------|------|
| 0 | base_body | 身体基础层 |
| 1 | base_hair | 头发基础层 |
| 2 | base_wing | 翅膀层 |
| 3 | base_halo | 光环层 |
| 4 | eye_layer | 眼睛层 |
| 5 | mouth_layer | 嘴型层 |
| 6 | effect_layer | 特效层（脸红、眼泪等） |

## 关键参数

### 眼睛参数 (Eye)
```
ParamEyeLOpen     - 左眼睁开度 0~1
ParamEyeROpen     - 右眼睁开度 0~1
ParamEyeLSmile    - 左眼笑度 0~1
ParamEyeRSmile    - 右眼笑度 0~1
ParamEyeBallX     - 眼球X移动 -1~1
ParamEyeBallY     - 眼球Y移动 -1~1
ParamEyeScale     - 眼睛缩放 0.8~1.2
```

### 嘴型参数 (Mouth)
```
ParamMouthOpen    - 嘴巴张开度 0~1
ParamMouthSmile   - 嘴巴微笑度 -1~1
ParamMouthPout    - 嘴巴嘟起度 0~1
```

### 表情参数 (Expression)
```
ParamAnger        - 愤怒值 0~1
ParamSadness      - 悲伤值 0~1
ParamJoy          - 开心值 0~1
ParamShyness      - 害羞值 0~1
ParamSurprise     - 惊讶值 0~1
```

### 动画参数 (Motion)
```
ParamBreath       - 呼吸 0~1 (循环)
ParamFloatY       - 浮动Y轴 -5~5px
ParamWingOpen     - 翅膀展开 0~1
ParamHairSwing    - 发丝摆动 0~1
ParamHaloGlow     - 光环发光强度 0~1
```

## 表情切换映射

| 表情 | 主要参数 | 眼睛状态 | 嘴型状态 |
|------|---------|---------|---------|
| neutral | Joy=0, others=0 | eye_open | mouth_closed |
| happy | Joy=1 | eye_happy_closed | mouth_smile |
| sad | Sadness=1 | eye_crying | mouth_small_open |
| angry | Anger=1 | eye_angry | mouth_angry |
| shy | Shyness=1 | eye_dizzy | mouth_pout |
| surprised | Surprise=1 | eye_sparkle | mouth_shocked |
| thinking | Joy=0.3 | eye_half_open | mouth_closed |

## 触发建议

- **眨眼**: 每3秒检查ParamEyeOpen是否为1，若为1则触发0.1秒闭眼动画
- **呼吸**: 持续2秒循环ParamBreath 0→1→0
- **漂浮**: 持续3秒循环ParamFloatY -5→5→-5
- **头发摆动**: 响应鼠标移动，轻微延迟跟随
- **光环脉动**: 说话时增强，Idle时柔和脉动
