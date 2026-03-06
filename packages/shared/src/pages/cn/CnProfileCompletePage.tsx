'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  User, Building2, Briefcase, Calendar, Tag, FileText,
  ArrowRight, ArrowLeft, Check, Sparkles, Camera, X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase, getSessionSafe } from '../../services/supabase';

// Interest tags options
const INTEREST_TAGS = [
  '小动物内科', '小动物外科', '皮肤病', '眼科', '牙科', '骨科',
  '心脏病', '肿瘤', '急诊重症', '影像诊断', '麻醉', '中兽医',
  '异宠', '猫科', '行为学', '营养学', '繁殖', '公共卫生',
  '宠物美容', '宠物护理', '医院管理', '创业经营',
];

// Profile data type
interface ProfileData {
  displayName: string;
  realName: string;
  avatarUrl: string;
  organizationName: string;
  jobTitle: string;
  experienceYears: number | null;
  interestTags: string[];
  bio: string;
  // Identity-specific fields
  studentSchool?: string;
  studentMajor?: string;
  studentGraduationYear?: number;
  researchField?: string;
  serviceType?: string;
}

interface IdentityInfo {
  identityType: string;
  identityGroup: string;
  verificationRequired: boolean;
}

const CnProfileCompletePage: React.FC = () => {
  const { locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [identityInfo, setIdentityInfo] = useState<IdentityInfo | null>(null);
  
  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    realName: '',
    avatarUrl: '',
    organizationName: '',
    jobTitle: '',
    experienceYears: null,
    interestTags: [],
    bio: '',
  });

  // Fetch current identity and profile on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await getSessionSafe();
        if (!session) {
          router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        const token = session.access_token;

        // Fetch identity first
        const identityRes = await fetch('/api/user/identity', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!identityRes.ok) {
          // No identity selected, redirect to identity selection
          router.push(`/${locale}/onboarding/identity`);
          return;
        }
        
        const identityData = await identityRes.json();
        setIdentityInfo({
          identityType: identityData.identityType,
          identityGroup: identityData.identityGroup,
          verificationRequired: identityData.verificationRequired,
        });
        
        // Fetch existing profile
        const profileRes = await fetch('/api/user/profile', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(prev => ({
            ...prev,
            displayName: profileData.displayName || '',
            realName: profileData.realName || '',
            avatarUrl: profileData.avatarUrl || '',
            organizationName: profileData.organizationName || '',
            jobTitle: profileData.jobTitle || '',
            experienceYears: profileData.experienceYears ?? null,
            interestTags: profileData.interestTags || [],
            bio: profileData.bio || '',
            studentSchool: profileData.studentSchool || '',
            studentMajor: profileData.studentMajor || '',
            studentGraduationYear: profileData.studentGraduationYear ?? null,
            researchField: profileData.researchField || '',
            serviceType: profileData.serviceType || '',
          }));
        }
      } catch {
        setError('加载数据失败，请刷新重试');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [locale, router]);

  // Check if organization is required based on identity
  const isOrganizationRequired = useMemo(() => {
    if (!identityInfo) return false;
    return ['professional', 'student'].includes(identityInfo.identityGroup);
  }, [identityInfo]);

  // Get identity-specific fields label
  const getIdentityLabel = () => {
    if (!identityInfo) return '';
    switch (identityInfo.identityType) {
      case 'veterinarian':
      case 'assistant_doctor':
        return '执业医院/诊所';
      case 'nurse_care':
        return '工作单位';
      case 'student':
        return '就读学校';
      case 'researcher_teacher':
        return '所在机构';
      case 'pet_service_staff':
      case 'industry_practitioner':
        return '所在公司';
      default:
        return '所在单位（选填）';
    }
  };

  // Handle tag selection
  const toggleTag = (tag: string) => {
    setProfile(prev => ({
      ...prev,
      interestTags: prev.interestTags.includes(tag)
        ? prev.interestTags.filter(t => t !== tag)
        : [...prev.interestTags, tag].slice(0, 5), // Max 5 tags
    }));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!profile.displayName.trim()) {
      setError('请输入昵称');
      return;
    }
    
    if (isOrganizationRequired && !profile.organizationName.trim()) {
      setError('请输入所在单位');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const { data: { session } } = await getSessionSafe();
      if (!session) {
        setError('请先登录');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          displayName: profile.displayName,
          realName: profile.realName || undefined,
          avatarUrl: profile.avatarUrl || undefined,
          organizationName: profile.organizationName || undefined,
          jobTitle: profile.jobTitle || undefined,
          experienceYears: profile.experienceYears ?? undefined,
          interestTags: profile.interestTags.length > 0 ? profile.interestTags : undefined,
          bio: profile.bio || undefined,
          // Identity-specific fields
          studentSchool: profile.studentSchool || undefined,
          studentMajor: profile.studentMajor || undefined,
          studentGraduationYear: profile.studentGraduationYear ?? undefined,
          researchField: profile.researchField || undefined,
          serviceType: profile.serviceType || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || '保存失败，请重试');
        setIsSubmitting(false);
        return;
      }
      
      // Check if verification is required
      if (identityInfo?.verificationRequired) {
        // Show verification prompt and navigate
        router.push(`/${locale}/verification/apply?from=onboarding`);
      } else {
        // No verification needed, go to home
        router.push(`/${locale}`);
      }
    } catch {
      setError('网络错误，请检查您的网络连接');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-4">
            <Sparkles className="w-4 h-4" />
            <span>步骤 2/2</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">
            完善个人资料
          </h1>
          <p className="text-lg text-slate-600">
            填写基本信息，让我们更好地为您服务
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push(`/${locale}/onboarding/identity`)}
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回修改身份</span>
        </button>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-slate-400" />
              头像
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="url"
                  value={profile.avatarUrl}
                  onChange={(e) => setProfile(prev => ({ ...prev, avatarUrl: e.target.value }))}
                  placeholder="输入头像URL（选填）"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">支持JPG、PNG格式的图片链接</p>
              </div>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              基本信息
            </h3>
            
            {/* Display Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                昵称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="您的显示昵称"
                maxLength={20}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Real Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                真实姓名 <span className="text-slate-400 font-normal">（选填，仅用于认证）</span>
              </label>
              <input
                type="text"
                value={profile.realName}
                onChange={(e) => setProfile(prev => ({ ...prev, realName: e.target.value }))}
                placeholder="您的真实姓名"
                maxLength={20}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Professional Info Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-400" />
              职业信息
            </h3>
            
            {/* Organization */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {getIdentityLabel()} {isOrganizationRequired && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={profile.organizationName}
                onChange={(e) => setProfile(prev => ({ ...prev, organizationName: e.target.value }))}
                placeholder={`请输入${getIdentityLabel().replace('（选填）', '')}`}
                maxLength={50}
                required={isOrganizationRequired}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                职位/角色 <span className="text-slate-400 font-normal">（选填）</span>
              </label>
              <input
                type="text"
                value={profile.jobTitle}
                onChange={(e) => setProfile(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="如：主治医师、护士长、在读研究生"
                maxLength={30}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Experience Years */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                从业年限 <span className="text-slate-400 font-normal">（选填）</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={profile.experienceYears ?? ''}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    experienceYears: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="0"
                  min={0}
                  max={50}
                  className="w-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-slate-500">年</span>
              </div>
            </div>

            {/* Student-specific fields */}
            {identityInfo?.identityType === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    专业 <span className="text-slate-400 font-normal">（选填）</span>
                  </label>
                  <input
                    type="text"
                    value={profile.studentMajor || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, studentMajor: e.target.value }))}
                    placeholder="如：动物医学、兽医学"
                    maxLength={30}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    预计毕业年份 <span className="text-slate-400 font-normal">（选填）</span>
                  </label>
                  <input
                    type="number"
                    value={profile.studentGraduationYear ?? ''}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      studentGraduationYear: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="2025"
                    min={2020}
                    max={2035}
                    className="w-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Researcher-specific fields */}
            {identityInfo?.identityType === 'researcher_teacher' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  研究方向 <span className="text-slate-400 font-normal">（选填）</span>
                </label>
                <input
                  type="text"
                  value={profile.researchField || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, researchField: e.target.value }))}
                  placeholder="如：小动物临床、兽医病理学"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Interest Tags Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Tag className="w-5 h-5 text-slate-400" />
              兴趣领域
              <span className="text-sm font-normal text-slate-400">（选择最多5个）</span>
            </h3>
            <div className="flex flex-wrap gap-2 mt-4">
              {INTEREST_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    profile.interestTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                  {profile.interestTags.includes(tag) && (
                    <X className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>
            {profile.interestTags.length > 0 && (
              <p className="text-sm text-slate-500 mt-3">
                已选择 {profile.interestTags.length}/5 个标签
              </p>
            )}
          </div>

          {/* Bio Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              个人简介
              <span className="text-sm font-normal text-slate-400">（选填）</span>
            </h3>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="简单介绍一下自己..."
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">
              {profile.bio.length}/200
            </p>
          </div>

          {/* Verification Notice */}
          {identityInfo?.verificationRequired && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <h4 className="font-bold text-amber-800 mb-2">下一步：专业认证</h4>
              <p className="text-sm text-amber-700">
                您选择的身份需要提交认证资料进行审核。完成资料保存后，您可以继续提交认证申请，
                认证通过后将解锁更多专业功能。
              </p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>保存中...</span>
              ) : (
                <>
                  <span>{identityInfo?.verificationRequired ? '保存并去认证' : '完成'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Skip Option */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push(`/${locale}`)}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              稍后再说，先逛逛
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default CnProfileCompletePage;
