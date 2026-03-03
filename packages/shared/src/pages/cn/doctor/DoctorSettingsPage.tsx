'use client';

import React from 'react';
import { Settings, User, Bell, Shield, Lock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';

export function DoctorSettingsPage({ locale }: { locale: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const dw = (t as any).doctorWorkspace as Record<string, string> || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{dw.settingsTitle || '账户设置'}</h1>
        <p className="text-sm text-slate-500 mt-1">{dw.settingsSubtitle || '管理您的个人信息和偏好'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings menu */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
          {[
            { label: dw.settingsProfile || '个人资料', icon: <User className="w-5 h-5" />, active: true },
            { label: dw.settingsNotification || '通知设置', icon: <Bell className="w-5 h-5" />, active: false },
            { label: dw.settingsSecurity || '安全设置', icon: <Shield className="w-5 h-5" />, active: false },
            { label: dw.settingsPrivacy || '隐私设置', icon: <Lock className="w-5 h-5" />, active: false },
          ].map((item) => (
            <button key={item.label} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${item.active ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span className={item.active ? 'text-amber-500' : 'text-slate-400'}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Profile form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">{dw.settingsProfile || '个人资料'}</h2>
          <div className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                {(user?.name || 'D').charAt(0).toUpperCase()}
              </div>
              <button className="text-sm text-amber-600 font-medium hover:text-amber-700">更换头像</button>
            </div>
            {/* Fields */}
            {[
              { label: '姓名', value: user?.name || '', placeholder: '请输入姓名' },
              { label: '邮箱', value: user?.email || '', placeholder: '请输入邮箱' },
              { label: '手机号', value: '', placeholder: '请输入手机号' },
              { label: '医院/诊所', value: '', placeholder: '请输入工作单位' },
              { label: '专科方向', value: '', placeholder: '请选择专科方向' },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{field.label}</label>
                <input type="text" defaultValue={field.value} placeholder={field.placeholder} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">个人简介</label>
              <textarea rows={3} placeholder="请介绍您的专业背景..." className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none" />
            </div>
            <button className="bg-amber-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
              保存修改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorSettingsPage;
