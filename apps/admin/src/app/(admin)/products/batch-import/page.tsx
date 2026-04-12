'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  Loader2,
  ArrowRight,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  Languages,
  Settings,
  FolderTree,
} from 'lucide-react';

interface ExcelRow {
  _rowIndex: number;
  sku: string;
  name: string;
  brand: string;
  l1Category: string;
  l2Category: string;
  l3Category: string;
  shortDescription: string;
  fullDescription: string;
  primaryImageUrl: string;
  additionalImages: string;
  costPriceCny: number;
  sellingPriceUsd: number;
  minOrderQty: number;
  packageQty: number;
  packageUnit: string;
  weight: number;
  weightUnit: string;  // Weight unit from Excel (kg, g, lb)
  leadTime: string;
  availability: string;
  status: string;
  purchaseMode: string;
  attributes: { name: string; value: string }[];
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  sourceUrl: string;
  faqs: { question: string; answer: string }[];
  _errors: string[];
  _mappedCategoryId?: string;
}

interface ImportProgress {
  total: number;
  current: number;
  success: number;
  failed: number;
  status: 'idle' | 'parsing' | 'validating' | 'importing' | 'translating' | 'completed' | 'error';
  currentProduct?: string;
  errors: { row: number; message: string }[];
}

interface CategoryMapping {
  excel_l1: string;
  excel_l2: string | null;
  excel_l3: string | null;
  category_id: string;
}

interface SystemCategory {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  level: number;
  parent_id: string | null;
}

export default function ProductBatchImportPage() {

  // 防御性价格解析：处理 number/string/格式化货币等各种输入
  function parsePrice(value: any): number {
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.\-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  // 防御性整数解析
  function parseIntSafe(value: any): number {
    if (typeof value === 'number') return isNaN(value) ? 0 : Math.round(value);
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.\-]/g, '');
      const num = parseInt(cleaned, 10);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [systemCategories, setSystemCategories] = useState<SystemCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    current: 0,
    success: 0,
    failed: 0,
    status: 'idle',
    errors: [],
  });
  const [showPreview, setShowPreview] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [translateAfterImport, setTranslateAfterImport] = useState(true);

  useEffect(() => {
    loadMappings();
    loadSystemCategories();
  }, []);

  const loadMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('category_mappings')
        .select('*');

      if (error) throw error;
      setMappings(data || []);
    } catch (error) {
      console.error('Failed to load category mappings:', error);
    }
  };

  const loadSystemCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, name_en, slug, level, parent_id')
        .eq('is_active', true)
        .order('level')
        .order('sort_order');

      if (error) throw error;
      setSystemCategories(data || []);
    } catch (error) {
      console.error('Failed to load system categories:', error);
    }
  };

  // 根据分类名称自动匹配系统分类
  const autoMatchCategory = (l1: string, l2: string, l3: string): string | null => {
    // 优先匹配最具体的分类（L3 > L2 > L1）
    // 尝试匹配中文名或英文名
    const matchByName = (name: string): SystemCategory | undefined => {
      if (!name) return undefined;
      return systemCategories.find(cat =>
        cat.name === name || cat.name_en === name || cat.slug === name.toLowerCase().replace(/\s+/g, '-')
      );
    };

    // 先尝试匹配L3
    if (l3) {
      const cat = matchByName(l3);
      if (cat) return cat.id;
    }

    // 再尝试匹配L2
    if (l2) {
      const cat = matchByName(l2);
      if (cat) return cat.id;
    }

    // 最后尝试匹配L1
    if (l1) {
      const cat = matchByName(l1);
      if (cat) return cat.id;
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File) => {
    setLoading(true);
    setProgress(prev => ({ ...prev, status: 'parsing' }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/products/parse-excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to parse Excel file');

      const data = await response.json();
      const parsedRows = validateAndEnrichRows(data.rows || []);
      setRows(parsedRows);
      setShowPreview(true);
      setProgress(prev => ({ ...prev, status: 'idle' }));
    } catch (error) {
      console.error('Failed to parse Excel:', error);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        errors: [{ row: 0, message: `文件解析失败: ${error instanceof Error ? error.message : '未知错误'}` }],
      }));
    } finally {
      setLoading(false);
    }
  };

  const validateAndEnrichRows = (rawRows: any[]): ExcelRow[] => {
    return rawRows.map((row, index) => {
      const errors: string[] = [];

      // Required fields validation
      if (!row.SKU) errors.push('SKU不能为空');
      if (!row.Name) errors.push('产品名称不能为空');
      if (!row['Selling Price (USD)'] && row['Selling Price (USD)'] !== 0) {
        errors.push('销售价格不能为空');
      }

      // Parse attributes (Attribute 1-9)
      const attributes: { name: string; value: string }[] = [];
      for (let i = 1; i <= 9; i++) {
        const attrName = row[`Attribute ${i} Name`];
        const attrValue = row[`Attribute ${i} Value`];
        if (attrName && attrValue) {
          attributes.push({ name: attrName, value: attrValue });
        }
      }

      // Parse FAQs
      const faqs: { question: string; answer: string }[] = [];
      for (let i = 1; i <= 3; i++) {
        const question = row[`FAQ Question ${i}`];
        const answer = row[`FAQ Answer ${i}`];
        if (question && answer) {
          faqs.push({ question, answer });
        }
      }

      // Map category
      const l1 = row['L1 Category'] || '';
      const l2 = row['L2 Category'] || '';
      const l3 = row['L3 Category'] || '';
      let mappedCategoryId: string | undefined;

      // Try to find mapping (prioritize most specific match)
      const mapping = mappings.find(m =>
        m.excel_l1 === l1 &&
        (m.excel_l2 === l2 || (!m.excel_l2 && !l2)) &&
        (m.excel_l3 === l3 || (!m.excel_l3 && !l3))
      );

      if (mapping) {
        // 找到显式映射
        mappedCategoryId = mapping.category_id;
      } else {
        // 尝试自动匹配（当分类名称与系统分类名称一致时）
        const autoMatchedId = autoMatchCategory(l1, l2, l3);
        if (autoMatchedId) {
          mappedCategoryId = autoMatchedId;
        } else if (l1 || l2 || l3) {
          // 只有当有分类但无法匹配时才报错
          errors.push(`未找到分类映射: ${l1}/${l2}/${l3}`);
        }
      }

      return {
        _rowIndex: index + 2, // Excel row number (1-indexed, +1 for header)
        sku: row.SKU || '',
        name: row.Name || '',
        brand: row.Brand || '',
        l1Category: l1,
        l2Category: l2,
        l3Category: l3,
        shortDescription: row['Short Description'] || '',
        fullDescription: row['Full Description'] || '',
        primaryImageUrl: row['Primary Image URL'] || '',
        additionalImages: row['Additional Images'] || '',
        costPriceCny: parsePrice(row['Cost Price (CNY)']),
        sellingPriceUsd: parsePrice(row['Selling Price (USD)']),
        minOrderQty: parseIntSafe(row['Min Order Qty']) || 1,
        packageQty: parseIntSafe(row['Package Qty']) || 1,
        packageUnit: row['Package Unit'] || 'Each',
        weight: parsePrice(row['Weight (kg)']),
        weightUnit: row['Weight Unit'] || 'kg',  // Parse weight unit (kg/g/lb)
        leadTime: row['Lead Time'] || '2-4 weeks',
        availability: row['Availability'] || 'In Stock',
        status: row['Status'] || 'published',
        purchaseMode: row['Purchase Mode'] || 'Buy Online + RFQ',
        attributes,
        metaTitle: row['Meta Title'] || '',
        metaDescription: row['Meta Description'] || '',
        focusKeyword: row['Focus Keyword'] || '',
        sourceUrl: row['Source URL'] || '',
        faqs,
        _errors: errors,
        _mappedCategoryId: mappedCategoryId,
      };
    });
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r._errors.length === 0);
    if (validRows.length === 0) {
      alert('没有有效数据可导入');
      return;
    }

    setLoading(true);
    setProgress({
      total: validRows.length,
      current: 0,
      success: 0,
      failed: 0,
      status: 'importing',
      errors: [],
    });

    try {
      const response = await fetch('/api/admin/products/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRows,
          translateAfterImport,
        }),
      });

      if (!response.ok) throw new Error('Import failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const update = JSON.parse(line);
              setProgress(prev => ({
                ...prev,
                ...update,
              }));
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        errors: [...prev.errors, { row: 0, message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}` }],
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setRows([]);
    setShowPreview(false);
    setProgress({
      total: 0,
      current: 0,
      success: 0,
      failed: 0,
      status: 'idle',
      errors: [],
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const validCount = rows.filter(r => r._errors.length === 0).length;
  const errorCount = rows.filter(r => r._errors.length > 0).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-7 h-7 text-emerald-600" />
            产品批量导入
          </h1>
          <p className="text-slate-500 mt-1">
            上传Excel文件批量导入产品数据，导入后产品默认为草稿状态
          </p>
        </div>
        <Link
          href="/products/batch-import/category-mappings"
          className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-emerald-300 transition-colors"
        >
          <FolderTree className="w-5 h-5" />
          分类映射配置
        </Link>
      </div>

      {/* Quick Links */}
      {!showPreview && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">导入前请先配置分类映射</p>
              <p>
                Excel中的分类名称需要映射到系统分类，请先前往{' '}
                <Link href="/products/batch-import/category-mappings" className="underline font-medium hover:text-amber-900">
                  分类映射配置
                </Link>
                {' '}页面设置映射关系。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!showPreview && (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
          >
            <FileSpreadsheet className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-700 mb-2">
              点击上传Excel文件
            </p>
            <p className="text-sm text-slate-500">
              支持 .xlsx 和 .xls 格式，单次最多导入100条数据
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center mt-6">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mr-2" />
              <span className="text-slate-600">
                {progress.status === 'parsing' ? '正在解析Excel...' : '处理中...'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {showPreview && rows.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-2xl font-bold text-slate-900">{rows.length}</div>
              <div className="text-sm text-slate-500">总行数</div>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-4">
              <div className="text-2xl font-bold text-emerald-600">{validCount}</div>
              <div className="text-sm text-slate-500">有效数据</div>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-slate-500">错误数据</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-2xl font-bold text-slate-900">{mappings.length}</div>
              <div className="text-sm text-slate-500">分类映射</div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={translateAfterImport}
                onChange={(e) => setTranslateAfterImport(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Languages className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-700">
                导入后自动翻译到中文/日文/泰文
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
              {progress.status === 'completed' ? '重新开始' : '清除'}
            </button>
            {progress.status !== 'completed' && (
              <button
                onClick={handleImport}
                disabled={loading || validCount === 0}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    开始导入 {validCount} 条数据
                  </>
                )}
              </button>
            )}
            {progress.status === 'completed' && (
              <Link
                href="/products"
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                前往产品列表
              </Link>
            )}
          </div>

          {/* Progress */}
          {progress.status !== 'idle' && progress.status !== 'error' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-700">
                  {progress.status === 'importing' && '正在导入...'}
                  {progress.status === 'translating' && '正在翻译...'}
                  {progress.status === 'completed' && '导入完成'}
                </span>
                <span className="text-sm text-slate-500">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              {progress.currentProduct && (
                <p className="text-sm text-slate-500 mt-2 truncate">
                  {progress.currentProduct}
                </p>
              )}
            </div>
          )}

          {/* Completed Summary */}
          {progress.status === 'completed' && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                <h3 className="text-lg font-bold text-emerald-800">导入完成</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-emerald-600 font-medium">{progress.success}</span>
                  <span className="text-slate-600"> 条成功</span>
                </div>
                <div>
                  <span className="text-red-600 font-medium">{progress.failed}</span>
                  <span className="text-slate-600"> 条失败</span>
                </div>
              </div>
              {progress.errors.length > 0 && (
                <div className="mt-4 space-y-1">
                  {progress.errors.slice(0, 5).map((err, i) => (
                    <p key={i} className="text-sm text-red-600">
                      行 {err.row}: {err.message}
                    </p>
                  ))}
                  {progress.errors.length > 5 && (
                    <p className="text-sm text-slate-500">
                      还有 {progress.errors.length - 5} 条错误...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Data Preview */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="font-medium text-slate-700">数据预览</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {rows.map((row, index) => (
                <div key={index} className="p-4">
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => toggleRow(index)}
                  >
                    <button className="text-slate-400">
                      {expandedRows.has(index) ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">行{row._rowIndex}</span>
                        <span className="font-medium text-slate-900 truncate">{row.name}</span>
                        {row._errors.length > 0 ? (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                            {row._errors.length} 个错误
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-600 rounded-full">
                            有效
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {row.brand && `${row.brand} · `}
                        {row.sku && `SKU: ${row.sku} · `}
                        ${row.sellingPriceUsd}
                      </div>
                    </div>
                  </div>

                  {expandedRows.has(index) && (
                    <div className="mt-4 ml-9 space-y-3 text-sm">
                      {row._errors.length > 0 && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          {row._errors.map((err, i) => (
                            <p key={i} className="text-red-600">{err}</p>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-500">分类:</span>{' '}
                          <span className="text-slate-700">
                            {row.l1Category}/{row.l2Category}/{row.l3Category}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">映射:</span>{' '}
                          <span className={row._mappedCategoryId ? 'text-emerald-600' : 'text-red-600'}>
                            {row._mappedCategoryId ? '已映射' : '未映射'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">价格:</span>{' '}
                          <span className="text-slate-700">
                            成本 ¥{row.costPriceCny} / 售价 ${row.sellingPriceUsd}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">规格:</span>{' '}
                          <span className="text-slate-700">
                            {row.attributes.length} 项
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}