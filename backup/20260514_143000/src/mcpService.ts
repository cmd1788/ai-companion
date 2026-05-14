// MiniMax MCP服务 - AI自主调用
import { invoke } from '@tauri-apps/api/core';

const API_KEY = 'sk-cp-eZ_KsU3aRH1rcNGPfFlBdIyFqLt4wfIZm9LgQ8dyHJEjUFXBwfqGjbK9Ne7sBIVGpoiR6okgH-SDRbSelgVtsNTaT3wUkTY5ox8TS-EWyRaDFc9a_uj1TKY';
const VISION_API_URL = 'https://api.minimax.chat/v1/vision';
const IMAGE_API_URL = 'https://api.minimax.chat/v1/image_generation';
const TTS_API_URL = 'https://api.minimax.chat/v1/t2a_v2';

// 截图理解 - AI可以主动截屏并分析
export async function analyzeScreen(imagePath?: string): Promise<string> {
  try {
    let base64: string;
    
    if (imagePath) {
      // 读取指定图片
      const bytes: number[] = await invoke('read_file_base64', { path: imagePath });
      base64 = arrayToBase64(new Uint8Array(bytes));
    } else {
      // 截取当前屏幕
      base64 = await invoke('capture_screen');
    }
    
    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
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

// Base64转数组
function arrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 图片生成 - AI可以根据对话内容生成配图
export async function generateImage(prompt: string, outputPath?: string): Promise<{ success: boolean; path?: string; url?: string; error?: string }> {
  try {
    const targetPath = outputPath || 'E:/BaiduNetdiskDownload/2333/anon/ai_generated.png';
    
    // 构建提示词 - 确保生成动漫风格
    const enhancedPrompt = `${prompt}, anime style illustration, high quality, vibrant colors, cute anime character`;
    
    const response = await fetch(IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
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
    
    // 保存图片
    await invoke('write_binary_file', { 
      path: targetPath, 
      data: Array.from(imageBytes) 
    });
    
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
    
    const response = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
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
    
    // 保存音频
    await invoke('write_binary_file', { 
      path: targetPath, 
      data: Array.from(audioBytes) 
    });
    
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
}

// 导出AI可用的MCP工具
export const mcpTools: MCPCapabilities = {
  analyzeScreen,
  generateImage,
  textToSpeech,
};
