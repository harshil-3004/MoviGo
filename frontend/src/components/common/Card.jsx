import React from 'react';

export const Card = ({ children, className = '', hover = false, glass = true, ...props }) => {
  const glassStyle = glass ? 'bg-surface/50 backdrop-blur-lg border border-white/10' : 'bg-surface border border-surface';
  const hoverStyle = hover ? 'transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-white/20' : '';
  
  return (
    <div 
      className={`rounded-2xl overflow-hidden ${glassStyle} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`p-6 border-b border-white/5 ${className}`}>
    {children}
  </div>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`p-6 border-t border-white/5 ${className}`}>
    {children}
  </div>
);
