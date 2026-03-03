'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Award, Microscope } from 'lucide-react';

interface HeroSectionProps {
  locale: string;
  t: Record<string, any>;
}

export default function HeroSection({ locale, t }: HeroSectionProps) {
  const h = t.cnHome;
  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden bg-[#FFFBF5]">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="space-y-7">
            {/* Capability tags */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: h.heroTag1 || '国际专家授课', icon: Award, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                { label: h.heroTag2 || '实操训练', icon: Microscope, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                { label: h.heroTag3 || '专科进阶', icon: GraduationCap, color: 'bg-amber-50 text-amber-600 border-amber-100' },
              ].map((tag) => {
                const Icon = tag.icon;
                return (
                  <span key={tag.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${tag.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {tag.label}
                  </span>
                );
              })}
            </div>

            <h1 className="text-4xl lg:text-[3.25rem] font-extrabold text-slate-900 leading-[1.15] tracking-tight">
              {h.heroTitle}
              <br />
              <span className="text-[#00A884]">{h.heroTitleLine2}</span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-line max-w-lg">
              {h.heroSubtitle}
            </p>

            <div className="flex flex-wrap gap-4 pt-1">
              <Link
                href={`/${locale}/growth-system`}
                className="px-8 py-4 bg-[#00A884] text-white rounded-2xl font-bold text-base hover:bg-[#009474] transition-all shadow-lg shadow-[#00A884]/20 hover:-translate-y-0.5"
              >
                {h.heroCtaPrimary}
              </Link>
              <a
                href="#training"
                className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                {h.heroCtaSecondary}
                <span aria-hidden="true">&#8595;</span>
              </a>
            </div>

            <p className="text-sm text-slate-400 font-medium">
              {h.heroSupport}
            </p>
          </div>

          {/* Right: Training scene + stats overlay */}
          <div className="relative">
            {/* Main image */}
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/10 aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80"
                alt="Veterinarian examining a pet"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Floating stats card */}
            <div className="absolute -bottom-6 -left-4 sm:-left-8 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-slate-200 overflow-hidden">
              <div className="flex divide-x divide-slate-100">
                {[
                  { value: h.heroStat1 || '20+', label: h.heroStat1Label || '国际认证导师' },
                  { value: h.heroStat2 || '95%', label: h.heroStat2Label || '学员满意度' },
                  { value: h.heroStat3 || '50+', label: h.heroStat3Label || '专科课程' },
                ].map((stat) => (
                  <div key={stat.label} className="px-5 py-4 text-center">
                    <p className="text-xl font-extrabold text-[#00A884]">{stat.value}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorative blur */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-200/30 rounded-full blur-[80px] -z-10"></div>
            <div className="absolute -bottom-8 left-0 w-40 h-40 bg-[#00A884]/10 rounded-full blur-[60px] -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
