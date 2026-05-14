import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from './store';
import { analyzeScreen, generateImage, textToSpeech } from './mcpService';

const API_BASE = 'https://api.minimax.chat';
const MODEL = 'MiniMax-M2.7-highspeed';

// MCP工具定义
const MCP_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'analyzeScreen',
      description: '截取当前屏幕并分析内容。当你想看看屏幕上有什么时调用。',
      parameters: {
        type: 'object',
        properties: {
          imagePath: { type: 'string', description: '可选，指定图片路径。如果不提供则截取当前屏幕。' }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'generateImage',
      description: '根据描述生成动漫风格图片。用于配图、头像、表情包等。',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: '图片描述，要生成什么样的动漫图片。' },
          outputPath: { type: 'string', description: '可选，保存路径。默认保存到E盘下载目录。' }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'textToSpeech',
      description: '将文字转换为语音。让AI角色开口说话。',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '要说的内容。' },
          outputPath: { type: 'string', description: '可选，保存路径。默认保存到hermes音频目录。' }
        }
      }
    }
  }
];

// 处理AI工具调用
async function handleToolCall(toolName: string, args: Record<string, unknown>): Promise<string> {
  console.log('[ChatPanel] AI调用工具:', toolName, args);
  
  try {
    switch (toolName) {
      case 'analyzeScreen': {
        const imagePath = args.imagePath as string | undefined;
        const result = await analyzeScreen(imagePath);
        return result;
      }
      case 'generateImage': {
        const prompt = args.prompt as string;
        const outputPath = args.outputPath as string | undefined;
        const result = await generateImage(prompt, outputPath);
        if (result.success) {
          return `图片已生成并保存到: ${result.path}`;
        } else {
          return `图片生成失败: ${result.error}`;
        }
      }
      case 'textToSpeech': {
        const text = args.text as string;
        const outputPath = args.outputPath as string | undefined;
        const result = await textToSpeech(text, outputPath);
        if (result.success) {
          return `语音已生成并保存到: ${result.path}`;
        } else {
          return `语音生成失败: ${result.error}`;
        }
      }
      default:
        return `未知工具: ${toolName}`;
    }
  } catch (e) {
    console.error('[ChatPanel] 工具调用失败:', e);
    return `工具调用出错: ${e}`;
  }
}

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { aiConfig, messages, addMessage, updateEmotionFromChat, memories, setCurrentExpression } = useAppStore();
  const msgCount = messages.length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 构建带记忆的系统提示
  const buildSystemPrompt = () => {
    const { characterSettings, memories } = useAppStore.getState();
    const personalities = characterSettings.personality.join('、');
    let prompt = `你是${characterSettings.name}，一个${personalities}的AI少女。你用~呀啦哦呢嘿等语气词结尾。不要太长，保持活泼俏皮的风格。

你可以使用以下工具：
- analyzeScreen(): 截屏并分析屏幕上有什么
- generateImage(prompt): 根据描述生成动漫图片
- textToSpeech(text): 将文字转为语音

当用户要求看图、生成图片时，使用generateImage。
当你想看屏幕上有什么时，使用analyzeScreen。
当你想说话时，使用textToSpeech。

每次回复可以根据情况调用1-2个工具，但不要过度使用。`;

    if (memories.length > 0) {
      const memoryTexts = memories.slice(0, 5).map(m => m.content).join('；');
      prompt += `\n\n你还记得关于主人的一些事情：${memoryTexts}`;
    }

    return prompt;
  };

  // 带工具调用的API调用
  const callMiniMax = async (userMessage: string): Promise<string> => {
    const apiKey = aiConfig.apiKey || '';
    if (!apiKey) {
      throw new Error('请先在设置中配置MiniMax API Key');
    }
    
    const conversationHistory = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));
    
    const response = await fetch(`${API_BASE}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt()
          },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.8,
        tools: MCP_TOOLS,
      }),
    });

    if (!response.ok) {
      throw new Error(`API错误: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    
    // 兼容处理：content为空时使用reasoning_content
    let replyContent = choice?.message?.content || choice?.message?.reasoning_content || '';
    
    // 检查是否有工具调用
    if (choice?.finish_reason === 'tool_calls' || choice?.message?.tool_calls) {
      const toolCalls = choice.message.tool_calls;
      console.log('[ChatPanel] AI请求调用工具:', toolCalls.length);
      
      // 依次执行工具调用
      let toolResults: string[] = [];
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        // 根据工具更新表情
        if (toolName === 'generateImage') {
          setCurrentExpression('11_excited'); // 兴奋表情
        } else if (toolName === 'analyzeScreen') {
          setCurrentExpression('04_surprised'); // 惊讶表情
        } else if (toolName === 'textToSpeech') {
          setCurrentExpression('01_happy'); // 开心表情
        }
        
        const result = await handleToolCall(toolName, toolArgs);
        toolResults.push(`[${toolName}] ${result}`);
      }
      
      // 将工具结果告诉AI，让它生成最终回复
      const toolResultMessage = toolResults.join('\n');
      
      // 第二次调用，获取最终回复
      const finalResponse = await fetch(`${API_BASE}/v1/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: buildSystemPrompt()
            },
            ...conversationHistory,
            { role: 'user', content: userMessage },
            choice.message,
            { role: 'tool', content: toolResultMessage, tool_call_id: toolCalls[0].id }
          ],
          max_tokens: 300,
          temperature: 0.8,
        }),
      });
      
      const finalData = await finalResponse.json();
      const finalChoice = finalData.choices?.[0];
      const finalContent = finalChoice?.message?.content || finalChoice?.message?.reasoning_content || '工具执行完成~';
      return finalContent;
    }
    
    return replyContent || '抱歉，小伊不知道怎么回答~';
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    console.log('[ChatPanel] Sending:', userMessage);
    setInput('');
    await addMessage({ role: 'user', content: userMessage });
    setIsLoading(true);
    setIsAITyping(true);

    try {
      const reply = await callMiniMax(userMessage);
      addMessage({ role: 'assistant', content: reply });
      
      // 更新情绪和记忆
      updateEmotionFromChat(userMessage, reply);
    } catch (error) {
      console.error('AI调用失败:', error);
      addMessage({ role: 'assistant', content: '抱歉，小伊暂时离线了~' });
    } finally {
      setIsLoading(false);
      setIsAITyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm" style={{ color: '#a0a0a0' }}>
            点击角色开始对话~ ({msgCount}条)
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[80%] px-3 py-2 rounded-lg text-sm"
              style={{
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #e94560, #ff6b6b)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: msg.role === 'user' ? '#fff' : '#eaeaea',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#a0a0a0' }}
            >
              {isAITyping ? '小伊正在使用超能力...' : '小伊正在思考...'}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div
        className="flex items-center gap-2 p-3"
        style={{
          background: 'rgba(0, 0, 0, 0.2)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="说点什么..."
          className="flex-1 px-3 py-2 rounded-full text-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#eaeaea',
            border: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{
            background: input.trim() ? '#e94560' : 'rgba(255, 255, 255, 0.1)',
            color: input.trim() ? '#fff' : '#a0a0a0',
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
