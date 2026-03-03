'use client';

import React from 'react';
import Link from 'next/link';
import { UserPlus, ArrowRight, Shield } from 'lucide-react';

interface FinalCTASectionProps {
  locale: string;
  t: Record<string, any>;
}

export default function FinalCTASection({ locale, t }: FinalCTASectionProps) {
  const h = t.cnHome;
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-[#00A884]/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px]"></div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 text-center relative z-10">
        {/* Badge */}
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/10 rounded-full text-xs text-white/80 font-bold mb-8">
          <Shield className="w-3.5 h-3.5" />
          {h.finalBadge || '免费注册 · 医生专属'}
        </span>

        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
          {h.finalTitle}
        </h2>
        <p className="text-lg text-slate-400 leading-relaxed whitespace-pre-line mb-10 max-w-xl mx-auto">
          {h.finalSubtitle}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href={`/${locale}/auth`}
            className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-[#00A884] text-white rounded-2xl font-bold text-base hover:bg-[#009474] transition-all shadow-lg shadow-[#00A884]/20 hover:-translate-y-0.5"
          >
            <UserPlus className="w-5 h-5" />
            {h.finalCtaPrimary}
          </Link>
          <a
            href="mailto:support@vetsphere.net"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-base hover:bg-white/20 transition-all"
          >
            {h.finalCtaSecondary}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
