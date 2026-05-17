import { convertFileSrc } from '@tauri-apps/api/core';
import { runtime } from './runtime/runtimeAdapter';
import { useAppStore } from './store';
import type { GenerateSpeechResponse } from './runtime/runtimeTypes';

export type VoiceModel = 'speech-02-hd' | 'speech-02-turbo' | 'speech-2.8-hd';
export type VoiceEmotion = 'happy' | 'neutral' | 'sad' | 'angry' | 'surprised';
export type VoiceReadSource = 'assistant' | 'proactive' | 'scheduled' | 'manual' | 'test';

export interface VoiceSettings {
  enabled: boolean;

  model: VoiceModel;
  voiceId: string;
  emotion: VoiceEmotion;

  speed: number;
  vol: number;
  pitch: number;

  format: 'mp3' | 'wav' | 'flac';
  sampleRate: number;
  bitrate: number;
  channel: 1 | 2;

  autoReadAssistantReply: boolean;
  autoReadProactive: boolean;
  autoReadScheduledTask: boolean;
  enableRightClickRead: boolean;

  cleanTextBeforeRead: boolean;
  skipLinks: boolean;
  maxTextLength: number;

  cacheEnabled: boolean;
  cacheDir: string;
  maxCacheFiles: number;
}

export interface VoiceAudioRecord {
  id: string;
  textHash: string;
  sourceMessageId?: string;
  textPreview: string;
  filePath: string;
  model: string;
  voiceId: string;
  emotion: string;
  speed: number;
  vol: number;
  pitch: number;
  createdAt: string;
  durationMs?: number;
  fileSize?: number;
}

export interface VoiceReadResult {
  ok: boolean;
  record?: VoiceAudioRecord;
  response?: GenerateSpeechResponse;
  cacheHit: boolean;
  textWasTruncated: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export const VOICE_SETTINGS_KEY = 'ai_companion_voice_settings';
export const VOICE_RECORDS_KEY = 'ai_companion_voice_audio_records';
export const DEFAULT_AUDIO_CACHE_DIR = 'C:\\Users\\asus\\ai-companion\\audio_cache';

export const VOICE_MODEL_OPTIONS: Array<{ value: VoiceModel; label: string; desc?: string }> = [
  { value: 'speech-2.8-hd', label: 'speech-2.8-hd', desc: 'Token Plan 默认' },
  { value: 'speech-02-hd', label: 'speech-02-hd' },
  { value: 'speech-02-turbo', label: 'speech-02-turbo' },
];

export const VOICE_PRESET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'female-tianmei', label: '小伊默认甜美女声 female-tianmei' },
  { value: 'female-shaonv', label: '少女音色 female-shaonv' },
  { value: 'female-yujie', label: '御姐音色 female-yujie' },
  { value: 'female-chengshu', label: '成熟女性 female-chengshu' },
  { value: 'male-qn-qingse', label: '青年男声 male-qn-qingse' },
  { value: 'male-qn-jingying', label: '精英男声 male-qn-jingying' },
  { value: 'male-qn-badao', label: '霸道男声 male-qn-badao' },
  { value: 'ikaros', label: '天降之物伊卡洛斯音色' },
  { value: 'genshin-eula', label: '原神优菈' },
  { value: 'genshin-raiden', label: '原神雷电将军' },
  { value: 'genshin-shenhe', label: '原神申鹤' },
  { value: 'ziling', label: '凡人修仙传紫灵' },
];

export const VOICE_EMOTION_OPTIONS: VoiceEmotion[] = ['happy', 'neutral', 'sad', 'angry', 'surprised'];

let currentAudio: HTMLAudioElement | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createDefaultVoiceSettings(): VoiceSettings {
  return {
    enabled: true,
    model: 'speech-2.8-hd',
    voiceId: 'female-tianmei',
    emotion: 'happy',
    speed: 1.05,
    vol: 1,
    pitch: 1,
    format: 'mp3',
    sampleRate: 32000,
    bitrate: 128000,
    channel: 1,
    autoReadAssistantReply: false,
    autoReadProactive: true,
    autoReadScheduledTask: false,
    enableRightClickRead: true,
    cleanTextBeforeRead: true,
    skipLinks: true,
    maxTextLength: 600,
    cacheEnabled: true,
    cacheDir: DEFAULT_AUDIO_CACHE_DIR,
    maxCacheFiles: 80,
  };
}

function normalizeVoiceSettings(input: Partial<VoiceSettings> | null | undefined): VoiceSettings {
  const defaults = createDefaultVoiceSettings();
  const merged = { ...defaults, ...(input || {}) };
  const model = VOICE_MODEL_OPTIONS.some(item => item.value === merged.model) ? merged.model : defaults.model;
  const emotion = VOICE_EMOTION_OPTIONS.includes(merged.emotion) ? merged.emotion : defaults.emotion;
  const format = ['mp3', 'wav', 'flac'].includes(merged.format) ? merged.format : defaults.format;
  const channel = Number(merged.channel) === 2 ? 2 : 1;

  return {
    ...merged,
    model,
    voiceId: String(merged.voiceId || defaults.voiceId).trim() || defaults.voiceId,
    emotion,
    speed: clampNumber(merged.speed, defaults.speed, 0.5, 2),
    vol: clampNumber(merged.vol, defaults.vol, 0.1, 3),
    pitch: clampNumber(merged.pitch, defaults.pitch, -12, 12),
    format: format as VoiceSettings['format'],
    sampleRate: Number(merged.sampleRate) || defaults.sampleRate,
    bitrate: Number(merged.bitrate) || defaults.bitrate,
    channel,
    maxTextLength: Math.max(80, Number(merged.maxTextLength) || defaults.maxTextLength),
    cacheDir: String(merged.cacheDir || defaults.cacheDir).trim() || defaults.cacheDir,
    maxCacheFiles: Math.max(10, Number(merged.maxCacheFiles) || defaults.maxCacheFiles),
  };
}

export function loadVoiceSettings(): VoiceSettings {
  try {
    if (typeof localStorage === 'undefined') return createDefaultVoiceSettings();
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    return raw ? normalizeVoiceSettings(JSON.parse(raw)) : createDefaultVoiceSettings();
  } catch (error) {
    console.warn('[Voice] Failed to load settings:', error);
    return createDefaultVoiceSettings();
  }
}

export function saveVoiceSettings(settings: VoiceSettings): VoiceSettings {
  const normalized = normalizeVoiceSettings(settings);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(normalized));
    }
  } catch (error) {
    console.warn('[Voice] Failed to save settings:', error);
  }
  return normalized;
}

export function loadVoiceAudioRecords(): VoiceAudioRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(VOICE_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('[Voice] Failed to load audio records:', error);
    return [];
  }
}

function saveVoiceAudioRecords(records: VoiceAudioRecord[], limit = loadVoiceSettings().maxCacheFiles): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOICE_RECORDS_KEY, JSON.stringify(records.slice(0, limit)));
    }
  } catch (error) {
    console.warn('[Voice] Failed to save audio records:', error);
  }
}

function buildVoiceCacheKey(text: string, settings: VoiceSettings): string {
  return hashString([
    text,
    settings.model,
    settings.voiceId,
    settings.speed,
    settings.vol,
    settings.pitch,
    settings.emotion,
    settings.format,
    settings.sampleRate,
    settings.bitrate,
    settings.channel,
  ].join('|'));
}

function extractSection(text: string, title: string): string {
  const pattern = new RegExp(`【${title}】([\\s\\S]*?)(?=\\n?【|$)`, 'u');
  return text.match(pattern)?.[1]?.trim() || '';
}

function cleanWebSearchSpeechText(text: string): string | null {
  if (!/【结论】|【关键信息】|【小伊建议】/.test(text)) return null;
  const parts = [
    extractSection(text, '结论'),
    extractSection(text, '关键信息'),
    extractSection(text, '小伊建议'),
  ].filter(Boolean);
  return parts.length ? parts.join('\n') : null;
}

export function cleanTextForTTS(
  text: string,
  settings: VoiceSettings = loadVoiceSettings(),
): { text: string; truncated: boolean } {
  let value = String(text || '').trim();
  if (!value) return { text: '', truncated: false };

  if (settings.cleanTextBeforeRead) {
    const webSearchText = cleanWebSearchSpeechText(value);
    if (webSearchText) value = webSearchText;

    value = value
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/^\s{0,3}#{1,6}\s*/gm, '')
      .replace(/^\s{0,3}[-*+]\s+/gm, '')
      .replace(/^\s{0,3}>\s?/gm, '')
      .replace(/\*\*|__|\*/g, '')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/^\s*[{}\[\],"]+\s*$/gm, ' ')
      .replace(/^\s*"(provider|is_mock|result_count|reasoning_content|Authorization|Cookie|Token)"\s*:.*$/gim, ' ')
      .replace(/^\s*(provider|is_mock|result_count|reasoning_content|Authorization|Cookie|Token)\s*[:=].*$/gim, ' ')
      .replace(/WebSearchResultCard[\s\S]*$/gi, ' ');

    if (settings.skipLinks) {
      value = value.replace(/https?:\/\/\S+/gi, ' ').replace(/\bwww\.\S+/gi, ' ');
    }

    if (/^\s*[\[{][\s\S]*[\]}]\s*$/.test(value) && /"[^"]+"\s*:/.test(value)) {
      value = '';
    }
  }

  value = value.replace(/\s+/g, ' ').trim();

  let truncated = false;
  if (value.length > settings.maxTextLength) {
    value = `${value.slice(0, settings.maxTextLength).trim()}。后面的内容有点长，小伊先读到这里。`;
    truncated = true;
  }

  return { text: value, truncated };
}

function shouldSkipSpeechText(text: string): boolean {
  const value = text.trim();
  if (!value) return true;
  if (/^(MODEL_|SYSTEM_|DEBUG_|NETWORK_|TTS_)/i.test(value)) return true;
  if (/reasoning_content|Authorization|Cookie|Token/i.test(value)) return true;
  if (/^https?:\/\/\S+$/i.test(value)) return true;
  return false;
}

async function getCachedRecord(textHash: string): Promise<VoiceAudioRecord | null> {
  const record = loadVoiceAudioRecords().find(item => item.textHash === textHash);
  if (!record?.filePath) return null;

  const info = await runtime.tts.fileInfo(record.filePath);
  const exists = Boolean(info.ok && info.data?.[0] && (info.data?.[1] || 0) > 0);
  return exists ? record : null;
}

function addVoiceRecord(record: VoiceAudioRecord, settings: VoiceSettings): VoiceAudioRecord {
  const records = loadVoiceAudioRecords().filter(item => item.textHash !== record.textHash);
  const next = [record, ...records].slice(0, settings.maxCacheFiles);
  saveVoiceAudioRecords(next, settings.maxCacheFiles);
  return record;
}

export function getAudioFileUrl(filePath: string): string {
  try {
    return convertFileSrc(filePath);
  } catch {
    return `file:///${filePath.replace(/\\/g, '/')}`;
  }
}

export function stopVoicePlayback(): void {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio = null;
}

function audioFormatFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext === 'wav' || ext === 'flac' ? ext : 'mp3';
}

async function playAudioUrl(url: string): Promise<void> {
  const audio = new Audio(url);
  currentAudio = audio;
  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
  };
  try {
    await audio.play();
  } catch (error) {
    if (currentAudio === audio) currentAudio = null;
    throw error;
  }
}

export async function playVoiceRecord(record: VoiceAudioRecord): Promise<void> {
  stopVoicePlayback();
  try {
    await playAudioUrl(getAudioFileUrl(record.filePath));
  } catch (assetError) {
    stopVoicePlayback();
    const dataUrlResult = await runtime.tts.fileDataUrl(record.filePath, audioFormatFromPath(record.filePath));
    if (dataUrlResult.ok && dataUrlResult.data) {
      await playAudioUrl(dataUrlResult.data);
      return;
    }
    throw assetError;
  }
}

export async function openVoiceAudioFile(recordOrPath: VoiceAudioRecord | string): Promise<boolean> {
  const path = typeof recordOrPath === 'string' ? recordOrPath : recordOrPath.filePath;
  const result = await runtime.tts.openFile(path);
  return result.ok;
}

export async function clearVoiceCache(): Promise<number> {
  const settings = loadVoiceSettings();
  const result = await runtime.tts.clearCache(settings.cacheDir);
  if (result.ok) {
    saveVoiceAudioRecords([], settings.maxCacheFiles);
    return Number(result.data || 0);
  }
  throw new Error(result.error || '清空语音缓存失败');
}

export function findVoiceRecordForText(
  text: string,
  settings: VoiceSettings = loadVoiceSettings(),
  records: VoiceAudioRecord[] = loadVoiceAudioRecords(),
): VoiceAudioRecord | null {
  const cleaned = cleanTextForTTS(text, settings).text;
  if (!cleaned) return null;
  const textHash = buildVoiceCacheKey(cleaned, settings);
  return records.find(item => item.textHash === textHash)
    || records.find(item => item.textPreview === cleaned.slice(0, 80))
    || null;
}

function mapVoiceError(code?: string, message?: string): string {
  if (code === 'MINIMAX_KEY_MISSING') return '请先在联网中心配置 MiniMax API Key。';
  if (code === 'MINIMAX_TTS_MCP_NOT_INSTALLED') return '未检测到 MiniMax TTS MCP，请安装 MiniMax MCP JS 或检查 uvx/npm 环境。';
  if (code === 'VOICE_ID_UNAVAILABLE') return '当前音色不可用，请切换默认音色。';
  if (code === 'TEXT_TOO_LONG') return '当前文本过长，已截断后朗读。';
  return message || '语音生成失败，请稍后再试。';
}

export async function speakText(
  rawText: string,
  options: {
    source?: VoiceReadSource;
    sourceMessageId?: string;
    play?: boolean;
    settings?: VoiceSettings;
  } = {},
): Promise<VoiceReadResult> {
  const settings = options.settings || loadVoiceSettings();
  const source = options.source || 'manual';
  const play = options.play !== false;
  const { text, truncated } = cleanTextForTTS(rawText, settings);

  if (!settings.enabled) {
    return { ok: false, cacheHit: false, textWasTruncated: truncated, errorCode: 'TTS_DISABLED', errorMessage: '语音功能未启用' };
  }
  if (shouldSkipSpeechText(text)) {
    return { ok: false, cacheHit: false, textWasTruncated: truncated, errorCode: 'TEXT_EMPTY', errorMessage: '没有可朗读的文本' };
  }

  const textHash = buildVoiceCacheKey(text, settings);
  if (settings.cacheEnabled) {
    const cached = await getCachedRecord(textHash);
    if (cached) {
      console.log(`[TTS] tts_enabled=true tts_provider=minimax_tts_mcp tts_tool=text_to_audio voiceId=${settings.voiceId} model=${settings.model} text_length=${text.length} file_exists=true file_size=${cached.fileSize || 0} duration_ms=${cached.durationMs || 0} cache_hit=true status=success`);
      if (play) await playVoiceRecord(cached);
      return { ok: true, record: cached, cacheHit: true, textWasTruncated: truncated };
    }
  }

  const { aiConfig } = useAppStore.getState();
  if (!aiConfig.apiKey) {
    return {
      ok: false,
      cacheHit: false,
      textWasTruncated: truncated,
      errorCode: 'MINIMAX_KEY_MISSING',
      errorMessage: mapVoiceError('MINIMAX_KEY_MISSING'),
    };
  }

  const result = await runtime.tts.generate({
    text,
    model: settings.model,
    voiceId: settings.voiceId,
    speed: settings.speed,
    vol: settings.vol,
    pitch: settings.pitch,
    emotion: settings.emotion,
    format: settings.format,
    sampleRate: settings.sampleRate,
    bitrate: settings.bitrate,
    channel: settings.channel,
    outputDir: settings.cacheDir,
    apiKey: aiConfig.apiKey,
    apiHost: aiConfig.baseUrl,
  });

  const response = result.data;
  if (!result.ok || !response?.ok || !response.audioPath) {
    const errorCode = response?.errorCode || 'MINIMAX_TTS_GENERATION_FAILED';
    return {
      ok: false,
      response,
      cacheHit: false,
      textWasTruncated: truncated,
      errorCode,
      errorMessage: mapVoiceError(errorCode, response?.errorMessage || result.error),
    };
  }

  const record = addVoiceRecord({
    id: createId('voice'),
    textHash,
    sourceMessageId: options.sourceMessageId || `${source}_${Date.now()}`,
    textPreview: text.slice(0, 80),
    filePath: response.audioPath,
    model: settings.model,
    voiceId: settings.voiceId,
    emotion: settings.emotion,
    speed: settings.speed,
    vol: settings.vol,
    pitch: settings.pitch,
    createdAt: nowIso(),
    durationMs: response.durationMs,
    fileSize: response.fileSize,
  }, settings);

  console.log(`[TTS] tts_enabled=true tts_provider=${response.provider} tts_tool=${response.tool} voiceId=${settings.voiceId} model=${settings.model} text_length=${text.length} file_exists=${response.fileExists} file_size=${response.fileSize} duration_ms=${response.durationMs} cache_hit=false status=success`);

  if (play) {
    await playVoiceRecord(record);
  }

  return { ok: true, record, response, cacheHit: false, textWasTruncated: truncated };
}

export async function maybeAutoRead(
  text: string,
  source: Exclude<VoiceReadSource, 'manual' | 'test'>,
  sourceMessageId?: string,
): Promise<VoiceReadResult | null> {
  const settings = loadVoiceSettings();
  if (!settings.enabled) return null;
  if (source === 'assistant' && !settings.autoReadAssistantReply) return null;
  if (source === 'proactive' && !settings.autoReadProactive) return null;
  if (source === 'scheduled' && !settings.autoReadScheduledTask) return null;

  try {
    return await speakText(text, { source, sourceMessageId, settings, play: true });
  } catch (error) {
    console.warn('[Voice] Auto read failed:', error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      cacheHit: false,
      textWasTruncated: false,
      errorCode: 'PLAYBACK_FAILED',
      errorMessage: '音频已生成，但播放失败，可打开文件手动播放。',
    };
  }
}
