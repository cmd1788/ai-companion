import { AnimationController, BlinkState } from '../types';

export class BlinkController {
  private state: BlinkState;
  private blinkDuration = 150;
  private minBlinkInterval = 2000;
  private maxBlinkInterval = 6000;

  constructor() {
    this.state = {
      isBlinking: false,
      blinkProgress: 0,
      nextBlinkTime: this.getNextBlinkTime(),
      blinkPhase: 'open',
    };
  }

  private getNextBlinkTime(): number {
    return (
      performance.now() +
      this.minBlinkInterval +
      Math.random() * (this.maxBlinkInterval - this.minBlinkInterval)
    );
  }

  update(time: number, onBlinkUpdate: (progress: number) => void): void {
    if (!this.state.isBlinking && time >= this.state.nextBlinkTime) {
      this.startBlink();
    }

    if (this.state.isBlinking) {
      this.updateBlink(time, onBlinkUpdate);
    }
  }

  private startBlink(): void {
    this.state.isBlinking = true;
    this.state.blinkProgress = 0;
    this.state.blinkPhase = 'closing';
  }

  private updateBlink(time: number, onBlinkUpdate: (progress: number) => void): void {
    const elapsed = time - this.state.nextBlinkTime;
    this.state.blinkProgress = Math.min(elapsed / this.blinkDuration, 1);

    switch (this.state.blinkPhase) {
      case 'closing':
        onBlinkUpdate(this.state.blinkProgress);
        if (this.state.blinkProgress >= 1) {
          this.state.blinkPhase = 'half';
          this.state.blinkProgress = 0;
        }
        break;

      case 'half':
        onBlinkUpdate(1);
        if (this.state.blinkProgress >= 0.3) {
          this.state.blinkPhase = 'opening';
          this.state.blinkProgress = 0;
        }
        break;

      case 'opening':
        onBlinkUpdate(1 - this.state.blinkProgress);
        if (this.state.blinkProgress >= 1) {
          this.state.blinkPhase = 'open';
          this.state.isBlinking = false;
          this.state.nextBlinkTime = this.getNextBlinkTime();
          onBlinkUpdate(0);
        }
        break;
    }
  }

  triggerBlink(): void {
    if (!this.state.isBlinking) {
      this.startBlink();
    }
  }

  getState(): BlinkState {
    return { ...this.state };
  }
}

export function createBlinkController(): BlinkController {
  return new BlinkController();
}
