/**
 * AI Companion Proactive Chat System
 * 主动聊天引擎 - 在用户空闲时主动发起对话
 */

import { useAppStore } from './store';
let proactiveInterval = null;
let lastUserMessageAt = 0;
let lastProactiveMessageAt = 0;
let isGeneratingProactive = false;

// 速度配置（毫秒）
const SPEED_CONFIG = {
  slow: 180000,    // 3分钟
  normal: 90000,   // 90秒  
  fast: 45000,     // 45秒
};

// 冷却时间（毫秒）
const COOLDOWN_AFTER_USER = 30000;
const COOLDOWN_AFTER_PROACTIVE = 60000;

/**
 * 启动主动聊天检查器
 */
export function startProactiveChat() {
  if (proactiveInterval) {
    console.log('[ProactiveChat] Already running');
    return;
  }

  const state = useAppStore.getState();
  
  if (!state.styleSettings.enableAutoReply) {
    console.log('[ProactiveChat] Auto reply disabled');
    return;
  }

  const interval = SPEED_CONFIG[state.systemSettings.autoReplySpeed] || SPEED_CONFIG.normal;
  
  console.log(`[ProactiveChat] Starting with interval ${interval}ms`);
  
  proactiveInterval = setInterval(async () => {
    await checkAndProactive();
  }, interval);

  console.log('[ProactiveChat] Started successfully');
}

/**
 * 停止主动聊天
 */
export function stopProactiveChat() {
  if (proactiveInterval) {
    clearInterval(proactiveInterval);
    proactiveInterval = null;
    console.log('[ProactiveChat] Stopped');
  }
}

/**
 * 重启主动聊天（当设置变化时调用）
 */
export function restartProactiveChat() {
  stopProactiveChat();
  startProactiveChat();
}

/**
 * 记录用户发消息的时间
 */
export function onUserMessage() {
  lastUserMessageAt = Date.now();
}

/**
 * 检查是否应该主动说话
 */
async function checkAndProactive() {
  if (isGeneratingProactive) {
    return;
  }

  const state = useAppStore.getState();
  
  if (!state.styleSettings.enableAutoReply) {
    return;
  }

  const now = Date.now();

  // 冷却检查
  if (lastUserMessageAt > 0 && (now - lastUserMessageAt) < COOLDOWN_AFTER_USER) {
    console.log('[ProactiveChat] User active recently, waiting');
    return;
  }

  if (lastProactiveMessageAt > 0 && (now - lastProactiveMessageAt) < COOLDOWN_AFTER_PROACTIVE) {
    console.log('[ProactiveChat] Proactive cooldown not finished');
    return;
  }

  await generateProactiveMessage();
}

/**
 * 生成主动消息
 */
async function generateProactiveMessage() {
  isGeneratingProactive = true;
  
  try {
    const state = useAppStore.getState();
    const { memories, emotion, characterSettings } = state;

    const prompt = buildProactivePrompt(memories, emotion, characterSettings);
    
    console.log('[ProactiveChat] Generating proactive message...');
    
    // 使用API直接调用
    const reply = await callMiniMaxAPI(prompt);
    
    if (reply && reply.trim()) {
      state.addMessage({ role: 'assistant', content: reply });
      state.updateEmotionFromChat('', reply);
      lastProactiveMessageAt = Date.now();
      console.log('[ProactiveChat] Sent:', reply.substring(0, 50));
    }
  } catch (error) {
    console.error('[ProactiveChat] Failed:', error);
  } finally {
    isGeneratingProactive = false;
  }
}

/**
 * 构建主动消息提示词
 */
function buildProactivePrompt(memories, emotion, characterSettings) {
  const personalities = characterSettings.personality?.join('、') || '活泼可爱';
  
  let emotionContext = '';
  if (emotion.fatigue > 60) {
    emotionContext = '你看起来有点累了';
  } else if (emotion.affection > 70) {
    emotionContext = '你心情很好呢';
  } else if (emotion.happiness < 40) {
    emotionContext = '你好像有点不开心';
  }

  let memoryContext = '';
  if (memories && memories.length > 0) {
    const recentMemories = memories.slice(0, 3).map(m => m.content).join('；');
    memoryContext = `还记得你之前说过：${recentMemories}`;
  }

  return `你是${characterSettings.name}，一个${personalities}的AI少女。

当前情况：${emotionContext}
${memoryContext}

请主动发起一段简短的对话（1-3句话），可以是问候、关心、或者分享有趣的事情。
语气要活泼俏皮，像朋友一样自然。不要太长。
用~呀啦哦呢嘿等语气词结尾。`;
}

/**
 * 直接调用MiniMax API（简化版，不走工具调用）
 */
async function callMiniMaxAPI(prompt) {
  const state = useAppStore.getState();
  const { aiConfig } = state;
  
  const apiKey = aiConfig.apiKey;
  if (!apiKey) {
    console.error('[ProactiveChat] No API key');
    return null;
  }

  try {
    const response = await fetch(`${aiConfig.baseUrl}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error('[ProactiveChat] API error:', response.status);
      return null;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
    return reply.trim();
  } catch (error) {
    console.error('[ProactiveChat] API call failed:', error);
    return null;
  }
}
