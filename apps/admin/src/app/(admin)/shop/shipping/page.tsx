'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin, Truck, ChevronDown, ChevronRight, Plus, Edit2, Trash2,
  X, Check, Globe, Clock, DollarSign, Package, AlertCircle, Loader2
} from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ============ 类型定义 ============
interface Zone {
  id: string;
  zone_code: string;
  zone_name: Record<string, string>;
  region: string;
  countries: string[];
  billing_type: string;
  base_fee: number;
  currency: string;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  is_active: boolean;
  display_order: number;
}

interface Method {
  id: string;
  method_code: string;
  method_name: Record<string, string>;
  method_description: Record<string, string>;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  is_active: boolean;
  display_order: number;
}

interface Rate {
  id: string;
  zone_id: string;
  method_id: string;
  price: number;
  billing_type: string;
  base_fee: number;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  is_active: boolean;
  zone?: Zone;
  method?: Method;
}

interface ShippingConfig {
  zones: Zone[];
  methods: Method[];
  rates: Rate[];
}

// ============ 常用国家列表 ============
const COMMON_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'RU', name: 'Russia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GR', name: 'Greece' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'IL', name: 'Israel' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'CN', name: 'China' },
];

// ============ 语言名称映射 ============
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  th: 'ไทย',
  ja: '日本語',
  zh: '中文'
};

// ============ 主组件 ============
export default function ShippingSettingsPage() {
  const [config, setConfig] = useState<ShippingConfig>({ zones: [], methods: [], rates: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [showEditRateModal, setShowEditRateModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [activeTab, setActiveTab] = useState<'zones' | 'methods'>('zones');

  // 获取配置数据
  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/shipping-config');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      setError('加载数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // 切换区域展开状态
  const toggleZone = (zoneId: string) => {
    setExpandedZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  // 获取区域的方法费率
  const getZoneRates = (zoneId: string) => {
    return config.rates.filter(r => r.zone_id === zoneId);
  };

  // 获取未添加到此区域的方法
  const getAvailableMethodsForZone = (zoneId: string) => {
    const existingMethodIds = config.rates
      .filter(r => r.zone_id === zoneId)
      .map(r => r.method_id);
    return config.methods.filter(m => !existingMethodIds.includes(m.id));
  };

  // ============ 保存操作 ============
  const handleSave = async (type: 'zone' | 'method' | 'rate', data: any, id?: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/shipping-config', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { type, id, data } : { type, data }),
      });
      if (!res.ok) throw new Error('Failed to save');
      await fetchConfig();
      closeAllModals();
    } catch (err) {
      alert('保存失败');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: 'zone' | 'method' | 'rate', id: string) => {
    if (!confirm('确定要删除吗？删除后将无法恢复。')) return;
    try {
      const res = await fetch(`/api/admin/shipping-config?type=${type}&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchConfig();
    } catch (err) {
      alert('删除失败');
      console.error(err);
    }
  };

  const closeAllModals = () => {
    setShowAddZoneModal(false);
    setShowAddMethodModal(false);
    setShowEditRateModal(false);
    setEditingZone(null);
    setEditingMethod(null);
    setEditingRate(null);
  };

  // 获取方法名称（多语言）
  const getMethodName = (method: Method, lang: string = 'en') => {
    return method.method_name?.[lang] || method.method_name?.en || method.method_code;
  };

  // 获取区域名称
  const getZoneName = (zone: Zone, lang: string = 'en') => {
    return zone.zone_name?.[lang] || zone.zone_name?.en || zone.zone_code;
  };

  // 获取方法估计天数
  const getEstimatedDays = (method: Method) => {
    if (!method.estimated_days_min && !method.estimated_days_max) return '-';
    if (method.estimated_days_min === method.estimated_days_max) return `${method.estimated_days_min} days`;
    return `${method.estimated_days_min}-${method.estimated_days_max} days`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="运费设置"
        subtitle="管理配送区域、运输方式和运费"
      />

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="ml-3 text-slate-500">加载中...</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* 主内容 */}
      {!loading && (
        <div className="space-y-6">
          {/* 顶部操作栏 */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('zones')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'zones'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                配送区域 ({config.zones.length})
              </button>
              <button
                onClick={() => setActiveTab('methods')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'methods'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Truck className="w-4 h-4 inline mr-2" />
                运输方式 ({config.methods.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'zones' && (
                <button
                  onClick={() => { setEditingZone(null); setShowAddZoneModal(true); }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加配送区域
                </button>
              )}
              {activeTab === 'methods' && (
                <button
                  onClick={() => { setEditingMethod(null); setShowAddMethodModal(true); }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加运输方式
                </button>
              )}
            </div>
          </div>

          {/* 配送区域列表 */}
          {activeTab === 'zones' && (
            <div className="space-y-4">
              {config.zones.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">暂无配送区域</p>
                  <button
                    onClick={() => { setEditingZone(null); setShowAddZoneModal(true); }}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    添加第一个配送区域
                  </button>
                </div>
              ) : (
                config.zones.map(zone => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    methods={config.methods}
                    rates={getZoneRates(zone.id)}
                    availableMethods={getAvailableMethodsForZone(zone.id)}
                    isExpanded={expandedZones.has(zone.id)}
                    onToggle={() => toggleZone(zone.id)}
                    onEditZone={() => { setEditingZone(zone); setShowAddZoneModal(true); }}
                    onDeleteZone={() => handleDelete('zone', zone.id)}
                    onEditRate={(rate) => { setEditingRate(rate); setShowEditRateModal(true); }}
                    onDeleteRate={(rateId) => handleDelete('rate', rateId)}
                    onAddRate={(methodId) => {
                      const method = config.methods.find(m => m.id === methodId);
                      if (method) {
                        setEditingRate({
                          id: '',
                          zone_id: zone.id,
                          method_id: methodId,
                          price: 0,
                          billing_type: 'flat',
                          base_fee: 0,
                          estimated_days_min: method.estimated_days_min,
                          estimated_days_max: method.estimated_days_max,
                          is_active: true,
                          display_order: 0,
                          method: method,
                          zone: zone,
                        });
                        setShowEditRateModal(true);
                      }
                    }}
                    getMethodName={getMethodName}
                    getZoneName={getZoneName}
                    getEstimatedDays={getEstimatedDays}
                  />
                ))
              )}
            </div>
          )}

          {/* 运输方式列表 */}
          {activeTab === 'methods' && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">运输方式</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">英文名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">泰语名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">日语名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">预计时效</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">状态</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {config.methods.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        暂无运输方式
                      </td>
                    </tr>
                  ) : (
                    config.methods.map(method => (
                      <tr key={method.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-900">{method.method_code}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{method.method_name?.en || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{method.method_name?.th || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{method.method_name?.ja || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{getEstimatedDays(method)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            method.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {method.is_active ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => { setEditingMethod(method); setShowAddMethodModal(true); }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('method', method.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 统计信息 */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{config.zones.length} 个配送区域</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                <span>{config.methods.length} 种运输方式</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span>{config.rates.length} 个运费配置</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑配送区域模态框 */}
      {showAddZoneModal && (
        <ZoneModal
          zone={editingZone}
          onSave={(data) => handleSave('zone', data, editingZone?.id)}
          onClose={closeAllModals}
          saving={saving}
        />
      )}

      {/* 添加/编辑运输方式模态框 */}
      {showAddMethodModal && (
        <MethodModal
          method={editingMethod}
          onSave={(data) => handleSave('method', data, editingMethod?.id)}
          onClose={closeAllModals}
          saving={saving}
        />
      )}

      {/* 编辑运费费率模态框 */}
      {showEditRateModal && editingRate && (
        <RateModal
          rate={editingRate}
          onSave={(data) => handleSave('rate', data, editingRate?.id || undefined)}
          onClose={closeAllModals}
          saving={saving}
          getMethodName={getMethodName}
        />
      )}
    </div>
  );
}

// ============ ZoneCard 组件 ============
interface ZoneCardProps {
  zone: Zone;
  methods: Method[];
  rates: Rate[];
  availableMethods: Method[];
  isExpanded: boolean;
  onToggle: () => void;
  onEditZone: () => void;
  onDeleteZone: () => void;
  onEditRate: (rate: Rate) => void;
  onDeleteRate: (rateId: string) => void;
  onAddRate: (methodId: string) => void;
  getMethodName: (m: Method, lang?: string) => string;
  getZoneName: (z: Zone, lang?: string) => string;
  getEstimatedDays: (m: Method) => string;
}

function ZoneCard({
  zone, methods, rates, availableMethods, isExpanded,
  onToggle, onEditZone, onDeleteZone, onEditRate, onDeleteRate, onAddRate,
  getMethodName, getZoneName, getEstimatedDays
}: ZoneCardProps) {
  const [showAddMethod, setShowAddMethod] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* 区域头部 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <button className="p-1 text-slate-400">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="font-semibold text-slate-900">{getZoneName(zone)}</h3>
              <p className="text-sm text-slate-500">{zone.countries.length} 个国家</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            zone.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {zone.is_active ? '启用' : '禁用'}
          </span>
          <button onClick={onEditZone} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDeleteZone} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          {/* 国家列表 */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <p className="text-sm text-slate-500 mb-2">覆盖国家：</p>
            <div className="flex flex-wrap gap-2">
              {zone.countries.length === 0 ? (
                <span className="text-sm text-slate-400">未设置国家</span>
              ) : (
                zone.countries.map(country => {
                  const countryInfo = COMMON_COUNTRIES.find(c => c.code === country);
                  return (
                    <span key={country} className="inline-flex items-center px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
                      <Globe className="w-3 h-3 mr-1" />
                      {countryInfo?.name || country}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* 运费配置表格 */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                运费配置
              </h4>
              <div className="relative">
                <button
                  onClick={() => setShowAddMethod(!showAddMethod)}
                  disabled={availableMethods.length === 0}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  添加方式
                </button>

                {/* 添加方式下拉 */}
                {showAddMethod && availableMethods.length > 0 && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                    {availableMethods.map(method => (
                      <button
                        key={method.id}
                        onClick={() => { onAddRate(method.id); setShowAddMethod(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {getMethodName(method)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 费率列表 */}
            {rates.length === 0 ? (
              <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
                <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm">暂无运费配置</p>
                <p className="text-xs text-slate-400 mt-1">点击上方按钮为此区域添加运输方式</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">运输方式</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">运费</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">预计时效</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">状态</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rates.map(rate => (
                      <tr key={rate.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-400" />
                            <span>{rate.method ? getMethodName(rate.method) : '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {rate.billing_type === 'free' ? (
                              <span className="font-medium text-green-600">免费</span>
                            ) : rate.billing_type === 'flat' ? (
                              <span className="font-medium text-emerald-600">
                                ${typeof rate.price === 'number' ? rate.price.toFixed(2) : '0.00'}
                              </span>
                            ) : rate.billing_type === 'weight' ? (
                              <span className="font-medium text-emerald-600" title={`基础费 $${rate.base_fee || 0} + $${rate.per_unit_fee || 0}/kg`}>
                                ${rate.base_fee || 0} + ${rate.per_unit_fee || 0}/kg
                              </span>
                            ) : rate.billing_type === 'per_unit' ? (
                              <span className="font-medium text-emerald-600" title={`基础费 $${rate.base_fee || 0} + $${rate.per_unit_fee || 0}/件`}>
                                ${rate.base_fee || 0} + ${rate.per_unit_fee || 0}/件
                              </span>
                            ) : (
                              <span className="font-medium text-emerald-600">
                                ${typeof rate.price === 'number' ? rate.price.toFixed(2) : '0.00'}
                              </span>
                            )}
                            {rate.free_shipping_threshold && (
                              <span className="text-xs text-blue-600" title={`满 $${rate.free_shipping_threshold} 免运费`}>
                                (满免)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {rate.estimated_days_min && rate.estimated_days_max
                            ? `${rate.estimated_days_min}-${rate.estimated_days_max} days`
                            : rate.method ? getEstimatedDays(rate.method) : '-'}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            rate.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {rate.is_active ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => onEditRate(rate)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRate(rate.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ZoneModal 组件 ============
interface ZoneModalProps {
  zone: Zone | null;
  onSave: (data: any) => void;
  onClose: () => void;
  saving: boolean;
}

function ZoneModal({ zone, onSave, onClose, saving }: ZoneModalProps) {
  const [zoneCode, setZoneCode] = useState(zone?.zone_code || '');
  const [zoneNameEn, setZoneNameEn] = useState(zone?.zone_name?.en || '');
  const [zoneNameTh, setZoneNameTh] = useState(zone?.zone_name?.th || '');
  const [zoneNameJa, setZoneNameJa] = useState(zone?.zone_name?.ja || '');
  const [countries, setCountries] = useState<string[]>(zone?.countries || []);
  const [isActive, setIsActive] = useState(zone?.is_active ?? true);
  const [searchCountry, setSearchCountry] = useState('');

  const filteredCountries = COMMON_COUNTRIES.filter(c =>
    !countries.includes(c.code) &&
    (c.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
     c.code.toLowerCase().includes(searchCountry.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      zone_code: zoneCode,
      zone_name: { en: zoneNameEn, th: zoneNameTh, ja: zoneNameJa },
      countries: countries,
      is_active: isActive,
    });
  };

  const addCountry = (code: string) => {
    setCountries([...countries, code]);
    setSearchCountry('');
  };

  const removeCountry = (code: string) => {
    setCountries(countries.filter(c => c !== code));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {zone ? '编辑配送区域' : '添加配送区域'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 区域代码 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              区域代码 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={zoneCode}
              onChange={e => setZoneCode(e.target.value.toUpperCase())}
              placeholder="如: US, ASIA, EUROPE"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          {/* 多语言名称 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">区域名称</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">English</label>
                <input
                  type="text"
                  value={zoneNameEn}
                  onChange={e => setZoneNameEn(e.target.value)}
                  placeholder="North America"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ไทย</label>
                <input
                  type="text"
                  value={zoneNameTh}
                  onChange={e => setZoneNameTh(e.target.value)}
                  placeholder="อเมริกาเหนือ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">日本語</label>
                <input
                  type="text"
                  value={zoneNameJa}
                  onChange={e => setZoneNameJa(e.target.value)}
                  placeholder="北米"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* 国家选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              覆盖国家 ({countries.length} 个)
            </label>

            {/* 已选国家 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {countries.map(code => {
                const country = COMMON_COUNTRIES.find(c => c.code === code);
                return (
                  <span
                    key={code}
                    className="inline-flex items-center px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-700"
                  >
                    <Globe className="w-3 h-3 mr-1" />
                    {country?.name || code}
                    <button
                      type="button"
                      onClick={() => removeCountry(code)}
                      className="ml-1.5 text-emerald-500 hover:text-emerald-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
              {countries.length === 0 && (
                <span className="text-sm text-slate-400">点击下方添加国家</span>
              )}
            </div>

            {/* 国家搜索 */}
            <div className="relative">
              <input
                type="text"
                value={searchCountry}
                onChange={e => setSearchCountry(e.target.value)}
                placeholder="搜索国家..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {searchCountry && filteredCountries.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {filteredCountries.slice(0, 10).map(country => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => addCountry(country.code)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-medium">{country.code}</span> - {country.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 状态 */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">启用此配送区域</span>
            </label>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !zoneCode}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ MethodModal 组件 ============
interface MethodModalProps {
  method: Method | null;
  onSave: (data: any) => void;
  onClose: () => void;
  saving: boolean;
}

function MethodModal({ method, onSave, onClose, saving }: MethodModalProps) {
  const [methodCode, setMethodCode] = useState(method?.method_code || '');
  const [methodNameEn, setMethodNameEn] = useState(method?.method_name?.en || '');
  const [methodNameTh, setMethodNameTh] = useState(method?.method_name?.th || '');
  const [methodNameJa, setMethodNameJa] = useState(method?.method_name?.ja || '');
  const [methodDescEn, setMethodDescEn] = useState(method?.method_description?.en || '');
  const [methodDescTh, setMethodDescTh] = useState(method?.method_description?.th || '');
  const [methodDescJa, setMethodDescJa] = useState(method?.method_description?.ja || '');
  const [daysMin, setDaysMin] = useState(method?.estimated_days_min?.toString() || '');
  const [daysMax, setDaysMax] = useState(method?.estimated_days_max?.toString() || '');
  const [isActive, setIsActive] = useState(method?.is_active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      method_code: methodCode,
      method_name: { en: methodNameEn, th: methodNameTh, ja: methodNameJa },
      method_description: { en: methodDescEn, th: methodDescTh, ja: methodDescJa },
      estimated_days_min: daysMin ? parseInt(daysMin) : null,
      estimated_days_max: daysMax ? parseInt(daysMax) : null,
      is_active: isActive,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {method ? '编辑运输方式' : '添加运输方式'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 方式代码 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              方式代码 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={methodCode}
              onChange={e => setMethodCode(e.target.value.toLowerCase().replace(/\s/g, '-'))}
              placeholder="如: standard, express, local-pickup"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          {/* 多语言名称 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">名称</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">English</label>
                <input
                  type="text"
                  value={methodNameEn}
                  onChange={e => setMethodNameEn(e.target.value)}
                  placeholder="Standard Shipping"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ไทย</label>
                <input
                  type="text"
                  value={methodNameTh}
                  onChange={e => setMethodNameTh(e.target.value)}
                  placeholder="การจัดส่งมาตรฐาน"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">日本語</label>
                <input
                  type="text"
                  value={methodNameJa}
                  onChange={e => setMethodNameJa(e.target.value)}
                  placeholder="標準配送"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* 多语言描述 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">English</label>
                <textarea
                  value={methodDescEn}
                  onChange={e => setMethodDescEn(e.target.value)}
                  placeholder="5-10 business days"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ไทย</label>
                <textarea
                  value={methodDescTh}
                  onChange={e => setMethodDescTh(e.target.value)}
                  placeholder="5-10 วันทำการ"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">日本語</label>
                <textarea
                  value={methodDescJa}
                  onChange={e => setMethodDescJa(e.target.value)}
                  placeholder="5-10営業日"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* 预计时效 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">预计配送天数</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={daysMin}
                onChange={e => setDaysMin(e.target.value)}
                placeholder="5"
                min="0"
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-slate-500">至</span>
              <input
                type="number"
                value={daysMax}
                onChange={e => setDaysMax(e.target.value)}
                placeholder="10"
                min="0"
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-slate-500">天</span>
            </div>
          </div>

          {/* 状态 */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">启用此运输方式</span>
            </label>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !methodCode || !methodNameEn}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 计费方式类型 ============
type BillingType = 'flat' | 'weight' | 'per_unit' | 'free';

const BILLING_TYPE_OPTIONS = [
  { value: 'flat', label: '固定运费', desc: '所有订单统一运费金额' },
  { value: 'weight', label: '按重量计费', desc: '基础费 + 每kg费用' },
  { value: 'per_unit', label: '按件计费', desc: '基础费 + 每件费用' },
  { value: 'free', label: '免费配送', desc: '不收取运费' },
];

// ============ RateModal 组件 ============
interface RateModalProps {
  rate: Rate;
  onSave: (data: any) => void;
  onClose: () => void;
  saving: boolean;
  getMethodName: (m: Method, lang?: string) => string;
}

function RateModal({ rate, onSave, onClose, saving, getMethodName }: RateModalProps) {
  const [billingType, setBillingType] = useState<BillingType>((rate.billing_type as BillingType) || 'flat');
  const [price, setPrice] = useState(rate.price?.toString() || '0');
  const [baseFee, setBaseFee] = useState(rate.base_fee?.toString() || '0');
  const [perUnitFee, setPerUnitFee] = useState(rate.per_unit_fee?.toString() || '0');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    rate.free_shipping_threshold ? rate.free_shipping_threshold.toString() : ''
  );
  const [daysMin, setDaysMin] = useState(rate.estimated_days_min?.toString() || '');
  const [daysMax, setDaysMax] = useState(rate.estimated_days_max?.toString() || '');
  const [isActive, setIsActive] = useState(rate.is_active ?? true);
  const isNew = !rate.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      zone_id: rate.zone_id,
      method_id: rate.method_id,
      billing_type: billingType,
      estimated_days_min: daysMin ? parseInt(daysMin) : null,
      estimated_days_max: daysMax ? parseInt(daysMax) : null,
      is_active: isActive,
    };

    switch (billingType) {
      case 'flat':
        data.price = parseFloat(price) || 0;
        data.base_fee = 0;
        data.per_unit_fee = 0;
        break;
      case 'weight':
        data.price = 0;
        data.base_fee = parseFloat(baseFee) || 0;
        data.per_unit_fee = parseFloat(perUnitFee) || 0;
        data.weight_unit = 'kg';
        break;
      case 'per_unit':
        data.price = 0;
        data.base_fee = parseFloat(baseFee) || 0;
        data.per_unit_fee = parseFloat(perUnitFee) || 0;
        break;
      case 'free':
        data.price = 0;
        data.base_fee = 0;
        data.per_unit_fee = 0;
        break;
    }

    data.free_shipping_threshold = freeShippingThreshold ? parseFloat(freeShippingThreshold) : null;

    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">
            {isNew ? '添加运费' : '编辑运费'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 运输方式 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">运输方式</label>
            <div className="px-4 py-3 bg-slate-50 rounded-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-slate-400" />
              <span className="font-medium">{rate.method ? getMethodName(rate.method) : '-'}</span>
            </div>
          </div>

          {/* 区域 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">配送区域</label>
            <div className="px-4 py-3 bg-slate-50 rounded-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              <span>{rate.zone?.zone_name?.en || rate.zone?.zone_code || '-'}</span>
            </div>
          </div>

          {/* 计费方式 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">计费方式</label>
            <div className="grid grid-cols-2 gap-2">
              {BILLING_TYPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBillingType(option.value as BillingType)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    billingType === option.value
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`font-medium text-sm ${
                    billingType === option.value ? 'text-emerald-700' : 'text-slate-700'
                  }`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 固定运费 */}
          {billingType === 'flat' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                运费金额 (USD) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>
          )}

          {/* 按重量计费 */}
          {billingType === 'weight' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  基础费 (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={baseFee}
                    onChange={e => setBaseFee(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="5.00"
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">无论重量多少，都需要支付的基础费用</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  每kg费用 (USD/kg)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={perUnitFee}
                    onChange={e => setPerUnitFee(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="2.50"
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">每千克重量需要增加的费用</p>
              </div>
              {/* 费用预览 */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium mb-2">费用计算示例：</p>
                <div className="text-xs text-blue-600 space-y-1">
                  <div>0.5kg: ${((parseFloat(baseFee) || 0) + (parseFloat(perUnitFee) || 0) * 0.5).toFixed(2)}</div>
                  <div>1kg: ${((parseFloat(baseFee) || 0) + (parseFloat(perUnitFee) || 0) * 1).toFixed(2)}</div>
                  <div>2kg: ${((parseFloat(baseFee) || 0) + (parseFloat(perUnitFee) || 0) * 2).toFixed(2)}</div>
                  <div>5kg: ${((parseFloat(baseFee) || 0) + (parseFloat(perUnitFee) || 0) * 5).toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          {/* 按件计费 */}
          {billingType === 'per_unit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  基础费 (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={baseFee}
                    onChange={e => setBaseFee(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="3.00"
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">无论数量多少，都需要支付的基础费用</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  每件费用 (USD/件)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={perUnitFee}
                    onChange={e => setPerUnitFee(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="1.00"
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">每个商品需要增加的费用</p>
              </div>
              {/* 费用预览 */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium mb-2">费用计算示例：</p>
                <div className="text-xs text-blue-600 space-y-1">
                  <div>1件: ${((parseFloat(baseFee) || 0) + (parseFloat(perUnitFee) || 0) * 1).toFixed(2)}</div>
                  <div>2件: ${((parseFloat(baseFee) || 0) + (parseFloat(perUnitFee) || 0) * 2).toFixed(2)}</div>
                  <div>3件: ${((parseFloat(baseFee) || 0) + (parseFloat(perUnitFee) || 0) * 3).toFixed(2)}</div>
                  <div>5件: ${((parseFloat(baseFee) || 0) + (parseFloat(perUnitFee) || 0) * 5).toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          {/* 免费配送 */}
          {billingType === 'free' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">免费配送</p>
                <p className="text-sm text-green-600">此配送方式不收取任何运费</p>
              </div>
            </div>
          )}

          {/* 满额免运费 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              满额免运费门槛 (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={freeShippingThreshold}
                onChange={e => setFreeShippingThreshold(e.target.value)}
                step="0.01"
                min="0"
                placeholder="不设置"
                className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">订单金额达到此门槛时免运费，留空表示不启用</p>
          </div>

          {/* 预计时效 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">预计配送天数</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={daysMin}
                onChange={e => setDaysMin(e.target.value)}
                placeholder="5"
                min="0"
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-slate-500">至</span>
              <input
                type="number"
                value={daysMax}
                onChange={e => setDaysMax(e.target.value)}
                placeholder="10"
                min="0"
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-slate-500">天</span>
            </div>
          </div>

          {/* 状态 */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">启用此运费</span>
            </label>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
