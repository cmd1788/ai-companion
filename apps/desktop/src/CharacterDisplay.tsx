import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from './store';
import { runtime } from './runtime/runtimeAdapter';

// 表情图片映射
const EXPRESSION_MAP: Record<string, string> = {
  '01_happy': '/expressions/01_happy.webp',
  '02_angry': '/expressions/02_angry.webp',
  '03_sad': '/expressions/03_sad.webp',
  '04_surprised': '/expressions/04_surprised.webp',
  '05_shy': '/expressions/05_shy.webp',
  '06_confused': '/expressions/06_confused.webp',
  '07_sleepy': '/expressions/07_sleepy.webp',
  '08_proud': '/expressions/08_proud.webp',
  '09_expectant': '/expressions/09_expectant.webp',
  '10_disappointed': '/expressions/10_disappointed.webp',
  '11_excited': '/expressions/11_excited.webp',
  '12_cold': '/expressions/12_cold.webp',
  '13_coquettish': '/expressions/13_coquettish.webp',
  '14_scared': '/expressions/14_scared.webp',
  '15_satisfied': '/expressions/15_satisfied.webp',
  '16_wronged': '/expressions/16_wronged.webp',
  '17_mischievous': '/expressions/17_mischievous.webp',
  '18_relaxed': '/expressions/18_relaxed.webp',
  '19_focused': '/expressions/19_focused.webp',
  '20_love': '/expressions/20_love.webp',
};

// 场景表情
const SCENE_EXPRESSIONS = {
  speaking: '11_excited',
  thinking: '19_focused',
  idle: '12_cold',
  greeting: '01_happy',
};

// 安全的 base64 编码函数
function toBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.slice(i, Math.min(i + chunkSize, len));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

export function CharacterDisplay() {
  const { photoPath, currentExpression, emotion, styleSettings } = useAppStore();
  const [showUserPhotos, setShowUserPhotos] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoFiles, setPhotoFiles] = useState<string[]>([]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [characterState, setCharacterState] = useState<'idle' | 'speaking' | 'thinking'>('idle');
  const loadedPhotosRef = useRef<Map<string, string>>(new Map());

  // 获取当前显示的表情图片
  const getCurrentExpressionSrc = useCallback(() => {
    const expressionFile = EXPRESSION_MAP[currentExpression] || EXPRESSION_MAP['01_happy'];
    return expressionFile;
  }, [currentExpression]);

  // 获取场景表情
  const getSceneExpression = useCallback((state: string) => {
    return SCENE_EXPRESSIONS[state as keyof typeof SCENE_EXPRESSIONS] || '12_cold';
  }, []);

  // 加载用户照片列表 - 使用 runtime adapter
  useEffect(() => {
    async function loadPhotoList() {
      if (!photoPath) {
        setIsLoading(false);
        return;
      }

      try {
        if (runtime.isTauri()) {
          // Tauri 模式：使用 invoke 读取目录
          const { tauriAdapter } = await import('./runtime/tauriAdapter');
          const result = await tauriAdapter.readPhotoDir(photoPath);
          if (result.ok && result.data) {
            setPhotoFiles(result.data.slice(0, 20));
          } else {
            console.warn('[CharacterDisplay] read_photo_dir failed:', result.error);
            setPhotoFiles([]);
          }
        } else {
          // Browser 模式：照片目录不可用
          console.log('[CharacterDisplay] Photo dir not available in browser mode');
          setPhotoFiles([]);
        }
      } catch (e) {
        console.error('[CharacterDisplay] Failed to load photo list:', e);
        setPhotoFiles([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadPhotoList();
  }, [photoPath]);

  // 加载当前用户照片 - 使用 runtime adapter
  useEffect(() => {
    async function loadCurrentPhoto() {
      if (photoFiles.length === 0 || !showUserPhotos) return;

      const normalizedBase = photoPath.replace(/\\/g, '/').replace(/\/$/, '');
      const file = photoFiles[photoIndex];
      const fullPath = `${normalizedBase}/${file}`;

      if (loadedPhotosRef.current.has(fullPath)) {
        setCurrentPhotoUrl(loadedPhotosRef.current.get(fullPath)!);
        return;
      }

      try {
        if (runtime.isTauri()) {
          // Tauri 模式：使用 invoke 读取文件
          const { tauriAdapter } = await import('./runtime/tauriAdapter');
          const result = await tauriAdapter.readFileBase64(fullPath);
          if (!result.ok || !result.data || result.data.length === 0) {
            console.warn('[CharacterDisplay] read_file_base64 failed:', result.error);
            return;
          }

          const uint8Array = new Uint8Array(result.data);
          let mimeType = 'image/jpeg';
          const lower = file.toLowerCase();
          if (lower.endsWith('.png')) mimeType = 'image/png';
          else if (lower.endsWith('.webp')) mimeType = 'image/webp';

          const base64 = toBase64(uint8Array);
          const dataUrl = `data:${mimeType};base64,${base64}`;

          loadedPhotosRef.current.set(fullPath, dataUrl);
          setCurrentPhotoUrl(dataUrl);
        } else {
          // Browser 模式：无法读取本地文件
          console.log('[CharacterDisplay] File read not available in browser mode');
        }
      } catch (e) {
        console.error('[CharacterDisplay] Failed to load photo:', e);
      }
    }

    loadCurrentPhoto();
  }, [photoFiles, photoIndex, photoPath, showUserPhotos]);

  // 根据情绪更新状态
  useEffect(() => {
    if (emotion.fatigue > 60) {
      setCharacterState('thinking');
    } else if (isSpeaking) {
      setCharacterState('speaking');
    } else {
      setCharacterState('idle');
    }
  }, [emotion, isSpeaking]);

  // 根据情绪选择心情文字
  useEffect(() => {
    if (emotion.happiness > 80) {
      setCurrentMessage('心情超好~');
    } else if (emotion.happiness > 60) {
      setCurrentMessage('开心~');
    } else if (emotion.happiness > 40) {
      setCurrentMessage('在想什么呢~');
    } else if (emotion.happiness > 20) {
      setCurrentMessage('有点无聊...');
    } else {
      setCurrentMessage('好难过...');
    }
  }, [emotion.happiness]);

  // 点击切换：显示用户照片或切换表情
  const handleClick = useCallback(() => {
    if (showUserPhotos && photoFiles.length > 1) {
      setPhotoIndex(prev => (prev + 1) % photoFiles.length);
    } else if (showUserPhotos) {
      setShowUserPhotos(false);
    } else {
      if (photoFiles.length > 0) {
        setShowUserPhotos(true);
        setPhotoIndex(0);
      }
    }

    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 2000);
  }, [showUserPhotos, photoFiles.length]);

  // 右键退出用户照片模式
  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (showUserPhotos) {
      setShowUserPhotos(false);
    }
  }, [showUserPhotos]);

  // 不显示角色时
  if (!styleSettings.showCharacter) {
    return null;
  }

  // 表情图片元素
  const expressionSrc = getCurrentExpressionSrc();

  return (
    <div
      className="relative w-full h-full flex items-center justify-center cursor-pointer"
      onClick={handleClick}
      onContextMenu={handleRightClick}
    >
      <div className="relative" style={{ width: 280, height: 280 }}>
        {showUserPhotos ? (
          <>
            {currentPhotoUrl ? (
              <img
                src={currentPhotoUrl}
                alt={`照片 ${photoIndex + 1}/${photoFiles.length}`}
                className="w-full h-full object-contain rounded-lg"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(233, 69, 96, 0.3))',
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/10 rounded-lg">
                <span className="text-white/50">照片在浏览器模式下不可用</span>
              </div>
            )}
            {/* 用户照片指示器 */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
              {photoFiles.slice(0, 5).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === photoIndex ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
              {photoFiles.length > 5 && <span className="text-white/50 text-xs">+{photoFiles.length - 5}</span>}
            </div>
            {/* 点击提示 */}
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white/70">
              点击返回表情 | 右键关闭
            </div>
          </>
        ) : (
          <>
            <img
              src={expressionSrc}
              alt={`表情: ${currentExpression}`}
              className="w-full h-full object-contain rounded-lg transition-all duration-300"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(233, 69, 96, 0.4))',
              }}
              onError={(e) => {
                console.error('[CharacterDisplay] Expression load error:', expressionSrc);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* 状态指示器 */}
            {characterState !== 'idle' && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white/70">
                {characterState === 'speaking' ? '说话中...' : '思考中...'}
              </div>
            )}
            {/* 点击提示 */}
            {photoFiles.length > 0 && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white/70">
                点击看照片
              </div>
            )}
          </>
        )}
      </div>

      {/* 说话气泡 */}
      {isSpeaking && currentMessage && !showUserPhotos && (
        <div
          className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg animate-pulse"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#1a1a2e',
            maxWidth: 200,
          }}
        >
          <span className="text-sm">{currentMessage}</span>
        </div>
      )}
    </div>
  );
}
