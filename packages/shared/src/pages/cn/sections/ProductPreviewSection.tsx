'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Users, ClipboardList, MessageCircle, Heart, FileText, ArrowRight } from 'lucide-react';

interface ProductPreviewSectionProps {
  locale: string;
  t: Record<string, any>;
}

export default function ProductPreviewSection({ locale, t }: ProductPreviewSectionProps) {
  const h = t.cnHome;

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-5">
            {h.prodTitle}
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed whitespace-pre-line">
            {h.prodSubtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* Main workspace mockup — large left column */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/5 overflow-hidden">
            {/* Workspace header bar */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-vetsphere.png" alt="" className="w-full h-full object-contain" />
              </div>
              <span className="text-white text-sm font-bold">医生工作台</span>
              <div className="ml-auto flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
              </div>
            </div>

            {/* Workspace content */}
            <div className="p-5 sm:p-6">
              {/* Welcome bar */}
              <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl p-4 mb-5 border border-amber-200/50">
                <h3 className="text-base font-bold text-slate-900">{h.prodWorkspaceWelcome || '下午好，张医生'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{h.prodWorkspaceWelcomeSub || '今天也是充满价值的一天'}</p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: '待随访', value: '3', color: 'text-rose-500 bg-rose-50' },
                  { label: '待回复', value: '2', color: 'text-purple-500 bg-purple-50' },
                  { label: '活跃客户', value: '128', color: 'text-blue-500 bg-blue-50' },
                  { label: '本月病历', value: '56', color: 'text-emerald-500 bg-emerald-50' },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-xl p-3 text-center ${stat.color}`}>
                    <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-[10px] font-medium mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: ClipboardList, label: '新建病历', color: 'text-blue-600 bg-blue-50' },
                  { icon: Users, label: '添加客户', color: 'text-green-600 bg-green-50' },
                  { icon: MessageCircle, label: '开始问诊', color: 'text-purple-600 bg-purple-50' },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <div key={action.label} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${action.color} cursor-pointer hover:shadow-sm transition-shadow`}>
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] font-semibold">{action.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column — 3 feature sub-modules */}
          <div className="lg:col-span-2 space-y-4">
            {[
              {
                titleKey: 'prodMod1Title',
                descKey: 'prodMod1Desc',
                icon: Calendar,
                iconColor: 'text-amber-500 bg-amber-50',
                borderColor: 'border-amber-100',
              },
              {
                titleKey: 'prodMod2Title',
                descKey: 'prodMod2Desc',
                icon: Users,
                iconColor: 'text-blue-500 bg-blue-50',
                borderColor: 'border-blue-100',
              },
              {
                titleKey: 'prodMod3Title',
                descKey: 'prodMod3Desc',
                icon: ClipboardList,
                iconColor: 'text-emerald-500 bg-emerald-50',
                borderColor: 'border-emerald-100',
              },
              {
                titleKey: 'prodMod4Title',
                descKey: 'prodMod4Desc',
                icon: MessageCircle,
                iconColor: 'text-purple-500 bg-purple-50',
                borderColor: 'border-purple-100',
              },
            ].map((mod) => {
              const Icon = mod.icon;
              return (
                <div key={mod.titleKey} className={`bg-white rounded-xl border ${mod.borderColor} p-5 hover:shadow-md transition-shadow`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${mod.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm mb-1">{h[mod.titleKey]}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{h[mod.descKey]}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* CTA */}
            <Link
              href={`/${locale}/doctor`}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              进入工作台
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
