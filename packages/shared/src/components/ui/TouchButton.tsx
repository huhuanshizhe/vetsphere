'use client';

import React from 'react';

/**
 * 移动端优化按钮组件
 * - 触摸友好的尺寸 (最小 44x44px)
 * - 触觉反馈动画
 * - 视觉状态反馈
 */
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center 
    font-bold rounded-xl 
    transition-all duration-200 
    active:scale-95 
    disabled:opacity-50 
    disabled:cursor-not-allowed
    touch-manipulation
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const variantStyles = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm hover:shadow-md',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 focus:ring-slate-500 shadow-sm',
    outline: 'border-2 border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-600 bg-transparent focus:ring-emerald-500',
    ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-400',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-500',
  };

  const sizeStyles = {
    sm: 'min-h-[40px] px-4 py-2 text-sm gap-1.5',
    md: 'min-h-[44px] px-6 py-3 text-base gap-2',
    lg: 'min-h-[48px] px-8 py-4 text-lg gap-2.5',
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {icon && !isLoading && <span className="shrink-0">{icon}</span>}
      {children && <span className={icon ? '' : ''}>{children}</span>}
    </button>
  );
};

/**
 * 移动端优化的图标按钮
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'default' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'default',
  size = 'md',
  label,
  className = '',
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center 
    rounded-xl 
    transition-all duration-200 
    active:scale-90
    touch-manipulation
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const variantStyles = {
    default: 'bg-slate-100 text-slate-600 hover:bg-slate-200 focus:ring-slate-400',
    danger: 'bg-red-50 text-red-500 hover:bg-red-100 focus:ring-red-500',
    ghost: 'text-slate-500 hover:bg-slate-100 focus:ring-slate-400',
  };

  const sizeStyles = {
    sm: 'min-h-[40px] min-w-[40px] p-2',
    md: 'min-h-[44px] min-w-[44px] p-2.5',
    lg: 'min-h-[48px] min-w-[48px] p-3',
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
};

/**
 * 移动端优化的切换按钮组
 */
interface ToggleButtonGroupProps {
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({
  options,
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`inline-flex bg-slate-100 rounded-xl p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            inline-flex items-center gap-1.5 sm:gap-2 
            px-3 sm:px-4 py-2 
            rounded-lg 
            text-sm font-bold
            transition-all duration-200
            active:scale-95
            touch-manipulation
            ${value === option.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }
          `}
        >
          {option.icon && <span className="shrink-0">{option.icon}</span>}
          <span className="whitespace-nowrap">{option.label}</span>
        </button>
      ))}
    </div>
  );
};

/**
 * 移动端优化的卡片操作栏
 */
export const CardActionbar: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`
      flex items-center gap-2 sm:gap-3 
      p-3 sm:p-4 
      border-t border-slate-100 
      bg-slate-50/50
      ${className}
    `}>
      {children}
    </div>
  );
};
