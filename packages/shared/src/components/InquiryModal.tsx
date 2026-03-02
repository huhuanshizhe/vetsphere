'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productBrand?: string;
}

const translations = {
  en: {
    title: 'Request a Quote',
    subtitle: 'Fill out the form below and our team will get back to you within 24 hours.',
    productLabel: 'Product',
    nameLabel: 'Your Name',
    namePlaceholder: 'Enter your full name',
    emailLabel: 'Email Address',
    emailPlaceholder: 'your@email.com',
    phoneLabel: 'Phone Number',
    phonePlaceholder: '+1 234 567 8900',
    companyLabel: 'Company / Clinic Name',
    companyPlaceholder: 'Enter clinic or company name',
    quantityLabel: 'Quantity Needed',
    quantityPlaceholder: 'e.g., 5',
    messageLabel: 'Message',
    messagePlaceholder: 'Tell us about your requirements, timeline, or any questions...',
    submitButton: 'Submit Inquiry',
    submitting: 'Submitting...',
    successTitle: 'Inquiry Submitted!',
    successMessage: 'Thank you for your inquiry. Our team will contact you within 24 hours.',
    closeButton: 'Close',
    required: 'Required',
  },
  th: {
    title: 'ขอใบเสนอราคา',
    subtitle: 'กรอกแบบฟอร์มด้านล่าง ทีมงานของเราจะติดต่อกลับภายใน 24 ชั่วโมง',
    productLabel: 'สินค้า',
    nameLabel: 'ชื่อของคุณ',
    namePlaceholder: 'กรอกชื่อ-นามสกุล',
    emailLabel: 'อีเมล',
    emailPlaceholder: 'your@email.com',
    phoneLabel: 'เบอร์โทรศัพท์',
    phonePlaceholder: '+66 2 345 6789',
    companyLabel: 'ชื่อบริษัท / คลินิก',
    companyPlaceholder: 'กรอกชื่อคลินิกหรือบริษัท',
    quantityLabel: 'จำนวนที่ต้องการ',
    quantityPlaceholder: 'เช่น 5',
    messageLabel: 'ข้อความ',
    messagePlaceholder: 'แจ้งความต้องการ ระยะเวลา หรือคำถามของคุณ...',
    submitButton: 'ส่งคำขอ',
    submitting: 'กำลังส่ง...',
    successTitle: 'ส่งคำขอสำเร็จ!',
    successMessage: 'ขอบคุณสำหรับการติดต่อ ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง',
    closeButton: 'ปิด',
    required: 'จำเป็น',
  },
  ja: {
    title: '見積もりをリクエスト',
    subtitle: '以下のフォームにご記入ください。24時間以内にご連絡いたします。',
    productLabel: '製品',
    nameLabel: 'お名前',
    namePlaceholder: 'お名前を入力',
    emailLabel: 'メールアドレス',
    emailPlaceholder: 'your@email.com',
    phoneLabel: '電話番号',
    phonePlaceholder: '+81 3 1234 5678',
    companyLabel: '会社名 / クリニック名',
    companyPlaceholder: 'クリニックまたは会社名を入力',
    quantityLabel: '必要数量',
    quantityPlaceholder: '例：5',
    messageLabel: 'メッセージ',
    messagePlaceholder: 'ご要望、納期、ご質問などをお知らせください...',
    submitButton: 'お問い合わせを送信',
    submitting: '送信中...',
    successTitle: 'お問い合わせ完了！',
    successMessage: 'お問い合わせありがとうございます。24時間以内にご連絡いたします。',
    closeButton: '閉じる',
    required: '必須',
  },
};

export default function InquiryModal({ isOpen, onClose, productId, productName, productBrand }: InquiryModalProps) {
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    company: '',
    quantity: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
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
          companyName: formData.company.trim() || undefined,
          quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
          message: formData.message.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit inquiry');
      }

      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setFormData({ name: user?.name || '', email: user?.email || '', phone: '', company: '', quantity: '', message: '' });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black text-slate-900">{t.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
            </div>
            <button 
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Product info */}
          <div className="mt-4 p-3 bg-vs/5 rounded-xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t.productLabel}</p>
            <p className="font-black text-slate-900">
              {productBrand && <span className="text-vs">{productBrand}</span>} {productName}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.successTitle}</h3>
              <p className="text-slate-500">{t.successMessage}</p>
              <button 
                onClick={handleClose}
                className="mt-6 px-6 py-3 bg-vs text-white rounded-xl font-bold hover:bg-vs/90 transition-colors"
              >
                {t.closeButton}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name & Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {t.nameLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t.namePlaceholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {t.emailLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t.emailPlaceholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Phone & Company row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {t.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={t.phonePlaceholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {t.companyLabel}
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder={t.companyPlaceholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs transition-colors"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {t.quantityLabel}
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder={t.quantityPlaceholder}
                  min="1"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs transition-colors"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {t.messageLabel} <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t.messagePlaceholder}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-vs transition-colors resize-none"
                  required
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm font-bold">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-vs text-white rounded-xl font-black uppercase tracking-wider hover:bg-vs/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
