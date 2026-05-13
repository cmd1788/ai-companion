import type { ExpressionType, ExpressionConfig } from '@ai-companion/animation-engine';

export interface EmotionState {
  happiness: number;
  fatigue: number;
  loneliness: number;
  stress: number;
  affection: number;
}

export type CharacterState =
  | 'idle'
  | 'talking'
  | 'thinking'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'sleeping'
  | 'excited'
  | 'listening'
  | 'surprised';

const EXPRESSION_THRESHOLDS = {
  happiness: { high: 70, medium: 50 },
  fatigue: { high: 80, medium: 60 },
  loneliness: { high: 70, medium: 50 },
  stress: { high: 60, medium: 40 },
  affection: { high: 70, medium: 50 },
};

export class ExpressionResolver {
  private emotion: EmotionState;
  private behavior: CharacterState;

  constructor() {
    this.emotion = {
      happiness: 50,
      fatigue: 30,
      loneliness: 40,
      stress: 20,
      affection: 50,
    };
    this.behavior = 'idle';
  }

  updateEmotion(emotion: Partial<EmotionState>): void {
    this.emotion = { ...this.emotion, ...emotion };
  }

  updateBehavior(behavior: CharacterState): void {
    this.behavior = behavior;
  }

  resolve(): ExpressionConfig {
    const { happiness, fatigue, loneliness, stress, affection } = this.emotion;

    if (this.behavior === 'sleeping' || fatigue > EXPRESSION_THRESHOLDS.fatigue.high) {
      return this.createExpression('tired');
    }

    if (stress > EXPRESSION_THRESHOLDS.stress.high) {
      return this.createExpression('angry');
    }

    if (loneliness > EXPRESSION_THRESHOLDS.loneliness.high) {
      return this.createExpression('sad');
    }

    if (happiness > EXPRESSION_THRESHOLDS.happiness.high || affection > EXPRESSION_THRESHOLDS.affection.high) {
      return this.createExpression('happy');
    }

    if (this.behavior === 'surprised' || happiness < 30) {
      return this.createExpression('surprised');
    }

    return this.createExpression('neutral');
  }

  private createExpression(type: ExpressionType): ExpressionConfig {
    switch (type) {
      case 'happy':
        return {
          eye: 'eye_happy',
          mouth: 'mouth_smile',
          effect: 'blush',
          blush: true,
        };

      case 'sad':
        return {
          eye: 'eye_sad',
          mouth: 'mouth_frown',
          effect: 'tear',
        };

      case 'angry':
        return {
          eye: 'eye_angry',
          mouth: 'mouth_grimace',
          effect: 'anger_mark',
        };

      case 'surprised':
        return {
          eye: 'eye_open',
          mouth: 'mouth_open',
          effect: 'sweat',
        };

      case 'tired':
        return {
          eye: 'eye_half_closed',
          mouth: 'mouth_yawn',
          effect: 'zzz',
        };

      case 'neutral':
      default:
        return {
          eye: 'eye_base',
          mouth: 'mouth_closed',
        };
    }
  }

  getEmotion(): EmotionState {
    return { ...this.emotion };
  }

  getBehavior(): CharacterState {
    return this.behavior;
  }

  getExpressionPriority(): number {
    if (this.behavior === 'happy' || this.emotion.happiness > 80) return 3;
    if (this.emotion.fatigue > 70) return 2;
    if (this.emotion.stress > 60) return 2;
    if (this.emotion.loneliness > 60) return 2;
    return 1;
  }
}

let expressionResolverInstance: ExpressionResolver | null = null;

export function getExpressionResolver(): ExpressionResolver {
  if (!expressionResolverInstance) {
    expressionResolverInstance = new ExpressionResolver();
  }
  return expressionResolverInstance;
}
