/**
 * AI Companion Proactive Chat Center
 * Configurable proactive messages built from real app context.
 */

import { useAppStore } from './store';
import { loadScheduledTasks } from './scheduledTask';
import { networkLog } from './runtime/networkLog';
import type { NetworkSearchResult } from './runtime/runtimeTypes';
import { maybeAutoRead } from './voice';

export type ProactiveTonePreset =
  | 'gentle'
  | 'lively'
  | 'work_assistant'
  | 'concise'
  | 'cute'
  | 'formal'
  | 'custom';

export type ProactiveAction =
  | 'care'
  | 'project_reminder'
  | 'interest_news'
  | 'daily_summary'
  | 'custom'
  | 'need_context';

export interface ProactiveInterestTopic {
  id: string;
  name: string;
  keywords: string[];
  frequency: string;
  enabled: boolean;
  maxResults: number;
  lastSearchedAt?: string;
}

export interface ProactiveChatSettings {
  enabled: boolean;

  personaPrompt: string;
  topicScope: string;
  tonePreset: ProactiveTonePreset;
  customTone: string;
  forbiddenTopics: string;

  enabledContentTypes: {
    care: boolean;
    projectReminder: boolean;
    interestNews: boolean;
    dailySummary: boolean;
    studyReminder: boolean;
    customMessage: boolean;
  };
  customMessagePrompt: string;

  triggerType: 'fixed_time' | 'interval' | 'idle' | 'context';
  timeOfDay?: string;
  intervalMinutes?: number;
  idleMinutes?: number;

  allowWebSearch: boolean;
  interestKeywords: string[];
  interestTopics: ProactiveInterestTopic[];
  maxResults: number;

  minIntervalMinutes: number;
  maxDailyMessages: number;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;

  lastTriggeredAt?: string;
  nextRunAt?: string;
  runCountToday: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProactiveTriggerRecord {
  id: string;
  time: string;
  type: ProactiveAction;
  usedWebSearch: boolean;
  topic: string;
  resultSummary: string;
  success: boolean;
  error?: string;
  provider?: string;
  isMock?: boolean;
  resultCount?: number;
}

export interface ProactiveRunResult {
  success: boolean;
  action: ProactiveAction;
  message: string;
  record: ProactiveTriggerRecord;
}

interface ProactiveContext {
  currentTime: string;
  recentUserMessages: string[];
  recentAssistantMessages: string[];
  recentWebSearch: {
    query: string;
    resultCount: number;
    provider: string;
    timestamp: number;
  } | null;
  memories: string[];
  scheduledTasksSummary: {
    total: number;
    enabled: number;
    next: string[];
    recentTriggered: string[];
  };
  moodState: {
    happiness: number;
    fatigue: number;
    loneliness: number;
    stress: number;
    affection: number;
  };
  characterSettings: {
    name?: string;
    personality?: string[];
  };
}

const SETTINGS_KEY = 'ai_companion_proactive_chat_settings';
const RECORDS_KEY = 'ai_companion_proactive_trigger_records';
const MAX_RECORDS = 20;
const CHECK_INTERVAL_MS = 60000;
const TEST_CHECK_INTERVAL_MS = 5000;
const USER_ACTIVITY_COOLDOWN_MS = 30000;

let proactiveInterval: ReturnType<typeof setInterval> | null = null;
let lastUserMessageAt = 0;
let isGeneratingProactive = false;

const INTERNAL_ENGLISH_MARKERS = [
  'The user',
  'I need to',
  'We need to',
  'Here is',
  'Sure',
  'Let me',
  'I can help',
  'As an AI',
  "I'm an AI",
];

const CONTEXT_SIGNAL_TERMS = [
  '联网中心',
  'AI Companion',
  '视频集锦',
  'MiniMax',
  'MCP',
  'OpenClaw',
  'Hermes',
  'Codex',
  '构建',
  '日志',
  '实机',
  '测试',
  '修复',
  '项目',
  'bug',
];

export const TONE_PRESET_OPTIONS: Array<{ value: ProactiveTonePreset; label: string }> = [
  { value: 'gentle', label: '温柔陪伴' },
  { value: 'lively', label: '活泼可爱' },
  { value: 'work_assistant', label: '工作助理' },
  { value: 'concise', label: '简洁提醒' },
  { value: 'cute', label: '撒娇一点' },
  { value: 'formal', label: '正式稳重' },
  { value: 'custom', label: '自定义' },
];

const TONE_TEXT: Record<ProactiveTonePreset, string> = {
  gentle: '温柔陪伴，先关心，再轻轻提醒，像陪伴型桌宠。',
  lively: '活泼可爱，自然轻快，但不要吵闹。',
  work_assistant: '像可靠的工作助理，先说重点，再给下一步建议。',
  concise: '简洁提醒，只说必要信息，不铺垫。',
  cute: '稍微撒娇一点，亲近但不过度。',
  formal: '正式稳重，清晰克制。',
  custom: '遵守用户自定义语气。',
};

const DEFAULT_PERSONA_PROMPT = `你是一个温柔、细心、略微撒娇的小伊。
主动说话时要像陪伴型桌宠，不要像工作报告。
你可以关心我是否休息、是否喝水、是否继续推进项目。
如果我最近在调试代码，可以主动提醒我检查构建、日志、实机验证。
语气要自然、中文、简短，不要说英文，不要讲大道理。`;

const DEFAULT_TOPIC_SCOPE = `可以主动聊：
- AI Companion 开发进度
- OpenClaw / Hermes / Codex 协作
- MiniMax、MCP、本地模型
- 视频集锦项目
- 学习计划和工作提醒
- 喝水、休息、作息提醒

不要主动聊：
- 无关娱乐八卦
- 没有依据的新闻
- 假装知道我正在做什么`;

const DEFAULT_FORBIDDEN_TOPICS = `不要中英混杂。
不要输出英文推理。
不要说 Here is / Sure / Let me / I can help。
不要编造我没有说过的信息。
不要频繁打扰。
没有上下文时，只做简短问候。`;

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultInterestTopic(): ProactiveInterestTopic {
  return {
    id: createId('topic'),
    name: 'AI 工具更新',
    keywords: ['MiniMax', 'OpenClaw', 'Codex', 'MCP'],
    frequency: '每天 09:00',
    enabled: false,
    maxResults: 5,
  };
}

function createDefaultSettings(): ProactiveChatSettings {
  const createdAt = nowIso();
  const base: ProactiveChatSettings = {
    enabled: true,
    personaPrompt: DEFAULT_PERSONA_PROMPT,
    topicScope: DEFAULT_TOPIC_SCOPE,
    tonePreset: 'gentle',
    customTone: '',
    forbiddenTopics: DEFAULT_FORBIDDEN_TOPICS,
    enabledContentTypes: {
      care: true,
      projectReminder: true,
      interestNews: false,
      dailySummary: false,
      studyReminder: false,
      customMessage: false,
    },
    customMessagePrompt: '',
    triggerType: 'interval',
    timeOfDay: '09:00',
    intervalMinutes: 30,
    idleMinutes: 30,
    allowWebSearch: true,
    interestKeywords: ['MiniMax', 'OpenClaw', 'Codex'],
    interestTopics: [createDefaultInterestTopic()],
    maxResults: 5,
    minIntervalMinutes: 30,
    maxDailyMessages: 5,
    quietHoursEnabled: true,
    quietStart: '23:00',
    quietEnd: '08:00',
    lastTriggeredAt: undefined,
    nextRunAt: undefined,
    runCountToday: 0,
    createdAt,
    updatedAt: createdAt,
  };
  return {
    ...base,
    nextRunAt: computeNextRunAt(base, new Date(createdAt)),
  };
}

function parseKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map(item => item.trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[,，、\n]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function sanitizeTime(value: string | undefined, fallback: string): string {
  return /^\d{2}:\d{2}$/.test(value || '') ? String(value) : fallback;
}

function normalizeSettings(input: Partial<ProactiveChatSettings> | null | undefined): ProactiveChatSettings {
  const defaults = createDefaultSettings();
  const merged = {
    ...defaults,
    ...(input || {}),
    enabledContentTypes: {
      ...defaults.enabledContentTypes,
      ...(input?.enabledContentTypes || {}),
    },
  };

  const intervalMinutes = Math.max(
    30,
    Number(merged.intervalMinutes || merged.minIntervalMinutes || defaults.intervalMinutes),
  );
  const minIntervalMinutes = Math.max(30, Number(merged.minIntervalMinutes || defaults.minIntervalMinutes));
  const maxDailyMessages = Math.max(1, Number(merged.maxDailyMessages || defaults.maxDailyMessages));
  const maxResults = Math.max(1, Math.min(10, Number(merged.maxResults || defaults.maxResults)));
  const interestTopics = Array.isArray(merged.interestTopics) && merged.interestTopics.length
    ? merged.interestTopics.map(topic => ({
        ...createDefaultInterestTopic(),
        ...topic,
        keywords: parseKeywords(topic.keywords),
        maxResults: Math.max(1, Math.min(10, Number(topic.maxResults || maxResults))),
      }))
    : defaults.interestTopics;

  const normalized: ProactiveChatSettings = {
    ...merged,
    tonePreset: TONE_PRESET_OPTIONS.some(opt => opt.value === merged.tonePreset) ? merged.tonePreset : 'gentle',
    triggerType: ['fixed_time', 'interval', 'idle', 'context'].includes(merged.triggerType)
      ? merged.triggerType
      : 'interval',
    timeOfDay: sanitizeTime(merged.timeOfDay, defaults.timeOfDay || '09:00'),
    quietStart: sanitizeTime(merged.quietStart, defaults.quietStart),
    quietEnd: sanitizeTime(merged.quietEnd, defaults.quietEnd),
    intervalMinutes,
    idleMinutes: Math.max(1, Number(merged.idleMinutes || defaults.idleMinutes)),
    interestKeywords: parseKeywords(merged.interestKeywords),
    interestTopics,
    maxResults,
    minIntervalMinutes,
    maxDailyMessages,
    runCountToday: isToday(merged.lastTriggeredAt) ? Number(merged.runCountToday || 0) : 0,
    createdAt: merged.createdAt || defaults.createdAt,
    updatedAt: merged.updatedAt || defaults.updatedAt,
  };

  return {
    ...normalized,
    nextRunAt: normalized.nextRunAt || computeNextRunAt(normalized),
  };
}

export function loadProactiveChatSettings(): ProactiveChatSettings {
  try {
    if (typeof localStorage === 'undefined') return createDefaultSettings();
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return createDefaultSettings();
    return normalizeSettings(JSON.parse(raw));
  } catch (error) {
    console.warn('[ProactiveChat] Failed to load settings:', error);
    return createDefaultSettings();
  }
}

export function saveProactiveChatSettings(settings: ProactiveChatSettings): ProactiveChatSettings {
  const normalized = normalizeSettings({
    ...settings,
    updatedAt: nowIso(),
  });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    }
  } catch (error) {
    console.warn('[ProactiveChat] Failed to save settings:', error);
  }
  return normalized;
}

export function loadProactiveTriggerRecords(): ProactiveTriggerRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('[ProactiveChat] Failed to load trigger records:', error);
    return [];
  }
}

function saveProactiveTriggerRecords(records: ProactiveTriggerRecord[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
    }
  } catch (error) {
    console.warn('[ProactiveChat] Failed to save trigger records:', error);
  }
}

function addTriggerRecord(record: Omit<ProactiveTriggerRecord, 'id' | 'time'>): ProactiveTriggerRecord {
  const entry: ProactiveTriggerRecord = {
    id: createId('proactive'),
    time: nowIso(),
    ...record,
  };
  saveProactiveTriggerRecords([entry, ...loadProactiveTriggerRecords()].slice(0, MAX_RECORDS));
  return entry;
}

export function startProactiveChat(): void {
  if (proactiveInterval) {
    console.log('[ProactiveChat] Already running');
    return;
  }

  const state = useAppStore.getState();
  const settings = loadProactiveChatSettings();
  if (!state.styleSettings.enableAutoReply || !settings.enabled) {
    console.log('[ProactiveChat] Disabled');
    return;
  }

  const isTestMode = typeof window !== 'undefined' && (window as any).__AI_COMPANION_TEST_MODE__ === true;
  proactiveInterval = setInterval(checkAndProactive, isTestMode ? TEST_CHECK_INTERVAL_MS : CHECK_INTERVAL_MS);
  console.log('[ProactiveChat] Started');
}

export function stopProactiveChat(): void {
  if (proactiveInterval) {
    clearInterval(proactiveInterval);
    proactiveInterval = null;
    console.log('[ProactiveChat] Stopped');
  }
}

export function restartProactiveChat(): void {
  stopProactiveChat();
  startProactiveChat();
}

export function onUserMessage(): void {
  lastUserMessageAt = Date.now();
}

async function checkAndProactive(): Promise<void> {
  if (isGeneratingProactive) return;

  const state = useAppStore.getState();
  const settings = loadProactiveChatSettings();
  if (!state.styleSettings.enableAutoReply || !settings.enabled) return;
  if (!isTriggerDue(settings)) return;
  if (Date.now() - lastUserMessageAt < USER_ACTIVITY_COOLDOWN_MS) return;
  if (getGuardBlockReason(settings)) return;

  await runProactiveChat({ source: 'auto' });
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function minutesOfDay(time: string): number {
  const [hours, minutes] = sanitizeTime(time, '00:00').split(':').map(Number);
  return hours * 60 + minutes;
}

function isWithinQuietHours(settings: ProactiveChatSettings, date = new Date()): boolean {
  if (!settings.quietHoursEnabled) return false;
  const start = minutesOfDay(settings.quietStart);
  const end = minutesOfDay(settings.quietEnd);
  const current = date.getHours() * 60 + date.getMinutes();

  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function computeNextRunAt(settings: ProactiveChatSettings, from = new Date()): string {
  if (settings.triggerType === 'fixed_time') {
    const [hours, minutes] = sanitizeTime(settings.timeOfDay, '09:00').split(':').map(Number);
    const next = new Date(from);
    next.setHours(hours, minutes, 0, 0);
    if (next <= from) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  const interval = Math.max(
    settings.minIntervalMinutes || 30,
    settings.intervalMinutes || settings.minIntervalMinutes || 30,
  );
  return new Date(from.getTime() + interval * 60000).toISOString();
}

function isTriggerDue(settings: ProactiveChatSettings): boolean {
  const now = new Date();
  if (settings.triggerType === 'fixed_time') {
    const target = minutesOfDay(settings.timeOfDay || '09:00');
    const current = now.getHours() * 60 + now.getMinutes();
    return current >= target && !isToday(settings.lastTriggeredAt);
  }

  if (settings.triggerType === 'idle' || settings.triggerType === 'context') {
    return false;
  }

  const next = settings.nextRunAt ? new Date(settings.nextRunAt) : new Date(computeNextRunAt(settings));
  return now >= next;
}

function getGuardBlockReason(settings: ProactiveChatSettings): string | null {
  if (isWithinQuietHours(settings)) return 'quiet_hours';

  const runCountToday = isToday(settings.lastTriggeredAt) ? settings.runCountToday : 0;
  if (runCountToday >= settings.maxDailyMessages) return 'daily_limit';

  if (settings.lastTriggeredAt) {
    const elapsed = Date.now() - new Date(settings.lastTriggeredAt).getTime();
    if (elapsed < settings.minIntervalMinutes * 60000) return 'min_interval';
  }

  return null;
}

function cleanText(text = ''): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isUsefulMessage(text = ''): boolean {
  const value = cleanText(text);
  if (!value) return false;
  if (value.length > 800) return false;
  if (INTERNAL_ENGLISH_MARKERS.some(marker => value.includes(marker))) return false;
  if (value.includes('请主动发起一段简短的对话')) return false;
  return true;
}

export function buildProactiveContext(): ProactiveContext {
  const state = useAppStore.getState();
  const messages = state.messages || [];

  const recentUserMessages = messages
    .filter(message => message.role === 'user' && isUsefulMessage(message.content))
    .slice(-5)
    .map(message => cleanText(message.content).slice(0, 160));

  const recentAssistantMessages = messages
    .filter(message => message.role === 'assistant' && isUsefulMessage(message.content))
    .slice(-5)
    .map(message => cleanText(message.content).slice(0, 180));

  const recentWebSearch = networkLog
    .getAll()
    .filter(log => log.ok && log.resultCount > 0)
    .slice(-1)[0] || null;

  const scheduledTasks = loadScheduledTasks();
  const enabledTasks = scheduledTasks.filter(task => task.enabled);
  const recentTriggeredTasks = scheduledTasks
    .filter(task => task.lastRunAt)
    .sort((a, b) => new Date(b.lastRunAt || 0).getTime() - new Date(a.lastRunAt || 0).getTime())
    .slice(0, 3)
    .map(task => `${task.title}：${cleanText(task.content).slice(0, 80)}`);

  const emotion = state.emotion;

  return {
    currentTime: new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    recentUserMessages,
    recentAssistantMessages,
    recentWebSearch: recentWebSearch
      ? {
          query: recentWebSearch.query,
          resultCount: recentWebSearch.resultCount,
          provider: recentWebSearch.provider,
          timestamp: recentWebSearch.timestamp,
        }
      : null,
    memories: (state.memories || []).slice(0, 8).map(memory => cleanText(memory.content).slice(0, 160)),
    scheduledTasksSummary: {
      total: scheduledTasks.length,
      enabled: enabledTasks.length,
      next: enabledTasks
        .slice()
        .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime())
        .slice(0, 3)
        .map(task => `${task.title}：${cleanText(task.content).slice(0, 80)}`),
      recentTriggered: recentTriggeredTasks,
    },
    moodState: {
      happiness: emotion.happiness,
      fatigue: emotion.fatigue,
      loneliness: emotion.loneliness,
      stress: emotion.stress,
      affection: emotion.affection,
    },
    characterSettings: state.characterSettings,
  };
}

function resolveTone(settings: ProactiveChatSettings): string {
  if (settings.tonePreset === 'custom') {
    return settings.customTone.trim() || TONE_TEXT.gentle;
  }
  return TONE_TEXT[settings.tonePreset] || TONE_TEXT.gentle;
}

function enabledContentTypeNames(settings: ProactiveChatSettings): string {
  const names: string[] = [];
  if (settings.enabledContentTypes.care) names.push('关心问候');
  if (settings.enabledContentTypes.projectReminder) names.push('项目进度提醒');
  if (settings.enabledContentTypes.interestNews) names.push('兴趣资讯搜索');
  if (settings.enabledContentTypes.dailySummary) names.push('每日总结');
  if (settings.enabledContentTypes.studyReminder) names.push('学习监督');
  if (settings.enabledContentTypes.customMessage) names.push('自定义话术');
  return names.join('、') || '只做简短陪伴';
}

export function buildProactivePrompt(
  context: ProactiveContext,
  settings: ProactiveChatSettings,
  action: ProactiveAction,
): string {
  const characterName = context.characterSettings.name || '小伊';
  const defaultPersona = `你是${characterName}，一个温柔、亲近、会基于真实上下文陪伴用户的 AI Companion。`;
  const personaPrompt = settings.personaPrompt.trim() || defaultPersona;
  const topicScope = settings.topicScope.trim() || '只围绕最近真实聊天上下文、项目进度、休息提醒做简短主动发言。';
  const forbiddenTopics = settings.forbiddenTopics.trim() || DEFAULT_FORBIDDEN_TOPICS;

  return `【用户设定的人设】
${personaPrompt}

【允许主动聊的话题范围】
${topicScope}

【语气要求】
${resolveTone(settings)}

【禁止内容】
${forbiddenTopics}

【主动内容类型】
当前动作：${action}
已启用类型：${enabledContentTypeNames(settings)}
自定义话术：${settings.customMessagePrompt.trim() || '无'}

【真实上下文】
当前时间：${context.currentTime}
最近用户消息：
${context.recentUserMessages.length ? context.recentUserMessages.map((m, i) => `${i + 1}. ${m}`).join('\n') : '无'}

最近 AI 回复：
${context.recentAssistantMessages.length ? context.recentAssistantMessages.map((m, i) => `${i + 1}. ${m}`).join('\n') : '无'}

最近联网搜索：${context.recentWebSearch ? `query=${context.recentWebSearch.query}；provider=${context.recentWebSearch.provider}；result_count=${context.recentWebSearch.resultCount}` : '无'}

当前定时任务：
总数=${context.scheduledTasksSummary.total}；启用=${context.scheduledTasksSummary.enabled}
最近将执行：${context.scheduledTasksSummary.next.length ? context.scheduledTasksSummary.next.join('；') : '无'}
最近已触发：${context.scheduledTasksSummary.recentTriggered.length ? context.scheduledTasksSummary.recentTriggered.join('；') : '无'}

用户记忆：
${context.memories.length ? context.memories.map((m, i) => `${i + 1}. ${m}`).join('\n') : '无'}

当前情绪：
好感度=${context.moodState.affection}；开心=${context.moodState.happiness}；疲劳=${context.moodState.fatigue}；孤独=${context.moodState.loneliness}；压力=${context.moodState.stress}

【发言规则】
1. 必须使用简体中文。
2. 必须遵守用户设定的人设、话题和语气。
3. 必须基于真实上下文发言，不得编造。
4. 如果上下文不足，只做简短陪伴。
5. 不要输出英文推理。
6. 不要中英混杂。
7. 不要说 Here is / Sure / Let me / I can help。
8. 不要超过 120 字，除非用户设定要求详细。
9. 如果用户设定和安全规则冲突，以安全规则为准。
10. 只输出最终要发给用户的一句话或短段，不要解释、不要分析上下文、不要列清单。
11. 如果最近用户消息里有具体项目或问题，必须点到那个具体事项。

请生成一条主动发给用户的话。`;
}

function hasAnyContext(context: ProactiveContext): boolean {
  return Boolean(
    context.recentUserMessages.length
    || context.recentAssistantMessages.length
    || context.recentWebSearch
    || context.memories.length
    || context.scheduledTasksSummary.total > 0,
  );
}

function hasInterestNewsConfig(settings: ProactiveChatSettings): boolean {
  const enabledTopic = settings.interestTopics.some(topic => topic.enabled && topic.keywords.length > 0);
  return enabledTopic || settings.interestKeywords.length > 0;
}

function determineProactiveAction(
  settings: ProactiveChatSettings,
  context: ProactiveContext,
  source: 'auto' | 'manual',
): ProactiveAction {
  const allRecentText = [
    ...context.recentUserMessages,
    ...context.recentAssistantMessages,
    ...context.memories,
  ].join(' ');

  if (
    settings.enabledContentTypes.interestNews
    && settings.allowWebSearch
    && hasInterestNewsConfig(settings)
    && source === 'manual'
  ) {
    return 'interest_news';
  }

  if (!hasAnyContext(context)) {
    return settings.enabledContentTypes.care ? 'care' : 'need_context';
  }

  if (
    settings.enabledContentTypes.projectReminder
    && /AI Companion|联网中心|MiniMax|MCP|OpenClaw|Hermes|Codex|项目|修复|调试|测试|构建|日志|release|EXE|bug/i.test(allRecentText)
  ) {
    return 'project_reminder';
  }

  if (
    settings.enabledContentTypes.interestNews
    && settings.allowWebSearch
    && hasInterestNewsConfig(settings)
  ) {
    return 'interest_news';
  }

  if (settings.enabledContentTypes.dailySummary && /总结|复盘|今天|进展|日报/.test(allRecentText)) {
    return 'daily_summary';
  }

  if (settings.enabledContentTypes.studyReminder && /学习|计划|课程|复习|阅读/.test(allRecentText)) {
    return 'care';
  }

  if (settings.enabledContentTypes.customMessage && settings.customMessagePrompt.trim()) {
    return 'custom';
  }

  return settings.enabledContentTypes.care ? 'care' : 'need_context';
}

function buildContextualFallback(
  context: ProactiveContext,
  settings: ProactiveChatSettings,
  action: ProactiveAction,
): string {
  const latestUser = context.recentUserMessages.slice(-1)[0];
  const custom = settings.customMessagePrompt.trim();

  if (action === 'custom' && custom) {
    return custom.slice(0, 120);
  }

  if (action === 'project_reminder' && latestUser) {
    return `我看到你刚才在处理“${latestUser.slice(0, 36)}”，先稳住节奏，下一步可以检查构建、日志和实机验证。`;
  }

  if (context.recentWebSearch) {
    return `我看到你刚才查过“${context.recentWebSearch.query}”，可以顺手把结论、来源和下一步验证点整理一下。`;
  }

  if (context.scheduledTasksSummary.total > 0) {
    return `小伊看到你现在有 ${context.scheduledTasksSummary.total} 个定时任务，我会按设置提醒你，别让重要事情漏掉。`;
  }

  if (latestUser) {
    return `我看到你刚才提到“${latestUser.slice(0, 36)}”，要不要先休息一下，再继续推进下一步？`;
  }

  return '小伊在这里，有需要我帮忙整理、搜索或提醒的事情，直接告诉我就好。';
}

function looksLikeEnglishOnly(value: string): boolean {
  return /^[A-Za-z][\s\S]{0,120}/.test(value) && !/[\u4e00-\u9fa5]/.test(value.slice(0, 120));
}

function shouldAllowLongReply(settings: ProactiveChatSettings): boolean {
  return /详细|展开|完整|长一点/.test(`${settings.personaPrompt}\n${settings.topicScope}\n${settings.customTone}`);
}

function trimToSentenceLimit(value: string, settings: ProactiveChatSettings): string {
  if (shouldAllowLongReply(settings) || value.length <= 140) return value;
  const sentence = value.split(/(?<=[。！？])/u).find(item => item.trim().length >= 20);
  if (sentence && sentence.length <= 140) return sentence.trim();
  return `${value.slice(0, 118).trim()}。`;
}

function hasProjectContextSignal(value: string, context: ProactiveContext): boolean {
  const contextText = [
    ...context.recentUserMessages,
    ...context.recentAssistantMessages,
    ...context.memories,
  ].join(' ');
  const matchedTerm = CONTEXT_SIGNAL_TERMS.find(term => contextText.includes(term) && value.includes(term));
  if (matchedTerm) return true;

  const latestUser = context.recentUserMessages.slice(-1)[0] || '';
  if (latestUser.length >= 6 && value.includes(latestUser.slice(0, 6))) return true;
  return false;
}

function sanitizeProactiveReply(
  reply: string,
  context: ProactiveContext,
  settings: ProactiveChatSettings,
  action: ProactiveAction,
): string {
  let value = (reply || '').trim().replace(/\*\*/g, '');
  const fallback = buildContextualFallback(context, settings, action);

  if (!value) return fallback;
  if (INTERNAL_ENGLISH_MARKERS.some(marker => value.includes(marker))) return fallback;
  if (/让我分析|分析一下|当前上下文|当前的上下文|以下是|我会根据|用户正在|编号|1[.、].*2[.、]/s.test(value)) {
    return fallback;
  }
  if (looksLikeEnglishOnly(value)) return fallback;
  if (!/[\u4e00-\u9fa5]/.test(value)) return fallback;

  value = value
    .replace(/^(Here is|Sure|Let me|I can help)[^\n。！？]*/i, '')
    .replace(/The user[^。！？\n]*/gi, '')
    .trim();

  if (!value) return fallback;
  if (action === 'project_reminder' && !hasProjectContextSignal(value, context)) return fallback;
  return trimToSentenceLimit(value, settings);
}

async function callMiniMaxAPI(prompt: string): Promise<string> {
  const { apiKey, baseUrl, model } = useAppStore.getState().aiConfig;
  if (!apiKey) {
    console.warn('[ProactiveChat] MiniMax API key is missing');
    return '';
  }

  try {
    const response = await fetch(`${baseUrl}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 260,
        temperature: 0.65,
      }),
    });

    console.log('[ProactiveChat] model_status=', response.status);
    if (!response.ok) return '';

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    const reasoningContent = data.choices?.[0]?.message?.reasoning_content?.trim() || '';
    if (content) return content;
    if (reasoningContent && !INTERNAL_ENGLISH_MARKERS.some(marker => reasoningContent.includes(marker))) {
      return reasoningContent;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ProactiveChat] MiniMax call failed:', message);
  }

  return '';
}

function selectInterestTopic(settings: ProactiveChatSettings): {
  name: string;
  keywords: string[];
  maxResults: number;
} {
  const topic = settings.interestTopics.find(item => item.enabled && item.keywords.length > 0);
  if (topic) {
    return {
      name: topic.name.trim() || '兴趣资讯',
      keywords: topic.keywords,
      maxResults: topic.maxResults || settings.maxResults,
    };
  }

  return {
    name: '兴趣资讯',
    keywords: settings.interestKeywords.length ? settings.interestKeywords : ['MiniMax', 'OpenClaw', 'Codex'],
    maxResults: settings.maxResults,
  };
}

function formatResultInfo(results: NetworkSearchResult[]): string {
  return results
    .slice(0, 3)
    .map((result, index) => {
      const title = result.title || '无标题';
      const snippet = cleanText(result.snippet || '').slice(0, 90);
      return `${index + 1}. ${title}${snippet ? `：${snippet}` : ''}`;
    })
    .join('\n');
}

function formatSources(results: NetworkSearchResult[]): string {
  return results
    .slice(0, 5)
    .map((result, index) => `${index + 1}. ${result.title || '无标题'} - ${result.url || '无链接'}`)
    .join('\n');
}

function sanitizeSearchError(error: string): string {
  const legacyPort = '18' + '789';
  return cleanText(error || '没有拿到可用结果')
    .replace(new RegExp(`127\\.0\\.0\\.1:${legacyPort}|${legacyPort}`, 'gi'), '本地联网服务')
    .replace(/OpenClaw|Bridge|Gateway|mock/gi, '联网服务');
}

async function executeInterestNews(settings: ProactiveChatSettings): Promise<{
  message: string;
  topic: string;
  provider: string;
  isMock: boolean;
  resultCount: number;
}> {
  const { runtime } = await import('./runtime/runtimeAdapter');
  const topic = selectInterestTopic(settings);
  const query = topic.keywords.join(', ');
  const searchResult = await runtime.network.search(query, {
    provider: 'minimax_web_search',
    maxResults: topic.maxResults,
  });

  const results = searchResult.results || [];
  const isMock = searchResult.source === 'mock';
  const provider = 'minimax_web_search';
  const resultCount = results.length;

  if (!searchResult.ok || isMock || resultCount === 0) {
    const reason = sanitizeSearchError(searchResult.error || '没有拿到可用结果');
    return {
      topic: topic.name,
      provider,
      isMock,
      resultCount,
      message: `【小伊主动资讯】

【结论】
这次没有拿到可用的真实联网结果，先不编造结论。

【关键信息】
1. 搜索主题：${topic.name}
2. 关键词：${query}
3. 结果状态：${reason}

【来源】
无

【小伊建议】
稍后再试一次，或把关键词收窄到一个具体项目。`,
    };
  }

  return {
    topic: topic.name,
    provider,
    isMock,
    resultCount,
    message: `【小伊主动资讯】

【结论】
我按「${topic.name}」查到了 ${resultCount} 条真实结果，先看第一条和来源是否贴近你当前关注点。

【关键信息】
${formatResultInfo(results)}

【来源】
${formatSources(results)}

【小伊建议】
如果这些结果和你的项目相关，可以把第一条来源打开核对，再决定要不要继续跟进实现或记录。`,
  };
}

function summarizeRecord(message: string): string {
  return cleanText(message)
    .replace(/【[^】]+】/g, '')
    .slice(0, 90);
}

function markTriggered(settings: ProactiveChatSettings): ProactiveChatSettings {
  const now = new Date();
  const runCountToday = isToday(settings.lastTriggeredAt) ? settings.runCountToday + 1 : 1;
  return saveProactiveChatSettings({
    ...settings,
    lastTriggeredAt: now.toISOString(),
    nextRunAt: computeNextRunAt(settings, now),
    runCountToday,
  });
}

async function runProactiveChat(options: { source: 'auto' | 'manual' }): Promise<ProactiveRunResult> {
  if (isGeneratingProactive) {
    const record = addTriggerRecord({
      type: 'need_context',
      usedWebSearch: false,
      topic: '忙碌中',
      resultSummary: '已有主动聊天正在生成',
      success: false,
      error: 'busy',
    });
    return { success: false, action: 'need_context', message: '', record };
  }

  isGeneratingProactive = true;
  const settings = loadProactiveChatSettings();
  const context = buildProactiveContext();
  const action = determineProactiveAction(settings, context, options.source);

  try {
    let message = '';
    let topic = action;
    let provider: string | undefined;
    let isMock: boolean | undefined;
    let resultCount: number | undefined;

    if (action === 'interest_news') {
      const news = await executeInterestNews(settings);
      message = news.message;
      topic = news.topic;
      provider = news.provider;
      isMock = news.isMock;
      resultCount = news.resultCount;
    } else {
      const prompt = buildProactivePrompt(context, settings, action);
      const rawReply = await callMiniMaxAPI(prompt);
      message = sanitizeProactiveReply(rawReply, context, settings, action);
    }

    const state = useAppStore.getState();
    await state.addMessage({ role: 'assistant', content: message });
    state.updateEmotionFromChat('', message);
    void maybeAutoRead(message, 'proactive', `proactive_${Date.now()}`);
    markTriggered(settings);

    const record = addTriggerRecord({
      type: action,
      usedWebSearch: action === 'interest_news',
      topic,
      resultSummary: summarizeRecord(message),
      success: action !== 'interest_news' || Boolean(resultCount && resultCount > 0 && !isMock),
      provider,
      isMock,
      resultCount,
      error: action === 'interest_news' && (!resultCount || isMock) ? 'NO_REAL_SEARCH_RESULTS' : undefined,
    });

    console.log(
      `[ProactiveChat] triggered type=${action} web=${action === 'interest_news'} provider=${provider || 'none'} result_count=${resultCount ?? 0}`,
    );

    return { success: record.success, action, message, record };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const record = addTriggerRecord({
      type: action,
      usedWebSearch: action === 'interest_news',
      topic: action,
      resultSummary: '主动聊天生成失败',
      success: false,
      error: message,
    });
    console.error('[ProactiveChat] Failed:', message);
    return { success: false, action, message: '', record };
  } finally {
    isGeneratingProactive = false;
  }
}

export async function runProactiveChatTest(): Promise<ProactiveRunResult> {
  return runProactiveChat({ source: 'manual' });
}
