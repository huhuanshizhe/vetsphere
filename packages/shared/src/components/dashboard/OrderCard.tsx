'use client';

import React from 'react';
import { Order } from '../../types';

interface OrderCardProps {
  order: Order;
  onAction?: (orderId: string, action: string) => void;
  actionLabel?: string;
  showAction?: boolean;
  locale?: string;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onAction,
  actionLabel = 'Ship',
  showAction = false,
  locale = 'en',
}) => {
  const isChinese = locale === 'zh';
  
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Completed':
        return 'bg-emerald-100 text-emerald-600';
      case 'Shipped':
        return 'bg-blue-100 text-blue-600';
      case 'Pending':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusLabel = (status: string) => {
    if (!isChinese) return status;
    switch (status) {
      case 'Paid': return '已支付';
      case 'Completed': return '已完成';
      case 'Shipped': return '已发货';
      case 'Pending': return '待处理';
      default: return status;
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold text-slate-900 text-sm">
            {isChinese ? '订单' : 'Order'} #{order.id}
          </p>
          <p className="text-xs text-slate-400">{order.date}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusStyle(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      {/* Items */}
      <div className="py-3 border-y border-slate-50">
        {order.items.slice(0, 2).map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm mb-1">
            <span className="text-slate-600 truncate flex-1">{item.name}</span>
            <span className="text-slate-400 ml-2">x{item.quantity}</span>
          </div>
        ))}
        {order.items.length > 2 && (
          <p className="text-xs text-slate-400">
            +{order.items.length - 2} {isChinese ? '更多商品' : 'more items'}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3">
        <div>
          <p className="text-xs text-slate-400">{isChinese ? '总计' : 'Total'}</p>
          <p className="font-bold text-slate-900">
            ¥{order.totalAmount.toLocaleString()}
          </p>
        </div>
        
        {showAction && order.status === 'Paid' && onAction && (
          <button
            onClick={() => onAction(order.id, 'ship')}
            className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors min-h-[36px]"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
export { OrderCard };
export type { OrderCardProps };
