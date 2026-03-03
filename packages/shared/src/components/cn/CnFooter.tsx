'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

interface CnFooterProps {
  locale: string;
}

export function CnFooter({ locale }: CnFooterProps) {
  // 简化的页脚导航：只保留核心支持链接，不重复顶部导航
  const footerLinks = [
    { name: '关于我们', href: `/${locale}/about` },
    { name: '联系我们', href: `/${locale}/contact` },
    { name: '合作咨询', href: `/${locale}/cooperation` },
    { name: '用户协议', href: `/${locale}/terms` },
    { name: '隐私政策', href: `/${locale}/privacy` },
  ];

  return (
    <footer className="bg-slate-900 text-white/80">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        {/* Main footer content */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          {/* Brand section */}
          <div className="max-w-sm">
            <Link href={`/${locale}`} className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-vetsphere.png" alt="宠医界" className="w-full h-full object-contain" />
              </div>
              <span className="font-black text-xl text-white">宠医界</span>
            </Link>
            <p className="text-sm text-white/50 mb-5 leading-relaxed">
              围绕宠物医生职业全生命周期，提供专业成长、临床工具、职业发展与创业支持的一站式事业发展平台。
            </p>
            <div className="space-y-2 text-sm text-white/40">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>support@vetsphere.net</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+86 18616223318</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>中国上海</span>
              </div>
            </div>
          </div>

          {/* Footer navigation links */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 lg:pt-2">
            {footerLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/10">
          <p className="text-xs text-white/30 text-center max-w-2xl mx-auto mb-3">
            本平台所有内容仅供专业教育参考，不构成临床诊疗建议。宠医界不直接提供兽医诊疗服务。
          </p>
          <p className="text-xs text-white/40 text-center">
            &copy; {new Date().getFullYear()} 宠医界 VetSphere. 保留所有权利。
          </p>
        </div>
      </div>
    </footer>
  );
}
