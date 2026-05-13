import { AnimationController } from '../types';

export function createIdleFloat(): AnimationController {
  const config = {
    floatSpeed: 0.001,
    floatAmplitude: 5,
    floatDelay: 1000,
  };

  let isPlaying = false;
  let startTime = 0;

  return {
    name: 'idleFloat',
    isPlaying,

    start() {
      isPlaying = true;
      startTime = performance.now();
    },

    stop() {
      isPlaying = false;
    },

    update(target: any, time: number, deltaTime: number) {
      if (!isPlaying || !target) return;

      const elapsed = time - startTime;
      const floatCycle = Math.sin((elapsed + config.floatDelay) * config.floatSpeed);

      if (target.y !== undefined) {
        target.y = floatCycle * config.floatAmplitude;
      }

      if (target.rotation !== undefined) {
        target.rotation = floatCycle * 0.02;
      }
    },
  };
}
