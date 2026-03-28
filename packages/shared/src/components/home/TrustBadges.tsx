'use client';

import React from 'react';
import { GraduationCap, Shield, Award, CheckCircle2, Users, Globe } from 'lucide-react';

/**
 * Trust Badges - Display Authority Certifications
 */
export const TrustBadges: React.FC = () => {
  const certifications = [
    { icon: GraduationCap, label: 'ACVS Certified', color: 'text-emerald-400' },
    { icon: Shield, label: 'ECVS Approved', color: 'text-blue-400' },
    { icon: Award, label: 'ISO 13485', color: 'text-purple-400' },
    { icon: CheckCircle2, label: 'CE Certified', color: 'text-amber-400' },
  ];

  return (
    <div className="pt-12 border-t border-white/10">
      <p className="text-sm text-slate-400 font-medium mb-6 uppercase tracking-widest">
        Global Standards · Internationally Recognized
      </p>
      <div className="flex flex-wrap gap-6">
        {certifications.map((cert, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <cert.icon className={`w-6 h-6 ${cert.color}`} />
            <span className="text-sm font-bold text-white">{cert.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Statistics Display Component
 */
export const StatsDisplay: React.FC = () => {
  const stats = [
    { value: '3000+', label: 'Graduates', icon: Users },
    { value: '50+', label: 'Certified Instructors', icon: GraduationCap },
    { value: '200+', label: 'Partner Clinics', icon: Shield },
    { value: '35+', label: 'Countries', icon: Globe },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-12">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all"
        >
          <stat.icon className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-4xl font-extrabold text-white mb-2">{stat.value}</p>
          <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};
