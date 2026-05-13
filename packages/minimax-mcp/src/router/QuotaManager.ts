import type { QuotaStatus, TaskType } from '../types';

const TASK_COSTS: Record<TaskType, number> = {
  chat: 1,
  emotion_analysis: 1,
  image_generation: 10,
  vision_analysis: 8,
  text_to_speech: 5,
  music_generation: 15,
  video_generation: 20,
};

const DAILY_BUDGET = 4500;
const HOURLY_BUDGET = 500;

export class QuotaManager {
  private remaining: number;
  private dailyBudget: number;
  private hourlyBudget: number;
  private lastReset: number;
  private hourlyUsed: number;
  private lastHourReset: number;

  constructor(dailyBudget: number = DAILY_BUDGET, hourlyBudget: number = HOURLY_BUDGET) {
    this.remaining = dailyBudget;
    this.dailyBudget = dailyBudget;
    this.hourlyBudget = hourlyBudget;
    this.lastReset = Date.now();
    this.hourlyUsed = 0;
    this.lastHourReset = Date.now();
  }

  private resetIfNeeded(): void {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const hourMs = 60 * 60 * 1000;

    if (now - this.lastReset >= dayMs) {
      this.remaining = this.dailyBudget;
      this.lastReset = now;
    }

    if (now - this.lastHourReset >= hourMs) {
      this.hourlyUsed = 0;
      this.lastHourReset = now;
    }
  }

  canUse(taskType: TaskType, cost?: number): boolean {
    this.resetIfNeeded();
    const taskCost = cost ?? TASK_COSTS[taskType] ?? 1;
    return this.remaining >= taskCost && this.hourlyUsed + taskCost <= this.hourlyBudget;
  }

  consume(cost: number): boolean {
    this.resetIfNeeded();
    if (this.remaining < cost) {
      console.warn(`Quota exhausted: ${this.remaining} remaining, need ${cost}`);
      return false;
    }
    this.remaining -= cost;
    this.hourlyUsed += cost;
    return true;
  }

  estimateCost(taskType: TaskType): number {
    return TASK_COSTS[taskType] ?? 1;
  }

  getStatus(): QuotaStatus {
    this.resetIfNeeded();
    return {
      remaining: this.remaining,
      total: this.dailyBudget,
      resetTime: this.lastReset + 24 * 60 * 60 * 1000,
      hourlyBudget: this.hourlyBudget - this.hourlyUsed,
      dailyBudget: this.remaining,
    };
  }

  setRemaining(remaining: number): void {
    this.remaining = remaining;
  }

  isQuotaExhausted(): boolean {
    this.resetIfNeeded();
    return this.remaining <= 0;
  }

  shouldThrottle(taskType: TaskType): boolean {
    const cost = TASK_COSTS[taskType] ?? 1;
    return this.hourlyUsed + cost > this.hourlyBudget * 0.9;
  }
}

let quotaManagerInstance: QuotaManager | null = null;

export function getQuotaManager(): QuotaManager {
  if (!quotaManagerInstance) {
    quotaManagerInstance = new QuotaManager();
  }
  return quotaManagerInstance;
}
