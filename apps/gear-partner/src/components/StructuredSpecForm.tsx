'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, X, ChevronDown, Info, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@vetsphere/shared/services/api';
import type { ProductGroup } from '@vetsphere/shared/types';

// ============================================
// Types
// ============================================

export interface SpecValue {
  key: string;
  value: string;
  isCustom?: boolean;
}

interface SpecTemplate {
  id: string;
  specName: string;
  specNameEn?: string;
  unit?: string;
  inputType: string;
  isRequired: boolean;
  displayOrder: number;
  values: string[];
}

interface StructuredSpecFormProps {
  productGroup: ProductGroup | '';
  categoryId?: string | null;
  subcategoryId?: string | null;
  level3CategoryId?: string | null;
  value: SpecValue[];
  onChange: (specs: SpecValue[]) => void;
  onValidationChange?: (isValid: boolean, missingRequired: string[]) => void;
  disabled?: boolean;
}

// ============================================
// Fallback Mock data (used when DB has no templates)
// ============================================

const FALLBACK_SPEC_GROUPS: Record<string, SpecTemplate[]> = {
  PowerTools: [
    { id: 'speed', specName: '转速范围', unit: 'rpm', inputType: 'text', isRequired: true, displayOrder: 1, values: [] },
    { id: 'torque', specName: '扭矩', unit: 'N·cm', inputType: 'text', isRequired: true, displayOrder: 2, values: [] },
    { id: 'weight', specName: '重量', unit: 'g', inputType: 'number', isRequired: false, displayOrder: 3, values: [] },
    { id: 'sterilization', specName: '灭菌方式', inputType: 'select', isRequired: true, displayOrder: 4, values: ['高温高压', '低温等离子', '不可灭菌'] },
  ],
  Implants: [
    { id: 'material', specName: '材质', inputType: 'select', isRequired: true, displayOrder: 1, values: ['钛合金', '不锈钢', '钴铬钼合金', 'PEEK', '可吸收材料'] },
    { id: 'size', specName: '尺寸', unit: 'mm', inputType: 'text', isRequired: true, displayOrder: 2, values: [] },
    { id: 'animals', specName: '适用动物', inputType: 'multiselect', isRequired: false, displayOrder: 3, values: ['犬', '猫', '兔', '鸟类', '爬行动物'] },
    { id: 'certification', specName: '认证', inputType: 'multiselect', isRequired: false, displayOrder: 4, values: ['CE认证', 'FDA认证', 'NMPA认证', 'ISO13485'] },
  ],
  HandInstruments: [
    { id: 'material', specName: '材质', inputType: 'select', isRequired: true, displayOrder: 1, values: ['不锈钢', '钛合金', '碳纤维', '其他'] },
    { id: 'total-length', specName: '总长度', unit: 'mm', inputType: 'number', isRequired: false, displayOrder: 2, values: [] },
    { id: 'sterilizable', specName: '是否可灭菌', inputType: 'select', isRequired: true, displayOrder: 3, values: ['是', '否'] },
  ],
  Consumables: [
    { id: 'package-size', specName: '包装规格', inputType: 'text', isRequired: true, displayOrder: 1, values: [] },
    { id: 'sterile', specName: '灭菌状态', inputType: 'select', isRequired: true, displayOrder: 2, values: ['无菌', '非无菌'] },
    { id: 'shelf-life', specName: '有效期', unit: '月', inputType: 'number', isRequired: false, displayOrder: 3, values: [] },
  ],
  Equipment: [
    { id: 'dimensions', specName: '尺寸(长x宽x高)', unit: 'mm', inputType: 'text', isRequired: false, displayOrder: 1, values: [] },
    { id: 'power', specName: '功率', unit: 'W', inputType: 'number', isRequired: false, displayOrder: 2, values: [] },
    { id: 'voltage', specName: '电压', unit: 'V', inputType: 'select', isRequired: false, displayOrder: 3, values: ['110V', '220V', '可切换'] },
    { id: 'warranty', specName: '保修期', unit: '年', inputType: 'number', isRequired: false, displayOrder: 4, values: [] },
  ],
};

// ============================================
// Component
// ============================================

export default function StructuredSpecForm({
  productGroup,
  categoryId,
  subcategoryId,
  level3CategoryId,
  value,
  onChange,
  onValidationChange,
  disabled = false,
}: StructuredSpecFormProps) {
  const [templates, setTemplates] = useState<SpecTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');

  // Load templates from database
  useEffect(() => {
    if (!categoryId) {
      setTemplates([]);
      return;
    }

    const loadTemplates = async () => {
      setLoading(true);
      try {
        const dbTemplates = await api.getSpecTemplates({
          categoryId,
          subcategoryId,
          level3CategoryId,
        });
        
        if (dbTemplates.length > 0) {
          setTemplates(dbTemplates);
        } else if (productGroup && FALLBACK_SPEC_GROUPS[productGroup]) {
          // Fallback to mock data if no DB templates
          setTemplates(FALLBACK_SPEC_GROUPS[productGroup]);
        } else {
          setTemplates([]);
        }
      } catch (err) {
        console.error('Failed to load spec templates:', err);
        // Fallback to mock data
        if (productGroup && FALLBACK_SPEC_GROUPS[productGroup]) {
          setTemplates(FALLBACK_SPEC_GROUPS[productGroup]);
        } else {
          setTemplates([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [categoryId, subcategoryId, level3CategoryId, productGroup]);

  const requiredSpecNames = useMemo(() => {
    return templates.filter(t => t.isRequired).map(t => t.specName);
  }, [templates]);

  const validation = useMemo(() => {
    const missing: string[] = [];
    requiredSpecNames.forEach(name => {
      const found = value.find(v => v.key === name && v.value.trim());
      if (!found) missing.push(name);
    });
    return { isValid: missing.length === 0, missing };
  }, [value, requiredSpecNames]);

  useEffect(() => {
    onValidationChange?.(validation.isValid, validation.missing);
  }, [validation.isValid, validation.missing, onValidationChange]);

  const getSpecValue = useCallback((specName: string): string => {
    const found = value.find(v => v.key === specName);
    return found?.value || '';
  }, [value]);

  const updateSpecValue = useCallback((specName: string, specValue: string, isCustom = false) => {
    const existing = value.find(v => v.key === specName);
    if (existing) {
      onChange(value.map(v => v.key === specName ? { ...v, value: specValue, isCustom } : v));
    } else {
      onChange([...value, { key: specName, value: specValue, isCustom }]);
    }
  }, [value, onChange]);

  const addCustomSpec = useCallback(() => {
    if (!customKey.trim() || !customValue.trim()) return;
    updateSpecValue(customKey.trim(), customValue.trim(), true);
    setCustomKey('');
    setCustomValue('');
  }, [customKey, customValue, updateSpecValue]);

  const removeSpec = useCallback((specName: string) => {
    onChange(value.filter(v => v.key !== specName));
  }, [value, onChange]);

  const renderInput = (template: SpecTemplate) => {
    const currentValue = getSpecValue(template.specName);
    const hasValues = template.values && template.values.length > 0;

    // 如果有可选值，显示为下拉选择（支持手动输入）
    if (hasValues) {
      return (
        <div className="flex items-center gap-2">
          <select
            value={currentValue}
            onChange={e => updateSpecValue(template.specName, e.target.value)}
            className="input flex-1"
            disabled={disabled}
          >
            <option value="">请选择或手动输入</option>
            {template.values.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <input
            type="text"
            value={!hasValues || !template.values.includes(currentValue) ? currentValue : ''}
            onChange={e => updateSpecValue(template.specName, e.target.value)}
            placeholder="或手动输入"
            className="input flex-1"
            disabled={disabled}
          />
          {template.unit && <span className="text-gray-500 text-sm whitespace-nowrap">{template.unit}</span>}
        </div>
      );
    }

    if (template.inputType === 'number') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={currentValue}
            onChange={e => updateSpecValue(template.specName, e.target.value)}
            placeholder={`输入${template.specName}`}
            className="input flex-1"
            disabled={disabled}
          />
          {template.unit && <span className="text-gray-500 text-sm whitespace-nowrap">{template.unit}</span>}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={currentValue}
          onChange={e => updateSpecValue(template.specName, e.target.value)}
          placeholder={`输入${template.specName}`}
          className="input flex-1"
          disabled={disabled}
        />
        {template.unit && <span className="text-gray-500 text-sm whitespace-nowrap">{template.unit}</span>}
      </div>
    );
  };

  const renderCustomSpecs = () => (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-900 text-sm mb-3">自定义参数</h4>
      <div className="space-y-2 mb-3">
        {value.filter(v => v.isCustom).map(spec => (
          <div key={spec.key} className="flex items-center gap-2 py-2 px-3 bg-white rounded-lg border border-gray-200">
            <span className="text-gray-500 text-sm w-24">{spec.key}</span>
            <span className="text-gray-900 text-sm flex-1">{spec.value}</span>
            <button
              type="button"
              onClick={() => removeSpec(spec.key)}
              className="text-gray-400 hover:text-red-600 transition-colors"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={customKey}
          onChange={e => setCustomKey(e.target.value)}
          placeholder="参数名"
          className="input flex-1"
          disabled={disabled}
        />
        <input
          type="text"
          value={customValue}
          onChange={e => setCustomValue(e.target.value)}
          placeholder="参数值"
          className="input flex-1"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={addCustomSpec}
          disabled={!customKey.trim() || !customValue.trim() || disabled}
          className="btn btn-secondary px-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // 没有选择分类时显示提示
  if (!categoryId) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
        <p className="text-gray-600 text-sm">请先选择商品分类，系统将加载对应的规格参数模板</p>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">正在加载规格参数模板...</p>
      </div>
    );
  }

  // 没有模板数据
  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-700 text-sm">该分类暂无预设参数模板，请手动添加规格参数</p>
          <p className="text-amber-600 text-xs mt-1">保存商品后，系统将自动学习并生成模板</p>
        </div>
        {renderCustomSpecs()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Validation warnings */}
      {!validation.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-red-600 text-sm">
            必填参数缺失: {validation.missing.join('、')}
          </p>
        </div>
      )}

      {/* Spec templates */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="font-medium text-gray-900 text-sm">规格参数模板</h4>
          <p className="text-xs text-gray-500 mt-0.5">基于该分类下历史商品自动生成</p>
        </div>
        <div className="p-4 space-y-3">
          {templates.map(template => (
            <div key={template.id} className="pt-3 first:pt-0">
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-gray-700 text-sm font-medium">
                  {template.specName}
                  {template.isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                {template.unit && (
                  <span className="text-xs text-gray-400">({template.unit})</span>
                )}
              </div>
              {renderInput(template)}
            </div>
          ))}
        </div>
      </div>

      {/* Custom specs */}
      {renderCustomSpecs()}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm py-2">
        <span className="text-gray-500">
          已填写 {value.filter(v => v.value.trim()).length} 项参数
        </span>
        {validation.isValid ? (
          <span className="text-emerald-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            必填项已完整
          </span>
        ) : (
          <span className="text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            缺少 {validation.missing.length} 项必填
          </span>
        )}
      </div>
    </div>
  );
}