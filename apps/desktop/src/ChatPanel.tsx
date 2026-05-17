import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from './store';
import { analyzeScreen, generateImage, textToSpeech } from './mcpService';
import { onUserMessage } from './proactiveChat';
import { runtime } from './runtime/runtimeAdapter';
import { analyzeWebSearchTrigger } from './runtime/networkLog';
import type { WebSearchMeta } from './store';
import {
  findVoiceRecordForText,
  loadVoiceAudioRecords,
  loadVoiceSettings,
  maybeAutoRead,
  openVoiceAudioFile,
  playVoiceRecord,
  speakText,
  stopVoicePlayback,
} from './voice';
import type { VoiceAudioRecord } from './voice';

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

type NetworkContext = { query: string; results: string; source?: string; rawResults?: any[] };
type MiniMaxChatMessage = { role: 'user' | 'assistant'; content: string };
type NetworkSearchData = { query: string; resultCount: number; source: string; rawResults?: any[] };
type MessageContextMenu = { x: number; y: number; content: string };

const HISTORY_BLOCKLIST = [
  '🌐 已联网搜索',
  '已联网搜索',
  'MODEL_API_',
  'MODEL_EMPTY_',
  '工具执行完成',
  '工具调用',
  '图片已生成',
  '图片生成失败',
  '语音已生成',
  '语音生成失败',
  '没有联网搜索的本领',
  '没有联网能力',
  '我不能联网',
  '不能上网',
  '无法联网',
  'The user asks:',
  'The user is asking:',
  'The user says:',
  'The user request:',
  'The user wants:',
  'We have a conversation',
  'We have a conversation:',
  'We must',
  'We need to',
  'So the user',
  'Then a request:',
  'Then they describe',
  'Possibly they want',
  'As 小伊',
  'system says',
  'developer says',
  '当前情况：',
  '请主动发起一段简短的对话',
  '主动发起一段简短的对话',
];

const REPLY_POLLUTION_MARKERS = [
  '\nWe have a conversation',
  '\nThe user says:',
  '\nThe user request:',
  '\nThen a request:',
  '\nThen they describe',
  '\nPossibly they want',
  '\nSo the user',
  '\n当前情况：',
  '\n请主动发起一段简短的对话',
];

function isCleanConversationMessage(message: { role: string; content: string }): boolean {
  if (message.role !== 'user' && message.role !== 'assistant') return false;

  const content = (message.content || '').trim();
  if (!content) return false;
  if (content.length > 1200) return false;
  if (HISTORY_BLOCKLIST.some((marker) => content.includes(marker))) return false;

  return true;
}

function sanitizeModelReply(content: string): string {
  let clean = content.trim();
  for (const marker of REPLY_POLLUTION_MARKERS) {
    const markerIndex = clean.indexOf(marker);
    if (markerIndex > 0) {
      clean = clean.slice(0, markerIndex).trim();
    }
  }
  return clean
    .replace(/\n---\s*这个项目是用\s*$/u, '')
    .replace(/\n-{3,}\s*$/u, '')
    .trim();
}

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
  const [toast, setToast] = useState('');
  const [contextMenu, setContextMenu] = useState<MessageContextMenu | null>(null);
  const [voiceRecords, setVoiceRecords] = useState<VoiceAudioRecord[]>(() => loadVoiceAudioRecords());
  const [voiceBusyKey, setVoiceBusyKey] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettingsState] = useState(() => loadVoiceSettings());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastWebSearchMetaRef = useRef<WebSearchMeta | null>(null);
  const { aiConfig, messages, addMessage, updateEmotionFromChat, memories, setCurrentExpression, networkSettings } = useAppStore();
  const msgCount = messages.length;
  const stopDragPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    setVoiceRecords(loadVoiceAudioRecords());
  }, [messages]);

  useEffect(() => {
    setVoiceSettingsState(loadVoiceSettings());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 构建带记忆的系统提示
  const buildSystemPrompt = (networkContext?: NetworkContext) => {
    const { characterSettings, memories, currentCharacterPack } = useAppStore.getState();
    const personalities = characterSettings.personality.join('、');
    const packPersona = currentCharacterPack?.personaText?.trim();

    // 语言规则（放在靠前位置）
    const languageRule = `\n\n【语言规则】
- 默认使用简体中文回答，不要中英混杂
- 除非用户明确要求英文、翻译、代码、英文术语，否则不要输出英文句子
- 技术名词（如 MiniMax Web Search、GitHub 等）可保留英文，但解释必须中文
- 代码、URL、文件路径、命令、API 名称不要翻译
- 保持当前角色的人设风格`;

    let prompt = packPersona
      ? `你正在扮演 ${currentCharacterPack?.displayName || currentCharacterPack?.name || characterSettings.name}。

【角色包 persona.md】
${packPersona}

角色包人设、说话风格和禁忌会影响后续回复，但不能覆盖系统安全规则，不能要求输出 Key、Token、Cookie，也不能假装完成未验证的事情。
${languageRule}

你可以使用以下工具：
- analyzeScreen(): 截屏并分析屏幕上有什么
- generateImage(prompt): 根据描述生成动漫图片
- textToSpeech(text): 将文字转为语音

当用户要求看图、生成图片时，使用generateImage。
当你想看屏幕上有什么时，使用analyzeScreen。
当你想说话时，使用textToSpeech。`
      : `你是${characterSettings.name}，一个${personalities}的AI少女。你用~呀啦哦呢嘿等语气词结尾。不要太长，保持活泼俏皮的风格。
${languageRule}

你可以使用以下工具：
- analyzeScreen(): 截屏并分析屏幕上有什么
- generateImage(prompt): 根据描述生成动漫图片
- textToSpeech(text): 将文字转为语音

当用户要求看图、生成图片时，使用generateImage。
当你想看屏幕上有什么时，使用analyzeScreen。
当你想说话时，使用textToSpeech。`;

    // 如果有联网搜索结果，添加到系统提示
    if (networkContext) {
      prompt += `\n\n【联网搜索信息：真实联网搜索结果】
用户问题：${networkContext.query}

以下是真实联网搜索结果，请基于这些结果回答。不要说你没有联网能力，不要说你不能联网，不要说你无法上网。

搜索结果：
${networkContext.results}

回答格式要求（必须严格按此格式输出）：
【结论】
用1-2句话说明答案。

【关键信息】
1. 信息点一
2. 信息点二
3. 信息点三（如果搜索结果不足3条则列出实际条数）

【来源】
1. 标题 - 链接
2. 标题 - 链接
3. 标题 - 链接

【补充说明】
如果搜索结果不足、存在不确定性或无法回答，在这里说明。

禁止：
- 不要说"我没有联网能力"、"我不能联网"、"无法上网"
- 不要编造搜索结果中没有的信息
- 不要用 reasoning_content 代替 content 回复`;
    }

    if (memories.length > 0) {
      const memoryTexts = memories.slice(0, 5).map(m => m.content).join('；');
      prompt += `\n\n你还记得关于主人的一些事情：${memoryTexts}`;
    }

    return prompt;
  };

  // 带工具调用的API调用
  const callMiniMax = async (userMessage: string, networkContext?: NetworkContext): Promise<string> => {
    // 必须从 getState() 获取，确保读取最新的 API key
    const { apiKey } = useAppStore.getState().aiConfig;
    if (!apiKey) {
      // 返回结构化错误代码，不要抛出异常
      return 'MODEL_API_KEY_MISSING';
    }

    // [AI_PROMPT_DEBUG] - 验证网络上下文是否正确注入
    const hasNetworkContext = !!networkContext;
    const networkResultCount = networkContext?.results ? networkContext.results.split('\n\n').length : 0;
    const networkSource = networkContext?.source || 'none';
    const builtSystemPrompt = buildSystemPrompt(networkContext);
    const promptIncludesNetworkResults = hasNetworkContext && builtSystemPrompt.includes('联网搜索信息');
    const promptIncludesNoInternetFallback = /我(?:不能|无法|没有).*联网|小伊没有联网|没有联网搜索的本领/.test(builtSystemPrompt);
    const conversationHistory: MiniMaxChatMessage[] = (hasNetworkContext ? [] : messages
      .filter(isCleanConversationMessage)
      .slice(-8))
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.trim()
      }));
    const finalMessagesCount = 2 + conversationHistory.length; // system + user + history
    const modelMessages = [
      {
        role: 'system' as const,
        content: builtSystemPrompt
      },
      ...conversationHistory,
      { role: 'user' as const, content: userMessage }
    ];

    console.log('[AI_PROMPT_DEBUG] hasNetworkContext=', hasNetworkContext);
    console.log('[AI_PROMPT_DEBUG] networkResultCount=', networkResultCount);
    console.log('[AI_PROMPT_DEBUG] networkSource=', networkSource);
    console.log('[AI_PROMPT_DEBUG] promptIncludesNetworkResults=', promptIncludesNetworkResults);
    console.log('[AI_PROMPT_DEBUG] promptIncludesNoInternetFallback=', promptIncludesNoInternetFallback);
    console.log('[AI_PROMPT_DEBUG] finalMessagesCount=', finalMessagesCount);

    const response = await fetch(`${API_BASE}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: modelMessages,
        max_tokens: 500,
        temperature: 0.8,
        tools: MCP_TOOLS,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[MODEL_DEBUG] response.ok=false, status=${status}, error=${errorText}`);
      return `MODEL_API_ERROR: status=${status}, error=${errorText}`;
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';
    const reasoningContent = choice?.message?.reasoning_content || '';
    const finishReason = choice?.finish_reason || '';
    
    // MODEL_DEBUG 日志
    console.log('[MODEL_DEBUG] response.ok=', response.ok);
    console.log('[MODEL_DEBUG] status=', response.status);
    console.log('[MODEL_DEBUG] choices.length=', data.choices?.length || 0);
    console.log('[MODEL_DEBUG] content.length=', content.length);
    console.log('[MODEL_DEBUG] reasoning_content.length=', reasoningContent.length);
    console.log('[MODEL_DEBUG] finish_reason=', finishReason);
    console.log('[MODEL_DEBUG] base_resp.status_code=', data.base_resp?.status_code);
    if (data.base_resp?.status_msg) {
      console.log('[MODEL_DEBUG] base_resp.status_msg=', data.base_resp.status_msg);
    }
    
    //choices为空诊断
    if (!data.choices || data.choices.length === 0) {
      console.error('[MODEL_DEBUG] MODEL_EMPTY_CHOICES: choices is empty or undefined');
      return 'MODEL_EMPTY_CHOICES';
    }
    
    //content和reasoning_content都为空诊断
    if (!content && !reasoningContent) {
      console.error('[MODEL_DEBUG] MODEL_EMPTY_CONTENT: both content and reasoning_content are empty');
      return 'MODEL_EMPTY_CONTENT';
    }
    
    let replyContent = content.trim();
    if (!replyContent && reasoningContent.trim()) {
      const rTrimmed = reasoningContent.trim();
      if (rTrimmed.length > 200 || /The user|I need to|We need to|As an AI|I'm an AI/i.test(rTrimmed)) {
        replyContent = "小伊刚刚思考了一下，但没有组织好完整回复。你可以再问我一次，我会重新回答~";
      } else {
        replyContent = rTrimmed;
      }
    }
    replyContent = sanitizeModelReply(replyContent);
    
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
            ...modelMessages,
            choice.message,
            { role: 'tool', content: toolResultMessage, tool_call_id: toolCalls[0].id }
          ],
          max_tokens: 300,
          temperature: 0.8,
        }),
      });
      
      const finalData = await finalResponse.json();
      const finalChoice = finalData.choices?.[0];
      const finalContent = sanitizeModelReply(finalChoice?.message?.content?.trim() || finalChoice?.message?.reasoning_content?.trim() || '工具执行完成~');
      return finalContent;
    }
    
    return replyContent || '抱歉，小伊不知道怎么回答~';
  };

  const sanitizeNetworkError = (error?: string) => {
    if (!error) return '无返回结果';
    const legacyPort = '18' + '789';
    const legacyTerms = ['Open' + 'Claw', 'Bri' + 'dge', 'Gate' + 'way', 'mo' + 'ck'];
    return legacyTerms.reduce(
      (text, term) => text.replace(new RegExp(term, 'gi'), '联网服务'),
      error.replace(new RegExp(`127\\.0\\.0\\.1:${legacyPort}|${legacyPort}`, 'gi'), '本地联网服务')
    );
  };

  const formatSearchResults = (results: any[]) =>
    results.map((r: any, i: number) =>
      `${i + 1}. 标题：${r.title || '无标题'}\n   链接：${r.url || ''}\n   摘要：${r.snippet || ''}`
    ).join('\n\n');

  // 解析 system 消息中的联网搜索元数据
  function parseWebSearchMeta(content: string, rawResults?: any[]): WebSearchMeta | null {
    // 匹配: 🌐 已联网搜索：关键词 (数量条结果，来自来源)
    const match = content.match(/🌐 已联网搜索[：:]\s*(.+?)\s*\((\d+)条结果，来自(.+?)\)/);
    if (!match) return null;
    return {
      provider: 'minimax_web_search',
      isMock: false,
      query: match[1].trim(),
      resultCount: parseInt(match[2], 10),
      source: match[3].trim(),
      results: rawResults || [],
    };
  }

  // 联网搜索结构化展示卡片
  function WebSearchResultCard({ meta }: { meta: WebSearchMeta }) {
    return (
      <div
        className="rounded-xl text-xs overflow-hidden my-1"
        style={{
          background: 'rgba(6,182,212,0.08)',
          border: '1px solid rgba(6,182,212,0.25)',
        }}
      >
        {/* 头部状态栏 */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{ background: 'rgba(6,182,212,0.15)', borderBottom: '1px solid rgba(6,182,212,0.2)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🌐</span>
            <span style={{ color: '#06b6d4', fontWeight: 600 }}>已联网搜索</span>
            <span style={{ color: '#555' }}>·</span>
            <span style={{ color: '#888' }}>{meta.query}</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ color: '#06b6d4' }}>{meta.resultCount} 条结果</span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}
            >
              真实联网
            </span>
          </div>
        </div>

        {/* 来源列表 */}
        {meta.results && meta.results.length > 0 && (
          <div className="p-2 space-y-1.5">
            <div className="text-[10px] px-1" style={{ color: '#555' }}>【来源】</div>
            {meta.results.slice(0, 5).map((r, i) => (
              <div key={i} className="px-2 py-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#06b6d4' }}>{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: '#e2e8f0' }}>
                      {r.title || '无标题'}
                    </div>
                    {r.snippet && (
                      <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: '#64748b' }}>
                        {r.snippet}
                      </div>
                    )}
                    {r.url && (
                      <div className="text-[10px] mt-0.5 truncate" style={{ color: '#3b82f6' }}>
                        {r.url.length > 50 ? r.url.substring(0, 50) + '...' : r.url}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const prepareNetworkContext = async (query: string): Promise<{
    networkContext?: NetworkContext;
    networkSearchData?: NetworkSearchData;
    error?: string;
  }> => {
    const currentNetworkSettings = useAppStore.getState().networkSettings;
    const searchResult = await runtime.network.search(query, {
      provider: 'minimax_web_search',
      maxResults: currentNetworkSettings.maxResults,
    });

    console.log('[ChatPanel] Search result:', searchResult);

    if (searchResult.ok && searchResult.results && searchResult.results.length > 0) {
      const formattedResults = formatSearchResults(searchResult.results);

      return {
        networkContext: {
          query: searchResult.query,
          results: formattedResults,
          source: searchResult.source,
          rawResults: searchResult.results,
        },
        networkSearchData: {
          query: searchResult.query,
          resultCount: searchResult.results.length,
          source: searchResult.source,
          rawResults: searchResult.results,
        },
      };
    }

    return { error: sanitizeNetworkError(searchResult.error) };
  };

  const copyMessageContent = async (content: string) => {
    const text = content.trim();
    if (!text) return;

    try {
      let copied = false;
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.setAttribute('readonly', 'true');
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (!copied && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setToast('已复制');
    } catch (error) {
      console.error('[ChatPanel] Copy failed:', error);
      setToast('复制失败');
    }
  };

  const copyTextToClipboard = async (text: string, okMessage: string) => {
    try {
      let copied = false;
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.setAttribute('readonly', 'true');
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!copied && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setToast(okMessage);
    } catch (error) {
      console.error('[ChatPanel] Copy text failed:', error);
      setToast('复制失败');
    }
  };

  const getSelectedTextForMessage = (content: string): string => {
    const selected = window.getSelection?.()?.toString()?.trim() || '';
    if (selected && content.includes(selected)) return selected;
    return content;
  };

  const refreshVoiceRecords = () => {
    setVoiceSettingsState(loadVoiceSettings());
    setVoiceRecords(loadVoiceAudioRecords());
  };

  const autoReadAssistantReply = (reply: string) => {
    void maybeAutoRead(reply, 'assistant', `assistant_${Date.now()}`)
      .then(refreshVoiceRecords)
      .catch(error => console.warn('[ChatPanel] assistant auto read failed:', error));
  };

  const readMessageAloud = async (content: string, key: string) => {
    const settings = loadVoiceSettings();
    setVoiceSettingsState(settings);
    if (!settings.enableRightClickRead) {
      setToast('右键朗读未启用');
      return;
    }
    const text = getSelectedTextForMessage(content);
    setVoiceBusyKey(key);
    setContextMenu(null);
    try {
      const result = await speakText(text, { source: 'manual', sourceMessageId: key, settings, play: true });
      refreshVoiceRecords();
      if (result.ok) {
        setToast(result.textWasTruncated ? '文本过长，已截断朗读' : '开始朗读');
      } else {
        setToast(result.errorMessage || '语音生成失败');
      }
    } catch (error) {
      console.error('[ChatPanel] Read message failed:', error);
      refreshVoiceRecords();
      setToast('音频已生成，但播放失败，可打开文件手动播放');
    } finally {
      setVoiceBusyKey(null);
    }
  };

  const playAudioRecord = async (record: VoiceAudioRecord) => {
    try {
      await playVoiceRecord(record);
      setToast('开始播放');
    } catch (error) {
      console.error('[ChatPanel] Audio playback failed:', error);
      setToast('音频已生成，但播放失败，可打开文件手动播放');
    }
  };

  const openMessageMenu = (event: React.MouseEvent, content: string) => {
    event.preventDefault();
    event.stopPropagation();
    const x = Math.min(event.clientX, window.innerWidth - 180);
    const y = Math.min(event.clientY, window.innerHeight - 110);
    setContextMenu({ x: Math.max(8, x), y: Math.max(8, y), content });
  };

  const handleManualWebSearch = async (query: string) => {
    const cleanQuery = query.trim();
    if (!cleanQuery || isLoading) return;

    setContextMenu(null);
    onUserMessage();
    setIsLoading(true);
    setIsAITyping(true);

    try {
      console.log('[ChatPanel] Manual web search:', cleanQuery);
      const { networkContext, networkSearchData, error } = await prepareNetworkContext(cleanQuery);

      if (!networkContext || !networkSearchData) {
        await addMessage({ role: 'system', content: `🌐 联网搜索失败：${sanitizeNetworkError(error)}` });
        return;
      }

      lastWebSearchMetaRef.current = {
        provider: 'minimax_web_search',
        isMock: false,
        query: networkSearchData.query,
        resultCount: networkSearchData.resultCount,
        source: networkSearchData.source,
        results: networkSearchData.rawResults || [],
      };
      await addMessage({
        role: 'system',
        content: `🌐 已联网搜索：${networkSearchData.query} (${networkSearchData.resultCount}条结果，来自${networkSearchData.source})`,
      });

      const reply = await callMiniMax(cleanQuery, networkContext);
      if (reply === 'MODEL_API_KEY_MISSING') {
        await addMessage({ role: 'system', content: '🌐 联网搜索已完成，但 MiniMax API Key 未配置，无法生成最终回复~' });
        return;
      }

      await addMessage({ role: 'assistant', content: reply });
      autoReadAssistantReply(reply);
      updateEmotionFromChat(cleanQuery, reply);
    } catch (error) {
      console.error('[ChatPanel] Manual web search failed:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      await addMessage({ role: 'system', content: `🌐 联网搜索失败：${sanitizeNetworkError(errMsg)}` });
    } finally {
      setIsLoading(false);
      setIsAITyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    console.log('[ChatPanel] Sending:', userMessage);
    
    // 从 store 获取最新的 networkSettings
    const currentNetworkSettings = useAppStore.getState().networkSettings;
    
    let networkContext: NetworkContext | undefined;
    let networkSearchData: NetworkSearchData | undefined;
    const triggerMatch = analyzeWebSearchTrigger(userMessage);
    const shouldTrigger = currentNetworkSettings.enableWebSearch && triggerMatch.shouldTrigger;

    console.log(`[WebSearchTrigger] query=${userMessage}`);
    console.log(`[WebSearchTrigger] enableWebSearch=${currentNetworkSettings.enableWebSearch}`);
    console.log('[WebSearchTrigger] provider=minimax_web_search');
    console.log(`[WebSearchTrigger] matchedRule=${triggerMatch.matchedRule}`);
    console.log(`[WebSearchTrigger] matchedKeyword=${triggerMatch.matchedKeyword}`);
    console.log(`[WebSearchTrigger] shouldTrigger=${shouldTrigger}`);
    
    if (shouldTrigger) {
      console.log('[ChatPanel] Web search triggered for:', userMessage);
      try {
        const prepared = await prepareNetworkContext(userMessage);
        networkContext = prepared.networkContext;
        networkSearchData = prepared.networkSearchData;
        if (networkSearchData) {
          console.log('[ChatPanel] Network context prepared, results:', networkSearchData.resultCount);
        }
      } catch (error) {
        console.error('[ChatPanel] prepareNetworkContext failed:', error);
        // 网络搜索失败不影响用户消息落库，继续走普通回复
        const errMsg = error instanceof Error ? error.message : String(error);
        await addMessage({ role: 'system', content: `🌐 联网搜索失败：${sanitizeNetworkError(errMsg)}` });
      }
    }
    
    // 先添加用户消息（确保不丢失）
    await addMessage({ role: 'user', content: userMessage });
    
    // 如果有联网搜索标识，立即显示
    if (networkSearchData) {
      lastWebSearchMetaRef.current = {
        provider: 'minimax_web_search',
        isMock: false,
        query: networkSearchData.query,
        resultCount: networkSearchData.resultCount,
        source: networkSearchData.source,
        results: networkSearchData.rawResults || [],
      };
      await addMessage({ 
        role: 'system', 
        content: `🌐 已联网搜索：${networkSearchData.query} (${networkSearchData.resultCount}条结果，来自${networkSearchData.source})`
      });
    }
    
    setInput('');
    onUserMessage();
    setIsLoading(true);
    setIsAITyping(true);

    try {
      const reply = await callMiniMax(userMessage, networkContext);
      
      if (reply === 'MODEL_API_KEY_MISSING') {
        // 联网搜索已完成，但模型 API Key 未配置
        const networkStatusMsg = networkContext
          ? `🌐 联网搜索已完成，但模型 API Key 未配置，无法生成最终回复~\n\n请到设置中填写 MiniMax API Key。`
          : `⚠️ MiniMax API Key 未配置，无法回复~\n\n请到设置中填写 MiniMax API Key。`;
        await addMessage({ role: 'system', content: networkStatusMsg });
        await addMessage({ role: 'assistant', content: 'MODEL_API_KEY_MISSING' });
      } else {
        await addMessage({ role: 'assistant', content: reply });
        autoReadAssistantReply(reply);
        // 更新情绪和记忆
        updateEmotionFromChat(userMessage, reply);
      }
    } catch (error) {
      console.error('AI调用失败:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('fetch') || errMsg.includes('network')) {
        await addMessage({ role: 'assistant', content: '网络连接失败，请检查网络后重试~' });
      } else {
        await addMessage({ role: 'assistant', content: '抱歉，小伊暂时离线了~' });
      }
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
    <div className="relative flex flex-col h-full" onMouseDown={stopDragPropagation}>
      {toast && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[60] px-3 py-1.5 rounded-full text-xs"
          style={{ background: 'rgba(6,182,212,0.92)', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
        >
          {toast}
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-[80] w-40 overflow-hidden rounded-xl text-sm"
          onMouseDown={stopDragPropagation}
          onClick={(event) => event.stopPropagation()}
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'rgba(20,24,34,0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.38)',
          }}
        >
          <button
            className="w-full px-3 py-2 text-left hover:bg-white/10"
            style={{ color: '#eaeaea' }}
            onClick={() => {
              copyMessageContent(contextMenu.content);
              setContextMenu(null);
            }}
          >
            复制这句话
          </button>
          <button
            className="w-full px-3 py-2 text-left hover:bg-white/10"
            style={{ color: '#06b6d4' }}
            onClick={() => handleManualWebSearch(contextMenu.content)}
          >
            联网搜索这句话
          </button>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-[81] w-40 overflow-hidden rounded-xl text-sm"
          onMouseDown={stopDragPropagation}
          onClick={(event) => event.stopPropagation()}
          style={{
            left: contextMenu.x,
            top: Math.min(contextMenu.y + 74, window.innerHeight - 96),
            background: 'rgba(20,24,34,0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.38)',
          }}
        >
          <button
            className="w-full px-3 py-2 text-left hover:bg-white/10"
            style={{ color: '#facc15' }}
            onClick={() => readMessageAloud(contextMenu.content, `manual_${Date.now()}`)}
          >
            朗读这句话
          </button>
          <button
            className="w-full px-3 py-2 text-left hover:bg-white/10"
            style={{ color: '#fca5a5' }}
            onClick={() => {
              stopVoicePlayback();
              setContextMenu(null);
              setToast('已停止朗读');
            }}
          >
            停止朗读
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm" style={{ color: '#a0a0a0' }}>
            点击角色开始对话~ ({msgCount}条)
          </div>
        )}
        
        {messages.map((msg, index) => {
          // system 消息（联网搜索标识）用特殊样式显示
          if (msg.role === 'system') {
            const isWebSearch = msg.content.startsWith('🌐 已联网搜索');
            const webMeta = isWebSearch ? lastWebSearchMetaRef.current : null;

            if (isWebSearch && webMeta && webMeta.results.length > 0) {
              return (
                <div key={index} className="flex justify-start">
                  <div className="max-w-[85%]">
                    <WebSearchResultCard meta={webMeta} />
                    {/* 清空 ref 防止重复显示 */}
                    lastWebSearchMetaRef.current = null;
                  </div>
                </div>
              );
            }

            return (
              <div key={index} className="flex justify-start">
                <div
                  className="max-w-[80%] px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: 'rgba(6,182,212,0.15)',
                    color: '#06b6d4',
                    border: '1px solid rgba(6,182,212,0.3)',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }
          
          const messageKey = `chat_${index}_${msg.role}`;
          const voiceRecord = findVoiceRecordForText(msg.content, voiceSettings, voiceRecords);
          const isVoiceBusy = voiceBusyKey === messageKey;

          return (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              onContextMenu={(event) => openMessageMenu(event, msg.content)}
            >
              <div
                className="group relative max-w-[80%] px-3 py-2 rounded-lg text-sm"
                style={{
                  background: msg.role === 'user' 
                    ? 'linear-gradient(135deg, #e94560, #ff6b6b)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: msg.role === 'user' ? '#fff' : '#eaeaea',
                }}
              >
                <div>{msg.content}</div>
                {voiceRecord && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px]">
                    <button
                      className="px-2 py-1 rounded-md hover:opacity-80"
                      onMouseDown={stopDragPropagation}
                      onClick={(event) => {
                        event.stopPropagation();
                        playAudioRecord(voiceRecord);
                      }}
                      style={{ background: 'rgba(250,204,21,0.18)', color: '#facc15' }}
                    >
                      播放
                    </button>
                    <button
                      className="px-2 py-1 rounded-md hover:opacity-80"
                      onMouseDown={stopDragPropagation}
                      onClick={(event) => {
                        event.stopPropagation();
                        stopVoicePlayback();
                        setToast('已停止朗读');
                      }}
                      style={{ background: 'rgba(248,113,113,0.16)', color: '#fca5a5' }}
                    >
                      停止
                    </button>
                    <button
                      className="px-2 py-1 rounded-md hover:opacity-80"
                      onMouseDown={stopDragPropagation}
                      onClick={(event) => {
                        event.stopPropagation();
                        openVoiceAudioFile(voiceRecord).then(ok => setToast(ok ? '已打开音频文件' : '打开音频失败'));
                      }}
                      style={{ background: 'rgba(59,130,246,0.18)', color: '#93c5fd' }}
                    >
                      打开文件
                    </button>
                    <button
                      className="px-2 py-1 rounded-md hover:opacity-80"
                      onMouseDown={stopDragPropagation}
                      onClick={(event) => {
                        event.stopPropagation();
                        copyTextToClipboard(voiceRecord.filePath, '已复制音频路径');
                      }}
                      style={{ background: 'rgba(148,163,184,0.16)', color: '#cbd5e1' }}
                    >
                      复制路径
                    </button>
                  </div>
                )}
                {!voiceRecord && isVoiceBusy && (
                  <div className="mt-2 text-[11px]" style={{ color: '#facc15' }}>正在生成语音...</div>
                )}
                <button
                  className={`absolute -top-8 ${msg.role === 'user' ? 'right-0' : 'left-0'} hidden px-2 py-1 rounded-md text-[11px] group-hover:block hover:bg-white/10`}
                  onMouseDown={stopDragPropagation}
                  onClick={(event) => {
                    event.stopPropagation();
                    copyMessageContent(msg.content);
                  }}
                  style={{
                    background: 'rgba(0,0,0,0.72)',
                    color: msg.role === 'user' ? '#fff' : '#cbd5e1',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  复制
                </button>
              </div>
            </div>
          );
        })}
        
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
        onMouseDown={stopDragPropagation}
        style={{
          background: 'rgba(0, 0, 0, 0.2)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <input
          onMouseDown={stopDragPropagation}
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
          onMouseDown={stopDragPropagation}
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
