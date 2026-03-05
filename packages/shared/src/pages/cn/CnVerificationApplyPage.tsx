'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  FileText, Upload, Check, ArrowRight, ArrowLeft, AlertCircle,
  Sparkles, User, Building2, Briefcase, X, Image, File
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../services/supabase';

interface VerificationDocument {
  id?: string;
  documentType: string;
  documentUrl: string;
  fileName?: string;
}

interface VerificationData {
  id?: string;
  status: string;
  verificationType: string;
  realName: string;
  organizationName: string;
  positionTitle: string;
  specialtyTags: string[];
  typeSpecificFields: Record<string, any>;
  agreeVerificationStatement: boolean;
  documents: VerificationDocument[];
  rejectReason?: string;
}

// Document type options based on verification type (only 3 doctor identities)
const DOCUMENT_TYPES: Record<string, string[]> = {
  veterinarian: ['执业兽医师资格证', '身份证', '工作证明', '其他证明'],
  assistant_doctor: ['执业助理兽医师资格证', '身份证', '工作证明', '其他证明'],
  rural_veterinarian: ['乡村兽医登记证', '身份证', '工作证明', '其他证明'],
};

// Specialty tags options
const SPECIALTY_TAGS = [
  '小动物内科', '小动物外科', '皮肤病', '眼科', '牙科', '骨科',
  '心脏病', '肿瘤', '急诊重症', '影像诊断', '麻醉', '中兽医',
  '异宠', '猫科', '行为学', '营养学',
];

const CnVerificationApplyPage: React.FC = () => {
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [identityType, setIdentityType] = useState<string>('');
  
  const [formData, setFormData] = useState<VerificationData>({
    status: 'draft',
    verificationType: '',
    realName: '',
    organizationName: '',
    positionTitle: '',
    specialtyTags: [],
    typeSpecificFields: {},
    agreeVerificationStatement: false,
    documents: [],
  });

  // Fetch existing verification and identity
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        const token = session.access_token;

        // Get identity type
        const identityRes = await fetch('/api/user/identity', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!identityRes.ok) {
          // API error - redirect to identity selection
          router.push(`/${locale}/onboarding/identity?from=verification`);
          return;
        }
        
        const identityData = await identityRes.json();
        
        // Check if user has selected an identity
        if (!identityData.hasIdentity || !identityData.identity) {
          // No identity selected - user needs to select one first for verification
          router.push(`/${locale}/onboarding/identity?from=verification`);
          return;
        }
        
        setIdentityType(identityData.identity.identityType);
        
        if (!identityData.identity.verificationRequired) {
          // This identity doesn't require verification - show message instead of silent redirect
          setError('您选择的身份类型不需要进行专业认证。如需更改身份，请前往设置页面。');
          setIsLoading(false);
          return;
        }
        
        // Get existing verification
        const verRes = await fetch('/api/user/verification', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (verRes.ok) {
          const verData = await verRes.json();
          if (verData.hasVerification && verData.verification) {
            const ver = verData.verification;
            // Can only edit draft or rejected
            if (!['draft', 'rejected'].includes(ver.status)) {
              router.push(`/${locale}/verification/status`);
              return;
            }
            
            setFormData({
              id: ver.id,
              status: ver.status,
              verificationType: ver.verificationType || identityData.identityType,
              realName: ver.realName || '',
              organizationName: ver.organizationName || '',
              positionTitle: ver.positionTitle || '',
              specialtyTags: ver.specialtyTags || [],
              typeSpecificFields: ver.typeSpecificFields || {},
              agreeVerificationStatement: ver.agreeVerificationStatement || false,
              documents: (ver.documents || []).map((d: any) => ({
                id: d.id,
                documentType: d.docTypeDesc || d.docType || '',
                documentUrl: d.fileUrl || '',
                fileName: d.fileName,
              })),
              rejectReason: ver.rejectReason,
            });
          } else {
            // No verification yet, set type from identity
            setFormData(prev => ({
              ...prev,
              verificationType: identityData.identityType,
            }));
          }
        }
        
        // Pre-fill from profile
        const profileRes = await fetch('/api/user/profile', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setFormData(prev => ({
            ...prev,
            realName: prev.realName || profileData.realName || '',
            organizationName: prev.organizationName || profileData.organizationName || '',
            positionTitle: prev.positionTitle || profileData.jobTitle || '',
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

  // Toggle specialty tag
  const toggleSpecialtyTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      specialtyTags: prev.specialtyTags.includes(tag)
        ? prev.specialtyTags.filter(t => t !== tag)
        : [...prev.specialtyTags, tag].slice(0, 3),
    }));
  };

  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pendingDocType = React.useRef<string>('');

  // Handle file upload for a document type
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const docType = pendingDocType.current;
    if (!docType) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('不支持的文件格式，请上传 JPG、PNG、WebP 或 PDF 文件');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过 5MB');
      return;
    }

    setError('');
    setUploadingType(docType);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('请先登录');
        setUploadingType(null);
        return;
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'license');

      const res = await fetch('/api/upload/credential', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: uploadFormData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '上传失败，请重试');
        setUploadingType(null);
        return;
      }

      addDocument(docType, data.url, file.name);
    } catch {
      setError('上传失败，请检查网络连接');
    } finally {
      setUploadingType(null);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Trigger file input for a specific document type
  const triggerUpload = (docType: string) => {
    pendingDocType.current = docType;
    fileInputRef.current?.click();
  };

  // Add document to form data
  const addDocument = (type: string, url: string, fileName?: string) => {
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, { documentType: type, documentUrl: url, fileName }],
    }));
  };

  // Remove document
  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  // Save as draft
  const handleSaveDraft = async () => {
    setError('');
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('请先登录');
        setIsSaving(false);
        return;
      }

      const res = await fetch('/api/user/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          verificationType: formData.verificationType,
          realName: formData.realName,
          organizationName: formData.organizationName,
          positionTitle: formData.positionTitle,
          specialtyTags: formData.specialtyTags,
          typeSpecificFields: formData.typeSpecificFields,
          agreeVerificationStatement: formData.agreeVerificationStatement,
          documents: formData.documents,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || '保存失败');
        setIsSaving(false);
        return;
      }
      
      // Update form data with returned ID
      setFormData(prev => ({ ...prev, id: data.id, status: 'draft' }));
      setIsSaving(false);
    } catch {
      setError('网络错误，请检查您的网络连接');
      setIsSaving(false);
    }
  };

  // Submit for review
  const handleSubmit = async () => {
    // Validation
    if (!formData.realName.trim()) {
      setError('请输入真实姓名');
      return;
    }
    if (!formData.organizationName.trim()) {
      setError('请输入所在单位');
      return;
    }
    if (!formData.positionTitle.trim()) {
      setError('请输入职位/角色');
      return;
    }
    if (formData.documents.length === 0) {
      setError('请至少上传一个证明材料');
      return;
    }
    if (!formData.agreeVerificationStatement) {
      setError('请确认信息真实性');
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
      const token = session.access_token;

      // First save the draft
      const saveRes = await fetch('/api/user/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          verificationType: formData.verificationType,
          realName: formData.realName,
          organizationName: formData.organizationName,
          positionTitle: formData.positionTitle,
          specialtyTags: formData.specialtyTags,
          typeSpecificFields: formData.typeSpecificFields,
          agreeVerificationStatement: formData.agreeVerificationStatement,
          documents: formData.documents,
        }),
      });
      
      if (!saveRes.ok) {
        const saveData = await saveRes.json();
        setError(saveData.error || '保存失败');
        setIsSubmitting(false);
        return;
      }
      
      // Then submit
      const submitRes = await fetch('/api/user/verification/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      const submitData = await submitRes.json();
      
      if (!submitRes.ok) {
        setError(submitData.error || '提交失败');
        setIsSubmitting(false);
        return;
      }
      
      // Navigate to status page
      router.push(`/${locale}/verification/status`);
    } catch {
      setError('网络错误，请检查您的网络连接');
      setIsSubmitting(false);
    }
  };

  // Get document types for current verification type
  const documentTypes = DOCUMENT_TYPES[formData.verificationType] || DOCUMENT_TYPES.veterinarian;

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
            <span>医生身份认证</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">
            提交认证申请
          </h1>
          <p className="text-lg text-slate-600">
            提交您的资质证明，审核通过后可进入医生工作台
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回</span>
        </button>

        {/* Rejection Notice */}
        {formData.status === 'rejected' && formData.rejectReason && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-800 mb-1">上次申请未通过</h4>
                <p className="text-sm text-red-700">{formData.rejectReason}</p>
                <p className="text-sm text-red-600 mt-2">请修改后重新提交</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Info Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              基本信息
            </h3>
            
            {/* Real Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                真实姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.realName}
                onChange={(e) => setFormData(prev => ({ ...prev, realName: e.target.value }))}
                placeholder="请输入您的真实姓名"
                maxLength={20}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                所在单位 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                  placeholder="请输入工作单位/就读学校"
                  maxLength={50}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                职位/角色 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.positionTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, positionTitle: e.target.value }))}
                  placeholder="如：主治医师、护士长、在读研究生"
                  maxLength={30}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Specialty Tags Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              专业方向 <span className="text-sm font-normal text-slate-400">（选填，最多3个）</span>
            </h3>
            <div className="flex flex-wrap gap-2 mt-4">
              {SPECIALTY_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSpecialtyTag(tag)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.specialtyTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Documents Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              证明材料 <span className="text-red-500">*</span>
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              请上传相关资质证明（如执业证书、学生证、工作证明等）
            </p>

            {/* Existing Documents */}
            {formData.documents.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.documents.map((doc, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    {doc.documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <Image className="w-5 h-5 text-blue-500" />
                    ) : (
                      <File className="w-5 h-5 text-slate-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {doc.fileName || doc.documentType}
                      </p>
                      <p className="text-xs text-slate-400">{doc.documentType}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Document */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {documentTypes.map(type => {
                  const alreadyUploaded = formData.documents.some(d => d.documentType === type);
                  const isUploading = uploadingType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        if (alreadyUploaded) {
                          // Remove existing and re-upload
                          const idx = formData.documents.findIndex(d => d.documentType === type);
                          if (idx >= 0) removeDocument(idx);
                        }
                        triggerUpload(type);
                      }}
                      className={`p-3 border-2 border-dashed rounded-xl text-sm font-medium transition-all ${
                        alreadyUploaded
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                      } ${isUploading ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      {isUploading ? (
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                      ) : alreadyUploaded ? (
                        <Check className="w-4 h-4 mx-auto mb-1" />
                      ) : (
                        <Upload className="w-4 h-4 mx-auto mb-1" />
                      )}
                      {type}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 text-center">
                支持JPG、PNG、WebP、PDF格式，单个文件不超过5MB
              </p>
            </div>
          </div>

          {/* Agreement Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agreeVerificationStatement}
                onChange={(e) => setFormData(prev => ({ ...prev, agreeVerificationStatement: e.target.checked }))}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-600">
                我确认提交的所有信息真实有效，如有虚假将承担相应责任，并同意平台对我的资质进行审核。
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存草稿'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>提交中...</span>
              ) : (
                <>
                  <span>提交审核</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Skip Option */}
          {fromOnboarding && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push(`/${locale}`)}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                暂不认证，稍后再说
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default CnVerificationApplyPage;
