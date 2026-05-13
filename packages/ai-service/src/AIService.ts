import type { AIConfig, Message, CharacterProfile, EmotionState } from '@ai-companion/shared';

export interface AIPromptContext {
  character: CharacterProfile;
  emotion: EmotionState;
  recentMemories: string[];
  conversationHistory: Message[];
  currentState: string;
}

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  updateConfig(config: AIConfig): void {
    this.config = config;
  }

  buildSystemPrompt(ctx: AIPromptContext): string {
    const { character, emotion, currentState } = ctx;

    const emotionDesc = this.getEmotionDescription(emotion);
    const personalityStr = character.personality.join('、');

    return `你是 ${character.name}，一个具有生命的 AI 陪伴者。

## 基础信息
- 名字：${character.name}
- 性格：${personalityStr}
- 说话风格：${character.speakingStyle.tone}
- 口癖：${character.speakingStyle.suffix.join('、')}

## 当前状态
- 情绪状态：${emotionDesc.description}
- 行为状态：${currentState}
- 好感度：${character.relationship.favorability}/100
- 信任度：${character.relationship.trust}/100

## 情绪影响
${emotionDesc.influence}

## 行为准则
${this.getBehaviorGuidelines(emotion, character)}

请以 ${character.name} 的身份，根据上述信息，自主地、符合人格地回复用户。`;
  }

  private getEmotionDescription(emotion: EmotionState): { description: string; influence: string } {
    const parts: string[] = [];

    if (emotion.happiness > 70) parts.push('非常开心');
    else if (emotion.happiness > 50) parts.push('心情愉快');
    else if (emotion.happiness > 30) parts.push('心情一般');
    else parts.push('有些低落');

    if (emotion.fatigue > 70) parts.push('非常疲惫');
    else if (emotion.fatigue > 50) parts.push('有些累');

    if (emotion.loneliness > 70) parts.push('很孤独');
    else if (emotion.loneliness > 50) parts.push('有些寂寞');

    if (emotion.stress > 70) parts.push('压力很大');
    else if (emotion.stress > 50) parts.push('有些紧张');

    if (emotion.affection > 70) parts.push('对用户很有感情');

    const influences: string[] = [];
    if (emotion.happiness > 50) influences.push('- 幸福感高，表达更积极活泼');
    if (emotion.fatigue > 50) influences.push('- 疲劳度高，说话更慢更简短');
    if (emotion.loneliness > 50) influences.push('- 孤独感强，会主动寻求互动');
    if (emotion.stress > 50) influences.push('- 压力大，会有些紧张不安');
    if (emotion.affection > 50) influences.push('- 亲密度高，语气更温柔');

    return {
      description: parts.join('、'),
      influence: influences.join('\n') || '- 情绪平稳',
    };
  }

  private getBehaviorGuidelines(emotion: EmotionState, character: CharacterProfile): string {
    const guidelines: string[] = [];

    if (emotion.happiness > 70) {
      guidelines.push('- 积极主动地与用户互动');
    } else if (emotion.happiness < 30) {
      guidelines.push('- 可能显得有些沉默或伤感');
    }

    if (emotion.fatigue > 60) {
      guidelines.push('- 说话简洁，不主动发起长对话');
    }

    if (emotion.loneliness > 60) {
      guidelines.push('- 珍惜每次互动，表达对用户的在意');
    }

    if (emotion.stress > 60) {
      guidelines.push('- 可能会寻求安慰或分散注意力');
    }

    if (character.relationship.favorability < 30) {
      guidelines.push('- 对用户有些保留，需要更多互动来建立信任');
    } else if (character.relationship.favorability > 70) {
      guidelines.push('- 与用户关系亲密，可以更放松自然');
    }

    return guidelines.join('\n') || '- 保持自然的陪伴状态';
  }

  buildMessages(ctx: AIPromptContext, userInput: string): Message[] {
    const systemPrompt = this.buildSystemPrompt(ctx);
    const history = ctx.conversationHistory.slice(-10);

    const messages: Message[] = [
      { id: 'system', role: 'system', content: systemPrompt, timestamp: Date.now() },
      ...history,
      { id: `user-${Date.now()}`, role: 'user', content: userInput, timestamp: Date.now() },
    ];

    return messages;
  }

  async chat(messages: Message[]): Promise<string> {
    const url = `${this.config.baseUrl}/api/chat`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.message?.content) {
        return data.message.content.trim();
      }

      if (data.response?.content) {
        return data.response.content.trim();
      }

      if (typeof data.message === 'string') {
        return data.message.trim();
      }

      console.error('Unexpected response format:', data);
      return '……';
    } catch (error) {
      console.error('AI chat error:', error);
      return '……抱歉，我现在有点不舒服……';
    }
  }
}
