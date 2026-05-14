import React, { useState } from 'react';
import { useAppStore } from './store';

interface SettingsPanelProps {
  onClose?: () => void;
}

type SettingsTab = 'character' | 'system' | 'model' | 'style';

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('character');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testLatency, setTestLatency] = useState<number | null>(null);

  const {
    aiConfig, setAIConfig,
    characterSettings, setCharacterSettings,
    systemSettings, setSystemSettings,
    styleSettings, setStyleSettings,
    character, setCharacter,
    photoPath, setPhotoPath,
  } = useAppStore();

  const personalityOptions = [
    '超级可爱', '话痨', '活泼开朗', '粘人', '爱撒娇',
    '温柔体贴', '傲娇', '高冷', '沙雕', '文艺',
    '元气满满', '文静', '腹黑', '治愈系', '搞笑'
  ];

  const testApiConnection = async () => {
    setTestStatus('testing');
    setTestLatency(null);
    const t0 = Date.now();

    try {
      const response = await fetch(`${aiConfig.baseUrl}/v1/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 20,
        }),
      });

      const latency = Date.now() - t0;
      setTestLatency(latency);
      setTestStatus(response.ok ? 'success' : 'error');
    } catch {
      setTestStatus('error');
    }

    setTimeout(() => setTestStatus('idle'), 5000);
  };

  const togglePersonality = (tag: string) => {
    const current = characterSettings.personality;
    const newPersonality = current.includes(tag)
      ? current.filter(p => p !== tag)
      : [...current, tag];
    setCharacterSettings({ ...characterSettings, personality: newPersonality });
  };

  const tabs = [
    { key: 'character' as const, label: '👤 人物设定', color: '#e94560' },
    { key: 'system' as const, label: '⚙️ 系统设定', color: '#3b82f6' },
    { key: 'model' as const, label: '🤖 模型设置', color: '#22c55e' },
    { key: 'style' as const, label: '🎨 风格页面', color: '#f59e0b' },
  ];

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, #e94560, #ff6b8a)' }}
          >
            ⚙️
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#fff' }}>设置中心</h2>
            <p className="text-xs" style={{ color: '#888' }}>配置你的 AI 伙伴</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
        >
          ✕
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex px-4 py-3 gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1"
            style={{
              background: activeTab === tab.key
                ? `linear-gradient(135deg, ${tab.color}33, ${tab.color}22)`
                : 'rgba(255,255,255,0.05)',
              color: activeTab === tab.key ? tab.color : '#888',
              border: activeTab === tab.key ? `2px solid ${tab.color}66` : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'character' && (
          <div className="space-y-6">
            {/* Character Name */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.2)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#e94560' }}>角色名称</h3>
              <input
                type="text"
                value={characterSettings.name}
                onChange={(e) => {
                  setCharacterSettings({ ...characterSettings, name: e.target.value });
                  setCharacter({ ...character, name: e.target.value });
                }}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {/* Personality */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.2)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#e94560' }}>性格设定</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {personalityOptions.map(tag => (
                  <button
                    key={tag}
                    onClick={() => togglePersonality(tag)}
                    className="px-3 py-1.5 rounded-full text-xs transition-all"
                    style={{
                      background: characterSettings.personality.includes(tag)
                        ? 'linear-gradient(135deg, #e94560, #ff6b8a)'
                        : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: '#888' }}>
                当前: {characterSettings.personality.join(' + ') || '未选择'}
              </p>
            </div>

            {/* Photo Path */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.2)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#e94560' }}>人物照片路径</h3>
              <input
                type="text"
                value={characterSettings.photoPath}
                onChange={(e) => {
                  setCharacterSettings({ ...characterSettings, photoPath: e.target.value });
                  setPhotoPath(e.target.value);
                }}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <p className="text-xs mt-2" style={{ color: '#888' }}>设置为包含角色立绘的文件夹路径</p>
            </div>

            {/* Custom Description */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.2)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#e94560' }}>角色背景描述</h3>
              <textarea
                value={characterSettings.customDescription || ''}
                onChange={(e) => setCharacterSettings({ ...characterSettings, customDescription: e.target.value })}
                placeholder="描述你的人物背景、特点、外貌等..."
                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                rows={4}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <p className="text-xs mt-2" style={{ color: '#888' }}>这个描述会影响AI的回复风格</p>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* Screen Watch */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#3b82f6' }}>截屏观察模式</h3>
                  <p className="text-xs mt-1" style={{ color: '#888' }}>自动检测屏幕内容主动说话</p>
                </div>
                <button
                  onClick={() => setStyleSettings({ ...styleSettings, enableScreenWatch: !styleSettings.enableScreenWatch })}
                  className="w-14 h-8 rounded-full transition-all relative"
                  style={{
                    background: styleSettings.enableScreenWatch ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full absolute top-1 transition-all"
                    style={{
                      background: '#fff',
                      left: styleSettings.enableScreenWatch ? '32px' : '4px',
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Screen Interval */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: '#3b82f6' }}>截屏间隔时间</h3>
                <span className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{systemSettings.screenWatchInterval}秒</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={systemSettings.screenWatchInterval}
                onChange={(e) => setSystemSettings({ ...systemSettings, screenWatchInterval: parseInt(e.target.value) })}
                className="w-full"
                style={{ accentColor: '#3b82f6' }}
              />
              <p className="text-xs mt-2" style={{ color: '#888' }}>间隔越短，检测越频繁但占用资源越多</p>
            </div>

            {/* Auto Reply */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#3b82f6' }}>主动回复</h3>
                  <p className="text-xs mt-1" style={{ color: '#888' }}>开启后AI会主动发起对话</p>
                </div>
                <button
                  onClick={() => setStyleSettings({ ...styleSettings, enableAutoReply: !styleSettings.enableAutoReply })}
                  className="w-14 h-8 rounded-full transition-all relative"
                  style={{
                    background: styleSettings.enableAutoReply ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full absolute top-1 transition-all"
                    style={{
                      background: '#fff',
                      left: styleSettings.enableAutoReply ? '32px' : '4px',
                    }}
                  />
                </button>
              </div>
            </div>

            {/* TTS */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#3b82f6' }}>语音朗读 (TTS)</h3>
                  <p className="text-xs mt-1" style={{ color: '#888' }}>AI回复时自动朗读文字</p>
                </div>
                <button
                  onClick={() => setStyleSettings({ ...styleSettings, enableTTS: !styleSettings.enableTTS })}
                  className="w-14 h-8 rounded-full transition-all relative"
                  style={{
                    background: styleSettings.enableTTS ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full absolute top-1 transition-all"
                    style={{
                      background: '#fff',
                      left: styleSettings.enableTTS ? '32px' : '4px',
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Memory Days */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#3b82f6' }}>记忆保存天数</h3>
                  <p className="text-xs mt-1" style={{ color: '#888' }}>超过天数的记忆会被自动清理</p>
                </div>
                <span className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{systemSettings.memoryDays}天</span>
              </div>
              <input
                type="range"
                min="7"
                max="90"
                step="1"
                value={systemSettings.memoryDays}
                onChange={(e) => setSystemSettings({ ...systemSettings, memoryDays: parseInt(e.target.value) })}
                className="w-full"
                style={{ accentColor: '#3b82f6' }}
              />
            </div>

            {/* Auto Reply Speed */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#3b82f6' }}>主动回复速度</h3>
              <div className="flex gap-2">
                {(['slow', 'normal', 'fast'] as const).map(speed => (
                  <button
                    key={speed}
                    onClick={() => setSystemSettings({ ...systemSettings, autoReplySpeed: speed })}
                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: systemSettings.autoReplySpeed === speed
                        ? 'linear-gradient(135deg, #3b82f6, #60a5fa)'
                        : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  >
                    {speed === 'slow' ? '🐢 慢' : speed === 'normal' ? '🚶 正常' : '🚀 快'}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: '#888' }}>
                {systemSettings.autoReplySpeed === 'slow' ? '大约每5分钟回复一次' :
                 systemSettings.autoReplySpeed === 'normal' ? '大约每2分钟回复一次' :
                 '大约每30秒回复一次'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'model' && (
          <div className="space-y-6">
            {/* API Config */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#22c55e' }}>API 配置</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Provider</label>
                  <select
                    value={aiConfig.provider}
                    onChange={(e) => setAIConfig({ ...aiConfig, provider: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="minimax">MiniMax (在线)</option>
                    <option value="openai">OpenAI</option>
                    <option value="ollama">Ollama (本地)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>API Base URL</label>
                  <input
                    type="text"
                    value={aiConfig.baseUrl}
                    onChange={(e) => setAIConfig({ ...aiConfig, baseUrl: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>API Key</label>
                  <input
                    type="password"
                    value={aiConfig.apiKey || ''}
                    onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Model</label>
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={(e) => setAIConfig({ ...aiConfig, model: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>
            </div>

            {/* Advanced */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#22c55e' }}>高级设置</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Max Tokens</label>
                  <input
                    type="number"
                    value={aiConfig.maxTokens}
                    onChange={(e) => setAIConfig({ ...aiConfig, maxTokens: parseInt(e.target.value) || 200 })}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={aiConfig.temperature}
                    onChange={(e) => setAIConfig({ ...aiConfig, temperature: parseFloat(e.target.value) || 0.8 })}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>
            </div>

            {/* Connection Test */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#22c55e' }}>连接测试</h3>
              <button
                onClick={testApiConnection}
                disabled={testStatus === 'testing'}
                className="w-full py-4 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: testStatus === 'success' ? '#22c55e' : testStatus === 'error' ? '#ef4444' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff',
                  opacity: testStatus === 'testing' ? 0.7 : 1,
                }}
              >
                {testStatus === 'testing' ? '测试中...' : testStatus === 'success' ? `✓ 连接成功 ${testLatency}ms` : testStatus === 'error' ? '✗ 连接失败' : '测试 API 连接'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'style' && (
          <div className="space-y-6">
            {/* Display Control */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#f59e0b' }}>显示控制</h3>
              <div className="space-y-4">
                {[
                  { key: 'showEmotionBar', label: '情绪指标条', desc: '顶部情绪可视化条' },
                  { key: 'showCharacter', label: '角色立绘', desc: '显示角色图片展示' },
                  { key: 'showChat', label: '聊天面板', desc: '对话输入和显示区域' },
                  { key: 'showToolbar', label: '底部工具栏', desc: '底部功能按钮栏' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm" style={{ color: '#fff' }}>{item.label}</span>
                      <p className="text-xs" style={{ color: '#888' }}>{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setStyleSettings({ ...styleSettings, [item.key]: !styleSettings[item.key as keyof typeof styleSettings] })}
                      className="w-14 h-8 rounded-full transition-all relative"
                      style={{
                        background: styleSettings[item.key as keyof typeof styleSettings] ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full absolute top-1 transition-all"
                        style={{
                          background: '#fff',
                          left: styleSettings[item.key as keyof typeof styleSettings] ? '32px' : '4px',
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Toggle */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#f59e0b' }}>功能开关</h3>
              <div className="space-y-4">
                {[
                  { key: 'enableTTS', label: '语音朗读', desc: 'AI回复时自动朗读' },
                  { key: 'enableScreenWatch', label: '截屏观察', desc: '监控屏幕主动互动' },
                  { key: 'enableAutoReply', label: '主动回复', desc: '无交互时主动发起对话' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm" style={{ color: '#fff' }}>{item.label}</span>
                      <p className="text-xs" style={{ color: '#888' }}>{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setStyleSettings({ ...styleSettings, [item.key]: !styleSettings[item.key as keyof typeof styleSettings] })}
                      className="w-14 h-8 rounded-full transition-all relative"
                      style={{
                        background: styleSettings[item.key as keyof typeof styleSettings] ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full absolute top-1 transition-all"
                        style={{
                          background: '#fff',
                          left: styleSettings[item.key as keyof typeof styleSettings] ? '32px' : '4px',
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#888' }}>关于</h3>
              <p className="text-sm" style={{ color: '#fff' }}>AI Companion <span style={{ color: '#f59e0b' }}>v0.2.0</span></p>
              <p className="text-xs" style={{ color: '#666' }}>人格化 AI 桌面副官</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
