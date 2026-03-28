'use client';

import React from 'react';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/admin';

// ============================================================================
// 状态徽章 - Light Theme
// ============================================================================
interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

// 浅色主题状态色映射
const LIGHT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  published: 'bg-emerald-50 text-emerald-700',
  offline: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700',
  coming_soon: 'bg-amber-50 text-amber-700',
  hidden: 'bg-slate-100 text-slate-600',
  redirect: 'bg-blue-50 text-blue-700',
  new: 'bg-blue-50 text-blue-700',
  contacted: 'bg-amber-50 text-amber-700',
  quoted: 'bg-purple-50 text-purple-700',
  negotiating: 'bg-orange-50 text-orange-700',
  converted: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const colorClass = LIGHT_STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';
  const label = STATUS_LABELS[status] || status;
  
  return (
    <span className={`
      inline-flex items-center rounded-md font-medium
      ${colorClass}
      ${size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'}
    `}>
      {label}
    </span>
  );
};

// ============================================================================
// 卡片容器 - Light Theme
// ============================================================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '',
  padding = 'md',
  hover = false,
}) => {
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  }[padding];

  return (
    <div className={`
      bg-white border border-slate-200 rounded-lg shadow-sm
      ${hover ? 'hover:shadow-md hover:border-slate-300 transition-shadow' : ''}
      ${paddingClass} ${className}
    `}>
      {children}
    </div>
  );
};

// ============================================================================
// 按钮 - Light Theme
// ============================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClass = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClass = {
    primary: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
    secondary: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  }[variant];

  const sizeClass = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-sm gap-2',
  }[size];

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
};

// ============================================================================
// 输入框 - Light Theme
// ============================================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900
            placeholder:text-slate-400 
            focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500
            transition-colors
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

// ============================================================================
// 选择框 - Light Theme
// ============================================================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        className={`
          w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900
          focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500
          transition-colors appearance-none cursor-pointer
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

// ============================================================================
// 空状态 - Light Theme
// ============================================================================
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mb-4 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
};

// ============================================================================
// 加载状态 - Light Theme
// ============================================================================
interface LoadingStateProps {
  text?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ text = '加载中...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-sm text-slate-500">{text}</span>
    </div>
  );
};

// ============================================================================
// 确认对话框 - Light Theme
// ============================================================================
interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  danger?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'info',
  danger = false,
  loading = false,
}) => {
  if (!open) return null;

  const handleClose = onCancel || onClose || (() => {});
  const displayMessage = message || description;
  const effectiveVariant = danger ? 'danger' : variant;

  const variantIcon = {
    danger: '⚠️',
    warning: '⚡',
    info: 'ℹ️',
  }[effectiveVariant];

  const confirmVariant = effectiveVariant === 'danger' ? 'danger' : 'primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-start gap-4">
          <span className="text-2xl">{variantIcon}</span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
            {displayMessage && (
              <p className="text-sm text-slate-500">{displayMessage}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 统计卡片 - Light Theme
// ============================================================================
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: string;
  compact?: boolean;
  href?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  color,
  compact,
  href,
}) => {
  const changeColor = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-slate-500',
  }[changeType];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    slate: 'bg-slate-50 text-slate-600',
  };
  const iconColorClass = color ? colorMap[color] || 'bg-slate-50 text-slate-600' : 'bg-slate-50 text-slate-600';

  const content = (
    <div className={`flex items-start justify-between ${compact ? 'gap-2' : ''}`}>
      <div>
        <p className={`font-medium text-slate-500 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</p>
        <p className={`font-bold text-slate-900 ${compact ? 'text-lg mt-0.5' : 'text-2xl mt-1'}`}>{value}</p>
        {change && (
          <p className={`text-xs font-medium mt-1 ${changeColor}`}>
            {changeType === 'up' && '↑ '}
            {changeType === 'down' && '↓ '}
            {change}
          </p>
        )}
      </div>
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconColorClass}`}>
          {icon}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        <Card hover>{content}</Card>
      </a>
    );
  }

  return <Card>{content}</Card>;
};

// ============================================================================
// 表格容器 - Light Theme
// ============================================================================
interface TableContainerProps {
  children: React.ReactNode;
}

export const TableContainer: React.FC<TableContainerProps> = ({ children }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        {children}
      </table>
    </div>
  );
};

// ============================================================================
// 分页组件 - Light Theme
// ============================================================================
interface PaginationProps {
  page: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize = 20,
  total,
  totalPages: totalPagesProp,
  onPageChange,
}) => {
  const totalPages = totalPagesProp || (total ? Math.ceil(total / pageSize) : 0);
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = total ? Math.min(page * pageSize, total) : 0;

  if (totalPages === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
      {total ? (
        <p className="text-sm text-slate-500">
          显示 {start}-{end} 条，共 {total} 条
        </p>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="px-3 py-1.5 text-sm text-slate-600 font-medium">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 标签页组件 - New
// ============================================================================
interface TabsProps {
  tabs: { key: string; label: string; icon?: string }[];
  activeTab: string;
  onChange: (key: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${activeTab === tab.key
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
            }
          `}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// 快捷操作卡片 - New
// ============================================================================
interface QuickActionCardProps {
  icon: React.ReactNode;
  title?: string;
  label?: string;
  description?: string;
  href: string;
  color?: string;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  title,
  label,
  description,
  href,
  color,
}) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    cyan: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100',
    slate: 'bg-slate-50 text-slate-600 group-hover:bg-slate-100',
  };
  const iconColorClass = color ? colorMap[color] || 'bg-slate-50 text-slate-600' : 'bg-slate-50 text-slate-600';
  const displayLabel = title || label;

  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:shadow-md transition-all text-center group"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-colors ${iconColorClass}`}>
        {icon}
      </div>
      {displayLabel && <span className="text-sm font-medium text-slate-900">{displayLabel}</span>}
      {description && (
        <span className="text-xs text-slate-500 mt-0.5">{description}</span>
      )}
    </a>
  );
};

// ============================================================================
// 活动动态项 - New
// ============================================================================
interface ActivityItemProps {
  icon?: string;
  title: string;
  description: string;
  time: string;
  href?: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  icon = '📌',
  title,
  description,
  time,
  href,
}) => {
  const content = (
    <div className="flex items-start gap-3 py-3">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{title}</p>
        <p className="text-sm text-slate-500 truncate">{description}</p>
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap">{time}</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:bg-slate-50 -mx-4 px-4 rounded-lg transition-colors">
        {content}
      </a>
    );
  }

  return content;
};

// ============================================================================
// Toast 通知组件 - New
// ============================================================================
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles: Record<ToastType, string> = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${typeStyles[type]} animate-slide-in`}>
      <span className="text-lg">{icons[type]}</span>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">×</button>
    </div>
  );
};

// Toast 容器组件 - 用于管理多个 Toast
interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastData[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Hook for toast management
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, addToast, removeToast, success: (msg: string) => addToast(msg, 'success'), error: (msg: string) => addToast(msg, 'error'), warning: (msg: string) => addToast(msg, 'warning'), info: (msg: string) => addToast(msg, 'info') };
}
