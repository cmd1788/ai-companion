import type { EmotionState } from '@ai-companion/shared';
import type { ExpressionType } from '@ai-companion/animation-engine';
import {
  EXPRESSION_SCENARIOS,
  checkScenarioTrigger,
  type ExpressionScenario,
} from './ExpressionScenarios';

/**
 * 主动行为引擎
 * 负责：
 * 1. 监听情绪/状态变化
 * 2. 检测场景触发条件
 * 3. 切换表情 + 主动说话
 */
export class ExpressionSceneEngine {
  private currentScenarioId: string | null = null;
  private lastTriggerTime: number = 0;
  private minTriggerInterval: number = 5000; // 最小触发间隔 5秒
  private listeners: Set<(data: SceneTriggerEvent) => void> = new Set();

  constructor() {}

  /**
   * 检查所有场景，返回匹配的最高优先级场景
   */
  evaluate(
    emotion: EmotionState,
    characterState: string,
    lastEvent?: string
  ): ExpressionScenario | null {
    const now = Date.now();
    const hour = new Date().getHours();

    // 限制触发频率
    if (now - this.lastTriggerTime < this.minTriggerInterval) {
      return null;
    }

    const context = {
      emotion,
      hour,
      lastEvent,
      characterState,
    };

    // 找出所有满足条件的场景
    const matchedScenarios = EXPRESSION_SCENARIOS
      .filter(scenario => checkScenarioTrigger(scenario.trigger, context))
      .sort((a, b) => b.priority - a.priority); // 按优先级降序

    if (matchedScenarios.length === 0) {
      return null;
    }

    const bestMatch = matchedScenarios[0];

    // 避免重复触发同一场景
    if (bestMatch.id === this.currentScenarioId) {
      return null;
    }

    this.currentScenarioId = bestMatch.id;
    this.lastTriggerTime = now;

    return bestMatch;
  }

  /**
   * 强制切换到指定场景（忽略冷却时间）
   */
  forceTrigger(scenarioId: string): ExpressionScenario | null {
    const scenario = EXPRESSION_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return null;

    this.currentScenarioId = scenarioId;
    this.lastTriggerTime = Date.now();
    return scenario;
  }

  /**
   * 订阅场景触发事件
   */
  subscribe(listener: (data: SceneTriggerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notify(data: SceneTriggerEvent): void {
    this.listeners.forEach(l => l(data));
  }

  /**
   * 获取当前场景
   */
  getCurrentScenario(): ExpressionScenario | null {
    if (!this.currentScenarioId) return null;
    return EXPRESSION_SCENARIOS.find(s => s.id === this.currentScenarioId) ?? null;
  }

  /**
   * 获取指定场景的随机对话
   */
  getRandomDialogue(scenario: ExpressionScenario): string {
    return scenario.dialogues[Math.floor(Math.random() * scenario.dialogues.length)];
  }

  /**
   * 触发场景并返回事件数据
   */
  trigger(
    emotion: EmotionState,
    characterState: string,
    lastEvent?: string
  ): SceneTriggerEvent | null {
    const scenario = this.evaluate(emotion, characterState, lastEvent);
    if (!scenario) return null;

    const dialogue = this.getRandomDialogue(scenario);
    const event: SceneTriggerEvent = {
      scenario,
      expression: scenario.expression,
      dialogue,
      timestamp: Date.now(),
    };

    this.notify(event);
    return event;
  }

  /**
   * 获取所有可用场景
   */
  getAllScenarios(): ExpressionScenario[] {
    return EXPRESSION_SCENARIOS;
  }

  /**
   * 根据事件类型获取对应场景
   */
  getScenarioByEvent(eventType: string): ExpressionScenario | null {
    return EXPRESSION_SCENARIOS.find(
      s => s.trigger.type === 'event' && s.trigger.event === eventType
    ) ?? null;
  }
}

export interface SceneTriggerEvent {
  scenario: ExpressionScenario;
  expression: ExpressionType;
  dialogue: string;
  timestamp: number;
}

/**
 * 全局单例
 */
let globalEngine: ExpressionSceneEngine | null = null;

export function getSceneEngine(): ExpressionSceneEngine {
  if (!globalEngine) {
    globalEngine = new ExpressionSceneEngine();
  }
  return globalEngine;
}
