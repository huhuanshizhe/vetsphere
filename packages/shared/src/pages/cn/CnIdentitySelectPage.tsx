'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Stethoscope, GraduationCap, Users, Heart,
  ArrowRight, Check, Sparkles, ChevronDown
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../services/supabase';

// V2 四大粗分类
const IDENTITY_GROUPS_V2 = [
  {
    id: 'doctor',
    label: '执业兽医',
    description: '持有执业兽医相关证书的专业人员',
    icon: Stethoscope,
    color: 'blue',
    hasSubtypes: true,
    subtypes: [
      { id: 'veterinarian', label: '执业兽医师', description: '持有执业兽医师资格证书' },
      { id: 'assistant_doctor', label: '助理兽医师', description: '持有执业助理兽医师证书' },
      { id: 'rural_veterinarian', label: '乡村兽医', description: '持有乡村兽医登记证' },
    ],
  },
  {
    id: 'vet_related_staff',
    label: '兽医相关从业人员',
    description: '宠物医院护理、美容、服务等从业人员',
    icon: Heart,
    color: 'pink',
    hasSubtypes: false,
  },
  {
    id: 'student_academic',
    label: '兽医相关专业学生/教研人员',
    description: '动物医学专业在读学生或科研教育工作者',
    icon: GraduationCap,
    color: 'green',
    hasSubtypes: false,
  },
  {
    id: 'other_related',
    label: '其他相关人员',
    description: '兽药、器械、饲料行业从业者或宠物爱好者',
    icon: Users,
    color: 'slate',
    hasSubtypes: false,
  },
];

const colorStyles: Record<string, { bg: string; border: string; icon: string; selected: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', selected: 'ring-blue-500 border-blue-500' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600', selected: 'ring-pink-500 border-pink-500' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', selected: 'ring-green-500 border-green-500' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', selected: 'ring-slate-500 border-slate-500' },
};

const CnIdentitySelectPage: React.FC = () => {
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromVerification = searchParams.get('from') === 'verification';
  
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch current identity on mount
  useEffect(() => {
    const fetchCurrentIdentity = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch('/api/user/identity', {
          method: 'GET',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.hasIdentity && data.identity?.identityGroupV2) {
            setSelectedGroup(data.identity.identityGroupV2);
            if (data.identity.doctorSubtype) {
              setSelectedSubtype(data.identity.doctorSubtype);
              setExpandedGroup('doctor');
            }
          }
        }
      } catch {
        // Ignore errors
      }
    };
    
    fetchCurrentIdentity();
  }, []);

  const handleGroupSelect = (groupId: string) => {
    const group = IDENTITY_GROUPS_V2.find(g => g.id === groupId);
    if (group?.hasSubtypes) {
      // 展开子类型选择
      setExpandedGroup(expandedGroup === groupId ? null : groupId);
      if (selectedGroup !== groupId) {
        setSelectedGroup(groupId);
        setSelectedSubtype(null);
      }
    } else {
      // 直接选中
      setSelectedGroup(groupId);
      setSelectedSubtype(null);
      setExpandedGroup(null);
    }
  };

  const handleSubtypeSelect = (subtypeId: string) => {
    setSelectedSubtype(subtypeId);
  };

  const handleSubmit = async () => {
    if (!selectedGroup) {
      setError('请选择您的身份');
      return;
    }
    
    if (selectedGroup === 'doctor' && !selectedSubtype) {
      setError('请选择医生类型');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('请先登录');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/user/identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          identityGroupV2: selectedGroup,
          doctorSubtype: selectedSubtype,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || '保存失败，请重试');
        setIsSubmitting(false);
        return;
      }
      
      // Navigate based on context
      if (fromVerification) {
        if (selectedGroup === 'doctor') {
          router.push(`/${locale}/verification/apply`);
        } else {
          router.push(`/${locale}`);
        }
      } else {
        // 普通流程：非医生直接去首页，医生可选择去认证或首页
        if (selectedGroup === 'doctor') {
          router.push(`/${locale}/verification/apply`);
        } else {
          router.push(`/${locale}`);
        }
      }
    } catch {
      setError('网络错误，请检查您的网络连接');
      setIsSubmitting(false);
    }
  };

  const selectedGroupData = IDENTITY_GROUPS_V2.find(g => g.id === selectedGroup);
  const isComplete = selectedGroup && (selectedGroup !== 'doctor' || selectedSubtype);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-4">
            <Sparkles className="w-4 h-4" />
            <span>{fromVerification ? '医生身份认证' : '选择身份'}</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">
            选择您的身份
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto">
            {fromVerification 
              ? '请选择您的职业身份，选择"执业兽医"后可提交医生认证申请' 
              : '告诉我们您的职业身份，我们将为您提供更精准的内容和服务'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center max-w-md mx-auto">
            {error}
          </div>
        )}

        {/* Identity Groups */}
        <div className="space-y-4 mb-8">
          {IDENTITY_GROUPS_V2.map((group) => {
            const Icon = group.icon;
            const styles = colorStyles[group.color];
            const isSelected = selectedGroup === group.id;
            const isExpanded = expandedGroup === group.id;
            
            return (
              <div key={group.id} className="space-y-2">
                {/* Main Group Button */}
                <button
                  onClick={() => handleGroupSelect(group.id)}
                  className={`w-full relative p-5 rounded-2xl border-2 text-left transition-all ${
                    isSelected 
                      ? `${styles.selected} ring-2 bg-white shadow-lg` 
                      : `border-slate-200 bg-white hover:border-slate-300 hover:shadow-md`
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`w-14 h-14 ${styles.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-7 h-7 ${styles.icon}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {group.label}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {group.description}
                      </p>
                    </div>
                    
                    {/* Selection indicator or expand arrow */}
                    {group.hasSubtypes ? (
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    ) : isSelected ? (
                      <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : null}
                  </div>
                </button>

                {/* Subtypes (for doctor) */}
                {group.hasSubtypes && isExpanded && (
                  <div className="ml-8 pl-4 border-l-2 border-blue-200 space-y-2">
                    {group.subtypes?.map(subtype => (
                      <button
                        key={subtype.id}
                        onClick={() => handleSubtypeSelect(subtype.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selectedSubtype === subtype.id
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900">{subtype.label}</h4>
                            <p className="text-sm text-slate-500">{subtype.description}</p>
                          </div>
                          {selectedSubtype === subtype.id && (
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Info */}
        {isComplete && selectedGroupData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 ${colorStyles[selectedGroupData.color].bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <selectedGroupData.icon className={`w-6 h-6 ${colorStyles[selectedGroupData.color].icon}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  您选择了：{selectedGroup === 'doctor' 
                    ? selectedGroupData.subtypes?.find(s => s.id === selectedSubtype)?.label 
                    : selectedGroupData.label}
                </h3>
                {selectedGroup === 'doctor' ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>提示：</strong>作为执业兽医，您需要完成身份认证才能访问医生工作台。
                      认证通过后可解锁临床工具、医生社区等专业功能。普通平台功能（课程、器械购买等）无需认证即可使用。
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>提示：</strong>该身份无需认证，您可以正常使用平台的课程学习、器械购买等全部功能。
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
            disabled={!isComplete || isSubmitting}
            className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>保存中...</span>
            ) : (
              <>
                <span>
                  {selectedGroup === 'doctor' 
                    ? '下一步：提交医生认证' 
                    : '确认身份，进入平台'}
                </span>
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
