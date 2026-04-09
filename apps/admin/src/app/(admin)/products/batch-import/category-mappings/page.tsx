'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ArrowRight,
  FolderTree,
  AlertCircle,
} from 'lucide-react';

interface CategoryMapping {
  id: string;
  excel_l1: string;
  excel_l2: string | null;
  excel_l3: string | null;
  category_id: string | null;
  created_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  level: number;
  parent_id: string | null;
}

interface FormData {
  excel_l1: string;
  excel_l2: string;
  excel_l3: string;
  category_id: string;
}

const initialFormData: FormData = {
  excel_l1: '',
  excel_l2: '',
  excel_l3: '',
  category_id: '',
};

export default function CategoryMappingsPage() {
  const supabase = createClient();
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CategoryMapping | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mappingsRes, categoriesRes] = await Promise.all([
        supabase
          .from('category_mappings')
          .select('*, category:product_categories(id, name, slug)')
          .order('excel_l1')
          .order('excel_l2')
          .order('excel_l3'),
        supabase
          .from('product_categories')
          .select('id, name, slug, level, parent_id')
          .eq('is_active', true)
          .order('level')
          .order('sort_order'),
      ]);

      if (mappingsRes.error) throw mappingsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setMappings(mappingsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = () => {
    setEditingMapping(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleEditMapping = (mapping: CategoryMapping) => {
    setEditingMapping(mapping);
    setFormData({
      excel_l1: mapping.excel_l1,
      excel_l2: mapping.excel_l2 || '',
      excel_l3: mapping.excel_l3 || '',
      category_id: mapping.category_id || '',
    });
    setShowModal(true);
  };

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('确定要删除此映射吗？')) return;

    try {
      const { error } = await supabase
        .from('category_mappings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      alert('删除失败');
    }
  };

  const handleSaveMapping = async () => {
    if (!formData.excel_l1.trim()) {
      alert('请输入Excel一级分类');
      return;
    }
    if (!formData.category_id) {
      alert('请选择目标分类');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        excel_l1: formData.excel_l1.trim(),
        excel_l2: formData.excel_l2.trim() || null,
        excel_l3: formData.excel_l3.trim() || null,
        category_id: formData.category_id,
      };

      let error;
      if (editingMapping) {
        const result = await supabase
          .from('category_mappings')
          .update(payload)
          .eq('id', editingMapping.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('category_mappings')
          .insert(payload);
        error = result.error;
      }

      if (error) {
        if (error.code === '23505') {
          alert('此分类组合已存在');
        } else {
          throw error;
        }
        return;
      }

      setShowModal(false);
      await loadData();
    } catch (error) {
      console.error('Failed to save mapping:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Filter mappings by search term
  const filteredMappings = mappings.filter(m => 
    m.excel_l1.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.excel_l2?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.excel_l3?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group categories by level for the select dropdown
  const getCategoryPath = (cat: Category): string => {
    if (cat.level === 1) return cat.name;
    const parent = categories.find(c => c.id === cat.parent_id);
    if (parent) return `${parent.name} > ${cat.name}`;
    return cat.name;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FolderTree className="w-7 h-7 text-emerald-600" />
          Excel分类映射管理
        </h1>
        <p className="text-slate-500 mt-1">
          配置Excel导入时的分类名称到系统分类的映射关系
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="搜索映射..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
          <span className="text-sm text-slate-500">
            共 {mappings.length} 条映射
          </span>
        </div>
        <button
          onClick={handleAddMapping}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新增映射
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
            <p>暂无映射数据</p>
            <p className="text-sm mt-1">点击"新增映射"添加分类映射关系</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Excel分类路径</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-20">映射到</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">系统分类</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-medium text-slate-900">{mapping.excel_l1}</span>
                      {mapping.excel_l2 && (
                        <>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-700">{mapping.excel_l2}</span>
                        </>
                      )}
                      {mapping.excel_l3 && (
                        <>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-600">{mapping.excel_l3}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ArrowRight className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                      {mapping.category?.name || '未映射'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditMapping(mapping)}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editingMapping ? '编辑映射' : '新增映射'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Excel L1 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Excel一级分类 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.excel_l1}
                  onChange={(e) => setFormData(prev => ({ ...prev, excel_l1: e.target.value }))}
                  placeholder="如：防护用品"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Excel L2 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Excel二级分类
                </label>
                <input
                  type="text"
                  value={formData.excel_l2}
                  onChange={(e) => setFormData(prev => ({ ...prev, excel_l2: e.target.value }))}
                  placeholder="如：手套"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Excel L3 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Excel三级分类
                </label>
                <input
                  type="text"
                  value={formData.excel_l3}
                  onChange={(e) => setFormData(prev => ({ ...prev, excel_l3: e.target.value }))}
                  placeholder="如：丁腈手套"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Target Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  映射到系统分类 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">请选择分类</option>
                  {categories.filter(c => c.level >= 2).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {getCategoryPath(cat)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveMapping}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}