'use client';

import React, { useState } from 'react';
import {
  Calculator, HeartPulse, FlaskConical, Siren, Search, Pill,
  FileText, Stethoscope, Weight, Droplets, Thermometer, Activity,
  ChevronRight, Star, Clock, BookOpen, ArrowRight, Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Tool Categories
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  popular: boolean;
  comingSoon?: boolean;
}

interface QuickReference {
  id: string;
  title: string;
  items: { label: string; dog: string; cat: string }[];
}

// Placeholder tools data
const TOOLS: Tool[] = [
  {
    id: 'drug-calculator',
    name: '药物剂量计算器',
    description: '根据体重计算常用药物的推荐剂量，支持犬猫等多种动物',
    icon: <Calculator className="w-6 h-6" />,
    category: 'calculator',
    popular: true
  },
  {
    id: 'fluid-calculator',
    name: '输液速率计算器',
    description: '计算输液滴速、维持量、脱水补液量等',
    icon: <Droplets className="w-6 h-6" />,
    category: 'calculator',
    popular: true
  },
  {
    id: 'bcs-calculator',
    name: '体况评分 (BCS) 工具',
    description: '犬猫体况评分标准参考与记录',
    icon: <Weight className="w-6 h-6" />,
    category: 'calculator',
    popular: false
  },
  {
    id: 'vital-signs',
    name: '生理指标速查',
    description: '犬猫正常心率、呼吸、体温、血压等生理参数参考',
    icon: <HeartPulse className="w-6 h-6" />,
    category: 'reference',
    popular: true
  },
  {
    id: 'lab-values',
    name: '检验参考值',
    description: '血液学、生化、尿液等检验项目正常参考范围',
    icon: <FlaskConical className="w-6 h-6" />,
    category: 'reference',
    popular: true
  },
  {
    id: 'emergency-protocols',
    name: '急救流程速查',
    description: '心肺复苏、休克、中毒等常见急救情况的处理流程',
    icon: <Siren className="w-6 h-6" />,
    category: 'reference',
    popular: true
  },
  {
    id: 'drug-guide',
    name: '常用药物指南',
    description: '临床常用药物的用法、剂量、禁忌与注意事项',
    icon: <Pill className="w-6 h-6" />,
    category: 'guide',
    popular: true
  },
  {
    id: 'diagnosis-helper',
    name: '症状-疾病关联查询',
    description: '根据临床症状查询可能的疾病鉴别诊断',
    icon: <Search className="w-6 h-6" />,
    category: 'guide',
    popular: false,
    comingSoon: true
  },
  {
    id: 'medical-record-template',
    name: '病历模板库',
    description: '常见病例的标准化病历模板，支持快速填写',
    icon: <FileText className="w-6 h-6" />,
    category: 'template',
    popular: false,
    comingSoon: true
  },
  {
    id: 'anesthesia-calculator',
    name: '麻醉用药计算器',
    description: '根据体重和麻醉方案计算术前、诱导、维持用药量',
    icon: <Stethoscope className="w-6 h-6" />,
    category: 'calculator',
    popular: false
  },
  {
    id: 'nutrition-calculator',
    name: '营养需求计算器',
    description: '计算每日能量需求 (DER/RER)、蛋白质需求等',
    icon: <Activity className="w-6 h-6" />,
    category: 'calculator',
    popular: false
  },
  {
    id: 'temperature-converter',
    name: '体温换算工具',
    description: '摄氏/华氏体温快速换算',
    icon: <Thermometer className="w-6 h-6" />,
    category: 'calculator',
    popular: false
  }
];

// Quick reference data
const VITAL_SIGNS_REFERENCE: QuickReference = {
  id: 'vital-signs',
  title: '正常生理指标速查',
  items: [
    { label: '心率 (次/分)', dog: '60-140', cat: '140-220' },
    { label: '呼吸频率 (次/分)', dog: '10-30', cat: '20-40' },
    { label: '体温 (°C)', dog: '37.5-39.2', cat: '38.0-39.2' },
    { label: '收缩压 (mmHg)', dog: '110-160', cat: '120-170' },
    { label: '毛细血管再充盈时间', dog: '<2秒', cat: '<2秒' }
  ]
};

// Category config
const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  calculator: { label: '计算工具', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  reference: { label: '参考速查', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  guide: { label: '临床指南', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  template: { label: '模板工具', color: 'text-amber-600', bgColor: 'bg-amber-100' }
};

export function ClinicalToolsPage({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tools
  const filteredTools = TOOLS.filter(tool => {
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    const matchesSearch = !searchQuery || 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const popularTools = TOOLS.filter(t => t.popular && !t.comingSoon);
  const categories = [
    { key: 'all', label: '全部工具' },
    { key: 'calculator', label: '计算工具' },
    { key: 'reference', label: '参考速查' },
    { key: 'guide', label: '临床指南' },
    { key: 'template', label: '模板工具' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-8 h-8 text-teal-200" />
              <span className="text-teal-200 font-medium">宠医界</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">临床工具</h1>
            <p className="text-lg text-teal-100 leading-relaxed mb-6">
              为宠物医生日常临床工作设计的实用工具集合。快速计算药物剂量、查询参考值、获取急救流程指导。
            </p>
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索工具名称或功能..."
                className="w-full pl-12 pr-4 py-3 rounded-xl text-slate-900 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Popular Tools */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">常用工具</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTools.slice(0, 6).map(tool => (
              <button
                key={tool.id}
                className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:shadow-lg hover:border-teal-300 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${CATEGORY_CONFIG[tool.category].bgColor} ${CATEGORY_CONFIG[tool.category].color}`}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">{tool.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{tool.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Reference Card */}
        <div className="mb-10 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <HeartPulse className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">{VITAL_SIGNS_REFERENCE.title}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-emerald-200">
                  <th className="text-left py-2 pr-4 font-semibold text-slate-700">指标</th>
                  <th className="text-center py-2 px-4 font-semibold text-slate-700">犬 (Dog)</th>
                  <th className="text-center py-2 pl-4 font-semibold text-slate-700">猫 (Cat)</th>
                </tr>
              </thead>
              <tbody>
                {VITAL_SIGNS_REFERENCE.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-emerald-100 last:border-0">
                    <td className="py-2.5 pr-4 text-slate-600">{item.label}</td>
                    <td className="py-2.5 px-4 text-center font-medium text-emerald-700">{item.dog}</td>
                    <td className="py-2.5 pl-4 text-center font-medium text-emerald-700">{item.cat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium hover:text-emerald-700">
              查看完整参考值 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.key
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* All Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map(tool => (
            <button
              key={tool.id}
              disabled={tool.comingSoon}
              className={`bg-white rounded-xl border p-5 text-left transition-all ${
                tool.comingSoon
                  ? 'border-slate-100 opacity-60 cursor-not-allowed'
                  : 'border-slate-200 hover:shadow-lg hover:border-teal-300 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${CATEGORY_CONFIG[tool.category].bgColor} ${CATEGORY_CONFIG[tool.category].color}`}>
                  {tool.icon}
                </div>
                {tool.comingSoon && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">即将上线</span>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{tool.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{tool.description}</p>
              <div className="mt-3">
                <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_CONFIG[tool.category].bgColor} ${CATEGORY_CONFIG[tool.category].color}`}>
                  {CATEGORY_CONFIG[tool.category].label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">没有找到匹配的工具</p>
          </div>
        )}

        {/* Learning Connection */}
        <div className="mt-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">工具背后的知识，值得系统学习</h3>
              </div>
              <p className="text-sm text-slate-600">
                临床工具帮助你快速完成计算，但真正的专业能力来自系统的学习与积累。
                探索宠医界的培训课程，从基础到专科，持续提升你的临床水平。
              </p>
            </div>
            <a
              href={`/${locale}/courses`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors shrink-0"
            >
              <BookOpen className="w-4 h-4" />
              探索培训课程
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            需要其他临床工具？
            <button className="text-teal-600 font-medium hover:text-teal-700 ml-1">
              告诉我们你的需求
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ClinicalToolsPage;
