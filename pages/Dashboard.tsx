
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Specialty, Order, Quote } from '../types';
import { api } from '../services/api';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Roadmap');
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user?.email) api.getOrders(user.email).then(setOrders);
  }, [user]);

  const roadmapSteps = [
    { id: 1, name: 'Basic Principles', status: 'completed', icon: '📝' },
    { id: 2, name: 'Advanced TPLO', status: 'completed', icon: '🦴' },
    { id: 3, name: 'Complex Fixation', status: 'active', icon: '🛠️' },
    { id: 4, name: 'Joint Replacement', status: 'locked', icon: '🏆' },
  ];

  if (user?.role === 'Doctor') {
    return (
      <div className="bg-slate-50 min-h-screen pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl mx-auto flex items-center justify-center text-3xl mb-4">👨‍⚕️</div>
                <h3 className="font-black text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-400 font-bold mb-6">{user.email}</p>
                <button onClick={() => logout()} className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-xs font-black">{t.dashboard.logout}</button>
             </div>
             <div className="bg-white p-2 rounded-2xl border border-slate-100">
                {['Roadmap', 'Orders', 'Certification'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === tab ? 'bg-vs text-white' : 'text-slate-500'}`}>
                    {tab === 'Roadmap' ? t.dashboard.roadmap : tab === 'Orders' ? t.dashboard.orders : t.dashboard.certification}
                  </button>
                ))}
             </div>
          </div>

          <div className="lg:col-span-3 bg-white p-10 rounded-[40px] border border-slate-100 min-h-[600px]">
             {activeTab === 'Roadmap' && (
               <div className="space-y-12">
                  <header>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">{t.dashboard.roadmap}</h2>
                    <p className="text-sm text-slate-400 font-medium">{t.dashboard.track}</p>
                  </header>

                  <div className="relative pt-20 pb-10">
                     <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2"></div>
                     <div className="relative flex justify-between">
                        {roadmapSteps.map(step => (
                          <div key={step.id} className="relative z-10 flex flex-col items-center group">
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-xl ${
                               step.status === 'completed' ? 'bg-vs text-white' : 
                               step.status === 'active' ? 'bg-white border-2 border-vs text-vs scale-125' : 
                               'bg-slate-50 border border-slate-200 text-slate-300'
                             }`}>
                               {step.status === 'completed' ? '✓' : step.icon}
                             </div>
                             <div className="absolute top-20 text-center whitespace-nowrap">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${step.status === 'locked' ? 'text-slate-300' : 'text-slate-900'}`}>{step.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-1">{step.status.toUpperCase()}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="mt-32 p-8 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                     <div>
                        <p className="text-xs font-black text-vs uppercase tracking-widest mb-1">{t.dashboard.nextLevel}</p>
                        <h4 className="text-lg font-black text-slate-900">Advanced Complex Fracture Fixation</h4>
                     </div>
                     <button onClick={() => navigate('/courses')} className="btn-vs rounded-xl">{t.dashboard.enroll}</button>
                  </div>
               </div>
             )}
             {/* Orders & Certification content... */}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default Dashboard;
