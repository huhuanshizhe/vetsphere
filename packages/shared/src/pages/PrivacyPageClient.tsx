'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Badge } from '../components/ui/badge';
import { Shield } from 'lucide-react';

const privacyContent = {
  en: {
    badge: 'Legal',
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: February 2025',
    sections: [
      {
        title: '1. Introduction',
        content: 'VetSphere Training Academy ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.'
      },
      {
        title: '2. Information We Collect',
        subtitle1: 'Personal Information',
        content1: 'We may collect personal information that you voluntarily provide, including: name and professional credentials, email address and phone number, billing and payment information, professional license information, and employment and practice details.',
        subtitle2: 'Automatically Collected Information',
        content2: 'We may automatically collect certain information when you visit our website: IP address and browser type, device information and operating system, pages visited and time spent on site, and referring website addresses.'
      },
      {
        title: '3. How We Use Your Information',
        content: 'We use the collected information for: processing course enrollments and payments, providing and improving our services, communicating about courses, updates, and promotions, issuing certificates and tracking continuing education credits, responding to inquiries and providing customer support, and complying with legal obligations.'
      },
      {
        title: '4. Information Sharing',
        content: 'We do not sell your personal information. We may share your information with: service providers who assist in operating our business, payment processors for transaction handling, professional organizations for certification verification, and legal authorities when required by law.'
      },
      {
        title: '5. Data Security',
        content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.'
      },
      {
        title: '6. Your Rights',
        content: 'Depending on your location, you may have the right to: access and receive a copy of your personal data, rectify inaccurate personal data, request deletion of your personal data, object to or restrict processing of your data, data portability, and withdraw consent at any time.'
      },
      {
        title: '7. Cookies',
        content: 'We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookie settings through your browser preferences.'
      },
      {
        title: '8. Third-Party Links',
        content: 'Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites.'
      },
      {
        title: '9. Children\'s Privacy',
        content: 'Our services are designed for veterinary professionals and are not intended for individuals under 18 years of age.'
      },
      {
        title: '10. Changes to This Policy',
        content: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.'
      },
      {
        title: '11. International Data Protection Compliance',
        content: 'VetSphere is committed to complying with applicable data protection regulations worldwide. For users in the European Economic Area (EEA), we process personal data in accordance with the General Data Protection Regulation (GDPR). For users in Thailand, we comply with the Personal Data Protection Act (PDPA) B.E. 2562. We ensure lawful bases for processing, maintain data protection impact assessments where required, and facilitate cross-border data transfers through appropriate safeguards including Standard Contractual Clauses (SCCs).'
      },
      {
        title: '12. Contact Us',
        content: 'For questions about this Privacy Policy, please contact us at:'
      }
    ],
    contactInfo: {
      name: 'VetSphere Training Academy',
      address1: 'Unit B53, 2/F, Kwai Shing Industrial Building Phase 1',
      address2: '36-40 Tai Lin Pai Road, Kwai Chung, N.T.',
      address3: 'Hong Kong SAR',
      email: 'Email: support@vetsphere.net',
      phone: 'Phone: +86 18616223318'
    }
  },
  th: {
    badge: 'กฎหมาย',
    title: 'นโยบายความเป็นส่วนตัว',
    lastUpdated: 'อัปเดตล่าสุด: กุมภาพันธ์ 2025',
    sections: [
      {
        title: '1. บทนำ',
        content: 'VetSphere Training Academy ("เรา" หรือ "ของเรา") มุ่งมั่นที่จะปกป้องความเป็นส่วนตัวของคุณ นโยบายความเป็นส่วนตัวนี้อธิบายวิธีที่เราเก็บรวบรวม ใช้ เปิดเผย และปกป้องข้อมูลของคุณเมื่อคุณใช้เว็บไซต์และบริการของเรา'
      },
      {
        title: '2. ข้อมูลที่เราเก็บรวบรวม',
        subtitle1: 'ข้อมูลส่วนบุคคล',
        content1: 'เราอาจเก็บรวบรวมข้อมูลส่วนบุคคลที่คุณให้โดยสมัครใจ รวมถึง: ชื่อและวุฒิการศึกษาทางวิชาชีพ ที่อยู่อีเมลและหมายเลขโทรศัพท์ ข้อมูลการเรียกเก็บเงินและการชำระเงิน ข้อมูลใบอนุญาตวิชาชีพ และรายละเอียดการจ้างงานและการปฏิบัติ',
        subtitle2: 'ข้อมูลที่เก็บรวบรวมโดยอัตโนมัติ',
        content2: 'เราอาจเก็บรวบรวมข้อมูลบางอย่างโดยอัตโนมัติเมื่อคุณเยี่ยมชมเว็บไซต์ของเรา: ที่อยู่ IP และประเภทเบราว์เซอร์ ข้อมูลอุปกรณ์และระบบปฏิบัติการ หน้าที่เข้าชมและเวลาที่ใช้บนเว็บไซต์ และที่อยู่เว็บไซต์ที่อ้างอิง'
      },
      {
        title: '3. วิธีที่เราใช้ข้อมูลของคุณ',
        content: 'เราใช้ข้อมูลที่เก็บรวบรวมสำหรับ: การประมวลผลการลงทะเบียนหลักสูตรและการชำระเงิน การให้และปรับปรุงบริการของเรา การสื่อสารเกี่ยวกับหลักสูตร อัปเดต และโปรโมชัน การออกใบรับรองและติดตามเครดิตการศึกษาต่อเนื่อง การตอบสนองต่อการสอบถามและให้การสนับสนุนลูกค้า และการปฏิบัติตามข้อผูกพันทางกฎหมาย'
      },
      {
        title: '4. การแบ่งปันข้อมูล',
        content: 'เราไม่ขายข้อมูลส่วนบุคคลของคุณ เราอาจแบ่งปันข้อมูลของคุณกับ: ผู้ให้บริการที่ช่วยในการดำเนินธุรกิจของเรา ผู้ประมวลผลการชำระเงินสำหรับการจัดการธุรกรรม องค์กรวิชาชีพสำหรับการยืนยันการรับรอง และหน่วยงานทางกฎหมายเมื่อกฎหมายกำหนด'
      },
      {
        title: '5. ความปลอดภัยของข้อมูล',
        content: 'เราใช้มาตรการทางเทคนิคและองค์กรที่เหมาะสมเพื่อปกป้องข้อมูลส่วนบุคคลของคุณจากการเข้าถึง การเปลี่ยนแปลง การเปิดเผย หรือการทำลายโดยไม่ได้รับอนุญาต อย่างไรก็ตาม ไม่มีวิธีการส่งข้อมูลผ่านอินเทอร์เน็ตที่ปลอดภัย 100%'
      },
      {
        title: '6. สิทธิ์ของคุณ',
        content: 'ขึ้นอยู่กับสถานที่ของคุณ คุณอาจมีสิทธิ์ในการ: เข้าถึงและรับสำเนาข้อมูลส่วนบุคคลของคุณ แก้ไขข้อมูลส่วนบุคคลที่ไม่ถูกต้อง ขอให้ลบข้อมูลส่วนบุคคลของคุณ คัดค้านหรือจำกัดการประมวลผลข้อมูลของคุณ การพกพาข้อมูล และเพิกถอนความยินยอมได้ตลอดเวลา'
      },
      {
        title: '7. คุกกี้',
        content: 'เราใช้คุกกี้และเทคโนโลยีการติดตามที่คล้ายกันเพื่อเพิ่มประสบการณ์ของคุณบนเว็บไซต์ของเรา คุณสามารถควบคุมการตั้งค่าคุกกี้ผ่านการตั้งค่าเบราว์เซอร์ของคุณ'
      },
      {
        title: '8. ลิงก์ของบุคคลที่สาม',
        content: 'เว็บไซต์ของเราอาจมีลิงก์ไปยังเว็บไซต์ของบุคคลที่สาม เราไม่รับผิดชอบต่อแนวปฏิบัติด้านความเป็นส่วนตัวของเว็บไซต์ภายนอกเหล่านี้'
      },
      {
        title: '9. ความเป็นส่วนตัวของเด็ก',
        content: 'บริการของเราออกแบบมาสำหรับผู้เชี่ยวชาญด้านสัตวแพทย์และไม่มีเจตนาสำหรับบุคคลที่มีอายุต่ำกว่า 18 ปี'
      },
      {
        title: '10. การเปลี่ยนแปลงนโยบายนี้',
        content: 'เราอาจอัปเดตนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว การเปลี่ยนแปลงจะถูกโพสต์บนหน้านี้พร้อมวันที่แก้ไขที่อัปเดต'
      },
      {
        title: '11. การปฏิบัติตามกฎหมายคุ้มครองข้อมูลระหว่างประเทศ',
        content: 'VetSphere มุ่งมั่นที่จะปฏิบัติตามกฎหมายคุ้มครองข้อมูลที่เกี่ยวข้องทั่วโลก สำหรับผู้ใช้ในเขตเศรษฐกิจยุโรป (EEA) เราประมวลผลข้อมูลส่วนบุคคลตามระเบียบการคุ้มครองข้อมูลทั่วไป (GDPR) สำหรับผู้ใช้ในประเทศไทย เราปฏิบัติตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) พ.ศ. 2562 เรารับรองฐานทางกฎหมายสำหรับการประมวลผล ดำเนินการประเมินผลกระทบด้านการคุ้มครองข้อมูลตามที่จำเป็น และอำนวยความสะดวกในการถ่ายโอนข้อมูลข้ามพรมแดนผ่านมาตรการป้องกันที่เหมาะสม รวมถึงข้อสัญญามาตรฐาน (SCCs)'
      },
      {
        title: '12. ติดต่อเรา',
        content: 'หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ โปรดติดต่อเราที่:'
      }
    ],
    contactInfo: {
      name: 'VetSphere Training Academy',
      address1: 'Unit B53, 2/F, Kwai Shing Industrial Building Phase 1',
      address2: '36-40 Tai Lin Pai Road, Kwai Chung, N.T.',
      address3: 'Hong Kong SAR',
      email: 'อีเมล: support@vetsphere.net',
      phone: 'โทรศัพท์: +86 18616223318'
    }
  },
  ja: {
    badge: '法的情報',
    title: 'プライバシーポリシー',
    lastUpdated: '最終更新日: 2025年2月',
    sections: [
      {
        title: '1. はじめに',
        content: 'VetSphere Training Academy（「当社」）は、お客様のプライバシーの保護に取り組んでいます。このプライバシーポリシーは、当社のウェブサイトおよびサービスをご利用になる際に、当社がお客様の情報をどのように収集、使用、開示、および保護するかを説明しています。'
      },
      {
        title: '2. 収集する情報',
        subtitle1: '個人情報',
        content1: '当社は、お客様が自発的に提供する個人情報を収集する場合があります。これには、氏名および専門資格、メールアドレスおよび電話番号、請求および支払い情報、専門免許情報、雇用および実務の詳細が含まれます。',
        subtitle2: '自動的に収集される情報',
        content2: '当社のウェブサイトにアクセスすると、特定の情報が自動的に収集される場合があります。これには、IPアドレスおよびブラウザタイプ、デバイス情報およびオペレーティングシステム、訪問したページおよびサイト滞在時間、参照元ウェブサイトアドレスが含まれます。'
      },
      {
        title: '3. お客様の情報の使用方法',
        content: '当社は、収集した情報を以下の目的で使用します：コース登録および支払いの処理、サービスの提供および改善、コース、更新、およびプロモーションに関するコミュニケーション、証明書の発行および継続教育クレジットの追跡、お問い合わせへの対応およびカスタマーサポートの提供、法的義務の遵守。'
      },
      {
        title: '4. 情報の共有',
        content: '当社は、お客様の個人情報を販売しません。当社は、お客様の情報を以下と共有する場合があります：当社の事業運営を支援するサービスプロバイダー、取引処理のための決済処理業者、認定検証のための専門組織、法律で要求される場合の法的当局。'
      },
      {
        title: '5. データセキュリティ',
        content: '当社は、お客様の個人情報を不正アクセス、改ざん、開示、または破壊から保護するために、適切な技術的および組織的措置を実施しています。ただし、インターネットを介した送信方法は100%安全ではありません。'
      },
      {
        title: '6. お客様の権利',
        content: 'お客様の所在地によっては、以下の権利を有する場合があります：個人データへのアクセスおよびコピーの受け取り、不正確な個人データの修正、個人データの削除の要求、データ処理への異議申し立てまたは制限、データポータビリティ、いつでも同意を撤回する権利。'
      },
      {
        title: '7. クッキー',
        content: '当社は、ウェブサイトでのお客様の体験を向上させるために、クッキーおよび類似の追跡技術を使用しています。ブラウザの設定を通じてクッキー設定を制御できます。'
      },
      {
        title: '8. 第三者リンク',
        content: '当社のウェブサイトには、第三者ウェブサイトへのリンクが含まれている場合があります。当社は、これらの外部サイトのプライバシー慣行について責任を負いません。'
      },
      {
        title: '9. 子供のプライバシー',
        content: '当社のサービスは獣医専門家向けに設計されており、18歳未満の個人を対象としていません。'
      },
      {
        title: '10. このポリシーの変更',
        content: '当社は、このプライバシーポリシーを随時更新する場合があります。変更は、更新された改訂日とともにこのページに掲載されます。'
      },
      {
        title: '11. 国際データ保護コンプライアンス',
        content: 'VetSphereは、世界中の適用されるデータ保護規制の遵守に取り組んでいます。欧州経済領域（EEA）のユーザーについては、一般データ保護規則（GDPR）に従って個人データを処理します。タイのユーザーについては、個人データ保護法（PDPA）仏暦2562年に準拠しています。処理の法的根拠を確保し、必要に応じてデータ保護影響評価を維持し、標準契約条項（SCC）を含む適切な保護措置を通じて国境を越えたデータ転送を促進します。'
      },
      {
        title: '12. お問い合わせ',
        content: 'このプライバシーポリシーに関するご質問は、以下までお問い合わせください：'
      }
    ],
    contactInfo: {
      name: 'VetSphere Training Academy',
      address1: 'Unit B53, 2/F, Kwai Shing Industrial Building Phase 1',
      address2: '36-40 Tai Lin Pai Road, Kwai Chung, N.T.',
      address3: '香港特別行政区',
      email: 'メール: support@vetsphere.net',
      phone: '電話: +86 18616223318'
    }
  }
};

const PrivacyPageClient: React.FC = () => {
  const { language } = useLanguage();
  const content = privacyContent[language as keyof typeof privacyContent] || privacyContent.en;

  return (
    <main className="pt-24">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <Shield className="w-4 h-4 mr-2" />
              {content.badge}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
              {content.title}
            </h1>
            <p className="text-muted-foreground">
              {content.lastUpdated}
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl prose prose-gray dark:prose-invert">
            {content.sections.map((section, index) => (
              <div key={index}>
                <h2>{section.title}</h2>
                {'subtitle1' in section && section.subtitle1 && (
                  <>
                    <h3>{section.subtitle1}</h3>
                    <p>{section.content1}</p>
                    <h3>{section.subtitle2}</h3>
                    <p>{section.content2}</p>
                  </>
                )}
                {'content' in section && section.content && (
                  <p>{section.content}</p>
                )}
              </div>
            ))}
            
            {/* Contact Info */}
            <p>
              <strong>{content.contactInfo.name}</strong><br />
              {content.contactInfo.address1}<br />
              {content.contactInfo.address2}<br />
              {content.contactInfo.address3}<br />
              {content.contactInfo.email}<br />
              {content.contactInfo.phone}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PrivacyPageClient;
