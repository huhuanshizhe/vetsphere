'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  FolderOpen,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  level: number;
  parent_id: string | null;
  icon: string | null;
  description: string | null;
  site_code: string;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
}

interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: string | null;
  level: number;
  icon: string;
  description: string;
  site_code: string;
}

const initialFormData: CategoryFormData = {
  name: '',
  slug: '',
  parent_id: null,
  level: 1,
  icon: '',
  description: '',
  site_code: 'global',
};

export default function ProductCategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('level')
        .order('sort_order');

      if (error) throw error;

      // Build tree structure
      const tree = buildTree(data || []);
      setCategories(tree);
      
      // Auto-expand level 1
      const level1Ids = (data || []).filter(c => c.level === 1).map(c => c.id);
      setExpandedIds(new Set(level1Ids));
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (flatList: Category[]): Category[] => {
    const map = new Map<string, Category>();
    const roots: Category[] = [];

    // First pass: create map
    flatList.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    // Second pass: build tree
    flatList.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        const parent = map.get(item.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else if (item.level === 1) {
        roots.push(node);
      }
    });

    // Sort children
    const sortChildren = (nodes: Category[]) => {
      nodes.sort((a, b) => a.sort_order - b.sort_order);
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };
    sortChildren(roots);

    return roots;
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleAddCategory = (parentId: string | null = null, level: number = 1) => {
    setEditingCategory(null);
    setFormData({
      ...initialFormData,
      parent_id: parentId,
      level: level,
    });
    setShowModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id,
      level: category.level,
      icon: category.icon || '',
      description: category.description || '',
      site_code: category.site_code || 'global',
    });
    setShowModal(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`确定要删除分类 "${category.name}" 吗？\n\n注意：子分类也会被删除。`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('删除失败');
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const { error } = await supabase
        .from('product_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;
      loadCategories();
    } catch (error) {
      console.error('Failed to toggle category:', error);
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const slug = formData.slug || generateSlug(formData.name);
      const id = editingCategory?.id || `cat-${slug}-${Date.now()}`;

      if (editingCategory) {
        const { error } = await supabase
          .from('product_categories')
          .update({
            name: formData.name,
            slug: slug,
            icon: formData.icon || null,
            description: formData.description || null,
            site_code: formData.site_code,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        // Get max sort_order for this level/parent
        const { data: siblings } = await supabase
          .from('product_categories')
          .select('sort_order')
          .eq('level', formData.level)
          .eq('parent_id', formData.parent_id || null);

        const maxOrder = siblings?.reduce((max, s) => Math.max(max, s.sort_order || 0), 0) || 0;

        const { error } = await supabase
          .from('product_categories')
          .insert({
            id: id,
            name: formData.name,
            slug: slug,
            parent_id: formData.parent_id,
            level: formData.level,
            icon: formData.icon || null,
            description: formData.description || null,
            site_code: formData.site_code,
            sort_order: maxOrder + 1,
            is_active: true,
          });

        if (error) throw error;
      }

      setShowModal(false);
      loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderCategory = (category: Category, depth: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const levelColors = ['text-blue-600', 'text-emerald-600', 'text-purple-600'];
    const levelBgs = ['bg-blue-50', 'bg-emerald-50', 'bg-purple-50'];

    return (
      <div key={category.id} className="select-none">
        <div
          className={`flex items-center gap-2 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 ${
            !category.is_active ? 'opacity-50' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          {/* Expand/Collapse */}
          <button
            onClick={() => hasChildren && toggleExpand(category.id)}
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 ${
              hasChildren ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          {/* Icon */}
          <div className={`w-8 h-8 rounded-lg ${levelBgs[category.level - 1]} flex items-center justify-center`}>
            {category.icon ? (
              <span className="text-lg">{category.icon}</span>
            ) : (
              <FolderOpen className={`w-4 h-4 ${levelColors[category.level - 1]}`} />
            )}
          </div>

          {/* Name & Slug */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{category.name}</span>
              <span className="text-xs text-slate-400">L{category.level}</span>
              {category.site_code !== 'global' && (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                  {category.site_code.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">{category.slug}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {category.level < 3 && (
              <button
                onClick={() => handleAddCategory(category.id, category.level + 1)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="添加子分类"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleToggleActive(category)}
              className={`p-1.5 rounded ${
                category.is_active
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-slate-400 hover:bg-slate-100'
              }`}
              title={category.is_active ? '禁用' : '启用'}
            >
              {category.is_active ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => handleEditCategory(category)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="编辑"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteCategory(category)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">产品分类管理</h1>
            <p className="text-sm text-slate-500 mt-1">支持三级分类结构，可拖拽排序</p>
          </div>
          <button
            onClick={() => handleAddCategory()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            添加一级分类
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">一级分类</p>
            <p className="text-2xl font-bold text-blue-600">
              {categories.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">二级分类</p>
            <p className="text-2xl font-bold text-emerald-600">
              {categories.reduce((sum, c) => sum + (c.children?.length || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">三级分类</p>
            <p className="text-2xl font-bold text-purple-600">
              {categories.reduce(
                (sum, c) =>
                  sum + (c.children?.reduce((s, sc) => s + (sc.children?.length || 0), 0) || 0),
                0
              )}
            </p>
          </div>
        </div>

        {/* Category Tree */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-medium text-slate-600">分类树</span>
          </div>
          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无分类，点击上方按钮添加</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {categories.map(category => renderCategory(category))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {editingCategory ? '编辑分类' : '添加分类'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  分类名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="例如：耗材"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SEO Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="例如：consumables"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  图标 (emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="例如：🧤"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  rows={2}
                  placeholder="分类简介..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  站点
                </label>
                <select
                  value={formData.site_code}
                  onChange={e => setFormData({ ...formData, site_code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="global">全球 (CN + INTL)</option>
                  <option value="cn">仅中国站</option>
                  <option value="intl">仅国际站</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
