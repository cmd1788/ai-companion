import type { ExpressionType } from '@ai-companion/animation-engine';

export interface IkarosPromptConfig {
  style: string;
  baseCharacter: string;
  expressions: Record<ExpressionType, string>;
  technical: string[];
}

const BASE_PROMPT = `
Ikaros (イカロス) from "Heaven's Lost Property" (Sora no Otoshimono)

Anime character design:
- White long hair, flowing and detailed
- Turquoise/cyan glowing eyes (large, expressive)
- Pale skin complexion
- Slender build, average height
- Pink metallic chain accessories on body
- Mechanical angel wings (white/golden, folded)
- Classic black and white maid-style outfit or casual celestial outfit
- Cold, emotionless but beautiful face
- Soft facial features

Quality requirements:
- High quality anime art style
- Consistent lighting (soft ambient + rim light)
- Clean linework
- Front-facing or 3/4 view upper body
- Transparent PNG background (for layering)
- Live2D/Sprite sheet ready
- 4K resolution quality
`.trim();

const EXPRESSION_PROMPTS: Record<ExpressionType, string> = {
  neutral: 'expressionless face, slightly open lips, vacant stare, emotionless',
  happy: 'gentle slight smile, warm eyes, soft expression, subtle happiness',
  sad: 'slightly lowered eyes, small frown, melancholic, lonely expression',
  angry: 'narrowed eyes, furrowed brow, cold angry expression, slight glare',
  surprised: 'wide eyes, raised eyebrows, small open mouth, startled',
  tired: 'half-closed eyes, drowsy, heavy eyelids, sleepy expression, yawning mouth',
  shy: 'slight blush, averted eyes, embarrassed, shy smile, flustered',
  thinking: 'looking to the side, slight frown, contemplative, focused expression',
};

const TECHNICAL_TAGS = [
  'transparent background',
  'png format',
  'layered',
  'no background',
  'solo focus',
  'anime style',
  'high quality',
  'detailed',
  'clean edges',
  'game sprite ready',
];

export class CharacterPromptBuilder {
  private config: IkarosPromptConfig;

  constructor() {
    this.config = {
      style: 'anime',
      baseCharacter: BASE_PROMPT,
      expressions: EXPRESSION_PROMPTS,
      technical: TECHNICAL_TAGS,
    };
  }

  buildBasePrompt(): string {
    return this.config.baseCharacter;
  }

  buildExpressionPrompt(expression: ExpressionType): string {
    const expressionDesc = this.config.expressions[expression] || this.config.expressions.neutral;
    return `${this.config.baseCharacter}\n\nExpression: ${expressionDesc}\n\n${this.config.technical.join(', ')}`;
  }

  buildEyePrompt(eyeType: 'neutral' | 'happy' | 'sad' | 'angry' | 'closed' | 'thinking'): string {
    const eyeDescs = {
      neutral: 'open eyes, normal pupils, calm gaze',
      happy: 'curved happy eyes, smiling eyes, joyful gaze',
      sad: 'sad eyes, droopy eyelids, tearful',
      angry: 'sharp angry eyes, narrowed, fierce',
      closed: 'closed eyes, peaceful',
      thinking: 'looking away, side glance, contemplative',
    };
    return `${this.config.baseCharacter}\n\nFocus: Eyes only\n${eyeDescs[eyeType]}\n\ntransparent background, eye layer, anime style`;
  }

  buildMouthPrompt(mouthType: 'closed' | 'open' | 'smile' | 'frown' | 'talking'): string {
    const mouthDescs = {
      closed: 'closed mouth, neutral',
      open: 'slightly open mouth, small',
      smile: 'gentle smile, curved lips',
      frown: 'small frown, sad lips',
      talking: 'open mouth, speaking, talking animation frame',
    };
    return `${this.config.baseCharacter}\n\nFocus: Mouth only\n${mouthDescs[mouthType]}\n\ntransparent background, mouth layer, anime style`;
  }

  buildEffectPrompt(effect: 'blush' | 'anger_mark' | 'tear' | 'sweat' | 'zzz' | 'heart'): string {
    const effectDescs = {
      blush: 'blush marks on cheeks, pink blush, embarrassed',
      anger_mark: 'anger symbol, anger vein, frustrated',
      tear: 'tear drops, crying, sad tears',
      sweat: 'sweat drop, nervous, anxious',
      zzz: 'sleep symbols, ZZZ, sleepy',
      heart: 'floating hearts, love, affection',
    };
    return `${this.config.baseCharacter}\n\nEffect overlay: ${effectDescs[effect]}\n\ntransparent background, effect layer, anime style`;
  }

  getExpressionList(): ExpressionType[] {
    return Object.keys(this.config.expressions) as ExpressionType[];
  }

  toJSON(): IkarosPromptConfig {
    return { ...this.config };
  }
}

let promptBuilderInstance: CharacterPromptBuilder | null = null;

export function getCharacterPromptBuilder(): CharacterPromptBuilder {
  if (!promptBuilderInstance) {
    promptBuilderInstance = new CharacterPromptBuilder();
  }
  return promptBuilderInstance;
}
