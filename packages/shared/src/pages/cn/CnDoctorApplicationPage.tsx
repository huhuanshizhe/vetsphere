'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Check, Upload, X, User, Building2,
  Stethoscope, FileCheck, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { DoctorApplication, DoctorApplicationFormData } from '../../types';

// 步骤配置
const STEPS = [
  { id: 1, title: '账号', icon: User, description: '创建或登录账号' },
  { id: 2, title: '医生资料', icon: Stethoscope, description: '填写执业信息' },
  { id: 3, title: '资质上传', icon: FileCheck, description: '上传证明材料' },
  { id: 4, title: '确认提交', icon: Check, description: '确认并提交审核' },
];

// 职位选项
const POSITION_OPTIONS = [
  '执业兽医',
  '助理兽医',
  '诊所负责人',
  '实习/在培',
  '其他',
];

// 专科方向选项
const SPECIALTY_OPTIONS = [
  '全科',
  '外科',
  '内科',
  '影像/超声',
  '眼科',
  '口腔',
  '皮肤',
  '异宠',
  '其他',
];

const CnDoctorApplicationPage: React.FC = () => {
  const { locale } = useLanguage();
  const { user, isAuthenticated, loading: authLoading, applicationStatus, refreshApplicationStatus } = useAuth();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [existingApplication, setExistingApplication] = useState<DoctorApplication | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState<DoctorApplicationFormData>({
    fullName: '',
    phone: '',
    province: '',
    city: '',
    hospitalName: '',
    position: '',
    specialties: [],
    yearsOfExperience: undefined,
    nickname: '',
    email: '',
    bio: '',
    licenseImageUrl: '',
    supplementaryUrls: [],
    credentialNotes: '',
  });
  
  // 文件上传状态
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingSupplementary, setUploadingSupplementary] = useState(false);
  
  // 协议确认
  const [agreeTerms, setAgreeTerms] = useState(false);

  // 获取 access token
  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // 加载现有申请
  const loadExistingApplication = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      
      const response = await fetch('/api/doctor-application', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.application) {
          setExistingApplication(data.application);
          // 填充表单
          setFormData({
            fullName: data.application.fullName || '',
            phone: data.application.phone || '',
            province: data.application.province || '',
            city: data.application.city || '',
            hospitalName: data.application.hospitalName || '',
            position: data.application.position || '',
            specialties: data.application.specialties || [],
            yearsOfExperience: data.application.yearsOfExperience,
            nickname: data.application.nickname || '',
            email: data.application.email || '',
            bio: data.application.bio || '',
            licenseImageUrl: data.application.licenseImageUrl || '',
            supplementaryUrls: data.application.supplementaryUrls || [],
            credentialNotes: data.application.credentialNotes || '',
          });
          // 如果已有数据，跳到第2步
          if (data.application.fullName) {
            setCurrentStep(2);
          }
        }
      }
    } catch (err) {
      console.error('Load application error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // 初始化
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      // 未登录 - 重定向到登录页
      router.push(`/${locale}/auth?redirect=/${locale}/register/doctor`);
      return;
    }
    
    // 检查申请状态
    if (applicationStatus === 'pending_review' || applicationStatus === 'approved') {
      router.push(`/${locale}/register/status`);
      return;
    }
    
    // 已登录 - 跳过第1步，从第2步开始
    setCurrentStep(2);
    loadExistingApplication();
  }, [authLoading, isAuthenticated, applicationStatus, router, locale, loadExistingApplication]);

  // 保存草稿
  const saveDraft = async () => {
    if (!isAuthenticated) return;
    
    setIsSaving(true);
    setError('');
    
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('未授权');
      
      const method = existingApplication ? 'PUT' : 'POST';
      const response = await fetch('/api/doctor-application', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '保存失败');
      }
      
      setExistingApplication(data.application);
      setSuccessMessage('已自动保存');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 提交审核
  const submitApplication = async () => {
    if (!agreeTerms) {
      setError('请先确认信息无误并同意协议');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // 先保存最新数据
      await saveDraft();
      
      const token = await getAccessToken();
      if (!token) throw new Error('未授权');
      
      const response = await fetch('/api/doctor-application/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '提交失败');
      }
      
      // 刷新状态并跳转
      await refreshApplicationStatus();
      router.push(`/${locale}/register/status`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 上传文件
  const uploadFile = async (file: File, type: 'license' | 'supplementary'): Promise<string | null> => {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('未授权');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await fetch('/api/upload/credential', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '上传失败');
      }
      
      return data.url;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  // 处理执照上传
  const handleLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLicense(true);
    const url = await uploadFile(file, 'license');
    if (url) {
      setFormData(prev => ({ ...prev, licenseImageUrl: url }));
    }
    setUploadingLicense(false);
  };

  // 处理辅助材料上传
  const handleSupplementaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (formData.supplementaryUrls.length >= 3) {
      setError('最多上传3个辅助材料');
      return;
    }
    
    setUploadingSupplementary(true);
    const url = await uploadFile(file, 'supplementary');
    if (url) {
      setFormData(prev => ({
        ...prev,
        supplementaryUrls: [...prev.supplementaryUrls, url],
      }));
    }
    setUploadingSupplementary(false);
  };

  // 删除辅助材料
  const removeSupplementary = (index: number) => {
    setFormData(prev => ({
      ...prev,
      supplementaryUrls: prev.supplementaryUrls.filter((_, i) => i !== index),
    }));
  };

  // 切换专科
  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => {
      const has = prev.specialties.includes(specialty);
      return {
        ...prev,
        specialties: has
          ? prev.specialties.filter(s => s !== specialty)
          : [...prev.specialties, specialty],
      };
    });
  };

  // 下一步
  const nextStep = async () => {
    // 验证当前步骤
    if (currentStep === 2) {
      if (!formData.fullName || !formData.phone || !formData.city || 
          !formData.hospitalName || !formData.position || formData.specialties.length === 0) {
        setError('请填写所有必填项');
        return;
      }
    }
    
    if (currentStep === 3) {
      if (!formData.licenseImageUrl) {
        setError('请上传执业证明或资格证书');
        return;
      }
    }
    
    // 保存草稿
    await saveDraft();
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  // 上一步
  const prevStep = () => {
    if (currentStep > 2) { // 已登录用户最小是第2步
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.filter(s => s.id >= 2).map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const Icon = step.icon;
        
        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div className={`w-16 h-0.5 ${isCompleted ? 'bg-blue-500' : 'bg-slate-200'}`} />
            )}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isActive ? 'bg-blue-500 text-white' :
                isCompleted ? 'bg-blue-500 text-white' :
                'bg-slate-100 text-slate-400'
              }`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`mt-2 text-xs font-medium ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`}>
                {step.title}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  // 渲染第2步：医生资料
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 真实姓名 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            真实姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            placeholder="请输入真实姓名"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 手机号 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            手机号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="请输入手机号"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 省份 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">省份</label>
          <input
            type="text"
            value={formData.province}
            onChange={e => setFormData(prev => ({ ...prev, province: e.target.value }))}
            placeholder="请输入省份"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 城市 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            城市 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
            placeholder="请输入城市"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 所在机构 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            所在机构/诊所 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.hospitalName}
            onChange={e => setFormData(prev => ({ ...prev, hospitalName: e.target.value }))}
            placeholder="请输入机构名称"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 职位 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            职位/身份 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.position}
            onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择</option>
            {POSITION_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        
        {/* 执业年限 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">执业年限</label>
          <input
            type="number"
            value={formData.yearsOfExperience || ''}
            onChange={e => setFormData(prev => ({ 
              ...prev, 
              yearsOfExperience: e.target.value ? parseInt(e.target.value) : undefined 
            }))}
            placeholder="请输入年数"
            min="0"
            max="50"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 昵称 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">昵称</label>
          <input
            type="text"
            value={formData.nickname}
            onChange={e => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
            placeholder="用于社区显示"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 邮箱 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-2">邮箱</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="用于接收重要通知"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {/* 专科方向 */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-3">
          专科方向 <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(可多选)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTY_OPTIONS.map(specialty => {
            const isSelected = formData.specialties.includes(specialty);
            return (
              <button
                key={specialty}
                type="button"
                onClick={() => toggleSpecialty(specialty)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {specialty}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* 个人简介 */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">个人简介</label>
        <textarea
          value={formData.bio}
          onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
          placeholder="简单介绍您的从业经历和专长..."
          rows={4}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );

  // 渲染第3步：资质上传
  const renderStep3 = () => (
    <div className="space-y-6">
      {/* 主证明材料 */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-3">
          主证明材料 <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-slate-500 mb-4">
          请上传执业证明、资格证书或在职证明（支持 JPG、PNG、PDF，最大 10MB）
        </p>
        
        {formData.licenseImageUrl ? (
          <div className="relative inline-block">
            <img
              src={formData.licenseImageUrl}
              alt="证明材料"
              className="w-48 h-48 object-cover rounded-xl border border-slate-200"
            />
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, licenseImageUrl: '' }))}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
            {uploadingLicense ? (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">点击上传</span>
              </>
            )}
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleLicenseUpload}
              className="hidden"
              disabled={uploadingLicense}
            />
          </label>
        )}
      </div>
      
      {/* 辅助证明材料 */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-3">
          辅助证明材料 <span className="text-slate-400 font-normal">(选填，最多3个)</span>
        </label>
        <p className="text-sm text-slate-500 mb-4">
          可上传名片、工牌、学历证书等辅助材料
        </p>
        
        <div className="flex flex-wrap gap-4">
          {formData.supplementaryUrls.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt={`辅助材料 ${index + 1}`}
                className="w-32 h-32 object-cover rounded-xl border border-slate-200"
              />
              <button
                type="button"
                onClick={() => removeSupplementary(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {formData.supplementaryUrls.length < 3 && (
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
              {uploadingSupplementary ? (
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-500">添加</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleSupplementaryUpload}
                className="hidden"
                disabled={uploadingSupplementary}
              />
            </label>
          )}
        </div>
      </div>
      
      {/* 备注说明 */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">备注说明</label>
        <textarea
          value={formData.credentialNotes}
          onChange={e => setFormData(prev => ({ ...prev, credentialNotes: e.target.value }))}
          placeholder="如有特殊情况或需要补充说明，请在此填写..."
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );

  // 渲染第4步：确认提交
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="bg-slate-50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">信息确认</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">姓名：</span>
              <span className="text-slate-800 font-medium">{formData.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500">手机：</span>
              <span className="text-slate-800 font-medium">{formData.phone}</span>
            </div>
            <div>
              <span className="text-slate-500">城市：</span>
              <span className="text-slate-800 font-medium">{formData.province} {formData.city}</span>
            </div>
            <div>
              <span className="text-slate-500">机构：</span>
              <span className="text-slate-800 font-medium">{formData.hospitalName}</span>
            </div>
            <div>
              <span className="text-slate-500">职位：</span>
              <span className="text-slate-800 font-medium">{formData.position}</span>
            </div>
            <div>
              <span className="text-slate-500">年限：</span>
              <span className="text-slate-800 font-medium">
                {formData.yearsOfExperience ? `${formData.yearsOfExperience}年` : '未填写'}
              </span>
            </div>
          </div>
          
          <div className="text-sm">
            <span className="text-slate-500">专科方向：</span>
            <span className="text-slate-800 font-medium">{formData.specialties.join('、')}</span>
          </div>
          
          {formData.bio && (
            <div className="text-sm">
              <span className="text-slate-500">个人简介：</span>
              <p className="text-slate-800 mt-1">{formData.bio}</p>
            </div>
          )}
          
          <div className="pt-4 border-t border-slate-200">
            <span className="text-sm text-slate-500">已上传证明材料：</span>
            <div className="flex gap-2 mt-2">
              {formData.licenseImageUrl && (
                <img
                  src={formData.licenseImageUrl}
                  alt="主证明"
                  className="w-16 h-16 object-cover rounded-lg border"
                />
              )}
              {formData.supplementaryUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`辅助 ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* 协议确认 */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="agreeTerms"
          checked={agreeTerms}
          onChange={e => setAgreeTerms(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="agreeTerms" className="text-sm text-slate-600">
          我确认以上信息真实有效，并同意{' '}
          <Link href={`/${locale}/terms`} className="text-blue-600 hover:underline">用户协议</Link>
          {' '}和{' '}
          <Link href={`/${locale}/privacy`} className="text-blue-600 hover:underline">隐私政策</Link>
        </label>
      </div>
      
      {/* 提示 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">审核说明</p>
            <ul className="space-y-1 text-blue-700">
              <li>提交后资料将进入审核，通常 1-2 个工作日完成</li>
              <li>审核期间您可以浏览课程和社区内容</li>
              <li>审核通过后即可进入医生工作台</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // 加载中
  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 返回 */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回首页</span>
        </Link>
        
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-2">医生入驻申请</h1>
          <p className="text-slate-500">完成以下步骤，加入 VetSphere 医生社区</p>
        </div>
        
        {/* 步骤指示器 */}
        {renderStepIndicator()}
        
        {/* 表单卡片 */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          {/* 成功提示 */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl text-green-600 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </div>
          )}
          
          {/* 步骤内容 */}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          
          {/* 操作按钮 */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep <= 2}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                currentStep <= 2
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              上一步
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中
                  </>
                ) : (
                  <>
                    下一步
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={submitApplication}
                disabled={isSubmitting || !agreeTerms}
                className="flex items-center gap-2 px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    提交中
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    提交审核
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default CnDoctorApplicationPage;
