'use client';

import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

interface WelcomeSummaryCardProps {
  locale: string;
  dw: Record<string, string>;
}

export function WelcomeSummaryCard({ locale, dw }: WelcomeSummaryCardProps) {
  const { user } = useAuth();
  const userName = user?.name || '医生';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
      <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />

      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {getGreeting()}，{userName}
            </h1>
            <p className="text-amber-100 text-sm sm:text-base">
              {dw.welcomeSubtitle || '今天也是充满价值的一天'}
            </p>
            <p className="text-amber-200/80 text-xs mt-1">
              {(dw.welcomeDailySummary || '你有 {tasks} 项待办，{clients} 位客户待随访')
                .replace('{tasks}', '3')
                .replace('{clients}', '2')}
            </p>
            <p className="text-amber-200/60 text-xs">
              {(dw.welcomeGrowthReminder || '距离下一个成长里程碑还差 {points} 积分')
                .replace('{points}', '30')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col sm:gap-2">
            <a
              href={`/${locale}/doctor/records`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur text-white text-sm font-medium rounded-lg hover:bg-white/30 transition-colors"
            >
              {dw.welcomeCtaTodo || '查看今日待办'}
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href={`/${locale}/doctor/courses`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {dw.welcomeCtaLearn || '继续学习'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeSummaryCard;
