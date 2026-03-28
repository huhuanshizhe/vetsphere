'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, MapPin, Heart, Settings, LogOut, User, ChevronRight, Loader2, ShoppingBag, CreditCard } from 'lucide-react';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';

interface UserCenterClientProps {
  locale: string;
}

export default function UserCenterClient({ locale }: UserCenterClientProps) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const uc = t.userCenter;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    router.push(`/${locale}/auth?redirect=/${locale}/user`);
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push(`/${locale}`);
  };

  const menuItems = [
    { icon: Package, label: uc.myOrders, href: `/${locale}/user/orders`, description: uc.orderHistory, color: 'from-blue-500 to-blue-600' },
    { icon: Heart, label: t.wishlist.title, href: `/${locale}/user/wishlist`, description: t.wishlist.emptyDesc, color: 'from-rose-500 to-rose-600' },
    { icon: MapPin, label: uc.addresses, href: `/${locale}/user/addresses`, description: uc.manageAddresses, color: 'from-emerald-500 to-emerald-600' },
    { icon: Settings, label: uc.accountSettings, href: `/${locale}/user/settings`, description: uc.editProfile, color: 'from-slate-500 to-slate-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href={`/${locale}`} className="hover:text-slate-700 transition-colors">{t.nav.home}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-medium">{uc.userCenter}</span>
        </nav>

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{user.name || 'User'}</h1>
              <p className="text-slate-500 mt-1">{user.email || ''}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{uc.signOut}</span>
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {menuItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:border-emerald-200 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{item.label}</h3>
                  <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white mb-6">{uc.quickActions}</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href={`/${locale}/shop`}
                className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-900/30"
              >
                <ShoppingBag className="w-5 h-5" />
                {uc.browseEquipment}
              </Link>
              <Link
                href={`/${locale}/cart`}
                className="flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all"
              >
                <CreditCard className="w-5 h-5" />
                {t.cart.title}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}