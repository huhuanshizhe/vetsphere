'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Badge } from '../components/ui/badge';
import { ReceiptText } from 'lucide-react';

const refundContent = {
  en: {
    badge: 'Legal',
    title: 'Refund Policy',
    lastUpdated: 'Last updated: February 2025',
    sections: [
      {
        title: '1. Overview',
        content: 'VetSphere Training Academy is committed to providing high-quality veterinary training programs. We understand that circumstances may change, and we offer the following refund policy for our courses and workshops.'
      },
      {
        title: '2. Cancellation by Participant',
        subtitle: 'In-Person Workshops and Training',
        items: [
          '30+ days before start date: Full refund minus a 10% administrative fee',
          '15-29 days before start date: 50% refund',
          '7-14 days before start date: 25% refund',
          'Less than 7 days before start date: No refund available'
        ],
        subtitle2: 'Certification Programs',
        items2: [
          'Before program start: Full refund minus a 15% administrative fee',
          'Within first week of program: 75% refund',
          'After first week: No refund available, but transfer options may be considered'
        ]
      },
      {
        title: '3. Transfer Options',
        content: 'If you are unable to attend a scheduled course, you may transfer your enrollment to: a future session of the same course (subject to availability), a different course of equal or lesser value, or another qualified veterinary professional (with our approval). Transfer requests must be made at least 7 days before the original course start date. A transfer fee of 5% may apply.'
      },
      {
        title: '4. Cancellation by VetSphere',
        content: 'If VetSphere Training Academy cancels a course or workshop for any reason, participants will receive: a full refund of all fees paid, OR the option to transfer to an alternative course or future session. We will make every effort to notify participants at least 14 days in advance if a course must be cancelled.'
      },
      {
        title: '5. No-Shows',
        content: 'Participants who do not attend a course without prior notification are not eligible for refunds or transfers.'
      },
      {
        title: '6. Exceptional Circumstances',
        content: 'In cases of medical emergencies, family emergencies, or other exceptional circumstances, please contact us as soon as possible. We will review each case individually and may offer exceptions to our standard policy.'
      },
      {
        title: '7. Refund Processing',
        content: 'Approved refunds will be processed within 14 business days. Refunds will be issued to the original payment method. Please note that your bank or credit card company may take additional time to process the refund.'
      },
      {
        title: '8. Disputes',
        content: 'If you believe you are entitled to a refund that has not been processed, please contact our support team. We will work with you to resolve any concerns fairly and promptly.'
      },
      {
        title: '9. Contact for Refund Requests',
        content: 'To request a refund or transfer, please contact us at:'
      }
    ],
    contactInfo: {
      name: 'VetSphere Training Academy',
      address1: 'Unit B53, 2/F, Kwai Shing Industrial Building Phase 1',
      address2: '36-40 Tai Lin Pai Road, Kwai Chung, N.T.',
      address3: 'Hong Kong SAR',
      email: 'Email: support@vetsphere.net',
      phone: 'Phone: +86 18616223318',
      note: 'Please include your order confirmation number and the reason for your refund request in your communication.'
    }
  },
  th: {
    badge: 'กฎหมาย',
    title: 'นโยบายการคืนเงิน',
    lastUpdated: 'อัปเดตล่าสุด: กุมภาพันธ์ 2025',
    sections: [
      {
        title: '1. ภาพรวม',
        content: 'VetSphere Training Academy มุ่งมั่นที่จะให้บริการโปรแกรมการฝึกอบรมสัตวแพทย์คุณภาพสูง เราเข้าใจว่าสถานการณ์อาจเปลี่ยนแปลง และเราเสนอนโยบายการคืนเงินต่อไปนี้สำหรับหลักสูตรและเวิร์คช็อปของเรา'
      },
      {
        title: '2. การยกเลิกโดยผู้เข้าร่วม',
        subtitle: 'เวิร์คช็อปและการฝึกอบรมแบบพบหน้า',
        items: [
          '30 วันขึ้นไปก่อนวันเริ่มต้น: คืนเงินเต็มจำนวนหักค่าธรรมเนียมการบริหาร 10%',
          '15-29 วันก่อนวันเริ่มต้น: คืนเงิน 50%',
          '7-14 วันก่อนวันเริ่มต้น: คืนเงิน 25%',
          'น้อยกว่า 7 วันก่อนวันเริ่มต้น: ไม่มีการคืนเงิน'
        ],
        subtitle2: 'โปรแกรมการรับรอง',
        items2: [
          'ก่อนเริ่มโปรแกรม: คืนเงินเต็มจำนวนหักค่าธรรมเนียมการบริหาร 15%',
          'ภายในสัปดาห์แรกของโปรแกรม: คืนเงิน 75%',
          'หลังสัปดาห์แรก: ไม่มีการคืนเงิน แต่อาจพิจารณาตัวเลือกการโอน'
        ]
      },
      {
        title: '3. ตัวเลือกการโอน',
        content: 'หากคุณไม่สามารถเข้าร่วมหลักสูตรที่กำหนดไว้ได้ คุณอาจโอนการลงทะเบียนของคุณไปยัง: เซสชันในอนาคตของหลักสูตรเดียวกัน (ขึ้นอยู่กับความพร้อม) หลักสูตรอื่นที่มีมูลค่าเท่าเทียมหรือน้อยกว่า หรือผู้เชี่ยวชาญด้านสัตวแพทย์ที่มีคุณสมบัติเหมาะสมคนอื่น (โดยได้รับการอนุมัติจากเรา) คำขอโอนต้องทำอย่างน้อย 7 วันก่อนวันเริ่มหลักสูตรเดิม อาจมีค่าธรรมเนียมการโอน 5%'
      },
      {
        title: '4. การยกเลิกโดย VetSphere',
        content: 'หาก VetSphere Training Academy ยกเลิกหลักสูตรหรือเวิร์คช็อปด้วยเหตุผลใดก็ตาม ผู้เข้าร่วมจะได้รับ: การคืนเงินเต็มจำนวนของค่าธรรมเนียมทั้งหมดที่ชำระแล้ว หรือตัวเลือกในการโอนไปยังหลักสูตรทางเลือกหรือเซสชันในอนาคต เราจะพยายามทุกวิถีทางเพื่อแจ้งผู้เข้าร่วมล่วงหน้าอย่างน้อย 14 วันหากหลักสูตรต้องถูกยกเลิก'
      },
      {
        title: '5. การไม่มาปรากฏตัว',
        content: 'ผู้เข้าร่วมที่ไม่เข้าร่วมหลักสูตรโดยไม่แจ้งให้ทราบล่วงหน้าจะไม่มีสิทธิ์ได้รับการคืนเงินหรือการโอน'
      },
      {
        title: '6. สถานการณ์พิเศษ',
        content: 'ในกรณีฉุกเฉินทางการแพทย์ ฉุกเฉินครอบครัว หรือสถานการณ์พิเศษอื่นๆ โปรดติดต่อเราโดยเร็วที่สุด เราจะตรวจสอบแต่ละกรณีเป็นรายบุคคลและอาจเสนอข้อยกเว้นต่อนโยบายมาตรฐานของเรา'
      },
      {
        title: '7. การประมวลผลการคืนเงิน',
        content: 'การคืนเงินที่ได้รับอนุมัติจะถูกดำเนินการภายใน 14 วันทำการ การคืนเงินจะออกไปยังวิธีการชำระเงินเดิม โปรดทราบว่าธนาคารหรือบริษัทบัตรเครดิตของคุณอาจใช้เวลาเพิ่มเติมในการประมวลผลการคืนเงิน'
      },
      {
        title: '8. ข้อพิพาท',
        content: 'หากคุณเชื่อว่าคุณมีสิทธิ์ได้รับการคืนเงินที่ยังไม่ได้รับการดำเนินการ โปรดติดต่อทีมสนับสนุนของเรา เราจะทำงานร่วมกับคุณเพื่อแก้ไขข้อกังวลใดๆ อย่างยุติธรรมและรวดเร็ว'
      },
      {
        title: '9. ติดต่อเพื่อขอคืนเงิน',
        content: 'หากต้องการขอคืนเงินหรือโอน โปรดติดต่อเราที่:'
      }
    ],
    contactInfo: {
      name: 'VetSphere Training Academy',
      address1: 'Unit B53, 2/F, Kwai Shing Industrial Building Phase 1',
      address2: '36-40 Tai Lin Pai Road, Kwai Chung, N.T.',
      address3: 'Hong Kong SAR',
      email: 'อีเมล: support@vetsphere.net',
      phone: 'โทรศัพท์: +86 18616223318',
      note: 'โปรดรวมหมายเลขยืนยันการสั่งซื้อและเหตุผลในการขอคืนเงินของคุณในการสื่อสารของคุณ'
    }
  },
  ja: {
    badge: '法的情報',
    title: '返金ポリシー',
    lastUpdated: '最終更新日: 2025年2月',
    sections: [
      {
        title: '1. 概要',
        content: 'VetSphere Training Academyは、高品質の獣医研修プログラムの提供に取り組んでいます。状況が変わる可能性があることを理解しており、コースおよびワークショップに対して以下の返金ポリシーを提供しています。'
      },
      {
        title: '2. 参加者によるキャンセル',
        subtitle: '対面ワークショップとトレーニング',
        items: [
          '開始日の30日以上前: 10%の管理手数料を差し引いた全額返金',
          '開始日の15-29日前: 50%返金',
          '開始日の7-14日前: 25%返金',
          '開始日の7日未満前: 返金不可'
        ],
        subtitle2: '認定プログラム',
        items2: [
          'プログラム開始前: 15%の管理手数料を差し引いた全額返金',
          'プログラム開始後1週間以内: 75%返金',
          '1週間後: 返金不可、ただし振替オプションを検討する場合あり'
        ]
      },
      {
        title: '3. 振替オプション',
        content: '予定されたコースに参加できない場合、登録を以下に振り替えることができます：同じコースの将来のセッション（空き状況による）、同等またはそれ以下の価値の別のコース、または別の有資格獣医専門家（当社の承認を得て）。振替リクエストは、元のコース開始日の少なくとも7日前に行う必要があります。5%の振替手数料がかかる場合があります。'
      },
      {
        title: '4. VetSphereによるキャンセル',
        content: 'VetSphere Training Academyが何らかの理由でコースまたはワークショップをキャンセルした場合、参加者は以下を受け取ります：支払済みのすべての料金の全額返金、または代替コースまたは将来のセッションへの振替オプション。コースをキャンセルする必要がある場合は、少なくとも14日前に参加者に通知するよう努めます。'
      },
      {
        title: '5. 無断欠席',
        content: '事前の通知なしにコースに参加しなかった参加者は、返金または振替の資格がありません。'
      },
      {
        title: '6. 例外的な状況',
        content: '医療緊急事態、家族の緊急事態、またはその他の例外的な状況の場合は、できるだけ早くご連絡ください。各ケースを個別に検討し、標準ポリシーの例外を提供する場合があります。'
      },
      {
        title: '7. 返金処理',
        content: '承認された返金は、14営業日以内に処理されます。返金は元の支払い方法に発行されます。銀行またはクレジットカード会社が返金の処理に追加の時間がかかる場合があることにご注意ください。'
      },
      {
        title: '8. 紛争',
        content: '処理されていない返金を受ける権利があると思われる場合は、サポートチームにお問い合わせください。ご懸念事項を公正かつ迅速に解決するために努めます。'
      },
      {
        title: '9. 返金リクエストの連絡先',
        content: '返金または振替をリクエストするには、以下までご連絡ください：'
      }
    ],
    contactInfo: {
      name: 'VetSphere Training Academy',
      address1: 'Unit B53, 2/F, Kwai Shing Industrial Building Phase 1',
      address2: '36-40 Tai Lin Pai Road, Kwai Chung, N.T.',
      address3: '香港特別行政区',
      email: 'メール: support@vetsphere.net',
      phone: '電話: +86 18616223318',
      note: '返金リクエストの際は、注文確認番号と理由をご記載ください。'
    }
  }
};

const RefundPageClient: React.FC = () => {
  const { language } = useLanguage();
  const content = refundContent[language as keyof typeof refundContent] || refundContent.en;

  return (
    <main className="pt-24">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <ReceiptText className="w-4 h-4 mr-2" />
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
                {'items' in section && section.items ? (
                  <>
                    <h3>{section.subtitle}</h3>
                    <ul>
                      {section.items.map((item, i) => (
                        <li key={i}><strong>{item.split(':')[0]}:</strong>{item.split(':').slice(1).join(':')}</li>
                      ))}
                    </ul>
                    {section.subtitle2 && (
                      <>
                        <h3>{section.subtitle2}</h3>
                        <ul>
                          {section.items2?.map((item, i) => (
                            <li key={i}><strong>{item.split(':')[0]}:</strong>{item.split(':').slice(1).join(':')}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                ) : (
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
            <p>{content.contactInfo.note}</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default RefundPageClient;
