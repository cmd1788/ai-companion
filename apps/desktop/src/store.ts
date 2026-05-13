import { create } from 'zustand';
import { initDatabase, saveMessage, loadMessages, saveEmotion, loadEmotion, clearMessages as clearDbMessages } from './memory/db';

interface CharacterProfile {
  id: string;
  name: string;
  personality: string[];
}

export interface EmotionState {
  happiness: number;
  fatigue: number;
  loneliness: number;
  stress: number;
  affection: number;
}

interface AIConfig {
  provider: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  apiKey?: string;
}

interface AppState {
  dbReady: boolean;
  character: CharacterProfile;
  emotion: EmotionState;
  characterState: string;
  messages: Array<{role: string; content: string}>;
  isSettingsOpen: boolean;
  isChatOpen: boolean;
  aiConfig: AIConfig;
  photoPath: string;
  initDB: () => Promise<void>;
  setEmotion: (emotion: EmotionState) => void;
  setCharacterState: (state: string) => void;
  addMessage: (message: {role: string; content: string}) => void;
  clearMessages: () => void;
  setSettingsOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setAIConfig: (config: AIConfig) => void;
  setPhotoPath: (path: string) => void;
}

const DEFAULT_EMOTION: EmotionState = {
  happiness: 75,
  fatigue: 10,
  loneliness: 20,
  stress: 5,
  affection: 60,
};

const REAL_API_KEY = 'sk-cp-eZ_KsU3aRH1rcNGPfFlBdIyFqLt4wfIZm9LgQ8dyHJEjUFXBwfqGjbK9Ne7sBIVGpoiR6okgH-SDRbSelgVtsNTaT3wUkTY5ox8TS-EWyRaDFc9a_uj1TKY';

export const useAppStore = create<AppState>((set, get) => ({
  dbReady: false,
  character: {
    id: 'yi',
    name: '小伊',
    personality: ['超级可爱', '话痨', '活泼开朗', '粘人', '爱撒娇'],
  },

  emotion: { ...DEFAULT_EMOTION },

  characterState: 'idle',
  messages: [],
  isSettingsOpen: false,
  isChatOpen: true,
  aiConfig: {
    provider: 'minimax',
    baseUrl: 'https://api.minimax.chat',
    model: 'MiniMax-M2.7-highspeed',
    maxTokens: 200,
    temperature: 0.8,
    apiKey: REAL_API_KEY,
  },

  photoPath: 'E:/BaiduNetdiskDownload/2333/anon',

  setPhotoPath: (photoPath) => set({ photoPath }),

  initDB: async () => {
    console.log('[Store] initDB called');
    try {
      await initDatabase();
      const [savedEmotion, savedMessages] = await Promise.all([
        loadEmotion(),
        loadMessages(50)
      ]);
      console.log('[Store] Loaded:', savedMessages.length, 'messages, emotion:', savedEmotion);
      set({
        dbReady: true,
        emotion: savedEmotion || DEFAULT_EMOTION,
        messages: savedMessages,
      });
    } catch (e) {
      console.error('[Store] DB init failed:', e);
      set({ dbReady: true });
    }
  },

  setEmotion: (emotion) => {
    set({ emotion });
    saveEmotion(emotion);
  },

  setCharacterState: (characterState) => set({ characterState }),

  addMessage: async (message) => {
    console.log('[Store] addMessage called:', message.role, message.content.substring(0, 20));
    const state = get();
    console.log('[Store] Current state - dbReady:', state.dbReady, 'messages:', state.messages.length);
    set((s) => ({ messages: [...s.messages, message] }));
    console.log('[Store] Messages array updated');
    if (state.dbReady) {
      console.log('[Store] Saving to DB...');
      await saveMessage(message.role as 'user' | 'assistant' | 'system', message.content);
      console.log('[Store] DB save complete');
    } else {
      console.log('[Store] DB not ready, skipping save');
    }
  },

  clearMessages: () => {
    if (get().dbReady) {
      clearDbMessages();
    }
    set({ messages: [] });
  },

  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setChatOpen: (isChatOpen) => set({ isChatOpen }),
  setAIConfig: (aiConfig) => set({ aiConfig }),
}));
