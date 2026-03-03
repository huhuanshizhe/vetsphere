'use client';

import React from 'react';
import { GraduationCap, Building2, Package, Landmark } from 'lucide-react';

interface CooperationSectionProps {
  t: Record<string, any>;
}

const coopCards = [
  { titleKey: 'coopCard1Title', descKey: 'coopCard1Desc', icon: GraduationCap },
  { titleKey: 'coopCard2Title', descKey: 'coopCard2Desc', icon: Building2 },
  { titleKey: 'coopCard3Title', descKey: 'coopCard3Desc', icon: Package },
  { titleKey: 'coopCard4Title', descKey: 'coopCard4Desc', icon: Landmark },
];

export default function CooperationSection({ t }: CooperationSectionProps) {
  const h = t.cnHome;
  return (
    <section className="py-16 bg-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-700 tracking-tight mb-3">
            {h.coopTitle}
          </h2>
          <p className="text-sm text-slate-500">
            {h.coopSubtitle || '与教育机构、宠物医院、医疗品牌与政策机构共同推动行业升级。'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {coopCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.titleKey}
                className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mb-3 group-hover:bg-[#00A884]/10 group-hover:text-[#00A884] transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1.5">{h[card.titleKey]}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{h[card.descKey]}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <a
            href="mailto:support@vetsphere.net"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-xl font-bold text-sm hover:bg-slate-600 transition-colors"
          >
            {h.coopCta}
            <span>&#8594;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
