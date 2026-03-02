'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Badge } from '../components/ui/badge';
import { FileText } from 'lucide-react';

const termsContent = {
  en: {
    badge: 'Legal',
    title: 'Terms of Service',
    lastUpdated: 'Last updated: February 2025',
    sections: [
      {
        title: '1. Acceptance of Terms',
        content: "By accessing and using VetSphere Training Academy's website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services."
      },
      {
        title: '2. Description of Services',
        content: 'VetSphere Training Academy provides professional veterinary training programs, workshops, and continuing education courses for licensed veterinary professionals. Our services are educational in nature and do not constitute veterinary medical services, treatment, or clinical care.'
      },
      {
        title: '3. User Accounts',
        content: 'To access certain features of our services, you may be required to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.'
      },
      {
        title: '4. Course Enrollment',
        content: 'By enrolling in a course or workshop, you agree to: provide accurate and complete registration information, pay all applicable fees in a timely manner, attend scheduled sessions or notify us of any absences, and abide by all course rules and guidelines.'
      },
      {
        title: '5. Payment Terms',
        content: 'All fees are due at the time of enrollment unless otherwise specified. Prices are listed in USD and may be subject to applicable taxes. Payment processing is handled securely through our payment providers.'
      },
      {
        title: '6. Intellectual Property',
        content: 'All course materials, including but not limited to videos, documents, presentations, and other content, are the intellectual property of VetSphere Training Academy. You may not reproduce, distribute, or create derivative works without our express written permission.'
      },
      {
        title: '7. Code of Conduct',
        content: 'Participants in our programs are expected to maintain professional conduct at all times. We reserve the right to remove any participant who engages in disruptive, disrespectful, or inappropriate behavior.'
      },
      {
        title: '8. Limitation of Liability',
        content: 'VetSphere Training Academy provides educational content for informational purposes only. We are not liable for any decisions made based on the information provided in our courses. Participants are responsible for applying learned techniques within their scope of practice and in accordance with local regulations.'
      },
      {
        title: '9. Changes to Terms',
        content: 'We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of our services constitutes acceptance of any modifications.'
      },
      {
        title: '10. Governing Law & International Compliance',
        content: 'These terms are governed by the laws of Hong Kong SAR. For users in the European Economic Area (EEA), nothing in these terms affects your rights under the General Data Protection Regulation (GDPR). For users in Thailand, these terms comply with the Personal Data Protection Act (PDPA) B.E. 2562 and the Consumer Protection Act. We are committed to meeting all applicable international regulatory requirements in the jurisdictions where we operate.'
      },
      {
        title: '11. Contact Information',
        content: 'For questions regarding these Terms of Service, please contact us at:'
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
    title: 'เงื่อนไขการให้บริการ',
    lastUpdated: 'อัปเดตล่าสุด: กุมภาพันธ์ 2025',
    sections: [
      {
        title: '1. การยอมรับเงื่อนไข',
        content: 'การเข้าถึงและใช้งานเว็บไซต์และบริการของ VetSphere Training Academy แสดงว่าคุณตกลงที่จะผูกพันตามเงื่อนไขการให้บริการเหล่านี้ หากคุณไม่เห็นด้วยกับเงื่อนไขเหล่านี้ โปรดอย่าใช้บริการของเรา'
      },
      {
        title: '2. คำอธิบายบริการ',
        content: 'VetSphere Training Academy ให้บริการโปรแกรมการฝึกอบรมสัตวแพทย์มืออาชีพ เวิร์คช็อป และหลักสูตรการศึกษาต่อเนื่องสำหรับผู้เชี่ยวชาญด้านสัตวแพทย์ที่ได้รับใบอนุญาต บริการของเรามีลักษณะเป็นการศึกษาและไม่ถือเป็นบริการทางการแพทย์สัตว์ การรักษา หรือการดูแลทางคลินิก'
      },
      {
        title: '3. บัญชีผู้ใช้',
        content: 'เพื่อเข้าถึงคุณสมบัติบางอย่างของบริการของเรา คุณอาจต้องสร้างบัญชี คุณมีหน้าที่รักษาความลับของข้อมูลประจำตัวบัญชีของคุณและสำหรับกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณ'
      },
      {
        title: '4. การลงทะเบียนหลักสูตร',
        content: 'โดยการลงทะเบียนในหลักสูตรหรือเวิร์คช็อป คุณตกลงที่จะ: ให้ข้อมูลการลงทะเบียนที่ถูกต้องและครบถ้วน ชำระค่าธรรมเนียมทั้งหมดตามกำหนดเวลา เข้าร่วมเซสชันที่กำหนดหรือแจ้งเราถึงการขาดเรียน และปฏิบัติตามกฎและแนวทางของหลักสูตรทั้งหมด'
      },
      {
        title: '5. เงื่อนไขการชำระเงิน',
        content: 'ค่าธรรมเนียมทั้งหมดครบกำหนดชำระ ณ เวลาลงทะเบียน เว้นแต่จะระบุไว้เป็นอย่างอื่น ราคาแสดงเป็นดอลลาร์สหรัฐและอาจมีภาษีที่เกี่ยวข้อง การประมวลผลการชำระเงินจะดำเนินการอย่างปลอดภัยผ่านผู้ให้บริการชำระเงินของเรา'
      },
      {
        title: '6. ทรัพย์สินทางปัญญา',
        content: 'เอกสารหลักสูตรทั้งหมด รวมถึงแต่ไม่จำกัดเฉพาะวิดีโอ เอกสาร การนำเสนอ และเนื้อหาอื่นๆ เป็นทรัพย์สินทางปัญญาของ VetSphere Training Academy คุณไม่สามารถทำซ้ำ แจกจ่าย หรือสร้างผลงานดัดแปลงโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษรจากเรา'
      },
      {
        title: '7. จรรยาบรรณ',
        content: 'ผู้เข้าร่วมในโปรแกรมของเราคาดว่าจะรักษาความประพฤติทางวิชาชีพตลอดเวลา เราขอสงวนสิทธิ์ในการลบผู้เข้าร่วมที่มีพฤติกรรมก่อกวน ไม่เคารพ หรือไม่เหมาะสม'
      },
      {
        title: '8. ข้อจำกัดความรับผิด',
        content: 'VetSphere Training Academy ให้เนื้อหาการศึกษาเพื่อวัตถุประสงค์ในการให้ข้อมูลเท่านั้น เราไม่รับผิดชอบต่อการตัดสินใจใดๆ ที่ทำขึ้นจากข้อมูลที่ให้ในหลักสูตรของเรา ผู้เข้าร่วมมีหน้าที่รับผิดชอบในการใช้เทคนิคที่เรียนรู้ภายในขอบเขตการปฏิบัติของตนและเป็นไปตามกฎระเบียบท้องถิ่น'
      },
      {
        title: '9. การเปลี่ยนแปลงเงื่อนไข',
        content: 'เราขอสงวนสิทธิ์ในการแก้ไขเงื่อนไขเหล่านี้ได้ตลอดเวลา การเปลี่ยนแปลงจะมีผลทันทีเมื่อโพสต์ การใช้บริการของเราต่อไปถือเป็นการยอมรับการแก้ไขใดๆ'
      },
      {
        title: '10. กฎหมายที่ใช้บังคับและการปฏิบัติตามกฎหมายระหว่างประเทศ',
        content: 'เงื่อนไขเหล่านี้อยู่ภายใต้กฎหมายของเขตปกครองพิเศษฮ่องกง สำหรับผู้ใช้ในเขตเศรษฐกิจยุโรป (EEA) ไม่มีข้อใดในเงื่อนไขเหล่านี้ที่กระทบต่อสิทธิ์ของคุณภายใต้ระเบียบการคุ้มครองข้อมูลทั่วไป (GDPR) สำหรับผู้ใช้ในประเทศไทย เงื่อนไขเหล่านี้เป็นไปตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) พ.ศ. 2562 และพระราชบัญญัติคุ้มครองผู้บริโภค เรามุ่งมั่นที่จะปฏิบัติตามข้อกำหนดด้านกฎระเบียบระหว่างประเทศที่เกี่ยวข้องทั้งหมดในเขตอำนาจศาลที่เราดำเนินงาน'
      },
      {
        title: '11. ข้อมูลติดต่อ',
        content: 'หากมีคำถามเกี่ยวกับเงื่อนไขการให้บริการเหล่านี้ โปรดติดต่อเราที่:'
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
    title: '利用規約',
    lastUpdated: '最終更新日: 2025年2月',
    sections: [
      {
        title: '1. 利用規約の承諾',
        content: 'VetSphere Training Academyのウェブサイトおよびサービスにアクセスし使用することにより、お客様はこれらの利用規約に拘束されることに同意するものとします。これらの規約に同意しない場合は、当社のサービスをご利用にならないでください。'
      },
      {
        title: '2. サービスの説明',
        content: 'VetSphere Training Academyは、資格を持つ獣医専門家向けに、専門的な獣医研修プログラム、ワークショップ、および継続教育コースを提供しています。当社のサービスは教育目的であり、獣医医療サービス、治療、または臨床ケアを構成するものではありません。'
      },
      {
        title: '3. ユーザーアカウント',
        content: '当社のサービスの特定の機能にアクセスするには、アカウントを作成する必要がある場合があります。お客様は、アカウント認証情報の機密性を維持し、アカウントで発生するすべてのアクティビティについて責任を負います。'
      },
      {
        title: '4. コース登録',
        content: 'コースまたはワークショップに登録することにより、お客様は次のことに同意します：正確で完全な登録情報を提供すること、適用されるすべての料金を適時に支払うこと、予定されたセッションに出席するか欠席を通知すること、およびすべてのコースルールとガイドラインに従うこと。'
      },
      {
        title: '5. 支払条件',
        content: 'すべての料金は、特に指定がない限り、登録時に支払期日となります。価格は米ドルで表示され、適用される税金の対象となる場合があります。支払い処理は、当社の決済プロバイダーを通じて安全に処理されます。'
      },
      {
        title: '6. 知的財産権',
        content: 'ビデオ、文書、プレゼンテーション、その他のコンテンツを含むすべてのコース資料は、VetSphere Training Academyの知的財産です。当社の明示的な書面による許可なく、複製、配布、または派生作品を作成することはできません。'
      },
      {
        title: '7. 行動規範',
        content: '当社のプログラムの参加者は、常に専門家としての行動を維持することが期待されます。当社は、破壊的、無礼、または不適切な行動を行う参加者を排除する権利を留保します。'
      },
      {
        title: '8. 責任の制限',
        content: 'VetSphere Training Academyは、情報提供のみを目的として教育コンテンツを提供しています。当社は、当社のコースで提供される情報に基づいて行われた決定について責任を負いません。参加者は、学んだ技術を自己の実践範囲内で、地域の規制に従って適用する責任があります。'
      },
      {
        title: '9. 規約の変更',
        content: '当社は、いつでもこれらの規約を変更する権利を留保します。変更は掲載後直ちに有効となります。当社のサービスを継続して使用することは、変更を承諾したものとみなされます。'
      },
      {
        title: '10. 準拠法および国際コンプライアンス',
        content: 'これらの規約は、香港特別行政区の法律に準拠します。欧州経済領域（EEA）のユーザーについては、これらの規約のいかなる条項も、一般データ保護規則（GDPR）に基づくお客様の権利に影響を与えるものではありません。タイのユーザーについては、これらの規約は個人データ保護法（PDPA）仏暦2562年および消費者保護法に準拠しています。当社は、事業を行うすべての管轄区域において、適用されるすべての国際規制要件を満たすことに取り組んでいます。'
      },
      {
        title: '11. 連絡先情報',
        content: 'これらの利用規約に関するご質問は、以下までお問い合わせください：'
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

const TermsPageClient: React.FC = () => {
  const { language } = useLanguage();
  const content = termsContent[language as keyof typeof termsContent] || termsContent.en;

  return (
    <main className="pt-24">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <FileText className="w-4 h-4 mr-2" />
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
                <p>{section.content}</p>
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

export default TermsPageClient;
