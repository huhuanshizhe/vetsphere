'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Check } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  level: number;
  parent_id: string | null;
  icon: string | null;
  children?: Category[];
}

interface CategorySelectorProps {
  value?: string; // selected category id
  onChange: (categoryId: string, categoryPath: string[]) => void;
  siteCode?: 'cn' | 'intl' | 'global';
  placeholder?: string;
}

export default function CategorySelector({
  value,
  onChange,
  siteCode = 'global',
  placeholder = '选择分类...',
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
  }, [siteCode]);

  useEffect(() => {
    // Find and set selected path when value changes
    if (value && categories.length > 0) {
      const path = findPath(categories, value);
      if (path.length > 0) {
        setSelectedPath(path.map(c => c.name));
        // Expand parent categories
        const parentIds = path.slice(0, -1).map(c => c.id);
        setExpandedIds(new Set(parentIds));
      }
    }
  }, [value, categories]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories?site_code=${siteCode}`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const findPath = (cats: Category[], targetId: string): Category[] => {
    for (const cat of cats) {
      if (cat.id === targetId) {
        return [cat];
      }
      if (cat.children && cat.children.length > 0) {
        const childPath = findPath(cat.children, targetId);
        if (childPath.length > 0) {
          return [cat, ...childPath];
        }
      }
    }
    return [];
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

  const handleSelect = (category: Category) => {
    const path = findPath(categories, category.id);
    const pathNames = path.map(c => c.name);
    setSelectedPath(pathNames);
    onChange(category.id, pathNames);
  };

  const renderCategory = (category: Category, depth: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const isSelected = value === category.id;
    const levelColors = ['text-blue-600', 'text-emerald-600', 'text-purple-600'];

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition ${
            isSelected
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-slate-100'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(category.id);
            }}
            className={`w-5 h-5 flex items-center justify-center ${
              hasChildren ? 'hover:bg-slate-200 rounded' : ''
            }`}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )
            ) : null}
          </button>

          <div
            className="flex-1 flex items-center gap-2"
            onClick={() => handleSelect(category)}
          >
            <span className={`text-sm ${levelColors[category.level - 1]}`}>
              {category.icon || <FolderOpen className="w-4 h-4" />}
            </span>
            <span className="text-sm font-medium">{category.name}</span>
            {isSelected && (
              <Check className="w-4 h-4 text-blue-600 ml-auto" />
            )}
          </div>
        </div>

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
      <div className="border border-slate-200 rounded-lg p-4 text-center text-slate-400">
        加载分类中...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected Path Display */}
      {selectedPath.length > 0 && (
        <div className="flex items-center gap-1 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
          {selectedPath.map((name, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
              <span className={idx === selectedPath.length - 1 ? 'font-medium text-blue-600' : ''}>
                {name}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Category Tree */}
      <div className="border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
        {categories.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            暂无分类
          </div>
        ) : (
          <div className="py-2">
            {categories.map(cat => renderCategory(cat))}
          </div>
        )}
      </div>
    </div>
  );
}
