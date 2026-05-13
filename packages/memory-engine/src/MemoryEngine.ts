import type { Memory, Session, Relationship } from '@ai-companion/shared';
import { generateId } from '@ai-companion/core';

export class MemoryEngine {
  private memories: Map<string, Memory> = new Map();
  private sessions: Map<string, Session> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private currentSessionId?: string;

  constructor() {
    this.initializeDefaultRelationship();
  }

  private initializeDefaultRelationship(): void {
    const defaultRel: Relationship = {
      id: generateId(),
      userId: 'user',
      characterId: 'default',
      favorability: 50,
      trust: 50,
      totalInteractions: 0,
      createdAt: Date.now(),
    };
    this.relationships.set(defaultRel.id, defaultRel);
  }

  // Session methods
  createSession(): Session {
    const session: Session = {
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      context: {},
      importanceScore: 0.5,
    };
    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;
    return session;
  }

  getCurrentSession(): Session | undefined {
    return this.currentSessionId ? this.sessions.get(this.currentSessionId) : undefined;
  }

  updateSession(id: string, updates: Partial<Session>): void {
    const session = this.sessions.get(id);
    if (session) {
      this.sessions.set(id, { ...session, ...updates, updatedAt: Date.now() });
    }
  }

  // Memory methods
  addMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'recallCount'>): Memory {
    const newMemory: Memory = {
      ...memory,
      id: generateId(),
      createdAt: Date.now(),
      recallCount: 0,
    };
    this.memories.set(newMemory.id, newMemory);
    return newMemory;
  }

  getMemory(id: string): Memory | undefined {
    return this.memories.get(id);
  }

  recallMemories(query: string, limit: number = 5): Memory[] {
    const queryLower = query.toLowerCase();
    const scored = Array.from(this.memories.values())
      .map((mem) => ({
        memory: mem,
        score: this.calculateRelevance(mem, queryLower),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const results = scored.map((item) => {
      const mem = item.memory;
      mem.recallCount++;
      mem.lastRecalledAt = Date.now();
      return mem;
    });

    return results;
  }

  private calculateRelevance(memory: Memory, query: string): number {
    let score = memory.importanceScore;

    if (memory.content.toLowerCase().includes(query)) {
      score += 0.3;
    }
    if (memory.memoryType === 'preference') {
      score += 0.2;
    }
    if (memory.emotionalTags?.some((tag) => query.includes(tag))) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  getRecentMemories(limit: number = 10): Memory[] {
    return Array.from(this.memories.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  getMemoriesByType(type: Memory['memoryType']): Memory[] {
    return Array.from(this.memories.values()).filter(
      (mem) => mem.memoryType === type
    );
  }

  // Relationship methods
  getRelationship(characterId: string): Relationship | undefined {
    return Array.from(this.relationships.values()).find(
      (rel) => rel.characterId === characterId
    );
  }

  updateRelationship(characterId: string, updates: Partial<Relationship>): void {
    const rel = this.getRelationship(characterId);
    if (rel) {
      this.relationships.set(rel.id, { ...rel, ...updates });
    }
  }

  incrementInteraction(characterId: string): void {
    const rel = this.getRelationship(characterId);
    if (rel) {
      rel.totalInteractions++;
      rel.lastInteractionAt = Date.now();
      rel.favorability = Math.min(100, rel.favorability + 0.1);
      rel.trust = Math.min(100, rel.trust + 0.05);
    }
  }

  // Utility
  clearOldMemories(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    for (const [id, mem] of this.memories) {
      if (mem.createdAt < cutoff && mem.importanceScore < 0.7) {
        this.memories.delete(id);
      }
    }
  }

  // Persistence helpers
  toStorageFormat(): {
    memories: Memory[];
    sessions: Session[];
    relationships: Relationship[];
  } {
    return {
      memories: Array.from(this.memories.values()),
      sessions: Array.from(this.sessions.values()),
      relationships: Array.from(this.relationships.values()),
    };
  }

  loadFromStorage(data: {
    memories?: Memory[];
    sessions?: Session[];
    relationships?: Relationship[];
  }): void {
    if (data.memories) {
      data.memories.forEach((m) => this.memories.set(m.id, m));
    }
    if (data.sessions) {
      data.sessions.forEach((s) => this.sessions.set(s.id, s));
    }
    if (data.relationships) {
      data.relationships.forEach((r) => this.relationships.set(r.id, r));
    }
  }
}
