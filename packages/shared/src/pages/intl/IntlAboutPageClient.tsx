'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Building2,
  Target,
  Award,
  Users,
  Globe,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';

// About page translations
const aboutTranslations = {
  en: {
    badge: 'About Us',
    title: 'About VetSphere Training Academy',
    subtitle:
      'VetSphere provides professional training programs for veterinary professionals worldwide. We are dedicated to advancing veterinary medicine through world-class education and hands-on training.',
    missionTitle: 'Our Mission',
    missionText1:
      'To elevate veterinary care globally by providing exceptional training and education to veterinary professionals. We believe that well-trained veterinarians lead to better outcomes for animals everywhere.',
    missionText2:
      'Founded by leading veterinary surgeons and educators, VetSphere Training Academy combines decades of clinical experience with innovative teaching methods to deliver impactful learning experiences.',
    stats: {
      trained: 'Veterinarians Trained',
      countries: 'Countries Reached',
      instructors: 'Expert Instructors',
      years: 'Years of Excellence',
    },
    instructorsTitle: 'Expert Instructors',
    instructorsSubtitle:
      'Learn from board-certified specialists and internationally recognized experts in veterinary medicine.',
    partnersTitle: 'Our Partners',
    partnersSubtitle:
      'We collaborate with leading institutions worldwide to deliver the highest quality training programs.',
    valuesTitle: 'Our Values',
    values: {
      excellence: 'Excellence',
      excellenceDesc:
        'We strive for the highest standards in everything we do, from curriculum development to instructor selection.',
      education: 'Education',
      educationDesc:
        'We believe in lifelong learning and provide resources for continuous professional development.',
      globalImpact: 'Global Impact',
      globalImpactDesc:
        'We aim to improve veterinary care worldwide by training professionals across all regions.',
    },
    ctaTitle: 'Join Our Community',
    ctaSubtitle:
      'Become part of our global network of veterinary professionals committed to excellence in animal care.',
    ctaButton: 'Start Your Journey',
    teamBadge: 'Our Team',
    partnersBadge: 'Partnerships',
  },
  th: {
    badge: 'เกี่ยวกับเรา',
    title: 'เกี่ยวกับ VetSphere Training Academy',
    subtitle:
      'VetSphere ให้บริการโปรแกรมการฝึกอบรมมืออาชีพสำหรับผู้เชี่ยวชาญด้านสัตวแพทย์ทั่วโลก เรามุ่งมั่นที่จะพัฒนาการแพทย์สัตว์ผ่านการศึกษาระดับโลกและการฝึกอบรมภาคปฏิบัติ',
    missionTitle: 'พันธกิจของเรา',
    missionText1:
      'ยกระดับการดูแลสัตว์ทั่วโลกโดยการให้การฝึกอบรมและการศึกษาที่ยอดเยี่ยมแก่ผู้เชี่ยวชาญด้านสัตวแพทย์ เราเชื่อว่าสัตวแพทย์ที่ได้รับการฝึกอบรมอย่างดีจะนำไปสู่ผลลัพธ์ที่ดีขึ้นสำหรับสัตว์ทุกที่',
    missionText2:
      'ก่อตั้งโดยศัลยแพทย์สัตว์และนักการศึกษาชั้นนำ VetSphere Training Academy รวมประสบการณ์ทางคลินิกหลายทศวรรษเข้ากับวิธีการสอนที่เป็นนวัตกรรมเพื่อมอบประสบการณ์การเรียนรู้ที่มีผลกระทบ',
    stats: {
      trained: 'สัตวแพทย์ที่ผ่านการฝึกอบรม',
      countries: 'ประเทศที่เข้าถึง',
      instructors: 'ผู้สอนผู้เชี่ยวชาญ',
      years: 'ปีแห่งความเป็นเลิศ',
    },
    instructorsTitle: 'ผู้สอนผู้เชี่ยวชาญ',
    instructorsSubtitle:
      'เรียนรู้จากผู้เชี่ยวชาญที่ได้รับการรับรองจากคณะกรรมการและผู้เชี่ยวชาญที่ได้รับการยอมรับในระดับนานาชาติในสาขาการแพทย์สัตว์',
    partnersTitle: 'พันธมิตรของเรา',
    partnersSubtitle:
      'เราร่วมมือกับสถาบันชั้นนำทั่วโลกเพื่อส่งมอบโปรแกรมการฝึกอบรมที่มีคุณภาพสูงสุด',
    valuesTitle: 'ค่านิยมของเรา',
    values: {
      excellence: 'ความเป็นเลิศ',
      excellenceDesc:
        'เรามุ่งมั่นสู่มาตรฐานสูงสุดในทุกสิ่งที่เราทำ ตั้งแต่การพัฒนาหลักสูตรไปจนถึงการคัดเลือกผู้สอน',
      education: 'การศึกษา',
      educationDesc:
        'เราเชื่อในการเรียนรู้ตลอดชีวิตและให้ทรัพยากรสำหรับการพัฒนาวิชาชีพอย่างต่อเนื่อง',
      globalImpact: 'ผลกระทบระดับโลก',
      globalImpactDesc:
        'เรามุ่งหวังที่จะปรับปรุงการดูแลสัตว์ทั่วโลกโดยการฝึกอบรมผู้เชี่ยวชาญในทุกภูมิภาค',
    },
    ctaTitle: 'เข้าร่วมชุมชนของเรา',
    ctaSubtitle:
      'เป็นส่วนหนึ่งของเครือข่ายระดับโลกของผู้เชี่ยวชาญด้านสัตวแพทย์ที่มุ่งมั่นสู่ความเป็นเลิศในการดูแลสัตว์',
    ctaButton: 'เริ่มต้นการเดินทางของคุณ',
    teamBadge: 'ทีมของเรา',
    partnersBadge: 'พันธมิตร',
  },
  ja: {
    badge: '私たちについて',
    title: 'VetSphere Training Academyについて',
    subtitle:
      'VetSphereは世界中の獣医専門家向けにプロフェッショナルなトレーニングプログラムを提供しています。私たちはワールドクラスの教育と実践的なトレーニングを通じて獣医学の発展に取り組んでいます。',
    missionTitle: '私たちの使命',
    missionText1:
      '獣医専門家に優れたトレーニングと教育を提供することで、世界中の獣医療を向上させること。よく訓練された獣医師がどこでも動物により良い結果をもたらすと私たちは信じています。',
    missionText2:
      '一流の獣医外科医と教育者によって設立されたVetSphere Training Academyは、数十年の臨床経験と革新的な教授法を組み合わせて、影響力のある学習体験を提供しています。',
    stats: {
      trained: '訓練を受けた獣医師',
      countries: '対応国数',
      instructors: '専門講師',
      years: '卓越した年数',
    },
    instructorsTitle: '専門講師陣',
    instructorsSubtitle:
      '獣医学で国際的に認められたボード認定スペシャリストと専門家から学びましょう。',
    partnersTitle: 'パートナー',
    partnersSubtitle:
      '私たちは世界中の主要機関と協力して、最高品質のトレーニングプログラムを提供しています。',
    valuesTitle: '私たちの価値観',
    values: {
      excellence: '卓越性',
      excellenceDesc:
        'カリキュラム開発から講師選考まで、すべてにおいて最高の基準を追求しています。',
      education: '教育',
      educationDesc: '私たちは生涯学習を信じ、継続的な専門能力開発のためのリソースを提供しています。',
      globalImpact: 'グローバルな影響',
      globalImpactDesc:
        'すべての地域で専門家を育成することにより、世界中の獣医療を改善することを目指しています。',
    },
    ctaTitle: 'コミュニティに参加',
    ctaSubtitle:
      '動物ケアの卓越性に取り組む獣医専門家のグローバルネットワークの一員になりましょう。',
    ctaButton: 'あなたの旅を始める',
    teamBadge: 'チーム',
    partnersBadge: 'パートナーシップ',
  },
};

const instructors = [
  {
    name: 'Dr. Sarah Chen',
    title: {
      en: 'Director of Surgical Training',
      th: 'ผู้อำนวยการฝึกอบรมการผ่าตัด',
      ja: '外科トレーニングディレクター',
    },
    specialty: {
      en: 'Orthopedic Surgery',
      th: 'ศัลยกรรมกระดูก',
      ja: '整形外科',
    },
    credentials: 'DVM, PhD, DACVS',
  },
  {
    name: 'Dr. Michael Wong',
    title: {
      en: 'Lead Workshop Instructor',
      th: 'ผู้สอนเวิร์คช็อปหลัก',
      ja: 'リードワークショップインストラクター',
    },
    specialty: {
      en: 'Soft Tissue Surgery',
      th: 'การผ่าตัดเนื้อเยื่ออ่อน',
      ja: '軟部組織手術',
    },
    credentials: 'DVM, MS, DACVS',
  },
  {
    name: 'Dr. Emily Park',
    title: {
      en: 'Emergency Medicine Specialist',
      th: 'ผู้เชี่ยวชาญด้านเวชศาสตร์ฉุกเฉิน',
      ja: '救急医療スペシャリスト',
    },
    specialty: {
      en: 'Critical Care',
      th: 'การดูแลผู้ป่วยวิกฤต',
      ja: 'クリティカルケア',
    },
    credentials: 'DVM, DACVECC',
  },
  {
    name: 'Dr. James Liu',
    title: {
      en: 'Diagnostic Imaging Expert',
      th: 'ผู้เชี่ยวชาญด้านการถ่ายภาพวินิจฉัย',
      ja: '画像診断専門家',
    },
    specialty: {
      en: 'Radiology & Ultrasound',
      th: 'รังสีวิทยาและอัลตราซาวด์',
      ja: '放射線科＆超音波',
    },
    credentials: 'DVM, DACVR',
  },
];

const partners = {
  en: [
    'Leading Veterinary Universities',
    'International Veterinary Associations',
    'Top Teaching Hospitals',
    'Medical Equipment Manufacturers',
    'Research Institutions',
    'Global Training Facilities',
  ],
  th: [
    'มหาวิทยาลัยสัตวแพทย์ชั้นนำ',
    'สมาคมสัตวแพทย์นานาชาติ',
    'โรงพยาบาลสอนชั้นนำ',
    'ผู้ผลิตอุปกรณ์การแพทย์',
    'สถาบันวิจัย',
    'ศูนย์ฝึกอบรมระดับโลก',
  ],
  ja: [
    '一流の獣医大学',
    '国際獣医学会',
    'トップ教育病院',
    '医療機器メーカー',
    '研究機関',
    'グローバルトレーニング施設',
  ],
};

interface IntlAboutPageClientProps {
  locale: string;
}

export function IntlAboutPageClient({ locale }: IntlAboutPageClientProps) {
  const { language } = useLanguage();
  const t = aboutTranslations[language as keyof typeof aboutTranslations] || aboutTranslations.en;
  const partnerList = partners[language as keyof typeof partners] || partners.en;

  return (
    <main className="pt-24">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <Building2 className="w-4 h-4 mr-2" />
              {t.badge}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">{t.title}</h1>
            <p className="text-lg text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold">{t.missionTitle}</h2>
              </div>
              <p className="text-muted-foreground mb-6">{t.missionText1}</p>
              <p className="text-muted-foreground">{t.missionText2}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center">
                <p className="text-4xl font-display font-bold text-primary mb-2">10K+</p>
                <p className="text-sm text-muted-foreground">{t.stats.trained}</p>
              </Card>
              <Card className="p-6 text-center">
                <p className="text-4xl font-display font-bold text-primary mb-2">30+</p>
                <p className="text-sm text-muted-foreground">{t.stats.countries}</p>
              </Card>
              <Card className="p-6 text-center">
                <p className="text-4xl font-display font-bold text-primary mb-2">50+</p>
                <p className="text-sm text-muted-foreground">{t.stats.instructors}</p>
              </Card>
              <Card className="p-6 text-center">
                <p className="text-4xl font-display font-bold text-primary mb-2">15+</p>
                <p className="text-sm text-muted-foreground">{t.stats.years}</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Instructors Section */}
      <section id="instructors" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              {t.teamBadge}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t.instructorsTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t.instructorsSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {instructors.map((instructor) => (
              <Card key={instructor.name} className="overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Users className="w-16 h-16 text-primary/30" />
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="font-display font-bold mb-1">{instructor.name}</h3>
                  <p className="text-sm text-primary mb-2">
                    {instructor.title[language as keyof typeof instructor.title] ||
                      instructor.title.en}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {instructor.specialty[language as keyof typeof instructor.specialty] ||
                      instructor.specialty.en}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {instructor.credentials}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              {t.partnersBadge}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">{t.partnersTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t.partnersSubtitle}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {partnerList.map((partner) => (
              <Card key={partner} className="p-6 text-center hover:shadow-md transition-shadow">
                <Globe className="w-8 h-8 mx-auto text-primary/50 mb-3" />
                <p className="font-medium text-sm">{partner}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">{t.valuesTitle}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">{t.values.excellence}</h3>
              <p className="text-muted-foreground text-sm">{t.values.excellenceDesc}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">{t.values.education}</h3>
              <p className="text-muted-foreground text-sm">{t.values.educationDesc}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">{t.values.globalImpact}</h3>
              <p className="text-muted-foreground text-sm">{t.values.globalImpactDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">{t.ctaTitle}</h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">{t.ctaSubtitle}</p>
          <Button size="lg" variant="secondary" asChild>
            <Link href={`/${locale}/courses`}>
              {t.ctaButton}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
