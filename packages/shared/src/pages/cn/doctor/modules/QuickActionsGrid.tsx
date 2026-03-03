'use client';

import React from 'react';
import {
  ClipboardList,
  PawPrint,
  MessageCircle,
  Users,
} from 'lucide-react';

interface QuickActionsGridProps {
  locale: string;
  dw: Record<string, string>;
}

const actions = [
  { key: 'quickNewRecord', fallback: '新建病历', icon: ClipboardList, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100', href: '/records' },
  { key: 'quickNewPetProfile', fallback: '添加宠物档案', icon: PawPrint, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100', href: '/clients' },
  { key: 'quickStartConsult', fallback: '发起问诊', icon: MessageCircle, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100', href: '/consultations' },
  { key: 'quickViewClients', fallback: '查看客户列表', icon: Users, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100', href: '/clients' },
];

export function QuickActionsGrid({ locale, dw }: QuickActionsGridProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-bold text-slate-900 mb-4">
        {dw.quickActionsTitle || '快速开始'}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <a
              key={action.key}
              href={`/${locale}/doctor${action.href}`}
              className={`flex flex-col items-center gap-2.5 p-5 rounded-xl text-center transition-all border ${action.color}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-semibold">{dw[action.key] || action.fallback}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActionsGrid;
