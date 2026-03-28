'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@vetsphere/shared/services/api';
import type { Course, Product, CourseProductRelation, RelationshipType, RelationType } from '@vetsphere/shared/types';

export default function CourseProductLinkingTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [relations, setRelations] = useState<CourseProductRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New relation form state
  const [newRelation, setNewRelation] = useState({
    productId: '',
    relationshipType: 'recommended' as RelationshipType,
    relationType: 'course' as RelationType,
    dayIndex: null as number | null,
    instructorNoteEn: '',
    instructorNoteTh: '',
    instructorNoteJa: '',
  });

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedCourses, fetchedProducts] = await Promise.all([
        api.getCourses(),
        api.getProducts(),
      ]);
      setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
      setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Filter published courses
  const publishedCourses = useMemo(() => 
    courses.filter(c => c.status === 'published'),
    [courses]
  );

  // Selected course object
  const selectedCourse = useMemo(() => 
    publishedCourses.find(c => c.id === selectedCourseId),
    [publishedCourses, selectedCourseId]
  );

  // Filtered products for adding
  const filteredProducts = useMemo(() => {
    const linkedProductIds = relations.map(r => r.productId);
    return products
      .filter(p => p.status?.toLowerCase() === 'published')
      .filter(p => !linkedProductIds.includes(p.id))
      .filter(p => {
        if (!searchQuery) return true;
        return p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [products, relations, searchQuery]);

  // Load relations when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setRelations([]);
      return;
    }

    setLoadingRelations(true);
    fetch(`/api/admin/course-products?courseId=${selectedCourseId}`)
      .then(res => res.json())
      .then(data => {
        setRelations(data.relations || []);
      })
      .catch(console.error)
      .finally(() => setLoadingRelations(false));
  }, [selectedCourseId]);

  const handleAddRelation = async () => {
    if (!selectedCourseId || !newRelation.productId) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/course-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          courseId: selectedCourseId,
          productId: newRelation.productId,
          relationshipType: newRelation.relationshipType,
          relationType: newRelation.relationType,
          dayIndex: newRelation.relationType === 'module' ? newRelation.dayIndex : null,
          instructorNoteEn: newRelation.instructorNoteEn || undefined,
          instructorNoteTh: newRelation.instructorNoteTh || undefined,
          instructorNoteJa: newRelation.instructorNoteJa || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to add relation');

      const data = await response.json();
      
      // Add to local state with product details
      const product = products.find(p => p.id === newRelation.productId);
      if (data.relation && product) {
        setRelations(prev => [...prev, { ...data.relation, product }]);
      }

      // Reset form
      setNewRelation({
        productId: '',
        relationshipType: 'recommended',
        relationType: 'course',
        dayIndex: null,
        instructorNoteEn: '',
        instructorNoteTh: '',
        instructorNoteJa: '',
      });
      setShowAddModal(false);
      setSearchQuery('');

    } catch (error) {
      console.error('Error adding relation:', error);
      alert('Failed to add product link');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRelation = async (relationId: string) => {
    if (!confirm('Remove this product from the course?')) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/course-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          relationId,
        }),
      });

      if (!response.ok) throw new Error('Failed to remove relation');

      setRelations(prev => prev.filter(r => r.id !== relationId));

    } catch (error) {
      console.error('Error removing relation:', error);
      alert('Failed to remove product link');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRelationType = async (relationId: string, newType: RelationshipType) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/course-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          relationId,
          relationshipType: newType,
        }),
      });

      if (!response.ok) throw new Error('Failed to update relation');

      setRelations(prev => prev.map(r => 
        r.id === relationId ? { ...r, relationshipType: newType } : r
      ));

    } catch (error) {
      console.error('Error updating relation:', error);
      alert('Failed to update relation type');
    } finally {
      setSaving(false);
    }
  };

  const getRelationBadgeColor = (type: RelationshipType) => {
    switch (type) {
      case 'required': return 'bg-red-100 text-red-700 border-red-200';
      case 'recommended': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">课程-设备关联管理</h2>
          <p className="text-sm text-gray-400 mt-1">
            将设备与培训课程关联，用于讲师推荐
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-2">加载数据...</p>
        </div>
      ) : (
        <>
          {/* Course Selector */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <label className="block text-sm font-bold text-gray-300 mb-2">选择课程</label>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full px-4 py-3 bg-[#0F172A] border border-blue-500/20 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500/40"
            >
              <option value="">-- 请选择一个课程 --</option>
              {publishedCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title} ({course.specialty} - {course.startDate})
                </option>
              ))}
            </select>
          </div>

          {/* Course Info Card */}
          {selectedCourse && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedCourse.imageUrl} 
                alt={selectedCourse.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{selectedCourse.title}</h3>
                <p className="text-sm text-gray-400">
                  {selectedCourse.specialty} • {selectedCourse.level} • {selectedCourse.startDate}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  讲师: {selectedCourse.instructor?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-400">{relations.length}</p>
                <p className="text-xs text-gray-500">关联设备</p>
              </div>
            </div>
          )}

          {/* Linked Products */}
          {selectedCourseId && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">已关联设备</h3>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  + 添加设备
                </button>
              </div>

              {loadingRelations ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-gray-400 mt-2">加载设备中...</p>
                </div>
              ) : relations.length === 0 ? (
                <div className="py-12 text-center bg-blue-500/5 border border-dashed border-blue-500/20 rounded-xl">
                  <p className="text-gray-400">该课程暂无关联设备</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-bold"
                  >
                    添加第一个设备
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {relations.map((relation, index) => {
                    const product = relation.product || products.find(p => p.id === relation.productId);
                    if (!product) return null;

                    return (
                      <div 
                        key={relation.id}
                        className="bg-[#0F172A] border border-blue-500/20 rounded-xl p-4 flex items-center gap-4"
                      >
                        <div className="text-gray-500 font-mono text-sm w-6">
                          #{index + 1}
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">{product.brand}</p>
                          <h4 className="font-bold text-slate-900 truncate">{product.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            {relation.relationType && relation.relationType !== 'course' && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                relation.relationType === 'instructor' 
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              }`}>
                                {relation.relationType === 'instructor' ? '讲师推荐' : '模块设备'}
                              </span>
                            )}
                            {relation.dayIndex && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                Day {relation.dayIndex}
                              </span>
                            )}
                          </div>
                          {relation.instructorNoteEn && (
                            <p className="text-xs text-amber-400 mt-1 italic truncate">
                              &quot;{relation.instructorNoteEn}&quot;
                            </p>
                          )}
                        </div>
                        <select
                          value={relation.relationshipType}
                          onChange={e => handleUpdateRelationType(relation.id, e.target.value as RelationshipType)}
                          disabled={saving}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getRelationBadgeColor(relation.relationshipType)} bg-transparent`}
                        >
                          <option value="required">必备</option>
                          <option value="recommended">推荐</option>
                          <option value="mentioned">提及</option>
                        </select>
                        <button
                          onClick={() => handleRemoveRelation(relation.id)}
                          disabled={saving}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          &#128465;
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Add Product Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-[#0F172A] border border-blue-500/20 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-5 border-b border-blue-500/10 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">添加设备到课程</h3>
                  <button 
                    onClick={() => {
                      setShowAddModal(false);
                      setSearchQuery('');
                      setNewRelation({
                        productId: '',
                        relationshipType: 'recommended',
                        relationType: 'course',
                        dayIndex: null,
                        instructorNoteEn: '',
                        instructorNoteTh: '',
                        instructorNoteJa: '',
                      });
                    }}
                    className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-gray-400 hover:bg-blue-500/20"
                  >
                    &#10005;
                  </button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5">搜索设备</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="按名称或品牌搜索..."
                      className="w-full px-4 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-slate-900 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                    />
                  </div>

                  {/* Product List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredProducts.slice(0, 20).map(product => (
                      <button
                        key={product.id}
                        onClick={() => setNewRelation(prev => ({ ...prev, productId: product.id }))}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          newRelation.productId === product.id 
                            ? 'bg-blue-500/20 border-2 border-blue-500' 
                            : 'bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-white" />
                        <div className="flex-1 text-left">
                          <p className="text-xs text-gray-500">{product.brand}</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
                        </div>
                        {newRelation.productId === product.id && (
                          <span className="text-blue-400">&#10003;</span>
                        )}
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="text-center text-gray-500 py-4">未找到设备</p>
                    )}
                  </div>

                  {/* Relationship Type */}
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5">关联类型</label>
                    <select
                      value={newRelation.relationshipType}
                      onChange={e => setNewRelation(prev => ({ ...prev, relationshipType: e.target.value as RelationshipType }))}
                      className="w-full px-4 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500/40"
                    >
                      <option value="required">必备 - 课程必需设备</option>
                      <option value="recommended">推荐 - 讲师推荐使用</option>
                      <option value="mentioned">提及 - 课程中有提到</option>
                    </select>
                  </div>

                  {/* Relation Scope */}
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5">推荐范围</label>
                    <div className="flex gap-2">
                      {([
                        { value: 'course', label: '课程通用', desc: '课程级别的设备推荐' },
                        { value: 'module', label: '模块/天数', desc: '关联到具体培训日' },
                        { value: 'instructor', label: '讲师推荐', desc: '讲师个人推荐工具' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewRelation(prev => ({ 
                            ...prev, 
                            relationType: opt.value,
                            dayIndex: opt.value !== 'module' ? null : prev.dayIndex,
                          }))}
                          className={`flex-1 p-3 rounded-xl border text-left transition-colors ${
                            newRelation.relationType === opt.value
                              ? 'bg-blue-500/20 border-blue-500 text-slate-900'
                              : 'bg-blue-500/5 border-blue-500/10 text-gray-400 hover:border-blue-500/30'
                          }`}
                        >
                          <p className="text-xs font-bold">{opt.label}</p>
                          <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Day Selection (only for module type) */}
                  {newRelation.relationType === 'module' && selectedCourse?.agenda && (
                    <div>
                      <label className="block text-sm font-bold text-gray-300 mb-1.5">
                        关联培训日 <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={newRelation.dayIndex ?? ''}
                        onChange={e => setNewRelation(prev => ({ 
                          ...prev, 
                          dayIndex: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        className="w-full px-4 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500/40"
                      >
                        <option value="">-- 请选择培训日 --</option>
                        {selectedCourse.agenda.map((day, idx) => (
                          <option key={idx} value={idx + 1}>
                            {day.day} - {day.date}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Instructor Note */}
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5">讲师备注 (英文)</label>
                    <textarea
                      value={newRelation.instructorNoteEn}
                      onChange={e => setNewRelation(prev => ({ ...prev, instructorNoteEn: e.target.value }))}
                      placeholder="可选: 讲师关于为什么推荐这个设备的备注..."
                      rows={2}
                      className="w-full px-4 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-slate-900 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 resize-none"
                    />
                  </div>
                </div>

                <div className="p-5 border-t border-blue-500/10 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-slate-900 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddRelation}
                    disabled={!newRelation.productId || saving}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '添加中...' : '添加设备'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
