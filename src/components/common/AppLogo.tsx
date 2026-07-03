import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number; // Size in pixels
}

export const AppLogo: React.FC<AppLogoProps> = ({ className, size = 32 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 32 32" 
      width={size} 
      height={size} 
      className={className}
    >
      <defs>
        <linearGradient id="logoBoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      <g transform="translate(16, 16) rotate(-45) translate(-16, -16)">
        {/* Left Half of Bone */}
        <path 
          d="M 15,13 L 8,11.5 A 3,3 0 1,0 5,16 A 3,3 0 1,0 8,20.5 L 15,19 L 13.5,17 L 16.5,15 Z" 
          fill="url(#logoBoneGrad)" 
          stroke="#0f766e" 
          strokeWidth="1.2" 
          strokeLinejoin="round" 
        />
              
        {/* Right Half of Bone (Displaced and rotated) */}
        <g transform="translate(2, -1.5) rotate(8, 17, 16)">
          <path 
            d="M 17,13 L 24,11.5 A 3,3 0 1,1 27,16 A 3,3 0 1,1 24,20.5 L 17,19 L 15.5,17 L 18.5,15 Z" 
            fill="url(#logoBoneGrad)" 
            stroke="#0f766e" 
            strokeWidth="1.2" 
            strokeLinejoin="round" 
          />
        </g>
      </g>
    </svg>
  );
};
