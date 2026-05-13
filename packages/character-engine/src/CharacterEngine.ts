import type { CharacterProfile } from '@ai-companion/shared';
import { generateId } from '@ai-companion/core';

export const DEFAULT_CHARACTER: CharacterProfile = {
  id: 'default',
  name: '小爱',
  personality: ['温柔', '活泼', '善解人意'],
  speakingStyle: {
    tone: 'friendly',
    suffix: ['~', '哦', '呀', '呢'],
  },
  emotionalBias: {
    happy: 0.6,
    angry: 0.2,
    shy: 0.4,
  },
  relationship: {
    favorability: 50,
    trust: 50,
  },
};

export class CharacterEngine {
  private profile: CharacterProfile;
  private listeners: Set<(profile: CharacterProfile) => void> = new Set();

  constructor(profile: CharacterProfile = DEFAULT_CHARACTER) {
    this.profile = { ...profile };
  }

  getProfile(): CharacterProfile {
    return { ...this.profile };
  }

  subscribe(listener: (profile: CharacterProfile) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.getProfile()));
  }

  updateProfile(updates: Partial<CharacterProfile>): void {
    this.profile = { ...this.profile, ...updates };
    this.notify();
  }

  updateRelationship(updates: Partial<CharacterProfile['relationship']>): void {
    this.profile.relationship = { ...this.profile.relationship, ...updates };
    this.notify();
  }

  adjustFavorability(delta: number): void {
    this.profile.relationship.favorability = Math.max(
      0,
      Math.min(100, this.profile.relationship.favorability + delta)
    );
    this.notify();
  }

  adjustTrust(delta: number): void {
    this.profile.relationship.trust = Math.max(
      0,
      Math.min(100, this.profile.relationship.trust + delta)
    );
    this.notify();
  }

  incrementInteractions(): void {
    this.profile.relationship.favorability += 0.1;
    this.profile.relationship.trust += 0.05;
  }

  getSpeakingStyle(): { tone: string; suffix: string } {
    const suffix = this.profile.speakingStyle.suffix;
    return {
      tone: this.profile.speakingStyle.tone,
      suffix: suffix[Math.floor(Math.random() * suffix.length)],
    };
  }

  getPersonalityPrompt(): string {
    return this.profile.personality.join('、');
  }

  toStorageFormat(): { id: string; profile_data: string; created_at: number; updated_at: number } {
    return {
      id: this.profile.id,
      profile_data: JSON.stringify(this.profile),
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }

  static fromStorageFormat(data: { id: string; profile_data: string }): CharacterEngine {
    const profile = JSON.parse(data.profile_data) as CharacterProfile;
    profile.id = data.id;
    return new CharacterEngine(profile);
  }
}
