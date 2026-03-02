'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Mail, Phone, MapPin } from 'lucide-react';

// Footer translations
const footerTranslations = {
  en: {
    description:
      'Professional veterinary training programs designed for practicing veterinarians seeking to advance their surgical and clinical skills.',
    trainingPrograms: 'Training Programs',
    surgicalTraining: 'Surgical Training',
    workshops: 'Hands-on Workshops',
    continuingEducation: 'Continuing Education',
    certification: 'Certification Programs',
    company: 'Company',
    about: 'About VetSphere',
    instructors: 'Our Instructors',
    partners: 'Partner Institutions',
    contact: 'Contact Us',
    legal: 'Legal',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    refund: 'Refund Policy',
    disclaimer:
      'All programs are provided for educational purposes only. VetSphere does not provide veterinary medical services, treatment, or clinical care.',
    copyright: 'VetSphere Training Academy. All rights reserved.',
    trusted: 'Trusted by 10,000+ veterinary professionals worldwide',
  },
  th: {
    description:
      'โปรแกรมการฝึกอบรมสัตวแพทย์มืออาชีพที่ออกแบบมาสำหรับสัตวแพทย์ที่ต้องการพัฒนาทักษะการผ่าตัดและทางคลินิก',
    trainingPrograms: 'โปรแกรมการฝึกอบรม',
    surgicalTraining: 'การฝึกอบรมการผ่าตัด',
    workshops: 'เวิร์คช็อปภาคปฏิบัติ',
    continuingEducation: 'การศึกษาต่อเนื่อง',
    certification: 'โปรแกรมการรับรอง',
    company: 'บริษัท',
    about: 'เกี่ยวกับ VetSphere',
    instructors: 'ผู้สอนของเรา',
    partners: 'สถาบันพันธมิตร',
    contact: 'ติดต่อเรา',
    legal: 'กฎหมาย',
    privacy: 'นโยบายความเป็นส่วนตัว',
    terms: 'เงื่อนไขการให้บริการ',
    refund: 'นโยบายการคืนเงิน',
    disclaimer:
      'โปรแกรมทั้งหมดมีวัตถุประสงค์เพื่อการศึกษาเท่านั้น VetSphere ไม่ให้บริการทางการแพทย์สัตว์ การรักษา หรือการดูแลทางคลินิก',
    copyright: 'VetSphere Training Academy สงวนลิขสิทธิ์',
    trusted: 'ได้รับความไว้วางใจจากผู้เชี่ยวชาญด้านสัตวแพทย์กว่า 10,000 คนทั่วโลก',
  },
  ja: {
    description:
      '外科および臨床スキルを向上させたい獣医師向けに設計された専門的な獣医研修プログラム。',
    trainingPrograms: 'トレーニングプログラム',
    surgicalTraining: '外科トレーニング',
    workshops: '実践ワークショップ',
    continuingEducation: '継続教育',
    certification: '認定プログラム',
    company: '会社情報',
    about: 'VetSphereについて',
    instructors: '講師紹介',
    partners: 'パートナー機関',
    contact: 'お問い合わせ',
    legal: '法的情報',
    privacy: 'プライバシーポリシー',
    terms: '利用規約',
    refund: '返金ポリシー',
    disclaimer:
      'すべてのプログラムは教育目的のみで提供されています。VetSphereは獣医療サービス、治療、または臨床ケアを提供しません。',
    copyright: 'VetSphere Training Academy. 無断転載禁止。',
    trusted: '世界中の10,000人以上の獣医専門家に信頼されています',
  },
};

interface IntlFooterProps {
  locale: string;
}

export function IntlFooter({ locale }: IntlFooterProps) {
  const { language } = useLanguage();
  const t = footerTranslations[language as keyof typeof footerTranslations] || footerTranslations.en;

  const footerLinks = {
    programs: [
      { name: t.surgicalTraining, href: `/${locale}/courses#surgical` },
      { name: t.workshops, href: `/${locale}/courses?type=workshop` },
      { name: t.continuingEducation, href: `/${locale}/courses#ce` },
      { name: t.certification, href: `/${locale}/courses#certification` },
    ],
    company: [
      { name: t.about, href: `/${locale}/about` },
      { name: t.instructors, href: `/${locale}/about#instructors` },
      { name: t.partners, href: `/${locale}/about#partners` },
      { name: t.contact, href: `/${locale}/contact` },
    ],
    legal: [
      { name: t.privacy, href: `/${locale}/privacy` },
      { name: t.terms, href: `/${locale}/terms` },
      { name: t.refund, href: `/${locale}/refund` },
    ],
  };

  return (
    <footer className="bg-foreground text-background/80">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href={`/${locale}`} className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">VS</span>
              </div>
              <span className="font-display font-bold text-xl text-background">VetSphere</span>
            </Link>
            <p className="text-background/60 text-sm mb-6 max-w-xs">{t.description}</p>
            <div className="space-y-2 text-sm text-background/60">
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
                <span>Kwai Chung, Hong Kong SAR</span>
              </div>
            </div>
          </div>

          {/* Programs */}
          <div>
            <h4 className="font-display font-semibold text-background mb-4">{t.trainingPrograms}</h4>
            <ul className="space-y-2">
              {footerLinks.programs.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold text-background mb-4">{t.company}</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-background mb-4">{t.legal}</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 pt-8 border-t border-background/10">
          <p className="text-xs text-background/40 text-center max-w-2xl mx-auto mb-4">
            {t.disclaimer}
          </p>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-background/50">
              &copy; {new Date().getFullYear()} {t.copyright}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-background/40">{t.trusted}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
