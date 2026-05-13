// Core package - shared constants and utilities

export const EMOTION_DECAY = {
  happiness: -0.5,
  fatigue: 0.3,
  loneliness: 0.2,
  stress: -0.4,
  affection: -0.1,
} as const;

export const EMOTION_CLAMP = {
  min: 0,
  max: 100,
} as const;

export const IDLE_BLINK_INTERVAL = 3000;
export const IDLE_BREATH_SPEED = 1.5;
export const IDLE_FLOAT_SPEED = 0.8;
export const IDLE_FLOAT_AMPLITUDE = 3;
export const IDLE_BREATH_SCALE = 0.015;

export const DEFAULT_CHARACTER_ID = 'default';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export { CompanionEngine, type CompanionConfig } from './CompanionEngine';
