'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, UserCheck, Lightbulb, TrendingUp } from 'lucide-react';

interface CommunitySectionProps {
  locale: string;
  t: Record<string, any>;
}

const topics = [
  { titleKey: 'communityTopic1', descKey: 'communityTopic1Desc', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-600' },
  { titleKey: 'communityTopic2', descKey: 'communityTopic2Desc', icon: UserCheck, color: 'bg-blue-100 text-blue-600' },
  { titleKey: 'communityTopic3', descKey: 'communityTopic3Desc', icon: Lightbulb, color: 'bg-amber-100 text-amber-600' },
  { titleKey: 'communityTopic4', descKey: 'communityTopic4Desc', icon: TrendingUp, color: 'bg-teal-100 text-teal-600' },
];

export default function CommunitySection({ locale, t }: CommunitySectionProps) {
  const h = t.cnHome;
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-5">
            {h.communityTitle}
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed whitespace-pre-line">
            {h.communitySubtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topics.map((topic) => {
            const Icon = topic.icon;
            return (
              <div key={topic.titleKey} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:bg-white hover:shadow-lg hover:border-slate-200 transition-all duration-300">
                <div className={`w-10 h-10 rounded-xl ${topic.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{h[topic.titleKey]}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{h[topic.descKey]}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href={`/${locale}/community`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
          >
            {h.communityCta}
            <span>&#8594;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
