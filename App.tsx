
import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Shop from './pages/Shop';
import AIChat from './pages/AIChat';
import Dashboard from './pages/Dashboard';
import Checkout from './pages/Checkout';
import Auth from './pages/Auth';
import Community from './pages/Community';
import NotFound from './pages/NotFound';
import ScrollToTop from './components/ScrollToTop';
import SEO from './components/SEO';
import { CartProvider } from './context/CartContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// SEO Wrapper & Main Content
const AppContent = () => {
  const location = useLocation();
  const { language, t } = useLanguage();
  const { user } = useAuth(); // Get user to determine dashboard layout

  const getSEOConfig = () => {
    switch (location.pathname) {
      case '/':
        return { 
          title: language === 'en' ? "Home - Empowering Global Veterinary Surgeons" : "首页 - 赋能全球兽医外科医生",
          description: "VetSphere is a leading global platform for veterinary professional development, offering advanced surgical training (Orthopedics, Neurosurgery) and medical equipment supply.",
          keywords: "veterinary education, surgery training, medical equipment, vet courses"
        };
      case '/community':
        return { 
          title: language === 'en' ? "Case Plaza - Global Academic Exchange" : "病例广场 - 全球学术交流",
          description: "Share complex cases and discuss surgical techniques with global veterinary surgeons. AI assistant helps analyze procedural details.",
          keywords: "vet case sharing, surgery community, academic discussion"
        };
      case '/courses':
        return { 
          title: language === 'en' ? "Surgical Courses Center" : "外科课程中心",
          description: "Explore wet-labs led by top global experts, covering TPLO, Neurosurgery, Soft Tissue repair, and more.",
          keywords: "veterinary courses, wet-labs, surgeon certification"
        };
      case '/shop':
        return { 
          title: language === 'en' ? "Advanced Medical Equipment Shop" : "高级医疗器械商城",
          description: "Source international standard surgical power tools, implants, and precision instruments. 100% Traceability, optimized for clinical use.",
          keywords: "veterinary equipment, surgical tools, orthopedic implants"
        };
      case '/ai':
        return { 
          title: language === 'en' ? "AI Intelligent Consultant" : "AI 智能顾问",
          description: "24/7 Business Consultant recommending the best courses and equipment parameters for you.",
          keywords: "vet AI consultant, surgical assistant"
        };
      case '/dashboard':
        return { 
          title: "Dashboard - VetSphere", 
          description: "Manage your learning progress, orders, and professional profile." 
        };
      case '/auth':
        return { 
          title: "Login / Sign Up - VetSphere Doctor Center", 
          description: "Join the global network of veterinary surgeons." 
        };
      default:
        return {
          title: "VetSphere Portal"
        };
    }
  };

  // Logic to determine if we should hide Navbar/Footer
  // 1. Admin/Partner login pages are always standalone
  // 2. Doctor login (/auth) is NOT standalone (shows navbar)
  // 3. Admin/Partner dashboard is standalone
  // 4. Doctor dashboard (/dashboard) is NOT standalone (shows navbar)
  const isStandalonePage = () => {
    const path = location.pathname;

    // Explicit Admin/Partner Auth Routes
    if (['/sys-admin', '/partners/gear', '/partners/edu'].includes(path)) return true;

    // Dashboard: Standalone ONLY if user is NOT a doctor (i.e. Admin/Supplier)
    if (path === '/dashboard') {
        return user?.role && user.role !== 'Doctor';
    }

    return false;
  };

  const standalone = isStandalonePage();

  return (
    <>
      <ScrollToTop />
      <SEO {...getSEOConfig()} />
      <div className="min-h-screen flex flex-col">
        {/* Conditionally Render Navbar */}
        {!standalone && <Navbar />}
        
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/community" element={<Community />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/ai" element={<AIChat />} />
            <Route path="/checkout" element={<Checkout />} />
            
            {/* Doctor Portal (Public Entry - Shows Navbar) */}
            <Route path="/auth" element={<Auth portalType="Doctor" />} />

            {/* Dashboard (Unified Route, Internal Logic handles layout) */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* --- HIDDEN ADMIN / PARTNER ROUTES (Standalone) --- */}
            
            {/* Super Admin Portal */}
            <Route path="/sys-admin" element={<Auth portalType="Admin" />} />
            
            {/* Equipment Supplier Portal */}
            <Route path="/partners/gear" element={<Auth portalType="ShopSupplier" />} />
            
            {/* Education Partner Portal */}
            <Route path="/partners/edu" element={<Auth portalType="CourseProvider" />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        {/* Conditionally Render Footer */}
        {!standalone && (
          <footer className="bg-slate-900 text-slate-400 py-16 px-6 border-t border-slate-800">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
              
              {/* Brand & Newsletter - Spans 4 columns */}
              <div className="lg:col-span-4 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                    <span className="text-white font-black text-sm">VS</span>
                  </div>
                  <span className="text-white font-black text-2xl tracking-tighter">VetSphere</span>
                </div>
                <p className="text-sm leading-relaxed max-w-xs text-slate-500 font-medium">
                  {language === 'en' 
                    ? "Building the digital infrastructure for global veterinary surgery. Connecting clinical decision-makers with world-class education and precision medical devices."
                    : "构建全球兽医外科的数字基础设施。连接临床决策者与世界级教育及精密医疗器械。"}
                </p>
                
                <div className="pt-6">
                  <h5 className="text-white font-bold text-xs uppercase tracking-widest mb-3">
                    {t.footer.subscribe}
                  </h5>
                  <p className="text-xs text-slate-500 mb-3">{t.footer.subscribeDesc}</p>
                  <div className="flex gap-2 max-w-xs">
                    <input 
                      type="email" 
                      placeholder="Email address" 
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white placeholder-slate-600 transition-all"
                    />
                    <button className="bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
                      →
                    </button>
                  </div>
                </div>
              </div>

              {/* Links - Spans 8 columns */}
              <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8 lg:pl-12">
                {/* Column 1 - Platform */}
                <div>
                  <h4 className="text-white font-black text-sm mb-6 uppercase tracking-widest">{t.footer.platform}</h4>
                  <ul className="space-y-4 text-sm font-medium text-slate-500">
                    <li><Link to="/courses" className="hover:text-emerald-400 transition-colors">{t.footer.links.courses}</Link></li>
                    <li><Link to="/shop" className="hover:text-emerald-400 transition-colors">{t.footer.links.shop}</Link></li>
                    <li><Link to="/community" className="hover:text-emerald-400 transition-colors">{t.footer.links.community}</Link></li>
                    <li><Link to="/ai" className="hover:text-emerald-400 transition-colors flex items-center gap-2">{t.footer.links.ai} <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded font-black border border-emerald-500/20">NEW</span></Link></li>
                  </ul>
                </div>

                {/* Column 2 - Support */}
                <div>
                  <h4 className="text-white font-black text-sm mb-6 uppercase tracking-widest">{t.footer.support}</h4>
                  <ul className="space-y-4 text-sm font-medium text-slate-500">
                    <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.help}</Link></li>
                    <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.contact}</Link></li>
                    <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.shipping}</Link></li>
                  </ul>
                </div>

                {/* Column 3 - Company */}
                <div>
                  <h4 className="text-white font-black text-sm mb-6 uppercase tracking-widest">{t.footer.company}</h4>
                  <ul className="space-y-4 text-sm font-medium text-slate-500">
                    <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.about}</Link></li>
                    <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.careers}</Link></li>
                    <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.privacy}</Link></li>
                    <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.terms}</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            {/* Bottom Bar */}
            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center md:text-left">
                {t.footer.copyright}
              </p>
            </div>
          </footer>
        )}
      </div>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
};

export default App;
