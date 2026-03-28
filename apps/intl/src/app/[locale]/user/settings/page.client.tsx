'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, User, Bell, Globe, Shield, Trash2, ChevronRight, Loader2, Check } from 'lucide-react';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';

export default function SettingsClient() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { t, locale, setLanguage } = useLanguage();
  const uc = t.userCenter;
  const s = t.settings;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    hospital: '',
    specialty: '',
    email_notifications: true,
    language: 'en',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth?redirect=/${locale}/user/settings`);
      return;
    }
    if (user) {
      setFormData({
        full_name: user.name || '',
        phone: user.mobile || '',
        hospital: '',
        specialty: '',
        email_notifications: true,
        language: locale,
      });
    }
    setLoading(false);
  }, [isAuthenticated, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update language preference
      if (formData.language !== locale) {
        setLanguage(formData.language as any);
      }

      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(s.deleteConfirm)) return;
    // Account deletion logic would go here
    await logout();
    router.push(`/${locale}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const settingsSections = [
    {
      icon: User,
      title: s.profile,
      description: s.profileDesc,
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{s.fullName}</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{uc.phone}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{uc.hospital}</label>
            <input
              type="text"
              value={formData.hospital}
              onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      ),
    },
    {
      icon: Bell,
      title: s.notifications,
      description: s.notificationsDesc,
      content: (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">{uc.emailNotifications}</p>
            <p className="text-sm text-slate-500">{uc.enableNotif}</p>
          </div>
          <button
            onClick={() => setFormData({ ...formData, email_notifications: !formData.email_notifications })}
            className={`w-12 h-6 rounded-full transition-colors ${
              formData.email_notifications ? 'bg-emerald-600' : 'bg-slate-200'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                formData.email_notifications ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      ),
    },
    {
      icon: Globe,
      title: uc.languagePreference,
      description: s.languageDesc,
      content: (
        <div className="grid grid-cols-3 gap-3">
          {[
            { code: 'en', label: 'English' },
            { code: 'ja', label: '日本語' },
            { code: 'th', label: 'ไทย' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => setFormData({ ...formData, language: lang.code })}
              className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                formData.language === lang.code
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                  : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: Shield,
      title: s.security,
      description: s.securityDesc,
      content: (
        <div className="space-y-4">
          <div>
            <p className="font-medium text-slate-900">{s.password}</p>
            <p className="text-sm text-slate-500 mb-2">{s.passwordDesc}</p>
            <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
              {s.changePassword}
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href={`/${locale}`} className="hover:text-slate-700 transition-colors">{t.nav.home}</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/${locale}/user`} className="hover:text-slate-700 transition-colors">{uc.userCenter}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-medium">{s.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{s.title}</h1>
          <p className="text-slate-500 mt-1">{s.subtitle}</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map((section, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{section.title}</h2>
                  <p className="text-sm text-slate-500">{section.description}</p>
                </div>
              </div>
              <div className="mt-4">{section.content}</div>
            </div>
          ))}

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-red-600">{uc.dangerZone}</h2>
                <p className="text-sm text-slate-500">{uc.deleteWarning}</p>
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors"
            >
              {uc.deleteAccount}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <Check className="w-5 h-5" />
            ) : null}
            {saved ? s.saved : uc.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}