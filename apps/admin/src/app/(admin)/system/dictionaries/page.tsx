'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dictionary, DictionaryItem } from '@/types/admin';
import {
  Card,
  Button,
  Input,
  StatusBadge,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
} from '@/components/ui';

export default function DictionariesPage() {
  const supabase = createClient();
  
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, system: 0, custom: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 当前展开的字典
  const [expandedDict, setExpandedDict] = useState<string | null>(null);
  const [dictItems, setDictItems] = useState<DictionaryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // 编辑字典弹窗
  const [showDictDialog, setShowDictDialog] = useState(false);
  const [editingDict, setEditingDict] = useState<Dictionary | null>(null);
  const [dictForm, setDictForm] = useState({ code: '', name: '', description: '' });
  const [dialogLoading, setDialogLoading] = useState(false);
  
  // 编辑字典项弹窗
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    code: '',
    label: '',
    label_en: '',
    value: '',
    description: '',
    display_order: 0,
    is_active: true,
  });
  
  // 删除确认
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DictionaryItem | null>(null);

  useEffect(() => {
    loadDictionaries();
  }, [searchKeyword]);

  async function loadDictionaries() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('dictionaries')
        .select('*')
        .order('is_system', { ascending: false })
        .order('code');
      
      if (searchKeyword) {
        query = query.or(`code.ilike.%${searchKeyword}%,name.ilike.%${searchKeyword}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setDictionaries(data || []);
      
      const systemCount = (data || []).filter(d => d.is_system).length;
      setStats({
        total: (data || []).length,
        system: systemCount,
        custom: (data || []).length - systemCount,
      });
    } catch (error) {
      console.error('加载字典列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  // 加载字典项
  async function loadDictItems(dictId: string) {
    setLoadingItems(true);
    
    try {
      const { data, error } = await supabase
        .from('dictionary_items')
        .select('*')
        .eq('dict_id', dictId)
        .order('display_order')
        .order('code');
      
      if (error) throw error;
      
      setDictItems(data || []);
    } catch (error) {
      console.error('加载字典项失败:', error);
    } finally {
      setLoadingItems(false);
    }
  }

  // 展开/收起字典
  function toggleExpand(dictId: string) {
    if (expandedDict === dictId) {
      setExpandedDict(null);
      setDictItems([]);
    } else {
      setExpandedDict(dictId);
      loadDictItems(dictId);
    }
  }

  // 打开编辑字典弹窗
  function openDictDialog(dict?: Dictionary) {
    if (dict) {
      setEditingDict(dict);
      setDictForm({
        code: dict.code,
        name: dict.name,
        description: dict.description || '',
      });
    } else {
      setEditingDict(null);
      setDictForm({ code: '', name: '', description: '' });
    }
    setShowDictDialog(true);
  }

  // 保存字典
  async function handleSaveDict() {
    if (!dictForm.code || !dictForm.name) return;
    
    setDialogLoading(true);
    try {
      if (editingDict) {
        const { error } = await supabase
          .from('dictionaries')
          .update({
            name: dictForm.name,
            description: dictForm.description || null,
          })
          .eq('id', editingDict.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dictionaries')
          .insert({
            code: dictForm.code,
            name: dictForm.name,
            description: dictForm.description || null,
            is_system: false,
            is_active: true,
          });
        
        if (error) throw error;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: editingDict ? 'update' : 'create',
        target_type: 'dictionary',
        target_id: editingDict?.id,
        target_name: dictForm.name,
        changes_summary: `${editingDict ? '更新' : '创建'}字典: ${dictForm.name}`,
      });
      
      setShowDictDialog(false);
      setEditingDict(null);
      loadDictionaries();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 打开编辑字典项弹窗
  function openItemDialog(item?: DictionaryItem) {
    if (item) {
      setEditingItem(item);
      setItemForm({
        code: item.code,
        label: item.label,
        label_en: item.label_en || '',
        value: item.value || '',
        description: item.description || '',
        display_order: item.display_order,
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        code: '',
        label: '',
        label_en: '',
        value: '',
        description: '',
        display_order: dictItems.length + 1,
        is_active: true,
      });
    }
    setShowItemDialog(true);
  }

  // 保存字典项
  async function handleSaveItem() {
    if (!itemForm.code || !itemForm.label || !expandedDict) return;
    
    setDialogLoading(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('dictionary_items')
          .update({
            label: itemForm.label,
            label_en: itemForm.label_en || null,
            value: itemForm.value || null,
            description: itemForm.description || null,
            display_order: itemForm.display_order,
            is_active: itemForm.is_active,
          })
          .eq('id', editingItem.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dictionary_items')
          .insert({
            dict_id: expandedDict,
            code: itemForm.code,
            label: itemForm.label,
            label_en: itemForm.label_en || null,
            value: itemForm.value || null,
            description: itemForm.description || null,
            display_order: itemForm.display_order,
            is_active: itemForm.is_active,
          });
        
        if (error) throw error;
      }
      
      setShowItemDialog(false);
      setEditingItem(null);
      loadDictItems(expandedDict);
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 删除字典项
  async function handleDeleteItem() {
    if (!itemToDelete || !expandedDict) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('dictionary_items')
        .delete()
        .eq('id', itemToDelete.id);
      
      if (error) throw error;
      
      setShowDeleteDialog(false);
      setItemToDelete(null);
      loadDictItems(expandedDict);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">字典管理</h1>
          <p className="text-slate-400 mt-1">管理系统枚举值与配置项</p>
        </div>
        <Button onClick={() => openDictDialog()}>
          新建字典
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="总字典数" value={stats.total} />
        <StatCard label="系统字典" value={stats.system} />
        <StatCard label="自定义字典" value={stats.custom} />
      </div>

      {/* 搜索栏 */}
      <Card>
        <Input
          placeholder="搜索字典代码、名称..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      </Card>

      {/* 字典列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : dictionaries.length === 0 ? (
          <EmptyState
            title="暂无字典"
            description="点击上方按钮创建第一个字典"
          />
        ) : (
          <div className="divide-y divide-slate-700/50">
            {dictionaries.map((dict) => (
              <div key={dict.id}>
                {/* 字典行 */}
                <div
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(dict.id)}
                >
                  <div className="flex items-center gap-4">
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${expandedDict === dict.id ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{dict.name}</span>
                        <code className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                          {dict.code}
                        </code>
                        {dict.is_system && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                            系统
                          </span>
                        )}
                      </div>
                      {dict.description && (
                        <p className="text-sm text-slate-500 mt-0.5">{dict.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {!dict.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDictDialog(dict)}
                      >
                        编辑
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* 字典项列表 */}
                {expandedDict === dict.id && (
                  <div className="bg-slate-800/20 border-t border-slate-700/50">
                    <div className="px-6 py-3 flex items-center justify-between border-b border-slate-700/30">
                      <span className="text-sm text-slate-400">字典项</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openItemDialog()}
                      >
                        添加项
                      </Button>
                    </div>
                    
                    {loadingItems ? (
                      <div className="p-6">
                        <LoadingState />
                      </div>
                    ) : dictItems.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">
                        暂无字典项，点击上方按钮添加
                      </div>
                    ) : (
                      <TableContainer>
                        <table className="w-full">
                          <thead className="bg-slate-800/30">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">代码</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">标签</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">英文标签</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">值</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">排序</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">状态</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/30">
                            {dictItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-800/20">
                                <td className="px-6 py-3">
                                  <code className="text-xs text-slate-400">{item.code}</code>
                                </td>
                                <td className="px-6 py-3 text-sm text-white">{item.label}</td>
                                <td className="px-6 py-3 text-sm text-slate-400">{item.label_en || '-'}</td>
                                <td className="px-6 py-3 text-sm text-slate-400">{item.value || '-'}</td>
                                <td className="px-6 py-3 text-sm text-slate-500">{item.display_order}</td>
                                <td className="px-6 py-3">
                                  {item.is_active ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">
                                      启用
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-500/20 text-slate-400">
                                      禁用
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openItemDialog(item)}
                                    >
                                      编辑
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setItemToDelete(item);
                                        setShowDeleteDialog(true);
                                      }}
                                    >
                                      删除
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </TableContainer>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 编辑字典弹窗 */}
      {showDictDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingDict ? '编辑字典' : '新建字典'}
            </h3>
            
            <div className="space-y-4">
              <Input
                label="字典代码"
                placeholder="如: clinic_stage"
                value={dictForm.code}
                onChange={(e) => setDictForm(prev => ({ ...prev, code: e.target.value }))}
                disabled={!!editingDict}
              />
              <Input
                label="字典名称"
                placeholder="如: 诊所阶段"
                value={dictForm.name}
                onChange={(e) => setDictForm(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="描述（可选）"
                placeholder="字典的用途说明"
                value={dictForm.description}
                onChange={(e) => setDictForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDictDialog(false);
                  setEditingDict(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSaveDict}
                loading={dialogLoading}
                disabled={!dictForm.code || !dictForm.name}
              >
                {editingDict ? '保存' : '创建'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑字典项弹窗 */}
      {showItemDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingItem ? '编辑字典项' : '新建字典项'}
            </h3>
            
            <div className="space-y-4">
              <Input
                label="项代码"
                placeholder="如: startup"
                value={itemForm.code}
                onChange={(e) => setItemForm(prev => ({ ...prev, code: e.target.value }))}
                disabled={!!editingItem}
              />
              <Input
                label="中文标签"
                placeholder="如: 创业期"
                value={itemForm.label}
                onChange={(e) => setItemForm(prev => ({ ...prev, label: e.target.value }))}
              />
              <Input
                label="英文标签（可选）"
                placeholder="如: Startup"
                value={itemForm.label_en}
                onChange={(e) => setItemForm(prev => ({ ...prev, label_en: e.target.value }))}
              />
              <Input
                label="值（可选）"
                placeholder="附加值"
                value={itemForm.value}
                onChange={(e) => setItemForm(prev => ({ ...prev, value: e.target.value }))}
              />
              <Input
                label="排序"
                type="number"
                value={itemForm.display_order.toString()}
                onChange={(e) => setItemForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemForm.is_active}
                  onChange={(e) => setItemForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500"
                />
                <span className="text-sm text-slate-300">启用此项</span>
              </label>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowItemDialog(false);
                  setEditingItem(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSaveItem}
                loading={dialogLoading}
                disabled={!itemForm.code || !itemForm.label}
              >
                {editingItem ? '保存' : '添加'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="删除字典项"
        message={`确定要删除字典项 "${itemToDelete?.label}" 吗？此操作不可撤销。`}
        confirmText="确认删除"
        onConfirm={handleDeleteItem}
        onCancel={() => {
          setShowDeleteDialog(false);
          setItemToDelete(null);
        }}
        loading={dialogLoading}
        danger
      />
    </div>
  );
}
