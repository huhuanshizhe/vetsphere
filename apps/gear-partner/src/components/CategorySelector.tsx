'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Loader2, FolderOpen } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  name_en?: string;
  slug: string;
  level: number;
  parent_id: string | null;
  icon?: string | null;
  sort_order: number;
  children?: Category[];
}

interface CategorySelectorProps {
  value: {
    level1: string | null;
    level2: string | null;
    level3: string | null;
  };
  onChange: (value: {
    level1: string | null;
    level2: string | null;
    level3: string | null;
    level1Name?: string;
    level2Name?: string;
    level3Name?: string;
  }) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function CategorySelector({ value, onChange, required = false, disabled = false }: CategorySelectorProps) {
  const [level1Categories, setLevel1Categories] = useState<Category[]>([]);
  const [level2Categories, setLevel2Categories] = useState<Category[]>([]);
  const [level3Categories, setLevel3Categories] = useState<Category[]>([]);
  const [loading, setLoading] = useState({ level1: false, level2: false, level3: false });
  const [error, setError] = useState<string | null>(null);

  // Fetch level 1 categories on mount
  useEffect(() => {
    const fetchLevel1 = async () => {
      setLoading(prev => ({ ...prev, level1: true }));
      setError(null);
      try {
        const res = await fetch('/api/categories?level=1');
        const data = await res.json();
        if (data.categories) {
          setLevel1Categories(data.categories);
        }
      } catch (e) {
        console.error('Failed to fetch level 1 categories:', e);
        setError('加载分类失败');
      } finally {
        setLoading(prev => ({ ...prev, level1: false }));
      }
    };
    fetchLevel1();
  }, []);

  // Fetch level 2 categories when level 1 is selected
  useEffect(() => {
    if (!value.level1) {
      setLevel2Categories([]);
      return;
    }

    const fetchLevel2 = async () => {
      setLoading(prev => ({ ...prev, level2: true }));
      try {
        const res = await fetch(`/api/categories?parent_id=${value.level1}`);
        const data = await res.json();
        if (data.categories) {
          setLevel2Categories(data.categories);
        }
      } catch (e) {
        console.error('Failed to fetch level 2 categories:', e);
      } finally {
        setLoading(prev => ({ ...prev, level2: false }));
      }
    };
    fetchLevel2();
  }, [value.level1]);

  // Fetch level 3 categories when level 2 is selected
  useEffect(() => {
    if (!value.level2) {
      setLevel3Categories([]);
      return;
    }

    const fetchLevel3 = async () => {
      setLoading(prev => ({ ...prev, level3: true }));
      try {
        const res = await fetch(`/api/categories?parent_id=${value.level2}`);
        const data = await res.json();
        if (data.categories) {
          setLevel3Categories(data.categories);
        }
      } catch (e) {
        console.error('Failed to fetch level 3 categories:', e);
      } finally {
        setLoading(prev => ({ ...prev, level3: false }));
      }
    };
    fetchLevel3();
  }, [value.level2]);

  const handleLevel1Change = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel1 = e.target.value || null;
    const selectedCat = level1Categories.find(c => c.id === newLevel1);
    onChange({
      level1: newLevel1,
      level2: null,
      level3: null,
      level1Name: selectedCat?.name,
      level2Name: undefined,
      level3Name: undefined,
    });
  }, [level1Categories, onChange]);

  const handleLevel2Change = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel2 = e.target.value || null;
    const selectedCat = level2Categories.find(c => c.id === newLevel2);
    onChange({
      level1: value.level1,
      level2: newLevel2,
      level3: null,
      level1Name: level1Categories.find(c => c.id === value.level1)?.name,
      level2Name: selectedCat?.name,
      level3Name: undefined,
    });
  }, [value.level1, level1Categories, level2Categories, onChange]);

  const handleLevel3Change = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel3 = e.target.value || null;
    const selectedCat = level3Categories.find(c => c.id === newLevel3);
    onChange({
      level1: value.level1,
      level2: value.level2,
      level3: newLevel3,
      level1Name: level1Categories.find(c => c.id === value.level1)?.name,
      level2Name: level2Categories.find(c => c.id === value.level2)?.name,
      level3Name: selectedCat?.name,
    });
  }, [value.level1, value.level2, level1Categories, level2Categories, level3Categories, onChange]);

  const getLevel1DisplayName = (cat: Category) => {
    return `${cat.icon || ''} ${cat.name}`.trim();
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Level 1 */}
        <div className="flex-1 w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            一级分类 {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <select
              value={value.level1 || ''}
              onChange={handleLevel1Change}
              disabled={disabled || loading.level1}
              className="input pr-10 appearance-none"
            >
              <option value="">选择一级分类</option>
              {level1Categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {getLevel1DisplayName(cat)}
                </option>
              ))}
            </select>
            {loading.level1 && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="hidden sm:flex items-end pb-0.5 text-gray-400">
          <ChevronRight className="w-5 h-5" />
        </div>

        {/* Level 2 */}
        <div className="flex-1 w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            二级分类 {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <select
              value={value.level2 || ''}
              onChange={handleLevel2Change}
              disabled={disabled || !value.level1 || loading.level2}
              className="input pr-10 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">选择二级分类</option>
              {level2Categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {loading.level2 && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="hidden sm:flex items-end pb-0.5 text-gray-400">
          <ChevronRight className="w-5 h-5" />
        </div>

        {/* Level 3 */}
        <div className="flex-1 w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            三级分类 <span className="text-gray-400 text-xs">(可选)</span>
          </label>
          <div className="relative">
            <select
              value={value.level3 || ''}
              onChange={handleLevel3Change}
              disabled={disabled || !value.level2 || loading.level3}
              className="input pr-10 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">选择三级分类</option>
              {level3Categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {loading.level3 && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* Selected Path Display */}
      {value.level1 && (
        <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <FolderOpen className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">
            {level1Categories.find(c => c.id === value.level1)?.name || ''}
          </span>
          {value.level2 && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="font-medium text-gray-900">
                {level2Categories.find(c => c.id === value.level2)?.name || ''}
              </span>
            </>
          )}
          {value.level3 && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="font-medium text-gray-900">
                {level3Categories.find(c => c.id === value.level3)?.name || ''}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
