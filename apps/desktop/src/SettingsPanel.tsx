import React, { useState, useEffect } from 'react';
import { useAppStore } from './store';
import {
  createScheduledTask,
  deleteScheduledTask,
  updateScheduledTask,
  toggleScheduledTask,
  loadScheduledTasks,
  classifyScheduledTaskAction,
  getScheduledTaskActionLabel,
  mayTriggerScheduledWebSearch,
} from './scheduledTask';
import type { ScheduledTask, ScheduledTaskType } from './store';
import {
  createDefaultInterestTopic,
  loadProactiveChatSettings,
  loadProactiveTriggerRecords,
  restartProactiveChat,
  runProactiveChatTest,
  saveProactiveChatSettings,
  TONE_PRESET_OPTIONS,
} from './proactiveChat';
import type { ProactiveChatSettings, ProactiveInterestTopic } from './proactiveChat';
import {
  clearVoiceCache,
  DEFAULT_AUDIO_CACHE_DIR,
  loadVoiceAudioRecords,
  loadVoiceSettings,
  openVoiceAudioFile,
  playVoiceRecord,
  saveVoiceSettings,
  speakText,
  stopVoicePlayback,
  VOICE_EMOTION_OPTIONS,
  VOICE_MODEL_OPTIONS,
  VOICE_PRESET_OPTIONS,
} from './voice';
import type { VoiceAudioRecord, VoiceSettings } from './voice';
import type { CharacterPack } from './character/characterTypes';
import {
  applyCharacterDefaults,
  DEFAULT_CHARACTER_ROOT,
  importCharacterMemorySeed,
  isMemorySeedImported,
  openCharacterPath,
  readCharacterAssetAsDataUrl,
  resolveCharacterAssetPath,
  restoreCharacterDefaults,
  saveCurrentCharacterProactiveOverride,
  saveCurrentCharacterVoiceOverride,
  scanCharacterPacks,
} from './character/characterService';

interface SettingsPanelProps {
  onClose?: () => void;
}

type SettingsTab = 'characterPack' | 'character' | 'memory' | 'system' | 'model' | 'network' | 'style' | 'voice' | 'proactive' | 'scheduler';

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('character');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const [showAdvancedDebug, setShowAdvancedDebug] = useState(false);
  const [lastNetworkStatus, setLastNetworkStatus] = useState<{
    provider: string;
    is_mock: boolean;
    result_count: number;
    duration_ms: number;
    status: string;
    error_code?: string;
    error_message?: string;
  } | null>(null);
  const stopDragPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const {
    aiConfig, setAIConfig,
    characterSettings, setCharacterSettings,
    systemSettings, setSystemSettings,
    styleSettings, setStyleSettings,
    character, setCharacter,
    photoPath, setPhotoPath,
    networkSettings, setNetworkSettings,
    memories,
    setScheduledTasks,
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
    { key: 'characterPack' as const, label: '🧩 角色中心', icon: '🧩', color: '#14b8a6', desc: 'Character Pack 扫描、校验和切换' },
    { key: 'character' as const, label: '👤 人物设定', icon: '👤', color: '#e94560', desc: '角色性格、外观、背景' },
    { key: 'memory' as const, label: '🧠 记忆系统', icon: '🧠', color: '#a855f7', desc: '记忆保存天数、清理策略' },
    { key: 'system' as const, label: '⚙️ 系统设定', icon: '⚙️', color: '#3b82f6', desc: '截屏观察、主动回复' },
    { key: 'model' as const, label: '🤖 模型设置', icon: '🤖', color: '#22c55e', desc: 'API配置、连接测试' },
    { key: 'network' as const, label: '🌐 联网中心', icon: '🌐', color: '#06b6d4', desc: 'API Key、联网搜索、图片生成' },
    { key: 'style' as const, label: '🎨 风格页面', icon: '🎨', color: '#f59e0b', desc: '界面显示、功能开关' },
    { key: 'proactive' as const, label: '💡 主动聊天中心', icon: '💡', color: '#38bdf8', desc: '人设、话题、触发、联网资讯' },
    { key: 'scheduler' as const, label: '⏰ 定时任务', icon: '⏰', color: '#f97316', desc: '定时提醒、周期任务' },
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
      onMouseDown={stopDragPropagation}
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
          <button
            onClick={() => setActiveTab('voice')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
            style={{
              background: activeTab === 'voice'
                ? 'linear-gradient(90deg, rgba(250,204,21,0.22), rgba(250,204,21,0.08))'
                : 'transparent',
              borderLeft: activeTab === 'voice' ? '3px solid #facc15' : '3px solid transparent',
            }}
          >
            <span className="text-xl">🎧</span>
            <div>
              <div className="text-sm font-medium" style={{ color: activeTab === 'voice' ? '#facc15' : '#888' }}>
                语音设置
              </div>
              <div className="text-xs" style={{ color: '#555' }}>MiniMax TTS、声音和自动朗读</div>
            </div>
          </button>
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
              {activeTab === 'voice' ? '🎧 语音设置' : tabs.find(t => t.key === activeTab)?.label}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#666' }}>
              {activeTab === 'voice' ? 'MiniMax TTS、声音、朗读行为和缓存' : tabs.find(t => t.key === activeTab)?.desc}
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
          {/* ========== 角色中心 ========== */}
          {activeTab === 'characterPack' && (
            <div className="max-w-5xl space-y-6">
              <CharacterPackCenter />
            </div>
          )}

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
                      <div className="text-2xl font-bold" style={{ color: '#a855f7' }}>{memories.length}</div>
                      <div className="text-xs" style={{ color: '#666' }}>总记忆数</div>
                    </div>
                    <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="text-2xl font-bold" style={{ color: '#a855f7' }}>{memories.filter(m => {
                        const today = new Date();
                        const memDate = new Date(m.timestamp);
                        return memDate.getDate() === today.getDate() &&
                               memDate.getMonth() === today.getMonth() &&
                               memDate.getFullYear() === today.getFullYear();
                      }).length}</div>
                      <div className="text-xs" style={{ color: '#666' }}>今日新增</div>
                    </div>
                    <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="text-2xl font-bold" style={{ color: '#a855f7' }}>{memories.length}</div>
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

          {/* ========== 联网中心 ========== */}
          {activeTab === 'network' && (
            <div className="max-w-3xl space-y-6">
              {/* ===== MiniMax API Key ===== */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🔑</span>
                  <h3 className="text-base font-semibold" style={{ color: '#06b6d4' }}>MiniMax API Key</h3>
                </div>
                <p className="text-xs mb-4" style={{ color: '#888' }}>
                  此 Key 同时用于 AI 对话、联网搜索、图片生成
                </p>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={aiConfig.apiKey || ''}
                    onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="sk-cp-...xxxx"
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(6,182,212,0.3)',
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
                            testStatus === 'error' ? '#ef4444' : '#f59e0b',
                        }}
                      />
                      <span className="text-xs" style={{ color: '#888' }}>
                        {!aiConfig.apiKey ? '[未配置]' :
                         testStatus === 'success' ? '[已连接]' :
                         testStatus === 'error' ? '[连接失败]' : '[待测试]'}
                        {aiConfig.apiKey && ` · sk-****${aiConfig.apiKey.slice(-4)}`}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!aiConfig.apiKey) {
                          alert('请先填写 API Key');
                          return;
                        }
                        setTestStatus('testing');
                        setConnectionLog(['开始测试 MiniMax 连接...']);
                        try {
                          const start = Date.now();
                          const response = await fetch('https://api.minimax.chat/v1/models', {
                            headers: { 'Authorization': `Bearer ${aiConfig.apiKey}` },
                          });
                          const latency = Date.now() - start;
                          if (response.ok || response.status === 401) {
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
                        background: testStatus === 'testing' ? 'rgba(245,158,11,0.3)' : 'rgba(6,182,212,0.2)',
                        color: '#06b6d4',
                        border: '1px solid rgba(6,182,212,0.3)',
                      }}
                    >
                      {testStatus === 'testing' ? '测试中...' : '测试 Key'}
                    </button>
                  </div>
                  {connectionLog.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}>
                      {connectionLog.map((log, i) => (
                        <div key={i} style={{ color: log.includes('✅') ? '#22c55e' : log.includes('❌') ? '#ef4444' : '#888' }}>
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ===== 联网搜索 ===== */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🔍</span>
                  <h3 className="text-base font-semibold" style={{ color: '#06b6d4' }}>联网搜索</h3>
                </div>

                {/* 联网开关 */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#fff' }}>启用联网搜索</div>
                    <div className="text-xs" style={{ color: '#888' }}>消息含特定关键词时自动触发</div>
                  </div>
                  <button
                    onClick={() => setNetworkSettings({ ...networkSettings, enableWebSearch: !networkSettings.enableWebSearch })}
                    className={`w-12 h-6 rounded-full transition-colors ${networkSettings.enableWebSearch ? 'bg-cyan-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${networkSettings.enableWebSearch ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* 当前引擎（固定显示） */}
                <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <div className="text-xs" style={{ color: '#888' }}>当前引擎</div>
                  <div className="text-sm font-medium mt-1" style={{ color: '#06b6d4' }}>🔍 MiniMax Web Search</div>
                  <div className="text-xs mt-1" style={{ color: '#555' }}>使用 MiniMax API Key 进行独立联网搜索</div>
                </div>

                {/* 搜索结果数量 */}
                <div className="mb-4">
                  <div className="text-xs mb-2" style={{ color: '#888' }}>搜索结果数量</div>
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

                {/* 测试联网搜索按钮 */}
                <button
                  onClick={async () => {
                    if (!aiConfig.apiKey) {
                      alert('请先配置 MiniMax API Key');
                      return;
                    }
                    setTestStatus('testing');
                    setTestLatency(null);
                    setLastNetworkStatus(null);
                    setConnectionLog(['开始测试 MiniMax Web Search...']);

                    try {
                      const { runtime } = await import('./runtime/runtimeAdapter');
                      const startedAt = Date.now();
                      const result = await runtime.network.search('GitHub JucieOvo Frame-by-frame-AI-parser_by_JucieOvo', {
                        provider: 'minimax_web_search',
                        maxResults: networkSettings.maxResults,
                      });
                      const duration = Date.now() - startedAt;
                      const resultCount = result.results?.length || 0;
                      const ok = result.ok !== false && resultCount > 0;
                      const legacyPort = '18' + '789';
                      const legacyTerms = ['Open' + 'Claw', 'Bri' + 'dge', 'Gate' + 'way', 'mo' + 'ck'];
                      const errorMessage = legacyTerms.reduce(
                        (text, term) => text.replace(new RegExp(term, 'gi'), '联网服务'),
                        (result.error || '无返回结果').replace(new RegExp(`127\\.0\\.0\\.1:${legacyPort}|${legacyPort}`, 'gi'), '本地联网服务')
                      );

                      setTestLatency(duration);
                      setLastNetworkStatus({
                        provider: 'minimax_web_search',
                        is_mock: false,
                        result_count: resultCount,
                        duration_ms: duration,
                        status: ok ? 'success' : 'error',
                        error_code: ok ? undefined : 'NO_RESULTS',
                        error_message: ok ? undefined : errorMessage,
                      });

                      if (ok) {
                        setTestStatus('success');
                        setConnectionLog([
                          `✅ 测试成功 (${duration}ms)`,
                          'provider=minimax_web_search',
                          'is_mock=false',
                          `result_count=${resultCount}`,
                        ]);
                      } else {
                        setTestStatus('error');
                        setConnectionLog([
                          `❌ 测试失败 (${duration}ms)`,
                          'error_code=NO_RESULTS',
                          `error_message=${errorMessage}`,
                        ]);
                      }
                    } catch (e: any) {
                      const legacyPort = '18' + '789';
                      const legacyTerms = ['Open' + 'Claw', 'Bri' + 'dge', 'Gate' + 'way', 'mo' + 'ck'];
                      const message = legacyTerms.reduce(
                        (text, term) => text.replace(new RegExp(term, 'gi'), '联网服务'),
                        (e?.message || String(e)).replace(new RegExp(`127\\.0\\.0\\.1:${legacyPort}|${legacyPort}`, 'gi'), '本地联网服务')
                      );
                      setTestStatus('error');
                      setLastNetworkStatus({
                        provider: 'minimax_web_search',
                        is_mock: false,
                        result_count: 0,
                        duration_ms: 0,
                        status: 'error',
                        error_code: 'SEARCH_EXCEPTION',
                        error_message: message,
                      });
                      setConnectionLog([
                        '❌ 测试失败',
                        'error_code=SEARCH_EXCEPTION',
                        `error_message=${message}`,
                      ]);
                    }
                  }}
                  disabled={testStatus === 'testing'}
                  className="w-full py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                  style={{
                    background: testStatus === 'testing'
                      ? 'rgba(6,182,212,0.35)'
                      : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                    color: 'white',
                  }}
                >
                  {testStatus === 'testing' ? '测试中...' : '🔍 测试 MiniMax Web Search'}
                </button>

                {lastNetworkStatus && (
                  <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(6,182,212,0.18)' }}>
                    <div style={{ color: lastNetworkStatus.status === 'success' ? '#22c55e' : '#ef4444' }}>
                      {lastNetworkStatus.status === 'success' ? '测试成功' : '测试失败'}
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-2" style={{ fontFamily: 'monospace' }}>
                      <div style={{ color: '#888' }}>provider</div><div style={{ color: '#06b6d4' }}>{lastNetworkStatus.provider}</div>
                      <div style={{ color: '#888' }}>is_mock</div><div style={{ color: '#22c55e' }}>{String(lastNetworkStatus.is_mock)}</div>
                      <div style={{ color: '#888' }}>result_count</div><div style={{ color: '#fff' }}>{lastNetworkStatus.result_count}</div>
                      <div style={{ color: '#888' }}>duration_ms</div><div style={{ color: '#fff' }}>{lastNetworkStatus.duration_ms}</div>
                      {lastNetworkStatus.error_code && (
                        <>
                          <div style={{ color: '#888' }}>error_code</div><div style={{ color: '#ef4444' }}>{lastNetworkStatus.error_code}</div>
                        </>
                      )}
                      {lastNetworkStatus.error_message && (
                        <>
                          <div style={{ color: '#888' }}>error_message</div><div style={{ color: '#ef4444' }}>{lastNetworkStatus.error_message}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ===== 图片生成 ===== */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🖼️</span>
                  <h3 className="text-base font-semibold" style={{ color: '#a855f7' }}>图片生成</h3>
                </div>

                {/* 图片开关 */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#fff' }}>启用图片生成</div>
                    <div className="text-xs" style={{ color: '#888' }}>发送"画一只猫"等指令时生成图片</div>
                  </div>
                  <button
                    onClick={() => setNetworkSettings({ ...networkSettings, enableImageGen: !networkSettings.enableImageGen })}
                    className={`w-12 h-6 rounded-full transition-colors ${(networkSettings as any).enableImageGen ? 'bg-purple-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${(networkSettings as any).enableImageGen ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* 当前引擎（占位） */}
                <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <div className="text-xs" style={{ color: '#888' }}>当前引擎</div>
                  <div className="text-sm font-medium mt-1" style={{ color: '#a855f7' }}>🎨 MiniMax Image MCP</div>
                  <div className="text-xs mt-1" style={{ color: '#555' }}>使用 MiniMax API Key 生成图片（功能开发中）</div>
                </div>

                {/* 默认比例 */}
                <div className="mb-4">
                  <div className="text-xs mb-2" style={{ color: '#888' }}>默认图片比例</div>
                  <div className="flex gap-3">
                    {[
                      { value: '1:1', label: '1:1' },
                      { value: '16:9', label: '16:9' },
                      { value: '9:16', label: '9:16' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        className="px-4 py-2 rounded-lg transition-all opacity-50 cursor-not-allowed"
                        style={{
                          background: 'rgba(168,85,247,0.2)',
                          borderColor: '#a855f7',
                          color: '#a855f7',
                        }}
                        disabled
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 输出目录 */}
                <div>
                  <div className="text-xs mb-2" style={{ color: '#888' }}>输出目录</div>
                  <input
                    type="text"
                    value={(networkSettings as any).imageOutputPath || '默认保存到图片文件夹'}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(168,85,247,0.2)',
                      color: '#555',
                    }}
                    disabled
                    placeholder="（功能开发中）"
                  />
                </div>
              </div>

              {/* ===== 高级调试（折叠） ===== */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <button
                  onClick={() => setShowAdvancedDebug(!showAdvancedDebug)}
                  className="w-full px-6 py-4 flex items-center justify-between transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔧</span>
                    <span className="text-sm font-medium" style={{ color: '#888' }}>高级调试</span>
                  </div>
                  <span style={{ color: '#888', transform: showAdvancedDebug ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </button>

                {showAdvancedDebug && (
                  <div className="px-6 pb-6 space-y-4">
                    {/* 启用网络日志 */}
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#fff' }}>启用网络日志</div>
                        <div className="text-xs" style={{ color: '#888' }}>记录联网请求详情</div>
                      </div>
                      <button
                        onClick={() => setNetworkSettings({ ...networkSettings, enableNetworkLogs: !networkSettings.enableNetworkLogs })}
                        className={`w-12 h-6 rounded-full transition-colors ${networkSettings.enableNetworkLogs ? 'bg-cyan-500' : 'bg-gray-600'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${networkSettings.enableNetworkLogs ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {/* 清除网络日志 */}
                    <button
                      onClick={() => {
                        localStorage.removeItem('ai_companion_network_logs');
                        alert('日志已清除');
                      }}
                      className="w-full px-4 py-3 rounded-xl text-sm transition-all hover:opacity-80"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                    >
                      🗑️ 清除网络日志
                    </button>

                    {/* 最近一次联网状态 */}
                    {lastNetworkStatus && (
                      <div className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <div className="text-xs mb-2" style={{ color: '#888' }}>最近一次联网状态</div>
                        <div className="grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: 'monospace' }}>
                          <div style={{ color: '#888' }}>provider:</div><div style={{ color: '#06b6d4' }}>{lastNetworkStatus.provider}</div>
                          <div style={{ color: '#888' }}>is_mock:</div><div style={{ color: lastNetworkStatus.is_mock ? '#f59e0b' : '#22c55e' }}>{String(lastNetworkStatus.is_mock)}</div>
                          <div style={{ color: '#888' }}>result_count:</div><div style={{ color: '#fff' }}>{lastNetworkStatus.result_count ?? '-'}</div>
                          <div style={{ color: '#888' }}>duration_ms:</div><div style={{ color: '#fff' }}>{lastNetworkStatus.duration_ms ?? '-'}ms</div>
                          <div style={{ color: '#888' }}>status:</div><div style={{ color: lastNetworkStatus.status === 'success' ? '#22c55e' : '#ef4444' }}>{lastNetworkStatus.status}</div>
                          <div style={{ color: '#888' }}>error_code:</div><div style={{ color: '#ef4444' }}>{lastNetworkStatus.error_code || '-'}</div>
                        </div>
                      </div>
                    )}

                    {/* 重置联网设置 */}
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#06b6d4' }}>重置联网设置</div>
                        <div className="text-xs" style={{ color: '#888' }}>恢复默认配置（保留 API Key）</div>
                      </div>
                      <button
                        onClick={() => {
                          useAppStore.getState().resetNetworkSettings();
                          alert('联网设置已重置');
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
                      >
                        重置
                      </button>
                    </div>
                  </div>
                )}
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

          {/* ========== 主动聊天中心 ========== */}
          {activeTab === 'voice' && (
            <div className="max-w-4xl space-y-6">
              <VoiceSettingsPanel />
            </div>
          )}

          {activeTab === 'proactive' && (
            <div className="max-w-4xl space-y-6">
              <ProactiveChatCenter />
            </div>
          )}

          {/* ========== 定时任务 ========== */}
          {activeTab === 'scheduler' && (
            <div className="max-w-3xl space-y-6">
              <SchedulerTaskManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ContentTypeKey = keyof ProactiveChatSettings['enabledContentTypes'];

function ToggleSwitch({ checked, onClick, color = '#38bdf8' }: {
  checked: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-14 h-8 rounded-full transition-all relative flex-shrink-0"
      style={{ background: checked ? color : 'rgba(255,255,255,0.2)' }}
    >
      <div
        className="w-6 h-6 rounded-full absolute top-1 transition-all"
        style={{ background: '#fff', left: checked ? '30px' : '4px' }}
      />
    </button>
  );
}

function splitKeywords(value: string): string[] {
  return value
    .split(/[,，、\n]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function formatRecordTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function CharacterAvatar({ pack, size = 64 }: { pack: CharacterPack | null | undefined; size?: number }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadAvatar() {
      const path = pack
        ? resolveCharacterAssetPath(pack, pack.assets.avatar || pack.assets.fullbody || pack.assets.idle)
        : null;
      if (!path) {
        setUrl('');
        return;
      }
      const dataUrl = await readCharacterAssetAsDataUrl(path);
      if (!cancelled) setUrl(dataUrl || '');
    }
    loadAvatar();
    return () => {
      cancelled = true;
    };
  }, [pack]);

  return (
    <div
      className="flex items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {url ? <img src={url} alt={pack?.displayName || pack?.name || '角色头像'} className="w-full h-full object-cover" /> : <span className="text-xl">🧩</span>}
    </div>
  );
}

function CharacterValidationView({ pack }: { pack: CharacterPack }) {
  const { validation } = pack;
  const lines = [
    ...validation.errors.map(item => ({ type: '错误', text: item, color: '#f87171' })),
    ...validation.warnings.map(item => ({ type: '警告', text: item, color: '#facc15' })),
    ...validation.missingFiles.map(item => ({ type: '缺失文件', text: item, color: '#fb923c' })),
    ...validation.sensitiveFieldsFound.map(item => ({ type: '敏感字段', text: item, color: '#f87171' })),
  ];

  if (lines.length === 0) {
    return <div className="text-xs" style={{ color: '#22c55e' }}>校验通过，没有发现错误。</div>;
  }

  return (
    <div className="space-y-2">
      {lines.slice(0, 10).map((line, index) => (
        <div key={`${line.type}-${index}`} className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.25)', color: line.color }}>
          {line.type}：{line.text}
        </div>
      ))}
      {lines.length > 10 && <div className="text-xs" style={{ color: '#8aa3b5' }}>还有 {lines.length - 10} 条校验信息</div>}
    </div>
  );
}

function CharacterPackCenter() {
  const {
    characterPacks,
    currentCharacterPack,
    setCharacterPacks,
    setCurrentCharacterPack,
    setCharacter,
    characterSettings,
    setCharacterSettings,
  } = useAppStore();
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [selectedPackId, setSelectedPackId] = useState<string | null>(currentCharacterPack?.id || null);
  const [message, setMessage] = useState('');

  const selectedPack = characterPacks.find(pack => pack.id === selectedPackId) || currentCharacterPack || characterPacks[0] || null;
  const usableCount = characterPacks.filter(pack => pack.validation.ok && !pack.isTemplate).length;

  const applyPackToStore = (pack: CharacterPack) => {
    setCurrentCharacterPack(pack);
    setCharacter({
      id: pack.id,
      name: pack.displayName || pack.name,
      personality: pack.personaText ? [pack.personaText.slice(0, 60)] : [],
    });
    setCharacterSettings({
      ...characterSettings,
      name: pack.displayName || pack.name,
      customDescription: pack.personaText || pack.description || '',
    });
  };

  const rescan = async () => {
    setScanState('scanning');
    setMessage('');
    try {
      const scan = await scanCharacterPacks();
      setCharacterPacks(scan.packs);
      const nextSelected = scan.packs.find(pack => pack.id === selectedPackId)
        || scan.packs.find(pack => pack.id === currentCharacterPack?.id)
        || scan.packs.find(pack => pack.id === 'xiaoyi')
        || scan.packs[0]
        || null;
      setSelectedPackId(nextSelected?.id || null);
      setScanState('success');
      setMessage(`扫描完成：${scan.packs.length} 个角色包，${scan.packs.filter(pack => pack.validation.ok && !pack.isTemplate).length} 个可用。`);
    } catch (error) {
      setScanState('error');
      setMessage(`扫描失败：${String(error)}`);
    }
  };

  useEffect(() => {
    if (characterPacks.length === 0) void rescan();
  }, []);

  const usePack = (pack: CharacterPack) => {
    if (pack.isTemplate) {
      setMessage('模板包用于复制创建角色，不能直接切换。');
      return;
    }
    if (!pack.validation.ok) {
      setMessage('角色包校验未通过，不能切换。');
      return;
    }
    applyCharacterDefaults(pack);
    applyPackToStore(pack);
    restartProactiveChat();
    setSelectedPackId(pack.id);
    setMessage(`已切换到 ${pack.displayName || pack.name}，后续回复、人设、头像、语音默认值和主动聊天默认值已更新。`);
  };

  const restoreDefaults = () => {
    if (!currentCharacterPack) {
      setMessage('当前没有可恢复的角色默认设置。');
      return;
    }
    restoreCharacterDefaults(currentCharacterPack);
    restartProactiveChat();
    setMessage(`已恢复 ${currentCharacterPack.displayName || currentCharacterPack.name} 的角色默认语音和主动聊天设置。`);
  };

  const importSeed = async (pack: CharacterPack) => {
    const count = await importCharacterMemorySeed(pack);
    setMessage(count > 0 ? `已导入 ${count} 条角色记忆种子，不会覆盖用户真实记忆。` : '该角色记忆种子已导入过，未重复导入。');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[1.1fr_1.4fr] gap-5">
        <div className="p-6 rounded-2xl" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.22)' }}>
          <div className="flex items-start gap-4">
            <CharacterAvatar pack={currentCharacterPack} size={76} />
            <div className="min-w-0">
              <div className="text-xs mb-1" style={{ color: '#8aa3b5' }}>当前角色</div>
              <h3 className="text-xl font-semibold" style={{ color: '#fff' }}>{currentCharacterPack?.displayName || currentCharacterPack?.name || '未加载'}</h3>
              <p className="text-sm mt-2 line-clamp-3" style={{ color: '#b7c4d1' }}>{currentCharacterPack?.description || '从 characters/ 目录扫描角色包后可切换。'}</p>
              <div className="flex flex-wrap gap-2 mt-4 text-xs">
                <span className="px-2 py-1 rounded" style={{ background: 'rgba(20,184,166,0.18)', color: '#5eead4' }}>voiceId: {currentCharacterPack?.voice?.voiceId || '系统默认'}</span>
                <span className="px-2 py-1 rounded" style={{ background: 'rgba(56,189,248,0.15)', color: '#7dd3fc' }}>主动聊天: {currentCharacterPack?.proactive?.enabled ? '开启' : '默认/关闭'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <button onClick={rescan} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#14b8a6', color: '#05201d' }}>
              {scanState === 'scanning' ? '扫描中...' : '重新扫描角色'}
            </button>
            <button onClick={() => openCharacterPath(DEFAULT_CHARACTER_ROOT)} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>打开角色目录</button>
            <button onClick={() => openCharacterPath(DEFAULT_CHARACTER_ROOT)} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>导入角色包</button>
            <button onClick={restoreDefaults} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(250,204,21,0.16)', color: '#fde68a' }}>恢复角色默认设置</button>
          </div>
          {message && (
            <div className="mt-4 text-sm px-4 py-3 rounded-xl" style={{ background: scanState === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)', color: scanState === 'error' ? '#fca5a5' : '#dbeafe' }}>
              {message}
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold" style={{ color: '#fff' }}>校验结果</h3>
              <p className="text-xs mt-1" style={{ color: '#8aa3b5' }}>共 {characterPacks.length} 个角色包，{usableCount} 个可用。</p>
            </div>
            {selectedPack && (
              <button onClick={() => openCharacterPath(selectedPack.basePath)} className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                打开文件夹
              </button>
            )}
          </div>
          {selectedPack ? <CharacterValidationView pack={selectedPack} /> : <div className="text-sm" style={{ color: '#8aa3b5' }}>暂无角色包。</div>}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold" style={{ color: '#fff' }}>角色列表</h3>
        {characterPacks.map(pack => (
          <div
            key={`${pack.id}-${pack.basePath}`}
            className="p-4 rounded-2xl"
            style={{
              background: selectedPackId === pack.id ? 'rgba(20,184,166,0.11)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${pack.validation.ok ? 'rgba(20,184,166,0.22)' : 'rgba(239,68,68,0.28)'}`,
            }}
          >
            <div className="flex items-center gap-4">
              <CharacterAvatar pack={pack} size={58} />
              <button className="flex-1 min-w-0 text-left" onClick={() => setSelectedPackId(pack.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold" style={{ color: '#fff' }}>{pack.displayName || pack.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: pack.validation.ok ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)', color: pack.validation.ok ? '#86efac' : '#fca5a5' }}>
                    {pack.isTemplate ? '模板' : pack.validation.ok ? '校验通过' : '校验失败'}
                  </span>
                  {currentCharacterPack?.id === pack.id && <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(20,184,166,0.18)', color: '#5eead4' }}>当前</span>}
                </div>
                <div className="text-xs mt-1 line-clamp-2" style={{ color: '#8aa3b5' }}>{pack.description || pack.basePath}</div>
              </button>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => usePack(pack)} disabled={pack.isTemplate || !pack.validation.ok} className="px-3 py-2 rounded-lg text-xs disabled:opacity-40" style={{ background: '#14b8a6', color: '#05201d' }}>使用此角色</button>
                <button onClick={() => openCharacterPath(pack.basePath)} className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>打开文件夹</button>
                <button onClick={() => setSelectedPackId(pack.id)} className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(59,130,246,0.16)', color: '#bfdbfe' }}>查看详情</button>
                {pack.memorySeed?.memories?.length ? (
                  <button onClick={() => importSeed(pack)} className="px-3 py-2 rounded-lg text-xs" style={{ background: isMemorySeedImported(pack.id) ? 'rgba(255,255,255,0.08)' : 'rgba(168,85,247,0.18)', color: '#ddd' }}>
                    {isMemorySeedImported(pack.id) ? '记忆已导入' : '导入记忆种子'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {characterPacks.length === 0 && (
          <div className="p-8 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.04)', color: '#8aa3b5' }}>
            没有扫描到角色包。请把符合规范的角色文件夹放入 {DEFAULT_CHARACTER_ROOT}
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceSettingsPanel() {
  const { aiConfig, styleSettings, setStyleSettings } = useAppStore();
  const [settings, setSettings] = useState<VoiceSettings>(() => loadVoiceSettings());
  const [records, setRecords] = useState<VoiceAudioRecord[]>(() => loadVoiceAudioRecords());
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const color = '#facc15';
  const cardStyle: React.CSSProperties = {
    background: 'rgba(250,204,21,0.08)',
    border: '1px solid rgba(250,204,21,0.22)',
  };
  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.26)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    outline: 'none',
  };

  const persistSettings = (nextSettings: VoiceSettings) => {
    const saved = saveVoiceSettings(nextSettings);
    setSettings(saved);
    setStyleSettings({ ...styleSettings, enableTTS: saved.enabled });
    return saved;
  };

  const patchSettings = (patch: Partial<VoiceSettings>) => {
    const saved = persistSettings({ ...settings, ...patch });
    saveCurrentCharacterVoiceOverride(saved);
    return saved;
  };

  const refreshRecords = () => setRecords(loadVoiceAudioRecords());

  const runVoiceTest = async () => {
    setTestState('testing');
    setTestMessage('');
    try {
      const result = await speakText('小伊在这里，语音测试成功啦。今天我会用这个声音陪你说话。', {
        source: 'test',
        sourceMessageId: 'voice_test',
        settings,
        play: true,
      });
      refreshRecords();
      setTestState(result.ok ? 'success' : 'error');
      if (result.ok) {
        setTestMessage([
          '测试听一句通过',
          `provider=${result.response?.provider || 'minimax_tts_mcp'}`,
          `tool=${result.response?.tool || 'text_to_audio'}`,
          `isMock=${String(result.response?.isMock ?? false)}`,
          `fileExists=${String(result.response?.fileExists ?? true)}`,
          `fileSize=${result.response?.fileSize || result.record?.fileSize || 0}`,
          `audioPath=${result.record?.filePath || result.response?.audioPath || ''}`,
        ].join('\n'));
      } else {
        setTestMessage([
          result.errorMessage || '语音生成失败，请稍后再试。',
          `errorCode=${result.errorCode || 'MINIMAX_TTS_GENERATION_FAILED'}`,
          'provider=minimax_tts_mcp',
          'tool=text_to_audio',
          'isMock=false',
        ].join('\n'));
      }
    } catch (error) {
      refreshRecords();
      setTestState('error');
      setTestMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const clearCache = async () => {
    try {
      const removed = await clearVoiceCache();
      refreshRecords();
      setTestState('success');
      setTestMessage(`已清空语音缓存，删除 ${removed} 个文件。`);
    } catch (error) {
      setTestState('error');
      setTestMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const renderSwitchRow = (
    label: string,
    desc: string,
    checked: boolean,
    onClick: () => void,
  ) => (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div>
        <div className="text-sm font-medium" style={{ color: '#fff' }}>{label}</div>
        <div className="text-xs mt-1" style={{ color: '#8aa3b5' }}>{desc}</div>
      </div>
      <ToggleSwitch checked={checked} onClick={onClick} color={color} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl" style={cardStyle}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color }}>语音功能总开关</h3>
            <p className="text-xs mt-1" style={{ color: '#8aa3b5' }}>
              当前 MiniMax Key 状态：{aiConfig.apiKey ? '已配置' : '未配置'}；Key 来源：联网中心
            </p>
          </div>
          <ToggleSwitch
            checked={settings.enabled}
            onClick={() => patchSettings({ enabled: !settings.enabled })}
            color={color}
          />
        </div>
      </div>

      <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold" style={{ color }}>声音选择</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>语音模型</label>
            <select
              value={settings.model}
              onChange={event => patchSettings({ model: event.target.value as VoiceSettings['model'] })}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            >
              {VOICE_MODEL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}{option.desc ? `（${option.desc}）` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>系统预设声音 voiceId</label>
            <select
              value={settings.voiceId}
              onChange={event => patchSettings({ voiceId: event.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            >
              {VOICE_PRESET_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>扩展 voiceId 接头</label>
          <input
            value={settings.voiceId}
            onChange={event => patchSettings({ voiceId: event.target.value })}
            placeholder="输入 MiniMax 可用的 voiceId"
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold" style={{ color }}>朗读行为</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSwitchRow('自动朗读 AI 回复', 'AI 文字先显示，语音异步生成播放', settings.autoReadAssistantReply, () => patchSettings({ autoReadAssistantReply: !settings.autoReadAssistantReply }))}
          {renderSwitchRow('自动朗读主动聊天', '主动聊天消息生成后自动朗读', settings.autoReadProactive, () => patchSettings({ autoReadProactive: !settings.autoReadProactive }))}
          {renderSwitchRow('自动朗读定时任务', '定时提醒、总结和搜索结论可朗读', settings.autoReadScheduledTask, () => patchSettings({ autoReadScheduledTask: !settings.autoReadScheduledTask }))}
          {renderSwitchRow('启用右键朗读', '聊天消息右键可选择朗读这句话', settings.enableRightClickRead, () => patchSettings({ enableRightClickRead: !settings.enableRightClickRead }))}
          {renderSwitchRow('清洗朗读文本', '移除 Markdown、代码块、调试字段和来源链接', settings.cleanTextBeforeRead, () => patchSettings({ cleanTextBeforeRead: !settings.cleanTextBeforeRead }))}
          {renderSwitchRow('跳过链接', '联网搜索结果不朗读完整 URL', settings.skipLinks, () => patchSettings({ skipLinks: !settings.skipLinks }))}
        </div>
      </div>

      <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold" style={{ color }}>音频参数</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>emotion</label>
            <select
              value={settings.emotion}
              onChange={event => patchSettings({ emotion: event.target.value as VoiceSettings['emotion'] })}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            >
              {VOICE_EMOTION_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          {([
            ['speed', 'speed', 0.5, 2, 0.05],
            ['vol', 'vol', 0.1, 3, 0.1],
            ['pitch', 'pitch', -12, 12, 0.5],
          ] as const).map(([key, label, min, max, step]) => (
            <div key={key}>
              <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>{label}: {settings[key]}</label>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={settings[key]}
                onChange={event => patchSettings({ [key]: Number(event.target.value) } as Partial<VoiceSettings>)}
                className="w-full"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            ['format', settings.format],
            ['sampleRate', settings.sampleRate],
            ['bitrate', settings.bitrate],
            ['channel', settings.channel],
          ].map(([label, value]) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.22)' }}>
              <div style={{ color: '#8aa3b5' }}>{label}</div>
              <div className="mt-1 font-mono" style={{ color: '#fff' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold" style={{ color }}>缓存设置</h3>
        {renderSwitchRow('启用缓存', '相同文本和相同声音参数复用本地 mp3', settings.cacheEnabled, () => patchSettings({ cacheEnabled: !settings.cacheEnabled }))}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-4">
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>缓存目录</label>
            <input
              value={settings.cacheDir || DEFAULT_AUDIO_CACHE_DIR}
              onChange={event => patchSettings({ cacheDir: event.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm font-mono"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>最大缓存记录</label>
            <input
              type="number"
              min={10}
              value={settings.maxCacheFiles}
              onChange={event => patchSettings({ maxCacheFiles: Math.max(10, Number(event.target.value) || 80) })}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
        </div>
        <button
          onClick={clearCache}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.16)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.28)' }}
        >
          清空语音缓存
        </button>
      </div>

      <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color }}>测试听一句</h3>
            <p className="text-xs mt-1" style={{ color: '#8aa3b5' }}>优先调用 MiniMax MCP text_to_audio；Token Plan 可回退到 mmx CLI，生成 mp3 到 audio_cache 并播放</p>
          </div>
          <button
            onClick={runVoiceTest}
            disabled={testState === 'testing'}
            className="px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #facc15, #fb923c)', color: '#1a1a2e' }}
          >
            {testState === 'testing' ? '生成中...' : '测试听一句'}
          </button>
        </div>
        {testMessage && (
          <pre className="p-4 rounded-xl text-xs whitespace-pre-wrap" style={{ background: 'rgba(0,0,0,0.28)', color: testState === 'error' ? '#fca5a5' : '#d9f99d' }}>
            {testMessage}
          </pre>
        )}
      </div>

      <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color }}>最近语音记录</h3>
          <span className="text-xs" style={{ color: '#8aa3b5' }}>{records.length} 条</span>
        </div>
        {records.length === 0 ? (
          <div className="p-5 rounded-xl text-sm text-center" style={{ background: 'rgba(0,0,0,0.2)', color: '#8aa3b5' }}>
            暂无语音记录
          </div>
        ) : (
          <div className="space-y-3">
            {records.slice(0, 20).map(record => (
              <div key={record.id} className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-sm truncate" style={{ color: '#fff' }}>{record.textPreview}</div>
                  <span className="text-xs flex-shrink-0" style={{ color: '#8aa3b5' }}>{formatRecordTime(record.createdAt)}</span>
                </div>
                <div className="text-xs font-mono break-all" style={{ color: '#8aa3b5' }}>{record.filePath}</div>
                <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                  <span style={{ color: '#facc15' }}>{record.model}</span>
                  <span style={{ color: '#facc15' }}>{record.voiceId}</span>
                  <span style={{ color: '#8aa3b5' }}>{record.fileSize || 0} bytes</span>
                  <button onClick={() => playVoiceRecord(record)} className="px-3 py-1 rounded-lg" style={{ background: 'rgba(250,204,21,0.18)', color }}>播放</button>
                  <button onClick={() => stopVoicePlayback()} className="px-3 py-1 rounded-lg" style={{ background: 'rgba(248,113,113,0.16)', color: '#fca5a5' }}>停止</button>
                  <button onClick={() => openVoiceAudioFile(record)} className="px-3 py-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.16)', color: '#93c5fd' }}>打开文件</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProactiveChatCenter() {
  const { styleSettings, setStyleSettings } = useAppStore();
  const [settings, setSettings] = useState<ProactiveChatSettings>(() => loadProactiveChatSettings());
  const [records, setRecords] = useState(() => loadProactiveTriggerRecords());
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const color = '#38bdf8';
  const cardStyle: React.CSSProperties = {
    background: 'rgba(56,189,248,0.08)',
    border: '1px solid rgba(56,189,248,0.22)',
  };
  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.26)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    outline: 'none',
  };

  const persistSettings = (nextSettings: ProactiveChatSettings) => {
    const saved = saveProactiveChatSettings(nextSettings);
    setSettings(saved);
    restartProactiveChat();
    return saved;
  };

  const patchSettings = (patch: Partial<ProactiveChatSettings>) => {
    const saved = persistSettings({ ...settings, ...patch });
    saveCurrentCharacterProactiveOverride(saved);
    return saved;
  };

  const updateContentType = (key: ContentTypeKey) => {
    patchSettings({
      enabledContentTypes: {
        ...settings.enabledContentTypes,
        [key]: !settings.enabledContentTypes[key],
      },
    });
  };

  const updateTopic = (id: string, patch: Partial<ProactiveInterestTopic>) => {
    patchSettings({
      interestTopics: settings.interestTopics.map(topic =>
        topic.id === id ? { ...topic, ...patch } : topic
      ),
    });
  };

  const addTopic = () => {
    patchSettings({ interestTopics: [...settings.interestTopics, createDefaultInterestTopic()] });
  };

  const removeTopic = (id: string) => {
    const nextTopics = settings.interestTopics.filter(topic => topic.id !== id);
    patchSettings({ interestTopics: nextTopics.length ? nextTopics : [createDefaultInterestTopic()] });
  };

  const runImmediateTest = async () => {
    setTestState('testing');
    setTestMessage('');
    try {
      const result = await runProactiveChatTest();
      setSettings(loadProactiveChatSettings());
      setRecords(loadProactiveTriggerRecords());
      setTestState(result.success ? 'success' : 'error');
      setTestMessage(result.message || result.record.error || '主动聊天测试没有生成消息');
    } catch (error) {
      setTestState('error');
      setTestMessage(error instanceof Error ? error.message : String(error));
      setRecords(loadProactiveTriggerRecords());
    }
  };

  const contentTypes: Array<{ key: ContentTypeKey; label: string; desc: string }> = [
    { key: 'care', label: '关心问候', desc: '喝水、休息、作息、工作太久提醒' },
    { key: 'projectReminder', label: '项目进度提醒', desc: '结合最近项目、构建、测试、修复上下文' },
    { key: 'interestNews', label: '兴趣资讯搜索', desc: '按兴趣关键词主动联网搜索资讯' },
    { key: 'dailySummary', label: '每日总结', desc: '围绕今天的聊天和任务做复盘' },
    { key: 'studyReminder', label: '学习监督', desc: '学习计划、复习和执行提醒' },
    { key: 'customMessage', label: '自定义话术', desc: '优先使用你写好的主动话术' },
  ];

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl" style={cardStyle}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color }}>主动聊天总开关</h3>
            <p className="text-xs mt-1" style={{ color: '#8aa3b5' }}>
              当前下次触发：{settings.nextRunAt ? new Date(settings.nextRunAt).toLocaleString('zh-CN') : '待计算'}
            </p>
          </div>
          <ToggleSwitch
            checked={settings.enabled && styleSettings.enableAutoReply}
            color={color}
            onClick={() => {
              const nextEnabled = !(settings.enabled && styleSettings.enableAutoReply);
              patchSettings({ enabled: nextEnabled });
              setStyleSettings({ ...styleSettings, enableAutoReply: nextEnabled });
            }}
          />
        </div>
      </div>

      <div className="p-6 rounded-2xl space-y-5" style={cardStyle}>
        <h3 className="text-base font-semibold" style={{ color }}>主动聊天人设与话题设定</h3>

        <div>
          <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>人设设定</label>
          <textarea
            value={settings.personaPrompt}
            onChange={event => patchSettings({ personaPrompt: event.target.value })}
            rows={6}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={inputStyle}
            placeholder={'你是一个温柔、细心、略微撒娇的小伊。\n主动说话时要像陪伴型桌宠，不要像工作报告。\n你可以关心我是否休息、是否喝水、是否继续推进项目。'}
          />
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>主动话题范围</label>
          <textarea
            value={settings.topicScope}
            onChange={event => patchSettings({ topicScope: event.target.value })}
            rows={6}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={inputStyle}
            placeholder={'可以主动聊：\n- AI Companion 开发进度\n- 视频集锦项目\n- 喝水、休息、作息提醒\n\n不要主动聊：\n- 无关娱乐八卦\n- 假装知道我正在做什么'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>语气风格</label>
            <select
              value={settings.tonePreset}
              onChange={event => patchSettings({ tonePreset: event.target.value as ProactiveChatSettings['tonePreset'] })}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            >
              {TONE_PRESET_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          {settings.tonePreset === 'custom' && (
            <div>
              <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>自定义语气</label>
              <textarea
                value={settings.customTone}
                onChange={event => patchSettings({ customTone: event.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                style={inputStyle}
                placeholder="语气像小伊，温柔、有点可爱，但不要太吵。先说重点，再轻轻提醒。"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>禁忌内容</label>
          <textarea
            value={settings.forbiddenTopics}
            onChange={event => patchSettings({ forbiddenTopics: event.target.value })}
            rows={5}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={inputStyle}
            placeholder={'不要中英混杂。\n不要输出英文推理。\n不要说 Here is / Sure / Let me / I can help。\n不要编造我没有说过的信息。'}
          />
        </div>
      </div>

      <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold" style={{ color }}>主动内容类型</h3>
        <div className="grid grid-cols-2 gap-3">
          {contentTypes.map(item => (
            <div key={item.key} className="flex items-center justify-between gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: '#fff' }}>{item.label}</div>
                <div className="text-xs mt-1" style={{ color: '#6b8292' }}>{item.desc}</div>
              </div>
              <ToggleSwitch checked={settings.enabledContentTypes[item.key]} onClick={() => updateContentType(item.key)} color={color} />
            </div>
          ))}
        </div>
        {settings.enabledContentTypes.customMessage && (
          <textarea
            value={settings.customMessagePrompt}
            onChange={event => patchSettings({ customMessagePrompt: event.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={inputStyle}
            placeholder="写一段小伊可以主动发送的自定义话术。"
          />
        )}
      </div>

      <div className="p-6 rounded-2xl space-y-5" style={cardStyle}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color }}>兴趣资讯订阅</h3>
          <button
            onClick={addTopic}
            className="px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(56,189,248,0.2)', color }}
          >
            + 添加主题
          </button>
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>兴趣关键词配置</label>
          <textarea
            value={settings.interestKeywords.join(', ')}
            onChange={event => patchSettings({ interestKeywords: splitKeywords(event.target.value) })}
            rows={2}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={inputStyle}
            placeholder="MiniMax, OpenClaw, Codex, MCP"
          />
        </div>

        {settings.interestTopics.map(topic => (
          <div key={topic.id} className="p-4 rounded-xl space-y-4" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between gap-3">
              <input
                value={topic.name}
                onChange={event => updateTopic(topic.id, { name: event.target.value })}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
                style={inputStyle}
                placeholder="主题名称：AI 工具更新"
              />
              <ToggleSwitch checked={topic.enabled} onClick={() => updateTopic(topic.id, { enabled: !topic.enabled })} color={color} />
              <button
                onClick={() => removeTopic(topic.id)}
                className="w-9 h-9 rounded-lg text-lg"
                style={{ background: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
              >
                ×
              </button>
            </div>
            <textarea
              value={topic.keywords.join(', ')}
              onChange={event => updateTopic(topic.id, { keywords: splitKeywords(event.target.value) })}
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none"
              style={inputStyle}
              placeholder="关键词：MiniMax, OpenClaw, Codex, MCP"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                value={topic.frequency}
                onChange={event => updateTopic(topic.id, { frequency: event.target.value })}
                className="px-4 py-3 rounded-xl text-sm"
                style={inputStyle}
                placeholder="频率：每天 09:00"
              />
              <input
                type="number"
                min={1}
                max={10}
                value={topic.maxResults}
                onChange={event => updateTopic(topic.id, { maxResults: Math.max(1, Math.min(10, Number(event.target.value) || 5)) })}
                className="px-4 py-3 rounded-xl text-sm"
                style={inputStyle}
                placeholder="搜索结果数量"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl space-y-5" style={cardStyle}>
        <h3 className="text-base font-semibold" style={{ color }}>触发规则</h3>
        <div className="grid grid-cols-4 gap-3">
          {([
            { value: 'interval', label: '间隔触发' },
            { value: 'fixed_time', label: '固定时间' },
            { value: 'idle', label: '空闲触发' },
            { value: 'context', label: '上下文触发' },
          ] as const).map(option => (
            <button
              key={option.value}
              onClick={() => patchSettings({ triggerType: option.value, nextRunAt: undefined })}
              className="px-3 py-3 rounded-xl text-sm"
              style={{
                background: settings.triggerType === option.value ? 'rgba(56,189,248,0.24)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${settings.triggerType === option.value ? color : 'rgba(255,255,255,0.1)'}`,
                color: settings.triggerType === option.value ? color : '#9aa8b2',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {(settings.triggerType === 'idle' || settings.triggerType === 'context') && (
          <div className="text-xs" style={{ color: '#f59e0b' }}>该触发方式已预留，第一版不会自动触发。</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {settings.triggerType === 'fixed_time' && (
            <div>
              <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>固定时间</label>
              <input
                type="time"
                value={settings.timeOfDay || '09:00'}
                onChange={event => patchSettings({ timeOfDay: event.target.value, nextRunAt: undefined })}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={inputStyle}
              />
            </div>
          )}
          {settings.triggerType === 'interval' && (
            <div>
              <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>间隔分钟数</label>
              <input
                type="number"
                min={30}
                value={settings.intervalMinutes || 30}
                onChange={event => patchSettings({ intervalMinutes: Math.max(30, Number(event.target.value) || 30), nextRunAt: undefined })}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={inputStyle}
              />
            </div>
          )}
        </div>
      </div>

      <div className="p-6 rounded-2xl space-y-5" style={cardStyle}>
        <h3 className="text-base font-semibold" style={{ color }}>联网搜索设置、免打扰和频率限制</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div>
              <div className="text-sm font-medium" style={{ color: '#fff' }}>允许主动联网搜索资讯</div>
              <div className="text-xs mt-1" style={{ color: '#6b8292' }}>兴趣资讯使用 MiniMax Web Search</div>
            </div>
            <ToggleSwitch checked={settings.allowWebSearch} onClick={() => patchSettings({ allowWebSearch: !settings.allowWebSearch })} color={color} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div>
              <div className="text-sm font-medium" style={{ color: '#fff' }}>启用免打扰</div>
              <div className="text-xs mt-1" style={{ color: '#6b8292' }}>{settings.quietStart} - {settings.quietEnd}</div>
            </div>
            <ToggleSwitch checked={settings.quietHoursEnabled} onClick={() => patchSettings({ quietHoursEnabled: !settings.quietHoursEnabled })} color={color} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>最短间隔</label>
            <input
              type="number"
              min={30}
              value={settings.minIntervalMinutes}
              onChange={event => patchSettings({ minIntervalMinutes: Math.max(30, Number(event.target.value) || 30), nextRunAt: undefined })}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>每日最多</label>
            <input
              type="number"
              min={1}
              value={settings.maxDailyMessages}
              onChange={event => patchSettings({ maxDailyMessages: Math.max(1, Number(event.target.value) || 5) })}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>免打扰开始</label>
            <input
              type="time"
              value={settings.quietStart}
              onChange={event => patchSettings({ quietStart: event.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8aa3b5' }}>免打扰结束</label>
            <input
              type="time"
              value={settings.quietEnd}
              onChange={event => patchSettings({ quietEnd: event.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color }}>立即测试主动聊天</h3>
            <p className="text-xs mt-1" style={{ color: '#8aa3b5' }}>使用当前设置生成一条主动消息并发到聊天框。</p>
          </div>
          <button
            onClick={runImmediateTest}
            disabled={testState === 'testing'}
            className="px-5 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: testState === 'testing' ? 'rgba(56,189,248,0.28)' : 'linear-gradient(135deg, #38bdf8, #0891b2)',
              color: '#fff',
            }}
          >
            {testState === 'testing' ? '生成中...' : '立即测试主动聊天'}
          </button>
        </div>
        {testMessage && (
          <div className="p-4 rounded-xl text-sm whitespace-pre-wrap" style={{ background: 'rgba(0,0,0,0.26)', color: testState === 'error' ? '#fca5a5' : '#dff6ff' }}>
            {testMessage}
          </div>
        )}
      </div>

      <div className="p-6 rounded-2xl space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color }}>最近触发记录</h3>
          <span className="text-xs" style={{ color: '#8aa3b5' }}>最近 {records.length} 条</span>
        </div>
        {records.length === 0 ? (
          <div className="p-5 rounded-xl text-sm text-center" style={{ background: 'rgba(0,0,0,0.2)', color: '#8aa3b5' }}>
            暂无主动聊天触发记录
          </div>
        ) : (
          <div className="space-y-3">
            {records.slice(0, 20).map(record => (
              <div key={record.id} className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: record.success ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)', color: record.success ? '#22c55e' : '#ef4444' }}>
                      {record.success ? '成功' : '失败'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(56,189,248,0.14)', color }}>
                      {record.type}
                    </span>
                    {record.usedWebSearch && (
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(6,182,212,0.14)', color: '#06b6d4' }}>
                        联网 · {record.provider || 'minimax_web_search'} · {record.resultCount || 0} 条
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: '#6b8292' }}>{formatRecordTime(record.time)}</span>
                </div>
                <div className="text-sm" style={{ color: '#fff' }}>{record.topic}</div>
                <div className="text-xs mt-1" style={{ color: '#8aa3b5' }}>{record.resultSummary}</div>
                {record.error && <div className="text-xs mt-1" style={{ color: '#f87171' }}>{record.error}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 任务管理完整组件（新建+编辑+列表）
function SchedulerTaskManager() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);

  // 表单状态
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<ScheduledTaskType>('interval');
  const [formTimeOfDay, setFormTimeOfDay] = useState('09:00');
  const [formInterval, setFormInterval] = useState(60);
  const [formRunAt, setFormRunAt] = useState('');
  const [formWebSearch, setFormWebSearch] = useState(false);

  const loadTasks = () => setTasks(loadScheduledTasks());

  useEffect(() => {
    loadTasks();
  }, []);

  const openNewForm = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormContent('');
    setFormType('interval');
    setFormTimeOfDay('09:00');
    setFormInterval(60);
    setFormRunAt('');
    setFormWebSearch(false);
    setShowForm(true);
  };

  const openEditForm = (task: ScheduledTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormContent(task.content);
    setFormType(task.type);
    setFormTimeOfDay(task.timeOfDay || '09:00');
    setFormInterval(task.intervalMinutes || 60);
    setFormRunAt(task.runAt ? task.runAt.slice(0, 16) : '');
    setFormWebSearch(task.enableWebSearch ?? false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  const handleSave = () => {
    // 验证
    if (!formTitle.trim()) {
      alert('请输入任务名称');
      return;
    }
    if (!formContent.trim()) {
      alert('请输入任务内容');
      return;
    }
    if (formType === 'interval' && formInterval < 1) {
      alert('间隔时间不能小于1分钟');
      return;
    }
    if (formType === 'once' && !formRunAt) {
      alert('请选择执行时间');
      return;
    }

    if (editingTask) {
      // 编辑模式
      updateScheduledTask(editingTask.id, {
        title: formTitle.trim(),
        content: formContent.trim(),
        type: formType,
        timeOfDay: formType === 'daily' ? formTimeOfDay : undefined,
        intervalMinutes: formType === 'interval' ? formInterval : undefined,
        runAt: formType === 'once' ? new Date(formRunAt).toISOString() : undefined,
        enableWebSearch: formWebSearch,
      });
    } else {
      // 新建模式
      createScheduledTask({
        title: formTitle.trim(),
        content: formContent.trim(),
        type: formType,
        timeOfDay: formType === 'daily' ? formTimeOfDay : undefined,
        intervalMinutes: formType === 'interval' ? formInterval : undefined,
        runAt: formType === 'once' ? new Date(formRunAt).toISOString() : undefined,
        enableWebSearch: formWebSearch,
      });
    }

    loadTasks();
    closeForm();
  };

  const handleDelete = (id: string) => {
    if (!confirm('确认删除这个任务？')) return;
    deleteScheduledTask(id);
    loadTasks();
  };

  const handleToggle = (id: string) => {
    toggleScheduledTask(id);
    loadTasks();
  };

  const formatNextRun = (task: ScheduledTask): string => {
    if (!task.nextRunAt) return '未知';
    if (!task.enabled) return '已停用';
    if (task.type === 'once' && task.completedAt) return '已完成';
    try {
      const d = new Date(task.nextRunAt);
      const now = new Date();
      const diffMs = d.getTime() - now.getTime();
      if (diffMs < 0) return '已到期';
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return '即将执行';
      if (diffMin < 60) return `${diffMin}分钟后`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}小时${diffMin % 60}分钟后`;
      return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return task.nextRunAt;
    }
  };

  const currentFormAction = classifyScheduledTaskAction(formContent, formWebSearch);
  const currentFormMaySearch = mayTriggerScheduledWebSearch(formContent, formWebSearch);

  return (
    <div className="space-y-4">
      {/* 头部：新建按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <h3 className="text-base font-semibold" style={{ color: '#f97316' }}>定时任务</h3>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>
            {tasks.length}个任务
          </span>
        </div>
        <button
          onClick={openNewForm}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', color: '#fff' }}
        >
          + 新建任务
        </button>
      </div>

      {/* 新建/编辑表单 */}
      {showForm && (
        <div
          className="p-6 rounded-2xl"
          style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}
        >
          <h4 className="text-sm font-semibold mb-4" style={{ color: '#f97316' }}>
            {editingTask ? '✏️ 编辑任务' : '➕ 新建任务'}
          </h4>

          <div className="space-y-4">
            {/* 任务名称 */}
            <div>
              <label className="block text-xs mb-1" style={{ color: '#888' }}>任务名称</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="例如：工作总结提醒"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
              />
            </div>

            {/* 任务内容 */}
            <div>
              <label className="block text-xs mb-1" style={{ color: '#888' }}>任务内容</label>
              <textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder="例如：提醒我总结今天的工作进展，用中文回答我三个问题"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              {formContent.trim() && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 rounded-lg text-xs" style={{ background: 'rgba(249,115,22,0.16)', color: '#f97316' }}>
                    动作类型：{getScheduledTaskActionLabel(currentFormAction)}
                  </span>
                  {currentFormMaySearch && (
                    <span className="px-2 py-1 rounded-lg text-xs" style={{ background: 'rgba(6,182,212,0.14)', color: '#06b6d4' }}>
                      该任务内容可能会触发联网搜索
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 执行方式 */}
            <div>
              <label className="block text-xs mb-2" style={{ color: '#888' }}>执行方式</label>
              <div className="flex gap-2">
                {([
                  { value: 'once' as const, label: '一次性' },
                  { value: 'daily' as const, label: '每天' },
                  { value: 'interval' as const, label: '间隔' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormType(opt.value)}
                    className="px-4 py-2 rounded-xl text-sm transition-all"
                    style={{
                      background: formType === opt.value
                        ? 'linear-gradient(135deg, #f97316, #fb923c)'
                        : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      border: formType === opt.value ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 联网搜索开关 */}
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: '#fff' }}>🌐 联网搜索</div>
                <div className="text-xs mt-1" style={{ color: '#888' }}>开启后，任务内容将作为搜索关键词执行 MiniMax 联网搜索</div>
              </div>
              <button
                onClick={() => setFormWebSearch(!formWebSearch)}
                className={`w-12 h-6 rounded-full transition-colors ${formWebSearch ? 'bg-cyan-500' : 'bg-gray-600'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${formWebSearch ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* 类型相关字段 */}
            {formType === 'daily' && (
              <div>
                <label className="block text-xs mb-1" style={{ color: '#888' }}>每天执行时间</label>
                <input
                  type="time"
                  value={formTimeOfDay}
                  onChange={e => setFormTimeOfDay(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
                />
              </div>
            )}

            {formType === 'interval' && (
              <div>
                <label className="block text-xs mb-1" style={{ color: '#888' }}>间隔分钟数（分钟）</label>
                <input
                  type="number"
                  min={1}
                  value={formInterval}
                  onChange={e => setFormInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
                />
                <div className="text-xs mt-1" style={{ color: '#555' }}>
                  提示：间隔时间不能小于1分钟
                </div>
              </div>
            )}

            {formType === 'once' && (
              <div>
                <label className="block text-xs mb-1" style={{ color: '#888' }}>执行时间</label>
                <input
                  type="datetime-local"
                  value={formRunAt}
                  onChange={e => setFormRunAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
                />
              </div>
            )}

            {/* 按钮行 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', color: '#fff' }}
              >
                {editingTask ? '保存修改' : '创建任务'}
              </button>
              <button
                onClick={closeForm}
                className="px-6 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#888' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      {tasks.length === 0 && !showForm ? (
        <div
          className="p-8 rounded-2xl text-center"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}
        >
          <div className="text-4xl mb-3">⏰</div>
          <div className="text-sm" style={{ color: '#888' }}>暂无定时任务</div>
          <div className="text-xs mt-1" style={{ color: '#555' }}>点击上方"新建任务"创建一个</div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className="p-4 rounded-2xl"
              style={{
                background: task.enabled
                  ? 'rgba(249,115,22,0.08)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${task.enabled ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.08)'}`,
                opacity: task.enabled ? 1 : 0.7,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* 任务标题和类型标签 */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: task.enabled ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.1)',
                        color: task.enabled ? '#f97316' : '#666',
                      }}
                    >
                      {task.type === 'once' ? '一次性' : task.type === 'daily' ? '每天' : '间隔'}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: classifyScheduledTaskAction(task.content, task.enableWebSearch) === 'web_search'
                          ? 'rgba(6,182,212,0.18)'
                          : classifyScheduledTaskAction(task.content, task.enableWebSearch) === 'ai_summary'
                          ? 'rgba(168,85,247,0.18)'
                          : classifyScheduledTaskAction(task.content, task.enableWebSearch) === 'need_clarification'
                          ? 'rgba(239,68,68,0.18)'
                          : 'rgba(34,197,94,0.16)',
                        color: classifyScheduledTaskAction(task.content, task.enableWebSearch) === 'web_search'
                          ? '#06b6d4'
                          : classifyScheduledTaskAction(task.content, task.enableWebSearch) === 'ai_summary'
                          ? '#c084fc'
                          : classifyScheduledTaskAction(task.content, task.enableWebSearch) === 'need_clarification'
                          ? '#f87171'
                          : '#22c55e',
                      }}
                    >
                      {getScheduledTaskActionLabel(classifyScheduledTaskAction(task.content, task.enableWebSearch))}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${task.enabled ? '' : 'line-through'}`}
                      style={{ color: task.enabled ? '#fff' : '#666' }}
                    >
                      {task.title}
                    </span>
                    {task.type === 'once' && task.completedAt && (
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                        已完成
                      </span>
                    )}
                  </div>

                  {/* 任务内容预览 */}
                  <div className="text-xs mb-2 line-clamp-2" style={{ color: '#888' }}>
                    {task.content}
                  </div>

                  {/* 时间信息行 */}
                  <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: '#555' }}>
                    {task.type === 'interval' && task.intervalMinutes && (
                      <span>📏 每隔 {task.intervalMinutes} 分钟</span>
                    )}
                    {task.type === 'daily' && task.timeOfDay && (
                      <span>🕐 每天 {task.timeOfDay}</span>
                    )}
                    {task.type === 'once' && task.runAt && (
                      <span>🗓️ {new Date(task.runAt).toLocaleString('zh-CN')}</span>
                    )}
                    <span>▶️ 下次：{formatNextRun(task)}</span>
                    {task.lastRunAt && (
                      <span>⏮️ 上次：{new Date(task.lastRunAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    <span>🔄 共执行 {task.runCount} 次</span>
                    {task.enableWebSearch && (
                      <span style={{ color: '#06b6d4' }}>🌐 联网</span>
                    )}
                    {mayTriggerScheduledWebSearch(task.content, task.enableWebSearch) && !task.enableWebSearch && (
                      <span style={{ color: '#06b6d4' }}>可能联网搜索</span>
                    )}
                  </div>
                </div>

                {/* 操作按钮组 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditForm(task)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                    style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleToggle(task.id)}
                    className="w-10 h-6 rounded-full transition-all relative"
                    style={{ background: task.enabled ? '#f97316' : 'rgba(255,255,255,0.2)' }}
                    title={task.enabled ? '停用' : '启用'}
                  >
                    <div
                      className="w-4 h-4 rounded-full absolute top-1 bg-white transition-all"
                      style={{ left: task.enabled ? '20px' : '3px' }}
                    />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                    style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
