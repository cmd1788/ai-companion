export type IdleBehaviorType =
  | 'lookAround'
  | 'idleTalk'
  | 'sleepy'
  | 'shy'
  | 'excited'
  | 'bored';

// Idle行为到情绪事件的映射
export const IDLE_BEHAVIOR_EMOTION_MAP: Record<IdleBehaviorType, { type: string; intensity: number }> = {
  lookAround: { type: 'idle_look_around', intensity: 1 },
  idleTalk: { type: 'idle_talk', intensity: 1 },
  sleepy: { type: 'idle_sleepy', intensity: 1 },
  shy: { type: 'idle_shy', intensity: 1 },
  excited: { type: 'idle_excited', intensity: 1 },
  bored: { type: 'idle_bored', intensity: 1 },
};

export interface IdleBehavior {
  type: IdleBehaviorType;
  duration: number;
  weight: number;
  minInterval: number;
  maxInterval: number;
}

export const IDLE_BEHAVIORS: IdleBehavior[] = [
  {
    type: 'lookAround',
    duration: 3000,
    weight: 30,
    minInterval: 15000,
    maxInterval: 45000,
  },
  {
    type: 'idleTalk',
    duration: 2000,
    weight: 25,
    minInterval: 20000,
    maxInterval: 60000,
  },
  {
    type: 'sleepy',
    duration: 4000,
    weight: 15,
    minInterval: 30000,
    maxInterval: 90000,
  },
  {
    type: 'shy',
    duration: 2500,
    weight: 10,
    minInterval: 45000,
    maxInterval: 120000,
  },
  {
    type: 'excited',
    duration: 2000,
    weight: 10,
    minInterval: 60000,
    maxInterval: 180000,
  },
  {
    type: 'bored',
    duration: 3000,
    weight: 10,
    minInterval: 30000,
    maxInterval: 120000,
  },
];

export class IdleScheduler {
  private behaviors: IdleBehavior[];
  private currentBehavior: IdleBehavior | null = null;
  private nextBehaviorTime: number = 0;
  private isScheduled: boolean = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<(behavior: IdleBehaviorType) => void> = new Set();
  private emotionUpdateListeners: Set<(event: { type: string; intensity: number }) => void> = new Set();
  private fatigue: number = 30;
  private loneliness: number = 40;
  private happiness: number = 50;

  constructor(behaviors: IdleBehavior[] = IDLE_BEHAVIORS) {
    this.behaviors = behaviors;
  }

  updateEmotion(fatigue: number, loneliness: number, happiness: number): void {
    this.fatigue = fatigue;
    this.loneliness = loneliness;
    this.happiness = happiness;
  }

  subscribe(listener: (behavior: IdleBehaviorType) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 订阅情绪更新事件（当Idle行为执行时）
  subscribeEmotionUpdate(listener: (event: { type: string; intensity: number }) => void): () => void {
    this.emotionUpdateListeners.add(listener);
    return () => this.emotionUpdateListeners.delete(listener);
  }

  private notify(behavior: IdleBehaviorType): void {
    this.listeners.forEach((l) => l(behavior));
    // 通知情绪更新
    const emotionEvent = IDLE_BEHAVIOR_EMOTION_MAP[behavior];
    if (emotionEvent) {
      this.emotionUpdateListeners.forEach((l) => l(emotionEvent));
    }
  }

  private selectBehavior(): IdleBehavior {
    let totalWeight = 0;
    const adjustedBehaviors = this.behaviors.map((b) => {
      let weight = b.weight;

      if (b.type === 'sleepy' && this.fatigue < 50) {
        weight = 0;
      }
      if (b.type === 'shy' && this.loneliness < 40) {
        weight = weight * 0.5;
      }
      if (b.type === 'excited' && this.happiness > 60) {
        weight = weight * 1.5;
      }
      if (b.type === 'bored' && this.happiness > 50) {
        weight = 0;
      }

      totalWeight += weight;
      return { ...b, weight };
    });

    const random = Math.random() * totalWeight;
    let cumulative = 0;

    for (const behavior of adjustedBehaviors) {
      cumulative += behavior.weight;
      if (random <= cumulative) {
        return behavior;
      }
    }

    return adjustedBehaviors[0];
  }

  private getNextInterval(behavior: IdleBehavior): number {
    const { minInterval, maxInterval } = behavior;
    return minInterval + Math.random() * (maxInterval - minInterval);
  }

  schedule(): void {
    if (this.isScheduled) return;

    const behavior = this.selectBehavior();
    const interval = this.getNextInterval(behavior);

    this.currentBehavior = behavior;
    this.nextBehaviorTime = Date.now() + interval;

    this.timeoutId = setTimeout(() => {
      this.notify(behavior.type);
      this.isScheduled = false;
      this.schedule();
    }, interval);

    this.isScheduled = true;
  }

  start(): void {
    if (this.isScheduled) return;
    this.schedule();
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isScheduled = false;
    this.currentBehavior = null;
  }

  triggerBehavior(type: IdleBehaviorType): void {
    const behavior = this.behaviors.find((b) => b.type === type);
    if (behavior) {
      this.notify(type);
    }
  }

  getCurrentBehavior(): IdleBehaviorType | null {
    return this.currentBehavior?.type ?? null;
  }

  getNextBehaviorTime(): number {
    return this.nextBehaviorTime;
  }
}

let idleSchedulerInstance: IdleScheduler | null = null;

export function getIdleScheduler(): IdleScheduler {
  if (!idleSchedulerInstance) {
    idleSchedulerInstance = new IdleScheduler();
  }
  return idleSchedulerInstance;
}
