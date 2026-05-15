'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { CourseProductRelation, RelationType, RelationshipType } from '@vetsphere/shared/types';

interface ProductOption {
  id: string;
  name: string;
  brand?: string | null;
  status?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  site_views?: Array<Record<string, any>>;
}

interface AgendaDayOption {
  day?: string;
  date?: string;
}

interface CourseProductRelationsEditorProps {
  courseId: string;
  agendaDays?: AgendaDayOption[];
}

const RELATIONSHIP_OPTIONS: Array<{ value: RelationshipType; label: string }> = [
  { value: 'required', label: '必备器械' },
  { value: 'recommended', label: '推荐搭配' },
  { value: 'mentioned', label: '课堂提及' },
];

const RELATION_SCOPE_OPTIONS: Array<{ value: RelationType; label: string }> = [
  { value: 'course', label: '整门课程' },
  { value: 'module', label: '对应某个章节/天' },
  { value: 'instructor', label: '讲师特别推荐' },
];

type EditableRelation = Omit<CourseProductRelation, 'product'> & {
  product?: {
    id: string;
    name: string;
    brand?: string | null;
    status?: string | null;
    imageUrl?: string | null;
  } | null;
};

function createDraftRelation(product: ProductOption, index: number): EditableRelation {
  return {
    id: `draft:${product.id}`,
    courseId: '',
    productId: product.id,
    relationshipType: 'recommended',
    relationType: 'course',
    dayIndex: null,
    instructorNoteEn: '',
    instructorNoteTh: '',
    instructorNoteJa: '',
    displayOrder: index,
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand,
      status: product.status,
      imageUrl: product.cover_image_url || product.image_url || null,
    },
  };
}

export default function CourseProductRelationsEditor({
  courseId,
  agendaDays = [],
}: CourseProductRelationsEditorProps) {
  const [relations, setRelations] = useState<EditableRelation[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setLoadError(null);
      try {
        const [relationResponse, productResponse] = await Promise.all([
          apiFetch<{ relations: EditableRelation[] }>(`/api/v1/admin/courses/${courseId}/products`),
          apiFetch<{ data: ProductOption[] }>('/api/v1/admin/products?view=base'),
        ]);

        if (cancelled) {
          return;
        }

        setRelations(relationResponse.relations || []);
        setProducts(productResponse.data || []);
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error) || '加载关联器械失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const selectedProductIds = useMemo(
    () => new Set(relations.map((relation) => relation.productId)),
    [relations],
  );

  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return products.filter((product) => {
      if (selectedProductIds.has(product.id)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [product.name, product.brand, product.status]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(keyword));
    });
  }, [products, searchKeyword, selectedProductIds]);

  const dayOptions = useMemo(
    () =>
      agendaDays.map((day, index) => ({
        value: index + 1,
        label: day.day || day.date || `第 ${index + 1} 天`,
      })),
    [agendaDays],
  );

  const requiredCount = relations.filter((relation) => relation.relationshipType === 'required').length;
  const moduleScopedCount = relations.filter((relation) => relation.relationType === 'module').length;

  function normalizeDisplayOrder(nextRelations: EditableRelation[]) {
    return nextRelations.map((relation, index) => ({
      ...relation,
      displayOrder: index,
    }));
  }

  function handleAddRelation() {
    const selectedProduct = products.find((product) => product.id === selectedProductId);
    if (!selectedProduct) {
      setSaveError('请先选择一件器械');
      return;
    }

    setRelations((prev) => normalizeDisplayOrder([...prev, createDraftRelation(selectedProduct, prev.length)]));
    setSelectedProductId('');
    setSaveError(null);
    setSaveSuccess(false);
  }

  function updateRelation(relationId: string, updater: (relation: EditableRelation) => EditableRelation) {
    setRelations((prev) => prev.map((relation) => (relation.id === relationId ? updater(relation) : relation)));
    setSaveError(null);
    setSaveSuccess(false);
  }

  function moveRelation(relationId: string, direction: -1 | 1) {
    setRelations((prev) => {
      const index = prev.findIndex((relation) => relation.id === relationId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const [current] = next.splice(index, 1);
      next.splice(targetIndex, 0, current);
      return normalizeDisplayOrder(next);
    });
    setSaveSuccess(false);
  }

  function removeRelation(relationId: string) {
    setRelations((prev) => normalizeDisplayOrder(prev.filter((relation) => relation.id !== relationId)));
    setSaveError(null);
    setSaveSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const response = await apiFetch<{ relations: EditableRelation[] }>(
        `/api/v1/admin/courses/${courseId}/products`,
        {
          method: 'PUT',
          body: JSON.stringify({
            relations: relations.map((relation) => ({
              product_id: relation.productId,
              relationship_type: relation.relationshipType,
              relation_type: relation.relationType,
              day_index: relation.relationType === 'module' ? relation.dayIndex || null : null,
              instructor_note_en: relation.instructorNoteEn || null,
              instructor_note_th: relation.instructorNoteTh || null,
              instructor_note_ja: relation.instructorNoteJa || null,
            })),
          }),
        },
      );

      setRelations(response.relations || []);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      setSaveError(getErrorMessage(error) || '保存课程器械关联失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="space-y-3">
          <div className="h-5 w-40 rounded bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">关联器械与耗材</h4>
            <p className="text-xs text-slate-500 mt-1">
              为课程绑定实际会用到的器械，前台课程页可直接展示“必备 / 推荐 / 讲师推荐”设备，并引导学员查看商品详情。
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={() => window.open('/course-product-linking', '_blank', 'noopener,noreferrer')}>
              打开全局关联页
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存器械关联'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">已关联器械</div>
            <div className="text-2xl font-bold text-slate-900">{relations.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">必备器械</div>
            <div className="text-2xl font-bold text-rose-600">{requiredCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">按天/模块关联</div>
            <div className="text-2xl font-bold text-sky-600">{moduleScopedCount}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(180px,0.22fr)_minmax(180px,0.24fr)_minmax(180px,0.24fr)_auto] xl:items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">选择器械</label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="搜索器械名称 / 品牌"
                className="w-full mb-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
              />
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
              >
                <option value="">请选择器械</option>
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}{product.brand ? ` / ${product.brand}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">关联关系</label>
              <select
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                defaultValue="recommended"
                onChange={() => undefined}
                disabled
              >
                <option value="recommended">添加后可在列表中继续编辑</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">作用范围</label>
              <select
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                defaultValue="course"
                onChange={() => undefined}
                disabled
              >
                <option value="course">添加后可在列表中继续编辑</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 leading-5">
              建议优先关联已发布的器械；如果商品仍是草稿，课程前台不会展示出来。
            </div>

            <Button type="button" onClick={handleAddRelation} disabled={!selectedProductId}>
              添加器械
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        {relations.length > 0 ? (
          <div className="space-y-4">
            {relations.map((relation, index) => {
              const publishedSiteCount = (products.find((product) => product.id === relation.productId)?.site_views || []).filter(
                (siteView) => siteView.publish_status === 'published' && siteView.is_enabled !== false,
              ).length;

              return (
                <div key={relation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {relation.product?.imageUrl ? (
                        <img
                          src={relation.product.imageUrl}
                          alt={relation.product.name}
                          className="h-16 w-16 rounded-2xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          器械
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{relation.product?.name || relation.productId}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {relation.product?.brand || '未填写品牌'}
                          {relation.product?.status ? ` / ${relation.product.status}` : ''}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            排序 #{index + 1}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${publishedSiteCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {publishedSiteCount > 0 ? `已在 ${publishedSiteCount} 个站点可见` : '尚未在站点发布'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="secondary" onClick={() => moveRelation(relation.id, -1)} disabled={index === 0}>
                        上移
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => moveRelation(relation.id, 1)} disabled={index === relations.length - 1}>
                        下移
                      </Button>
                      <button
                        type="button"
                        onClick={() => removeRelation(relation.id)}
                        className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-sm font-semibold hover:bg-rose-100"
                      >
                        移除
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3 mt-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">关联关系</label>
                      <select
                        value={relation.relationshipType}
                        onChange={(event) =>
                          updateRelation(relation.id, (current) => ({
                            ...current,
                            relationshipType: event.target.value as RelationshipType,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                      >
                        {RELATIONSHIP_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">作用范围</label>
                      <select
                        value={relation.relationType || 'course'}
                        onChange={(event) =>
                          updateRelation(relation.id, (current) => {
                            const nextRelationType = event.target.value as RelationType;
                            return {
                              ...current,
                              relationType: nextRelationType,
                              dayIndex: nextRelationType === 'module' ? current.dayIndex || dayOptions[0]?.value || null : null,
                            };
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                      >
                        {RELATION_SCOPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">对应课程天数</label>
                      <select
                        value={relation.relationType === 'module' ? String(relation.dayIndex || '') : ''}
                        onChange={(event) =>
                          updateRelation(relation.id, (current) => ({
                            ...current,
                            dayIndex: event.target.value ? Number.parseInt(event.target.value, 10) : null,
                          }))
                        }
                        disabled={relation.relationType !== 'module' || dayOptions.length === 0}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none disabled:opacity-50"
                      >
                        <option value="">不指定</option>
                        {dayOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">讲师备注（EN，可在国际站显示）</label>
                    <textarea
                      value={relation.instructorNoteEn || ''}
                      onChange={(event) =>
                        updateRelation(relation.id, (current) => ({
                          ...current,
                          instructorNoteEn: event.target.value,
                        }))
                      }
                      placeholder="例如：Recommended for wet lab practice and postoperative handling demos"
                      className="w-full min-h-[84px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none resize-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            当前课程还没有关联器械。建议至少配置一组“必备器械”或“讲师推荐”，这样课程详情页能更自然地承接到商品页。
          </div>
        )}

        {(saveError || saveSuccess) && (
          <div className={`rounded-2xl px-4 py-3 text-sm ${saveError ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {saveError || '课程器械关联已保存'}
          </div>
        )}
      </div>
    </Card>
  );
}