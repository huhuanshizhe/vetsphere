'use client';

import React from 'react';
import { Clock, CreditCard, Package, Truck, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

/**
 * Order Status Configuration
 * Centralized status definitions with icons and colors
 */
export const ORDER_STATUS_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  priority: number; // For sorting/filtering
}> = {
  pending: {
    icon: Clock,
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    priority: 1,
  },
  pending_verification: {
    icon: RefreshCw,
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    priority: 1,
  },
  paid: {
    icon: CreditCard,
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    priority: 2,
  },
  processing: {
    icon: Package,
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    priority: 3,
  },
  shipped: {
    icon: Truck,
    colorClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
    priority: 4,
  },
  delivered: {
    icon: CheckCircle,
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    priority: 5,
  },
  completed: {
    icon: CheckCircle,
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    priority: 5,
  },
  cancelled: {
    icon: XCircle,
    colorClass: 'text-red-700',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    priority: 0,
  },
};

export interface OrderStatusBadgeProps {
  status: string;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * OrderStatusBadge - Professional status badge component
 * Used across all order-related UIs for consistent status display
 */
export function OrderStatusBadge({
  status,
  label,
  size = 'md',
  showIcon = true,
  className = '',
}: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-xs font-semibold gap-1.5',
    lg: 'px-4 py-1.5 text-sm font-bold gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border ${config.bgClass} ${config.colorClass} ${config.borderClass} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  );
}

/**
 * Get status configuration helper
 */
export function getOrderStatusConfig(status: string) {
  return ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.pending;
}

export default OrderStatusBadge;