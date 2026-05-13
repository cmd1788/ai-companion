import type { CharacterState } from '@ai-companion/shared';
import {
  IDLE_BLINK_INTERVAL,
  IDLE_BREATH_SPEED,
  IDLE_BREATH_SCALE,
  IDLE_FLOAT_SPEED,
  IDLE_FLOAT_AMPLITUDE,
} from '@ai-companion/core';

export type ExpressionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'tired' | 'shy' | 'confused' | 'sleepy' | 'excited' | 'bored';

export interface LayerConfig {
  id: string;
  name: string;
  texturePath: string;
  zIndex: number;
  blendMode?: string;
  visible?: boolean;
  anchor?: { x: number; y: number };
  position?: { x: number; y: number };
}

const ASSET_BASE = '/assets/ikaros';

const DEFAULT_LAYERS: LayerConfig[] = [
  { id: 'background', name: '背景', texturePath: '', zIndex: 0 },
  { id: 'body', name: '身体', texturePath: `${ASSET_BASE}/base/ikaros_base_body.jpg`, zIndex: 1 },
  { id: 'eye_base', name: '眼睛基础', texturePath: `${ASSET_BASE}/eye/ikaros_eye_open.jpg`, zIndex: 2 },
  { id: 'eye_happy', name: '眼睛开心', texturePath: `${ASSET_BASE}/eye/ikaros_eye_happy.jpg`, zIndex: 3, visible: false },
  { id: 'eye_sad', name: '眼睛难过', texturePath: `${ASSET_BASE}/eye/ikaros_eye_sad.jpg`, zIndex: 3, visible: false },
  { id: 'mouth_base', name: '嘴巴基础', texturePath: `${ASSET_BASE}/mouth/ikaros_mouth_closed.jpg`, zIndex: 4 },
  { id: 'mouth_open', name: '嘴巴张开', texturePath: `${ASSET_BASE}/mouth/ikaros_mouth_small_smile.jpg`, zIndex: 5, visible: false },
  { id: 'blush', name: '脸红', texturePath: `${ASSET_BASE}/effect/ikaros_effect_blush_soft.jpg`, zIndex: 6, visible: false },
  { id: 'expression', name: '表情', texturePath: `${ASSET_BASE}/expression/ikaros_exp_neutral.jpg`, zIndex: 7 },
];

const EXPRESSION_MAP: Record<ExpressionType, string[]> = {
  neutral: ['body', 'eye_base', 'mouth_base', 'expression'],
  happy: ['body', 'eye_happy', 'mouth_base', 'expression', 'blush'],
  sad: ['body', 'eye_sad', 'mouth_base', 'expression'],
  angry: ['body', 'eye_base', 'mouth_base', 'expression'],
  surprised: ['body', 'eye_base', 'mouth_open', 'expression'],
  tired: ['body', 'eye_base', 'mouth_base', 'expression'],
  shy: ['body', 'eye_happy', 'mouth_base', 'expression', 'blush'],
  confused: ['body', 'eye_base', 'mouth_base', 'expression'],
  sleepy: ['body', 'eye_base', 'mouth_base', 'expression'],
  excited: ['body', 'eye_happy', 'mouth_base', 'expression', 'blush'],
  bored: ['body', 'eye_base', 'mouth_base', 'expression'],
};

const STATE_EXPRESSION_MAP: Record<CharacterState, ExpressionType> = {
  idle: 'neutral',
  talking: 'surprised',
  thinking: 'confused',
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  sleeping: 'sleepy',
  excited: 'excited',
  listening: 'neutral',
  surprised: 'surprised',
};

const EXPRESSION_IMAGE_MAP: Record<ExpressionType, string> = {
  neutral: `${ASSET_BASE}/expression/ikaros_exp_neutral.jpg`,
  happy: `${ASSET_BASE}/expression/ikaros_exp_happy.jpg`,
  sad: `${ASSET_BASE}/expression/ikaros_exp_sad.jpg`,
  angry: `${ASSET_BASE}/expression/ikaros_exp_angry.jpg`,
  surprised: `${ASSET_BASE}/expression/ikaros_exp_surprised.jpg`,
  tired: `${ASSET_BASE}/expression/ikaros_expression_sleepy.jpg`,
  shy: `${ASSET_BASE}/expression/ikaros_exp_shy.jpg`,
  confused: `${ASSET_BASE}/expression/ikaros_exp_thinking.jpg`,
  sleepy: `${ASSET_BASE}/expression/ikaros_expression_sleepy.jpg`,
  excited: `${ASSET_BASE}/expression/ikaros_expression_happy.jpg`,
  bored: `${ASSET_BASE}/expression/ikaros_exp_neutral.jpg`,
};

export class AnimationEngine {
  private container: HTMLElement;
  private layers: Map<string, HTMLDivElement> = new Map();
  private time: number = 0;
  private animationFrame?: number;
  private blinkInterval?: ReturnType<typeof setInterval>;
  private isBlinking: boolean = false;
  private currentExpression: ExpressionType = 'neutral';
  private listeners: Set<(expression: ExpressionType) => void> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
    this.initializeLayers();
  }

  private initializeLayers(): void {
    this.container.style.position = 'relative';
    this.container.style.width = '200px';
    this.container.style.height = '200px';
    this.container.style.userSelect = 'none';
    this.container.style.pointerEvents = 'none';

    for (const layer of DEFAULT_LAYERS) {
      const div = document.createElement('div');
      div.id = layer.id;
      div.style.position = 'absolute';
      div.style.width = '100%';
      div.style.height = '100%';
      div.style.backgroundSize = 'contain';
      div.style.backgroundRepeat = 'no-repeat';
      div.style.backgroundPosition = 'center';
      div.style.zIndex = String(layer.zIndex);
      div.style.opacity = layer.visible !== false ? '1' : '0';
      div.style.transition = 'opacity 0.3s ease';

      if (layer.position) {
        div.style.transform = `translate(${layer.position.x}px, ${layer.position.y}px)`;
      }

      this.container.appendChild(div);
      this.layers.set(layer.id, div);

      this.loadTexture(layer.id, layer.texturePath);
    }
  }

  private loadTexture(layerId: string, texturePath: string): void {
    const layer = this.layers.get(layerId);
    if (!layer || !texturePath) return;

    if (texturePath.startsWith('data:')) {
      layer.style.backgroundImage = `url(${texturePath})`;
    } else {
      const img = new Image();
      img.onload = () => {
        layer.style.backgroundImage = `url(${texturePath})`;
      };
      img.onerror = () => {
        console.warn(`Failed to load texture: ${texturePath}`);
      };
      img.src = texturePath;
    }
  }

  subscribe(listener: (expression: ExpressionType) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.currentExpression));
  }

  switchExpression(expression: ExpressionType): void {
    if (expression === this.currentExpression) return;

    const activeLayers = EXPRESSION_MAP[expression];
    for (const [id, layer] of this.layers) {
      if (id === 'background') continue;
      layer.style.opacity = activeLayers.includes(id) ? '1' : '0';
    }

    // 更新表情图片
    const expressionLayer = this.layers.get('expression');
    if (expressionLayer && EXPRESSION_IMAGE_MAP[expression]) {
      expressionLayer.style.backgroundImage = `url(${EXPRESSION_IMAGE_MAP[expression]})`;
    }

    this.currentExpression = expression;
    this.notify();
  }

  setCharacterState(state: CharacterState): void {
    const expression = STATE_EXPRESSION_MAP[state];
    this.switchExpression(expression);
  }

  startAnimation(): void {
    this.startBreathing();
    this.startFloating();
    this.startBlinking();
    this.animate();
  }

  stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = undefined;
    }
  }

  private startBreathing(): void {
    // Breathing handled in animate()
  }

  private startFloating(): void {
    // Floating handled in animate()
  }

  private startBlinking(): void {
    this.blinkInterval = setInterval(() => {
      if (this.isBlinking) return;
      this.performBlink();
    }, IDLE_BLINK_INTERVAL);
  }

  private async performBlink(): Promise<void> {
    const eyeBase = this.layers.get('eye_base');
    if (!eyeBase) return;

    this.isBlinking = true;
    eyeBase.style.transition = 'transform 0.05s ease';
    eyeBase.style.transform = 'scaleY(0.1)';

    await new Promise((resolve) => setTimeout(resolve, 100));

    eyeBase.style.transition = 'transform 0.05s ease';
    eyeBase.style.transform = 'scaleY(1)';

    await new Promise((resolve) => setTimeout(resolve, 50));
    this.isBlinking = false;
  }

  private animate = (): void => {
    this.time += 0.016;

    const breathScale = 1 + Math.sin(this.time * IDLE_BREATH_SPEED) * IDLE_BREATH_SCALE;
    const floatY = Math.sin(this.time * IDLE_FLOAT_SPEED) * IDLE_FLOAT_AMPLITUDE;

    this.container.style.transform = `scale(${breathScale}) translateY(${floatY}px)`;

    this.animationFrame = requestAnimationFrame(this.animate);
  };

  showBlush(intensity: number = 0.7): void {
    const blush = this.layers.get('blush');
    if (blush) {
      blush.style.opacity = String(intensity);
    }
  }

  hideBlush(): void {
    const blush = this.layers.get('blush');
    if (blush) {
      blush.style.opacity = '0';
    }
  }

  setMouthOpen(open: boolean): void {
    const mouthBase = this.layers.get('mouth_base');
    const mouthOpen = this.layers.get('mouth_open');
    if (mouthBase && mouthOpen) {
      mouthBase.style.opacity = open ? '0' : '1';
      mouthOpen.style.opacity = open ? '1' : '0';
    }
  }

  destroy(): void {
    this.stopAnimation();
    this.container.innerHTML = '';
    this.layers.clear();
  }
}
