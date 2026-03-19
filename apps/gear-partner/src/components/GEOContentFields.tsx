'use client';

import React, { useState } from 'react';
import { Sparkles, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  sortOrder?: number;
}

interface GEOContentFieldsProps {
  formData: {
    faq: FAQ[];
    metaTitle: string;
    metaDescription: string;
    focusKeyword: string;
  };
  setFormData: (data: any) => void;
  onGenerateAI?: () => Promise<FAQ[]>;
}

export default function GEOContentFields({ 
  formData, 
  setFormData,
  onGenerateAI 
}: GEOContentFieldsProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addFaq = () => {
    setFormData((prev: any) => ({
      ...prev,
      faq: [...(prev.faq || []), { question: '', answer: '' }],
    }));
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData((prev: any) => {
      const newFaq = [...(prev.faq || [])];
      newFaq[index] = { ...newFaq[index], [field]: value };
      return { ...prev, faq: newFaq };
    });
  };

  const removeFaq = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      faq: (prev.faq || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleGenerateAI = async () => {
    if (!onGenerateAI) return;
    setGenerating(true);
    try {
      const generatedFaqs = await onGenerateAI();
      if (generatedFaqs.length > 0) {
        setFormData((prev: any) => ({
          ...prev,
          faq: [...(prev.faq || []), ...generatedFaqs],
        }));
      }
    } catch (error) {
      console.error('Failed to generate FAQ:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">SEO 优化内容</h3>
        
        {/* 核心关键词 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            核心关键词 (Focus Keyword)
          </label>
          <input
            type="text"
            value={formData.focusKeyword}
            onChange={(e) => updateField('focusKeyword', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例如：兽用手术器械，宠物医疗耗材"
          />
          <p className="mt-1 text-xs text-gray-500">搜索引擎优化的核心关键词</p>
        </div>

        {/* Meta 标题 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta 标题 (Meta Title)
          </label>
          <input
            type="text"
            value={formData.metaTitle}
            onChange={(e) => updateField('metaTitle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="搜索引擎结果中显示的标题"
            maxLength={60}
          />
          <p className="mt-1 text-xs text-gray-500">
            建议长度：50-60 个字符，当前长度：{formData.metaTitle.length}
          </p>
        </div>

        {/* Meta 描述 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta 描述 (Meta Description)
          </label>
          <textarea
            value={formData.metaDescription}
            onChange={(e) => updateField('metaDescription', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="搜索引擎结果中显示的产品描述"
            rows={3}
            maxLength={160}
          />
          <p className="mt-1 text-xs text-gray-500">
            建议长度：150-160 个字符，当前长度：{formData.metaDescription.length}
          </p>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">FAQ 常见问题</h3>
          <div className="space-x-2">
            {onGenerateAI && (
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={generating}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                {generating ? '生成中...' : 'AI 生成'}
              </button>
            )}
            <button
              type="button"
              onClick={addFaq}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加问题
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          建议至少添加 3 个常见问题与回答，帮助客户更好地了解产品
        </p>

        <div className="space-y-3">
          {(formData.faq || []).map((faq: FAQ, index: number) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {expandedFaq === index ? (
                    <ChevronUp className="w-4 h-4 mr-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  )}
                  问题 {index + 1}
                </button>
                <button
                  type="button"
                  onClick={() => removeFaq(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              {expandedFaq === index && (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      问题
                    </label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => updateFaq(index, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="客户可能会问的问题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      回答
                    </label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="详细、专业的回答"
                      rows={4}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {(!formData.faq || formData.faq.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            暂无 FAQ，点击"添加问题"或"AI 生成"按钮添加
          </div>
        )}
      </div>
    </div>
  );
}
