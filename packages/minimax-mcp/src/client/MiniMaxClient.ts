import type { MiniMaxConfig, TaskType } from '../types';
import { getQuotaManager } from '../router/QuotaManager';

const DEFAULT_CONFIG: MiniMaxConfig = {
  apiKey: '',
  baseUrl: 'https://api.minimax.chat',
  model: 'MiniMax-M2.7-highspeed',
  maxTokens: 500,
  temperature: 0.8,
};

interface MiniMaxMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface VoiceSetting {
  voice_id: string;
}

interface ImageGenerationOptions {
  prompt: string;
  model?: string;
  num_images?: number;
}

export class MiniMaxClient {
  private config: MiniMaxConfig;
  private quotaManager: ReturnType<typeof getQuotaManager>;

  constructor(config: Partial<MiniMaxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.quotaManager = getQuotaManager();
  }

  updateConfig(config: Partial<MiniMaxConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  private async chatInternal(messages: MiniMaxMessage[]): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('MiniMax API key not configured');
    }

    console.log('[MiniMaxClient] API call starting, model:', this.config.model, 'maxTokens:', this.config.maxTokens);
    const cost = this.quotaManager.estimateCost('chat');
    console.log('[MiniMaxClient] Quota check, cost:', cost, 'canUse:', this.quotaManager.canUse('chat', cost));
    if (!this.quotaManager.canUse('chat', cost)) {
      console.log('[MiniMaxClient] Quota exhausted, returning quota message');
      return '……今天的对话额度用完了……明天再来吧……';
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('MiniMax API error:', error);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[MiniMaxClient] Raw API response:', JSON.stringify(data));
      this.quotaManager.consume(cost);

      const message = data.choices?.[0]?.message;
      console.log('[MiniMaxClient] Message object:', JSON.stringify(message));
      if (message?.content && message.content.trim()) {
        console.log('[MiniMaxClient] Returning content:', message.content.trim());
        return message.content.trim();
      }
      if (message?.reasoning_content) {
        const reasoning = message.reasoning_content.trim();
        // 尝试提取 final answer
        const finalMatch = reasoning.match(/(?:final answer|thus answer|answer):\s*"?([^"\n]+)"?/i);
        if (finalMatch && finalMatch[1]) {
          return finalMatch[1].trim().replace(/[."']$/, '');
        }
        // 尝试提取引号内的内容
        const quoteMatch = reasoning.match(/"([^"]+)"/);
        if (quoteMatch && quoteMatch[1]) {
          return quoteMatch[1].trim();
        }
        // 取最后非空行
        const lines = reasoning.split('\n').filter(l => l.trim() && !l.includes('...') && l.length > 5);
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1].trim();
          return lastLine.replace(/^[-*\s]*/, '').trim() || reasoning.slice(-80);
        }
        return reasoning.slice(-80);
      }

      console.log('[MiniMaxClient] No content found, returning fallback');
      return '……';
    } catch (error) {
      console.error('MiniMax chat error:', error);
      throw error;
    }
  }

  async chat(userMessage: string, systemPrompt?: string): Promise<string> {
    const messages: MiniMaxMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userMessage });
    return this.chatInternal(messages);
  }

  async chatWithHistory(
    messages: MiniMaxMessage[],
    systemPrompt?: string
  ): Promise<string> {
    const fullMessages: MiniMaxMessage[] = [];
    if (systemPrompt) {
      fullMessages.push({ role: 'system', content: systemPrompt });
    }
    fullMessages.push(...messages);
    return this.chatInternal(fullMessages);
  }

  async textToSpeech(
    text: string,
    voiceId: string = 'female-tianmei'
  ): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('MiniMax API key not configured');
    }

    const cost = this.quotaManager.estimateCost('text_to_speech');
    if (!this.quotaManager.canUse('text_to_speech', cost)) {
      throw new Error('今天的语音额度用完了……明天再来吧……');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/t2a_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: 'speech-02-hd',
          text,
          voice_setting: {
            voice_id: voiceId,
          },
          output_format: 'url',
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('MiniMax TTS error:', error);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.quotaManager.consume(cost);

      if (data.base_resp?.status_code !== 0) {
        throw new Error(data.base_resp?.status_msg || 'TTS failed');
      }

      return data.data?.audio_url || '';
    } catch (error) {
      console.error('MiniMax TTS error:', error);
      throw error;
    }
  }

  async generateImage(options: ImageGenerationOptions): Promise<string[]> {
    if (!this.config.apiKey) {
      throw new Error('MiniMax API key not configured');
    }

    const cost = this.quotaManager.estimateCost('image_generation');
    if (!this.quotaManager.canUse('image_generation', cost)) {
      throw new Error('今天的图像额度用完了……明天再来吧……');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/image_generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || 'image-01',
          prompt: options.prompt,
          num_images: options.num_images || 1,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('MiniMax image error:', error);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.quotaManager.consume(cost);

      if (data.base_resp?.status_code !== 0) {
        throw new Error(data.base_resp?.status_msg || 'Image generation failed');
      }

      return data.data?.image_urls || [];
    } catch (error) {
      console.error('MiniMax image error:', error);
      throw error;
    }
  }

  getConfig(): MiniMaxConfig {
    return { ...this.config };
  }

  getQuotaStatus() {
    return this.quotaManager.getStatus();
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }
}

let miniMaxClientInstance: MiniMaxClient | null = null;

export function getMiniMaxClient(): MiniMaxClient {
  if (!miniMaxClientInstance) {
    miniMaxClientInstance = new MiniMaxClient();
  }
  return miniMaxClientInstance;
}
