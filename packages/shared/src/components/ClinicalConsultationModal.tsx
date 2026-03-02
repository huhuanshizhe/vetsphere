'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface ClinicalConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productBrand?: string;
  productImageUrl?: string;
}

// Country list for veterinary markets
const COUNTRIES = [
  { code: 'TH', name: { en: 'Thailand', th: 'ประเทศไทย', ja: 'タイ', zh: '泰国' } },
  { code: 'JP', name: { en: 'Japan', th: 'ญี่ปุ่น', ja: '日本', zh: '日本' } },
  { code: 'SG', name: { en: 'Singapore', th: 'สิงคโปร์', ja: 'シンガポール', zh: '新加坡' } },
  { code: 'MY', name: { en: 'Malaysia', th: 'มาเลเซีย', ja: 'マレーシア', zh: '马来西亚' } },
  { code: 'VN', name: { en: 'Vietnam', th: 'เวียดนาม', ja: 'ベトナム', zh: '越南' } },
  { code: 'ID', name: { en: 'Indonesia', th: 'อินโดนีเซีย', ja: 'インドネシア', zh: '印度尼西亚' } },
  { code: 'PH', name: { en: 'Philippines', th: 'ฟิลิปปินส์', ja: 'フィリピン', zh: '菲律宾' } },
  { code: 'KR', name: { en: 'South Korea', th: 'เกาหลีใต้', ja: '韓国', zh: '韩国' } },
  { code: 'TW', name: { en: 'Taiwan', th: 'ไต้หวัน', ja: '台湾', zh: '台湾' } },
  { code: 'HK', name: { en: 'Hong Kong', th: 'ฮ่องกง', ja: '香港', zh: '香港' } },
  { code: 'AU', name: { en: 'Australia', th: 'ออสเตรเลีย', ja: 'オーストラリア', zh: '澳大利亚' } },
  { code: 'NZ', name: { en: 'New Zealand', th: 'นิวซีแลนด์', ja: 'ニュージーランド', zh: '新西兰' } },
  { code: 'IN', name: { en: 'India', th: 'อินเดีย', ja: 'インド', zh: '印度' } },
  { code: 'AE', name: { en: 'UAE', th: 'สหรัฐอาหรับเอมิเรตส์', ja: 'UAE', zh: '阿联酋' } },
  { code: 'OTHER', name: { en: 'Other', th: 'อื่นๆ', ja: 'その他', zh: '其他' } },
];

const PURCHASE_TIMELINES = [
  { value: 'immediate', label: { en: 'Immediate (within 1 month)', th: 'ทันที (ภายใน 1 เดือน)', ja: '即時（1ヶ月以内）', zh: '立即（1个月内）' } },
  { value: '1-3months', label: { en: '1-3 months', th: '1-3 เดือน', ja: '1〜3ヶ月', zh: '1-3个月' } },
  { value: '3-6months', label: { en: '3-6 months', th: '3-6 เดือน', ja: '3〜6ヶ月', zh: '3-6个月' } },
  { value: '6-12months', label: { en: '6-12 months', th: '6-12 เดือน', ja: '6〜12ヶ月', zh: '6-12个月' } },
  { value: 'planning', label: { en: 'Just planning / researching', th: 'วางแผน / ศึกษาข้อมูล', ja: '計画中/調査中', zh: '正在规划/调研' } },
];

const BUDGET_RANGES = [
  { value: 'under5k', label: { en: 'Under $5,000', th: 'ต่ำกว่า $5,000', ja: '$5,000未満', zh: '$5,000以下' } },
  { value: '5k-15k', label: { en: '$5,000 - $15,000', th: '$5,000 - $15,000', ja: '$5,000〜$15,000', zh: '$5,000-$15,000' } },
  { value: '15k-50k', label: { en: '$15,000 - $50,000', th: '$15,000 - $50,000', ja: '$15,000〜$50,000', zh: '$15,000-$50,000' } },
  { value: '50k-100k', label: { en: '$50,000 - $100,000', th: '$50,000 - $100,000', ja: '$50,000〜$100,000', zh: '$50,000-$100,000' } },
  { value: 'over100k', label: { en: 'Over $100,000', th: 'มากกว่า $100,000', ja: '$100,000以上', zh: '$100,000以上' } },
  { value: 'undisclosed', label: { en: 'Prefer not to say', th: 'ไม่ระบุ', ja: '非公開', zh: '不便透露' } },
];

const translations = {
  en: {
    title: 'Request Clinical Consultation',
    subtitle: 'Our clinical specialists will provide personalized equipment recommendations for your practice.',
    productLabel: 'Equipment of Interest',
    contactInfo: 'Contact Information',
    nameLabel: 'Your Name',
    namePlaceholder: 'Dr. / Prof. Full Name',
    emailLabel: 'Email Address',
    emailPlaceholder: 'your@clinic.com',
    phoneLabel: 'Phone / WhatsApp',
    phonePlaceholder: '+66 2 XXX XXXX',
    clinicInfo: 'Clinic Information',
    clinicNameLabel: 'Clinic / Hospital Name',
    clinicNamePlaceholder: 'Enter your clinic or hospital name',
    countryLabel: 'Country / Region',
    countryPlaceholder: 'Select your country',
    purchaseInfo: 'Purchase Planning',
    timelineLabel: 'Estimated Purchase Timeline',
    timelinePlaceholder: 'When do you plan to purchase?',
    budgetLabel: 'Budget Range (USD)',
    budgetPlaceholder: 'Select budget range',
    messageLabel: 'Tell Us About Your Needs',
    messagePlaceholder: 'Describe your clinical requirements, patient volume, specific features needed, or any questions about the equipment...',
    submitButton: 'Request Consultation',
    submitting: 'Submitting...',
    successTitle: 'Consultation Request Received!',
    successMessage: 'Thank you for your interest. Our clinical specialist will contact you within 24-48 business hours to discuss your equipment needs.',
    closeButton: 'Close',
    required: '*',
    optional: '(Optional)',
    privacyNote: 'Your information is kept confidential and used only for consultation purposes.',
  },
  th: {
    title: 'ขอคำปรึกษาทางคลินิก',
    subtitle: 'ผู้เชี่ยวชาญจะให้คำแนะนำเครื่องมือที่เหมาะกับคลินิกของคุณ',
    productLabel: 'อุปกรณ์ที่สนใจ',
    contactInfo: 'ข้อมูลติดต่อ',
    nameLabel: 'ชื่อ-นามสกุล',
    namePlaceholder: 'น.สพ. / ศ. ชื่อ-นามสกุล',
    emailLabel: 'อีเมล',
    emailPlaceholder: 'your@clinic.com',
    phoneLabel: 'โทรศัพท์ / Line',
    phonePlaceholder: '+66 2 XXX XXXX',
    clinicInfo: 'ข้อมูลคลินิก',
    clinicNameLabel: 'ชื่อคลินิก / โรงพยาบาล',
    clinicNamePlaceholder: 'กรอกชื่อคลินิกหรือโรงพยาบาล',
    countryLabel: 'ประเทศ / ภูมิภาค',
    countryPlaceholder: 'เลือกประเทศ',
    purchaseInfo: 'แผนการจัดซื้อ',
    timelineLabel: 'ระยะเวลาที่คาดว่าจะซื้อ',
    timelinePlaceholder: 'คุณวางแผนจะซื้อเมื่อไหร่?',
    budgetLabel: 'งบประมาณ (USD)',
    budgetPlaceholder: 'เลือกช่วงงบประมาณ',
    messageLabel: 'บอกเราเกี่ยวกับความต้องการของคุณ',
    messagePlaceholder: 'อธิบายความต้องการทางคลินิก จำนวนผู้ป่วย ฟีเจอร์ที่ต้องการ หรือคำถามเกี่ยวกับอุปกรณ์...',
    submitButton: 'ส่งคำขอปรึกษา',
    submitting: 'กำลังส่ง...',
    successTitle: 'รับคำขอปรึกษาแล้ว!',
    successMessage: 'ขอบคุณสำหรับความสนใจ ผู้เชี่ยวชาญจะติดต่อกลับภายใน 24-48 ชั่วโมงทำการ',
    closeButton: 'ปิด',
    required: '*',
    optional: '(ไม่บังคับ)',
    privacyNote: 'ข้อมูลของคุณจะถูกเก็บเป็นความลับและใช้เพื่อการปรึกษาเท่านั้น',
  },
  ja: {
    title: '臨床コンサルテーションを依頼',
    subtitle: '当社の臨床スペシャリストが、あなたの診療所に最適な機器をご提案します。',
    productLabel: 'ご興味のある機器',
    contactInfo: '連絡先情報',
    nameLabel: 'お名前',
    namePlaceholder: '博士 / 教授 フルネーム',
    emailLabel: 'メールアドレス',
    emailPlaceholder: 'your@clinic.com',
    phoneLabel: '電話番号',
    phonePlaceholder: '+81 3 XXXX XXXX',
    clinicInfo: 'クリニック情報',
    clinicNameLabel: 'クリニック / 病院名',
    clinicNamePlaceholder: 'クリニックまたは病院名を入力',
    countryLabel: '国 / 地域',
    countryPlaceholder: '国を選択',
    purchaseInfo: '購入計画',
    timelineLabel: '購入予定時期',
    timelinePlaceholder: 'いつ頃購入予定ですか？',
    budgetLabel: '予算範囲（USD）',
    budgetPlaceholder: '予算範囲を選択',
    messageLabel: 'ご要望をお聞かせください',
    messagePlaceholder: '臨床要件、患者数、必要な機能、または機器に関するご質問をお書きください...',
    submitButton: 'コンサルテーションを依頼',
    submitting: '送信中...',
    successTitle: 'コンサルテーション依頼を受け付けました！',
    successMessage: 'お問い合わせありがとうございます。臨床スペシャリストが24〜48営業時間以内にご連絡いたします。',
    closeButton: '閉じる',
    required: '*',
    optional: '（任意）',
    privacyNote: 'お客様の情報は機密として扱い、コンサルテーション目的のみに使用します。',
  },
  zh: {
    title: '申请临床咨询',
    subtitle: '我们的临床专家将为您的诊所提供个性化的设备建议。',
    productLabel: '感兴趣的设备',
    contactInfo: '联系信息',
    nameLabel: '您的姓名',
    namePlaceholder: '博士 / 教授 全名',
    emailLabel: '电子邮箱',
    emailPlaceholder: 'your@clinic.com',
    phoneLabel: '电话 / 微信',
    phonePlaceholder: '+86 XXX XXXX XXXX',
    clinicInfo: '诊所信息',
    clinicNameLabel: '诊所 / 医院名称',
    clinicNamePlaceholder: '输入您的诊所或医院名称',
    countryLabel: '国家 / 地区',
    countryPlaceholder: '选择您的国家',
    purchaseInfo: '采购计划',
    timelineLabel: '预计采购时间',
    timelinePlaceholder: '您计划何时采购？',
    budgetLabel: '预算范围（美元）',
    budgetPlaceholder: '选择预算范围',
    messageLabel: '告诉我们您的需求',
    messagePlaceholder: '描述您的临床需求、患者量、所需功能或关于设备的任何问题...',
    submitButton: '提交咨询请求',
    submitting: '提交中...',
    successTitle: '咨询请求已收到！',
    successMessage: '感谢您的关注。我们的临床专家将在24-48个工作小时内与您联系。',
    closeButton: '关闭',
    required: '*',
    optional: '（可选）',
    privacyNote: '您的信息将被保密，仅用于咨询目的。',
  },
};

export default function ClinicalConsultationModal({ 
  isOpen, 
  onClose, 
  productId, 
  productName, 
  productBrand,
  productImageUrl 
}: ClinicalConsultationModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = translations[language as keyof typeof translations] || translations.en;
  const lang = language as 'en' | 'th' | 'ja' | 'zh';

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    clinicName: '',
    country: '',
    timeline: '',
    budget: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!formData.name.trim() || !formData.email.trim() || !formData.clinicName.trim() || 
        !formData.country || !formData.message.trim()) {
      setError(language === 'zh' ? '请填写所有必填字段' : 
               language === 'ja' ? '必須項目をすべて入力してください' :
               language === 'th' ? 'กรุณากรอกข้อมูลที่จำเป็นทั้งหมด' :
               'Please fill in all required fields.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(language === 'zh' ? '请输入有效的电子邮箱' :
               language === 'ja' ? '有効なメールアドレスを入力してください' :
               language === 'th' ? 'กรุณากรอกอีเมลที่ถูกต้อง' :
               'Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          customerName: formData.name.trim(),
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone.trim() || undefined,
          clinicName: formData.clinicName.trim(),
          country: formData.country,
          estimatedPurchaseTime: formData.timeline || undefined,
          budgetRange: formData.budget || undefined,
          message: formData.message.trim(),
          inquiryType: 'consultation',
          source: 'product_page',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit inquiry');
      }

      setSubmitted(true);
    } catch {
      setError(language === 'zh' ? '提交失败，请重试' :
               language === 'ja' ? '送信に失敗しました。もう一度お試しください' :
               language === 'th' ? 'ส่งไม่สำเร็จ กรุณาลองอีกครั้ง' :
               'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setFormData({ 
      name: user?.name || '', 
      email: user?.email || '', 
      phone: '', 
      clinicName: '', 
      country: '', 
      timeline: '', 
      budget: '', 
      message: '' 
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-vs to-emerald-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black">{t.title}</h2>
              <p className="text-sm text-white/80 mt-1">{t.subtitle}</p>
            </div>
            <button 
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              &#10005;
            </button>
          </div>
          
          {/* Product info */}
          <div className="mt-4 p-3 bg-white/10 rounded-xl flex items-center gap-3">
            {productImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-white" />
            )}
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider">{t.productLabel}</p>
              <p className="font-bold">
                {productBrand && <span className="text-emerald-200">{productBrand}</span>} {productName}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-emerald-600">&#10003;</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">{t.successTitle}</h3>
              <p className="text-slate-500 max-w-md mx-auto">{t.successMessage}</p>
              <button 
                onClick={handleClose}
                className="mt-6 px-8 py-3 bg-vs text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
              >
                {t.closeButton}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information Section */}
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>&#128100;</span> {t.contactInfo}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      {t.nameLabel} <span className="text-red-500">{t.required}</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t.namePlaceholder}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs focus:ring-2 focus:ring-vs/20 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      {t.emailLabel} <span className="text-red-500">{t.required}</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t.emailPlaceholder}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs focus:ring-2 focus:ring-vs/20 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {t.phoneLabel} <span className="text-slate-400 text-xs">{t.optional}</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={t.phonePlaceholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs focus:ring-2 focus:ring-vs/20 transition-all"
                  />
                </div>
              </div>

              {/* Clinic Information Section */}
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>&#127973;</span> {t.clinicInfo}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      {t.clinicNameLabel} <span className="text-red-500">{t.required}</span>
                    </label>
                    <input
                      type="text"
                      name="clinicName"
                      value={formData.clinicName}
                      onChange={handleChange}
                      placeholder={t.clinicNamePlaceholder}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs focus:ring-2 focus:ring-vs/20 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      {t.countryLabel} <span className="text-red-500">{t.required}</span>
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs focus:ring-2 focus:ring-vs/20 transition-all"
                      required
                    >
                      <option value="">{t.countryPlaceholder}</option>
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name[lang] || country.name.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Purchase Planning Section */}
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>&#128197;</span> {t.purchaseInfo}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      {t.timelineLabel} <span className="text-slate-400 text-xs">{t.optional}</span>
                    </label>
                    <select
                      name="timeline"
                      value={formData.timeline}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs focus:ring-2 focus:ring-vs/20 transition-all"
                    >
                      <option value="">{t.timelinePlaceholder}</option>
                      {PURCHASE_TIMELINES.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label[lang] || option.label.en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      {t.budgetLabel} <span className="text-slate-400 text-xs">{t.optional}</span>
                    </label>
                    <select
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs focus:ring-2 focus:ring-vs/20 transition-all"
                    >
                      <option value="">{t.budgetPlaceholder}</option>
                      {BUDGET_RANGES.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label[lang] || option.label.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Message Section */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {t.messageLabel} <span className="text-red-500">{t.required}</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t.messagePlaceholder}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs focus:ring-2 focus:ring-vs/20 transition-all resize-none"
                  required
                />
              </div>

              {/* Privacy Note */}
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <span>&#128274;</span> {t.privacyNote}
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm font-bold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-vs to-emerald-600 text-white rounded-xl font-black text-lg uppercase tracking-wider hover:from-emerald-600 hover:to-vs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {submitting ? t.submitting : t.submitButton}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
