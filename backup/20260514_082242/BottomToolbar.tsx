import React from 'react';

interface BottomToolbarProps {
  onSettings: () => void;
}

export function BottomToolbar({ onSettings }: BottomToolbarProps) {
  return (
    <div
      className="flex items-center justify-center py-3"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* 设置按钮 - 居中显示 */}
      <button 
        onClick={onSettings}
        className="flex flex-col items-center gap-1 px-6"
      >
        <span className="text-xl">⚙️</span>
        <span className="text-xs" style={{ color: '#a0a0a0' }}>设置</span>
      </button>
    </div>
  );
}
