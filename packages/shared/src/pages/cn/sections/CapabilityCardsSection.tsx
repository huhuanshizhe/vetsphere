'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Stethoscope, TrendingUp, Rocket, ArrowRight, Award, Microscope, BookOpen, ClipboardList, Users, FolderHeart, MessageCircle } from 'lucide-react';

interface CapabilityCardsSectionProps {
  locale: string;
  t: Record<string, any>;
}

export default function CapabilityCardsSection({ locale, t }: CapabilityCardsSectionProps) {
  const h = t.cnHome;

  const secondaryCards = [
    {
      titleKey: 'capBTitle',
      itemsKey: 'capBItems',
      ctaKey: 'capBCta',
      href: '/doctor',
      icon: Stethoscope,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      checkColor: 'text-blue-500',
      ctaColor: 'text-blue-600 hover:text-blue-700',
    },
    {
      titleKey: 'capCTitle',
      itemsKey: 'capCItems',
      ctaKey: 'capCCta',
      href: '/career-development#career-path',
      icon: TrendingUp,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      checkColor: 'text-amber-500',
      ctaColor: 'text-amber-600 hover:text-amber-700',
    },
    {
      titleKey: 'capDTitle',
      itemsKey: 'capDItems',
      ctaKey: 'capDCta',
      href: '/career-development#startup-direction',
      icon: Rocket,
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      checkColor: 'text-teal-500',
      ctaColor: 'text-teal-600 hover:text-teal-700',
    },
  ];

  return (
    <section id="capabilities" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            {h.capTitle}
          </h2>
          <p className="text-lg text-slate-500">
            {h.capSubtitle}
          </p>
        </div>

        {/* Primary card: Training & Professional Growth — full-width hero card */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-8 lg:p-10 relative overflow-hidden">
            {/* Badge */}
            <span className="absolute top-6 right-6 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {h.capABadge || '核心入口'}
            </span>

            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left: text */}
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{h.capATitle}</h3>
                </div>

                <p className="text-slate-600 leading-relaxed mb-6 max-w-lg">
                  {h.capADesc}
                </p>

                <ul className="grid grid-cols-2 gap-3 mb-6">
                  {(h.capAItems as string[]).map((item: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <span className="text-emerald-500 font-bold text-sm">&#10003;</span>
                      <span className="text-slate-700 text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/${locale}/growth-system`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/15"
                >
                  {h.capACta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Right: visual icons */}
              <div className="hidden lg:grid grid-cols-2 gap-3">
                {[
                  { icon: Award, label: '国际认证导师', color: 'bg-emerald-100 text-emerald-600' },
                  { icon: Microscope, label: '实操训练', color: 'bg-teal-100 text-teal-600' },
                  { icon: BookOpen, label: '专科系统课程', color: 'bg-green-100 text-green-600' },
                  { icon: GraduationCap, label: '院校合作', color: 'bg-lime-100 text-lime-600' },
                ].map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div key={tool.label} className="bg-white rounded-xl p-5 border border-emerald-100 flex flex-col items-center gap-3 text-center hover:shadow-md transition-shadow">
                      <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{tool.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary cards: 3-column */}
        <div className="grid md:grid-cols-3 gap-6">
          {secondaryCards.map((card) => {
            const Icon = card.icon;
            const items = h[card.itemsKey] as string[];
            return (
              <div
                key={card.titleKey}
                className={`${card.bg} border ${card.border} rounded-2xl p-7 hover:shadow-lg transition-all duration-300 group`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-11 h-11 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{h[card.titleKey]}</h3>
                </div>

                <ul className="space-y-2.5 mb-5">
                  {items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <span className={`${card.checkColor} font-bold text-sm`}>&#10003;</span>
                      <span className="text-slate-700 text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/${locale}${card.href}`}
                  className={`inline-flex items-center gap-1.5 text-sm font-bold ${card.ctaColor} transition-colors group-hover:underline`}
                >
                  {h[card.ctaKey]}
                  <span className="transition-transform group-hover:translate-x-0.5">&#8594;</span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
