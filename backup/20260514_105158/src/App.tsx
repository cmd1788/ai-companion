import React, { useState, useEffect } from 'react';
import { CharacterDisplay } from './CharacterDisplay';
import { ChatPanel } from './ChatPanel';
import { EmotionDisplay } from './EmotionDisplay';
import { SettingsPanel } from './SettingsPanel';
import { ScreenWatcher } from './ScreenWatcher';
import { useAppStore } from './store';

export default function App() {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { initDB, dbReady, styleSettings } = useAppStore();

  useEffect(() => {
    initDB().then(() => setIsLoading(false));
  }, [initDB]);

  if (isLoading) {
    return (
      <div
        className="relative flex flex-col h-full select-none items-center justify-center"
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        }}
      >
        <div className="text-white">小伊加载中...</div>
      </div>
    );
  }

  // 设置面板全屏显示
  if (isSettingsOpen) {
    return (
      <div
        className="relative flex flex-col h-full select-none"
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 0,
        }}
      >
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col h-full select-none"
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 0,
      }}
    >
      {/* 左上角设置按钮 */}
      <button
        onClick={() => setSettingsOpen(true)}
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
        {styleSettings.showEmotionBar && <EmotionDisplay />}

        {/* 角色展示 */}
        {styleSettings.showCharacter && (
          <div className="flex-shrink-0" style={{ height: '40%', minHeight: 200 }}>
            <CharacterDisplay />
          </div>
        )}

        {/* 聊天面板 */}
        {styleSettings.showChat && (
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>
        )}
      </div>

      {/* 主动交互监控 - 根据设置启用 */}
      {styleSettings.enableScreenWatch && <ScreenWatcher />}

      {/* 底部工具栏 */}
      {styleSettings.showToolbar && (
        <div
          className="flex items-center justify-center py-2"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex flex-col items-center gap-0.5 px-6 py-1"
          >
            <span className="text-lg">⚙️</span>
            <span className="text-xs" style={{ color: '#a0a0a0' }}>设置</span>
          </button>
        </div>
      )}
    </div>
  );
}
