'use client';

import React from 'react';
import { useSite, SiteCode } from '@/context/SiteContext';
import { Globe, MapPin, Globe2 } from 'lucide-react';

interface SiteSwitcherProps {
  permissions?: string[];
  size?: 'sm' | 'md';
}

const SITE_CONFIG: Record<SiteCode, { 
  label: string; 
  icon: React.ElementType;
  activeText: string;
  activeBg: string;
  hoverBg: string;
}> = {
  global: {
    label: 'ALL',
    icon: Globe,
    activeText: 'text-purple-700',
    activeBg: 'bg-purple-50',
    hoverBg: 'hover:bg-purple-50/50',
  },
  cn: {
    label: '中国站',
    icon: MapPin,
    activeText: 'text-blue-700',
    activeBg: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-50/50',
  },
  intl: {
    label: '国际站',
    icon: Globe2,
    activeText: 'text-orange-700',
    activeBg: 'bg-orange-50',
    hoverBg: 'hover:bg-orange-50/50',
  },
};

/**
 * 站点切换器 - Segmented Control 风格
 * 超级管理员可见 ALL/中国站/国际站
 * 普通管理员仅可见 中国站/国际站
 */
const SiteSwitcher: React.FC<SiteSwitcherProps> = ({ 
  permissions = ['*'],
  size = 'md',
}) => {
  const { currentSite, setCurrentSite } = useSite();
  const isSuperAdmin = permissions.includes('*');

  // Super admins see all 3 options; regular admins see CN & INTL only
  const visibleCodes: SiteCode[] = isSuperAdmin
    ? ['global', 'cn', 'intl']
    : ['cn', 'intl'];

  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-1.5 text-[11px] gap-1'
    : 'px-3 py-2 text-xs gap-1.5';

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
      {visibleCodes.map((code) => {
        const cfg = SITE_CONFIG[code];
        const isActive = currentSite === code;
        const Icon = cfg.icon;

        return (
          <button
            key={code}
            onClick={() => setCurrentSite(code)}
            className={`
              flex items-center ${sizeClasses} rounded-md font-semibold
              transition-all duration-150
              ${isActive
                ? `${cfg.activeBg} ${cfg.activeText} shadow-sm`
                : `text-slate-500 ${cfg.hoverBg} hover:text-slate-700`
              }
            `}
          >
            <Icon className={iconSize} />
            <span>{cfg.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SiteSwitcher;
