'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useSiteConfig } from '../../context/SiteConfigContext';
import HeroSection from './sections/HeroSection';
import TrainingAdvantageSection from './sections/TrainingAdvantageSection';
import GrowthPathSection from './sections/GrowthPathSection';
import CapabilityCardsSection from './sections/CapabilityCardsSection';
import ProductPreviewSection from './sections/ProductPreviewSection';
import CareerEntrepreneurSection from './sections/CareerEntrepreneurSection';
import RealScenariosSection from './sections/RealScenariosSection';
import CommunitySection from './sections/CommunitySection';
import FinalCTASection from './sections/FinalCTASection';
import CooperationSection from './sections/CooperationSection';

export default function CnHomePageClient() {
  const { t, language } = useLanguage();
  const { siteConfig } = useSiteConfig();
  const locale = language || siteConfig.defaultLocale;

  return (
    <div className="flex flex-col bg-white">
      {/* 1. 首屏：培训入口 */}
      <HeroSection locale={locale} t={t} />
      {/* 2. 我们的培训为什么不一样 */}
      <TrainingAdvantageSection t={t} />
      {/* 3. 成长路径 */}
      <GrowthPathSection t={t} />
      {/* 4. 四大能力（培训为主卡） */}
      <CapabilityCardsSection locale={locale} t={t} />
      {/* 5. 培训之后的平台支持（工作台） */}
      <ProductPreviewSection locale={locale} t={t} />
      {/* 6. 职业与创业 */}
      <CareerEntrepreneurSection locale={locale} t={t} />
      {/* 7. 真实训练与临床场景 */}
      <RealScenariosSection t={t} />
      {/* 8. 社区 */}
      <CommunitySection locale={locale} t={t} />
      {/* 9. 最终 CTA */}
      <FinalCTASection locale={locale} t={t} />
      {/* 10. 合作入口（降权尾部） */}
      <CooperationSection t={t} />
    </div>
  );
}
