export type CharacterFeatureFlags = {
  enableVoice?: boolean;
  enableAutoRead?: boolean;
  enableProactiveChat?: boolean;
  enableEmotionImage?: boolean;
  enableMemorySeed?: boolean;
};

export type CharacterValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  sensitiveFieldsFound: string[];
  missingFiles: string[];
};

export type CharacterVoice = {
  provider: 'minimax';
  apiKeySource: 'network_center';
  model: string;
  voiceId: string;
  voiceName?: string;
  speed: number;
  vol: number;
  pitch: number;
  emotion?: string;
  format?: 'mp3' | 'wav' | 'flac';
  sampleRate?: number;
  bitrate?: number;
  channel?: 1 | 2;
  autoRead?: {
    assistantReply?: boolean;
    proactiveChat?: boolean;
    scheduledTask?: boolean;
  };
  rightClickRead?: boolean;
  cleanTextBeforeRead?: boolean;
  skipLinks?: boolean;
};

export type CharacterProactive = {
  enabled: boolean;
  personaPrompt: string;
  topicScope: string;
  tonePreset: string;
  customTone?: string;
  forbiddenTopics: string;
  enabledContentTypes?: Record<string, boolean>;
  allowWebSearch: boolean;
  interestKeywords: string[];
  trigger?: {
    type?: string;
    intervalMinutes?: number;
    timeOfDay?: string;
    idleMinutes?: number;
  };
  limits?: {
    minIntervalMinutes?: number;
    maxDailyMessages?: number;
    quietHoursEnabled?: boolean;
    quietStart?: string;
    quietEnd?: string;
  };
};

export type CharacterMemorySeed = {
  memories: Array<{
    type: string;
    content: string;
  }>;
};

export type CharacterManifest = {
  schemaVersion: number;
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  author?: string;
  version?: string;
  language?: string;
  personaFile?: string;
  voiceFile?: string;
  proactiveFile?: string;
  memorySeedFile?: string;
  assets?: {
    avatar?: string;
    fullbody?: string;
    idle?: string;
    emotionsDir?: string;
  };
  emotionMap?: Record<string, string>;
  defaultEmotion?: string;
  features?: CharacterFeatureFlags;
};

export type CharacterPack = CharacterManifest & {
  basePath: string;
  folderName: string;
  isTemplate?: boolean;
  personaText?: string;
  voice?: CharacterVoice;
  proactive?: CharacterProactive;
  memorySeed?: CharacterMemorySeed;
  assets: {
    avatar?: string;
    fullbody?: string;
    idle?: string;
    emotionsDir?: string;
  };
  validation: CharacterValidationResult;
};

export type CharacterScanResult = {
  rootPath: string;
  packs: CharacterPack[];
  scannedAt: string;
  errors: string[];
};
