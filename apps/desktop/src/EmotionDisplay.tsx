import React from 'react';
import { useAppStore } from './store';

export function EmotionDisplay() {
  const { emotion } = useAppStore();

  const getEmotionState = () => {
    const h = emotion.happiness;
    if (h >= 80) return { text: '开心', color: '#4ade80' };
    if (h >= 60) return { text: '愉悦', color: '#86efac' };
    if (h >= 40) return { text: '平静', color: '#a0a0a0' };
    if (h >= 20) return { text: '难过', color: '#60a5fa' };
    return { text: '沮丧', color: '#f87171' };
  };

  const emotionState = getEmotionState();
  const affection = emotion.affection;

  return (
    <div
      className="flex items-center justify-between px-16 py-2"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: '#a0a0a0' }}>心情</span>
        <span className="text-sm font-medium" style={{ color: emotionState.color }}>
          {emotionState.text}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: '#a0a0a0' }}>好感度</span>
        <div
          className="h-2 w-20 rounded-full overflow-hidden"
          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${affection}%`,
              background: 'linear-gradient(90deg, #e94560, #ff6b6b)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
