'use client';

import { useState } from 'react';
import { apiFetch, getErrorMessage } from '@/lib/api-client';

interface ChatLeadFormProps {
  sessionId: string;
  onSubmit: (data: LeadFormData) => Promise<void>;
  submitted?: boolean;
}

interface LeadFormData {
  name: string;
  email: string;
  phone?: string;
  clinic?: string;
  country?: string;
  budget?: string;
  message?: string;
}

export default function ChatLeadForm({ sessionId, onSubmit, submitted }: ChatLeadFormProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    phone: '',
    clinic: '',
    country: '',
    budget: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submitted) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch('/api/ai/sales-chat/lead', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          ...formData,
        }),
      });

      await onSubmit(formData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="mx-4 my-2 p-4 bg-green-50 rounded-xl border border-green-200">
        <div className="flex items-center gap-2 text-green-700 mb-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold">Thank you!</span>
        </div>
        <p className="text-sm text-green-600">
          We&apos;ve received your information. Our team will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-4 my-2 p-4 bg-blue-50 rounded-xl border border-blue-200">
      <div className="flex items-center gap-2 text-blue-700 mb-3">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="font-semibold">Get a Personalized Quote</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Fill in your details and our team will prepare a customized procurement plan for you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name - Required */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your name"
          />
        </div>

        {/* Email - Required */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your@email.com"
          />
        </div>

        {/* Phone - Optional */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* Clinic/Hospital - Optional */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Clinic/Hospital</label>
          <input
            type="text"
            value={formData.clinic}
            onChange={(e) => handleChange('clinic', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your clinic or hospital name"
          />
        </div>

        {/* Country - Optional */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => handleChange('country', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your country"
          />
        </div>

        {/* Budget Range - Optional */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Budget Range</label>
          <select
            value={formData.budget}
            onChange={(e) => handleChange('budget', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select budget range</option>
            <option value="under-5k">Under $5,000</option>
            <option value="5k-15k">$5,000 - $15,000</option>
            <option value="15k-50k">$15,000 - $50,000</option>
            <option value="50k-100k">$50,000 - $100,000</option>
            <option value="over-100k">Over $100,000</option>
          </select>
        </div>

        {/* Additional Message - Optional */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Additional Requirements
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => handleChange('message', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Any specific requirements or questions..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                     text-white font-semibold rounded-lg transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit & Get Quote'}
        </button>
      </form>
    </div>
  );
}
