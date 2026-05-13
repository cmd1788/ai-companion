import React from 'react';

interface QuickRepliesProps {
  onSelect: (text: string) => void;
}

const QUICK_REPLIES = [
  '你今天开心吗？',
  '好想你~',
  '晚安~',
  '抱抱~',
];

export function QuickReplies({ onSelect }: QuickRepliesProps) {
  return (
    <div 
      className="flex items-center gap-2 overflow-x-auto"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`
        .quick-replies::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="quick-replies flex items-center gap-2">
        {QUICK_REPLIES.map((text, index) => (
          <button
            key={index}
            onClick={() => onSelect(text)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.7)',
              color: '#8E7C77',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,183,178,0.3)';
              e.currentTarget.style.color = '#6D5D59';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
              e.currentTarget.style.color = '#8E7C77';
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
