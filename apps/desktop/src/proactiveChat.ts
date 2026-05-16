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
  test: 5000,      // 测试模式 5秒
};

// 冷却时间（毫秒）
const COOLDOWN_CONFIG = {
  user: 30000,        // 用户发消息后冷却
  proactive: 60000,   // 主动消息冷却
  test: {
    user: 3000,       // 测试模式：用户冷却 3秒
    proactive: 5000,   // 测试模式：主动冷却 5秒
  }
};

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

  // 检查测试模式
  const isTestMode = typeof window !== 'undefined' && (window as any).__AI_COMPANION_TEST_MODE__ === true;
  const interval = isTestMode ? SPEED_CONFIG.test : (SPEED_CONFIG[state.systemSettings.autoReplySpeed] || SPEED_CONFIG.normal);
  
  console.log(`[ProactiveChat] Starting with interval ${interval}ms${isTestMode ? ' (TEST MODE)' : ''}`);
  
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
  
  // 检查测试模式
  const isTestMode = typeof window !== 'undefined' && (window as any).__AI_COMPANION_TEST_MODE__ === true;
  
  // 获取冷却时间配置
  const cooldownUser = isTestMode ? COOLDOWN_CONFIG.test.user : COOLDOWN_CONFIG.user;
  const cooldownProactive = isTestMode ? COOLDOWN_CONFIG.test.proactive : COOLDOWN_CONFIG.proactive;

  // 冷却检查
  if (lastUserMessageAt > 0 && (now - lastUserMessageAt) < cooldownUser) {
    if (isTestMode) console.log('[ProactiveChat][TEST] User active recently, waiting');
    return;
  }

  if (lastProactiveMessageAt > 0 && (now - lastProactiveMessageAt) < cooldownProactive) {
    if (isTestMode) console.log('[ProactiveChat][TEST] Proactive cooldown not finished');
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
  // 必须从 getState() 获取最新的 API key
  const { apiKey, baseUrl, model } = useAppStore.getState().aiConfig;
  
  // API Key 缺失诊断
  if (!apiKey) {
    console.error('[MODEL_DEBUG][Proactive] API_KEY_MISSING: apiKey is empty');
    return 'PROACTIVE_MODEL_API_KEY_MISSING';
  }

  try {
    const response = await fetch(`${baseUrl}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    // MODEL_DEBUG 日志
    console.log('[MODEL_DEBUG][Proactive] response.ok=', response.ok);
    console.log('[MODEL_DEBUG][Proactive] status=', response.status);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[MODEL_DEBUG][Proactive] API_ERROR: status=${response.status}, error=${errorText}`);
      return `PROACTIVE_MODEL_API_ERROR: status=${response.status}`;
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || '';
    const reasoningContent = data.choices?.[0]?.message?.reasoning_content || '';
    // 如果 content 为空但有 reasoning_content，检测是否为英文推理
    if (!reply.trim() && reasoningContent.trim()) {
      const rTrimmed = reasoningContent.trim();
      if (rTrimmed.length > 200 || /The user|I need to|We need to|As an AI|I'm an AI/i.test(rTrimmed)) {
        reply = '小伊刚刚在想点有趣的事情~';
      } else {
        reply = rTrimmed;
      }
    }
    // 对回复做中文清洗
    const CHINESE_POLLUTION_PATTERNS = [
      /^(The user|I need to|We need to|As an AI|I'm an AI)/i,
      /Here is (the|my)/i,
      /Sure,? (here|let me|I can)/i,
      /Let me (search|find|check|look)/i,
      /\*\*/g,
    ];
    for (const pattern of CHINESE_POLLUTION_PATTERNS) {
      reply = reply.replace(pattern, '');
    }
    reply = reply.trim();
    if (!reply) return '小伊刚刚在想点有趣的事情~';
    
    console.log('[MODEL_DEBUG][Proactive] content.length=', reply.length);
    console.log('[MODEL_DEBUG][Proactive] base_resp.status_code=', data.base_resp?.status_code);
    
    // API返回空内容诊断
    if (!reply || !reply.trim()) {
      console.error('[MODEL_DEBUG][Proactive] MODEL_EMPTY_CONTENT: reply is empty');
      return 'PROACTIVE_MODEL_EMPTY_CONTENT';
    }
    
    return reply.trim();
  } catch (error) {
    console.error('[MODEL_DEBUG][Proactive] API call failed:', error.message);
    return 'PROACTIVE_MODEL_CALL_FAILED';
  }
}
