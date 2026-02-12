
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Specialty } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const disciplines = [
    { name: 'Orthopedics', type: Specialty.ORTHOPEDICS, icon: '🦴', color: 'bg-blue-50' },
    { name: 'Neurosurgery', type: Specialty.NEUROSURGERY, icon: '🧠', color: 'bg-purple-50' },
    { name: 'Soft Tissue', type: Specialty.SOFT_TISSUE, icon: '🩹', color: 'bg-emerald-50' },
    { name: 'Eye Surgery', type: Specialty.EYE_SURGERY, icon: '👁️', color: 'bg-amber-50' },
    { name: 'Exotics', type: Specialty.EXOTICS, icon: '🦎', color: 'bg-rose-50' },
  ];

  const handleDisciplineClick = (specialty: Specialty) => {
    // Navigate to courses page with state
    navigate('/courses', { state: { specialty } });
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-white overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-slate-50 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-50 rounded-full opacity-60 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
            <div className="inline-block px-3 py-1 bg-emerald-50 text-vs text-xs font-bold uppercase tracking-[0.2em] rounded-md border border-emerald-100">
              Professional. Precise. Excellence.
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-tight tracking-tight">
              Empowering Global <br/> 
              <span className="text-vs italic">Veterinary Surgeons</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-lg leading-relaxed">
              VetSphere provides the highest standard of veterinary surgical training and precision instruments, helping every clinician break through technical bottlenecks and save more lives.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/courses" className="btn-vs text-sm uppercase tracking-widest px-10 py-5 shadow-lg">
                Explore Courses
              </Link>
              <Link to="/ai" className="px-10 py-5 border-2 border-slate-200 text-slate-900 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                Consult AI
              </Link>
            </div>
            <div className="flex gap-10 pt-8 border-t border-slate-100">
                <div>
                    <span className="block text-3xl font-black text-slate-900">5000+</span>
                    <span className="text-xs text-slate-400 font-bold uppercase">Certified Doctors</span>
                </div>
                <div>
                    <span className="block text-3xl font-black text-slate-900">120+</span>
                    <span className="text-xs text-slate-400 font-bold uppercase">Premium Workshops</span>
                </div>
                <div>
                    <span className="block text-3xl font-black text-slate-900">20+</span>
                    <span className="text-xs text-slate-400 font-bold uppercase">Countries Covered</span>
                </div>
            </div>
          </div>
          
          <div className="relative hidden lg:block animate-in fade-in slide-in-from-right duration-1000">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl bg-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=80" 
                className="w-full h-auto object-cover" 
                alt="Professional Surgery" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8 p-6 bg-white border border-slate-100 rounded-xl shadow-xl">
                 <p className="text-vs font-black text-xs uppercase tracking-widest mb-1">Recommended Course</p>
                 <h3 className="text-lg font-bold text-slate-900">Advanced Orthopedics: TPLO Deep Dive</h3>
                 <p className="text-xs text-slate-500 mt-2">📍 Shanghai Training Center • March 2026</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specialty Disciplines */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Core Surgical Disciplines</h2>
            <p className="text-slate-500 max-w-xl mx-auto font-medium">Covering all complex veterinary surgical specialties, taught by top international experts.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {disciplines.map(item => (
              <div 
                key={item.name} 
                onClick={() => handleDisciplineClick(item.type)}
                className="clinical-card p-8 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-slate-800">{item.name}</h3>
                <p className="text-[10px] text-vs font-black mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View Courses →</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
             <div className="space-y-8">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">More than Training, It's <br/><span className="text-vs">Surgical Infrastructure</span></h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  We integrate global top-tier educational resources with a precision manufacturing supply chain, offering a one-stop solution from knowledge acquisition to equipment procurement.
                </p>
                <div className="space-y-4">
                  {[
                    '1:1 Expert Guidance',
                    'Global Standard Surgical Instruments',
                    'Custom R&D for Research Grade Tools',
                    'Digital Surgical Case Management'
                  ].map(point => (
                    <div key={point} className="flex items-center gap-3 font-bold text-slate-800">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-vs text-xs">✓</span>
                      {point}
                    </div>
                  ))}
                </div>
                <Link to="/shop" className="btn-vs mt-4">Visit Equipment Center</Link>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-12">
                   <img src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=400&h=500&q=80" className="rounded-2xl border border-slate-100 shadow-sm" alt="Tool 1" />
                   <img src="https://images.unsplash.com/photo-1581594658553-35942489435b?auto=format&fit=crop&w=400&h=300&q=80" className="rounded-2xl border border-slate-100 shadow-sm" alt="Tool 2" />
                </div>
                <div className="space-y-4">
                   <img src="https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=400&h=300&q=80" className="rounded-2xl border border-slate-100 shadow-sm" alt="Tool 3" />
                   <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&h=500&q=80" className="rounded-2xl border border-slate-100 shadow-sm" alt="Tool 4" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* AI CTA */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto bg-vs rounded-[32px] p-12 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <div className="relative z-10 space-y-6">
                <span className="text-white/80 font-bold uppercase tracking-widest text-sm">VetSphere AI is Live</span>
                <h2 className="text-4xl font-black text-white">Discuss Your Professional Needs</h2>
                <p className="text-white/80 text-lg max-w-xl mx-auto">
                    Whether you are looking for specific courses, consulting on equipment specs, or providing product feedback, our AI consultant is here 24/7 to support your business.
                </p>
                <Link to="/ai" className="bg-white text-vs px-10 py-4 rounded-xl font-black shadow-xl hover:bg-slate-50 transition-all inline-block">
                    Start Chat
                </Link>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
