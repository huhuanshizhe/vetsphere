'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Input,
  Select,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
} from '@/components/ui';

interface DictionaryGroup {
  id: string;
  group_key: string;
  group_name: string;
  description?: string;
  items: DictionaryItem[];
}

interface DictionaryItem {
  id: string;
  group_key: string;
  item_key: string;
  label_zh: string;
  label_en?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// 课程相关的字典分组
const COURSE_DICT_GROUPS = [
  { key: 'course_specialty', name: '课程专业方向', description: '如：小动物内科、外科、影像等' },
  { key: 'course_level', name: '课程难度等级', description: '如：入门、进阶、高级' },
  { key: 'course_format', name: '课程形式', description: '如：视频、直播、图文、系列' },
  { key: 'course_tag', name: '课程标签', description: '如：热门、新课、限时等' },
  { key: 'product_category', name: '商品分类', description: '如：设备、耗材、器械' },
  { key: 'product_specialty', name: '商品专业方向', description: '如：外科、影像、检验等' },
];

export default function CourseDictionariesPage() {
  const supabase = createClient();

  const [groups, setGroups] = useState<DictionaryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>(COURSE_DICT_GROUPS[0].key);
  const [items, setItems] = useState<DictionaryItem[]>([]);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
  const [editForm, setEditForm] = useState({ item_key: '', label_zh: '', label_en: '', display_order: 0 });
  const [dialogLoading, setDialogLoading] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DictionaryItem | null>(null);

  useEffect(() => {
    loadItems();
  }, [selectedGroup]);

  async function loadItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dictionary_items')
        .select('*')
        .eq('group_key', selectedGroup)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('加载字典项失败:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function openAddDialog() {
    setEditingItem(null);
    setEditForm({ item_key: '', label_zh: '', label_en: '', display_order: items.length });
    setShowAddDialog(true);
  }

  function openEditDialog(item: DictionaryItem) {
    setEditingItem(item);
    setEditForm({
      item_key: item.item_key,
      label_zh: item.label_zh,
      label_en: item.label_en || '',
      display_order: item.display_order,
    });
    setShowAddDialog(true);
  }

  async function handleSave() {
    if (!editForm.item_key.trim() || !editForm.label_zh.trim()) return;
    setDialogLoading(true);
    try {
      const payload = {
        group_key: selectedGroup,
        item_key: editForm.item_key.trim(),
        label_zh: editForm.label_zh.trim(),
        label_en: editForm.label_en.trim() || null,
        display_order: editForm.display_order,
        is_active: true,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('dictionary_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('dictionary_items').insert(payload);
        if (error) throw error;
      }

      setShowAddDialog(false);
      loadItems();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请检查 item_key 是否重复');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleToggleActive(item: DictionaryItem) {
    try {
      const { error } = await supabase
        .from('dictionary_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);
      if (error) throw error;
      loadItems();
    } catch (error) {
      console.error('操作失败:', error);
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return;
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('dictionary_items')
        .delete()
        .eq('id', itemToDelete.id);
      if (error) throw error;
      setShowDeleteDialog(false);
      setItemToDelete(null);
      loadItems();
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setDialogLoading(false);
    }
  }

  const currentGroupInfo = COURSE_DICT_GROUPS.find(g => g.key === selectedGroup);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">课程筛选字典</h1>
        <p className="text-slate-500 mt-1">管理课程和商品的分类、标签等筛选维度</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="当前分组" value={currentGroupInfo?.name || selectedGroup} />
        <StatCard label="字典项数" value={items.length} />
        <StatCard label="已启用" value={items.filter(i => i.is_active).length} />
      </div>

      {/* 分组选择 */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {COURSE_DICT_GROUPS.map(g => (
              <button
                key={g.key}
                onClick={() => setSelectedGroup(g.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedGroup === g.key
                    ? 'bg-emerald-500 text-black'
                    : 'bg-white/5 text-slate-500 hover:text-slate-900 hover:bg-white/10'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openAddDialog}>新增字典项</Button>
        </div>
        {currentGroupInfo?.description && (
          <p className="text-xs text-slate-500 mt-3">{currentGroupInfo.description}</p>
        )}
      </Card>

      {/* 字典项列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState title="暂无字典项" description="点击上方按钮添加第一个字典项" />
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">排序</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Key</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">中文标签</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">英文标签</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-sm">{item.display_order}</td>
                    <td className="px-6 py-4"><code className="text-sm text-emerald-400">{item.item_key}</code></td>
                    <td className="px-6 py-4 text-slate-900 text-sm font-medium">{item.label_zh}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{item.label_en || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-500'}`}>
                        {item.is_active ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEditDialog(item)}>编辑</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(item)}>
                          {item.is_active ? '禁用' : '启用'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setItemToDelete(item); setShowDeleteDialog(true); }}>删除</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>

      {/* 新增/编辑对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddDialog(false)} />
          <div className="relative bg-slate-950 border border-slate-200/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{editingItem ? '编辑字典项' : '新增字典项'}</h3>
            <div className="space-y-4">
              <Input
                label="Key *"
                value={editForm.item_key}
                onChange={(e) => setEditForm(f => ({ ...f, item_key: e.target.value }))}
                placeholder="如：surgery, beginner"
                disabled={!!editingItem}
              />
              <Input label="中文标签 *" value={editForm.label_zh} onChange={(e) => setEditForm(f => ({ ...f, label_zh: e.target.value }))} placeholder="如：外科" />
              <Input label="英文标签" value={editForm.label_en} onChange={(e) => setEditForm(f => ({ ...f, label_en: e.target.value }))} placeholder="如：Surgery" />
              <Input
                label="排序"
                type="number"
                value={String(editForm.display_order)}
                onChange={(e) => setEditForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowAddDialog(false)}>取消</Button>
              <Button onClick={handleSave} loading={dialogLoading} disabled={!editForm.item_key.trim() || !editForm.label_zh.trim()}>保存</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="删除字典项"
        message={`确定要删除字典项 "${itemToDelete?.label_zh}" 吗？此操作不可恢复。`}
        confirmText="确认删除"
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteDialog(false); setItemToDelete(null); }}
        loading={dialogLoading}
        danger
      />
    </div>
  );
}
