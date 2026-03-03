'use client';

import React from 'react';
import { Briefcase, Rocket, CheckCircle, Store, ArrowRight } from 'lucide-react';

interface CareerEntrepreneurSectionProps {
  locale: string;
  t: Record<string, any>;
}

export default function CareerEntrepreneurSection({ locale, t }: CareerEntrepreneurSectionProps) {
  const h = t.cnHome;
  const leftItems = h.careerLeftItems as string[];
  const rightItems = h.careerRightItems as string[];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-5">
            {h.careerTitle}
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed whitespace-pre-line">
            {h.careerSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Career */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{h.careerLeftTitle}</h3>
            </div>
            <ul className="space-y-4">
              {leftItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Entrepreneurship */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                <Rocket className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{h.careerRightTitle}</h3>
            </div>
            <ul className="space-y-4 mb-6">
              {rightItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Health Center highlight card */}
        <div className="mt-8 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-8 lg:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 grid lg:grid-cols-[auto_1fr] gap-6 items-start">
            <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-3">{h.careerHealthCenter || '新型宠物健康管理中心'}</h3>
              <p className="text-teal-100 leading-relaxed text-sm max-w-2xl mb-5">
                {h.careerHealthCenterDesc || '区别于传统宠物医院，以"预防+健康管理+家庭医生"为核心的轻量化创业模式。平台提供完整的商业模型、选址指南、服务设计与运营工具包。'}
              </p>
              <a
                href={`/${locale}/career-development#startup-direction`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-700 rounded-xl font-bold text-sm hover:bg-teal-50 transition-colors"
              >
                了解事业发展 <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-12 text-center">
          <p className="inline-block px-6 py-3 bg-slate-100 text-slate-700 rounded-full text-sm font-bold">
            {h.careerBottom}
          </p>
        </div>
      </div>
    </section>
  );
}
