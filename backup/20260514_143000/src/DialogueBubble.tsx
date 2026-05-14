import React from 'react';

interface DialogueBubbleProps {
  message: string;
}

export function DialogueBubble({ message }: DialogueBubbleProps) {
  return (
    <div 
      className="dialogue-bubble animate-bubble-float"
      style={{
        position: 'relative',
      }}
    >
      {message}
      {/* 气泡尾巴 */}
      <div 
        style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid rgba(255, 255, 255, 0.85)',
        }}
      />
    </div>
  );
}
