import { IKAROS_IDLE_DIALOGUES } from '@ai-companion/character-engine';

export interface IdleTalkConfig {
  enabled: boolean;
  minInterval: number;
  maxInterval: number;
  probability: number;
}

const DEFAULT_CONFIG: IdleTalkConfig = {
  enabled: true,
  minInterval: 30000,
  maxInterval: 90000,
  probability: 0.6,
};

export class IdleTalkGenerator {
  private config: IdleTalkConfig;
  private dialogues: string[];
  private lastTalkTime: number = 0;
  private nextTalkTime: number = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<(dialogue: string) => void> = new Set();
  private isScheduled: boolean = false;

  constructor(config: Partial<IdleTalkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dialogues = [...IKAROS_IDLE_DIALOGUES];
    this.scheduleNextTalk();
  }

  subscribe(listener: (dialogue: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(dialogue: string): void {
    this.listeners.forEach((l) => l(dialogue));
  }

  private getRandomDialogue(): string {
    return this.dialogues[Math.floor(Math.random() * this.dialogues.length)];
  }

  private getNextInterval(): number {
    return (
      this.config.minInterval +
      Math.random() * (this.config.maxInterval - this.config.minInterval)
    );
  }

  private shouldTalk(): boolean {
    return Math.random() < this.config.probability;
  }

  private scheduleNextTalk(): void {
    if (!this.config.enabled || this.isScheduled) return;

    const interval = this.getNextInterval();
    this.nextTalkTime = Date.now() + interval;

    this.timeoutId = setTimeout(() => {
      this.isScheduled = false;
      if (this.shouldTalk()) {
        const dialogue = this.getRandomDialogue();
        this.lastTalkTime = Date.now();
        this.notify(dialogue);
      }
      this.scheduleNextTalk();
    }, interval);

    this.isScheduled = true;
  }

  start(): void {
    if (this.isScheduled) return;
    this.scheduleNextTalk();
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isScheduled = false;
  }

  triggerTalk(): void {
    const dialogue = this.getRandomDialogue();
    this.notify(dialogue);
  }

  setProbability(prob: number): void {
    this.config.probability = Math.max(0, Math.min(1, prob));
  }

  getLastTalkTime(): number {
    return this.lastTalkTime;
  }

  getNextTalkTime(): number {
    return this.nextTalkTime;
  }

  addDialogue(dialogue: string): void {
    this.dialogues.push(dialogue);
  }

  removeDialogue(index: number): void {
    if (index >= 0 && index < this.dialogues.length) {
      this.dialogues.splice(index, 1);
    }
  }

  getDialogues(): string[] {
    return [...this.dialogues];
  }

  setConfig(config: Partial<IdleTalkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): IdleTalkConfig {
    return { ...this.config };
  }
}

let idleTalkInstance: IdleTalkGenerator | null = null;

export function getIdleTalkGenerator(): IdleTalkGenerator {
  if (!idleTalkInstance) {
    idleTalkInstance = new IdleTalkGenerator();
  }
    return idleTalkInstance;
}
