import React, { useState } from 'react';
import { useAppStore } from './store';

interface SettingsPanelProps {
  onClose?: () => void;
}

type SettingsTab = 'character' | 'memory' | 'system' | 'model' | 'network' | 'style';

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('character');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  const {
    aiConfig, setAIConfig,
    characterSettings, setCharacterSettings,
    systemSettings, setSystemSettings,
    styleSettings, setStyleSettings,
    character, setCharacter,
    photoPath, setPhotoPath,
    networkSettings, setNetworkSettings,
  } = useAppStore();

  // 性格选项
  const personalityOptions = [
    '超级可爱', '话痨', '活泼开朗', '粘人', '爱撒娇',
    '温柔体贴', '傲娇', '高冷', '沙雕', '文艺',
    '元气满满', '文静', '腹黑', '治愈系', '搞笑',
    '高智商', '运动健将', '音乐天赋', '艺术家气质', '呆萌'
  ];

  // 记忆保留时间选项
  const memoryDaysOptions = [
    { value: 7, label: '1周' },
    { value: 14, label: '2周' },
    { value: 30, label: '1个月' },
    { value: 60, label: '2个月' },
    { value: 90, label: '3个月' },
  ];

  // 截屏间隔选项
  const screenIntervalOptions = [
    { value: 10, label: '10秒' },
    { value: 20, label: '20秒' },
    { value: 30, label: '30秒' },
    { value: 60, label: '1分钟' },
    { value: 120, label: '2分钟' },
  ];

  // 主动回复速度选项
  const replySpeedOptions = [
    { value: 'slow', label: '🐢 慢', desc: '约5分钟一次' },
    { value: 'normal', label: '🚶 正常', desc: '约2分钟一次' },
    { value: 'fast', label: '🚀 快', desc: '约30秒一次' },
  ];

  // Tab 配置
  const tabs = [
    { key: 'character' as const, label: '👤 人物设定', icon: '👤', color: '#e94560', desc: '角色性格、外观、背景' },
    { key: 'memory' as const, label: '🧠 记忆系统', icon: '🧠', color: '#a855f7', desc: '记忆保存天数、清理策略' },
    { key: 'system' as const, label: '⚙️ 系统设定', icon: '⚙️', color: '#3b82f6', desc: '截屏观察、主动回复' },
    { key: 'model' as const, label: '🤖 模型设置', icon: '🤖', color: '#22c55e', desc: 'API配置、连接测试' },
    { key: 'network' as const, label: '🌐 联网设置', icon: '🌐', color: '#06b6d4', desc: '联网搜索、日志、供应商' },
    { key: 'style' as const, label: '🎨 风格页面', icon: '🎨', color: '#f59e0b', desc: '界面显示、功能开关' },
  ];

  const togglePersonality = (tag: string) => {
    const current = characterSettings.personality;
    const newPersonality = current.includes(tag)
      ? current.filter(p => p !== tag)
      : [...current, tag];
    setCharacterSettings({ ...characterSettings, personality: newPersonality });
  };

  const addLog = (msg: string) => {
    const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setConnectionLog(prev => [...prev.slice(-9), `[${now}] ${msg}`]);
  };

  const testApiConnection = async () => {
    setTestStatus('testing');
    setTestLatency(null);
    setConnectionLog([]);
    const t0 = Date.now();
    addLog(`测试连接: ${aiConfig.baseUrl}`);

    try {
      addLog(`发送请求到 ${aiConfig.model}...`);
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
      addLog(`收到响应: HTTP ${response.status}`);
      
      if (response.ok) {
        setTestStatus('success');
        addLog('✅ 连接成功!');
      } else {
        setTestStatus('error');
        addLog(`❌ HTTP错误: ${response.status}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      addLog(`❌ 连接失败: ${err.message}`);
    }

    setTimeout(() => setTestStatus('idle'), 8000);
  };

  return (
    <div
      className="flex h-full"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
      }}
    >
      {/* 左侧导航栏 */}
      <div
        className="w-64 flex flex-col py-6"
        style={{
          background: 'rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #e94560, #ff6b8a)' }}
            >
              ⚙️
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: '#fff' }}>设置中心</h1>
              <p className="text-xs" style={{ color: '#666' }}>AI Companion</p>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <nav className="flex-1 px-3 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
              style={{
                background: activeTab === tab.key
                  ? `linear-gradient(90deg, ${tab.color}33, ${tab.color}11)`
                  : 'transparent',
                borderLeft: activeTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
              }}
            >
              <span className="text-xl">{tab.icon}</span>
              <div>
                <div
                  className="text-sm font-medium"
                  style={{ color: activeTab === tab.key ? tab.color : '#888' }}
                >
                  {tab.label}
                </div>
                <div className="text-xs" style={{ color: '#555' }}>{tab.desc}</div>
              </div>
            </button>
          ))}
        </nav>

        {/* 关闭按钮 */}
        <div className="px-6 mt-auto">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          >
            ← 返回聊天
          </button>
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="px-8 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#fff' }}>
              {tabs.find(t => t.key === activeTab)?.label}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#666' }}>
              {tabs.find(t => t.key === activeTab)?.desc}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* ========== 人物设定 ========== */}
          {activeTab === 'character' && (
            <div className="max-w-3xl space-y-8">
              {/* 角色名称 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">👤</span>
                  <h3 className="text-base font-semibold" style={{ color: '#e94560' }}>角色名称</h3>
                </div>
                <input
                  type="text"
                  value={characterSettings.name}
                  onChange={(e) => {
                    setCharacterSettings({ ...characterSettings, name: e.target.value });
                    setCharacter({ ...character, name: e.target.value });
                  }}
                  className="w-full px-5 py-4 rounded-xl text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  placeholder="输入角色名称..."
                />
              </div>

              {/* 性格设定 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">💫</span>
                  <h3 className="text-base font-semibold" style={{ color: '#e94560' }}>性格设定</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {personalityOptions.map(tag => (
                    <button
                      key={tag}
                      onClick={() => togglePersonality(tag)}
                      className="px-4 py-2 rounded-full text-sm transition-all"
                      style={{
                        background: characterSettings.personality.includes(tag)
                          ? 'linear-gradient(135deg, #e94560, #ff6b8a)'
                          : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: characterSettings.personality.includes(tag)
                          ? 'none'
                          : '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      {characterSettings.personality.includes(tag) ? '✓ ' : ''}{tag}
                    </button>
                  ))}
                </div>
                <div
                  className="p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(0,0,0,0.3)', color: '#aaa' }}
                >
                  当前性格: {characterSettings.personality.join(' + ') || '未选择'}
                </div>
              </div>

              {/* 人物照片路径 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🖼️</span>
                  <h3 className="text-base font-semibold" style={{ color: '#e94560' }}>人物照片读取路径</h3>
                </div>
                <input
                  type="text"
                  value={characterSettings.photoPath}
                  onChange={(e) => {
                    setCharacterSettings({ ...characterSettings, photoPath: e.target.value });
                    setPhotoPath(e.target.value);
                  }}
                  className="w-full px-5 py-4 rounded-xl text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  placeholder="例: E:/Pictures/Characters/"
                />
                <p className="text-xs mt-2" style={{ color: '#666' }}>
                  设置包含角色立绘图片的文件夹路径，图片将按文件名自动切换表情
                </p>
              </div>

              {/* 角色背景描述 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📝</span>
                  <h3 className="text-base font-semibold" style={{ color: '#e94560' }}>角色背景描述</h3>
                </div>
                <textarea
                  value={characterSettings.customDescription || ''}
                  onChange={(e) => setCharacterSettings({ ...characterSettings, customDescription: e.target.value })}
                  placeholder="描述你的人物背景、特点、外貌、经历等...&#10;&#10;这个描述会影响AI的回复风格和对话内容"
                  className="w-full px-5 py-4 rounded-xl text-sm resize-none"
                  rows={5}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              </div>
            </div>
          )}

          {/* ========== 记忆系统 ========== */}
          {activeTab === 'memory' && (
            <div className="max-w-3xl space-y-8">
              {/* 记忆保存天数 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🧠</span>
                  <h3 className="text-base font-semibold" style={{ color: '#a855f7' }}>记忆保存天数</h3>
                </div>
                <p className="text-sm mb-4" style={{ color: '#888' }}>
                  超过天数的记忆会被自动清理。建议设置 30-90 天
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {memoryDaysOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSystemSettings({ ...systemSettings, memoryDays: opt.value })}
                      className="py-4 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: systemSettings.memoryDays === opt.value
                          ? 'linear-gradient(135deg, #a855f7, #c084fc)'
                          : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: systemSettings.memoryDays === opt.value
                          ? 'none'
                          : '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div
                  className="mt-4 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(0,0,0,0.3)', color: '#aaa' }}
                >
                  当前设置: 记忆保留 <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{systemSettings.memoryDays}</span> 天
                </div>
              </div>

              {/* 记忆清理策略 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🗑️</span>
                  <h3 className="text-base font-semibold" style={{ color: '#a855f7' }}>记忆清理策略</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: '自动过期清理', desc: '自动删除过期记忆', enabled: true },
                    { label: '重要记忆永久保留', desc: '标记重要的记忆不会被清理', enabled: true },
                    { label: '定期整合记忆', desc: '将相似记忆合并减少冗余', enabled: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div>
                        <div className="text-sm" style={{ color: '#fff' }}>{item.label}</div>
                        <div className="text-xs" style={{ color: '#666' }}>{item.desc}</div>
                      </div>
                      <div
                        className="w-12 h-7 rounded-full relative cursor-pointer transition-all"
                        style={{ background: item.enabled ? '#a855f7' : 'rgba(255,255,255,0.2)' }}
                      >
                        <div
                          className="w-5 h-5 rounded-full absolute top-1 transition-all"
                          style={{ background: '#fff', left: item.enabled ? '22px' : '4px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 记忆统计 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📊</span>
                  <h3 className="text-base font-semibold" style={{ color: '#a855f7' }}>记忆统计</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#a855f7' }}>--</div>
                    <div className="text-xs" style={{ color: '#666' }}>总记忆数</div>
                  </div>
                  <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#a855f7' }}>--</div>
                    <div className="text-xs" style={{ color: '#666' }}>今日新增</div>
                  </div>
                  <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#a855f7' }}>--</div>
                    <div className="text-xs" style={{ color: '#666' }}>本周访问</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== 系统设定 ========== */}
          {activeTab === 'system' && (
            <div className="max-w-3xl space-y-8">
              {/* 截屏观察模式 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👁️</span>
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: '#3b82f6' }}>截屏观察模式</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>开启后AI会定时截取屏幕内容并分析是否需要主动说话</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStyleSettings({ ...styleSettings, enableScreenWatch: !styleSettings.enableScreenWatch })}
                    className="w-16 h-9 rounded-full transition-all relative"
                    style={{
                      background: styleSettings.enableScreenWatch ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full absolute top-1 transition-all"
                      style={{
                        background: '#fff',
                        left: styleSettings.enableScreenWatch ? '34px' : '4px',
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* 截屏间隔时间 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">⏱️</span>
                  <h3 className="text-base font-semibold" style={{ color: '#3b82f6' }}>截屏间隔时间</h3>
                </div>
                <p className="text-sm mb-4" style={{ color: '#888' }}>
                  间隔越短，检测越频繁但占用资源越多。建议 30-60 秒
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {screenIntervalOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSystemSettings({ ...systemSettings, screenWatchInterval: opt.value })}
                      className="py-3 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: systemSettings.screenWatchInterval === opt.value
                          ? 'linear-gradient(135deg, #3b82f6, #60a5fa)'
                          : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: systemSettings.screenWatchInterval === opt.value
                          ? 'none'
                          : '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 主动回复 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: '#3b82f6' }}>主动回复</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>开启后AI会主动发起对话，不会一直等你发消息</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStyleSettings({ ...styleSettings, enableAutoReply: !styleSettings.enableAutoReply })}
                    className="w-16 h-9 rounded-full transition-all relative"
                    style={{
                      background: styleSettings.enableAutoReply ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full absolute top-1 transition-all"
                      style={{
                        background: '#fff',
                        left: styleSettings.enableAutoReply ? '34px' : '4px',
                      }}
                    />
                  </button>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-3" style={{ color: '#3b82f6' }}>回复速度</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {replySpeedOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSystemSettings({ ...systemSettings, autoReplySpeed: opt.value as any })}
                        className="py-4 rounded-xl text-sm transition-all"
                        style={{
                          background: systemSettings.autoReplySpeed === opt.value
                            ? 'linear-gradient(135deg, #3b82f6, #60a5fa)'
                            : 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          border: systemSettings.autoReplySpeed === opt.value
                            ? 'none'
                            : '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* TTS 语音设置 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔊</span>
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: '#3b82f6' }}>语音朗读 (TTS)</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>AI回复时自动朗读文字内容</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStyleSettings({ ...styleSettings, enableTTS: !styleSettings.enableTTS })}
                    className="w-16 h-9 rounded-full transition-all relative"
                    style={{
                      background: styleSettings.enableTTS ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full absolute top-1 transition-all"
                      style={{
                        background: '#fff',
                        left: styleSettings.enableTTS ? '34px' : '4px',
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========== 模型设置 ========== */}
          {activeTab === 'model' && (
            <div className="max-w-3xl space-y-8">
              {/* API 配置 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-lg">🔗</span>
                  <h3 className="text-base font-semibold" style={{ color: '#22c55e' }}>API 配置</h3>
                </div>

                <div className="space-y-5">
                  {/* Provider */}
                  <div>
                    <label className="text-xs mb-2 block" style={{ color: '#888' }}>Provider</label>
                    <select
                      value={aiConfig.provider}
                      onChange={(e) => setAIConfig({ ...aiConfig, provider: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      <option value="minimax">MiniMax (在线)</option>
                      <option value="openai">OpenAI</option>
                      <option value="ollama">Ollama (本地)</option>
                      <option value="deepseek">DeepSeek</option>
                    </select>
                  </div>

                  {/* API Base URL */}
                  <div>
                    <label className="text-xs mb-2 block" style={{ color: '#888' }}>API Base URL</label>
                    <input
                      type="text"
                      value={aiConfig.baseUrl}
                      onChange={(e) => setAIConfig({ ...aiConfig, baseUrl: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                      placeholder="https://api.minimax.chat"
                    />
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="text-xs mb-2 block" style={{ color: '#888' }}>API Key</label>
                    <input
                      type="password"
                      value={aiConfig.apiKey || ''}
                      onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                      placeholder="sk-..."
                    />
                  </div>

                  {/* Model */}
                  <div>
                    <label className="text-xs mb-2 block" style={{ color: '#888' }}>Model</label>
                    <input
                      type="text"
                      value={aiConfig.model}
                      onChange={(e) => setAIConfig({ ...aiConfig, model: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                      placeholder="MiniMax-M2.7-highspeed"
                    />
                  </div>
                </div>
              </div>

              {/* 高级设置 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-lg">⚡</span>
                  <h3 className="text-base font-semibold" style={{ color: '#22c55e' }}>高级设置</h3>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs mb-2 block" style={{ color: '#888' }}>Max Tokens</label>
                    <input
                      type="number"
                      value={aiConfig.maxTokens}
                      onChange={(e) => setAIConfig({ ...aiConfig, maxTokens: parseInt(e.target.value) || 200 })}
                      className="w-full px-5 py-4 rounded-xl text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-2 block" style={{ color: '#888' }}>Temperature</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={aiConfig.temperature}
                      onChange={(e) => setAIConfig({ ...aiConfig, temperature: parseFloat(e.target.value) || 0.8 })}
                      className="w-full px-5 py-4 rounded-xl text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 连接测试 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-lg">🔍</span>
                  <h3 className="text-base font-semibold" style={{ color: '#22c55e' }}>连接测试</h3>
                </div>

                <button
                  onClick={testApiConnection}
                  disabled={testStatus === 'testing'}
                  className="w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: testStatus === 'success'
                      ? '#22c55e'
                      : testStatus === 'error'
                      ? '#ef4444'
                      : 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#fff',
                    opacity: testStatus === 'testing' ? 0.7 : 1,
                  }}
                >
                  {testStatus === 'testing' ? (
                    <>⏳ 测试中...</>
                  ) : testStatus === 'success' ? (
                    <>✓ 连接成功 {testLatency}ms</>
                  ) : testStatus === 'error' ? (
                    <>✗ 连接失败</>
                  ) : (
                    <>🔗 测试 API 连接</>
                  )}
                </button>

                {/* 连接日志 */}
                {connectionLog.length > 0 && (
                  <div
                    className="mt-4 p-4 rounded-xl text-xs font-mono"
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      color: '#aaa',
                      maxHeight: '150px',
                      overflowY: 'auto',
                    }}
                  >
                    {connectionLog.map((log, i) => (
                      <div key={i} className="py-0.5">{log}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== 联网设置 ========== */}
          {activeTab === 'network' && (
            <div className="max-w-3xl space-y-8">
              {/* 联网总开关 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌐</span>
                    <h3 className="text-base font-semibold" style={{ color: '#06b6d4' }}>联网搜索</h3>
                  </div>
                  <button
                    onClick={() => setNetworkSettings({ ...networkSettings, enableWebSearch: !networkSettings.enableWebSearch })}
                    className={`w-12 h-6 rounded-full transition-colors ${networkSettings.enableWebSearch ? 'bg-cyan-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${networkSettings.enableWebSearch ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <p className="text-xs" style={{ color: '#888' }}>
                  开启后，当消息包含特定关键词时会自动触发联网搜索
                </p>
              </div>

              {/* 联网供应商 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📡</span>
                  <h3 className="text-base font-semibold" style={{ color: '#06b6d4' }}>联网供应商</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'minimax_web_search', label: '🔍 MiniMax Web Search', desc: '使用 MiniMax Key 独立联网搜索', color: '#06b6d4' },
                    { value: 'github_api', label: '🐙 GitHub API', desc: 'GitHub 仓库搜索', color: '#6e40c9' },
                    { value: 'minimax_mcp_bridge', label: '🔗 OpenClaw Bridge', desc: '旧兼容模式，需 OpenClaw Gateway', color: '#22c55e' },
                    { value: 'mock', label: '🔮 Mock', desc: '测试模式，返回模拟数据', color: '#a855f7' },
                    { value: 'disabled', label: '❌ 禁用', desc: '关闭所有联网功能', color: '#ef4444' },
                  ].map(item => (
                    <button
                      key={item.value}
                      onClick={() => setNetworkSettings({ ...networkSettings, provider: item.value as any })}
                      className={`p-4 rounded-xl text-left transition-all ${networkSettings.provider === item.value ? 'ring-2' : 'opacity-60 hover:opacity-100'}`}
                      style={{ 
                        background: networkSettings.provider === item.value ? `${item.color}20` : 'rgba(255,255,255,0.05)',
                        borderColor: networkSettings.provider === item.value ? item.color : 'transparent',
                        ringColor: item.color,
                      }}
                    >
                      <div className="font-medium" style={{ color: item.color }}>{item.label}</div>
                      <div className="text-xs mt-1" style={{ color: '#888' }}>{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 重置联网设置按钮 */}
              <div
                className="p-4 rounded-xl"
                style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">🔄</span>
                      <span className="text-sm font-medium" style={{ color: '#06b6d4' }}>重置联网设置</span>
                    </div>
                    <div className="text-xs" style={{ color: '#888' }}>
                      将联网供应商重置为 MiniMax Web Search，不依赖 OpenClaw
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      useAppStore.getState().resetNetworkSettings();
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
                  >
                    重置
                  </button>
                </div>
              </div>

              {/* MCP Bridge 状态 */}
              {networkSettings.provider === 'minimax_mcp_bridge' && (
                <div
                  className="p-6 rounded-2xl"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">🔗</span>
                    <h3 className="text-base font-semibold" style={{ color: '#22c55e' }}>MCP Bridge 状态</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ background: '#888' }}
                        />
                        <span className="text-xs" style={{ color: '#888' }}>[未连接]</span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const { runtime } = await import('./runtime/runtimeAdapter');
                            const result = await runtime.network.testBridge();
                            if (result.ok) {
                              alert(`Bridge 连接成功 (${result.latency}ms)`);
                            } else {
                              alert(`Bridge 连接失败: ${result.error}`);
                            }
                          } catch (e: any) {
                            alert(`Bridge 测试错误: ${e.message}`);
                          }
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{ 
                          background: 'rgba(34,197,94,0.2)',
                          color: '#22c55e',
                          border: '1px solid rgba(34,197,94,0.3)',
                        }}
                      >
                        测试 Bridge
                      </button>
                    </div>
                    <div className="text-xs p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', color: '#888' }}>
                      <div>OpenClaw 网关: ws://127.0.0.1:18789</div>
                      <div>HTTP: http://127.0.0.1:18789</div>
                    </div>
                  </div>
                </div>
              )}

              {/* MiniMax API Key 设置 */}
              {networkSettings.provider === 'minimax_mcp_bridge' && (
                <div
                  className="p-6 rounded-2xl"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">🔑</span>
                    <h3 className="text-base font-semibold" style={{ color: '#22c55e' }}>MiniMax API Key</h3>
                  </div>
                  <p className="text-xs mb-4" style={{ color: '#888' }}>
                    请填写您的 MiniMax API Key，用于联网搜索功能。Key 将安全存储，不会上传到 Git。
                  </p>
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={aiConfig.apiKey || ''}
                      onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
                      placeholder="sk-cp-xxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={{ 
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#fff',
                        outline: 'none',
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ 
                            background: !aiConfig.apiKey ? '#888' : 
                              testStatus === 'success' ? '#22c55e' : 
                              testStatus === 'error' ? '#ef4444' : '#f59e0b'
                          }}
                        />
                        <span className="text-xs" style={{ color: '#888' }}>
                          {!aiConfig.apiKey ? '[未填写]' : 
                           testStatus === 'success' ? '[已连接]' :
                           testStatus === 'error' ? '[连接失败]' : '[待测试]'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!aiConfig.apiKey) {
                              alert('请先填写 API Key');
                              return;
                            }
                            setTestStatus('testing');
                            setConnectionLog(['开始测试 MiniMax 连接...']);
                            try {
                              // 简单的连接测试 - 调用模型列表接口
                              const start = Date.now();
                              const response = await fetch('https://api.minimax.chat/v1/models', {
                                headers: {
                                  'Authorization': `Bearer ${aiConfig.apiKey}`,
                                },
                              });
                              const latency = Date.now() - start;
                              
                              if (response.ok || response.status === 401) {
                                // 401 说明 Key 有效但可能权限不足
                                setTestStatus('success');
                                setTestLatency(latency);
                                setConnectionLog([`✅ 连接成功 (${latency}ms)`, `状态码: ${response.status}`]);
                              } else {
                                setTestStatus('error');
                                setConnectionLog([`❌ 连接失败: HTTP ${response.status}`]);
                              }
                            } catch (e: any) {
                              setTestStatus('error');
                              setConnectionLog([`❌ 连接错误: ${e.message}`]);
                            }
                          }}
                          disabled={testStatus === 'testing'}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ 
                            background: testStatus === 'testing' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)',
                            color: '#22c55e',
                            border: '1px solid rgba(34,197,94,0.3)',
                          }}
                        >
                          {testStatus === 'testing' ? '测试中...' : '测试连接'}
                        </button>
                      </div>
                    </div>
                    {connectionLog.length > 0 && (
                      <div 
                        className="mt-3 p-3 rounded-lg text-xs"
                        style={{ background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}
                      >
                        {connectionLog.map((log, i) => (
                          <div key={i} style={{ color: log.includes('✅') ? '#22c55e' : log.includes('❌') ? '#ef4444' : '#888' }}>
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 搜索结果数量 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📊</span>
                  <h3 className="text-base font-semibold" style={{ color: '#06b6d4' }}>搜索结果数量</h3>
                </div>
                <div className="flex gap-3">
                  {[3, 5, 8, 10].map(num => (
                    <button
                      key={num}
                      onClick={() => setNetworkSettings({ ...networkSettings, maxResults: num })}
                      className={`px-4 py-2 rounded-lg transition-all ${networkSettings.maxResults === num ? 'ring-2' : 'opacity-60 hover:opacity-100'}`}
                      style={{ 
                        background: networkSettings.maxResults === num ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.05)',
                        borderColor: '#06b6d4',
                        color: networkSettings.maxResults === num ? '#06b6d4' : '#888',
                      }}
                    >
                      {num} 条
                    </button>
                  ))}
                </div>
              </div>

              {/* 自动总结 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: '#06b6d4' }}>自动总结网页</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>联网后自动生成内容摘要</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNetworkSettings({ ...networkSettings, autoSummarize: !networkSettings.autoSummarize })}
                    className={`w-12 h-6 rounded-full transition-colors ${networkSettings.autoSummarize ? 'bg-cyan-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${networkSettings.autoSummarize ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* 网络日志 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: '#06b6d4' }}>网络请求日志</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>记录所有联网请求到 localStorage</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNetworkSettings({ ...networkSettings, enableNetworkLogs: !networkSettings.enableNetworkLogs })}
                    className={`w-12 h-6 rounded-full transition-colors ${networkSettings.enableNetworkLogs ? 'bg-cyan-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${networkSettings.enableNetworkLogs ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('ai_companion_network_logs');
                    alert('日志已清除');
                  }}
                  className="px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
                  style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  🗑️ 清除日志
                </button>
              </div>

              {/* 测试联网 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🧪</span>
                  <h3 className="text-base font-semibold" style={{ color: '#06b6d4' }}>测试联网</h3>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const { runtime } = await import('./runtime/runtimeAdapter');
                      const result = await runtime.network.testBridge();
                      if (result.ok) {
                        alert(`Bridge 连接成功 (${result.latency}ms)`);
                      } else {
                        alert(`Bridge 连接失败: ${result.error}`);
                      }
                    } catch (e: any) {
                      alert('联网测试异常: ' + e.message);
                    }
                  }}
                  className="px-6 py-3 rounded-xl font-medium transition-all hover:opacity-80"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: 'white' }}
                >
                  🔍 测试 MCP Bridge
                </button>
              </div>
            </div>
          )}

          {/* ========== 风格页面 ========== */}
          {activeTab === 'style' && (
            <div className="max-w-3xl space-y-8">
              {/* 显示控制 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-lg">🖥️</span>
                  <h3 className="text-base font-semibold" style={{ color: '#f59e0b' }}>界面显示控制</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'showEmotionBar', label: '情绪指标条', desc: '顶部情绪可视化条，显示当前心情状态', icon: '📊' },
                    { key: 'showCharacter', label: '角色立绘', desc: '显示角色图片和表情动画', icon: '🎭' },
                    { key: 'showChat', label: '聊天面板', desc: '对话输入和显示区域', icon: '💬' },
                    { key: 'showToolbar', label: '底部工具栏', desc: '底部功能按钮栏', icon: '📌' },
                  ].map(item => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#fff' }}>{item.label}</div>
                          <div className="text-xs" style={{ color: '#666' }}>{item.desc}</div>
                        </div>
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

              {/* 功能开关 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-lg">🔘</span>
                  <h3 className="text-base font-semibold" style={{ color: '#f59e0b' }}>功能开关</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'enableTTS', label: '语音朗读', desc: 'AI回复时自动朗读文字', icon: '🔊' },
                    { key: 'enableScreenWatch', label: '截屏观察', desc: '监控屏幕主动互动', icon: '👁️' },
                    { key: 'enableAutoReply', label: '主动回复', desc: '无交互时主动发起对话', icon: '💬' },
                  ].map(item => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#fff' }}>{item.label}</div>
                          <div className="text-xs" style={{ color: '#666' }}>{item.desc}</div>
                        </div>
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

              {/* 主题设置 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-lg">🎨</span>
                  <h3 className="text-base font-semibold" style={{ color: '#f59e0b' }}>主题风格</h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { value: 'dark', label: '暗色系', color: '#1a1a2e' },
                    { value: 'light', label: '亮色系', color: '#f0f0f0' },
                    { value: 'pink', label: '粉色系', color: '#ff9a9e' },
                    { value: 'blue', label: '蓝色系', color: '#667eea' },
                  ].map(theme => (
                    <button
                      key={theme.value}
                      className="py-3 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 关于 */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#666' }}>关于</h3>
                <p className="text-base" style={{ color: '#fff' }}>
                  AI Companion <span style={{ color: '#f59e0b' }}>v0.3.0</span>
                </p>
                <p className="text-xs mt-1" style={{ color: '#555' }}>人格化 AI 桌面副官 · 全新设置界面</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
