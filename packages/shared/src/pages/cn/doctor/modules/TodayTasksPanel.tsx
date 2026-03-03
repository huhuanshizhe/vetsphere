'use client';

import React from 'react';
import {
  MessageCircle,
  Users,
  ClipboardList,
  GraduationCap,
  Stethoscope,
  ArrowRight,
} from 'lucide-react';

interface TodayTasksPanelProps {
  locale: string;
  dw: Record<string, string>;
}

const taskConfig = [
  { titleKey: 'taskConsultReply', fallback: '待回复问诊', ctaKey: 'taskCtaReply', ctaFallback: '去回复', icon: MessageCircle, color: 'text-purple-500 bg-purple-50', href: '/consultations', count: 2 },
  { titleKey: 'taskFollowup', fallback: '待随访客户', ctaKey: 'taskCtaFollowup', ctaFallback: '去随访', icon: Users, color: 'text-rose-500 bg-rose-50', href: '/clients', count: 3 },
  { titleKey: 'taskRecord', fallback: '未完成病历', ctaKey: 'taskCtaRecord', ctaFallback: '去完善', icon: ClipboardList, color: 'text-blue-500 bg-blue-50', href: '/records', count: 1 },
  { titleKey: 'taskCourse', fallback: '今日课程提醒', ctaKey: 'taskCtaCourse', ctaFallback: '去学习', icon: GraduationCap, color: 'text-teal-500 bg-teal-50', href: '/courses', count: 1 },
  { titleKey: 'taskRevisit', fallback: '近期复诊提醒', ctaKey: 'taskCtaRevisit', ctaFallback: '查看安排', icon: Stethoscope, color: 'text-amber-500 bg-amber-50', href: '/records', count: 2 },
];

export function TodayTasksPanel({ locale, dw }: TodayTasksPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-bold text-slate-900 mb-4">
        {dw.todayTitle || '今天需要优先处理的事项'}
      </h2>
      <div className="space-y-2.5">
        {taskConfig.map((task) => {
          const Icon = task.icon;
          const [iconColorClass, iconBgClass] = task.color.split(' ');
          return (
            <div
              key={task.titleKey}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass} ${iconColorClass}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-sm font-medium text-slate-700">{dw[task.titleKey] || task.fallback}</span>
                  <span className="ml-2 text-xs font-bold text-slate-900 bg-slate-200 rounded-full px-1.5 py-0.5">{task.count}</span>
                </div>
              </div>
              <a
                href={`/${locale}/doctor${task.href}`}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {dw[task.ctaKey] || task.ctaFallback}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TodayTasksPanel;
