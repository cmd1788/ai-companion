import type { TaskType } from '../types';
import { getMiniMaxClient } from '../client/MiniMaxClient';
import { getQuotaManager } from './QuotaManager';

interface ModelAdapter {
  chat(userMessage: string, systemPrompt?: string): Promise<string>;
  chatWithHistory(messages: any[], systemPrompt?: string): Promise<string>;
  isConfigured(): boolean;
}

interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export class ModelRouter {
  private miniMaxAdapter: ReturnType<typeof getMiniMaxClient>;
  private quotaManager: ReturnType<typeof getQuotaManager>;
  private useMiniMax: boolean = false;
  private ollamaConfig: OllamaConfig;

  constructor() {
    this.miniMaxAdapter = getMiniMaxClient();
    this.quotaManager = getQuotaManager();
    this.ollamaConfig = {
      baseUrl: 'http://localhost:11434',
      model: 'deepseek-r1:32b',
    };
  }

  setOllamaConfig(config: OllamaConfig): void {
    this.ollamaConfig = config;
  }

  enableMiniMax(): void {
    if (this.miniMaxAdapter.isConfigured()) {
      this.useMiniMax = true;
    }
  }

  disableMiniMax(): void {
    this.useMiniMax = false;
  }

  isUsingMiniMax(): boolean {
    return this.useMiniMax && this.miniMaxAdapter.isConfigured();
  }

  private shouldUseMiniMax(taskType: TaskType): boolean {
    if (!this.useMiniMax || !this.miniMaxAdapter.isConfigured()) {
      return false;
    }

    if (this.quotaManager.isQuotaExhausted()) {
      return false;
    }

    if (this.quotaManager.shouldThrottle(taskType)) {
      return false;
    }

    return true;
  }

  async chat(
    userMessage: string,
    systemPrompt?: string,
    preferMiniMax: boolean = false
  ): Promise<string> {
    if (preferMiniMax && this.miniMaxAdapter.isConfigured()) {
      try {
        return await this.miniMaxAdapter.chat(userMessage, systemPrompt);
      } catch (error) {
        console.warn('MiniMax failed, falling back to Ollama:', error);
      }
    }

    return this.chatWithOllama(userMessage, systemPrompt);
  }

  async chatWithHistory(
    messages: any[],
    systemPrompt?: string,
    preferMiniMax: boolean = false
  ): Promise<string> {
    if (preferMiniMax && this.miniMaxAdapter.isConfigured()) {
      try {
        return await this.miniMaxAdapter.chatWithHistory(messages, systemPrompt);
      } catch (error) {
        console.warn('MiniMax failed, falling back to Ollama:', error);
      }
    }

    return this.chatWithOllamaHistory(messages, systemPrompt);
  }

  private async chatWithOllama(userMessage: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await fetch(`${this.ollamaConfig.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaConfig.model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: userMessage },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.message?.content?.trim() || '……';
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw error;
    }
  }

  private async chatWithOllamaHistory(messages: any[], systemPrompt?: string): Promise<string> {
    try {
      const allMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages,
      ];

      const response = await fetch(`${this.ollamaConfig.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaConfig.model,
          messages: allMessages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.message?.content?.trim() || '……';
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw error;
    }
  }

  getQuotaStatus() {
    return this.quotaManager.getStatus();
  }

  setMiniMaxApiKey(apiKey: string): void {
    this.miniMaxAdapter.setApiKey(apiKey);
    if (apiKey) {
      this.enableMiniMax();
    } else {
      this.disableMiniMax();
    }
  }
}

let modelRouterInstance: ModelRouter | null = null;

export function getModelRouter(): ModelRouter {
  if (!modelRouterInstance) {
    modelRouterInstance = new ModelRouter();
  }
  return modelRouterInstance;
}
