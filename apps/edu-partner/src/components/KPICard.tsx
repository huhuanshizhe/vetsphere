'use client';

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'default' | 'purple' | 'amber' | 'green' | 'red';
  icon?: string;
}

const colorClasses = {
  default: 'border-purple-500/20 bg-purple-500/5',
  purple: 'border-purple-500/30 bg-purple-500/10',
  amber: 'border-amber-500/30 bg-amber-500/10',
  green: 'border-green-500/30 bg-green-500/10',
  red: 'border-red-500/30 bg-red-500/10',
};

const valueColors = {
  default: 'text-white',
  purple: 'text-purple-400',
  amber: 'text-amber-400',
  green: 'text-green-400',
  red: 'text-red-400',
};

export default function KPICard({ label, value, subtitle, color = 'default', icon }: KPICardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${valueColors[color]}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}
