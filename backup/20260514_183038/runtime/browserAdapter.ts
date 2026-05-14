// Browser Adapter - 浏览器/Dev/Test 运行时实现
// 不真实截屏、不真实TTS，但绝不崩溃

import { storageAdapter } from './storageAdapter';
import type { ScreenCaptureResult, TTSResult, InvokeResult, EmotionState } from './runtimeTypes';

export function captureScreenBrowser(): ScreenCaptureResult {
  return {
    ok: false,
    error: 'Screen capture unavailable in browser runtime',
    degraded: true,
  };
}

export function speakBrowser(_text: string): TTSResult {
  return {
    ok: false,
    error: 'TTS unavailable in browser runtime',
    degraded: true,
  };
}

export function readPhotoDirBrowser(_path: string): InvokeResult<string[]> {
  return {
    ok: false,
    error: 'Photo dir read unavailable in browser runtime',
    degraded: true,
  };
}

export const browserAdapter = {
  captureScreen: captureScreenBrowser,
  speak: speakBrowser,
  readPhotoDir: readPhotoDirBrowser,
  messages: storageAdapter,
  memories: storageAdapter,
  emotion: {
    save: storageAdapter.saveEmotion,
    load: storageAdapter.loadEmotion,
  },
};
