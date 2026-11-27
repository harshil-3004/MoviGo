import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  style,
  type = 'button',
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const variantClasses = {
    primary: 'mg-btn-primary',
    secondary: 'mg-btn-secondary',
    outline: 'mg-btn-outline',
    ghost: 'mg-btn-ghost',
    danger: 'mg-btn-danger',
    hero: 'mg-btn-hero',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-2',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button
      type={type}
      className={`${baseStyle} ${variantClasses[variant] || variantClasses.primary} ${sizes[size] || sizes.md} ${className}`}
      style={style}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};

export default Button;
