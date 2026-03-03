'use client';

import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { WelcomeSummaryCard } from './modules/WelcomeSummaryCard';
import { TodayTasksPanel } from './modules/TodayTasksPanel';
import { QuickActionsGrid } from './modules/QuickActionsGrid';
import { ClientOverviewStats } from './modules/ClientOverviewStats';
import { ClinicalWorkPanel } from './modules/ClinicalWorkPanel';
import { GrowthProgressCard } from './modules/GrowthProgressCard';
import { CareerStartupHighlights } from './modules/CareerStartupHighlights';

export function DoctorHomePage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  return (
    <div className="space-y-6">
      {/* 1. Welcome Summary */}
      <WelcomeSummaryCard locale={locale} dw={dw} />

      {/* 2. Today's Tasks + 3. Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <TodayTasksPanel locale={locale} dw={dw} />
        </div>
        <div className="lg:col-span-2">
          <QuickActionsGrid locale={locale} dw={dw} />
        </div>
      </div>

      {/* 4. Client Overview */}
      <ClientOverviewStats dw={dw} />

      {/* 5. Clinical Work */}
      <ClinicalWorkPanel locale={locale} dw={dw} />

      {/* 6. Growth Progress */}
      <GrowthProgressCard locale={locale} dw={dw} />

      {/* 7. Career & Startup */}
      <CareerStartupHighlights locale={locale} dw={dw} />
    </div>
  );
}

export default DoctorHomePage;
