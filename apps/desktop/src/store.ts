import { create } from 'zustand';

interface CharacterProfile {
  id: string;
  name: string;
  personality: string[];
}

interface EmotionState {
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
  character: CharacterProfile;
  emotion: EmotionState;
  characterState: string;
  messages: Array<{role: string; content: string}>;
  isSettingsOpen: boolean;
  isChatOpen: boolean;
  aiConfig: AIConfig;
  setCharacter: (character: CharacterProfile) => void;
  setEmotion: (emotion: EmotionState) => void;
  setCharacterState: (state: string) => void;
  addMessage: (message: {role: string; content: string}) => void;
  clearMessages: () => void;
  setSettingsOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setAIConfig: (config: AIConfig) => void;
}

export const useAppStore = create<AppState>((set) => ({
  character: {
    id: 'yi',
    name: '小伊',
    personality: ['超级可爱', '话痨', '活泼开朗', '粘人', '爱撒娇'],
  },

  emotion: {
    happiness: 75,
    fatigue: 10,
    loneliness: 20,
    stress: 5,
    affection: 60,
  },

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
    apiKey: 'sk-cp-eZ_KsU3aRH1rcNGPfFlBdIyFqLt4wfIZm9LgQ8dyHJEjUFXBwfqGjbK9Ne7sBIVGpoiR6okgH-SDRbSelgVtsNTaT3wUkTY5ox8TS-EWyRaDFc9a_uj1TKY',
  },

  setCharacter: (character) => set({ character }),
  setEmotion: (emotion) => set({ emotion }),
  setCharacterState: (characterState) => set({ characterState }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setChatOpen: (isChatOpen) => set({ isChatOpen }),
  setAIConfig: (aiConfig) => set({ aiConfig }),
}));
