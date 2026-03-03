'use client';

import React from 'react';
import {
  Users,
  UserCheck,
  PawPrint,
  HeartPulse,
  Stethoscope,
} from 'lucide-react';

interface ClientOverviewStatsProps {
  dw: Record<string, string>;
}

const metrics = [
  { key: 'clientMonthlyActive', fallback: '本月活跃客户数', value: '28', icon: Users, color: 'text-blue-600 bg-blue-50' },
  { key: 'clientPendingFollowup', fallback: '待随访客户数', value: '5', icon: UserCheck, color: 'text-rose-600 bg-rose-50' },
  { key: 'clientWeeklyNewPets', fallback: '本周新增宠物档案', value: '3', icon: PawPrint, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'clientLongTermManaged', fallback: '长期健康管理客户数', value: '12', icon: HeartPulse, color: 'text-purple-600 bg-purple-50' },
  { key: 'clientWeeklyRevisits', fallback: '本周复诊次数', value: '7', icon: Stethoscope, color: 'text-amber-600 bg-amber-50' },
];

export function ClientOverviewStats({ dw }: ClientOverviewStatsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-bold text-slate-900 mb-4">
        {dw.clientOverviewTitle || '你的客户经营概览'}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const [textColor, bgColor] = metric.color.split(' ');
          return (
            <div key={metric.key} className="bg-slate-50/80 rounded-xl p-4 text-center hover:bg-slate-100 transition-colors">
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2.5 ${bgColor} ${textColor}`}>
                <Icon className="w-4.5 h-4.5" />
              </span>
              <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">{dw[metric.key] || metric.fallback}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ClientOverviewStats;
