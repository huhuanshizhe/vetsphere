'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Stethoscope, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface LearningPath {
  id: string;
  role: 'student' | 'practicing' | 'owner';
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  steps: string[];
  ctaText: string;
  ctaHref: string;
}

/**
 * Learning Paths - Role-based career development tracks
 */
export const LearningPaths: React.FC<{ locale: string }> = ({ locale }) => {
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const paths: LearningPath[] = [
    {
      id: 'student',
      role: 'student',
      icon: GraduationCap,
      title: t.learningPaths.studentTitle,
      subtitle: t.learningPaths.studentSubtitle,
      color: 'text-emerald-600',
      bgColor: 'from-emerald-50 to-emerald-100',
      steps: [
        t.learningPaths.studentStep1,
        t.learningPaths.studentStep2,
        t.learningPaths.studentStep3,
        t.learningPaths.studentStep4,
      ],
      ctaText: t.learningPaths.studentCTA,
      ctaHref: `/${locale}/courses?level=beginner`,
    },
    {
      id: 'practicing',
      role: 'practicing',
      icon: Stethoscope,
      title: t.learningPaths.practicingTitle,
      subtitle: t.learningPaths.practicingSubtitle,
      color: 'text-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      steps: [
        t.learningPaths.practicingStep1,
        t.learningPaths.practicingStep2,
        t.learningPaths.practicingStep3,
        t.learningPaths.practicingStep4,
      ],
      ctaText: t.learningPaths.practicingCTA,
      ctaHref: `/${locale}/courses?level=advanced`,
    },
    {
      id: 'owner',
      role: 'owner',
      icon: Building2,
      title: t.learningPaths.ownerTitle,
      subtitle: t.learningPaths.ownerSubtitle,
      color: 'text-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      steps: [
        t.learningPaths.ownerStep1,
        t.learningPaths.ownerStep2,
        t.learningPaths.ownerStep3,
        t.learningPaths.ownerStep4,
      ],
      ctaText: t.learningPaths.ownerCTA,
      ctaHref: `/${locale}/for-clinics`,
    },
  ];

  const selectedPath = paths.find(p => p.id === selectedRole);

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white vs-pattern">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700 uppercase tracking-widest">
              {t.learningPaths.tag}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            {t.learningPaths.title}
          </h2>
          <p className="text-xl text-slate-500">
            {t.learningPaths.subtitle}
          </p>
        </div>

        {/* Role Selector */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {paths.map((path) => (
            <button
              key={path.id}
              onClick={() => setSelectedRole(path.id)}
              className={`relative p-8 rounded-3xl border-2 transition-all duration-300 text-left group ${
                selectedRole === path.id
                  ? `bg-white border-emerald-500 shadow-xl scale-[1.02]`
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-lg'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${path.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <path.icon className={`w-8 h-8 ${path.color}`} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{path.title}</h3>
              <p className="text-slate-500 mb-6">{path.subtitle}</p>
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                {path.ctaText}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
              {selectedRole === path.id && (
                <div className="absolute top-4 right-4 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Expanded Details */}
        {selectedPath && (
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Steps */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6">
                    {selectedPath.title} {t.learningPaths.tag}
                  </h3>
                  {selectedPath.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedPath.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <span className={`font-bold ${selectedPath.color}`}>{idx + 1}</span>
                      </div>
                      <div className="pt-2">
                        <p className="text-lg font-bold text-slate-900">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
                  <h4 className="text-xl font-bold text-slate-900 mb-4">
                    {t.learningPaths.readyTitle}
                  </h4>
                  <p className="text-slate-500 mb-6">
                    {t.learningPaths.readySubtitle} {selectedPath.title.toLowerCase()} {t.learningPaths.tag}
                  </p>
                  <Link
                    href={selectedPath.ctaHref}
                    className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-bold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-xl shadow-emerald-900/20 hover:shadow-emerald-500/30 hover:-translate-y-1 flex items-center justify-center gap-3"
                  >
                    {selectedPath.ctaText}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Default Message */}
        {!selectedPath && (
          <div className="text-center py-12">
            <p className="text-lg text-slate-500">
              {t.learningPaths.defaultHint}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
