import React, { useState } from 'react';
import { useAppStore } from './store';

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { aiConfig, setAIConfig, character, setCharacter } = useAppStore();
  const [miniMaxKey, setMiniMaxKey] = useState(aiConfig.apiKey || '');

  const handleSaveMiniMax = () => {
    if (miniMaxKey) {
      setAIConfig({ ...aiConfig, provider: 'minimax', apiKey: miniMaxKey });
    }
  };

  return (
    <div 
      className="absolute inset-0 rounded-lg p-4 overflow-y-auto"
      style={{
        background: 'rgba(26, 26, 46, 0.98)',
        zIndex: 100,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: '#eaeaea' }}>设置</h2>
        <button 
          onClick={onClose}
          className="px-3 py-1 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea' }}
        >
          关闭
        </button>
      </div>

      <div className="space-y-4">
        {/* MiniMax API */}
        <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: '#eaeaea' }}>MiniMax API</h3>
          <input
            type="password"
            value={miniMaxKey}
            onChange={(e) => setMiniMaxKey(e.target.value)}
            placeholder="sk-cp-..."
            className="w-full px-3 py-2 rounded-lg text-sm mb-2"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: 'none' }}
          />
          <button 
            onClick={handleSaveMiniMax}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: '#e94560', color: '#fff' }}
          >
            保存并启用
          </button>
        </div>

        {/* AI Provider */}
        <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: '#eaeaea' }}>AI Provider</h3>
          <select
            value={aiConfig.provider}
            onChange={(e) => setAIConfig({ ...aiConfig, provider: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: 'none' }}
          >
            <option value="ollama">Ollama (本地)</option>
            <option value="minimax">MiniMax (在线)</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

        {/* 角色配置 */}
        <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: '#eaeaea' }}>角色配置</h3>
          <input
            type="text"
            value={character.name}
            onChange={(e) => setCharacter({ ...character, name: e.target.value })}
            placeholder="角色名称"
            className="w-full px-3 py-2 rounded-lg text-sm mb-2"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: 'none' }}
          />
        </div>

        {/* 关于 */}
        <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: '#eaeaea' }}>关于</h3>
          <p className="text-xs" style={{ color: '#a0a0a0' }}>AI Companion v0.1.0</p>
          <p className="text-xs" style={{ color: '#a0a0a0' }}>人格化 AI 桌面副官</p>
        </div>
      </div>
    </div>
  );
}
