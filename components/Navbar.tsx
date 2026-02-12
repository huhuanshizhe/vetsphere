
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { cart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  // 监听滚动事件，动态切换导航栏状态
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isScrolled 
        ? 'bg-white shadow-xl shadow-slate-200/40 border-b border-slate-100 py-2' 
        : 'bg-white/70 backdrop-blur-md border-b border-transparent py-0'
      }`}
    >
      <div className="vs-container h-16 md:h-20 flex items-center justify-between">
        
        {/* Refined Coordinated Logo System */}
        <Link to="/" className="flex items-center gap-3.5 group relative">
          {/* VS Icon Block */}
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            {/* Outer Rotating Shields */}
            <div className="absolute inset-0 border-2 border-vs/20 rounded-xl rotate-12 group-hover:rotate-90 transition-transform duration-700"></div>
            <div className="absolute inset-0 border-2 border-vs rounded-xl -rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-sm"></div>
            
            {/* Inner Brand Container */}
            <div className="relative w-8 h-8 bg-vs rounded-lg flex flex-col items-center justify-center shadow-lg shadow-vs/20 overflow-hidden">
              <span className="text-[11px] font-black text-white leading-none tracking-tighter">VS</span>
              <div className="absolute -bottom-1 -right-1 text-[10px] opacity-40 group-hover:scale-110 group-hover:-translate-y-0.5 transition-all">🐾</div>
              <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white/30 rounded-full"></div>
            </div>
          </div>
          
          {/* Brand Text Block */}
          <div className="flex flex-col justify-center">
            <span className="text-[20px] font-extrabold tracking-tight text-slate-900 leading-none group-hover:text-vs transition-colors duration-300">
              VetSphere
            </span>
            <span className="text-[7.5px] font-black text-vs/70 uppercase tracking-[0.25em] mt-1.5 transition-all duration-300 group-hover:text-vs group-hover:translate-x-0.5">
              Surgical Global
            </span>
          </div>
        </Link>

        {/* Navigation - Coordinated sizing */}
        <div className="hidden lg:flex items-center gap-1">
          {[
            { name: t.nav.home, path: '/' },
            { name: t.nav.community, path: '/community' },
            { name: t.nav.courses, path: '/courses' },
            { name: t.nav.shop, path: '/shop' },
            { name: t.nav.ai, path: '/ai' },
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold tracking-wide transition-all ${
                isActive(item.path) ? 'text-vs' : 'text-slate-500 hover:text-vs hover:bg-vs-soft'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          
          {/* Language Selector - Now positioned relative to parent */}
          <div className="relative hidden sm:block">
            <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-vs transition-colors flex items-center gap-1.5 py-2 px-1"
            >
                {language === 'zh' ? 'CN' : language.toUpperCase()}
                <svg className={`w-2.5 h-2.5 transition-transform duration-300 ${isLangOpen ? 'rotate-180 text-vs' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {isLangOpen && (
                <>
                {/* Transparent overlay to close when clicking outside */}
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsLangOpen(false)}></div>
                
                {/* Dropdown Menu attached to button */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-24 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-1 animate-in fade-in zoom-in-95 z-50">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-t border-l border-slate-100"></div>
                    {['zh', 'en', 'th'].map(lang => (
                    <button 
                        key={lang} 
                        onClick={() => {setLanguage(lang as any); setIsLangOpen(false);}} 
                        className={`w-full text-center px-3 py-2.5 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition-colors relative z-10 ${language === lang ? 'text-vs bg-vs/5' : 'text-slate-400'}`}
                    >
                        {lang === 'zh' ? '中文' : lang === 'en' ? 'English' : 'ไทย'}
                    </button>
                    ))}
                </div>
                </>
            )}
          </div>
          
          <Link to="/checkout" className="relative p-2 text-slate-500 hover:text-vs transition-colors">
            <span className="text-xl">🛒</span>
            {cart.length > 0 && (
              <span className="absolute top-0 right-0 bg-vs text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in">
                {cart.length}
              </span>
            )}
          </Link>
          
          <Link to={isAuthenticated ? "/dashboard" : "/auth"} className="btn-vs-premium !py-2 !px-5 !rounded-lg text-xs">
            {isAuthenticated ? user?.name : t.nav.login}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
