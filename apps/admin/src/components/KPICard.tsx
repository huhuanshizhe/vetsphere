'use client';

import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'emerald' | 'amber' | 'red' | 'purple';
}

const colorMap = {
  default: 'border-white/5',
  emerald: 'border-emerald-500/20',
  amber: 'border-amber-500/20',
  red: 'border-red-500/20',
  purple: 'border-purple-500/20',
};

const accentMap = {
  default: 'text-slate-900',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
};

const KPICard: React.FC<KPICardProps> = ({ label, value, subtitle, color = 'default' }) => {
  return (
    <div className={`bg-black/20 border ${colorMap[color]} rounded-2xl p-5 sm:p-6 backdrop-blur-sm`}>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
        {label}
      </p>
      <p className={`text-2xl sm:text-3xl font-black ${accentMap[color]} tracking-tight`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-slate-600 mt-2 font-medium">{subtitle}</p>
      )}
    </div>
  );
};

export default KPICard;
