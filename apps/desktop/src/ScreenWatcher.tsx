import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from './store';

// MiniMax Vision API 分析屏幕内容
async function analyzeScreenContext(imageBase64: string): Promise<string> {
  const apiKey = useAppStore.getState().aiConfig.apiKey;
  if (!apiKey) return '';

  try {
    const response = await fetch('https://api.minimax.chat/v1/video/moments/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-Hailuo-01',
        image_base64: imageBase64,
        prompt: '描述这张截图里用户在做什么（简短20字以内）'
      }),
    });
    
    if (!response.ok) return '';
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.error('[ScreenWatcher] Vision API error:', e);
    return '';
  }
}

// MiniMax TTS 朗读文本
async function speakText(text: string): Promise<void> {
  const apiKey = useAppStore.getState().aiConfig.apiKey;
  if (!apiKey) return;

  try {
    await fetch('https://api.minimax.chat/v1/t2a_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'speech-02-hd',
        text: text,
        stream: false
      }),
    });
  } catch (e) {
    console.error('[ScreenWatcher] TTS error:', e);
  }
}

interface ProactiveMessage {
  condition: RegExp;
  messages: string[];
}

const CONTEXT_MESSAGES: ProactiveMessage[] = [
  // 游戏相关
  { condition: /游戏|game|王者|原神|lol|minecraft/i, messages: [
    '主人又在打游戏啦~带小伊一起嘛！',
    '哇，游戏好好玩的样子~',
    '主人打游戏好厉害的说~',
  ]},
  // 编程相关
  { condition: /代码|code|编程|terminal|vscode|git/i, messages: [
    '主人在写代码呢~需要小伊帮忙吗？',
    '编程中的主人好帅呀~',
    '小伊也想学编程呢~',
  ]},
  // 看视频
  { condition: /视频|video|bilibili|youtube|播放/i, messages: [
    '这个视频好看吗~',
    '小伊也想看~',
    '主人看什么呢~',
  ]},
  // 看网页
  { condition: /浏览器|chrome|edge|标签|tab/i, messages: [
    '主人在浏览网页呀~',
    '有什么有趣的内容吗~',
    '小伊也想看~',
  ]},
  // 聊天软件
  { condition: /微信|qq|钉钉|飞书|discord|telegram/i, messages: [
    '主人在跟谁聊天呀~',
    '是在跟小伊聊天吗~',
    '有人找主人吗~',
  ]},
  // 文档/写作
  { condition: /文档|word|excel|ppt|pdf|笔记/i, messages: [
    '主人在工作吗~辛苦了~',
    '需要小伊帮忙吗~',
    '加油加油~',
  ]},
  // 看图片
  { condition: /图片|photo|photoshop|picsart/i, messages: [
    '哇，好漂亮的图片~',
    '主人在看什么呢~',
    '这个好好看呀~',
  ]},
  // 听音乐
  { condition: /音乐|music|spotify|网易云|qq音乐/i, messages: [
    '这首音乐好好听呀~',
    '小伊也想听~',
    '主人品味真好~',
  ]},
];

// 默认消息
const DEFAULT_MESSAGES = [
  '主人~你在干嘛呀~',
  '小伊好无聊呀~陪小伊聊天嘛~',
  '主人已经好久没理小伊了~',
  '在想主人呢~',
  '小伊在这里等主人哦~',
];

export function ScreenWatcher() {
  const [lastActivity, setLastActivity] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [interval, setIntervalSec] = useState(30); // 默认30秒
  const lastScreenshotRef = useRef<string>('');
  const lastContextRef = useRef<string>('');
  const silenceCountRef = useRef(0);

  const { addMessage, messages } = useAppStore();

  // 定期截屏和分析
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(async () => {
      console.log('[ScreenWatcher] Taking screenshot...');
      try {
        // 调用Rust命令截屏
        const screenshot: string = await invoke('take_screenshot');
        if (screenshot === lastScreenshotRef.current) {
          console.log('[ScreenWatcher] Screenshot unchanged, skipping');
          return;
        }
        lastScreenshotRef.current = screenshot;

        // 简单分析：如果截屏变化了，说明用户在活动
        const activity = '用户在进行屏幕操作';
        setLastActivity(activity);

        // 随机决定是否主动发消息 (30%概率)
        if (Math.random() > 0.7) {
          const proactiveMsg = generateProactiveMessage(activity);
          if (proactiveMsg) {
            console.log('[ScreenWatcher] Proactive message:', proactiveMsg);
            addMessage({ role: 'assistant', content: proactiveMsg });
            silenceCountRef.current = 0;
          }
        } else {
          silenceCountRef.current++;
          // 沉默太久（5分钟）主动问候
          if (silenceCountRef.current > 10) {
            const msg = DEFAULT_MESSAGES[Math.floor(Math.random() * DEFAULT_MESSAGES.length)];
            addMessage({ role: 'assistant', content: msg });
            silenceCountRef.current = 0;
          }
        }
      } catch (e) {
        console.error('[ScreenWatcher] Error:', e);
      }
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [isActive, interval, addMessage]);

  return null; // 无UI组件，仅后台运行
}

function generateProactiveMessage(context: string): string {
  for (const item of CONTEXT_MESSAGES) {
    if (item.condition.test(context)) {
      const msgs = item.messages;
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
  }
  // 如果没有匹配，随机返回默认消息或空
  if (Math.random() > 0.5) {
    return DEFAULT_MESSAGES[Math.floor(Math.random() * DEFAULT_MESSAGES.length)];
  }
  return '';
}
