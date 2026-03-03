'use client';

import React from 'react';
import {
  Briefcase,
  Rocket,
  Store,
  ArrowRight,
  MapPin,
  Building2,
} from 'lucide-react';

interface CareerStartupHighlightsProps {
  locale: string;
  dw: Record<string, string>;
}

const recommendedJobs = [
  { title: '骨科专科兽医', company: '北京瑞派宠物医院', location: '北京', match: '95%' },
  { title: '外科主治医生', company: '上海申普宠物医院', location: '上海', match: '88%' },
];

export function CareerStartupHighlights({ locale, dw }: CareerStartupHighlightsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-bold text-slate-900 mb-5">
        {dw.careerStartupTitle || '职业与事业机会'}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recommended Jobs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              {dw.careerRecommended || '推荐岗位'}
            </h3>
            <a href={`/${locale}/doctor/career`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5">
              {dw.careerViewJobs || '查看全部岗位'} <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          {recommendedJobs.map((job, i) => (
            <div key={i} className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-50 transition-colors">
              <p className="text-sm font-medium text-slate-800">{job.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500 flex items-center gap-0.5"><Building2 className="w-3 h-3" />{job.company}</span>
                <span className="text-xs text-slate-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location}</span>
              </div>
              <span className="inline-block mt-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">匹配度 {job.match}</span>
            </div>
          ))}
        </div>

        {/* Startup Update */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Rocket className="w-4 h-4 text-amber-500" />
              {dw.careerStartupUpdate || '创业支持动态'}
            </h3>
            <a href={`/${locale}/doctor/startup`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5">
              {dw.careerViewStartup || '了解创业支持'} <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
            <p className="text-sm font-medium text-amber-800">创业工具包已更新</p>
            <p className="text-xs text-amber-600/70 mt-1">新增宠物健康管理中心选址评估工具、运营成本计算器。</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
            <p className="text-sm font-medium text-amber-800">创业分享会</p>
            <p className="text-xs text-amber-600/70 mt-1">本周六 14:00 线上分享：从医生到创业者的转型经验。</p>
          </div>
        </div>

        {/* Highlighted: Health Center */}
        <div className="relative p-5 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <Store className="w-8 h-8 text-teal-200 mb-3" />
          <h3 className="text-base font-bold mb-2">{dw.careerHealthCenter || '新型宠物健康管理中心'}</h3>
          <p className="text-xs text-teal-100 leading-relaxed mb-4">
            {dw.careerHealthCenterDesc || '全新的创业模型：以家庭医生服务为核心，整合培训能力与客户经营，打造可持续的宠物健康管理事业。'}
          </p>
          <a
            href={`/${locale}/doctor/startup`}
            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-white/20 rounded-lg px-3 py-1.5 hover:bg-white/30 transition-colors"
          >
            了解详情 <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default CareerStartupHighlights;
