import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from './store';
import { invoke } from '@tauri-apps/api/core';

// 安全的 base64 编码函数 - 分块处理避免栈溢出
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
  const { photoPath, emotion } = useAppStore();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoFiles, setPhotoFiles] = useState<string[]>([]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const loadedPhotosRef = useRef<Map<string, string>>(new Map());

  // 加载照片文件列表
  useEffect(() => {
    async function loadPhotoList() {
      if (!photoPath) {
        console.log('[CharacterDisplay] No photoPath set');
        setIsLoading(false);
        return;
      }

      try {
        console.log('[CharacterDisplay] Loading photo list from:', photoPath);
        const files: string[] = await invoke('read_photo_dir', { path: photoPath });
        
        console.log('[CharacterDisplay] Found', files.length, 'photos');
        
        // 加载前20张照片（避免内存问题）
        const testFiles = files.slice(0, 20);
        console.log('[CharacterDisplay] Loaded', testFiles.length, 'photos');
        setPhotoFiles(testFiles);
      } catch (e) {
        console.error('[CharacterDisplay] Failed to load photo list:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadPhotoList();
  }, [photoPath]);

  // 加载当前照片为 base64
  useEffect(() => {
    async function loadCurrentPhoto() {
      if (photoFiles.length === 0) return;

      const normalizedBase = photoPath.replace(/\\/g, '/').replace(/\/$/, '');
      const file = photoFiles[photoIndex];
      const fullPath = `${normalizedBase}/${file}`;

      // 检查缓存
      if (loadedPhotosRef.current.has(fullPath)) {
        setCurrentPhotoUrl(loadedPhotosRef.current.get(fullPath)!);
        return;
      }

      try {
        console.log('[CharacterDisplay] Loading:', file);
        const bytes: number[] = await invoke('read_file_base64', { path: fullPath });
        
        if (!bytes || bytes.length === 0) {
          console.error('[CharacterDisplay] Empty bytes for:', file);
          return;
        }

        const uint8Array = new Uint8Array(bytes);
        
        let mimeType = 'image/jpeg';
        const lower = file.toLowerCase();
        if (lower.endsWith('.png')) mimeType = 'image/png';
        else if (lower.endsWith('.gif')) mimeType = 'image/gif';
        else if (lower.endsWith('.webp')) mimeType = 'image/webp';
        else if (lower.endsWith('.bmp')) mimeType = 'image/bmp';
        
        // 使用安全的 base64 编码
        const base64 = toBase64(uint8Array);
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        // 缓存
        loadedPhotosRef.current.set(fullPath, dataUrl);
        setCurrentPhotoUrl(dataUrl);
        
        console.log('[CharacterDisplay] Loaded photo', file, 'size:', bytes.length);
      } catch (e) {
        console.error('[CharacterDisplay] Failed to load photo:', file, e);
      }
    }

    loadCurrentPhoto();
  }, [photoFiles, photoIndex, photoPath]);

  // 定时轮换照片（每5秒）
  useEffect(() => {
    if (photoFiles.length <= 1) return;

    const interval = setInterval(() => {
      setPhotoIndex(prev => (prev + 1) % photoFiles.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [photoFiles.length]);

  // 根据情绪选择表情文本
  useEffect(() => {
    if (emotion.happiness > 70) {
      setCurrentMessage('心情真好~');
    } else if (emotion.happiness > 40) {
      setCurrentMessage('在想什么呢~');
    } else {
      setCurrentMessage('好无聊啊...');
    }
  }, [emotion.happiness]);

  const handleClick = useCallback(() => {
    if (photoFiles.length > 1) {
      setPhotoIndex(prev => (prev + 1) % photoFiles.length);
    }

    setIsSpeaking(true);
    setTimeout(() => {
      setIsSpeaking(false);
    }, 3000);
  }, [photoFiles.length]);

  // 没有照片时显示占位符
  if (isLoading) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="text-white/50 text-sm">加载中...</div>
      </div>
    );
  }

  if (photoFiles.length === 0) {
    return (
      <div 
        className="relative w-full h-full flex items-center justify-center cursor-pointer"
        onClick={handleClick}
      >
        <div 
          className="w-48 h-48 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #e94560 0%, #ff6b8a 100%)',
            filter: 'drop-shadow(0 0 20px rgba(233, 69, 96, 0.4))',
          }}
        >
          <span className="text-6xl">🖼️</span>
        </div>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-white/50">
          点击设置照片路径
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center cursor-pointer"
      onClick={handleClick}
    >
      <div 
        className="relative"
        style={{ width: 280, height: 280 }}
      >
        {currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={`照片 ${photoIndex + 1}/${photoFiles.length}`}
            className="w-full h-full object-contain rounded-lg"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(233, 69, 96, 0.3))',
            }}
            onError={(e) => {
              console.error('[CharacterDisplay] Image load error');
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white/50 text-sm">加载中...</div>
          </div>
        )}
        
        {/* 照片索引指示器 */}
        {photoFiles.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {photoFiles.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === photoIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      
      {isSpeaking && currentMessage && (
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
