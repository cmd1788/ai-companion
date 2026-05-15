import React, { useState, useEffect } from 'react';
import { CharacterDisplay } from './CharacterDisplay';
import { ChatPanel } from './ChatPanel';
import { EmotionDisplay } from './EmotionDisplay';
import { SettingsPanel } from './SettingsPanel';
import { ScreenWatcher } from './ScreenWatcher';
import { useAppStore } from './store';
import { startProactiveChat, stopProactiveChat, restartProactiveChat } from './proactiveChat';
import { runtime } from './runtime/runtimeAdapter';

export default function App() {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [runtimeStatus, setRuntimeStatus] = useState<any>(null);
  const { initDB, dbReady, styleSettings } = useAppStore();
  const stopDragPropagation = (e: React.MouseEvent) => e.stopPropagation();

  useEffect(() => {
    // 初始化 Runtime（必须在 React 挂载前完成）
    const init = async () => {
      console.log('[App] Initializing runtime...');
      try {
        const status = await runtime.init();
        setRuntimeStatus(status);
        console.log('[App] Runtime mode:', status.mode, '| Storage:', status.storageBackend);
        
        if (status.warnings.length > 0) {
          status.warnings.forEach((w: string) => console.warn('[Runtime Warning]', w));
        }
        if (status.errors.length > 0) {
          status.errors.forEach((e: string) => console.error('[Runtime Error]', e));
        }
      } catch (e) {
        console.error('[App] Runtime init failed:', e);
        // 即使 runtime init 失败，也继续渲染 UI
      }
      
      // 初始化数据库
      try {
        await initDB();
      } catch (e) {
        console.error('[App] DB init failed:', e);
        // 即使 DB 失败，也继续渲染 UI
      }
      
      setIsLoading(false);
      
      // 启动主动聊天
      startProactiveChat();
    };
    
    init();
  }, [initDB]);

  // 当主动回复设置变化时重启
  useEffect(() => {
    if (!isLoading && dbReady) {
      restartProactiveChat();
    }
  }, [styleSettings.enableAutoReply, styleSettings.autoReplySpeed, isLoading, dbReady]);

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
        {runtimeStatus && (
          <div 
            className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#888' }}
          >
            {runtimeStatus.mode} | {runtimeStatus.storageBackend}
          </div>
        )}
      </div>
    );
  }

  // 设置面板全屏显示
  if (isSettingsOpen) {
    return (
      <div
        className="relative flex flex-col h-full select-none"
        onMouseDown={stopDragPropagation}
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
        onMouseDown={stopDragPropagation}
        onClick={() => setSettingsOpen(true)}
        className="absolute top-2 left-2 z-50 w-8 h-8 flex items-center justify-center rounded-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#eaeaea',
        }}
      >
        ⚙️
      </button>

      {/* 右下角 Runtime 状态角标 */}
      {runtimeStatus && (
        <div 
          className="absolute bottom-2 right-2 z-50 text-xs px-2 py-1 rounded"
          style={{ 
            background: runtimeStatus.invokeAvailable ? 'rgba(0,128,0,0.3)' : 'rgba(128,128,0,0.3)',
            color: runtimeStatus.invokeAvailable ? '#8f8' : '#ff8',
          }}
          title={`Mode: ${runtimeStatus.mode}\nStorage: ${runtimeStatus.storageBackend}\nTauri: ${runtimeStatus.tauriAvailable}\nInvoke: ${runtimeStatus.invokeAvailable}`}
        >
          {runtimeStatus.mode === 'TAURI' ? '🟢' : '🟡'} {runtimeStatus.mode}
        </div>
      )}

      {/* 主内容 */}
      <div className="flex flex-col flex-1 overflow-hidden" onMouseDown={stopDragPropagation}>
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
          onMouseDown={stopDragPropagation}
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onMouseDown={stopDragPropagation}
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
