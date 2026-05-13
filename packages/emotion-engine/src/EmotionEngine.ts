import type { EmotionState, EmotionEvent } from '@ai-companion/shared';
import { EMOTION_DECAY, EMOTION_CLAMP, clamp, generateId } from '@ai-companion/core';

// 情绪联动效果配置
interface CrossEmotionEffect {
  sourceEmotion: keyof EmotionState;
  targetEmotion: keyof EmotionState;
  coefficient: number; // 正数=正相关，负数=负相关
  threshold: number;  // 触发阈值
}

const CROSS_EMOTION_EFFECTS: CrossEmotionEffect[] = [
  // 开心时降低压力和孤独感
  { sourceEmotion: 'happiness', targetEmotion: 'stress', coefficient: -0.5, threshold: 60 },
  { sourceEmotion: 'happiness', targetEmotion: 'loneliness', coefficient: -0.3, threshold: 60 },
  { sourceEmotion: 'happiness', targetEmotion: 'fatigue', coefficient: -0.2, threshold: 70 },
  // 孤独时增加亲密度需求
  { sourceEmotion: 'loneliness', targetEmotion: 'affection', coefficient: 0.3, threshold: 60 },
  // 疲劳时增加压力
  { sourceEmotion: 'fatigue', targetEmotion: 'stress', coefficient: 0.3, threshold: 60 },
  // 压力大了更疲劳
  { sourceEmotion: 'stress', targetEmotion: 'fatigue', coefficient: 0.2, threshold: 60 },
  // 亲密度增加幸福感
  { sourceEmotion: 'affection', targetEmotion: 'happiness', coefficient: 0.3, threshold: 60 },
  { sourceEmotion: 'affection', targetEmotion: 'loneliness', coefficient: -0.4, threshold: 60 },
];

export const EMOTION_EVENT_RULES: Record<string, Partial<EmotionState>> = {
  user_greeting: { happiness: 10, loneliness: -5 },
  user_praise: { happiness: 15, affection: 10 },
  user_criticize: { happiness: -10, stress: 10 },
  user_bye: { happiness: -5, loneliness: 15 },
  user_pet: { happiness: 10, fatigue: -5, affection: 15 },
  user_ignore: { happiness: -5, loneliness: 10 },
  time_passes: { fatigue: 2, loneliness: 1 },
  idle_too_long: { fatigue: 3, loneliness: 5 },
  // Idle行为带来的情绪变化
  idle_look_around: { happiness: 2, fatigue: 1 },
  idle_talk: { happiness: 3, loneliness: -3 },
  idle_sleepy: { fatigue: 5, happiness: -2 },
  idle_shy: { affection: 3, happiness: 2 },
  idle_excited: { happiness: 8, stress: 3 },
  idle_bored: { loneliness: 5, happiness: -3 },
};

export const EMOTION_INFLUENCE = {
  happiness: { expression: 'happy', toneMod: 1.1, interactionMod: 1.2 },
  fatigue: { expression: 'tired', toneMod: 0.8, interactionMod: 0.5 },
  loneliness: { expression: 'sad', toneMod: 0.9, interactionMod: 1.5 },
  stress: { expression: 'worried', toneMod: 0.85, interactionMod: 0.7 },
  affection: { expression: 'loving', toneMod: 1.05, interactionMod: 1.0 },
} as const;

// 情绪到表情的映射（更细致）
export const EMOTION_TO_EXPRESSION: Record<string, string> = {
  // 基于主要情绪值
  'happiness_high': 'happy',
  'happiness_mid': 'happy',
  'fatigue_high': 'sleepy',
  'fatigue_mid': 'tired',
  'loneliness_high': 'sad',
  'stress_high': 'angry',
  'affection_high': 'shy',
  // 默认
  'default': 'neutral',
};

export type ExpressionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'tired' | 'shy' | 'confused' | 'sleepy' | 'excited' | 'bored';

export interface EmotionEngineConfig {
  decayIntervalMs: number;        // 衰减间隔（毫秒）
  fluctuationIntervalMs: number;   // 波动间隔（毫秒）
  volatility: number;              // 波动幅度 (0-1)
  crossEmotionEnabled: boolean;   // 是否启用情绪联动
}

const DEFAULT_CONFIG: EmotionEngineConfig = {
  decayIntervalMs: 10000,         // 10秒
  fluctuationIntervalMs: 30000,    // 30秒
  volatility: 0.15,               // 15%波动
  crossEmotionEnabled: true,
};

export class EmotionEngine {
  private state: EmotionState;
  private config: EmotionEngineConfig;
  private decayInterval?: ReturnType<typeof setInterval>;
  private fluctuationInterval?: ReturnType<typeof setInterval>;
  private listeners: Set<(state: EmotionState) => void> = new Set();

  constructor(
    initialState: EmotionState = {
      happiness: 50,
      fatigue: 20,
      loneliness: 30,
      stress: 15,
      affection: 40,
    },
    config: Partial<EmotionEngineConfig> = {}
  ) {
    this.state = { ...initialState };
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): EmotionState {
    return { ...this.state };
  }

  getConfig(): EmotionEngineConfig {
    return { ...this.config };
  }

  subscribe(listener: (state: EmotionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.getState()));
  }

  // 处理情绪事件
  processEvent(event: EmotionEvent): EmotionState {
    const rule = EMOTION_EVENT_RULES[event.type];
    if (!rule) return this.state;

    const delta = this.applyIntensity(rule, event.intensity);
    this.state = this.applyDelta(this.state, delta);
    this.clampState();

    // 触发情绪联动
    if (this.config.crossEmotionEnabled) {
      this.applyCrossEmotionEffects();
    }

    this.clampState();
    this.notify();
    return this.state;
  }

  // 应用情绪联动效果
  private applyCrossEmotionEffects(): void {
    const delta: Partial<EmotionState> = {};

    for (const effect of CROSS_EMOTION_EFFECTS) {
      const sourceValue = this.state[effect.sourceEmotion];
      if (sourceValue > effect.threshold) {
        const influence = (sourceValue - effect.threshold) / 100 * effect.coefficient;
        if (!delta[effect.targetEmotion]) {
          delta[effect.targetEmotion] = 0;
        }
        delta[effect.targetEmotion] += influence;
      }
    }

    if (Object.keys(delta).length > 0) {
      this.state = this.applyDelta(this.state, delta);
    }
  }

  // 应用情绪波动（自然起伏）
  private applyFluctuation(): void {
    const fluctuation: Partial<EmotionState> = {};

    for (const key of Object.keys(this.state) as (keyof EmotionState)[]) {
      const currentValue = this.state[key];
      // 中间值附近的波动更大
      const distanceFromMiddle = Math.abs(currentValue - 50) / 50;
      const effectiveVolatility = this.config.volatility * (1 - distanceFromMiddle * 0.5);
      const change = (Math.random() - 0.5) * 2 * effectiveVolatility * 10;
      fluctuation[key] = change;
    }

    this.state = this.applyDelta(this.state, fluctuation);
    this.clampState();
  }

  private applyIntensity(
    rule: Partial<EmotionState>,
    intensity: number
  ): EmotionState {
    return Object.fromEntries(
      Object.entries(rule).map(([k, v]) => [k, (v as number) * intensity])
    ) as EmotionState;
  }

  private applyDelta(
    current: EmotionState,
    delta: Partial<EmotionState>
  ): EmotionState {
    const next = { ...current };
    for (const key of Object.keys(delta) as (keyof EmotionState)[]) {
      next[key] += delta[key] ?? 0;
    }
    return next;
  }

  private clampState(): void {
    this.state = {
      happiness: clamp(this.state.happiness, EMOTION_CLAMP.min, EMOTION_CLAMP.max),
      fatigue: clamp(this.state.fatigue, EMOTION_CLAMP.min, EMOTION_CLAMP.max),
      loneliness: clamp(this.state.loneliness, EMOTION_CLAMP.min, EMOTION_CLAMP.max),
      stress: clamp(this.state.stress, EMOTION_CLAMP.min, EMOTION_CLAMP.max),
      affection: clamp(this.state.affection, EMOTION_CLAMP.min, EMOTION_CLAMP.max),
    };
  }

  // 获取主导情绪
  getDominantEmotion(): keyof EmotionState {
    const entries = Object.entries(this.state) as [keyof EmotionState, number][];
    return entries.reduce((max, [emotion, value]) =>
      value > max[1] ? [emotion, value] : max
    )[0];
  }

  // 获取当前情绪描述
  getEmotionDescription(): string {
    const parts: string[] = [];

    if (this.state.happiness > 70) parts.push('非常开心');
    else if (this.state.happiness > 50) parts.push('心情愉快');
    else if (this.state.happiness > 30) parts.push('心情一般');
    else if (this.state.happiness < 20) parts.push('有些失落');

    if (this.state.fatigue > 70) parts.push('非常疲惫');
    else if (this.state.fatigue > 50) parts.push('有些累');

    if (this.state.loneliness > 70) parts.push('很孤独');
    else if (this.state.loneliness > 50) parts.push('有些寂寞');

    if (this.state.stress > 70) parts.push('压力很大');
    else if (this.state.stress > 50) parts.push('有些紧张');

    if (this.state.affection > 70) parts.push('对用户很有感情');

    return parts.join('、') || '情绪平稳';
  }

  // 根据情绪状态计算表情
  calculateExpression(): ExpressionType {
    const { happiness, fatigue, loneliness, stress, affection } = this.state;

    // 优先级：疲劳 > 压力 > 孤独 > 幸福 > 亲密度
    if (fatigue > 75) return 'sleepy';
    if (stress > 70) return 'angry';
    if (loneliness > 70) return 'sad';
    if (happiness > 70) return 'happy';
    if (happiness > 55) return 'excited';
    if (affection > 70) return 'shy';
    if (fatigue > 50) return 'tired';
    if (loneliness > 55) return 'sad';
    if (stress > 50) return 'confused';

    return 'neutral';
  }

  // 获取情绪影响参数
  getEmotionInfluence(): { toneMod: number; interactionMod: number } {
    const dominant = this.getDominantEmotion();
    const influence = EMOTION_INFLUENCE[dominant];
    const value = this.state[dominant] / 100;
    return {
      toneMod: influence.toneMod * (0.5 + value * 0.5),
      interactionMod: influence.interactionMod * (0.5 + value * 0.5),
    };
  }

  // 开始情绪衰减循环
  startDecay(intervalMs?: number): void {
    const interval = intervalMs ?? this.config.decayIntervalMs;

    this.decayInterval = setInterval(() => {
      this.state = this.applyDelta(this.state, EMOTION_DECAY);
      this.clampState();
      this.notify();
    }, interval);

    // 启动情绪波动
    this.fluctuationInterval = setInterval(() => {
      this.applyFluctuation();
      this.notify();
    }, this.config.fluctuationIntervalMs);
  }

  // 停止情绪衰减
  stopDecay(): void {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
      this.decayInterval = undefined;
    }
    if (this.fluctuationInterval) {
      clearInterval(this.fluctuationInterval);
      this.fluctuationInterval = undefined;
    }
  }

  // 直接设置情绪值
  setEmotion(key: keyof EmotionState, value: number): void {
    this.state[key] = clamp(value, EMOTION_CLAMP.min, EMOTION_CLAMP.max);
    if (this.config.crossEmotionEnabled) {
      this.applyCrossEmotionEffects();
    }
    this.clampState();
    this.notify();
  }

  // 批量更新情绪
  updateEmotions(updates: Partial<EmotionState>): void {
    this.state = this.applyDelta(this.state, updates);
    if (this.config.crossEmotionEnabled) {
      this.applyCrossEmotionEffects();
    }
    this.clampState();
    this.notify();
  }

  toHistoryRecord(): { id: string; emotion_state: string; trigger_type: string; trigger_intensity: number } {
    return {
      id: generateId(),
      emotion_state: JSON.stringify(this.state),
      trigger_type: 'periodic_decay',
      trigger_intensity: 1.0,
    };
  }
}
