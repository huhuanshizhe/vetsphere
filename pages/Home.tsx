
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t.home.heroTag}</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                {t.home.heroTitle1} <br/>
                <span className="text-emerald-600">{t.home.heroTitle2}</span>
              </h1>
              
              <p className="text-lg text-slate-500 max-w-lg leading-relaxed font-medium">
                {t.home.heroDesc}
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/courses" className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                  {t.home.ctaCourse}
                </Link>
                <Link to="/shop" className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                  <span>{t.home.ctaShop}</span>
                  <span>→</span>
                </Link>
              </div>

              <div className="pt-8 flex items-center gap-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <span>{t.home.heroBadge1}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
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
                <p className="text-xs text-slate-500 font-medium leading-tight">{t.home.floatBadge}</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. STATS BAR: Trust Indicators */}
      <section className="border-y border-slate-100 bg-white">
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
                <p className="text-sm font-bold text-slate-900">{stat.label}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CORE DISCIPLINES (The "Business") */}
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
            {/* Orthopedics Card */}
            <div 
              onClick={() => navigate('/courses', { state: { specialty: Specialty.ORTHOPEDICS } })}
              className="group cursor-pointer rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-slate-50"
            >
              <div className="h-64 overflow-hidden relative">
                <img 
                  src="https://images.unsplash.com/photo-1583483425070-cb9ce8fc51b5?auto=format&fit=crop&w=800&q=80" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  alt="Orthopedic Surgery"
                />
                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors"></div>
              </div>
              <div className="p-8">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-6">🦴</div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">{t.home.orthoTitle}</h4>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {t.home.orthoDesc}
                </p>
                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest group-hover:underline">{t.home.explore}</span>
              </div>
            </div>

            {/* Neurosurgery Card */}
            <div 
              onClick={() => navigate('/courses', { state: { specialty: Specialty.NEUROSURGERY } })}
              className="group cursor-pointer rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-slate-50"
            >
              <div className="h-64 overflow-hidden relative">
                <img 
                  src="https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  alt="Neurosurgery"
                />
              </div>
              <div className="p-8">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-6">🧠</div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">{t.home.neuroTitle}</h4>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {t.home.neuroDesc}
                </p>
                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest group-hover:underline">{t.home.explore}</span>
              </div>
            </div>

            {/* Soft Tissue Card */}
            <div 
              onClick={() => navigate('/courses', { state: { specialty: Specialty.SOFT_TISSUE } })}
              className="group cursor-pointer rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 bg-slate-50"
            >
              <div className="h-64 overflow-hidden relative">
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  alt="Soft Tissue Surgery"
                />
              </div>
              <div className="p-8">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-6">🩹</div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">{t.home.softTitle}</h4>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {t.home.softDesc}
                </p>
                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest group-hover:underline">{t.home.explore}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. EQUIPMENT SHOWCASE: Hardware Focus */}
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
                    <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">✓</span>
                    <span className="font-medium text-slate-200">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-8">
                <Link to="/shop" className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all inline-block">
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
                        <p className="text-xl font-bold text-white">{t.home.equipFeatureName}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-white font-mono text-sm">15,000 RPM</p>
                         <p className="text-slate-400 text-xs">{t.home.equipFeatureSpec}</p>
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

      {/* 5. GLOBAL NETWORK / MAP REPLACEMENT */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="vs-container">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 space-y-8">
              <h2 className="text-3xl font-extrabold text-slate-900">{t.home.netTitle}</h2>
              <p className="text-slate-600 leading-relaxed">
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
                <img src="https://images.unsplash.com/photo-1559839734-2b71f1e59816?auto=format&fit=crop&w=100&q=80" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="Doctor" />
                <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&q=80" className="w-12 h-12 rounded-full border-2 border-white shadow-sm -ml-6" alt="Doctor" />
                <img src="https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&w=100&q=80" className="w-12 h-12 rounded-full border-2 border-white shadow-sm -ml-6" alt="Doctor" />
                <div className="text-sm font-bold text-slate-600 pl-2">{t.home.netJoined}</div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col justify-center">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">🎓</div>
                     <h4 className="font-bold text-slate-900">{t.home.featLabs}</h4>
                     <p className="text-sm text-slate-500">{t.home.featLabsDesc}</p>
                  </div>
                  <div className="space-y-4">
                     <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-xl">🤝</div>
                     <h4 className="font-bold text-slate-900">{t.home.featCase}</h4>
                     <p className="text-sm text-slate-500">{t.home.featCaseDesc}</p>
                  </div>
                  <div className="space-y-4">
                     <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-xl">📦</div>
                     <h4 className="font-bold text-slate-900">{t.home.featSupply}</h4>
                     <p className="text-sm text-slate-500">{t.home.featSupplyDesc}</p>
                  </div>
                  <div className="space-y-4">
                     <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xl">🤖</div>
                     <h4 className="font-bold text-slate-900">{t.home.featDigital}</h4>
                     <p className="text-sm text-slate-500">{t.home.featDigitalDesc}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA SECTION */}
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
                 <Link to="/auth" className="px-10 py-4 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20">
                   {t.home.ctaButtonPrimary}
                 </Link>
                 <Link to="/community" className="px-10 py-4 bg-white/10 text-white border border-white/20 rounded-xl font-bold text-sm hover:bg-white/20 transition-all">
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
