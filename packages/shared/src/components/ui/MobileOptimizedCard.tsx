'use client';

import React from 'react';

interface MobileOptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

/**
 * 移动端优化卡片组件
 * - 统一的圆角和间距
 * - 移动端友好的触摸反馈
 * - 响应式阴影效果
 */
export const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = true,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white 
        rounded-2xl 
        border border-slate-200 
        overflow-hidden
        transition-all 
        duration-300
        ${hoverable ? 'hover:shadow-xl hover:shadow-slate-200/50 active:scale-[0.98]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * 移动端优化的卡片内容区域
 */
export const MobileOptimizedCardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`p-4 sm:p-5 md:p-6 ${className}`}>
      {children}
    </div>
  );
};

/**
 * 移动端优化的卡片头部
 */
export const MobileOptimizedCardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  subtitle?: string;
}> = ({ children, className = '', subtitle }) => {
  return (
    <div className={`px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4 ${className}`}>
      {typeof children === 'string' ? (
        <>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {children}
          </h3>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {subtitle}
            </p>
          )}
        </>
      ) : (
        children
      )}
    </div>
  );
};

/**
 * 移动端优化的图片容器
 */
export const MobileOptimizedImageContainer: React.FC<{
  children: React.ReactNode;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
  className?: string;
}> = ({ children, aspectRatio = 'square', className = '' }) => {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[16/9]',
  };

  return (
    <div className={`relative overflow-hidden bg-slate-50 ${aspectClasses[aspectRatio]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * 移动端优化的徽章组件
 */
export const MobileOptimizedBadge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'featured' | 'quote' | 'success' | 'warning';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}> = ({ children, variant = 'default', position = 'top-right', className = '' }) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    featured: 'bg-amber-400 text-white border-amber-500',
    quote: 'bg-blue-50 text-blue-700 border-blue-100',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-orange-100 text-orange-700 border-orange-200',
  };

  const positionStyles = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  };

  return (
    <span
      className={`
        absolute 
        ${positionStyles[position]} 
        ${variantStyles[variant]}
        px-2 py-1 
        text-[10px] sm:text-xs 
        font-bold 
        rounded-full 
        border
        shadow-sm
        backdrop-blur-sm
        ${className}
      `}
    >
      {children}
    </span>
  );
};
