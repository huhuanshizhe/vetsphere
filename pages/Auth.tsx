
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Specialty } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Pre-fill for demo convenience
  const [formData, setFormData] = useState({
    email: 'admin@vetsphere.pro',
    password: 'password123',
    fullName: '',
    license: '',
    clinic: ''
  });

  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Use Supabase Auth via API service
      const { user } = await api.login(formData.email, formData.password);
      
      setLoading(false);
      navigate('/dashboard', { state: { role: user.role } });

    } catch (error: any) {
      console.error("Authentication Error:", error);
      setLoading(false);
      alert("Login failed: " + (error.message || "Unknown error"));
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-24 pb-12 px-4">
      <div className="max-w-4xl w-full bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
        <div className="md:w-5/12 bg-vs p-14 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40"></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-8 tracking-tighter leading-none">VetSphere <br/>Surgeon <br/>Center</h2>
            <p className="text-white/80 font-medium leading-relaxed mb-14 text-sm">
              The digital collaboration platform for professional veterinary surgeons. Manage your academic progress, equipment procurement, and clinical career here.
            </p>
            <div className="space-y-6">
               {[
                 { t: 'Professional Verification', s: 'Verified access' },
                 { t: 'VP Loyalty Rewards', s: 'Career growth' },
                 { t: 'Direct Global Supply', s: 'Precision tools' }
               ].map(feat => (
                 <div key={feat.t} className="flex gap-4 items-start">
                    <span className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-xs">✓</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest leading-none">{feat.t}</p>
                      <p className="text-[10px] text-white/50 mt-1 font-bold">{feat.s}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest opacity-30 relative z-10">
            VetSphere International • Professional ONLY
          </div>
        </div>

        <div className="flex-1 p-10 sm:p-20 overflow-y-auto max-h-[90vh]">
          <header className="mb-12">
            <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
              {isLogin ? 'Welcome Back' : 'Join the Network'}
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              {isLogin ? 'Login to manage your clinical business' : 'Please complete your professional verification'}
            </p>
          </header>

          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Full Name (Required)</label>
                    <input type="text" required className="auth-input" placeholder="John Doe" 
                      value={formData.fullName} onChange={e => handleChange('fullName', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">License No.</label>
                    <input type="text" required className="auth-input" placeholder="VET2024..." 
                      value={formData.license} onChange={e => handleChange('license', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Clinic Name</label>
                    <input type="text" required className="auth-input" placeholder="Central Vet..." 
                      value={formData.clinic} onChange={e => handleChange('clinic', e.target.value)} />
                  </div>
                </div>
                
                <div className="border-t border-slate-50 pt-6">
                  <p className="text-[10px] font-black text-vs uppercase tracking-widest">Clinical Background</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Years</label>
                      <input type="number" className="auth-input" placeholder="5" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Specialty</label>
                      <select className="auth-input">
                        <option value="">Select...</option>
                        {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Email Address</label>
              <input 
                type="email" 
                required 
                className="auth-input" 
                placeholder="doctor@vet.com" 
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
              />
              {isLogin && (
                <p className="text-[10px] text-slate-400 mt-2">
                  Try: <span className="font-bold text-slate-600 cursor-pointer hover:text-vs" onClick={() => handleChange('email', 'admin@vetsphere.pro')}>admin@vetsphere.pro</span> for Admin access.
                </p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Password</label>
              <input 
                type="password" 
                required 
                className="auth-input" 
                placeholder="••••••••" 
                value={formData.password}
                onChange={e => handleChange('password', e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-vs py-5 rounded-2xl shadow-xl shadow-vs/20 mt-10 relative group overflow-hidden"
            >
              <span className="relative z-10">{loading ? 'Connecting to Supabase...' : (isLogin ? 'Login Now' : 'Submit Application')}</span>
              <div className="absolute inset-0 bg-vs-dark translate-y-full group-hover:translate-y-0 transition-transform"></div>
            </button>
          </form>

          <div className="mt-12 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-vs transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              {isLogin ? 'No account? Join Today' : 'Already have account? Login'}
              <span className="text-lg">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
