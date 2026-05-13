import { AnimationController } from '../types';

export function createIdleBreath(): AnimationController {
  const config = {
    breathSpeed: 0.002,
    breathIntensity: 0.015,
    verticalIntensity: 2,
  };

  let isPlaying = false;

  return {
    name: 'idleBreath',
    isPlaying,

    start() {
      isPlaying = true;
    },

    stop() {
      isPlaying = false;
    },

    update(target: any, time: number) {
      if (!isPlaying || !target) return;

      const breathCycle = Math.sin(time * config.breathSpeed);

      if (target.scale !== undefined) {
        target.scale.y = 1 + breathCycle * config.breathIntensity;
        target.scale.x = 1 - breathCycle * config.breathIntensity * 0.3;
      }

      if (target.y !== undefined) {
        target.y = breathCycle * config.verticalIntensity;
      }
    },
  };
}
