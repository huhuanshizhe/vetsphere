'use client';

import React, { useState, useEffect } from 'react';

const API_BASE = '/api/admin/shipping-zones';

interface ShippingZone {
  id: string;
  zone_code: string;
  zone_name: Record<string, string>;
  region: 'US' | 'EU' | 'SEA';
  countries: string[];
  billing_type: 'weight' | 'flat';
  base_fee: number;
  currency: string;
  per_unit_fee: number;
  weight_unit: string;
  free_shipping_threshold: number;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ZoneFormData {
  zone_code: string;
  zone_name_en: string;
  zone_name_th: string;
  zone_name_ja: string;
  region: 'US' | 'EU' | 'SEA';
  countries: string;
  billing_type: 'weight' | 'flat';
  base_fee: number;
  per_unit_fee: number;
  weight_unit: string;
  estimated_days_min: number;
  estimated_days_max: number;
  display_order: number;
}

export default function ShippingZonesPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState<ZoneFormData>({
    zone_code: '',
    zone_name_en: '',
    zone_name_th: '',
    zone_name_ja: '',
    region: 'US',
    countries: '',
    billing_type: 'weight',
    base_fee: 25,
    per_unit_fee: 0.5,
    weight_unit: 'kg',
    estimated_days_min: 7,
    estimated_days_max: 14,
    display_order: 0,
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setZones(data);
    } catch (error) {
      console.error('Failed to fetch shipping zones:', error);
      showNotification('error', '获取配送区域失败');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const openAddModal = () => {
    setEditingZone(null);
    setFormData({
      zone_code: '',
      zone_name_en: '',
      zone_name_th: '',
      zone_name_ja: '',
      region: 'US',
      countries: '',
      billing_type: 'weight',
      base_fee: 25,
      per_unit_fee: 0.5,
      weight_unit: 'kg',
      estimated_days_min: 7,
      estimated_days_max: 14,
      display_order: zones.length + 1,
    });
    setShowModal(true);
  };

  const openEditModal = (zone: ShippingZone) => {
    setEditingZone(zone);
    setFormData({
      zone_code: zone.zone_code,
      zone_name_en: zone.zone_name?.en || '',
      zone_name_th: zone.zone_name?.th || '',
      zone_name_ja: zone.zone_name?.ja || '',
      region: zone.region,
      countries: zone.countries?.join(', ') || '',
      billing_type: zone.billing_type,
      base_fee: zone.base_fee,
      per_unit_fee: zone.per_unit_fee,
      weight_unit: zone.weight_unit,
      estimated_days_min: zone.estimated_days_min,
      estimated_days_max: zone.estimated_days_max,
      display_order: zone.display_order,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.zone_code || !formData.zone_name_en) {
      showNotification('error', '请填写必填字段');
      return;
    }

    try {
      setSaving(true);

      const zoneData = {
        zone_code: formData.zone_code,
        zone_name: {
          en: formData.zone_name_en,
          th: formData.zone_name_th,
          ja: formData.zone_name_ja,
        },
        region: formData.region,
        countries: formData.countries.split(',').map(c => c.trim().toUpperCase()).filter(c => c),
        billing_type: formData.billing_type,
        base_fee: formData.base_fee,
        per_unit_fee: formData.per_unit_fee,
        weight_unit: formData.weight_unit,
        estimated_days_min: formData.estimated_days_min,
        estimated_days_max: formData.estimated_days_max,
        display_order: formData.display_order,
      };

      let response;
      if (editingZone) {
        response = await fetch(API_BASE, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingZone.id, ...zoneData }),
        });
      } else {
        response = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(zoneData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存失败');
      }

      showNotification('success', editingZone ? '更新成功' : '添加成功');
      setShowModal(false);
      fetchZones();
    } catch (error: any) {
      console.error('Failed to save zone:', error);
      showNotification('error', error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (zone: ShippingZone) => {
    // 乐观更新：立即更新UI
    const newStatus = !zone.is_active;
    setZones(zones.map(z =>
      z.id === zone.id ? { ...z, is_active: newStatus } : z
    ));

    try {
      const response = await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: zone.id, is_active: newStatus }),
      });

      if (!response.ok) throw new Error('更新失败');
      showNotification('success', newStatus ? '已启用' : '已禁用');
    } catch (error) {
      console.error('Failed to toggle zone:', error);
      // 失败时回滚
      setZones(zones.map(z =>
        z.id === zone.id ? { ...z, is_active: zone.is_active } : z
      ));
      showNotification('error', '操作失败');
    }
  };

  const deleteZone = async (zone: ShippingZone) => {
    if (!confirm(`确定要删除配送区域 "${zone.zone_name?.en || zone.zone_code}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}?id=${zone.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      showNotification('success', '删除成功');
      fetchZones();
    } catch (error) {
      console.error('Failed to delete zone:', error);
      showNotification('error', '删除失败');
    }
  };

  const getRegionName = (region: string) => {
    const names: Record<string, string> = {
      US: '美国 & 北美',
      EU: '欧洲',
      SEA: '东南亚 & 太平洋',
    };
    return names[region] || region;
  };

  const getRegionBadgeColor = (region: string) => {
    const colors: Record<string, string> = {
      US: 'bg-blue-100 text-blue-800',
      EU: 'bg-purple-100 text-purple-800',
      SEA: 'bg-green-100 text-green-800',
    };
    return colors[region] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">配送区域管理</h1>
          <p className="text-gray-600 mt-1">配置国际站配送区域和运费规则</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加区域
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium">运费计算说明</p>
            <p className="mt-1">
              运费 = 基础费用 + (单位重量费用 × 商品总重量)
              <br />
              例如：美国区域 基础$25 + 每kg $0.50，1kg商品运费 = $25.50
            </p>
          </div>
        </div>
      </div>

      {/* Zones Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : zones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-gray-500 mb-4">暂无配送区域</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            添加第一个区域
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`bg-white rounded-xl border ${zone.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'} shadow-sm overflow-hidden`}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                      zone.region === 'US' ? 'bg-blue-500' :
                      zone.region === 'EU' ? 'bg-purple-500' : 'bg-green-500'
                    }`}>
                      {zone.zone_code.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{zone.zone_name?.en || zone.zone_code}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRegionBadgeColor(zone.region)}`}>
                        {getRegionName(zone.region)}
                      </span>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <button
                    onClick={() => toggleActive(zone)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      zone.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                        zone.is_active ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="p-4 space-y-3">
                {/* Fee Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">基础费用</p>
                    <p className="font-bold text-gray-900">${zone.base_fee.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      {zone.billing_type === 'weight' ? '每kg费用' : '固定费用'}
                    </p>
                    <p className="font-bold text-gray-900">
                      {zone.billing_type === 'weight' ? `$${zone.per_unit_fee.toFixed(2)}` : '$0.00'}
                    </p>
                  </div>
                </div>

                {/* Countries */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">包含国家</p>
                  <p className="text-sm text-gray-700 font-medium truncate">
                    {zone.countries?.slice(0, 5).join(', ')}
                    {zone.countries?.length > 5 && ` +${zone.countries.length - 5} more`}
                  </p>
                </div>

                {/* Delivery Days */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>配送时间: {zone.estimated_days_min}-{zone.estimated_days_max} 天</span>
                </div>

                {/* Weight Unit */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  <span>重量单位: {zone.weight_unit}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
                <button
                  onClick={() => openEditModal(zone)}
                  className="text-emerald-600 hover:text-emerald-900 font-medium text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑
                </button>
                <button
                  onClick={() => deleteZone(zone)}
                  className="text-red-600 hover:text-red-900 font-medium text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingZone ? '编辑配送区域' : '添加配送区域'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    区域代码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.zone_code}
                    onChange={(e) => setFormData({ ...formData, zone_code: e.target.value.toUpperCase() })}
                    placeholder="例如: US, EU, SEA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                    disabled={!!editingZone}
                  />
                  <p className="text-xs text-gray-500 mt-1">唯一标识符，不可修改</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    区域 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="US">美国 & 北美</option>
                    <option value="EU">欧洲</option>
                    <option value="SEA">东南亚 & 太平洋</option>
                  </select>
                </div>
              </div>

              {/* Multi-language Names */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">区域名称（多语言）</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      英文名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.zone_name_en}
                      onChange={(e) => setFormData({ ...formData, zone_name_en: e.target.value })}
                      placeholder="United States"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">泰语名称</label>
                    <input
                      type="text"
                      value={formData.zone_name_th}
                      onChange={(e) => setFormData({ ...formData, zone_name_th: e.target.value })}
                      placeholder="สหรัฐอเมริกา"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">日语名称</label>
                    <input
                      type="text"
                      value={formData.zone_name_ja}
                      onChange={(e) => setFormData({ ...formData, zone_name_ja: e.target.value })}
                      placeholder="アメリカ合衆国"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Countries */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  包含国家
                </label>
                <input
                  type="text"
                  value={formData.countries}
                  onChange={(e) => setFormData({ ...formData, countries: e.target.value })}
                  placeholder="US, CA, MX（用逗号分隔国家代码）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">使用 ISO 3166-1 alpha-2 国家代码，用逗号分隔</p>
              </div>

              {/* Shipping Fees */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">运费设置</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      基础费用 ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.base_fee}
                      onChange={(e) => setFormData({ ...formData, base_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">每笔订单的固定基础费用</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      计费方式
                    </label>
                    <select
                      value={formData.billing_type}
                      onChange={(e) => setFormData({ ...formData, billing_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="weight">按重量</option>
                      <option value="flat">固定费用</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.billing_type === 'weight' ? '每kg费用 ($)' : '额外费用 ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.per_unit_fee}
                      onChange={(e) => setFormData({ ...formData, per_unit_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.billing_type === 'weight' ? '每千克收取的费用' : '除基础费用外的固定费用'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">重量单位</label>
                    <select
                      value={formData.weight_unit}
                      onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="kg">千克 (kg)</option>
                      <option value="g">克 (g)</option>
                      <option value="lb">磅 (lb)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">显示顺序</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Days */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">配送时间</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">最少天数</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.estimated_days_min}
                      onChange={(e) => setFormData({ ...formData, estimated_days_min: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">最多天数</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.estimated_days_max}
                      onChange={(e) => setFormData({ ...formData, estimated_days_max: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-emerald-800 mb-2">运费预览</h4>
                <p className="text-sm text-emerald-700">
                  <strong>示例：</strong> 1kg 商品运费 = ${(formData.base_fee + formData.per_unit_fee * 1).toFixed(2)}
                  <br />
                  5kg 商品运费 = ${(formData.base_fee + formData.per_unit_fee * 5).toFixed(2)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
                >
                  {saving ? '保存中...' : (editingZone ? '保存修改' : '添加区域')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
