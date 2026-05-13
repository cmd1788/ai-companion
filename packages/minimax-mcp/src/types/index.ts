export interface MiniMaxConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export type TaskType =
  | 'chat'
  | 'emotion_analysis'
  | 'image_generation'
  | 'vision_analysis'
  | 'text_to_speech'
  | 'music_generation'
  | 'video_generation';

export interface QuotaStatus {
  remaining: number;
  total: number;
  resetTime: number;
  hourlyBudget: number;
  dailyBudget: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface VisionResult {
  description: string;
  activities: string[];
  mood: string;
  confidence: number;
}

export interface GenerationOptions {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
}
