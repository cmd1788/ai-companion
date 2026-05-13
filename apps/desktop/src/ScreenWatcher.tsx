import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from './store';

// MiniMax TTS API - 生成语音并播放
let audioCache: Map<string, string> = new Map(); // text -> base64 audio

async function speakWithMiniMax(text: string): Promise<void> {
  const apiKey = useAppStore.getState().aiConfig.apiKey;
  if (!apiKey) {
    console.log('[TTS] No API key, skipping');
    return;
  }

  // 检查缓存
  if (audioCache.has(text)) {
    const base64Audio = audioCache.get(text)!;
    await playAudio(base64Audio);
    return;
  }

  try {
    console.log('[TTS] Requesting TTS for:', text.substring(0, 30));
    const response = await fetch('https://api.minimax.chat/v1/t2a_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'speech-02-hd',
        text: text,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error('[TTS] API error:', response.status);
      return;
    }

    const data = await response.json();
    console.log('[TTS] Response:', JSON.stringify(data).substring(0, 100));

    // MiniMax TTS 返回的是音频二进制，需要处理
    // 检查返回的数据结构
    if (data.data) {
      // 可能是 base64 编码的音频
      const audioBase64 = data.data;
      audioCache.set(text, audioBase64);
      await playAudio(audioBase64);
    } else if (data.choices) {
      console.log('[TTS] Unexpected TTS response format');
    }
  } catch (e) {
    console.error('[TTS] Error:', e);
  }
}

async function playAudio(base64Audio: string): Promise<void> {
  try {
    // 转换base64为Blob并播放
    const audioData = atob(base64Audio);
    const audioArray = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      audioArray[i] = audioData.charCodeAt(i);
    }
    const blob = new Blob([audioArray], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    
    const audio = new Audio(url);
    await audio.play();
    console.log('[TTS] Playing audio');
    
    audio.onended = () => URL.revokeObjectURL(url);
  } catch (e) {
    console.error('[TTS] Play error:', e);
  }
}

// 上下文消息模板
const CONTEXT_MESSAGES = [
  { condition: /游戏|game|王者|原神|lol|minecraft/i, messages: [
    '主人又在打游戏啦~带小伊一起嘛！',
    '哇，游戏好好玩的样子~',
    '主人打游戏好厉害的说~',
  ]},
  { condition: /代码|code|编程|terminal|vscode|git/i, messages: [
    '主人在写代码呢~需要小伊帮忙吗？',
    '编程中的主人好帅呀~',
    '小伊也想学编程呢~',
  ]},
  { condition: /视频|video|bilibili|youtube|播放/i, messages: [
    '这个视频好看吗~',
    '小伊也想看~',
    '主人看什么呢~',
  ]},
  { condition: /浏览器|chrome|edge|标签|tab/i, messages: [
    '主人在浏览网页呀~',
    '有什么有趣的内容吗~',
    '小伊也想看~',
  ]},
  { condition: /微信|qq|钉钉|飞书|discord|telegram/i, messages: [
    '主人在跟谁聊天呀~',
    '是在跟小伊聊天吗~',
    '有人找主人吗~',
  ]},
  { condition: /文档|word|excel|ppt|pdf|笔记/i, messages: [
    '主人在工作吗~辛苦了~',
    '需要小伊帮忙吗~',
    '加油加油~',
  ]},
  { condition: /图片|photo|photoshop|picsart/i, messages: [
    '哇，好漂亮的图片~',
    '主人在看什么呢~',
    '这个好好看呀~',
  ]},
  { condition: /音乐|music|spotify|网易云|qq音乐/i, messages: [
    '这首音乐好好听呀~',
    '小伊也想听~',
    '主人品味真好~',
  ]},
];

const DEFAULT_MESSAGES = [
  '主人~你在干嘛呀~',
  '小伊好无聊呀~陪小伊聊天嘛~',
  '主人已经好久没理小伊了~',
  '在想主人呢~',
  '小伊在这里等主人哦~',
];

function generateProactiveMessage(context: string): string {
  for (const item of CONTEXT_MESSAGES) {
    if (item.condition.test(context)) {
      const msgs = item.messages;
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
  }
  if (Math.random() > 0.5) {
    return DEFAULT_MESSAGES[Math.floor(Math.random() * DEFAULT_MESSAGES)];
  }
  return '';
}

// 根据消息内容更新情绪
function updateEmotionFromMessage(emotion: AppState['emotion'], message: string, isUser: boolean): AppState['emotion'] {
  const newEmotion = { ...emotion };
  
  if (isUser) {
    // 用户消息检测
    if (message.includes('喜欢') || message.includes('爱你') || message.includes('棒')) {
      newEmotion.affection = Math.min(100, emotion.affection + 5);
      newEmotion.happiness = Math.min(100, emotion.happiness + 3);
    }
    if (message.includes('累') || message.includes('困') || message.includes('辛苦')) {
      newEmotion.fatigue = Math.min(100, emotion.fatigue + 5);
    }
    if (message.includes('无聊') || message.includes('没人')) {
      newEmotion.loneliness = Math.min(100, emotion.loneliness + 5);
    }
  } else {
    // AI回复检测
    if (message.includes('~') || message.includes('！') || message.includes('🥰')) {
      newEmotion.happiness = Math.min(100, emotion.happiness + 2);
    }
  }
  
  // 自然衰减
  newEmotion.fatigue = Math.max(0, emotion.fatigue - 0.5);
  newEmotion.loneliness = Math.max(0, emotion.loneliness - 0.3);
  newEmotion.stress = Math.max(0, emotion.stress - 0.2);
  
  return newEmotion;
}

interface AppState {
  emotion: { happiness: number; fatigue: number; loneliness: number; stress: number; affection: number };
}

export function ScreenWatcher() {
  const lastScreenshotRef = useRef<string>('');
  const silenceCountRef = useRef(0);
  const { addMessage, setEmotion, emotion, messages, styleSettings, systemSettings } = useAppStore();

  // 根据速度调整基础概率
  const getBaseInterval = () => {
    switch (systemSettings.autoReplySpeed) {
      case 'slow': return 60;
      case 'fast': return 15;
      default: return systemSettings.screenWatchInterval;
    }
  };

  const interval = styleSettings.enableScreenWatch ? getBaseInterval() : 999999;

  useEffect(() => {
    if (!styleSettings.enableScreenWatch) return;

    const timer = setInterval(async () => {
      try {
        // 截屏
        const screenshot: string = await invoke('take_screenshot');
        if (screenshot === lastScreenshotRef.current) {
          return;
        }
        lastScreenshotRef.current = screenshot;

        // 检测用户活动
        silenceCountRef.current = 0;

        // 30%概率发送主动消息
        if (Math.random() > 0.7) {
          const proactiveMsg = generateProactiveMessage('用户在进行屏幕操作');
          if (proactiveMsg) {
            console.log('[ScreenWatcher] Proactive:', proactiveMsg);
            addMessage({ role: 'assistant', content: proactiveMsg });
            
            // TTS朗读（注释掉避免频繁触发）
            // await speakWithMiniMax(proactiveMsg);
            
            // 更新情绪
            const newEmotion = updateEmotionFromMessage(emotion, proactiveMsg, false);
            setEmotion(newEmotion);
          }
        }
      } catch (e) {
        console.error('[ScreenWatcher] Error:', e);
      }
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [addMessage, setEmotion, emotion, styleSettings.enableScreenWatch, interval]);

  return null;
}

// 导出TTS函数供其他组件使用
export { speakWithMiniMax };
