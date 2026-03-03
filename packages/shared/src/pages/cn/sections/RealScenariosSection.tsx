'use client';

import React from 'react';
import { GraduationCap, Stethoscope, Rocket } from 'lucide-react';

interface RealScenariosSectionProps {
  t: Record<string, any>;
}

const scenarios = [
  {
    titleKey: 'scenario1Title',
    descKey: 'scenario1Desc',
    icon: GraduationCap,
    color: 'bg-emerald-100 text-emerald-600',
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80',
    imageAlt: 'Training workshop with mentor',
  },
  {
    titleKey: 'scenario2Title',
    descKey: 'scenario2Desc',
    icon: Stethoscope,
    color: 'bg-blue-100 text-blue-600',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80',
    imageAlt: 'Veterinarian examining a pet',
  },
  {
    titleKey: 'scenario3Title',
    descKey: 'scenario3Desc',
    icon: Rocket,
    color: 'bg-amber-100 text-amber-600',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=600&q=80',
    imageAlt: 'Pet health and career development',
  },
];

export default function RealScenariosSection({ t }: RealScenariosSectionProps) {
  const h = t.cnHome;
  return (
    <section className="py-24 bg-[#FFFBF5]">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {h.scenarioTitle}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {scenarios.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.titleKey} className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                {/* Image */}
                <div className="h-48 overflow-hidden">
                  <img
                    src={s.image}
                    alt={s.imageAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                {/* Content */}
                <div className="p-6">
                  <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{h[s.titleKey]}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{h[s.descKey]}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom line */}
        <div className="mt-14 text-center">
          <p className="text-slate-500 font-medium text-sm">
            {h.scenarioBottom}
          </p>
        </div>
      </div>
    </section>
  );
}
