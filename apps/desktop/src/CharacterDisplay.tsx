import React, { useState } from 'react';
import happyImg from './assets/ikaros/expression/ikaros_exp_happy.png';
import neutralImg from './assets/ikaros/expression/ikaros_exp_neutral.png';
import sadImg from './assets/ikaros/expression/ikaros_exp_sad.png';

const EXPRESSIONS = [
  { name: 'happy', img: happyImg },
  { name: 'neutral', img: neutralImg },
  { name: 'sad', img: sadImg },
];

export function CharacterDisplay() {
  const [expressionIndex, setExpressionIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  const handleClick = () => {
    const nextIndex = (expressionIndex + 1) % EXPRESSIONS.length;
    setExpressionIndex(nextIndex);
    
    const messages = ['心情真好~', '在想什么呢~', '好无聊啊...'];
    setCurrentMessage(messages[nextIndex]);
    setIsSpeaking(true);
    
    setTimeout(() => {
      setIsSpeaking(false);
      setCurrentMessage('');
    }, 3000);
  };

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center cursor-pointer"
      onClick={handleClick}
    >
      <div 
        className="relative animate-float"
        style={{ width: 280, height: 280 }}
      >
        <img
          src={EXPRESSIONS[expressionIndex].img}
          alt="小伊"
          className="w-full h-full object-contain"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(233, 69, 96, 0.3))',
          }}
        />
      </div>
      
      {isSpeaking && currentMessage && (
        <div 
          className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#1a1a2e',
            maxWidth: 200,
          }}
        >
          <span className="text-sm">{currentMessage}</span>
        </div>
      )}
    </div>
  );
}
