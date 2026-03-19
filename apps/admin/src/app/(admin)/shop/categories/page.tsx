'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_th?: string;
  name_ja?: string;
  slug: string;
  level: number;
  parent_id?: string;
  icon_url?: string;
  sort_order: number;
  is_active: boolean;
}

export default function AdminShopCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (categoryData: Partial<Category>) => {
    try {
      if (editingCategory) {
        // Update existing
        const { error } = await supabase
          .from('product_categories')
          .update({
            ...categoryData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id);
        
        if (error) throw error;
        alert('分类更新成功');
      } else {
        // Create new
        const { error } = await supabase
          .from('product_categories')
          .insert({
            ...categoryData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
          });
        
        if (error) throw error;
        alert('分类创建成功');
      }
      
      setShowAddModal(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('保存失败');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('确定要删除这个分类吗？')) return;
    
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      alert('分类删除成功');
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('删除失败');
    }
  };

  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2);
  const level3Categories = categories.filter(c => c.level === 3);

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品分类管理</h1>
          <p className="text-gray-600 mt-1">管理商城的三级分类结构</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          添加分类
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Level 1 Categories */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">一级分类</h2>
            <div className="space-y-2">
              {level1Categories.map((category) => (
                <div
                  key={category.id}
                  className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setEditingCategory(category);
                    setShowAddModal(true);
                  }}
                >
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {category.name_en && <span>EN: {category.name_en} </span>}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">
                      {level2Categories.filter(c => c.parent_id === category.id).length} 个子分类
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category.id);
                      }}
                      className="text-red-600 hover:text-red-900 text-xs"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Level 2 Categories */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">二级分类</h2>
            <div className="space-y-2">
              {level2Categories.map((category) => (
                <div
                  key={category.id}
                  className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setEditingCategory(category);
                    setShowAddModal(true);
                  }}
                >
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    上级：{level1Categories.find(c => c.id === category.parent_id)?.name || '-'}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">
                      {level3Categories.filter(c => c.parent_id === category.id).length} 个子分类
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category.id);
                      }}
                      className="text-red-600 hover:text-red-900 text-xs"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Level 3 Categories */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">三级分类</h2>
            <div className="space-y-2">
              {level3Categories.map((category) => (
                <div
                  key={category.id}
                  className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setEditingCategory(category);
                    setShowAddModal(true);
                  }}
                >
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    上级：{level2Categories.find(c => c.id === category.parent_id)?.name || '-'}
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category.id);
                      }}
                      className="text-red-600 hover:text-red-900 text-xs"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <CategoryModal
          category={editingCategory}
          categories={categories}
          onSave={handleSaveCategory}
          onClose={() => {
            setShowAddModal(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
}

interface CategoryModalProps {
  category: Category | null;
  categories: Category[];
  onSave: (data: Partial<Category>) => void;
  onClose: () => void;
}

function CategoryModal({ category, categories, onSave, onClose }: CategoryModalProps) {
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    name_en: '',
    name_th: '',
    name_ja: '',
    slug: '',
    level: 1,
    parent_id: undefined,
    icon_url: '',
    sort_order: 0,
    is_active: true,
    ...category
  });

  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {category ? '编辑分类' : '添加分类'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              级别
            </label>
            <select
              value={formData.level}
              onChange={(e) => {
                const level = parseInt(e.target.value);
                setFormData(prev => ({
                  ...prev,
                  level,
                  parent_id: level === 1 ? undefined : prev.parent_id
                }));
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value={1}>一级分类</option>
              <option value={2}>二级分类</option>
              <option value={3}>三级分类</option>
            </select>
          </div>

          {formData.level > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                上级分类
              </label>
              <select
                value={formData.parent_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value || undefined }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">请选择</option>
                {formData.level === 2 && level1Categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {formData.level === 3 && level2Categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              中文名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              英文名称
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              排序
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
