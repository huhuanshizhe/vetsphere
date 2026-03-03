'use client';

/**
 * 中国站医生工作台 - 设置页
 * 
 * 统一账号中心，包含以下分区：
 * 1. 个人资料 (profile)
 * 2. 账号与安全 (account)
 * 3. 通知提醒 (notifications)
 * 4. 工作偏好 (preferences)
 * 
 * 预留扩展：
 * 5. 执业与认证 (certification) - 预留
 * 6. 隐私与授权 (privacy) - 预留
 */

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User, Shield, Bell, Settings, CheckCircle2, 
  Camera, Mail, Phone, Building2, Stethoscope,
  Lock, Smartphone, Eye, EyeOff,
  MessageCircle, GraduationCap, Users, Briefcase, TrendingUp,
  LayoutDashboard, Save, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

// ============================================================================
// 类型定义
// ============================================================================

type SettingsTab = 'profile' | 'account' | 'notifications' | 'preferences';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

// ============================================================================
// 常量配置
// ============================================================================

const TABS: TabConfig[] = [
  { id: 'profile', label: '个人资料', icon: <User className="w-5 h-5" /> },
  { id: 'account', label: '账号与安全', icon: <Shield className="w-5 h-5" /> },
  { id: 'notifications', label: '通知提醒', icon: <Bell className="w-5 h-5" /> },
  { id: 'preferences', label: '工作偏好', icon: <Settings className="w-5 h-5" /> },
];

const SPECIALTIES = [
  '骨科', '软组织外科', '神经外科', '眼科', '心脏科', 
  '皮肤科', '肿瘤科', '急诊科', '影像诊断', '麻醉科', '综合内科'
];

const DEFAULT_PAGES = [
  { value: 'dashboard', label: '工作台首页' },
  { value: 'clients', label: '客户管理' },
  { value: 'records', label: '电子病历' },
  { value: 'courses', label: '我的课程' },
  { value: 'consultations', label: '在线问诊' },
];

// ============================================================================
// 子组件：个人资料
// ============================================================================

const ProfileSettingsPanel: React.FC<{
  user: any;
  onSave: (data: any) => void;
}> = ({ user, onSave }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    city: '',
    clinic: '',
    specialty: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 800));
    onSave(formData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 头像 */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-700 font-bold text-2xl">
            {(formData.name || 'D').charAt(0).toUpperCase()}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-amber-600 transition-colors border border-slate-200">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">{formData.name || '医生'}</p>
          <p className="text-sm text-slate-400">点击更换头像</p>
        </div>
      </div>

      {/* 表单 */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* 姓名 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            <User className="w-4 h-4 inline mr-1.5 text-slate-400" />
            姓名
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="请输入您的姓名"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        {/* 邮箱 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            <Mail className="w-4 h-4 inline mr-1.5 text-slate-400" />
            邮箱
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="请输入邮箱地址"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        {/* 手机号 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            <Phone className="w-4 h-4 inline mr-1.5 text-slate-400" />
            手机号
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="请输入手机号"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        {/* 所在城市 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            所在城市
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="请输入所在城市"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        {/* 所在机构 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            <Building2 className="w-4 h-4 inline mr-1.5 text-slate-400" />
            所在机构/诊所
          </label>
          <input
            type="text"
            value={formData.clinic}
            onChange={(e) => handleChange('clinic', e.target.value)}
            placeholder="请输入工作单位"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        {/* 专科方向 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            <Stethoscope className="w-4 h-4 inline mr-1.5 text-slate-400" />
            擅长方向
          </label>
          <select
            value={formData.specialty}
            onChange={(e) => handleChange('specialty', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white"
          >
            <option value="">请选择专科方向</option>
            {SPECIALTIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 个人简介 */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">个人简介</label>
        <textarea
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="请介绍您的专业背景、从业经验..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
        />
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              保存修改
            </>
          )}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            已保存
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 子组件：账号与安全
// ============================================================================

const AccountSecurityPanel: React.FC<{
  user: any;
}> = ({ user }) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    newPassword: '',
    confirm: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handlePasswordSave = async () => {
    if (passwordForm.newPassword !== passwordForm.confirm) {
      alert('两次输入的密码不一致');
      return;
    }
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
    setSaved(true);
    setPasswordForm({ current: '', newPassword: '', confirm: '' });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* 修改密码 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-400" />
          修改密码
        </h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">当前密码</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.current}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                placeholder="请输入当前密码"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">新密码</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="请输入新密码（至少8位）"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">确认新密码</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
              placeholder="请再次输入新密码"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handlePasswordSave}
              disabled={saving || !passwordForm.current || !passwordForm.newPassword}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '更新密码'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                密码已更新
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 绑定信息 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-slate-400" />
          绑定信息
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">邮箱</p>
                <p className="text-xs text-slate-400">{user?.email || '未绑定'}</p>
              </div>
            </div>
            <button className="text-sm text-amber-600 font-medium hover:text-amber-700">
              {user?.email ? '更换' : '绑定'}
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">手机号</p>
                <p className="text-xs text-slate-400">未绑定</p>
              </div>
            </div>
            <button className="text-sm text-amber-600 font-medium hover:text-amber-700">
              绑定
            </button>
          </div>
        </div>
      </div>

      {/* 安全提示 */}
      <div className="bg-blue-50 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-900">安全提示</p>
          <p className="text-sm text-blue-700 mt-1">
            建议定期更换密码，并绑定手机号以提升账号安全性。如遇账号异常，请及时联系客服。
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 子组件：通知提醒
// ============================================================================

const NotificationSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState({
    consultation: true,
    records: true,
    followUp: true,
    courseStart: true,
    community: false,
    career: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const notificationItems = [
    { key: 'consultation' as const, label: '问诊提醒', desc: '有新问诊请求或消息时通知', icon: <MessageCircle className="w-5 h-5" /> },
    { key: 'records' as const, label: '病历待处理提醒', desc: '病历需要补充或审核时通知', icon: <Settings className="w-5 h-5" /> },
    { key: 'followUp' as const, label: '随访提醒', desc: '客户随访计划到期时通知', icon: <Bell className="w-5 h-5" /> },
    { key: 'courseStart' as const, label: '课程开课提醒', desc: '已报名课程即将开课时通知', icon: <GraduationCap className="w-5 h-5" /> },
    { key: 'community' as const, label: '社区互动提醒', desc: '有人回复或点赞您的帖子时通知', icon: <Users className="w-5 h-5" /> },
    { key: 'career' as const, label: '职业机会提醒', desc: '有匹配的职业机会时通知', icon: <Briefcase className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {notificationItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting(item.key)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                settings[item.key] ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings[item.key] ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>
        ))}
      </div>

      {/* 通知方式 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">通知方式</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
            <span className="text-sm text-slate-700">站内通知</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer opacity-50">
            <input type="checkbox" disabled className="w-5 h-5 rounded border-slate-300" />
            <span className="text-sm text-slate-500">邮件通知（即将支持）</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer opacity-50">
            <input type="checkbox" disabled className="w-5 h-5 rounded border-slate-300" />
            <span className="text-sm text-slate-500">短信通知（即将支持）</span>
          </label>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            已保存
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 子组件：工作偏好
// ============================================================================

const PreferenceSettingsPanel: React.FC = () => {
  const [preferences, setPreferences] = useState({
    defaultPage: 'dashboard',
    showQuickActions: true,
    compactMode: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 默认进入页 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-slate-400" />
          默认进入页
        </h3>
        <p className="text-sm text-slate-400 mb-4">登录后默认显示的工作台页面</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {DEFAULT_PAGES.map((page) => (
            <button
              key={page.value}
              onClick={() => setPreferences(prev => ({ ...prev, defaultPage: page.value }))}
              className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                preferences.defaultPage === page.value
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {page.label}
            </button>
          ))}
        </div>
      </div>

      {/* 显示偏好 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-400" />
          显示偏好
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">首页显示快速入口</p>
              <p className="text-xs text-slate-400 mt-0.5">在工作台首页显示快速操作按钮</p>
            </div>
            <button
              onClick={() => setPreferences(prev => ({ ...prev, showQuickActions: !prev.showQuickActions }))}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                preferences.showQuickActions ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                preferences.showQuickActions ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">紧凑模式</p>
              <p className="text-xs text-slate-400 mt-0.5">减少页面间距，显示更多内容</p>
            </div>
            <button
              onClick={() => setPreferences(prev => ({ ...prev, compactMode: !prev.compactMode }))}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                preferences.compactMode ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                preferences.compactMode ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            已保存
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 主组件
// ============================================================================

export function DoctorSettingsPage({ locale }: { locale: string }) {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 从 URL 参数获取当前 tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  
  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // 切换 tab 时更新 URL
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    router.push(`/${locale}/doctor/settings?tab=${tab}`, { scroll: false });
  };

  // 保存用户资料
  const handleProfileSave = (data: any) => {
    if (updateUser) {
      updateUser({ name: data.name, email: data.email });
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">账号设置</h1>
        <p className="text-sm text-slate-500 mt-1">管理您的个人资料、账号安全和工作偏好</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧导航 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-1 sticky top-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-50 text-amber-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-amber-500' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            {/* Tab 标题 */}
            <h2 className="text-lg font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            
            {/* Tab 内容 */}
            {activeTab === 'profile' && (
              <ProfileSettingsPanel user={user} onSave={handleProfileSave} />
            )}
            {activeTab === 'account' && (
              <AccountSecurityPanel user={user} />
            )}
            {activeTab === 'notifications' && (
              <NotificationSettingsPanel />
            )}
            {activeTab === 'preferences' && (
              <PreferenceSettingsPanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorSettingsPage;
