import type { CharacterProfile, EmotionState, CharacterState, Message } from '@ai-companion/shared';
import { EmotionEngine, EMOTION_EVENT_RULES } from '@ai-companion/emotion-engine';
import { MemoryEngine } from '@ai-companion/memory-engine';
import { CharacterEngine } from '@ai-companion/character-engine';
import { BehaviorEngine, BehaviorContext } from '@ai-companion/behavior-engine';
import { AIService, AIPromptContext } from '@ai-companion/ai-service';

export interface CompanionConfig {
  aiBaseUrl: string;
  aiModel: string;
  aiProvider: 'ollama' | 'openai' | 'claude';
}

const IDLE_PHRASES = [
  '在想什么呢...',
  '有什么想聊的吗~',
  '今天过得怎么样？',
  '来陪我聊聊天吧~',
  '(*´▽`*)',
  '发呆中...',
  '喵~',
];

const INTERACTION_EVENTS = {
  USER_GREETING: 'user_greeting',
  USER_PRAISE: 'user_praise',
  USER_CRITICIZE: 'user_criticize',
  USER_BYE: 'user_bye',
  USER_PET: 'user_pet',
  USER_IGNORE: 'user_ignore',
  TIME_PASSES: 'time_passes',
  IDLE_TOO_LONG: 'idle_too_long',
} as const;

export class CompanionEngine {
  private characterEngine: CharacterEngine;
  private emotionEngine: EmotionEngine;
  private memoryEngine: MemoryEngine;
  private behaviorEngine: BehaviorEngine;
  private aiService: AIService;
  private idleTimer?: ReturnType<typeof setInterval>;
  private idlePhraseIndex = 0;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(config: CompanionConfig) {
    this.characterEngine = new CharacterEngine();
    this.emotionEngine = new EmotionEngine();
    this.memoryEngine = new MemoryEngine();
    this.behaviorEngine = new BehaviorEngine();
    this.aiService = new AIService({
      provider: config.aiProvider,
      baseUrl: config.aiBaseUrl,
      model: config.aiModel,
      maxTokens: 500,
      temperature: 0.8,
    });
  }

  // Event emission
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  // Getters
  getCharacter(): CharacterProfile {
    return this.characterEngine.getProfile();
  }

  getEmotion(): EmotionState {
    return this.emotionEngine.getState();
  }

  getState(): CharacterState {
    return this.behaviorEngine.getState();
  }

  // Start the companion
  start(): void {
    this.startIdleLoop();
    this.emotionEngine.startDecay(60000);
    this.emit('started');
  }

  stop(): void {
    this.stopIdleLoop();
    this.emotionEngine.stopDecay();
    this.emit('stopped');
  }

  // Process user input
  async processInput(userInput: string): Promise<string> {
    const character = this.characterEngine.getProfile();
    const emotion = this.emotionEngine.getState();

    this.behaviorEngine.transition('USER_MESSAGE', {
      emotion,
      isIdle: false,
      idleTime: 0,
    });

    this.recordInteraction(userInput);
    this.analyzeAndUpdateEmotion(userInput);

    const memories = this.memoryEngine.recallMemories(userInput, 5);
    const memoryTexts = memories.map((m) => m.content);

    const ctx: AIPromptContext = {
      character,
      emotion: this.emotionEngine.getState(),
      recentMemories: memoryTexts,
      conversationHistory: [],
      currentState: this.behaviorEngine.getState(),
    };

    const messages = this.aiService.buildMessages(ctx, userInput);
    const response = await this.aiService.chat(messages);

    this.emotionEngine.processEvent({
      type: 'user_greeting',
      intensity: 1,
    });

    this.emit('response', { response, state: this.getState() });

    return response;
  }

  private recordInteraction(input: string): void {
    this.memoryEngine.addMemory({
      content: input,
      memoryType: 'event',
      importanceScore: 0.6,
    });
    this.memoryEngine.incrementInteraction(this.getCharacter().id);
  }

  private analyzeAndUpdateEmotion(input: string): void {
    const lower = input.toLowerCase();

    if (lower.includes('你好') || lower.includes('hi') || lower.includes('hello')) {
      this.emotionEngine.processEvent({ type: 'user_greeting', intensity: 1 });
    } else if (lower.includes('谢谢') || lower.includes('喜欢') || lower.includes('棒')) {
      this.emotionEngine.processEvent({ type: 'user_praise', intensity: 1 });
    } else if (lower.includes('讨厌') || lower.includes('生气')) {
      this.emotionEngine.processEvent({ type: 'user_criticize', intensity: 1 });
    } else if (lower.includes('再见') || lower.includes('拜拜')) {
      this.emotionEngine.processEvent({ type: 'user_bye', intensity: 1 });
    }

    this.emit('emotionUpdate', this.emotionEngine.getState());
  }

  // Idle behavior
  private startIdleLoop(): void {
    this.idleTimer = setInterval(() => {
      this.performIdleAction();
    }, 8000);
  }

  private stopIdleLoop(): void {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  private performIdleAction(): void {
    const emotion = this.emotionEngine.getState();
    const idleTime = this.behaviorEngine.getIdleTime();

    if (idleTime > 120000) {
      this.emotionEngine.processEvent({ type: 'idle_too_long', intensity: 1 });
    } else {
      this.emotionEngine.processEvent({ type: 'time_passes', intensity: 1 });
    }

    this.behaviorEngine.transition('RANDOM_IDLE', {
      emotion: this.emotionEngine.getState(),
      isIdle: true,
      idleTime,
    });

    const phrase = IDLE_PHRASES[this.idlePhraseIndex % IDLE_PHRASES.length];
    this.idlePhraseIndex++;

    this.emit('idlePhrase', phrase);
    this.emit('stateUpdate', this.getState());
    this.emit('emotionUpdate', this.emotionEngine.getState());
  }

  // React to being petted/clicked
  onPet(): void {
    this.emotionEngine.processEvent({ type: 'user_pet', intensity: 1 });
    this.behaviorEngine.transition('USER_PET', {
      emotion: this.emotionEngine.getState(),
      isIdle: false,
      idleTime: 0,
    });
    this.emit('stateUpdate', this.getState());
    this.emit('emotionUpdate', this.emotionEngine.getState());
  }

  // Get idle phrase for display
  getIdlePhrase(): string {
    return IDLE_PHRASES[this.idlePhraseIndex % IDLE_PHRASES.length];
  }

  // Update AI config
  updateAIConfig(config: { baseUrl: string; model: string; provider: string }): void {
    this.aiService.updateConfig({
      provider: config.provider as 'ollama' | 'openai' | 'claude',
      baseUrl: config.baseUrl,
      model: config.model,
      maxTokens: 500,
      temperature: 0.8,
    });
  }
}
