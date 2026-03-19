'use client';

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'default' | 'blue' | 'amber' | 'green' | 'red';
  icon?: string;
}

const colorClasses = {
  default: 'border-gray-200',
  blue: 'border-blue-200 bg-blue-50/50',
  amber: 'border-amber-200 bg-amber-50/50',
  green: 'border-emerald-200 bg-emerald-50/50',
  red: 'border-red-200 bg-red-50/50',
};

const valueColors = {
  default: 'text-gray-900',
  blue: 'text-blue-600',
  amber: 'text-amber-600',
  green: 'text-emerald-600',
  red: 'text-red-600',
};

export default function KPICard({ label, value, subtitle, color = 'default', icon }: KPICardProps) {
  return (
    <div className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${valueColors[color]}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {icon && <span className="text-2xl opacity-40">{icon}</span>}
      </div>
    </div>
  );
}
