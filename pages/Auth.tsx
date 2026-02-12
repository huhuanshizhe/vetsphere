
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PORTAL_THEME } from '../constants';

interface AuthProps {
  portalType: UserRole;
}

const Auth: React.FC<AuthProps> = ({ portalType }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Default Credentials
  const getDefaultCreds = () => {
    switch (portalType) {
      case 'Admin': return { email: 'admin@vetsphere.pro', password: 'admin123' };
      case 'ShopSupplier': return { email: 'supplier@surgitech.com', password: 'supply123' };
      case 'CourseProvider': return { email: 'edu@csavs.org', password: 'edu123' };
      default: return { email: 'doctor@vet.com', password: 'doc123' };
    }
  };

  const defaultCreds = getDefaultCreds();
  const [formData, setFormData] = useState({
    email: defaultCreds.email,
    password: defaultCreds.password,
    fullName: '',
    license: '',
    clinic: ''
  });

  // Theme Logic
  const currentTheme = PORTAL_THEME[portalType] || PORTAL_THEME.Doctor;
  const isDarkTheme = portalType === 'Admin';
  const isDoctor = portalType === 'Doctor';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { user } = await api.login(formData.email, formData.password);
      
      // Role Check
      if (portalType !== 'Doctor' && user.role !== portalType) {
        console.warn(`Role Mismatch: User is ${user.role} but trying to access ${portalType} portal.`);
        user.role = portalType; // Auto-correct for demo
      }

      login(user);
      navigate('/dashboard');

    } catch (error: any) {
      console.error("Authentication Error:", error);
      alert("Login failed: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- RENDER VARIANT 1: DOCTOR (Modern Designed Card) ---
  if (isDoctor) {
    return (
      <div className="min-h-[calc(100vh-80px)] pt-24 pb-12 bg-slate-50 flex items-center justify-center px-4 relative overflow-hidden font-sans">
         {/* Ambient Background Accents */}
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-emerald-100 rounded-full blur-[100px] opacity-40 mix-blend-multiply"></div>
            <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-40 mix-blend-multiply"></div>
         </div>

         <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 border border-white z-10 overflow-hidden grid md:grid-cols-2 min-h-[600px] animate-in fade-in zoom-in-95 duration-500">
             
             {/* Left Side: Professional Visuals */}
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
                     <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl border border-white/20 shadow-lg">
                        👨‍⚕️
                     </div>
                     <div>
                        <h2 className="text-3xl font-black leading-tight tracking-tight mb-3">Elevate Your <br/>Surgical Precision.</h2>
                        <p className="text-white/70 font-medium leading-relaxed max-w-sm text-sm">
                            Join over 5,000 veterinary surgeons accessing world-class training, precision instruments, and AI-powered clinical support.
                        </p>
                     </div>
                     <div className="flex flex-wrap gap-3 pt-2">
                        <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            ✓ CE Accredited
                        </div>
                        <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-400">
                            ✓ Global Network
                        </div>
                     </div>
                 </div>
             </div>

             {/* Right Side: Authentication Form */}
             <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
                 <div className="max-w-sm mx-auto w-full space-y-8">
                     <div className="text-center md:text-left">
                        <h3 className="text-2xl font-black text-slate-900 mb-2">
                            {isLogin ? 'Welcome Back, Doctor' : 'Apply for Membership'}
                        </h3>
                        <p className="text-slate-500 text-sm font-bold">
                            {isLogin ? 'Enter your credentials to access your workspace.' : 'Fill in your professional details to join the network.'}
                        </p>
                     </div>

                     <form onSubmit={handleAuth} className="space-y-5">
                        {!isLogin && (
                            <div className="space-y-4 animate-in slide-in-from-right fade-in duration-300">
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                                        <input type="text" required 
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-vs outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                                            placeholder="Dr. Name"
                                            value={formData.fullName} onChange={e => handleChange('fullName', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">License #</label>
                                        <input type="text" required 
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-vs outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                                            placeholder="VET-ID"
                                            value={formData.license} onChange={e => handleChange('license', e.target.value)} />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Clinic / Hospital</label>
                                    <input type="text" required 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-vs outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                                        placeholder="Hospital Name"
                                        value={formData.clinic} onChange={e => handleChange('clinic', e.target.value)} />
                                 </div>
                            </div>
                        )}
                        
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
                            <input type="email" required 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-vs outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                                placeholder="doctor@example.com"
                                value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                        </div>
                        
                        <div>
                            <div className="flex justify-between mb-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Password</label>
                                {isLogin && <button type="button" className="text-[10px] font-bold text-vs hover:underline">Forgot Password?</button>}
                            </div>
                            <input type="password" required 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-vs outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                                placeholder="••••••••"
                                value={formData.password} onChange={e => handleChange('password', e.target.value)} />
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-vs text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-vs/20 hover:bg-[#008F6F] hover:shadow-2xl hover:-translate-y-0.5 transition-all transform active:scale-95 disabled:opacity-70 disabled:transform-none">
                            {loading ? 'Authenticating...' : (isLogin ? 'Secure Sign In' : 'Join Network')}
                        </button>
                     </form>

                     <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="px-3 bg-white text-slate-400 font-bold">Or access with</span></div>
                     </div>

                     <div className="flex gap-4 justify-center">
                        <button className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center text-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600">
                            <span className="font-serif font-bold">G</span>
                        </button>
                        <button className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center text-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600">
                             
                        </button>
                     </div>

                     <p className="text-center text-xs font-bold text-slate-500 mt-6">
                         {isLogin ? "Don't have an account yet?" : "Already have an account?"} 
                         <button onClick={() => setIsLogin(!isLogin)} className="text-vs ml-1.5 hover:underline font-black">
                             {isLogin ? 'Register Now' : 'Sign In'}
                         </button>
                     </p>
                 </div>
             </div>
         </div>
      </div>
    );
  }

  // --- RENDER VARIANT 2: ADMIN / SUPPLIER (Full Screen Independent) ---
  return (
    <div className={`min-h-screen flex ${currentTheme.colors.lightBg} relative font-sans`}>
      {/* Floating Home Button (Only needed here as NavBar is hidden) */}
      <Link to="/" className={`absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm group backdrop-blur-md
        ${isDarkTheme ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white'}`}>
         <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
         <span className="text-xs font-bold uppercase tracking-widest">VetSphere Home</span>
      </Link>

      <div className={`hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br ${currentTheme.meta.gradient}`}>
        <div className="absolute inset-0 bg-black/10 z-10"></div>
        <img src={currentTheme.meta.image} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" alt="Background" />
        <div className="relative z-20 p-20 flex flex-col justify-between h-full text-white">
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                {currentTheme.meta.icon}
              </div>
              <span className="font-black tracking-[0.3em] uppercase text-xs opacity-80">VetSphere Secure</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter leading-tight mb-6">{currentTheme.meta.title}</h1>
            <p className="text-xl font-medium opacity-80 max-w-md leading-relaxed">{currentTheme.meta.subtitle}</p>
          </div>
          <div className="space-y-4 bg-white/10 backdrop-blur-lg p-8 rounded-3xl border border-white/10">
            <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">System Status</p>
            <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                 <span className="font-bold text-sm">Operational</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-20 ${isDarkTheme ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="w-full max-w-md space-y-10 mt-16 lg:mt-0">
          <div className="text-center lg:text-left">
            <h2 className={`text-4xl font-black tracking-tight mb-3 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Restricted Login</h2>
            <p className={`font-medium text-sm ${isDarkTheme ? 'text-slate-500' : 'text-slate-500'}`}>
              Please enter your credentials for <span className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{portalType}</span>.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className={`block text-[10px] font-black uppercase mb-2 tracking-widest ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>Email</label>
              <input type="email" required placeholder={defaultCreds.email}
                className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkTheme ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500 placeholder-slate-700' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'}`}
                value={formData.email} onChange={e => handleChange('email', e.target.value)}
              />
            </div>
            <div>
              <label className={`block text-[10px] font-black uppercase mb-2 tracking-widest ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>Password</label>
              <input type="password" required placeholder="••••••••"
                className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${isDarkTheme ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500 placeholder-slate-700' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'}`}
                value={formData.password} onChange={e => handleChange('password', e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading}
              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 text-white ${currentTheme.colors.primaryBg} hover:opacity-90 shadow-lg`}
            >
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
