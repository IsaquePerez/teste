export const Chevron = ({ size = 12, isOpen = false, className = '', ...props }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      fill="currentColor" 
      viewBox="0 0 16 16"
      className={`bi bi-chevron-down ${className}`}
      style={{ 
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
        transition: 'transform 0.2s',
        ...props.style 
      }}
      {...props}
    >
      <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
    </svg>
  );
};