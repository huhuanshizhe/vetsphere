'use client';

import React from 'react';
import { BookOpen, Stethoscope, TrendingUp, Rocket, Users } from 'lucide-react';

interface GrowthPathSectionProps {
  t: Record<string, any>;
}

const steps = [
  { key: 'growthStep1', icon: BookOpen, color: 'bg-amber-500' },
  { key: 'growthStep2', icon: Stethoscope, color: 'bg-amber-500' },
  { key: 'growthStep3', icon: TrendingUp, color: 'bg-amber-500' },
  { key: 'growthStep4', icon: Rocket, color: 'bg-amber-500' },
  { key: 'growthStep5', icon: Users, color: 'bg-amber-500' },
];

export default function GrowthPathSection({ t }: GrowthPathSectionProps) {
  const h = t.cnHome;
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-5">
            {h.growthTitle}
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed whitespace-pre-line">
            {h.growthSubtitle}
          </p>
        </div>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden md:block">
          <div className="relative flex items-start justify-between gap-4">
            {/* Connecting line */}
            <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-amber-200"></div>

            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative flex flex-col items-center text-center flex-1 px-2">
                  {/* Circle node */}
                  <div className={`relative z-10 w-12 h-12 rounded-full ${step.color} text-white flex items-center justify-center shadow-lg shadow-amber-500/20 mb-5`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {/* Step number */}
                  <span className="text-xs font-black text-amber-500 mb-2">0{idx + 1}</span>
                  {/* Name */}
                  <h3 className="font-bold text-slate-900 mb-2 text-base">{h[step.key]}</h3>
                  {/* Description */}
                  <p className="text-sm text-slate-500 leading-relaxed">{h[`${step.key}Desc`]}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="md:hidden space-y-0">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex gap-4">
                {/* Timeline rail */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full ${step.color} text-white flex items-center justify-center shadow-md shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-amber-200 my-1"></div>
                  )}
                </div>
                {/* Content */}
                <div className="pb-8">
                  <span className="text-xs font-black text-amber-500">0{idx + 1}</span>
                  <h3 className="font-bold text-slate-900 text-base mt-1">{h[step.key]}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-1">{h[`${step.key}Desc`]}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom line */}
        <div className="mt-16 text-center">
          <p className="inline-block px-6 py-3 bg-amber-50 text-amber-700 rounded-full text-sm font-bold border border-amber-100">
            {h.growthBottom}
          </p>
        </div>
      </div>
    </section>
  );
}
