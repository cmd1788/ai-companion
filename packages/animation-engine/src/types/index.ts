export type AnimationName =
  | 'idleBreath'
  | 'idleFloat'
  | 'blink'
  | 'lookAround'
  | 'talk'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'sleepy'
  | 'shy';

export type ExpressionType =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'sleepy'
  | 'shy'
  | 'surprised'
  | 'thinking';

export interface AnimationFrame {
  timestamp: number;
  properties: {
    scaleX?: number;
    scaleY?: number;
    x?: number;
    y?: number;
    rotation?: number;
    alpha?: number;
    skewX?: number;
    skewY?: number;
  };
}

export interface Animation {
  name: AnimationName;
  duration: number;
  loop: boolean;
  frames: AnimationFrame[];
  onComplete?: () => void;
}

export interface AnimationController {
  name: AnimationName;
  update: (target: any, time: number, deltaTime: number) => void;
  start: () => void;
  stop: () => void;
  isPlaying: boolean;
}

export interface BlinkState {
  isBlinking: boolean;
  blinkProgress: number;
  nextBlinkTime: number;
  blinkPhase: 'open' | 'closing' | 'half' | 'closed' | 'opening';
}

export interface ExpressionConfig {
  eye: string;
  mouth: string;
  effect?: string;
  blush?: boolean;
}
