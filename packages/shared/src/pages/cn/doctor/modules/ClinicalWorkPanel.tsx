'use client';

import React from 'react';
import {
  ClipboardList,
  MessageCircle,
  UserCheck,
  ArrowRight,
} from 'lucide-react';

interface ClinicalWorkPanelProps {
  locale: string;
  dw: Record<string, string>;
}

const recentRecords = [
  { pet: '豆豆（金毛）', owner: '张先生', date: '2026-03-03', diagnosis: '前十字韧带损伤' },
  { pet: '小白（英短）', owner: '李女士', date: '2026-03-02', diagnosis: '皮肤真菌感染' },
  { pet: '旺财（柴犬）', owner: '王先生', date: '2026-03-01', diagnosis: '髌骨脱位 Grade II' },
];

const recentConsults = [
  { client: '赵女士', topic: '猫咪食欲下降', time: '10:30', status: '进行中' },
  { client: '孙先生', topic: '术后恢复咨询', time: '昨天', status: '已完成' },
  { client: '周女士', topic: '疫苗接种时间', time: '昨天', status: '已完成' },
];

const recentFollowups = [
  { pet: '豆豆（金毛）', owner: '张先生', reason: '术后 7 天复查', dueDate: '明天' },
  { pet: '毛毛（泰迪）', owner: '吴女士', reason: '皮肤治疗复查', dueDate: '后天' },
  { pet: '小黑（拉布拉多）', owner: '郑先生', reason: '血常规复查', dueDate: '3月6日' },
];

function ListSection({
  title,
  icon,
  color,
  href,
  viewAllText,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  viewAllText: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className={`w-6 h-6 rounded-md flex items-center justify-center ${color}`}>{icon}</span>
          {title}
        </h3>
        <a href={href} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5">
          {viewAllText} <ArrowRight className="w-3 h-3" />
        </a>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export function ClinicalWorkPanel({ locale, dw }: ClinicalWorkPanelProps) {
  const viewAll = dw.clinicalViewAll || '查看全部';
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-bold text-slate-900 mb-5">
        {dw.clinicalTitle || '你的日常临床工作'}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Records */}
        <ListSection
          title={dw.clinicalRecentRecords || '最近病历'}
          icon={<ClipboardList className="w-3.5 h-3.5" />}
          color="text-blue-500 bg-blue-50"
          href={`/${locale}/doctor/records`}
          viewAllText={viewAll}
        >
          {recentRecords.map((r, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 transition-colors">
              <p className="text-sm font-medium text-slate-800">{r.pet}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.diagnosis} · {r.date}</p>
            </div>
          ))}
        </ListSection>

        {/* Recent Consultations */}
        <ListSection
          title={dw.clinicalRecentConsults || '最近问诊'}
          icon={<MessageCircle className="w-3.5 h-3.5" />}
          color="text-purple-500 bg-purple-50"
          href={`/${locale}/doctor/consultations`}
          viewAllText={viewAll}
        >
          {recentConsults.map((c, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">{c.client}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.status === '进行中' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{c.topic} · {c.time}</p>
            </div>
          ))}
        </ListSection>

        {/* Recent Follow-ups */}
        <ListSection
          title={dw.clinicalRecentFollowups || '最近随访'}
          icon={<UserCheck className="w-3.5 h-3.5" />}
          color="text-rose-500 bg-rose-50"
          href={`/${locale}/doctor/clients`}
          viewAllText={viewAll}
        >
          {recentFollowups.map((f, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 transition-colors">
              <p className="text-sm font-medium text-slate-800">{f.pet}</p>
              <p className="text-xs text-slate-500 mt-0.5">{f.reason} · <span className="text-amber-600 font-medium">{f.dueDate}</span></p>
            </div>
          ))}
        </ListSection>
      </div>
    </div>
  );
}

export default ClinicalWorkPanel;
