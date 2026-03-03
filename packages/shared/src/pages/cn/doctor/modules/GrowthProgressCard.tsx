'use client';

import React from 'react';
import {
  TrendingUp,
  BookOpen,
  Award,
  Tag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface GrowthProgressCardProps {
  locale: string;
  dw: Record<string, string>;
}

const enrolledCourses = [
  { name: 'CSAVS 小动物骨科手术实操训练', progress: 65 },
  { name: '小动物软组织外科基础', progress: 30 },
];

const skillTags = ['骨科基础', '软组织外科', '术后管理', '影像学判读'];

export function GrowthProgressCard({ locale, dw }: GrowthProgressCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          {dw.growthProgressTitle || '你的成长进度'}
        </h2>
        <a href={`/${locale}/doctor/courses`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5">
          {dw.growthViewCourses || '查看我的课程'} <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Enrolled + Completed */}
        <div className="space-y-4">
          {/* Enrolled courses */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {dw.growthEnrolledCourses || '在学课程'}
            </h3>
            <div className="space-y-2.5">
              {enrolledCourses.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50/80">
                  <p className="text-sm font-medium text-slate-800 mb-2">{c.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${c.progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{c.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completed */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <Award className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <span className="text-sm font-medium text-slate-700">{dw.growthCompletedCourses || '已完成课程'}</span>
              <span className="text-lg font-bold text-emerald-600 ml-2">2</span>
            </div>
          </div>
        </div>

        {/* Right: Skills + Recommended Path */}
        <div className="space-y-4">
          {/* Skill tags */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {dw.growthSkillTags || '技能标签'}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {skillTags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-100">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Recommended path */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {dw.growthRecommendedPath || '推荐学习路径'}
            </h3>
            <a href={`/${locale}/courses`} className="block p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 hover:from-amber-100 hover:to-orange-100 transition-colors">
              <p className="text-sm font-medium text-amber-800">小动物骨科专科进阶路径</p>
              <p className="text-xs text-amber-600/70 mt-1">完成基础课程后推荐：关节外科 → 脊柱外科 → 骨折修复高阶</p>
            </a>
          </div>

          {/* Reconnect hint */}
          <p className="text-xs text-slate-400 italic">
            {dw.growthReconnectHint || '持续学习，让培训成果延续到每一天的临床工作'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default GrowthProgressCard;
