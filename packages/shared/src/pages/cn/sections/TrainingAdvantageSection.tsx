'use client';

import React from 'react';
import { Globe, Microscope, GitBranch, Handshake } from 'lucide-react';

interface TrainingAdvantageSectionProps {
  t: Record<string, any>;
}

const cards = [
  {
    titleKey: 'trainCard1Title',
    descKey: 'trainCard1Desc',
    icon: Globe,
    accent: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-100 text-emerald-600',
    borderColor: 'border-emerald-200',
  },
  {
    titleKey: 'trainCard2Title',
    descKey: 'trainCard2Desc',
    icon: Microscope,
    accent: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-100 text-blue-600',
    borderColor: 'border-blue-200',
  },
  {
    titleKey: 'trainCard3Title',
    descKey: 'trainCard3Desc',
    icon: GitBranch,
    accent: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-100 text-amber-600',
    borderColor: 'border-amber-200',
  },
  {
    titleKey: 'trainCard4Title',
    descKey: 'trainCard4Desc',
    icon: Handshake,
    accent: 'from-purple-500 to-indigo-600',
    iconBg: 'bg-purple-100 text-purple-600',
    borderColor: 'border-purple-200',
  },
];

export default function TrainingAdvantageSection({ t }: TrainingAdvantageSectionProps) {
  const h = t.cnHome;

  return (
    <section id="training" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 mb-5">
            培训是平台的核心入口
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-5">
            {h.trainTitle}
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            {h.trainSubtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={card.titleKey}
                className={`bg-white border ${card.borderColor} rounded-2xl p-6 hover:shadow-xl transition-all duration-300 group relative overflow-hidden`}
              >
                {/* Top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.accent}`} />

                <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-3">{h[card.titleKey]}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{h[card.descKey]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
