import React from 'react';

export const Card = ({ children, className = '', hover = false, style, ...props }) => {
  const hoverStyle = hover
    ? 'transition-all duration-200 hover:-translate-y-0.5'
    : '';

  return (
    <div
      className={`rounded-xl overflow-hidden ${hoverStyle} ${className}`}
      style={{
        backgroundColor: 'var(--mg-surface)',
        border: '1px solid var(--mg-border)',
        boxShadow: 'var(--mg-shadow-sm)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div
    className={`px-6 py-4 border-b ${className}`}
    style={{ borderColor: 'var(--mg-border)' }}
  >
    {children}
  </div>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div
    className={`px-6 py-4 border-t ${className}`}
    style={{ borderColor: 'var(--mg-border)' }}
  >
    {children}
  </div>
);
