'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, X, Package, DollarSign, Target, Briefcase,
  CheckCircle2, Loader2, ArrowRight, Info, Building2,
  ShoppingCart, ChevronRight, Stethoscope, GraduationCap, Wrench,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ───
interface ShopProfile {
  scenario: string;
  specialty: string;
  budget: string;
  priority: string[];
}

interface ProductRecommendation {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  reason: string;
  matchScore: number;
  tags: string[];
  purchaseMode: 'direct' | 'inquiry' | 'consultation';
}

interface BudgetPlan {
  name: string;
  description: string;
  products: ProductRecommendation[];
  totalBudget: string;
  savings: string;
}

interface AIShopAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

// ─── Profile Options ───
const SCENARIO_OPTIONS = [
  { value: 'daily', label: '日常消耗补货', icon: <Package className="w-4 h-4" /> },
  { value: 'starter', label: '新手工具配置', icon: <Stethoscope className="w-4 h-4" /> },
  { value: 'specialty', label: '专科设备升级', icon: <Target className="w-4 h-4" /> },
  { value: 'startup', label: '新诊所开业', icon: <Building2 className="w-4 h-4" /> },
  { value: 'course', label: '课程配套采购', icon: <GraduationCap className="w-4 h-4" /> },
];

const SPECIALTY_OPTIONS = [
  { value: 'general', label: '全科/综合门诊' },
  { value: 'surgery', label: '外科方向' },
  { value: 'orthopedics', label: '骨科专科' },
  { value: 'imaging', label: '影像诊断' },
  { value: 'eye', label: '眼科方向' },
];

const BUDGET_OPTIONS = [
  { value: 'low', label: '1000元以内' },
  { value: 'mid', label: '1000-5000元' },
  { value: 'high', label: '5000-20000元' },
  { value: 'premium', label: '20000元以上' },
];

const PRIORITY_OPTIONS = [
  { value: 'cost', label: '性价比优先' },
  { value: 'quality', label: '品质优先' },
  { value: 'brand', label: '品牌优先' },
  { value: 'complete', label: '配套完整' },
];

// ─── Mock Product Data ───
const MOCK_PRODUCTS: ProductRecommendation[] = [
  {
    id: 'p1',
    name: 'TPLO 锯片套装',
    brand: 'SYNTHES',
    price: 3200,
    category: '骨科器械',
    reason: '骨科专科必备，课程同款工具',
    matchScore: 95,
    tags: ['课程同款', '高频使用', '进口品质'],
    purchaseMode: 'direct',
  },
  {
    id: 'p2',
    name: '小动物骨板固定系统',
    brand: 'VetFix',
    price: 8500,
    category: '植入物',
    reason: '满足多种骨折固定需求，性价比高',
    matchScore: 88,
    tags: ['国产优质', '配套齐全', '售后保障'],
    purchaseMode: 'inquiry',
  },
  {
    id: 'p3',
    name: '便携式超声诊断仪',
    brand: 'SonoVet',
    price: 28000,
    category: '诊断设备',
    reason: '门诊必备，快速腹部检查',
    matchScore: 82,
    tags: ['便携设计', '清晰成像', '培训支持'],
    purchaseMode: 'consultation',
  },
  {
    id: 'p4',
    name: '电动骨钻套装',
    brand: 'VetPower',
    price: 12000,
    category: '电动工具',
    reason: '骨科手术必备电动工具',
    matchScore: 85,
    tags: ['大品牌', '耐用可靠', '配件齐全'],
    purchaseMode: 'inquiry',
  },
  {
    id: 'p5',
    name: '外科基础器械包',
    brand: 'VetSurg',
    price: 2800,
    category: '手术器械',
    reason: '软组织手术基础配置',
    matchScore: 78,
    tags: ['入门首选', '性价比高', '常用配置'],
    purchaseMode: 'direct',
  },
  {
    id: 'p6',
    name: '一次性手术缝合线套装',
    brand: 'Ethicon',
    price: 450,
    category: '耗材',
    reason: '日常手术消耗品，高频补货',
    matchScore: 72,
    tags: ['消耗品', '高频使用', '进口品质'],
    purchaseMode: 'direct',
  },
];

// ─── Simulate AI Recommendation ───
function simulateRecommendation(profile: ShopProfile): {
  products: ProductRecommendation[];
  plans: BudgetPlan[];
  summary: string;
} {
  let products = [...MOCK_PRODUCTS];
  
  // Adjust scores based on profile
  products = products.map(product => {
    let score = product.matchScore;
    
    // Scenario matching
    if (profile.scenario === 'daily' && product.tags.includes('消耗品')) score += 15;
    if (profile.scenario === 'specialty' && product.category.includes('骨科')) score += 10;
    if (profile.scenario === 'course' && product.tags.includes('课程同款')) score += 20;
    if (profile.scenario === 'startup' && product.tags.includes('入门首选')) score += 15;
    
    // Specialty matching
    if (profile.specialty === 'orthopedics' && product.category.includes('骨科')) score += 15;
    if (profile.specialty === 'surgery' && product.category.includes('手术')) score += 10;
    if (profile.specialty === 'imaging' && product.category.includes('诊断')) score += 15;
    
    // Budget matching
    if (profile.budget === 'low' && product.price > 3000) score -= 20;
    if (profile.budget === 'mid' && product.price > 10000) score -= 15;
    if (profile.budget === 'high' && product.price < 1000) score -= 10;
    
    // Priority matching
    if (profile.priority.includes('cost') && product.tags.includes('性价比高')) score += 10;
    if (profile.priority.includes('quality') && product.tags.includes('进口品质')) score += 10;
    if (profile.priority.includes('brand') && product.tags.includes('大品牌')) score += 10;
    
    return { ...product, matchScore: Math.min(100, Math.max(0, score)) };
  });
  
  // Sort by score
  products = products.sort((a, b) => b.matchScore - a.matchScore);
  
  // Generate budget plans
  const plans: BudgetPlan[] = [];
  
  if (profile.scenario === 'starter' || profile.scenario === 'startup') {
    const basicProducts = products.filter(p => p.price < 5000).slice(0, 3);
    if (basicProducts.length > 0) {
      const total = basicProducts.reduce((sum, p) => sum + p.price, 0);
      plans.push({
        name: '基础配置方案',
        description: '满足日常诊疗需求的基础工具组合',
        products: basicProducts,
        totalBudget: `¥${total.toLocaleString()}`,
        savings: '套购优惠约¥500',
      });
    }
  }
  
  if (profile.scenario === 'specialty' || profile.specialty === 'orthopedics') {
    const specialtyProducts = products.filter(p => 
      p.category.includes('骨科') || p.category.includes('植入物')
    ).slice(0, 3);
    if (specialtyProducts.length > 0) {
      const total = specialtyProducts.reduce((sum, p) => sum + p.price, 0);
      plans.push({
        name: '骨科专科方案',
        description: '骨科手术必备器械组合',
        products: specialtyProducts,
        totalBudget: `¥${total.toLocaleString()}`,
        savings: '专业配套价，询价可享优惠',
      });
    }
  }
  
  // Generate summary
  let summary = '';
  if (profile.scenario === 'daily') {
    summary = '根据您的日常消耗需求，推荐以下高频补货商品。建议批量采购以获得更好价格。';
  } else if (profile.scenario === 'startup') {
    summary = '为新诊所配置推荐基础工具组合，覆盖日常诊疗需求，性价比优先。';
  } else if (profile.scenario === 'specialty') {
    summary = '根据您的专科发展方向，推荐专业级设备与器械，提升诊疗能力。';
  } else if (profile.scenario === 'course') {
    summary = '推荐课程同款器械，与培训内容配套，学以致用更高效。';
  } else {
    summary = '综合您的需求和预算，为您智能匹配以下产品方案。';
  }
  
  if (profile.priority.includes('cost')) {
    summary += ' 已优先考虑性价比因素。';
  }
  
  return { products: products.slice(0, 5), plans, summary };
}

// ─── Main Component ───
export function AIShopAdvisor({ isOpen, onClose, locale }: AIShopAdvisorProps) {
  const [step, setStep] = useState<'input' | 'processing' | 'result'>('input');
  const [profile, setProfile] = useState<ShopProfile>({
    scenario: '',
    specialty: '',
    budget: '',
    priority: [],
  });
  const [recommendations, setRecommendations] = useState<{
    products: ProductRecommendation[];
    plans: BudgetPlan[];
    summary: string;
  } | null>(null);

  const handlePriorityToggle = (priority: string) => {
    setProfile(prev => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter(p => p !== priority)
        : [...prev.priority, priority],
    }));
  };

  const handleSubmit = async () => {
    setStep('processing');
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = simulateRecommendation(profile);
    setRecommendations(result);
    setStep('result');
  };

  const handleReset = () => {
    setStep('input');
    setProfile({ scenario: '', specialty: '', budget: '', priority: [] });
    setRecommendations(null);
  };

  const isInputComplete = profile.scenario && profile.specialty;

  const purchaseModeLabel = (mode: 'direct' | 'inquiry' | 'consultation') => {
    if (mode === 'direct') return '直接下单';
    if (mode === 'inquiry') return '询价采购';
    return '方案咨询';
  };

  const purchaseModeClass = (mode: 'direct' | 'inquiry' | 'consultation') => {
    if (mode === 'direct') return 'bg-emerald-50 text-emerald-600';
    if (mode === 'inquiry') return 'bg-purple-50 text-purple-600';
    return 'bg-amber-50 text-amber-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI 采购顾问</h2>
              <p className="text-[11px] text-slate-500">智能推荐适合您的采购方案</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Input Step */}
          {step === 'input' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50/70 rounded-lg border border-amber-100">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">
                  告诉我您的采购需求，AI 将为您推荐最适合的产品组合
                </p>
              </div>

              {/* Scenario */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  采购场景
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SCENARIO_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setProfile(p => ({ ...p, scenario: opt.value }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        profile.scenario === opt.value
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialty */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <Target className="w-4 h-4 text-slate-500" />
                  专业方向
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SPECIALTY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setProfile(p => ({ ...p, specialty: opt.value }))}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        profile.specialty === opt.value
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                  预算范围 (可选)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BUDGET_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setProfile(p => ({ ...p, budget: opt.value }))}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        profile.budget === opt.value
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <Wrench className="w-4 h-4 text-slate-500" />
                  优先考虑 (可多选)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handlePriorityToggle(opt.value)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                        profile.priority.includes(opt.value)
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {profile.priority.includes(opt.value) && (
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                      )}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
              <p className="text-base font-medium text-slate-700 mb-2">AI 正在分析...</p>
              <p className="text-sm text-slate-500">根据您的需求匹配最佳采购方案</p>
            </div>
          )}

          {/* Result Step */}
          {step === 'result' && recommendations && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-1">AI 分析结果</p>
                    <p className="text-sm text-slate-600">{recommendations.summary}</p>
                  </div>
                </div>
              </div>

              {/* Budget Plans */}
              {recommendations.plans.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-500" />
                    推荐方案
                  </h3>
                  <div className="space-y-3">
                    {recommendations.plans.map((plan, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-slate-800">{plan.name}</h4>
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            {plan.savings}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{plan.description}</p>
                        <div className="space-y-2">
                          {plan.products.map((product, pidx) => (
                            <div key={pidx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                              <span className="text-xs font-medium text-slate-700">{product.name}</span>
                              <span className="text-xs text-slate-500">¥{product.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <span className="text-xs text-slate-500">方案总价</span>
                          <span className="text-sm font-bold text-slate-800">{plan.totalBudget}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Recommendations */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-500" />
                  产品推荐
                </h3>
                <div className="space-y-3">
                  {recommendations.products.map((product, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-200 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-slate-800">{product.name}</h4>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              product.matchScore >= 90
                                ? 'bg-emerald-100 text-emerald-700'
                                : product.matchScore >= 75
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              匹配度 {product.matchScore}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {product.brand}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                              {product.category}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${purchaseModeClass(product.purchaseMode)}`}>
                              {purchaseModeLabel(product.purchaseMode)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-slate-900">
                            {product.purchaseMode === 'direct' 
                              ? `¥${product.price.toLocaleString()}`
                              : '询价'}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-600 mb-3">{product.reason}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {product.tags.slice(0, 3).map((tag, tidx) => (
                            <span key={tidx} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Link
                          href={`/${locale}/shop/${product.id}`}
                          onClick={onClose}
                          className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
                        >
                          查看详情
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              AI 推荐仅供参考，具体采购请咨询顾问
            </p>
            <div className="flex items-center gap-2">
              {step === 'result' && (
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  重新选择
                </button>
              )}
              {step === 'input' && (
                <button
                  onClick={handleSubmit}
                  disabled={!isInputComplete}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed rounded-lg transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  获取推荐
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIShopAdvisor;
