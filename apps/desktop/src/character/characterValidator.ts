import type { CharacterManifest, CharacterValidationResult } from './characterTypes';

export const ALLOWED_CHARACTER_EXTENSIONS = new Set([
  '.json',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.mp3',
  '.wav',
]);

const SENSITIVE_FIELD_RE = /^(apiKey|api_key|token|cookie|privateKey|private_key|authorization|secret|accessToken|refreshToken)$/i;
const EXECUTION_HINT_RE = /(command|script|postinstall|preinstall|exec|shell|remoteExec|webhook|callbackUrl|callbackURL)$/i;

export function createEmptyValidation(): CharacterValidationResult {
  return {
    ok: true,
    errors: [],
    warnings: [],
    sensitiveFieldsFound: [],
    missingFiles: [],
  };
}

export function finishValidation(result: CharacterValidationResult): CharacterValidationResult {
  return {
    ...result,
    ok: result.errors.length === 0 && result.sensitiveFieldsFound.length === 0,
  };
}

export function getFileExtension(path: string): string {
  const match = path.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : '';
}

export function isAllowedCharacterFile(path: string): boolean {
  return ALLOWED_CHARACTER_EXTENSIONS.has(getFileExtension(path));
}

export function collectSensitiveFields(value: unknown, path = ''): string[] {
  const found: string[] = [];
  if (!value || typeof value !== 'object') return found;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      found.push(...collectSensitiveFields(item, `${path}[${index}]`));
    });
    return found;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
    const nextPath = path ? `${path}.${key}` : key;
    if (SENSITIVE_FIELD_RE.test(key)) {
      found.push(nextPath);
    }
    if (EXECUTION_HINT_RE.test(key)) {
      found.push(nextPath);
    }
    found.push(...collectSensitiveFields(child, nextPath));
  });

  return Array.from(new Set(found));
}

export function sanitizeRelativePath(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  const trimmed = path.trim().replace(/\\/g, '/');
  if (!trimmed) return null;
  if (/^[a-zA-Z]:\//.test(trimmed) || trimmed.startsWith('/') || trimmed.includes('..')) {
    return null;
  }
  return trimmed;
}

export function validateManifestShape(manifest: Partial<CharacterManifest>, result = createEmptyValidation()): CharacterValidationResult {
  if (manifest.schemaVersion !== 1) {
    result.errors.push('不支持的 schemaVersion，仅支持 1');
  }
  if (!manifest.id || typeof manifest.id !== 'string') {
    result.errors.push('character.json 缺少 id');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(manifest.id)) {
    result.errors.push('id 只能包含字母、数字、下划线和短横线');
  }
  if (!manifest.name || typeof manifest.name !== 'string') {
    result.errors.push('character.json 缺少 name');
  }
  if (manifest.personaFile && !sanitizeRelativePath(manifest.personaFile)) {
    result.errors.push('personaFile 必须是角色包内的相对路径');
  }
  if (manifest.voiceFile && !sanitizeRelativePath(manifest.voiceFile)) {
    result.errors.push('voiceFile 必须是角色包内的相对路径');
  }
  if (manifest.proactiveFile && !sanitizeRelativePath(manifest.proactiveFile)) {
    result.errors.push('proactiveFile 必须是角色包内的相对路径');
  }
  if (manifest.memorySeedFile && !sanitizeRelativePath(manifest.memorySeedFile)) {
    result.errors.push('memorySeedFile 必须是角色包内的相对路径');
  }

  Object.entries(manifest.assets || {}).forEach(([key, value]) => {
    if (value && !sanitizeRelativePath(value)) {
      result.errors.push(`assets.${key} 必须是角色包内的相对路径`);
    }
  });
  Object.entries(manifest.emotionMap || {}).forEach(([key, value]) => {
    if (value && !sanitizeRelativePath(value)) {
      result.errors.push(`emotionMap.${key} 必须是角色包内的相对路径`);
    }
  });

  return result;
}

export function validateVoiceConfig(value: unknown, result = createEmptyValidation()): CharacterValidationResult {
  const voice = value as Record<string, unknown>;
  if (!voice || typeof voice !== 'object') {
    result.errors.push('voice.json 不是合法对象');
    return result;
  }
  if (voice.provider !== 'minimax') {
    result.errors.push('voice.json provider 必须是 minimax');
  }
  if (voice.apiKeySource !== 'network_center') {
    result.errors.push('voice.json apiKeySource 必须是 network_center');
  }
  if (!voice.voiceId || typeof voice.voiceId !== 'string') {
    result.errors.push('voice.json 缺少 voiceId');
  }
  if (collectSensitiveFields(voice).length > 0) {
    result.sensitiveFieldsFound.push(...collectSensitiveFields(voice));
  }
  return result;
}

export function validateProactiveConfig(value: unknown, result = createEmptyValidation()): CharacterValidationResult {
  const proactive = value as Record<string, unknown>;
  if (!proactive || typeof proactive !== 'object') {
    result.errors.push('proactive.json 不是合法对象');
    return result;
  }
  if (typeof proactive.personaPrompt !== 'string') result.warnings.push('proactive.json 缺少 personaPrompt，将使用系统默认');
  if (typeof proactive.topicScope !== 'string') result.warnings.push('proactive.json 缺少 topicScope，将使用系统默认');
  if (collectSensitiveFields(proactive).length > 0) {
    result.sensitiveFieldsFound.push(...collectSensitiveFields(proactive));
  }
  return result;
}

export function validateMemorySeed(value: unknown, result = createEmptyValidation()): CharacterValidationResult {
  const seed = value as Record<string, unknown>;
  if (!seed || typeof seed !== 'object' || !Array.isArray(seed.memories)) {
    result.errors.push('memory_seed.json 必须包含 memories 数组');
    return result;
  }
  if (collectSensitiveFields(seed).length > 0) {
    result.sensitiveFieldsFound.push(...collectSensitiveFields(seed));
  }
  return result;
}
