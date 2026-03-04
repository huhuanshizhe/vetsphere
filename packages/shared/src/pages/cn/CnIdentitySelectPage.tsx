'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stethoscope, GraduationCap, Users, Briefcase, Heart, User,
  ArrowRight, Check, Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Identity types as defined in the system
const IDENTITY_TYPES = [
  {
    id: 'veterinarian',
    label: '执业兽医师',
    description: '持有执业兽医师资格证书',
    icon: Stethoscope,
    group: 'professional',
    requiresVerification: true,
    color: 'blue',
  },
  {
    id: 'assistant_doctor',
    label: '助理兽医师',
    description: '持有执业助理兽医师证书',
    icon: Stethoscope,
    group: 'professional',
    requiresVerification: true,
    color: 'blue',
  },
  {
    id: 'nurse_care',
    label: '护理/美容师',
    description: '宠物护理或美容专业人员',
    icon: Heart,
    group: 'professional',
    requiresVerification: true,
    color: 'pink',
  },
  {
    id: 'student',
    label: '在校学生',
    description: '兽医或动物医学相关专业在读学生',
    icon: GraduationCap,
    group: 'student',
    requiresVerification: true,
    color: 'green',
  },
  {
    id: 'researcher_teacher',
    label: '科研/教育工作者',
    description: '从事兽医或动物医学科研教育工作',
    icon: GraduationCap,
    group: 'professional',
    requiresVerification: true,
    color: 'purple',
  },
  {
    id: 'pet_service_staff',
    label: '宠物服务从业者',
    description: '宠物店、宠物医院非医疗岗位等',
    icon: Briefcase,
    group: 'industry_related',
    requiresVerification: false,
    color: 'orange',
  },
  {
    id: 'industry_practitioner',
    label: '行业从业者',
    description: '兽药、器械、饲料等相关行业',
    icon: Briefcase,
    group: 'industry_related',
    requiresVerification: false,
    color: 'orange',
  },
  {
    id: 'enthusiast',
    label: '宠物爱好者',
    description: '关注宠物健康的普通用户',
    icon: Heart,
    group: 'general',
    requiresVerification: false,
    color: 'red',
  },
  {
    id: 'other',
    label: '其他',
    description: '其他身份或暂不选择',
    icon: User,
    group: 'general',
    requiresVerification: false,
    color: 'slate',
  },
];

const colorStyles: Record<string, { bg: string; border: string; icon: string; selected: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', selected: 'ring-blue-500 border-blue-500' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600', selected: 'ring-pink-500 border-pink-500' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', selected: 'ring-green-500 border-green-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', selected: 'ring-purple-500 border-purple-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', selected: 'ring-orange-500 border-orange-500' },
  red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', selected: 'ring-red-500 border-red-500' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', selected: 'ring-slate-500 border-slate-500' },
};

const CnIdentitySelectPage: React.FC = () => {
  const { locale } = useLanguage();
  const router = useRouter();
  
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null);

  // Fetch current identity on mount
  useEffect(() => {
    const fetchCurrentIdentity = async () => {
      try {
        const res = await fetch('/api/user/identity', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.identityType) {
            setCurrentIdentity(data.identityType);
            setSelectedIdentity(data.identityType);
          }
        }
      } catch {
        // Ignore errors - user may not have identity yet
      }
    };
    
    fetchCurrentIdentity();
  }, []);

  const handleSubmit = async () => {
    if (!selectedIdentity) {
      setError('请选择您的身份');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/user/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identityType: selectedIdentity }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || '保存失败，请重试');
        setIsSubmitting(false);
        return;
      }
      
      // Navigate to profile completion page
      router.push(`/${locale}/onboarding/profile`);
    } catch {
      setError('网络错误，请检查您的网络连接');
      setIsSubmitting(false);
    }
  };

  const selectedIdentityData = IDENTITY_TYPES.find(i => i.id === selectedIdentity);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-4">
            <Sparkles className="w-4 h-4" />
            <span>步骤 1/2</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">
            选择您的身份
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto">
            告诉我们您的职业身份，我们将为您提供更精准的内容和服务
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center max-w-md mx-auto">
            {error}
          </div>
        )}

        {/* Identity Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {IDENTITY_TYPES.map((identity) => {
            const Icon = identity.icon;
            const styles = colorStyles[identity.color];
            const isSelected = selectedIdentity === identity.id;
            
            return (
              <button
                key={identity.id}
                onClick={() => setSelectedIdentity(identity.id)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                  isSelected 
                    ? `${styles.selected} ring-2 bg-white shadow-lg` 
                    : `border-slate-200 bg-white hover:border-slate-300 hover:shadow-md`
                }`}
              >
                {/* Selected Check */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                
                {/* Icon */}
                <div className={`w-12 h-12 ${styles.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${styles.icon}`} />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {identity.label}
                </h3>
                <p className="text-sm text-slate-500 mb-3">
                  {identity.description}
                </p>
                
                {/* Verification Badge */}
                {identity.requiresVerification && (
                  <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    需认证
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Identity Info */}
        {selectedIdentityData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 ${colorStyles[selectedIdentityData.color].bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <selectedIdentityData.icon className={`w-7 h-7 ${colorStyles[selectedIdentityData.color].icon}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  您选择了：{selectedIdentityData.label}
                </h3>
                <p className="text-slate-600 mb-4">
                  {selectedIdentityData.description}
                </p>
                {selectedIdentityData.requiresVerification ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>提示：</strong>该身份需要提交专业认证资料进行审核。完成资料填写后，您可以选择是否提交认证申请。
                      认证通过后可解锁更多专业功能和内容。
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>提示：</strong>该身份无需认证，完成资料填写后即可正常使用平台功能。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedIdentity || isSubmitting}
            className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>保存中...</span>
            ) : (
              <>
                <span>下一步：完善资料</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Skip Option */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(`/${locale}`)}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            稍后再说，先逛逛
          </button>
        </div>
      </div>
    </main>
  );
};

export default CnIdentitySelectPage;
