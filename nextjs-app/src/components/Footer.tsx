'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { locales, Locale } from '@/middleware';

const Footer: React.FC = () => {
  const { t, language } = useLanguage();
  const pathname = usePathname();

  // Get current locale from pathname
  const getCurrentLocale = (): Locale => {
    const segments = pathname.split('/');
    if (locales.includes(segments[1] as Locale)) {
      return segments[1] as Locale;
    }
    return language;
  };

  const locale = getCurrentLocale();
  const localePath = (path: string) => `/${locale}${path}`;

  return (
    <footer className="bg-slate-900 text-slate-400 py-16 px-6 border-t border-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

        {/* Brand & Newsletter */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <span className="text-white font-black text-sm">VS</span>
            </div>
            <span className="text-white font-black text-2xl tracking-tighter">VetSphere</span>
          </div>
          <p className="text-sm leading-relaxed max-w-xs text-slate-500 font-medium">
            {t.footer.brandDesc}
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
                &rarr;
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/50">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {t.footer.address.line1}<br />
              {t.footer.address.line2}<br />
              {t.footer.address.line3}
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8 lg:pl-12">
          <div>
            <h4 className="text-white font-black text-sm mb-6 uppercase tracking-widest">{t.footer.platform}</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><Link href={localePath('/courses')} className="hover:text-emerald-400 transition-colors">{t.footer.links.courses}</Link></li>
              <li><Link href={localePath('/shop')} className="hover:text-emerald-400 transition-colors">{t.footer.links.shop}</Link></li>
              <li><Link href={localePath('/community')} className="hover:text-emerald-400 transition-colors">{t.footer.links.community}</Link></li>
              <li><Link href={localePath('/ai')} className="hover:text-emerald-400 transition-colors flex items-center gap-2">{t.footer.links.ai} <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded font-black border border-emerald-500/20">NEW</span></Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black text-sm mb-6 uppercase tracking-widest">{t.footer.support}</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><Link href={localePath('/faq')} className="hover:text-emerald-400 transition-colors">{language === 'zh' ? '常见问题' : 'FAQ'}</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.help}</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.contact}</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.shipping}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black text-sm mb-6 uppercase tracking-widest">{t.footer.company}</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.about}</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">{t.footer.links.careers}</Link></li>
              <li><Link href={localePath('/privacy')} className="hover:text-emerald-400 transition-colors">{t.footer.links.privacy}</Link></li>
              <li><Link href={localePath('/terms')} className="hover:text-emerald-400 transition-colors">{t.footer.links.terms}</Link></li>
              <li><Link href={localePath('/refund')} className="hover:text-emerald-400 transition-colors">{t.footer.links.refund}</Link></li>
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
  );
};

export default Footer;
