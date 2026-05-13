import React, { memo, useState, useRef, useEffect } from 'react';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export const Panel = memo(function Panel({
  title,
  children,
  className = '',
  defaultOpen = true,
}: PanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`
        rounded-xl backdrop-blur-xl bg-white/5 border border-white/10
        transition-all duration-300
        ${className}
      `}
    >
      {title && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-gray-200 hover:text-white transition-colors"
        >
          <span className="font-medium">{title}</span>
          <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
      )}
      <div
        className={`
          overflow-hidden transition-all duration-300
          ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-4 pt-0">{children}</div>
      </div>
    </div>
  );
});
