'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface AddressFormProps {
  initialData?: {
    id?: string;
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    country?: string;
    state?: string;
    city?: string;
    address_line1?: string;
    address_line2?: string;
    postal_code?: string;
    tax_id?: string;
    is_default?: boolean;
  };
  onSave: (data: AddressFormData) => Promise<void>;
  onCancel: () => void;
  locale?: string;
}

export interface AddressFormData {
  id?: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  country: string;
  state?: string;
  city: string;
  address_line1: string;
  address_line2?: string;
  postal_code?: string;
  tax_id?: string;
  is_default: boolean;
}

// 常用国家列表
const COUNTRIES = [
  { code: 'US', name: 'United States', nameZh: '美国' },
  { code: 'CN', name: 'China', nameZh: '中国' },
  { code: 'JP', name: 'Japan', nameZh: '日本' },
  { code: 'TH', name: 'Thailand', nameZh: '泰国' },
  { code: 'SG', name: 'Singapore', nameZh: '新加坡' },
  { code: 'KR', name: 'South Korea', nameZh: '韩国' },
  { code: 'GB', name: 'United Kingdom', nameZh: '英国' },
  { code: 'DE', name: 'Germany', nameZh: '德国' },
  { code: 'FR', name: 'France', nameZh: '法国' },
  { code: 'AU', name: 'Australia', nameZh: '澳大利亚' },
  { code: 'CA', name: 'Canada', nameZh: '加拿大' },
  { code: 'MY', name: 'Malaysia', nameZh: '马来西亚' },
  { code: 'VN', name: 'Vietnam', nameZh: '越南' },
  { code: 'ID', name: 'Indonesia', nameZh: '印度尼西亚' },
  { code: 'PH', name: 'Philippines', nameZh: '菲律宾' },
];

export default function AddressForm({ 
  initialData, 
  onSave, 
  onCancel,
  locale = 'en' 
}: AddressFormProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    id: initialData?.id,
    name: initialData?.name || '',
    company: initialData?.company || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    country: initialData?.country || '',
    state: initialData?.state || '',
    city: initialData?.city || '',
    address_line1: initialData?.address_line1 || '',
    address_line2: initialData?.address_line2 || '',
    postal_code: initialData?.postal_code || '',
    tax_id: initialData?.tax_id || '',
    is_default: initialData?.is_default || false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const t = {
    name: locale === 'zh' ? '收件人姓名' : 'Full Name',
    company: locale === 'zh' ? '公司名称 (可选)' : 'Company (Optional)',
    email: locale === 'zh' ? '邮箱' : 'Email',
    phone: locale === 'zh' ? '电话' : 'Phone',
    country: locale === 'zh' ? '国家/地区' : 'Country/Region',
    state: locale === 'zh' ? '省/州' : 'State/Province',
    city: locale === 'zh' ? '城市' : 'City',
    addressLine1: locale === 'zh' ? '详细地址' : 'Address Line 1',
    addressLine2: locale === 'zh' ? '地址行2 (可选)' : 'Address Line 2 (Optional)',
    postalCode: locale === 'zh' ? '邮政编码' : 'Postal Code',
    taxId: locale === 'zh' ? '税号/VAT号 (可选)' : 'Tax ID / VAT Number (Optional)',
    setDefault: locale === 'zh' ? '设为默认地址' : 'Set as default address',
    save: locale === 'zh' ? '保存地址' : 'Save Address',
    cancel: locale === 'zh' ? '取消' : 'Cancel',
    required: locale === 'zh' ? '此字段为必填项' : 'This field is required',
  };

  const handleChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = t.required;
    if (!formData.email.trim()) newErrors.email = t.required;
    if (!formData.phone.trim()) newErrors.phone = t.required;
    if (!formData.country) newErrors.country = t.required;
    if (!formData.city.trim()) newErrors.city = t.required;
    if (!formData.address_line1.trim()) newErrors.address_line1 = t.required;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 姓名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.name} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t.name}
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* 公司名称 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.company}
        </label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => handleChange('company', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder={t.company}
        />
      </div>

      {/* 邮箱和电话 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.email} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t.email}
          />
          {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.phone} <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t.phone}
          />
          {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
        </div>
      </div>

      {/* 国家 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.country} <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.country}
          onChange={(e) => handleChange('country', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            errors.country ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">{t.country}</option>
          {COUNTRIES.map(country => (
            <option key={country.code} value={country.code}>
              {locale === 'zh' ? country.nameZh : country.name}
            </option>
          ))}
        </select>
        {errors.country && <p className="text-sm text-red-500 mt-1">{errors.country}</p>}
      </div>

      {/* 省/州和城市 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.state}
          </label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder={t.state}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.city} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              errors.city ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t.city}
          />
          {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
        </div>
      </div>

      {/* 详细地址 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.addressLine1} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.address_line1}
          onChange={(e) => handleChange('address_line1', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            errors.address_line1 ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t.addressLine1}
        />
        {errors.address_line1 && <p className="text-sm text-red-500 mt-1">{errors.address_line1}</p>}
      </div>

      {/* 地址行2 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.addressLine2}
        </label>
        <input
          type="text"
          value={formData.address_line2}
          onChange={(e) => handleChange('address_line2', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder={t.addressLine2}
        />
      </div>

      {/* 邮编和税号 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.postalCode}
          </label>
          <input
            type="text"
            value={formData.postal_code}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder={t.postalCode}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.taxId}
          </label>
          <input
            type="text"
            value={formData.tax_id}
            onChange={(e) => handleChange('tax_id', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder={t.taxId}
          />
        </div>
      </div>

      {/* 设为默认 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => handleChange('is_default', e.target.checked)}
          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
        />
        <label htmlFor="is_default" className="text-sm text-gray-700">
          {t.setDefault}
        </label>
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? (locale === 'zh' ? '保存中...' : 'Saving...') : t.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}