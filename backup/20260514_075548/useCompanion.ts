import { useEffect, useRef, useCallback } from 'react';
import { CompanionEngine } from '@ai-companion/core';
import { useAppStore } from './store';

export function useCompanion() {
  const engineRef = useRef<CompanionEngine | null>(null);
  const { aiConfig, setEmotion, setCharacterState, addMessage } = useAppStore();

  useEffect(() => {
    const engine = new CompanionEngine({
      aiBaseUrl: aiConfig.baseUrl,
      aiModel: aiConfig.model,
      aiProvider: aiConfig.provider,
    });

    engine.on('emotionUpdate', (emotion) => {
      setEmotion(emotion as any);
    });

    engine.on('stateUpdate', (state) => {
      setCharacterState(state as any);
    });

    engine.on('response', ({ response }) => {
      addMessage({
        id: `${Date.now()}-reply`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      });
      setCharacterState('idle');
    });

    engine.on('idlePhrase', (phrase) => {
      // Idle phrases are shown in the chat when no messages
    });

    engine.start();
    engineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!engineRef.current) return;

    setCharacterState('thinking');

    const response = await engineRef.current.processInput(content);

    addMessage({
      id: `${Date.now()}-reply`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    });

    setCharacterState('idle');
  }, [setCharacterState, addMessage]);

  const onPet = useCallback(() => {
    engineRef.current?.onPet();
  }, []);

  return { sendMessage, onPet };
}
