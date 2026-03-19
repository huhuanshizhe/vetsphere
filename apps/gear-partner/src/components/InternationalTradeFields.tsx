'use client';

import React from 'react';

interface InternationalTradeFieldsProps {
  formData: {
    weight: string;
    weightUnit: 'g' | 'kg' | 'lb';
    price: string;
    suggestedRetailPrice: string;
    sellingPrice: string;
  };
  setFormData: (data: any) => void;
}

export default function InternationalTradeFields({ 
  formData, 
  setFormData 
}: InternationalTradeFieldsProps) {
  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">外贸销售信息</h3>
        
        {/* 产品重量 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              产品重量 *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.weight}
              onChange={(e) => updateField('weight', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              重量单位 *
            </label>
            <select
              value={formData.weightUnit}
              onChange={(e) => updateField('weightUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="g">克 (g)</option>
              <option value="kg">千克 (kg)</option>
              <option value="lb">磅 (lb)</option>
            </select>
          </div>
        </div>

        {/* 价格信息 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              供货价 (¥) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => updateField('price', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              建议销售价 (¥)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.suggestedRetailPrice}
              onChange={(e) => updateField('suggestedRetailPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="可选"
            />
            <p className="mt-1 text-xs text-gray-500">供应商建议的零售价格</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              销售定价 (¥) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.sellingPrice}
              onChange={(e) => updateField('sellingPrice', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formData.sellingPrice && formData.price && 
                parseFloat(formData.sellingPrice) < parseFloat(formData.price)
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-gray-500">最终商城售价，不能低于供货价</p>
            {formData.sellingPrice && formData.price && 
             parseFloat(formData.sellingPrice) < parseFloat(formData.price) && (
              <p className="mt-1 text-xs text-red-600">⚠️ 销售定价不能低于供货价</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
