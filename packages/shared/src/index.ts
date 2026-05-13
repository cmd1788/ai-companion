// Core type definitions for AI Companion

export interface CharacterProfile {
  id: string;
  name: string;
  personality: string[];
  speakingStyle: {
    tone: string;
    suffix: string[];
  };
  emotionalBias: {
    happy: number;
    angry: number;
    shy: number;
  };
  relationship: {
    favorability: number;
    trust: number;
  };
}

export interface EmotionState {
  happiness: number;
  fatigue: number;
  loneliness: number;
  stress: number;
  affection: number;
}

export type CharacterState =
  | 'idle'
  | 'talking'
  | 'thinking'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'sleeping'
  | 'excited'
  | 'listening'
  | 'surprised';

export interface Memory {
  id: string;
  sessionId?: string;
  createdAt: number;
  content: string;
  memoryType: 'event' | 'preference' | 'fact' | 'relationship';
  emotionalTags?: string[];
  importanceScore: number;
  recallCount: number;
  lastRecalledAt?: number;
}

export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
  context: Record<string, unknown>;
  summary?: string;
  importanceScore: number;
}

export interface Relationship {
  id: string;
  userId: string;
  characterId: string;
  favorability: number;
  trust: number;
  totalInteractions: number;
  lastInteractionAt?: number;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface EmotionEvent {
  type: string;
  intensity: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AIConfig {
  provider: 'openai' | 'claude' | 'ollama' | 'minimax' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AppSettings {
  aiConfig: AIConfig;
  characterId: string;
  alwaysOnTop: boolean;
  opacity: number;
}
