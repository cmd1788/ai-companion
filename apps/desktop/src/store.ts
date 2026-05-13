import { create } from 'zustand';
import { initDatabase, saveMessage, loadMessages, saveEmotion, loadEmotion, clearMessages as clearDbMessages, saveMemory, loadMemories } from './memory/db';

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

interface Memory {
  id: number;
  content: string;
  timestamp: number;
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
  memories: Memory[];
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
  updateEmotionFromChat: (userMessage: string, assistantReply: string) => void;
}

const DEFAULT_EMOTION: EmotionState = {
  happiness: 75,
  fatigue: 10,
  loneliness: 20,
  stress: 5,
  affection: 60,
};

const REAL_API_KEY = 'sk-cp-...1TKY';

// 情绪关键词检测
function analyzeSentiment(text: string): { keyword: string; delta: Partial<EmotionState> } | null {
  const positive = ['喜欢', '爱你', '棒', '好棒', '厉害', '谢谢', '开心', '高兴', '么么哒', '乖'];
  const negative = ['滚', '讨厌', '烦', '无聊', '累', '困', '难过', '伤心', '生气'];
  const affectionate = ['宝贝', '亲爱的', '小伊', '乖', '抱抱', '摸摸'];
  const lonely = ['没人', '寂寞', '孤独', '一个人', '没人理', '好无聊'];
  const stressed = ['压力', '焦虑', '担心', '害怕', '紧张'];

  for (const kw of positive) {
    if (text.includes(kw)) return { keyword: kw, delta: { happiness: 5, affection: 3 } };
  }
  for (const kw of negative) {
    if (text.includes(kw)) return { keyword: kw, delta: { happiness: -5, stress: 3 } };
  }
  for (const kw of affectionate) {
    if (text.includes(kw)) return { keyword: kw, delta: { affection: 5 } };
  }
  for (const kw of lonely) {
    if (text.includes(kw)) return { keyword: kw, delta: { loneliness: 5 } };
  }
  for (const kw of stressed) {
    if (text.includes(kw)) return { keyword: kw, delta: { stress: 5, fatigue: 3 } };
  }
  return null;
}

// 从对话中提取记忆
function extractMemory(userMessage: string, assistantReply: string): string | null {
  const memoryTriggers = [
    '我叫', '我叫', '名字是', '是程序员', '喜欢', '讨厌',
    '工作', '学校', '大学', '专业', '生日', '年龄',
    '住', '城市', '省份', '国家', '养', '有', '没有',
  ];

  const text = userMessage + assistantReply;
  for (const trigger of memoryTriggers) {
    if (text.includes(trigger) && text.length < 200) {
      // 提取含有关键词的句子
      const sentences = text.split(/[.。!！?？]/);
      for (const s of sentences) {
        if (s.includes(trigger) && s.length > 5 && s.length < 100) {
          return s.trim();
        }
      }
    }
  }
  return null;
}

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
  memories: [],
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
      const [savedEmotion, savedMessages, savedMemories] = await Promise.all([
        loadEmotion(),
        loadMessages(50),
        loadMemories()
      ]);
      console.log('[Store] Loaded:', savedMessages.length, 'messages,', savedMemories.length, 'memories');
      set({
        dbReady: true,
        emotion: savedEmotion || DEFAULT_EMOTION,
        messages: savedMessages,
        memories: savedMemories,
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
    console.log('[Store] addMessage:', message.role, message.content.substring(0, 20));
    const state = get();
    set((s) => ({ messages: [...s.messages, message] }));
    
    if (state.dbReady) {
      try {
        await saveMessage(message.role as 'user' | 'assistant' | 'system', message.content);
        console.log('[Store] Message saved to DB');
      } catch (e) {
        console.error('[Store] Failed to save message:', e);
      }
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

  // 根据对话内容更新情绪
  updateEmotionFromChat: (userMessage, assistantReply) => {
    const state = get();
    const newEmotion = { ...state.emotion };

    // 分析用户消息情感
    const userSentiment = analyzeSentiment(userMessage);
    if (userSentiment) {
      Object.assign(newEmotion, userSentiment.delta);
      console.log('[Store] User sentiment:', userSentiment.keyword);
    }

    // 分析AI回复情感
    if (assistantReply.includes('~') || assistantReply.includes('！') || assistantReply.includes('🥰')) {
      newEmotion.happiness = Math.min(100, newEmotion.happiness + 1);
    }

    // 自然衰减
    newEmotion.fatigue = Math.max(0, newEmotion.fatigue - 0.5);
    newEmotion.loneliness = Math.max(0, newEmotion.loneliness - 0.3);
    newEmotion.stress = Math.max(0, newEmotion.stress - 0.2);

    // 边界限制
    newEmotion.happiness = Math.max(0, Math.min(100, newEmotion.happiness));
    newEmotion.affection = Math.max(0, Math.min(100, newEmotion.affection));

    set({ emotion: newEmotion });
    saveEmotion(newEmotion);

    // 提取并保存记忆
    const memory = extractMemory(userMessage, assistantReply);
    if (memory && state.dbReady) {
      saveMemory(memory).then(() => {
        loadMemories().then(mems => set({ memories: mems }));
      });
      console.log('[Store] New memory:', memory);
    }
  },
}));
