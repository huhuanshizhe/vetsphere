
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Specialty } from '../types';
import { useLanguage } from '../context/LanguageContext';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col bg-white">
      
      {/* 1. HERO SECTION: Clean, Clinical, Authoritative */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden bg-slate-50">
        <div className="vs-container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Text Content */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">{t.home.heroTag}</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                {t.home.heroTitle1} <br/>
                <span className="text-emerald-600">{t.home.heroTitle2}</span>
              </h1>
              
              <p className="text-lg text-slate-500 max-w-lg leading-relaxed font-medium">
                {t.home.heroDesc}
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/courses" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                  {t.home.ctaCourse}
                </Link>
                <Link to="/shop" className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all flex items-center gap-2">
                  <span>{t.home.ctaShop}</span>
                  <span>→</span>
                </Link>
              </div>

              <div className="pt-8 flex items-center gap-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <span>{t.home.heroBadge1}</span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                <span>{t.home.heroBadge2}</span>
              </div>
            </div>

            {/* Right: High-Fidelity Clinical Image (No AI effects) */}
            <div className="relative animate-in fade-in zoom-in duration-1000 delay-100">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100 aspect-[4/3]">
                <img 
                  src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1600&q=90" 
                  alt="Veterinary Surgeon in Operating Room" 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-[2s]"
                />
                {/* Minimal Caption Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent p-8 pt-24">
                  <p className="text-white font-bold text-lg">{t.home.imgCaption}</p>
                  <p className="text-slate-300 text-sm">{t.home.imgLoc}</p>
                </div>
              </div>
              
              {/* Floating Badge: Accredited Faculty */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-[200px] hidden md:block">
                <p className="text-4xl font-extrabold text-slate-900 mb-1">50+</p>
                <p className="text-sm text-slate-500 font-medium leading-tight">{t.home.floatBadge}</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. GLOBAL ACADEMIC ALLIANCES: The "Beacon" Section */}
      <section className="bg-white border-b border-slate-100 py-24 relative overflow-hidden">
        {/* Subtle patterned background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="vs-container relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
             <div className="inline-flex items-center gap-2 mb-4 px-4 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest">{t.home.partnerBadge}</span>
             </div>
             <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">{t.home.partnerTitle}</h2>
             <p className="text-slate-500 font-medium text-lg leading-relaxed">{t.home.partnerSubtitle}</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 mb-8">
             
             {/* Strategic Partner (Featured) */}
             <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-10 text-white relative overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col justify-between min-h-[320px]">
                <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl grayscale group-hover:scale-110 transition-transform rotate-12">🐊</div>
                <div>
                    <div className="inline-block px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 border border-white/20">Strategic Partner</div>
                    <h3 className="text-3xl font-black leading-tight mb-4">{t.home.uniUF}</h3>
                    <p className="text-blue-100 font-medium leading-relaxed text-sm max-w-sm">{t.home.uniUFDesc}</p>
                </div>
                <div className="flex gap-2 mt-8">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span className="w-2 h-2 rounded-full bg-white/20"></span>
                    <span className="w-2 h-2 rounded-full bg-white/20"></span>
                </div>
             </div>

             {/* Academic Pillars (Top 3) */}
             <div className="lg:col-span-7 grid md:grid-cols-3 gap-4">
                {[
                    { title: t.home.uniRVC, desc: t.home.uniRVCDesc, color: 'border-l-4 border-l-blue-500' },
                    { title: t.home.uniUCD, desc: t.home.uniUCDDesc, color: 'border-l-4 border-l-yellow-500' },
                    { title: t.home.uniCornell, desc: t.home.uniCornellDesc, color: 'border-l-4 border-l-red-500' }
                ].map((uni, idx) => (
                    <div key={idx} className={`bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col ${uni.color}`}>
                        <div className="w-10 h-10 bg-slate-50 rounded-xl mb-4 flex items-center justify-center text-xl grayscale opacity-50">🏛️</div>
                        <h4 className="font-black text-slate-900 text-lg leading-tight mb-2">{uni.title}</h4>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed mt-auto">{uni.desc}</p>
                    </div>
                ))}
             </div>
          </div>

          {/* Specialist Network Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {[
                 { name: t.home.uniCSU, role: t.home.uniCSUDesc },
                 { name: t.home.uniPenn, role: t.home.uniPennDesc },
                 { name: t.home.uniVetsuisse, role: t.home.uniVetsuisseDesc },
                 { name: t.home.uniEdin, role: t.home.uniEdinDesc },
                 { name: t.home.uniUtrecht, role: t.home.uniUtrechtDesc },
                 { name: t.home.uniTexas, role: t.home.uniTexasDesc },
             ].map((u, i) => (
                 <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:bg-white hover:border-slate-200 transition-colors group">
                     <div className="h-8 mb-2 opacity-30 group-hover:opacity-100 transition-opacity text-2xl">🎓</div>
                     <p className="text-xs font-black text-slate-900 mb-1 leading-tight">{u.name}</p>
                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide truncate">{u.role}</p>
                 </div>
             ))}
          </div>

          <div className="mt-12 flex justify-center">
             <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 rounded-full text-white text-xs font-bold shadow-lg">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Faculty are Board-Certified Diplomates (ACVS / ECVS) from these institutions.
             </div>
          </div>

        </div>
      </section>

      {/* 3. STATS BAR: Trust Indicators */}
      <section className="border-b border-slate-100 bg-white">
        <div className="vs-container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: t.home.statCourses, value: '120+', sub: t.home.statCoursesSub },
              { label: t.home.statVets, value: '15k', sub: t.home.statVetsSub },
              { label: t.home.statCountries, value: '35', sub: t.home.statCountriesSub },
              { label: t.home.statDevices, value: 'ISO', sub: t.home.statDevicesSub },
            ].map((stat, idx) => (
              <div key={idx} className="border-l border-slate-100 pl-8 first:border-0">
                <h3 className="text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</h3>
                <p className="text-base font-bold text-slate-900">{stat.label}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CORE DISCIPLINES (The "Business") */}
      <section className="py-24 bg-white">
        <div className="vs-container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">{t.home.focusTag}</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{t.home.focusTitle}</h3>
            <p className="mt-4 text-slate-500 text-lg">
              {t.home.focusDesc}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Orthopedics Card - X-Ray/Bone Image */}
            <div 
              onClick={() => navigate('/courses', { state: { specialty: Specialty.ORTHOPEDICS } })}
              className="group cursor-pointer rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-slate-50"
            >
              <div className="h-64 overflow-hidden relative">
                {/* Changed to X-RAY image for clear Orthopedics context */}
                <img 
                  src="https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 grayscale" 
                  alt="Orthopedic X-Ray"
                />
                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors"></div>
              </div>
              <div className="p-8">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm mb-6">🦴</div>
                <h4 className="text-2xl font-bold text-slate-900 mb-3">{t.home.orthoTitle}</h4>
                <p className="text-base text-slate-500 leading-relaxed mb-6">
                  {t.home.orthoDesc}
                </p>
                <span className="text-sm font-black text-emerald-600 uppercase tracking-widest group-hover:underline">{t.home.explore}</span>
              </div>
            </div>

            {/* Neurosurgery Card - Brain MRI/Scan */}
            <div 
              onClick={() => navigate('/courses', { state: { specialty: Specialty.NEUROSURGERY } })}
              className="group cursor-pointer rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-slate-50"
            >
              <div className="h-64 overflow-hidden relative">
                {/* Changed to MRI Brain Scan for clear Neuro context */}
                <img 
                  src="https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  alt="Neurosurgery MRI"
                />
              </div>
              <div className="p-8">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm mb-6">🧠</div>
                <h4 className="text-2xl font-bold text-slate-900 mb-3">{t.home.neuroTitle}</h4>
                <p className="text-base text-slate-500 leading-relaxed mb-6">
                  {t.home.neuroDesc}
                </p>
                <span className="text-sm font-black text-emerald-600 uppercase tracking-widest group-hover:underline">{t.home.explore}</span>
              </div>
            </div>

            {/* Soft Tissue Card - Surgical Field/Operation */}
            <div 
              onClick={() => navigate('/courses', { state: { specialty: Specialty.SOFT_TISSUE } })}
              className="group cursor-pointer rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-slate-50"
            >
              <div className="h-64 overflow-hidden relative">
                {/* Changed to Sterile Surgical Field for Soft Tissue */}
                <img 
                  src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  alt="Soft Tissue Surgery"
                />
              </div>
              <div className="p-8">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm mb-6">🩹</div>
                <h4 className="text-2xl font-bold text-slate-900 mb-3">{t.home.softTitle}</h4>
                <p className="text-base text-slate-500 leading-relaxed mb-6">
                  {t.home.softDesc}
                </p>
                <span className="text-sm font-black text-emerald-600 uppercase tracking-widest group-hover:underline">{t.home.explore}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. EQUIPMENT SHOWCASE: Hardware Focus */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        {/* Abstract background detail */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-900/10 -skew-x-12"></div>
        
        <div className="vs-container relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">{t.home.equipTag}</h2>
              <h3 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                {t.home.equipTitle1} <br/> {t.home.equipTitle2}
              </h3>
              <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                {t.home.equipDesc}
              </p>
              
              <ul className="space-y-4 pt-4">
                {t.home.equipList.map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs text-white font-bold">✓</span>
                    <span className="font-medium text-slate-200 text-lg">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-8">
                <Link to="/shop" className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold text-base hover:bg-emerald-50 transition-all inline-block">
                  {t.home.equipCta}
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 shadow-2xl">
                 <img 
                   src="https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=800&q=80" 
                   alt="Surgical Drill" 
                   className="w-full h-auto rounded-xl mix-blend-overlay opacity-80"
                 />
                 <div className="absolute bottom-8 left-8 right-8 bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">{t.home.equipFeatureTag}</p>
                        <p className="text-2xl font-bold text-white">{t.home.equipFeatureName}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-white font-mono text-base">15,000 RPM</p>
                         <p className="text-slate-400 text-sm">{t.home.equipFeatureSpec}</p>
                      </div>
                    </div>
                 </div>
              </div>
              {/* Decorative Circle */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. GLOBAL NETWORK / MAP REPLACEMENT */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="vs-container">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 space-y-8">
              <h2 className="text-3xl font-extrabold text-slate-900">{t.home.netTitle}</h2>
              <p className="text-slate-600 leading-relaxed text-lg">
                {t.home.netDesc}
              </p>
              
              <div className="grid grid-cols-2 gap-6 pt-4">
                 <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-4xl font-extrabold text-slate-900 mb-2">CSAVS</p>
                    <p className="text-xs font-bold text-slate-500 uppercase">{t.home.netPartner1}</p>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-4xl font-extrabold text-slate-900 mb-2">ECVS</p>
                    <p className="text-xs font-bold text-slate-500 uppercase">{t.home.netPartner2}</p>
                 </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <img src="https://images.unsplash.com/photo-1559839734-2b71f1e59816?auto=format&fit=crop&w=100&q=80" className="w-14 h-14 rounded-full border-4 border-white shadow-sm" alt="Doctor" />
                <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&q=80" className="w-14 h-14 rounded-full border-4 border-white shadow-sm -ml-6" alt="Doctor" />
                <img src="https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&w=100&q=80" className="w-14 h-14 rounded-full border-4 border-white shadow-sm -ml-6" alt="Doctor" />
                <div className="text-sm font-bold text-slate-600 pl-2">{t.home.netJoined}</div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-10 shadow-sm flex flex-col justify-center">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-2xl">🎓</div>
                     <h4 className="font-bold text-slate-900 text-lg">{t.home.featLabs}</h4>
                     <p className="text-sm text-slate-500">{t.home.featLabsDesc}</p>
                  </div>
                  <div className="space-y-4">
                     <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-2xl">🤝</div>
                     <h4 className="font-bold text-slate-900 text-lg">{t.home.featCase}</h4>
                     <p className="text-sm text-slate-500">{t.home.featCaseDesc}</p>
                  </div>
                  <div className="space-y-4">
                     <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-2xl">📦</div>
                     <h4 className="font-bold text-slate-900 text-lg">{t.home.featSupply}</h4>
                     <p className="text-sm text-slate-500">{t.home.featSupplyDesc}</p>
                  </div>
                  <div className="space-y-4">
                     <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-2xl">🤖</div>
                     <h4 className="font-bold text-slate-900 text-lg">{t.home.featDigital}</h4>
                     <p className="text-sm text-slate-500">{t.home.featDigitalDesc}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA SECTION */}
      <section className="py-24 bg-white">
        <div className="vs-container">
          <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             
             <div className="relative z-10 max-w-2xl mx-auto space-y-8">
               <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                 {t.home.ctaTitle1} <br/>
                 <span className="text-emerald-400">{t.home.ctaTitle2}</span>
               </h2>
               <p className="text-slate-400 text-lg">
                 {t.home.ctaDesc}
               </p>
               <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                 <Link to="/auth" className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-base hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20">
                   {t.home.ctaButtonPrimary}
                 </Link>
                 <Link to="/community" className="px-10 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold text-base hover:bg-white/20 transition-all">
                   {t.home.ctaButtonSecondary}
                 </Link>
               </div>
             </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
