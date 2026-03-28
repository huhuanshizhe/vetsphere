'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PORTAL_THEME } from '../lib/constants';
import { useLanguage } from '../context/LanguageContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { supabase } from '../services/supabase';

// Specialty translations for auth form (multi-language)
const specialtyTranslations: Record<string, Record<string, string>> = {
  'Orthopedics': { zh: '骨科', th: 'ศัลยกรรมกระดูก', ja: '整形外科' },
  'Neurosurgery': { zh: '神经外科', th: 'ประสาทศัลยกรรม', ja: '神経外科' },
  'Soft Tissue': { zh: '软组织外科', th: 'ศัลยกรรมเนื้อเยื่ออ่อน', ja: '軟部組織外科' },
  'Ophthalmology': { zh: '眼科', th: 'จักษุวิทยา', ja: '眼科' },
  'Cardiothoracic': { zh: '心胸外科', th: 'ศัลยกรรมหัวใจและทรวงอก', ja: '心臓胸部外科' },
  'Oncology': { zh: '肿瘤科', th: 'มะเร็งวิทยา', ja: '腫瘍科' },
  'Dentistry': { zh: '牙科', th: 'ทันตกรรม', ja: '歯科' },
};

interface AuthProps {
  portalType?: UserRole;
}

const Auth: React.FC<AuthProps> = ({ portalType = 'Doctor' }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { t, locale, language } = useLanguage();
  const { isCN } = useSiteConfig();

  // Helper: pick localized text by language
  const loc = (en: string, zh?: string, th?: string, ja?: string) => {
    if (language === 'zh' && zh) return zh;
    if (language === 'th' && th) return th;
    if (language === 'ja' && ja) return ja;
    return en;
  };

  const getSpecialtyLabel = (key: string) => {
    const tr = specialtyTranslations[key];
    if (!tr) return key;
    return loc(key, tr.zh, tr.th, tr.ja);
  };
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    license: '',
    clinic: '',
    company: '',
    discipline: '',
    idNumber: ''
  });

  // Theme Logic
  const currentTheme = PORTAL_THEME[portalType] || PORTAL_THEME.Doctor;
  const isDarkTheme = portalType === 'Admin';
  const isDoctor = portalType === 'Doctor';
  const isPartnerPortal = portalType === 'ShopSupplier' || portalType === 'CourseProvider';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && isPartnerPortal) {
        // Vendor Application Flow
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
        }, 1500);
        return;
    }

    setLoading(true);
    setErrorMsg('');

    if (!validateEmail(formData.email)) {
      setErrorMsg(t.auth.invalidEmail);
      setLoading(false);
      return;
    }
    if (!isLogin && formData.password.length < 8) {
      setErrorMsg(t.auth.passwordTooShort);
      setLoading(false);
      return;
    }

    try {
      const { user } = await api.login(formData.email, formData.password);
      
      // Role Check - reject if role doesn't match portal type (except Doctor portal which accepts all)
      if (portalType !== 'Doctor' && user.role !== portalType) {
        throw new Error(`Access denied. Your account role is "${user.role}" but this portal requires "${portalType}".`);
      }

      login(user);
      router.push(`/${locale}/dashboard`);

    } catch (error: any) {
      console.error("Authentication Error:", error);
      setErrorMsg(error.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handlePasswordReset = async () => {
    if (!validateEmail(resetEmail)) {
      setErrorMsg(t.auth.invalidEmail);
      return;
    }
    setResetLoading(true);
    setErrorMsg('');
    try {
      // Call our custom Edge Function to send branded password reset email
      const response = await fetch(`${window.location.origin}/api/auth/send-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: resetEmail,
          locale: locale || 'en'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reset email');
      }
      
      // In development, we might get the recovery link back for testing
      if (result.recoveryLink) {
        console.log('Password reset link (dev only):', result.recoveryLink);
      }
      
      setResetSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMsg(err.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  if (submitted) {
      return (
          <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDarkTheme ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
              <div className="max-w-md w-full bg-white rounded-[40px] p-12 text-center shadow-2xl animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-emerald-50 text-vs rounded-full flex items-center justify-center text-4xl mx-auto mb-8">✓</div>
                  <h2 className="text-2xl font-black mb-4">{t.auth.applySuccess.split('!')[0]}!</h2>
                  <p className="text-slate-500 font-medium leading-relaxed mb-10">
                      {t.auth.applySuccess}
                  </p>
                  <button onClick={() => router.push(`/${locale}`)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-vs transition-all">
                      {t.auth.vetHome}
                  </button>
              </div>
          </div>
      );
  }

  // --- RENDER VARIANT 1: DOCTOR ---
  if (isDoctor) {
    return (
      <div className="min-h-[calc(100vh-80px)] pt-24 pb-12 bg-slate-50 flex items-center justify-center px-4 relative overflow-hidden font-sans">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-emerald-100 rounded-full blur-[100px] opacity-40 mix-blend-multiply"></div>
            <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-40 mix-blend-multiply"></div>
         </div>

         <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 border border-white z-10 overflow-hidden grid md:grid-cols-2 min-h-[600px] animate-in fade-in zoom-in-95 duration-500">
             <div className="relative hidden md:flex flex-col justify-end p-12 text-white bg-slate-900 overflow-hidden group">
                 <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-105">
                    <img 
                        src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80" 
                        className="w-full h-full object-cover opacity-60"
                        alt="Surgery Context"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                 </div>
                 
                 <div className="relative z-10 space-y-6">
                     <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl border border-white/20 shadow-lg">👨‍⚕️</div>
                     <div>
                        <h2 className="text-3xl font-black leading-tight tracking-tight mb-3 whitespace-pre-line">{t.auth.heroTitle}</h2>
                        <p className="text-white/70 font-medium leading-relaxed max-w-sm text-sm">{t.auth.heroDesc}</p>
                     </div>
                     <div className="flex flex-wrap gap-3 pt-2">
                        <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-400">✓ {t.auth.badgeCE}</div>
                        <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-400">✓ {t.auth.badgeGlobal}</div>
                     </div>
                 </div>
             </div>

             <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
                 <div className="max-w-sm mx-auto w-full space-y-8">
                     <div className="text-center md:text-left">
                        <h3 className="text-2xl font-black text-slate-900 mb-2">{isLogin ? t.auth.welcomeBack : t.auth.applyMember}</h3>
                        <p className="text-slate-500 text-sm font-bold">{isLogin ? t.auth.loginDesc : t.auth.applyDesc}</p>
                     </div>

                     <form onSubmit={handleAuth} className="space-y-5">
                        {!isLogin && (
                            <div className="space-y-4 animate-in slide-in-from-right fade-in duration-300">
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t.auth.fullName}</label>
                                        <input type="text" required 
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-vs outline-none transition-all"
                                            value={formData.fullName} onChange={e => handleChange('fullName', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t.auth.license}</label>
                                        <input type="text" required 
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-vs outline-none transition-all"
                                            value={formData.license} onChange={e => handleChange('license', e.target.value)} />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t.auth.clinic}</label>
                                    <input type="text" required 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-vs outline-none transition-all"
                                        value={formData.clinic} onChange={e => handleChange('clinic', e.target.value)} />
                                 </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t.auth.email}</label>
                            <input type="email" required 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-vs outline-none transition-all"
                                value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.auth.password}</label>
                                {isLogin && <button type="button" onClick={() => { setShowResetModal(true); setResetEmail(formData.email); setResetSent(false); setErrorMsg(''); }} className="text-xs font-bold text-vs hover:underline">{t.auth.forgotPass}</button>}
                            </div>
                            <input type="password" required 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-vs outline-none transition-all"
                                value={formData.password} onChange={e => handleChange('password', e.target.value)} />
                            {!isLogin && formData.password && (
                              <div className="flex gap-1 mt-2">
                                <div className={`h-1 flex-1 rounded ${formData.password.length >= 8 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                <div className={`h-1 flex-1 rounded ${/[A-Z]/.test(formData.password) ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                <div className={`h-1 flex-1 rounded ${/[0-9]/.test(formData.password) ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                              </div>
                            )}
                        </div>
                        {errorMsg && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold animate-in fade-in duration-200">
                                {errorMsg}
                            </div>
                        )}
                        <button type="submit" disabled={loading} className="w-full bg-vs text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-vs/20 hover:bg-[#008F6F] hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {loading ? t.auth.authenticating : (isLogin ? t.auth.signIn : t.auth.joinNetwork)}
                        </button>
                     </form>

                     <p className="text-center text-xs font-bold text-slate-500 mt-6">
                         {isLogin ? t.auth.noAccount : t.auth.hasAccount} 
                         <button onClick={() => setIsLogin(!isLogin)} className="text-vs ml-1.5 hover:underline font-black">
                             {isLogin ? t.auth.registerNow : t.auth.signInLink}
                         </button>
                     </p>
                 </div>

                 {/* Password Reset Modal */}
                 {showResetModal && (
                   <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowResetModal(false)}>
                     <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                       {!resetSent ? (
                         <>
                           <h3 className="text-xl font-black text-slate-900 mb-2">{t.auth.resetPassword}</h3>
                           <p className="text-sm text-slate-500 mb-6">{t.auth.loginDesc}</p>
                           <input
                             type="email"
                             value={resetEmail}
                             onChange={e => setResetEmail(e.target.value)}
                             placeholder={t.auth.email}
                             className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-vs outline-none transition-all mb-3"
                           />
                           {errorMsg && (
                             <p className="text-red-500 text-xs font-bold mb-3">{errorMsg}</p>
                           )}
                           <div className="flex gap-3">
                             <button onClick={() => setShowResetModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition">
                               {t.common.cancel}
                             </button>
                             <button onClick={handlePasswordReset} disabled={resetLoading} className="flex-1 py-3 bg-vs text-white rounded-xl font-bold text-sm hover:bg-[#008F6F] transition flex items-center justify-center gap-2">
                               {resetLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                               {t.auth.sendResetLink}
                             </button>
                           </div>
                         </>
                       ) : (
                         <div className="text-center py-4">
                           <div className="text-5xl mb-4">✉️</div>
                           <h3 className="text-xl font-black text-slate-900 mb-2">{t.auth.resetPassword}</h3>
                           <p className="text-sm text-slate-500 mb-6">{t.auth.resetEmailSent}</p>
                           <button onClick={() => setShowResetModal(false)} className="w-full py-3 bg-vs text-white rounded-xl font-bold text-sm hover:bg-[#008F6F] transition">
                             {t.common.confirm}
                           </button>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
             </div>
         </div>
      </div>
    );
  }

  // --- RENDER VARIANT 2: ADMIN / SUPPLIER (Partnership Flow Added) ---
  return (
    <div className={`min-h-screen flex ${currentTheme.colors.lightBg} relative font-sans`}>
      <Link href="/" className={`absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm group backdrop-blur-md
        ${isDarkTheme ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white'}`}>
         <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
         <span className="text-xs font-bold uppercase tracking-widest">{t.auth.vetHome}</span>
      </Link>

      <div className={`hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br ${currentTheme.meta.gradient}`}>
        <div className="absolute inset-0 bg-black/10 z-10"></div>
        <img src={currentTheme.meta.image} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" alt="Background" />
        <div className="relative z-20 p-20 flex flex-col justify-between h-full text-white">
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-inner">{currentTheme.meta.icon}</div>
              <span className="font-black tracking-[0.3em] uppercase text-xs opacity-80">VetSphere {portalType === 'Admin' ? 'Authority' : 'Partner Network'}</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter leading-tight mb-6">
                {isLogin ? currentTheme.meta.title : t.auth.applyPartner}
            </h1>
            <p className="text-xl font-medium opacity-80 max-w-md leading-relaxed">
                {isLogin ? currentTheme.meta.subtitle : t.auth.partnerDesc}
            </p>
          </div>
          <div className="space-y-4 bg-white/10 backdrop-blur-lg p-8 rounded-3xl border border-white/10">
            <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">{loc('Network Status', '网络状态', 'สถานะเครือข่าย', 'ネットワーク状態')}</p>
            <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                 <span className="font-bold text-sm">{loc('Open for Academic Partners', '学术合作伙伴开放中', 'เปิดรับพันธมิตรทางวิชาการ', '学術パートナー募集中')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-20 ${isDarkTheme ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="w-full max-w-md space-y-10 mt-16 lg:mt-0">
          <div className="text-center lg:text-left">
            <h2 className={`text-4xl font-black tracking-tight mb-3 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                {isLogin ? t.auth.restricted : t.auth.applyPartner}
            </h2>
            <p className="font-medium text-sm text-slate-500">
                {isLogin ? `${t.auth.enterCreds} ${portalType}.` : t.auth.partnerDesc}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
                <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                    <div>
                        <label className={`block text-xs font-black uppercase mb-2 tracking-widest ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>{t.auth.companyName}</label>
                        <input type="text" required placeholder={loc('Organization Name', '机构名称', 'ชื่อองค์กร', '組織名')}
                            className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkTheme ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                            value={formData.company} onChange={e => handleChange('company', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-xs font-black uppercase mb-2 tracking-widest ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>{t.auth.contactPerson}</label>
                            <input type="text" required
                                className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkTheme ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                                value={formData.fullName} onChange={e => handleChange('fullName', e.target.value)} />
                        </div>
                        <div>
                            <label className={`block text-xs font-black uppercase mb-2 tracking-widest ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>{t.auth.disciplineFocus}</label>
                            <select className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkTheme ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                                value={formData.discipline} onChange={e => handleChange('discipline', e.target.value)}>
                                <option value="Orthopedics">{getSpecialtyLabel('Orthopedics')}</option>
                                <option value="Neurosurgery">{getSpecialtyLabel('Neurosurgery')}</option>
                                <option value="Soft Tissue">{getSpecialtyLabel('Soft Tissue')}</option>
                                <option value="Ophthalmology">{getSpecialtyLabel('Ophthalmology')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
            <div>
              <label className={`block text-xs font-black uppercase mb-2 tracking-widest ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>{t.auth.email}</label>
              <input type="email" required placeholder={isLogin ? 'your@email.com' : 'contact@org.com'}
                className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkTheme ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 focus:border-vs'}`}
                value={formData.email} onChange={e => handleChange('email', e.target.value)}
              />
            </div>
            <div>
              <label className={`block text-xs font-black uppercase mb-2 tracking-widest ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>{t.auth.password}</label>
              <input type="password" required placeholder="••••••••"
                className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkTheme ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 focus:border-vs'}`}
                value={formData.password} onChange={e => handleChange('password', e.target.value)}
              />
            </div>
            {errorMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold animate-in fade-in duration-200 ${isDarkTheme ? 'bg-red-900/30 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                    {errorMsg}
                </div>
            )}
            <button type="submit" disabled={loading}
              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all transform active:scale-95 text-white ${currentTheme.colors.primaryBg} hover:opacity-90 shadow-lg`}
            >
              {loading ? t.auth.authenticating : (isLogin ? t.auth.secureLogin : loc('Submit Application', '提交申请', 'ส่งใบสมัคร', '申請を送信'))}
            </button>
          </form>

          {portalType !== 'Admin' && (
            <p className="text-center text-xs font-bold text-slate-500 mt-6">
                {isLogin ? t.auth.noAccount : t.auth.hasAccount} 
                <button onClick={() => setIsLogin(!isLogin)} className={`${currentTheme.colors.primaryText} ml-1.5 hover:underline font-black`}>
                    {isLogin ? t.auth.registerNow : t.auth.signInLink}
                </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
