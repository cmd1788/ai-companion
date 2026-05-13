import React, { useState, useEffect } from 'react';
import { CharacterDisplay } from './CharacterDisplay';
import { ChatPanel } from './ChatPanel';
import { EmotionDisplay } from './EmotionDisplay';
import { SettingsPanel } from './SettingsPanel';
import { useAppStore } from './store';

export default function App() {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { initDB, dbReady } = useAppStore();

  useEffect(() => {
    initDB().then(() => setIsLoading(false));
  }, [initDB]);

  if (isLoading) {
    return (
      <div
        className="relative flex flex-col h-full select-none items-center justify-center"
        style={{
          width: 416,
          height: 559,
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        }}
      >
        <div className="text-white">小伊加载中...</div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col h-full select-none"
      style={{
        width: 416,
        height: 559,
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 0,
      }}
    >
      {/* 左上角设置按钮 */}
      <button
        onClick={() => setSettingsOpen(!isSettingsOpen)}
        className="absolute top-2 left-2 z-50 w-8 h-8 flex items-center justify-center rounded-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#eaeaea',
        }}
      >
        ⚙️
      </button>

      {/* 主内容 */}
      <div className="flex flex-col flex-1 overflow-hidden">
      {/* 情绪指标条 */}
      <EmotionDisplay />

      {/* 角色展示 */}
      <div className="flex-shrink-0" style={{ height: 300 }}>
        <CharacterDisplay />
      </div>

      {/* 聊天面板 */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel />
      </div>
      </div>

      {/* 设置面板 */}
      {isSettingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
