import { useState } from 'react';

export const Trash = ({ size = 16, className = '', ...props }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill="currentColor"
        viewBox="0 0 16 16"
        className={`bi bi-trash-fill ${className}`}
        style={{ overflow: 'visible' }}
        {...props}
      >
        <g
          style={{
            transformOrigin: '12px 4px',
            transform: isHovered ? 'translateY(-3px)' : 'rotate(0deg)',
            transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H13.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5z" />
        </g>

        <path 
          fillRule="evenodd" 
          d="M3 4v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4H3z M6 6a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 6 6zm2.5 0a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5z"
        />
      </svg>
    </div>
  );
};