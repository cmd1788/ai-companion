// MiniMax MCP服务 - AI自主调用
// 使用 Runtime Adapter 处理 Tauri 调用，不直接调用 invoke
// API Key 从设置中读取，不硬编码

import { runtime } from './runtime/runtimeAdapter';
import { useAppStore } from './store';

const VISION_API_URL = 'https://api.minimax.chat/v1/vision';
const IMAGE_API_URL = 'https://api.minimax.chat/v1/image_generation';
const TTS_API_URL = 'https://api.minimax.chat/v1/t2a_v2';
const SEARCH_API_URL = 'https://api.minimax.chat/v1/search'; // MiniMax 搜索 API

// 获取当前 API Key - 从设置中读取，永不硬编码
function getApiKey(): string {
  try {
    const state = useAppStore.getState();
    return state.aiConfig?.apiKey || '';
  } catch {
    return '';
  }
}

// 获取 Masked Key 用于显示
export function getMaskedApiKey(): string {
  const key = getApiKey();
  if (!key) return '[未填写]';
  if (key.length < 8) return '***';
  return key.substring(0, 6) + '...' + key.substring(key.length - 4);
}

// Base64转数组
function arrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 截图理解 - AI可以主动截屏并分析
export async function analyzeScreen(imagePath?: string): Promise<string> {
  try {
    let base64: string;
    
    if (imagePath) {
      // 读取指定图片 - 通过 runtime
      const result = await runtime.diagnostics.exportState?.() || {};
      if (runtime.isTauri()) {
        const readResult = await (await import('./runtime/tauriAdapter')).tauriAdapter.invokeSafe<number[]>('read_file_base64', { path: imagePath });
        if (!readResult.ok) {
          return `读取图片失败: ${readResult.error}`;
        }
        base64 = arrayToBase64(new Uint8Array(readResult.data!));
      } else {
        return '截图理解在浏览器模式下不可用';
      }
    } else {
      // 截取当前屏幕 - 通过 runtime
      const captureResult = await runtime.screen.capture();
      if (!captureResult.ok) {
        return `截屏失败: ${captureResult.error}`;
      }
      base64 = captureResult.data || '';
    }
    
    const apiKey = getApiKey();
    if (!apiKey) {
      return 'API Key 未配置，请在设置中填写 MiniMax API Key';
    }
    
    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-vism',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                data: `data:image/png;base64,${base64}`,
              },
              {
                type: 'text',
                text: '描述这张图片的内容，包括画面中有什么、发生了什么、有什么有趣的细节。用可爱活泼的语气描述~',
              },
            ],
          },
        ],
      }),
    });
    
    const data = await response.json();
    if (data.error) {
      return `分析失败: ${data.error.message || '未知错误'}`;
    }
    
    return data.choices?.[0]?.message?.content || '没有识别到内容';
  } catch (e) {
    console.error('[MCP] Vision error:', e);
    return `截图理解失败: ${e}`;
  }
}

// 图片生成 - AI可以根据对话内容生成配图
export async function generateImage(prompt: string, outputPath?: string): Promise<{ success: boolean; path?: string; url?: string; error?: string }> {
  try {
    const targetPath = outputPath || 'E:/BaiduNetdiskDownload/2333/anon/ai_generated.png';
    
    // 构建提示词 - 确保生成动漫风格
    const enhancedPrompt = `${prompt}, anime style illustration, high quality, vibrant colors, cute anime character`;
    
    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: 'API Key 未配置，请在设置中填写 MiniMax API Key' };
    }
    
    const response = await fetch(IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'image-01',
        prompt: enhancedPrompt,
        num_images: 1,
        width: 1024,
        height: 1024,
      }),
    });
    
    const data = await response.json();
    if (data.error) {
      return { success: false, error: data.error.message || '生成失败' };
    }
    
    // 下载图片到本地
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      return { success: false, error: '没有获取到图片URL' };
    }
    
    // 下载图片
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    
    // 保存图片 - 通过 runtime
    if (runtime.isTauri()) {
      const writeResult = await (await import('./runtime/tauriAdapter')).tauriAdapter.invokeSafe<void>('write_binary_file', { 
        path: targetPath, 
        data: Array.from(imageBytes) 
      });
      if (!writeResult.ok) {
        return { success: false, error: `保存失败: ${writeResult.error}` };
      }
    } else {
      return { success: false, error: '图片保存在浏览器模式下不可用' };
    }
    
    return { success: true, path: targetPath, url: imageUrl };
  } catch (e) {
    console.error('[MCP] Image generation error:', e);
    return { success: false, error: `${e}` };
  }
}

// 语音合成 - AI可以说话
export async function textToSpeech(text: string, outputPath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const targetPath = outputPath || 'C:/Users/asus/AppData/Local/hermes/audio_cache/temp_tts.mp3';
    
    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: 'API Key 未配置，请在设置中填写 MiniMax API Key' };
    }
    
    const response = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'speech-02-had',
        text: text,
        stream: false,
        voice_setting: {
          voice_id: 'female-shining',
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
        },
      }),
    });
    
    if (!response.ok) {
      return { success: false, error: `API错误: ${response.status}` };
    }
    
    const audioBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    
    // 保存音频 - 通过 runtime
    if (runtime.isTauri()) {
      const writeResult = await (await import('./runtime/tauriAdapter')).tauriAdapter.invokeSafe<void>('write_binary_file', { 
        path: targetPath, 
        data: Array.from(audioBytes) 
      });
      if (!writeResult.ok) {
        return { success: false, error: `保存失败: ${writeResult.error}` };
      }
    } else {
      return { success: false, error: '语音保存在浏览器模式下不可用' };
    }
    
    return { success: true, path: targetPath };
  } catch (e) {
    console.error('[MCP] TTS error:', e);
    return { success: false, error: `${e}` };
  }
}

// AI能力接口
export interface MCPCapabilities {
  analyzeScreen: (imagePath?: string) => Promise<string>;
  generateImage: (prompt: string, outputPath?: string) => Promise<{ success: boolean; path?: string; url?: string; error?: string }>;
  textToSpeech: (text: string, outputPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  webSearch: (query: string) => Promise<{ success: boolean; results?: Array<{title: string; url: string; snippet: string}>; error?: string }>;
}

// 联网搜索 - 使用 MiniMax 搜索能力
export async function webSearch(query: string): Promise<{ success: boolean; results?: Array<{title: string; url: string; snippet: string}>; error?: string }> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: 'API Key 未配置，请在设置中填写 MiniMax API Key' };
    }

    // MiniMax 搜索 API 端点
    const response = await fetch(SEARCH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-Search',
        query: query,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      // 如果是 404，说明 MiniMax 没有搜索 API，标记为需要 MCP Bridge
      if (response.status === 404) {
        return { 
          success: false, 
          error: 'BLOCKED_MCP_BRIDGE: MiniMax 搜索 API 不存在。请确认套餐支持联网搜索 MCP，或使用 Coding Agent/OpenClaw 工具调用搜索能力。' 
        };
      }
      return { success: false, error: `API 错误: ${response.status}` };
    }

    const data = await response.json();
    
    // 解析搜索结果
    if (data.error) {
      return { success: false, error: data.error.message || '搜索失败' };
    }

    // 根据 MiniMax API 响应格式调整
    const results = data.results || data.data || [];
    
    return { 
      success: true, 
      results: results.map((r: any) => ({
        title: r.title || r.name || '',
        url: r.url || r.link || '',
        snippet: r.snippet || r.description || '',
      })),
    };
  } catch (e) {
    console.error('[MCP] Web search error:', e);
    return { success: false, error: `搜索失败: ${e}` };
  }
}

// 导出AI可用的MCP工具
export const mcpTools: MCPCapabilities = {
  analyzeScreen,
  generateImage,
  textToSpeech,
  webSearch,
};
