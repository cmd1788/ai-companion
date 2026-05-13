import type { CharacterState, EmotionState } from '@ai-companion/shared';

export type StateTransitionEvent =
  | 'USER_MESSAGE'
  | 'AI_THINKING'
  | 'AI_RESPONSE'
  | 'EMOTION_CHANGE'
  | 'IDLE_TIMEOUT'
  | 'USER_PET'
  | 'RANDOM_IDLE'
  | 'EXCITED'
  | 'FATIGUE_HIGH'
  | 'LONELINESS_HIGH';

interface StateTransition {
  from: CharacterState;
  event: StateTransitionEvent;
  to: CharacterState;
  condition?: (ctx: BehaviorContext) => boolean;
}

export interface BehaviorContext {
  emotion: EmotionState;
  isIdle: boolean;
  idleTime: number;
}

const STATE_TRANSITIONS: StateTransition[] = [
  { from: 'idle', event: 'USER_MESSAGE', to: 'listening' },
  { from: 'listening', event: 'AI_THINKING', to: 'thinking' },
  { from: 'thinking', event: 'AI_RESPONSE', to: 'talking' },
  { from: 'talking', event: 'IDLE_TIMEOUT', to: 'idle' },
  { from: 'idle', event: 'RANDOM_IDLE', to: 'idle' },
  { from: 'idle', event: 'USER_PET', to: 'happy' },
  { from: 'happy', event: 'IDLE_TIMEOUT', to: 'idle' },
  { from: 'idle', event: 'EMOTION_CHANGE', to: 'idle', condition: (ctx) => ctx.emotion.happiness > 70 },
  { from: 'idle', event: 'EMOTION_CHANGE', to: 'sad', condition: (ctx) => ctx.emotion.loneliness > 70 },
  { from: 'idle', event: 'EMOTION_CHANGE', to: 'angry', condition: (ctx) => ctx.emotion.stress > 70 },
  { from: 'sad', event: 'USER_MESSAGE', to: 'listening' },
  { from: 'sad', event: 'IDLE_TIMEOUT', to: 'idle' },
  { from: 'angry', event: 'USER_MESSAGE', to: 'listening' },
  { from: 'angry', event: 'IDLE_TIMEOUT', to: 'idle' },
  { from: 'idle', event: 'EMOTION_CHANGE', to: 'sleeping', condition: (ctx) => ctx.emotion.fatigue > 80 },
  { from: 'idle', event: 'EXCITED', to: 'excited' },
  { from: 'excited', event: 'IDLE_TIMEOUT', to: 'idle' },
  { from: 'idle', event: 'FATIGUE_HIGH', to: 'sleeping' },
  { from: 'sleeping', event: 'USER_MESSAGE', to: 'listening' },
  { from: 'sleeping', event: 'IDLE_TIMEOUT', to: 'sleeping' },
];

export class BehaviorEngine {
  private currentState: CharacterState = 'idle';
  private idleStartTime: number = Date.now();
  private listeners: Set<(state: CharacterState) => void> = new Set();
  private idleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private emotionCheckInterval?: ReturnType<typeof setInterval>;
  private lastEmotionState: EmotionState = { happiness: 50, fatigue: 20, loneliness: 30, stress: 15, affection: 40 };

  getState(): CharacterState {
    return this.currentState;
  }

  subscribe(listener: (state: CharacterState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.currentState));
  }

  transition(event: StateTransitionEvent, context: BehaviorContext): CharacterState {
    const possibleTransitions = STATE_TRANSITIONS.filter(
      (t) => t.from === this.currentState && t.event === event
    );

    for (const transition of possibleTransitions) {
      if (!transition.condition || transition.condition(context)) {
        this.exitState(this.currentState);
        this.currentState = transition.to;
        this.enterState(transition.to);
        this.notify();
        break;
      }
    }

    return this.currentState;
  }

  private exitState(state: CharacterState): void {
    this.clearIdleTimers();
    if (state !== 'idle') {
      this.idleStartTime = Date.now();
    }
  }

  private enterState(state: CharacterState): void {
    switch (state) {
      case 'idle':
        this.startIdleTimer();
        break;
      case 'thinking':
        this.startThinkingTimer();
        break;
      case 'talking':
        this.startTalkingTimer();
        break;
    }
  }

  private startIdleTimer(): void {
    const timer = setTimeout(() => {
      this.transition('IDLE_TIMEOUT', {
        emotion: { happiness: 50, fatigue: 20, loneliness: 30, stress: 15, affection: 40 },
        isIdle: true,
        idleTime: Date.now() - this.idleStartTime,
      });
    }, 5000);
    this.idleTimers.set('idle', timer);
  }

  private startThinkingTimer(): void {
    const timer = setTimeout(() => {
      this.transition('AI_RESPONSE', {
        emotion: { happiness: 50, fatigue: 20, loneliness: 30, stress: 15, affection: 40 },
        isIdle: false,
        idleTime: 0,
      });
    }, 2000);
    this.idleTimers.set('thinking', timer);
  }

  private startTalkingTimer(): void {
    const timer = setTimeout(() => {
      this.transition('IDLE_TIMEOUT', {
        emotion: { happiness: 50, fatigue: 20, loneliness: 30, stress: 15, affection: 40 },
        isIdle: false,
        idleTime: 0,
      });
    }, 3000);
    this.idleTimers.set('talking', timer);
  }

  private clearIdleTimers(): void {
    this.idleTimers.forEach((timer) => clearTimeout(timer));
    this.idleTimers.clear();
  }

  getIdleTime(): number {
    return Date.now() - this.idleStartTime;
  }

  emotionToState(emotion: EmotionState): CharacterState {
    if (emotion.fatigue > 80) return 'sleeping';
    if (emotion.happiness > 70) return 'happy';
    if (emotion.loneliness > 70) return 'sad';
    if (emotion.stress > 70) return 'angry';
    return 'idle';
  }

  // 启动行为引擎（开始监听情绪变化）
  start(emotionCheckIntervalMs: number = 5000): void {
    if (this.emotionCheckInterval) return;

    this.emotionCheckInterval = setInterval(() => {
      // 情绪检查会在后台运行，状态转换由外部触发
    }, emotionCheckIntervalMs);
  }

  // 停止行为引擎
  stop(): void {
    if (this.emotionCheckInterval) {
      clearInterval(this.emotionCheckInterval);
      this.emotionCheckInterval = undefined;
    }
    this.clearIdleTimers();
  }

  // 更新情绪状态并触发相应的状态检查
  updateEmotion(emotion: EmotionState): void {
    this.lastEmotionState = emotion;

    // 根据情绪变化触发相应事件
    if (emotion.fatigue > 80 && this.currentState !== 'sleeping') {
      this.transition('FATIGUE_HIGH', { emotion, isIdle: true, idleTime: this.getIdleTime() });
    }

    // 当情绪变化时，评估是否需要切换状态
    if (this.currentState === 'idle') {
      const targetState = this.emotionToState(emotion);
      if (targetState !== 'idle' && targetState !== this.currentState) {
        this.transition('EMOTION_CHANGE', { emotion, isIdle: true, idleTime: this.getIdleTime() });
      }
    }
  }

  // 获取当前情绪状态
  getLastEmotionState(): EmotionState {
    return { ...this.lastEmotionState };
  }
}
