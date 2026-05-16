import { create } from 'zustand';
import { initDatabase, saveMessage, loadMessages, saveEmotion, loadEmotion, clearMessages as clearDbMessages, saveMemory, loadMemories } from './memory/db';

// localStorage keys
const STORAGE_KEYS = {
  networkSettings: 'ai-companion-network-settings',
} as const;

// Load network settings from localStorage
function loadNetworkSettingsFromStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.networkSettings);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 应用迁移逻辑
        return migrateNetworkSettings(parsed);
      }
    }
  } catch (e) {
    console.warn('[Store] Failed to load networkSettings from localStorage:', e);
  }
  return null;
}

// 重置联网设置为默认值（保留 MiniMax Key 等其他设置）
function resetNetworkSettingsToDefault(currentSettings: NetworkSettings): NetworkSettings {
  const oldProvider = currentSettings.provider;
  console.log('[Store] NETWORK_SETTINGS_RESET:');
  console.log('  old_provider=', oldProvider);
  console.log('  new_provider=minimax_web_search');
  console.log('  new_enableWebSearch=true');
  return {
    ...currentSettings,
    provider: 'minimax_web_search',
    enableWebSearch: true,
    enableImageGen: currentSettings.enableImageGen ?? false,
    imageOutputPath: currentSettings.imageOutputPath ?? '',
    settingsVersion: 2,
  };
}

// Save network settings to localStorage
function saveNetworkSettingsToStorage(settings: NetworkSettings) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.networkSettings, JSON.stringify(settings));
    }
  } catch (e) {
    console.warn('[Store] Failed to save networkSettings to localStorage:', e);
  }
}

// 旧版 bridge provider 列表（需要迁移到 minimax_web_search）
const LEGACY_BRIDGE_PROVIDERS = [
  'mock', 'minimax_mcp_bridge', 'openclaw_bridge', 'mcp_bridge',
  'minimax_agent', 'browser_mock', 'disabled'
];

// 联网设置迁移函数 - settingsVersion < 2 时执行
function migrateNetworkSettings(settings: NetworkSettings | null): NetworkSettings {
  const CURRENT_VERSION = 2;
  const DEFAULT_SETTINGS: NetworkSettings = {
    enableWebSearch: true,
    provider: 'minimax_web_search',
    maxResults: 5,
    autoSummarize: true,
    enableNetworkLogs: true,
    settingsVersion: CURRENT_VERSION,
  };

  // 如果没有旧设置，使用默认
  if (!settings) {
    console.log('[Store] No networkSettings in localStorage, using defaults');
    return DEFAULT_SETTINGS;
  }

  // 如果已经是最新版本，直接返回
  if ((settings.settingsVersion || 0) >= CURRENT_VERSION) {
    return settings;
  }

  // 执行迁移
  const oldProvider = settings.provider;
  const oldEnableWebSearch = settings.enableWebSearch;

  // 检查是否需要迁移 provider
  const needsProviderMigration = LEGACY_BRIDGE_PROVIDERS.includes(oldProvider);

  if (needsProviderMigration || !settings.enableWebSearch) {
    console.log('[Store] NETWORK_SETTINGS_MIGRATED:');
    console.log('  old_provider=', oldProvider);
    console.log('  new_provider=minimax_web_search');
    console.log('  old_enableWebSearch=', oldEnableWebSearch);
    console.log('  new_enableWebSearch=true');

    // 返回迁移后的设置（保留其他所有字段）
    return {
      ...settings,
      provider: 'minimax_web_search',
      enableWebSearch: true,
      settingsVersion: CURRENT_VERSION,
    };
  }

  // 不需要迁移，但更新版本号
  return {
    ...settings,
    settingsVersion: CURRENT_VERSION,
  };
}

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

// 风格设置接口
interface StyleSettings {
  showEmotionBar: boolean;      // 显示情绪指标条
  showCharacter: boolean;       // 显示角色立绘
  showChat: boolean;            // 显示聊天面板
  showToolbar: boolean;         // 显示底部工具栏
  enableTTS: boolean;           // 开启语音朗读
  enableScreenWatch: boolean;   // 开启截屏观察
  enableAutoReply: boolean;     // 开启主动回复
}

// 系统设置接口
interface SystemSettings {
  screenWatchInterval: number;  // 截屏间隔(秒)
  autoReplySpeed: 'slow' | 'normal' | 'fast';  // 主动回复速度
  memoryDays: number;           // 记忆保存天数
}

// 人物设定接口
interface CharacterSettings {
  personality: string[];        // 性格标签
  name: string;                // 角色名称
  photoPath: string;            // 照片路径
  customDescription?: string;    // 自定义角色描述
}

// 联网设置接口
interface NetworkSettings {
  enableWebSearch: boolean;     // 开启联网搜索
  enableImageGen: boolean;       // 开启图片生成
  imageOutputPath: string;      // 图片输出目录
  provider: 'minimax_web_search' | 'minimax' | 'fetch' | 'mock' | 'disabled' | 'minimax_mcp_bridge' | 'minimax_agent' | 'github_api' | 'openclaw_bridge' | 'mcp_bridge';  // 联网供应商
  maxResults: number;           // 搜索结果数量
  autoSummarize: boolean;       // 自动总结网页
  enableNetworkLogs: boolean;   // 网络请求日志开关
  settingsVersion?: number;      // 设置版本，用于迁移
}

// 联网搜索元数据（用于结构化展示）
export interface WebSearchMeta {
  provider: string;        // 'minimax_web_search'
  isMock: boolean;         // false
  query: string;          // 搜索关键词
  resultCount: number;     // 结果数量
  source: string;         // 来源名称
  results: Array<{
    title: string;
    url: string;
    snippet?: string;
    date?: string;
  }>;
}

// 定时任务类型
export type ScheduledTaskType = 'once' | 'daily' | 'interval';

// 定时任务接口
export interface ScheduledTask {
  id: string;
  title: string;
  content: string;            // 任务内容（用户输入）
  type: ScheduledTaskType;
  enabled: boolean;
  timeOfDay?: string;         // HH:mm 格式，用于 daily
  intervalMinutes?: number;    // 分钟数，用于 interval
  runAt?: string;             // ISO 时间字符串，用于 once
  nextRunAt: string;          // ISO 时间字符串
  lastRunAt?: string;         // ISO 时间字符串
  completedAt?: string;        // ISO 时间字符串，once 执行完成后标记
  runCount: number;           // 累计执行次数
  createdAt: string;          // ISO 时间字符串
  updatedAt: string;          // ISO 时间字符串
}

interface AppState {
  dbReady: boolean;
  character: CharacterProfile;
  emotion: EmotionState;
  characterState: string;
  currentExpression: string;  // 当前表情图片
  messages: Array<{role: string; content: string}>;
  memories: Memory[];
  isSettingsOpen: boolean;
  isChatOpen: boolean;
  aiConfig: AIConfig;
  photoPath: string;
  // 新增设置
  styleSettings: StyleSettings;
  systemSettings: SystemSettings;
  characterSettings: CharacterSettings;
  networkSettings: NetworkSettings;  // 联网设置
  // 新增设置方法
  setStyleSettings: (settings: StyleSettings) => void;
  setSystemSettings: (settings: SystemSettings) => void;
  setCharacterSettings: (settings: CharacterSettings) => void;
  setNetworkSettings: (settings: NetworkSettings) => void;  // 联网设置方法
  resetNetworkSettings: () => void;  // 重置联网设置为 minimax_web_search
  setCharacter: (character: CharacterProfile) => void;
  setCurrentExpression: (expression: string) => void;
  initDB: () => Promise<void>;
  setEmotion: (emotion: EmotionState) => void;
  setCharacterState: (state: string) => void;
  addMessage: (message: {role: string; content: string; webSearchMeta?: WebSearchMeta}) => Promise<void>;
  clearMessages: () => void;
  setSettingsOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setAIConfig: (config: AIConfig) => void;
  setPhotoPath: (path: string) => void;
  updateEmotionFromChat: (userMessage: string, assistantReply: string) => void;
  setMemories: (memories: Memory[]) => void;
  scheduledTasks: ScheduledTask[];
  setScheduledTasks: (tasks: ScheduledTask[]) => void;
}

const DEFAULT_EMOTION: EmotionState = {
  happiness: 75,
  fatigue: 10,
  loneliness: 20,
  stress: 5,
  affection: 60,
};

const REAL_API_KEY = 'sk-cp-eZ_KsU3aRH1rcNGPfFlBdIyFqLt4wfIZm9LgQ8dyHJEjUFXBwfqGjbK9Ne7sBIVGpoiR6okgH-SDRbSelgVtsNTaT3wUkTY5ox8TS-EWyRaDFc9a_uj1TKY'; // 默认填充，用户可修改

// 情绪关键词检测
function analyzeSentiment(text: string): { keyword: string; delta: Partial<EmotionState>; expression: string } | null {
  const lowerText = text.toLowerCase();
  
  // 开心/愉悦类
  const positive = [
    '开心', '高兴', '快乐', '愉快', '爽', '棒', '好棒', '厉害', '谢谢', '感谢',
    '喜欢', '爱你', '么么哒', '乖', '可爱', '哈哈', '嘻嘻', '笑', '真好',
    '特别开心', '超开心', '非常开心', '太开心', '好开心', '特别高兴'
  ];
  
  // 难过/伤心类
  const negative = [
    '滚', '讨厌', '烦', '无聊', '累', '困', '难过', '伤心', '生气', '不爽',
    '悲伤', '痛苦', '失落', '沮丧', '郁闷', '委屈', '难过', '好难过', '太难过了',
    '不开心', '不高兴', '不快乐'
  ];
  
  // 亲密/喜爱类
  const affectionate = [
    '宝贝', '亲爱的', '小伊', '乖', '抱抱', '摸摸', '想你', '想你了', '想念',
    '爱你', '喜欢你', '喜欢你', '心肝', '甜心', '宝贝儿', '亲亲', '么么'
  ];
  
  // 孤独/寂寞类
  const lonely = [
    '没人', '寂寞', '孤独', '一个人', '没人理', '好无聊', '无聊', '孤单',
    '没人陪', '自己一个人', '冷冷清清'
  ];
  
  // 压力/焦虑类
  const stressed = [
    '压力', '焦虑', '担心', '害怕', '紧张', '不安', '压力好大', '压力很大',
    '焦虑', '好焦虑', '担心', '好担心', '紧张', '好紧张', '害怕', '好害怕'
  ];
  
  // 疲惫类
  const tired = [
    '累', '困', '疲惫', '疲劳', '累死了', '好累', '太累了', '困了', '好困',
    '想睡觉', '睡', '休息', '疲惫不堪'
  ];

  for (const kw of positive) {
    if (lowerText.includes(kw)) return { keyword: kw, delta: { happiness: 5, affection: 3 }, expression: '01_happy' };
  }
  for (const kw of negative) {
    if (lowerText.includes(kw)) return { keyword: kw, delta: { happiness: -5, stress: 3 }, expression: '02_angry' };
  }
  for (const kw of affectionate) {
    if (lowerText.includes(kw)) return { keyword: kw, delta: { affection: 5, happiness: 2 }, expression: '20_love' };
  }
  for (const kw of lonely) {
    if (lowerText.includes(kw)) return { keyword: kw, delta: { loneliness: 5, happiness: -2 }, expression: '03_sad' };
  }
  for (const kw of stressed) {
    if (lowerText.includes(kw)) return { keyword: kw, delta: { stress: 5, fatigue: 3 }, expression: '14_scared' };
  }
  for (const kw of tired) {
    if (lowerText.includes(kw)) return { keyword: kw, delta: { fatigue: 5 }, expression: '07_sleepy' };
  }
  return null;
}

// 根据情绪状态计算表情
function getExpressionFromEmotion(emotion: EmotionState): string {
  const { happiness, fatigue, loneliness, stress, affection } = emotion;
  
  // 高疲劳-困倦
  if (fatigue > 60) return '07_sleepy';
  // 高压力/害怕
  if (stress > 50) return '14_scared';
  // 高孤独
  if (loneliness > 60) return '03_sad';
  // 高喜悦/喜爱
  if (happiness > 80 && affection > 60) return '20_love';
  if (happiness > 70) return '11_excited';
  // 中等喜悦
  if (happiness > 50) return '01_happy';
  // 负情绪
  if (happiness < 30) return '10_disappointed';
  // 默认平静
  return '12_cold';
}

// 从用户消息中提取记忆（不包含AI回复）
function extractMemory(userMessage: string): string | null {
  // 明确要求记住的触发词（高优先级）
  const strongTriggers = [
    '请记住', '记住我的', '我的偏好', '我希望你', '我希望',
    '回答问题时', '以后都要', '以后请', '请一定', '一定要',
    '记住：', '记住，', '偏好是', '喜欢中文', '中文回答',
  ];

  for (const trigger of strongTriggers) {
    if (userMessage.includes(trigger)) {
      // 取整句或整段
      return userMessage.trim();
    }
  }

  // 普通触发词（需要长度限制避免污染）
  const memoryTriggers = [
    '我叫', '名字是', '是程序员', '工作', '学校', '大学', '专业',
    '生日', '年龄', '城市', '省份', '国家', '养', '职业',
    '喜欢', '讨厌', '运动', '猫', '狗',
  ];

  for (const trigger of memoryTriggers) {
    if (userMessage.includes(trigger) && userMessage.length < 200) {
      // 提取含有关键词的句子
      const sentences = userMessage.split(/[.。!！?？,，]/);
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
  currentExpression: '01_happy',
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

  // 新增设置默认值
  styleSettings: {
    showEmotionBar: true,
    showCharacter: true,
    showChat: true,
    showToolbar: true,
    enableTTS: false,
    enableScreenWatch: true,
    enableAutoReply: true,
  },

  systemSettings: {
    screenWatchInterval: 30,
    autoReplySpeed: 'normal',
    memoryDays: 30,
  },

  characterSettings: {
    personality: ['超级可爱', '话痨', '活泼开朗', '粘人', '爱撒娇'],
    name: '小伊',
    photoPath: 'E:/BaiduNetdiskDownload/2333/anon',
  },

  // 联网设置默认值（从 localStorage 加载）
  networkSettings: loadNetworkSettingsFromStorage() || {
    enableWebSearch: true,  // 默认开启联网搜索
    enableImageGen: false,  // 默认关闭图片生成
    imageOutputPath: '',
    provider: 'minimax_web_search',
    maxResults: 5,
    autoSummarize: true,
    enableNetworkLogs: true,
  },

  setPhotoPath: (photoPath) => set({ photoPath }),

  // 新增设置方法
  setStyleSettings: (styleSettings) => set({ styleSettings }),
  setSystemSettings: (systemSettings) => set({ systemSettings }),
  setCharacterSettings: (characterSettings) => set({ characterSettings }),
  setNetworkSettings: (networkSettings) => {
    const merged = typeof networkSettings === 'function'
      ? networkSettings(useAppStore.getState().networkSettings)
      : networkSettings;
    // First update state, then persist to localStorage
    // This ensures state is always the source of truth
    set({ networkSettings: merged });
    saveNetworkSettingsToStorage(merged);
  },

  // 重置联网设置为 minimax_web_search（保留其他设置）
  resetNetworkSettings: () => {
    const current = useAppStore.getState().networkSettings;
    const reset = resetNetworkSettingsToDefault(current);
    set({ networkSettings: reset });
    saveNetworkSettingsToStorage(reset);
    console.log('[Store] resetNetworkSettings called');
  },
  setCharacter: (character) => set({ character }),
  setCurrentExpression: (expression) => set({ currentExpression: expression }),

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
      console.log(`CHAT_LOAD_COUNT=${savedMessages.length}`);
      console.log(`CHAT_STORE_SET_COUNT=${savedMessages.length}`);
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
        console.log(`CHAT_SAVE_ATTEMPT=true CHAT_SAVE_ROLE=${message.role} CHAT_SAVE_CONTENT_LENGTH=${message.content.length}`);
        await saveMessage(message.role as 'user' | 'assistant' | 'system', message.content);
        console.log(`CHAT_SAVE_OK=true CHAT_SAVE_ROLE=${message.role}`);
        console.log('[Store] Message saved to DB');
      } catch (e) {
        console.error(`CHAT_SAVE_OK=false CHAT_SAVE_ROLE=${message.role}`);
        console.error('[Store] Failed to save message:', e);
      }
    } else {
      console.warn(`CHAT_SAVE_SKIPPED_DB_NOT_READY=true CHAT_SAVE_ROLE=${message.role}`);
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
    let newExpression = state.currentExpression;
    
    if (userSentiment) {
      Object.assign(newEmotion, userSentiment.delta);
      newExpression = userSentiment.expression;
      console.log('[Store] User sentiment:', userSentiment.keyword, '-> expression:', newExpression);
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

    // 根据情绪状态更新表情（如果没有从关键词匹配）
    if (newExpression === state.currentExpression) {
      newExpression = getExpressionFromEmotion(newEmotion);
    }

    set({ emotion: newEmotion, currentExpression: newExpression });
    saveEmotion(newEmotion);

    // 提取并保存记忆（只从用户消息提取）
    const memory = extractMemory(userMessage);
    if (memory && state.dbReady) {
      saveMemory(memory).then(() => {
        loadMemories().then(mems => set({ memories: mems }));
      });
      console.log('[Store] New memory:', memory);
    }
  },

  setMemories: (memories) => set({ memories }),

  scheduledTasks: [],

  setScheduledTasks: (tasks) => set({ scheduledTasks: tasks }),
}));
