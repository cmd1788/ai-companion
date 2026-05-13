import React, { useState, useEffect } from 'react';
import { useAppStore } from './store';

interface SettingsPanelProps {
  onClose?: () => void;
}

// 设置页面类型
type SettingsTab = 'character' | 'system' | 'model' | 'style';

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('character');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const {
    aiConfig, setAIConfig,
    characterSettings, setCharacterSettings,
    systemSettings, setSystemSettings,
    styleSettings, setStyleSettings,
    character, setCharacter,
    photoPath, setPhotoPath,
  } = useAppStore();

  // 性格选项
  const personalityOptions = [
    '超级可爱', '话痨', '活泼开朗', '粘人', '爱撒娇',
    '温柔体贴', '傲娇', '高冷', '沙雕', '文艺',
    '元气满满', '文静', '腹黑', '治愈系', '搞笑'
  ];

  // 测试API连接
  const testApiConnection = async () => {
    setTestStatus('testing');
    setTestMessage('测试连接中...');

    try {
      const response = await fetch(`${aiConfig.baseUrl}/v1/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        setTestStatus('success');
        setTestMessage('连接成功!');
      } else {
        const err = await response.text();
        setTestStatus('error');
        setTestMessage(`连接失败: ${response.status} - ${err}`);
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMessage(`连接失败: ${e.message}`);
    }

    setTimeout(() => setTestStatus('idle'), 3000);
  };

  // 切换性格标签
  const togglePersonality = (tag: string) => {
    const current = characterSettings.personality;
    const newPersonality = current.includes(tag)
      ? current.filter(p => p !== tag)
      : [...current, tag];
    setCharacterSettings({ ...characterSettings, personality: newPersonality });
  };

  // 渲染人物设定页
  const renderCharacterTab = () => (
    <div className="space-y-4">
      {/* 角色名称 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>角色名称</h3>
        <input
          type="text"
          value={characterSettings.name}
          onChange={(e) => {
            setCharacterSettings({ ...characterSettings, name: e.target.value });
            setCharacter({ ...character, name: e.target.value });
          }}
          placeholder="输入角色名称"
          className="w-full px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>

      {/* 性格设定 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>性格设定</h3>
        <div className="flex flex-wrap gap-2">
          {personalityOptions.map(tag => (
            <button
              key={tag}
              onClick={() => togglePersonality(tag)}
              className="px-3 py-1.5 rounded-full text-xs transition-all"
              style={{
                background: characterSettings.personality.includes(tag)
                  ? 'linear-gradient(135deg, #e94560, #ff6b8a)'
                  : 'rgba(255,255,255,0.1)',
                color: '#eaeaea',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: '#888' }}>
          当前: {characterSettings.personality.join(', ') || '未选择'}
        </p>
      </div>

      {/* 照片路径 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>人物照片路径</h3>
        <input
          type="text"
          value={characterSettings.photoPath}
          onChange={(e) => {
            setCharacterSettings({ ...characterSettings, photoPath: e.target.value });
            setPhotoPath(e.target.value);
          }}
          placeholder="E:/BaiduNetdiskDownload/2333/anon"
          className="w-full px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <p className="text-xs mt-2" style={{ color: '#888' }}>设置包含角色立绘图片的文件夹路径</p>
      </div>
    </div>
  );

  // 渲染系统设定页
  const renderSystemTab = () => (
    <div className="space-y-4">
      {/* 观察模式 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium" style={{ color: '#eaeaea' }}>截屏观察模式</h3>
            <p className="text-xs mt-1" style={{ color: '#888' }}>自动检测屏幕内容主动说话</p>
          </div>
          <button
            onClick={() => setStyleSettings({ ...styleSettings, enableScreenWatch: !styleSettings.enableScreenWatch })}
            className="w-12 h-6 rounded-full transition-all relative"
            style={{
              background: styleSettings.enableScreenWatch ? '#e94560' : 'rgba(255,255,255,0.2)',
            }}
          >
            <div
              className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
              style={{
                background: '#fff',
                left: styleSettings.enableScreenWatch ? '26px' : '2px',
              }}
            />
          </button>
        </div>
      </div>

      {/* 截屏间隔 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>截屏间隔时间</h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={systemSettings.screenWatchInterval}
            onChange={(e) => setSystemSettings({ ...systemSettings, screenWatchInterval: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-sm font-mono" style={{ color: '#e94560' }}>{systemSettings.screenWatchInterval}秒</span>
        </div>
      </div>

      {/* 主动回复速度 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>主动回复速度</h3>
        <div className="flex gap-2">
          {(['slow', 'normal', 'fast'] as const).map(speed => (
            <button
              key={speed}
              onClick={() => setSystemSettings({ ...systemSettings, autoReplySpeed: speed })}
              className="flex-1 py-2 rounded-lg text-xs transition-all"
              style={{
                background: systemSettings.autoReplySpeed === speed
                  ? 'linear-gradient(135deg, #e94560, #ff6b8a)'
                  : 'rgba(255,255,255,0.1)',
                color: '#eaeaea',
              }}
            >
              {speed === 'slow' ? '慢' : speed === 'normal' ? '正常' : '快'}
            </button>
          ))}
        </div>
      </div>

      {/* 记忆天数 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>记忆保存天数</h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="7"
            max="90"
            step="1"
            value={systemSettings.memoryDays}
            onChange={(e) => setSystemSettings({ ...systemSettings, memoryDays: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-sm font-mono" style={{ color: '#e94560' }}>{systemSettings.memoryDays}天</span>
        </div>
        <p className="text-xs mt-2" style={{ color: '#888' }}>超过此时间的历史记忆将自动清除</p>
      </div>

      {/* 主动回复开关 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium" style={{ color: '#eaeaea' }}>主动回复</h3>
            <p className="text-xs mt-1" style={{ color: '#888' }}>开启后AI会主动发起对话</p>
          </div>
          <button
            onClick={() => setStyleSettings({ ...styleSettings, enableAutoReply: !styleSettings.enableAutoReply })}
            className="w-12 h-6 rounded-full transition-all relative"
            style={{
              background: styleSettings.enableAutoReply ? '#e94560' : 'rgba(255,255,255,0.2)',
            }}
          >
            <div
              className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
              style={{
                background: '#fff',
                left: styleSettings.enableAutoReply ? '26px' : '2px',
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );

  // 渲染模型设置页
  const renderModelTab = () => (
    <div className="space-y-4">
      {/* API Provider */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>AI Provider</h3>
        <select
          value={aiConfig.provider}
          onChange={(e) => setAIConfig({ ...aiConfig, provider: e.target.value })}
          className="w-full px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <option value="minimax">MiniMax (在线)</option>
          <option value="openai">OpenAI</option>
          <option value="ollama">Ollama (本地)</option>
        </select>
      </div>

      {/* API Base URL */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>API Base URL</h3>
        <input
          type="text"
          value={aiConfig.baseUrl}
          onChange={(e) => setAIConfig({ ...aiConfig, baseUrl: e.target.value })}
          placeholder="https://api.minimax.chat"
          className="w-full px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>

      {/* API Key */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>API Key</h3>
        <input
          type="password"
          value={aiConfig.apiKey || ''}
          onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
          placeholder="sk-cp-..."
          className="w-full px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>

      {/* Model */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>Model</h3>
        <input
          type="text"
          value={aiConfig.model}
          onChange={(e) => setAIConfig({ ...aiConfig, model: e.target.value })}
          placeholder="MiniMax-M2.7-highspeed"
          className="w-full px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>

      {/* Advanced Settings */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#eaeaea' }}>高级设置</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs" style={{ color: '#888' }}>Max Tokens</label>
            <input
              type="number"
              value={aiConfig.maxTokens}
              onChange={(e) => setAIConfig({ ...aiConfig, maxTokens: parseInt(e.target.value) || 200 })}
              className="w-full px-4 py-2 rounded-lg text-sm mt-1"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div>
            <label className="text-xs" style={{ color: '#888' }}>Temperature</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={aiConfig.temperature}
              onChange={(e) => setAIConfig({ ...aiConfig, temperature: parseFloat(e.target.value) || 0.8 })}
              className="w-full px-4 py-2 rounded-lg text-sm mt-1"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>
      </div>

      {/* Test Button */}
      <button
        onClick={testApiConnection}
        disabled={testStatus === 'testing'}
        className="w-full py-3 rounded-lg text-sm font-medium transition-all"
        style={{
          background: testStatus === 'success' ? '#22c55e' : testStatus === 'error' ? '#ef4444' : 'linear-gradient(135deg, #e94560, #ff6b8a)',
          color: '#fff',
        }}
      >
        {testStatus === 'testing' ? '测试中...' : testStatus === 'success' ? '✓ 连接成功' : testStatus === 'error' ? '✗ 连接失败' : '测试连接'}
      </button>
      {testMessage && testStatus !== 'idle' && (
        <p className="text-xs text-center" style={{ color: testStatus === 'error' ? '#ef4444' : '#22c55e' }}>
          {testMessage}
        </p>
      )}
    </div>
  );

  // 渲染风格页面
  const renderStyleTab = () => (
    <div className="space-y-4">
      {/* 显示控制 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-4" style={{ color: '#eaeaea' }}>显示控制</h3>
        <div className="space-y-3">
          {[
            { key: 'showEmotionBar', label: '情绪指标条', desc: '顶部情绪可视化条' },
            { key: 'showCharacter', label: '角色立绘', desc: '显示角色图片展示' },
            { key: 'showChat', label: '聊天面板', desc: '对话输入和显示区域' },
            { key: 'showToolbar', label: '底部工具栏', desc: '底部功能按钮栏' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <span className="text-sm" style={{ color: '#eaeaea' }}>{item.label}</span>
                <p className="text-xs" style={{ color: '#888' }}>{item.desc}</p>
              </div>
              <button
                onClick={() => setStyleSettings({ ...styleSettings, [item.key]: !styleSettings[item.key as keyof typeof styleSettings] })}
                className="w-12 h-6 rounded-full transition-all relative"
                style={{
                  background: styleSettings[item.key as keyof typeof styleSettings] ? '#e94560' : 'rgba(255,255,255,0.2)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
                  style={{
                    background: '#fff',
                    left: styleSettings[item.key as keyof typeof styleSettings] ? '26px' : '2px',
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 功能开关 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-4" style={{ color: '#eaeaea' }}>功能开关</h3>
        <div className="space-y-3">
          {[
            { key: 'enableTTS', label: '语音朗读', desc: 'AI回复时自动朗读' },
            { key: 'enableScreenWatch', label: '截屏观察', desc: '监控屏幕主动互动' },
            { key: 'enableAutoReply', label: '主动回复', desc: '无交互时主动发起对话' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <span className="text-sm" style={{ color: '#eaeaea' }}>{item.label}</span>
                <p className="text-xs" style={{ color: '#888' }}>{item.desc}</p>
              </div>
              <button
                onClick={() => setStyleSettings({ ...styleSettings, [item.key]: !styleSettings[item.key as keyof typeof styleSettings] })}
                className="w-12 h-6 rounded-full transition-all relative"
                style={{
                  background: styleSettings[item.key as keyof typeof styleSettings] ? '#e94560' : 'rgba(255,255,255,0.2)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
                  style={{
                    background: '#fff',
                    left: styleSettings[item.key as keyof typeof styleSettings] ? '26px' : '2px',
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 关于 */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium mb-2" style={{ color: '#eaeaea' }}>关于</h3>
        <p className="text-xs" style={{ color: '#888' }}>AI Companion v0.2.0</p>
        <p className="text-xs" style={{ color: '#888' }}>人格化 AI 桌面副官</p>
      </div>
    </div>
  );

  return (
    <div
      className="absolute inset-0 rounded-lg flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        zIndex: 100,
      }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 className="text-base font-semibold" style={{ color: '#eaeaea' }}>设置</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#eaeaea' }}
        >
          ✕
        </button>
      </div>

      {/* Tab导航 */}
      <div className="flex px-2 py-2 gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {[
          { key: 'character' as const, label: '人物', icon: '👤' },
          { key: 'system' as const, label: '系统', icon: '⚙️' },
          { key: 'model' as const, label: '模型', icon: '🤖' },
          { key: 'style' as const, label: '风格', icon: '🎨' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 rounded-lg text-xs flex flex-col items-center gap-1 transition-all"
            style={{
              background: activeTab === tab.key ? 'rgba(233,69,96,0.3)' : 'transparent',
              color: activeTab === tab.key ? '#e94560' : '#888',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'character' && renderCharacterTab()}
        {activeTab === 'system' && renderSystemTab()}
        {activeTab === 'model' && renderModelTab()}
        {activeTab === 'style' && renderStyleTab()}
      </div>
    </div>
  );
}
