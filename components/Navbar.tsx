
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { cart } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isActive = (path: string) => location.pathname === path;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Automatically close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Case Plaza', path: '/community' },
    { name: 'Courses', path: '/courses' },
    { name: 'Shop', path: '/shop' },
    { name: 'AI Consultant', path: '/ai' },
  ];

  return (
    <nav className="fixed top-0 inset-x-0 z-[100] nav-glass h-16 sm:h-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden p-2 -ml-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="text-2xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
          </button>

          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-vs flex items-center justify-center rounded-lg shadow-sm shrink-0">
              <span className="text-white font-extrabold text-sm tracking-tighter">VS</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">VetSphere</span>
              <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase tracking-widest">Global Academy</span>
            </div>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 text-sm font-bold transition-all ${
                  isActive(item.path) 
                    ? 'text-vs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Link to="/checkout" className="relative p-2.5 rounded-lg hover:bg-slate-50 transition-all">
              <span className="text-xl">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-vs text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
           </Link>
           {isAuthenticated ? (
             <Link to="/dashboard" className="hidden md:block btn-vs text-xs uppercase tracking-widest no-underline">
                {user?.name || 'Dashboard'}
             </Link>
           ) : (
             <Link to="/auth" className="hidden md:block btn-vs text-xs uppercase tracking-widest no-underline">
                Join Now
             </Link>
           )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-xl p-4 flex flex-col gap-2 lg:hidden animate-in slide-in-from-top-2">
           {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`p-4 rounded-xl text-sm font-bold transition-all ${
                  isActive(item.path) 
                    ? 'bg-vs/5 text-vs' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="h-px bg-slate-100 my-2"></div>
            {isAuthenticated ? (
               <Link to="/dashboard" className="p-4 text-center btn-vs rounded-xl">
                 Dashboard ({user?.name})
               </Link>
            ) : (
               <Link to="/auth" className="p-4 text-center btn-vs rounded-xl">
                 Login / Register
               </Link>
            )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
