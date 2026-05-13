import { AnimationController } from '../types';

export function createLookAround(): AnimationController {
  const config = {
    lookSpeed: 0.0008,
    maxLookAngle: 15,
    holdDuration: 2000,
  };

  let isPlaying = false;
  let startTime = 0;
  let phase: 'left' | 'center' | 'right' | 'done' = 'left';
  let phaseStartTime = 0;

  const getPhaseDuration = (p: typeof phase): number => {
    switch (p) {
      case 'left':
        return 800;
      case 'center':
        return config.holdDuration;
      case 'right':
        return 800;
      default:
        return 0;
    }
  };

  return {
    name: 'lookAround',
    isPlaying,

    start() {
      isPlaying = true;
      startTime = performance.now();
      phase = 'left';
      phaseStartTime = startTime;
    },

    stop() {
      isPlaying = false;
    },

    update(target: any, time: number) {
      if (!isPlaying || !target) return;

      const elapsed = time - startTime;
      const phaseElapsed = time - phaseStartTime;
      const phaseDuration = getPhaseDuration(phase);

      let rotation = 0;

      switch (phase) {
        case 'left':
          rotation = -config.maxLookAngle * Math.min(phaseElapsed / 400, 1);
          if (phaseElapsed >= phaseDuration) {
            phase = 'center';
            phaseStartTime = time;
          }
          break;

        case 'center':
          rotation = 0;
          if (phaseElapsed >= phaseDuration) {
            phase = 'right';
            phaseStartTime = time;
          }
          break;

        case 'right':
          rotation = config.maxLookAngle * Math.min(phaseElapsed / 400, 1);
          if (phaseElapsed >= phaseDuration) {
            phase = 'done';
          }
          break;

        case 'done':
          this.stop();
          break;
      }

      if (target.rotation !== undefined) {
        target.rotation = (rotation * Math.PI) / 180;
      }
    },
  };
}
