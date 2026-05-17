import { tauriAdapter } from '../runtime/tauriAdapter';
import { loadVoiceSettings, saveVoiceSettings } from '../voice';
import type { VoiceSettings } from '../voice';
import { loadProactiveChatSettings, saveProactiveChatSettings } from '../proactiveChat';
import type { ProactiveChatSettings } from '../proactiveChat';
import { loadMemories, saveMemory } from '../memory/db';
import type {
  CharacterMemorySeed,
  CharacterPack,
  CharacterProactive,
  CharacterScanResult,
  CharacterValidationResult,
  CharacterVoice,
} from './characterTypes';
import {
  collectSensitiveFields,
  createEmptyValidation,
  finishValidation,
  isAllowedCharacterFile,
  sanitizeRelativePath,
  validateManifestShape,
  validateMemorySeed,
  validateProactiveConfig,
  validateVoiceConfig,
} from './characterValidator';

export const DEFAULT_CHARACTER_ROOT = 'C:\\Users\\asus\\ai-companion\\characters';
export const CURRENT_CHARACTER_KEY = 'ai_companion_current_character_id';
const VOICE_OVERRIDES_KEY = 'ai_companion_character_voice_overrides';
const PROACTIVE_OVERRIDES_KEY = 'ai_companion_character_proactive_overrides';
const MEMORY_SEED_IMPORTED_KEY = 'ai_companion_character_memory_seed_imported';

type FsEntry = {
  name: string;
  path: string;
  isDir: boolean;
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeBase(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/$/, '');
}

function joinPath(basePath: string, relativePath: string): string {
  const safe = sanitizeRelativePath(relativePath);
  if (!safe) throw new Error(`非法角色包相对路径: ${relativePath}`);
  return `${normalizeBase(basePath)}/${safe}`;
}

async function listDir(path: string): Promise<FsEntry[]> {
  const result = await tauriAdapter.invokeSafe<FsEntry[]>('list_dir', { path });
  if (!result.ok || !result.data) return [];
  return result.data;
}

async function pathExists(path: string): Promise<boolean> {
  const result = await tauriAdapter.invokeSafe<boolean>('path_exists', { path });
  return Boolean(result.ok && result.data);
}

async function readTextFile(path: string): Promise<string | null> {
  const result = await tauriAdapter.invokeSafe<string>('read_text_file', { path });
  return result.ok && typeof result.data === 'string' ? result.data : null;
}

async function readJsonFile<T>(path: string, validation: CharacterValidationResult, label: string): Promise<T | null> {
  const text = await readTextFile(path);
  if (text == null) {
    validation.errors.push(`${label} 读取失败`);
    validation.missingFiles.push(path);
    return null;
  }
  try {
    const parsed = JSON.parse(text) as T;
    const sensitiveFields = collectSensitiveFields(parsed);
    if (sensitiveFields.length) {
      validation.sensitiveFieldsFound.push(...sensitiveFields.map(field => `${label}.${field}`));
      validation.errors.push('角色包不得包含密钥，请使用联网中心统一 Key。');
    }
    return parsed;
  } catch {
    validation.errors.push(`${label} 不是合法 JSON`);
    return null;
  }
}

async function collectPackFiles(basePath: string, depth = 0): Promise<FsEntry[]> {
  if (depth > 8) return [];
  const entries = await listDir(basePath);
  const all: FsEntry[] = [];
  for (const entry of entries) {
    all.push(entry);
    if (entry.isDir) {
      all.push(...await collectPackFiles(entry.path, depth + 1));
    }
  }
  return all;
}

async function requirePackFile(
  basePath: string,
  relativePath: string | undefined,
  validation: CharacterValidationResult,
  label: string,
  required: boolean,
): Promise<string | null> {
  const safe = relativePath ? sanitizeRelativePath(relativePath) : null;
  if (!safe) {
    if (required) validation.errors.push(`${label} 缺失或不是角色包内相对路径`);
    return null;
  }

  const absolutePath = joinPath(basePath, safe);
  if (!await pathExists(absolutePath)) {
    const message = `${label} 引用文件不存在`;
    if (required) validation.errors.push(message);
    else validation.warnings.push(message);
    validation.missingFiles.push(safe);
    return null;
  }
  return absolutePath;
}

export async function validateCharacterPack(characterPath: string): Promise<CharacterValidationResult> {
  const pack = await loadCharacterPack(characterPath, new Set());
  return pack.validation;
}

export async function loadCharacterPack(basePath: string, seenIds: Set<string>): Promise<CharacterPack> {
  const validation = createEmptyValidation();
  const folderName = basePath.split(/[\\/]/).filter(Boolean).pop() || 'character';
  const manifestPath = `${normalizeBase(basePath)}/character.json`;

  if (!await pathExists(manifestPath)) {
    validation.errors.push('缺少 character.json');
    validation.missingFiles.push('character.json');
    return {
      schemaVersion: 1,
      id: folderName,
      name: folderName,
      basePath,
      folderName,
      assets: {},
      validation: finishValidation(validation),
    };
  }

  const manifest = await readJsonFile<Partial<CharacterPack>>(manifestPath, validation, 'character.json') || {};
  validateManifestShape(manifest, validation);

  if (manifest.id && seenIds.has(manifest.id)) {
    validation.errors.push(`角色 id 重复: ${manifest.id}`);
  }
  if (manifest.id) seenIds.add(manifest.id);

  const allFiles = await collectPackFiles(basePath);
  allFiles.forEach(entry => {
    if (!entry.isDir && !isAllowedCharacterFile(entry.name)) {
      validation.errors.push(`不允许的文件类型: ${entry.name}`);
    }
  });

  const personaPath = await requirePackFile(basePath, manifest.personaFile, validation, 'personaFile', true);
  const voicePath = await requirePackFile(basePath, manifest.voiceFile, validation, 'voiceFile', false);
  const proactivePath = await requirePackFile(basePath, manifest.proactiveFile, validation, 'proactiveFile', false);
  const memorySeedPath = await requirePackFile(basePath, manifest.memorySeedFile, validation, 'memorySeedFile', false);

  let personaText: string | undefined;
  if (personaPath) {
    personaText = await readTextFile(personaPath) || '';
  }

  let voice: CharacterVoice | undefined;
  if (voicePath) {
    const parsed = await readJsonFile<CharacterVoice>(voicePath, validation, 'voice.json');
    if (parsed) {
      validateVoiceConfig(parsed, validation);
      voice = parsed;
    }
  }

  let proactive: CharacterProactive | undefined;
  if (proactivePath) {
    const parsed = await readJsonFile<CharacterProactive>(proactivePath, validation, 'proactive.json');
    if (parsed) {
      validateProactiveConfig(parsed, validation);
      proactive = parsed;
    }
  }

  let memorySeed: CharacterMemorySeed | undefined;
  if (memorySeedPath) {
    const parsed = await readJsonFile<CharacterMemorySeed>(memorySeedPath, validation, 'memory_seed.json');
    if (parsed) {
      validateMemorySeed(parsed, validation);
      memorySeed = parsed;
    }
  }

  const assets = manifest.assets || {};
  await requirePackFile(basePath, assets.avatar, validation, 'assets.avatar', false);
  await requirePackFile(basePath, assets.fullbody, validation, 'assets.fullbody', false);
  await requirePackFile(basePath, assets.idle, validation, 'assets.idle', false);

  for (const [emotion, relPath] of Object.entries(manifest.emotionMap || {})) {
    await requirePackFile(basePath, relPath, validation, `emotionMap.${emotion}`, true);
  }

  if (!assets.avatar) validation.warnings.push('缺少自定义头像，将使用系统默认头像');
  if (!assets.fullbody) validation.warnings.push('缺少自定义立绘，将使用头像或系统默认表情');

  return {
    schemaVersion: Number(manifest.schemaVersion || 1),
    id: String(manifest.id || folderName),
    name: String(manifest.name || folderName),
    displayName: manifest.displayName,
    description: manifest.description,
    author: manifest.author,
    version: manifest.version,
    language: manifest.language,
    basePath,
    folderName,
    isTemplate: folderName.startsWith('_') || manifest.id === '_template',
    personaFile: manifest.personaFile,
    voiceFile: manifest.voiceFile,
    proactiveFile: manifest.proactiveFile,
    memorySeedFile: manifest.memorySeedFile,
    personaText,
    voice,
    proactive,
    memorySeed,
    assets,
    emotionMap: manifest.emotionMap || {},
    defaultEmotion: manifest.defaultEmotion,
    features: manifest.features || {},
    validation: finishValidation(validation),
  };
}

export async function scanCharacterPacks(rootPath = DEFAULT_CHARACTER_ROOT): Promise<CharacterScanResult> {
  await tauriAdapter.invokeSafe<void>('create_dir_all', { path: rootPath });
  const errors: string[] = [];
  const entries = await listDir(rootPath);
  const seenIds = new Set<string>();
  const packs: CharacterPack[] = [];

  for (const entry of entries.filter(item => item.isDir)) {
    try {
      packs.push(await loadCharacterPack(entry.path, seenIds));
    } catch (error) {
      errors.push(`${entry.name}: ${String(error)}`);
    }
  }

  return { rootPath, packs, scannedAt: nowIso(), errors };
}

function loadJsonMap<T>(key: string): Record<string, T> {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') || {};
  } catch {
    return {};
  }
}

function saveJsonMap<T>(key: string, value: Record<string, T>): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCurrentCharacterId(): string {
  return localStorage.getItem(CURRENT_CHARACTER_KEY) || 'xiaoyi';
}

export function setCurrentCharacterId(id: string): void {
  localStorage.setItem(CURRENT_CHARACTER_KEY, id);
}

export function saveCurrentCharacterVoiceOverride(settings: VoiceSettings): void {
  const id = getCurrentCharacterId();
  const map = loadJsonMap<VoiceSettings>(VOICE_OVERRIDES_KEY);
  map[id] = settings;
  saveJsonMap(VOICE_OVERRIDES_KEY, map);
}

export function saveCurrentCharacterProactiveOverride(settings: ProactiveChatSettings): void {
  const id = getCurrentCharacterId();
  const map = loadJsonMap<ProactiveChatSettings>(PROACTIVE_OVERRIDES_KEY);
  map[id] = settings;
  saveJsonMap(PROACTIVE_OVERRIDES_KEY, map);
}

export function clearCharacterOverrides(characterId: string): void {
  const voice = loadJsonMap<VoiceSettings>(VOICE_OVERRIDES_KEY);
  const proactive = loadJsonMap<ProactiveChatSettings>(PROACTIVE_OVERRIDES_KEY);
  delete voice[characterId];
  delete proactive[characterId];
  saveJsonMap(VOICE_OVERRIDES_KEY, voice);
  saveJsonMap(PROACTIVE_OVERRIDES_KEY, proactive);
}

function getVoiceOverride(characterId: string): VoiceSettings | null {
  return loadJsonMap<VoiceSettings>(VOICE_OVERRIDES_KEY)[characterId] || null;
}

function getProactiveOverride(characterId: string): ProactiveChatSettings | null {
  return loadJsonMap<ProactiveChatSettings>(PROACTIVE_OVERRIDES_KEY)[characterId] || null;
}

export function buildVoiceSettingsFromCharacter(pack: CharacterPack, base = loadVoiceSettings()): VoiceSettings {
  const voice = pack.voice;
  if (!voice) return base;

  return saveVoiceSettings({
    ...base,
    enabled: pack.features?.enableVoice ?? base.enabled,
    model: (voice.model || base.model) as VoiceSettings['model'],
    voiceId: voice.voiceId || base.voiceId,
    emotion: (voice.emotion || base.emotion) as VoiceSettings['emotion'],
    speed: Number(voice.speed ?? base.speed),
    vol: Number(voice.vol ?? base.vol),
    pitch: Number(voice.pitch ?? base.pitch),
    format: (voice.format || base.format) as VoiceSettings['format'],
    sampleRate: Number(voice.sampleRate || base.sampleRate),
    bitrate: Number(voice.bitrate || base.bitrate),
    channel: (Number(voice.channel || base.channel) === 2 ? 2 : 1) as 1 | 2,
    autoReadAssistantReply: Boolean(voice.autoRead?.assistantReply ?? base.autoReadAssistantReply),
    autoReadProactive: Boolean(voice.autoRead?.proactiveChat ?? base.autoReadProactive),
    autoReadScheduledTask: Boolean(voice.autoRead?.scheduledTask ?? base.autoReadScheduledTask),
    enableRightClickRead: Boolean(voice.rightClickRead ?? base.enableRightClickRead),
    cleanTextBeforeRead: Boolean(voice.cleanTextBeforeRead ?? base.cleanTextBeforeRead),
    skipLinks: Boolean(voice.skipLinks ?? base.skipLinks),
  });
}

export function buildProactiveSettingsFromCharacter(pack: CharacterPack, base = loadProactiveChatSettings()): ProactiveChatSettings {
  const proactive = pack.proactive;
  if (!proactive) return base;
  const trigger = proactive.trigger || {};
  const limits = proactive.limits || {};

  return saveProactiveChatSettings({
    ...base,
    enabled: Boolean(proactive.enabled ?? base.enabled),
    personaPrompt: proactive.personaPrompt || base.personaPrompt,
    topicScope: proactive.topicScope || base.topicScope,
    tonePreset: (proactive.tonePreset || base.tonePreset) as ProactiveChatSettings['tonePreset'],
    customTone: proactive.customTone || base.customTone,
    forbiddenTopics: proactive.forbiddenTopics || base.forbiddenTopics,
    enabledContentTypes: {
      ...base.enabledContentTypes,
      ...(proactive.enabledContentTypes || {}),
    },
    triggerType: (trigger.type || base.triggerType) as ProactiveChatSettings['triggerType'],
    intervalMinutes: Number(trigger.intervalMinutes || base.intervalMinutes),
    timeOfDay: trigger.timeOfDay || base.timeOfDay,
    idleMinutes: Number(trigger.idleMinutes || base.idleMinutes),
    allowWebSearch: Boolean(proactive.allowWebSearch ?? base.allowWebSearch),
    interestKeywords: Array.isArray(proactive.interestKeywords) ? proactive.interestKeywords : base.interestKeywords,
    minIntervalMinutes: Number(limits.minIntervalMinutes || base.minIntervalMinutes),
    maxDailyMessages: Number(limits.maxDailyMessages || base.maxDailyMessages),
    quietHoursEnabled: Boolean(limits.quietHoursEnabled ?? base.quietHoursEnabled),
    quietStart: limits.quietStart || base.quietStart,
    quietEnd: limits.quietEnd || base.quietEnd,
  });
}

export function applyCharacterDefaults(pack: CharacterPack, options?: { forceVoice?: boolean; forceProactive?: boolean }): void {
  setCurrentCharacterId(pack.id);

  const voiceOverride = options?.forceVoice ? null : getVoiceOverride(pack.id);
  if (voiceOverride) saveVoiceSettings(voiceOverride);
  else buildVoiceSettingsFromCharacter(pack);

  const proactiveOverride = options?.forceProactive ? null : getProactiveOverride(pack.id);
  if (proactiveOverride) saveProactiveChatSettings(proactiveOverride);
  else buildProactiveSettingsFromCharacter(pack);
}

export function restoreCharacterDefaults(pack: CharacterPack): void {
  clearCharacterOverrides(pack.id);
  buildVoiceSettingsFromCharacter(pack);
  buildProactiveSettingsFromCharacter(pack);
}

export function isMemorySeedImported(characterId: string): boolean {
  const map = loadJsonMap<boolean>(MEMORY_SEED_IMPORTED_KEY);
  return Boolean(map[characterId]);
}

export async function importCharacterMemorySeed(pack: CharacterPack): Promise<number> {
  if (!pack.memorySeed?.memories?.length || isMemorySeedImported(pack.id)) return 0;
  let count = 0;
  for (const memory of pack.memorySeed.memories) {
    const content = String(memory.content || '').trim();
    if (content) {
      await saveMemory(`【角色记忆/${pack.displayName || pack.name}】${content}`);
      count += 1;
    }
  }
  const imported = loadJsonMap<boolean>(MEMORY_SEED_IMPORTED_KEY);
  imported[pack.id] = true;
  saveJsonMap(MEMORY_SEED_IMPORTED_KEY, imported);
  await loadMemories();
  return count;
}

export function resolveCharacterAssetPath(pack: CharacterPack | null | undefined, relativePath?: string): string | null {
  if (!pack || !relativePath || !sanitizeRelativePath(relativePath)) return null;
  return joinPath(pack.basePath, relativePath);
}

function emotionKeyFromExpression(expression: string): string {
  if (/love/i.test(expression)) return 'love';
  if (/sad|disappointed/i.test(expression)) return 'sad';
  if (/angry/i.test(expression)) return 'angry';
  if (/thinking|focused|confused/i.test(expression)) return 'thinking';
  if (/sleepy|tired/i.test(expression)) return 'sleepy';
  if (/happy|excited|shy|proud|satisfied|coquettish/i.test(expression)) return 'happy';
  return 'happy';
}

export function resolveCharacterDisplayAsset(pack: CharacterPack | null | undefined, expression: string): string | null {
  if (!pack?.features?.enableEmotionImage && !pack?.emotionMap && !pack?.assets) return null;
  const emotionKey = emotionKeyFromExpression(expression);
  return resolveCharacterAssetPath(pack, pack.emotionMap?.[emotionKey])
    || resolveCharacterAssetPath(pack, pack.assets.idle)
    || resolveCharacterAssetPath(pack, pack.assets.fullbody)
    || resolveCharacterAssetPath(pack, pack.assets.avatar);
}

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function bytesToBase64(bytes: number[]): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}

export async function readCharacterAssetAsDataUrl(path: string): Promise<string | null> {
  const result = await tauriAdapter.readFileBase64(path);
  if (!result.ok || !result.data?.length) return null;
  return `data:${mimeFromPath(path)};base64,${bytesToBase64(result.data)}`;
}

export async function openCharacterPath(path: string): Promise<boolean> {
  const result = await tauriAdapter.invokeSafe<void>('open_path', { path });
  return result.ok;
}
