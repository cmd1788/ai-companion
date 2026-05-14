// Browser Adapter - 浏览器/Dev/Test 运行时实现
// 不真实截屏、不真实TTS，但绝不崩溃

import { storageAdapter } from './storageAdapter';
import { networkLog } from './networkLog';
import type { ScreenCaptureResult, TTSResult, InvokeResult, EmotionState, NetworkSearchResponse, NetworkProvider } from './runtimeTypes';

export function captureScreenBrowser(): ScreenCaptureResult {
  return {
    ok: false,
    error: 'Screen capture unavailable in browser runtime',
    degraded: true,
  };
}

export function speakBrowser(_text: string): TTSResult {
  return {
    ok: false,
    error: 'TTS unavailable in browser runtime',
    degraded: true,
  };
}

export function readPhotoDirBrowser(_path: string): InvokeResult<string[]> {
  return {
    ok: false,
    error: 'Photo dir read unavailable in browser runtime',
    degraded: true,
  };
}

// ========== Mock Network Implementation ==========

// Mock 搜索结果数据
const MOCK_SEARCH_RESULTS: Record<string, any[]> = {
  '天气': [
    { title: '北京今日天气', url: 'https://weather.example.com/beijing', snippet: '今日北京晴转多云，气温15-25°C，适合出行。' },
    { title: '全国天气预报', url: 'https://weather.example.com/national', snippet: '未来三天全国大部地区气温回升，局部有雨。' },
  ],
  'ai': [
    { title: 'AI人工智能最新发展动态', url: 'https://tech.example.com/ai-news', snippet: '2024年AI领域取得重大突破，大模型能力持续提升。' },
    { title: 'ChatGPT最新版本发布', url: 'https://openai.example.com/blog', snippet: 'OpenAI发布新一代ChatGPT，支持多模态交互。' },
  ],
  'news': [
    { title: '今日最新新闻', url: 'https://news.example.com/today', snippet: '今日要闻：科技创新引领发展，AI技术持续火热。' },
    { title: '科技新闻速递', url: 'https://tech.example.com/news', snippet: '最新科技资讯一网打尽，关注科技前沿动态。' },
  ],
  'default': [
    { title: '搜索结果示例', url: 'https://search.example.com/result', snippet: '这是一个搜索结果的示例摘要，展示返回内容格式。' },
    { title: '更多搜索结果', url: 'https://search.example.com/more', snippet: '更多相关搜索结果，帮助用户找到所需信息。' },
    { title: '相关推荐', url: 'https://search.example.com/recommend', snippet: '根据您的搜索关键词，为您推荐相关热门内容。' },
  ],
};

// 从 Mock 数据中搜索
function getMockSearchResults(query: string, maxResults: number = 5): any[] {
  const lowerQuery = query.toLowerCase();
  
  // 尝试精确匹配
  for (const [key, results] of Object.entries(MOCK_SEARCH_RESULTS)) {
    if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
      return results.slice(0, maxResults);
    }
  }
  
  // 返回默认结果
  return MOCK_SEARCH_RESULTS['default'].slice(0, maxResults);
}

// Mock 搜索实现
export async function searchMock(query: string, _provider: NetworkProvider, maxResults: number = 5): Promise<NetworkSearchResponse> {
  const startTime = Date.now();
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
  
  const results = getMockSearchResults(query, maxResults);
  const duration = Date.now() - startTime;
  
  // 记录日志
  networkLog.add(query, _provider, results.length, true, undefined, duration);
  
  return {
    ok: true,
    query,
    results,
    source: 'mock',
    timestamp: Date.now(),
    summary: `找到 ${results.length} 条相关结果`,
  };
}

// ========== MiniMax MCP Search Implementation ==========

// 直接导入 mcpService 的 webSearch 函数
// 注意：这里导入的是 Browser 版本的 webSearch，它会尝试调用 MiniMax REST API

export async function searchMiniMaxMCP(query: string, _provider: NetworkProvider, maxResults: number = 5): Promise<NetworkSearchResponse> {
  const startTime = Date.now();
  
  try {
    // 动态导入 mcpService 避免循环依赖
    const { webSearch } = await import('../mcpService');
    
    const result = await webSearch(query);
    const duration = Date.now() - startTime;
    
    if (result.success && result.results) {
      const results = result.results.slice(0, maxResults);
      networkLog.add(query, 'minimax_mcp', results.length, true, undefined, duration);
      
      return {
        ok: true,
        query,
        results,
        source: 'minimax_mcp',
        timestamp: Date.now(),
        summary: `找到 ${results.length} 条相关结果（MiniMax MCP）`,
      };
    } else {
      const errorMsg = result.error || 'Unknown error';
      networkLog.add(query, 'minimax_mcp', 0, false, errorMsg, duration);
      
      return {
        ok: false,
        query,
        results: [],
        error: errorMsg,
        source: 'minimax_mcp',
        timestamp: Date.now(),
        degraded: true,
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMsg = error.message || 'Unknown error';
    
    networkLog.add(query, 'minimax_mcp', 0, false, errorMsg, duration);
    
    return {
      ok: false,
      query,
      results: [],
      error: errorMsg,
      source: 'minimax_mcp',
      timestamp: Date.now(),
      degraded: true,
    };
  }
}

// Browser fetch 搜索（可能受 CORS 限制）
export async function searchFetch(query: string, _provider: NetworkProvider, maxResults: number = 5): Promise<NetworkSearchResponse> {
  const startTime = Date.now();
  
  try {
    // 尝试使用 Google 搜索 API（可能 CORS 失败）
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=AIzaSy&cx=0175764245124&q=${encodeURIComponent(query)}&num=${maxResults}`,
      { method: 'GET', mode: 'cors' }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    const results = (data.items || []).map((item: any) => ({
      title: item.title || '无标题',
      url: item.link || '',
      snippet: item.snippet || '',
      source: item.displayLink || '',
    }));
    
    networkLog.add(query, _provider, results.length, true, undefined, duration);
    
    return {
      query,
      results,
      source: 'browser',
      timestamp: Date.now(),
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMsg = error.message || 'Unknown error';
    
    networkLog.add(query, _provider, 0, false, errorMsg, duration);
    
    // CORS 或网络错误，返回降级结果
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('CORS') || errorMsg.includes('NetworkError')) {
      return {
        query,
        results: [],
        error: 'Browser fetch blocked by CORS or network error',
        source: 'browser',
        timestamp: Date.now(),
        degraded: true,
      };
    }
    
    throw error;
  }
}

export const browserAdapter = {
  captureScreen: captureScreenBrowser,
  speak: speakBrowser,
  readPhotoDir: readPhotoDirBrowser,
  messages: storageAdapter,
  memories: storageAdapter,
  emotion: {
    save: storageAdapter.saveEmotion,
    load: storageAdapter.loadEmotion,
  },
  // 网络 API
  network: {
    search: searchMock,
    searchFetch,
    searchMiniMaxMCP,
  },
};
