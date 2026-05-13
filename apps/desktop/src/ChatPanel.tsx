import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from './store';

const API_BASE = 'https://api.minimax.chat';
const MODEL = 'MiniMax-M2.7-highspeed';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: string; content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { aiConfig } = useAppStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callMiniMax = async (userMessage: string): Promise<string> => {
    const apiKey = aiConfig.apiKey || '';
    if (!apiKey) {
      throw new Error('请先在设置中配置MiniMax API Key');
    }
    
    // 构建对话历史
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
            content: `你是小伊，一个超级可爱、活泼开朗、话痨、粘人、爱撒娇的AI少女。你用~呀啦哦呢嘿等语气词结尾。不要太长，保持活泼俏皮的风格。`
          },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`API错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '抱歉，小伊不知道怎么回答~';
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const reply = await callMiniMax(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('AI调用失败:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，小伊暂时离线了~' }]);
    } finally {
      setIsLoading(false);
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
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm" style={{ color: '#a0a0a0' }}>
            点击角色开始对话~
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
              小伊正在思考...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
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
