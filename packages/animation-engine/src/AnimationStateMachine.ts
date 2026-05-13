import { AnimationName } from './types';

export type AnimationState =
  | 'idle'
  | 'talking'
  | 'thinking'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'sleepy'
  | 'shy'
  | 'surprised';

export interface StateTransition {
  from: AnimationState;
  to: AnimationState;
  duration: number;
}

export class AnimationStateMachine {
  private currentState: AnimationState = 'idle';
  private previousState: AnimationState = 'idle';
  private transitionProgress = 1;
  private transitionDuration = 300;
  private isTransitioning = false;

  private stateListeners: Map<AnimationState, Set<() => void>> = new Map();
  private transitionListeners: Set<(from: AnimationState, to: AnimationState) => void> =
    new Set();

  getState(): AnimationState {
    return this.currentState;
  }

  getPreviousState(): AnimationState {
    return this.previousState;
  }

  isInTransition(): boolean {
    return this.isTransitioning;
  }

  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  changeState(newState: AnimationState): void {
    if (this.currentState === newState) return;

    this.previousState = this.currentState;
    this.currentState = newState;
    this.isTransitioning = true;
    this.transitionProgress = 0;

    this.transitionListeners.forEach((listener) => {
      listener(this.previousState, this.currentState);
    });

    const stateListeners = this.stateListeners.get(newState);
    if (stateListeners) {
      stateListeners.forEach((listener) => listener());
    }
  }

  update(deltaTime: number): void {
    if (!this.isTransitioning) return;

    this.transitionProgress += deltaTime;

    if (this.transitionProgress >= this.transitionDuration) {
      this.transitionProgress = this.transitionDuration;
      this.isTransitioning = false;
    }
  }

  onStateChange(state: AnimationState, callback: () => void): () => void {
    if (!this.stateListeners.has(state)) {
      this.stateListeners.set(state, new Set());
    }
    this.stateListeners.get(state)!.add(callback);

    return () => {
      this.stateListeners.get(state)?.delete(callback);
    };
  }

  onTransition(callback: (from: AnimationState, to: AnimationState) => void): () => void {
    this.transitionListeners.add(callback);
    return () => {
      this.transitionListeners.delete(callback);
    };
  }

  getEasing(): number {
    if (!this.isTransitioning) return 1;
    const t = this.transitionProgress / this.transitionDuration;
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  mapStateToAnimation(): AnimationName {
    switch (this.currentState) {
      case 'idle':
        return 'idleBreath';
      case 'talking':
        return 'talk';
      case 'thinking':
        return 'idleFloat';
      case 'happy':
        return 'happy';
      case 'sad':
        return 'sad';
      case 'angry':
        return 'angry';
      case 'sleepy':
        return 'sleepy';
      case 'shy':
        return 'shy';
      case 'surprised':
        return 'idleFloat';
      default:
        return 'idleBreath';
    }
  }
}
