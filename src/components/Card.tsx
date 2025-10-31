import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white/70 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg p-6 ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;