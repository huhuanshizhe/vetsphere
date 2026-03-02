'use client';

import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  darkMode?: boolean;
  className?: string;
}

const colorMap = {
  default: {
    bg: 'bg-slate-50',
    text: 'text-slate-900',
    label: 'text-slate-400',
    darkBg: 'bg-slate-800',
    darkText: 'text-white',
  },
  primary: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    label: 'text-emerald-500',
    darkBg: 'bg-emerald-900/30',
    darkText: 'text-emerald-400',
  },
  success: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    label: 'text-green-500',
    darkBg: 'bg-green-900/30',
    darkText: 'text-green-400',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    label: 'text-amber-500',
    darkBg: 'bg-amber-900/30',
    darkText: 'text-amber-400',
  },
  danger: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    label: 'text-red-500',
    darkBg: 'bg-red-900/30',
    darkText: 'text-red-400',
  },
};

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  icon,
  trend,
  color = 'default',
  darkMode = false,
  className = '',
}) => {
  const colors = colorMap[color];

  return (
    <div
      className={`
        p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl transition-all
        ${darkMode ? colors.darkBg : colors.bg}
        ${className}
      `}
    >
      {icon && (
        <div className="text-xl sm:text-2xl mb-2 sm:mb-3">
          {icon}
        </div>
      )}
      
      <p className={`
        text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1
        ${darkMode ? 'text-slate-500' : colors.label}
      `}>
        {label}
      </p>
      
      <div className="flex items-end gap-2">
        <p className={`
          text-xl sm:text-2xl md:text-3xl font-black
          ${darkMode ? colors.darkText : colors.text}
        `}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        
        {trend && (
          <span className={`
            text-xs font-bold mb-1
            ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}
          `}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  );
};

export default KPICard;
export { KPICard };
export type { KPICardProps };
