'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useSiteConfig } from '../../context/SiteConfigContext';
import {
  getIntlClinicPrograms,
  submitIntlLead,
  IntlClinicProgram,
} from '../../services/intl-api';
import {
  GraduationCap,
  TrendingUp,
  Wrench,
  HeartHandshake,
  BookOpen,
  Headphones,
  Settings,
  ArrowRight,
  CheckCircle,
  Hospital,
  Send,
} from 'lucide-react';

export default function ForClinicsPageClient() {
  const { t, language } = useLanguage();
  const { siteConfig } = useSiteConfig();
  const locale = language || siteConfig.defaultLocale;
  const fc = (t as any).forClinics || {};

  // Dynamic clinic programs from database
  const [programs, setPrograms] = useState<IntlClinicProgram[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);

  const [formData, setFormData] = useState({
    clinicName: '',
    contact: '',
    email: '',
    phone: '',
    interest: '',
    clinicStage: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load clinic programs
  useEffect(() => {
    getIntlClinicPrograms().then(data => {
      setPrograms(data);
      setProgramsLoading(false);
    });
  }, []);

  const interestOptions = fc.formInterestOptions
    ? fc.formInterestOptions.split(',').map((o: string) => o.trim())
    : ['Training + Equipment Package', 'Clinic Setup Consultation', 'Equipment Only Quote', 'Custom Training Program', 'Full Clinic Upgrade'];

  const clinicStageOptions = [
    'Planning / Pre-opening',
    'Newly Opened (< 1 year)',
    'Expanding Services',
    'Equipment Upgrade',
    'Established (3+ years)',
  ];

  const tierIcons = [GraduationCap, TrendingUp, Wrench];
  const tierAccents = [
    'border-emerald-200 bg-emerald-50/30',
    'border-blue-200 bg-blue-50/30',
    'border-purple-200 bg-purple-50/30',
  ];
  const tierIconBgs = [
    'bg-emerald-100 text-emerald-600',
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
  ];

  // Fallback tiers from translation if no programs in DB
  const fallbackTiers = [
    {
      title: fc.tier1Title,
      desc: fc.tier1Desc,
      items: fc.tier1Items ? fc.tier1Items.split(',').map((s: string) => s.trim()) : [],
      icon: GraduationCap,
      accent: 'border-emerald-200 bg-emerald-50/30',
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
      title: fc.tier2Title,
      desc: fc.tier2Desc,
      items: fc.tier2Items ? fc.tier2Items.split(',').map((s: string) => s.trim()) : [],
      icon: TrendingUp,
      accent: 'border-blue-200 bg-blue-50/30',
      iconBg: 'bg-blue-100 text-blue-600',
    },
    {
      title: fc.tier3Title,
      desc: fc.tier3Desc,
      items: fc.tier3Items ? fc.tier3Items.split(',').map((s: string) => s.trim()) : [],
      icon: Wrench,
      accent: 'border-purple-200 bg-purple-50/30',
      iconBg: 'bg-purple-100 text-purple-600',
    },
  ];

  const benefits = [
    { title: fc.benefit1Title || 'Training-Led Approach', desc: fc.benefit1Desc || 'Equipment recommendations backed by clinical training expertise.', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
    { title: fc.benefit2Title || 'Advisory Support', desc: fc.benefit2Desc || 'Dedicated team to help you choose the right path for your clinic.', icon: HeartHandshake, color: 'bg-blue-50 text-blue-600' },
    { title: fc.benefit3Title || 'Ongoing Assistance', desc: fc.benefit3Desc || 'Post-purchase training and equipment support from our team.', icon: Headphones, color: 'bg-purple-50 text-purple-600' },
    { title: fc.benefit4Title || 'Custom Configuration', desc: fc.benefit4Desc || 'Equipment packages tailored to your clinic specialty and scale.', icon: Settings, color: 'bg-amber-50 text-amber-600' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await submitIntlLead({
        lead_type: 'clinic_consultation',
        contact_name: formData.contact,
        email: formData.email || undefined,
        mobile: formData.phone || undefined,
        clinic_name: formData.clinicName || undefined,
        interest: formData.interest || undefined,
        clinic_stage: formData.clinicStage || undefined,
        requirement_text: formData.message || undefined,
        source_page: 'for-clinics',
      });
      setSubmitted(true);
    } catch {
      // Still show success to user
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col bg-white">

      {/* 1. HERO */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 bg-slate-50">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">{fc.heroTag}</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              {fc.heroTitle}
            </h1>

            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
              {fc.heroSubtitle}
            </p>

            <button
              onClick={() => document.getElementById('consultation')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              {fc.heroCTA || 'Request a Consultation'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. UPGRADE TIERS / CLINIC PROGRAMS */}
      <section className="py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          {programsLoading ? (
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border-2 border-slate-100 p-8 animate-pulse">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 mb-6" />
                  <div className="h-7 bg-slate-100 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-full mb-6" />
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-5/6" />
                    <div className="h-4 bg-slate-100 rounded w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : programs.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {programs.slice(0, 3).map((prog, idx) => {
                const Icon = tierIcons[idx % tierIcons.length];
                return (
                  <div
                    key={prog.id}
                    className={`rounded-2xl border-2 p-8 ${tierAccents[idx % tierAccents.length]} hover:shadow-xl transition-all duration-300`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${tierIconBgs[idx % tierIconBgs.length]}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{prog.name}</h3>
                    {prog.tagline && <p className="text-slate-500 mb-4 leading-relaxed">{prog.tagline}</p>}
                    <ul className="space-y-3 mb-6">
                      {prog.included_training_scope && (
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm font-medium text-slate-700">{prog.included_training_scope}</span>
                        </li>
                      )}
                      {prog.included_equipment_scope && (
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm font-medium text-slate-700">{prog.included_equipment_scope}</span>
                        </li>
                      )}
                      {prog.expected_outcome && (
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm font-medium text-slate-700">{prog.expected_outcome}</span>
                        </li>
                      )}
                    </ul>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {prog.target_clinic_type && (
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                          <Hospital className="w-3 h-3 inline mr-1" />{prog.target_clinic_type}
                        </span>
                      )}
                      {prog.support_level && (
                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-bold text-emerald-700">
                          {prog.support_level}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => document.getElementById('consultation')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    >
                      {fc.tierCTA || 'Request Consultation'} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback to translation-based tiers */
            <div className="grid md:grid-cols-3 gap-8">
              {fallbackTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border-2 p-8 ${tier.accent} hover:shadow-xl transition-all duration-300`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${tier.iconBg}`}>
                    <tier.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{tier.title}</h3>
                  <p className="text-slate-500 mb-6 leading-relaxed">{tier.desc}</p>
                  <ul className="space-y-3 mb-8">
                    {tier.items.map((item: string, iIdx: number) => (
                      <li key={iIdx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-medium text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => document.getElementById('consultation')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                  >
                    {fc.tierCTA || 'Request Consultation'} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. BENEFITS */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{fc.benefitsTitle}</h2>
            <p className="mt-4 text-slate-500 text-lg">{fc.benefitsSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {benefits.map((b, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg transition-shadow duration-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${b.color}`}>
                  <b.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg mb-3">{b.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CONSULTATION FORM */}
      <section id="consultation" className="py-24 bg-white scroll-mt-24">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{fc.formTitle || 'Request a Consultation'}</h2>
              <p className="mt-4 text-slate-500 text-lg">{fc.formSubtitle || 'Tell us about your clinic and goals. Our team will reach out within 1-2 business days.'}</p>
            </div>

            {submitted ? (
              <div className="text-center py-16 bg-emerald-50 rounded-3xl border border-emerald-100">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                <p className="text-xl font-bold text-slate-900 mb-2">{fc.formSuccess || 'Consultation Request Submitted'}</p>
                <p className="text-slate-500">Our team will get back to you within 1-2 business days.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-slate-50 rounded-3xl p-8 md:p-12 border border-slate-200 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{fc.formClinicName || 'Clinic Name'}</label>
                    <input
                      type="text"
                      value={formData.clinicName}
                      onChange={e => setFormData(d => ({ ...d, clinicName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{fc.formContact || 'Your Name'} *</label>
                    <input
                      type="text"
                      required
                      value={formData.contact}
                      onChange={e => setFormData(d => ({ ...d, contact: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{fc.formEmail || 'Email'} *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{fc.formPhone || 'Phone'}</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{fc.formInterest || 'Interest Area'}</label>
                    <select
                      value={formData.interest}
                      onChange={e => setFormData(d => ({ ...d, interest: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    >
                      <option value="">Select...</option>
                      {interestOptions.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Clinic Stage</label>
                    <select
                      value={formData.clinicStage}
                      onChange={e => setFormData(d => ({ ...d, clinicStage: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    >
                      <option value="">Select...</option>
                      {clinicStageOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{fc.formMessage || 'Additional Details'}</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={e => setFormData(d => ({ ...d, message: e.target.value }))}
                    placeholder="Tell us about your clinic goals, current equipment, or specific needs..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> {fc.formSubmit || 'Submit Consultation Request'}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
