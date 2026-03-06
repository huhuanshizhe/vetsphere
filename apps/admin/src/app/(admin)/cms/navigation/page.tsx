'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSite } from '@/context/SiteContext';
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

interface NavConfig {
  id: string;
  site_code: string;
  nav_type: 'header' | 'footer' | 'sidebar';
  label: string;
  label_en?: string;
  href: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  parent_id?: string;
  open_in_new_tab: boolean;
  created_at: string;
}

export default function CmsNavigationPage() {
  const supabase = createClient();
  const { currentSite } = useSite();

  const [items, setItems] = useState<NavConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [navType, setNavType] = useState<string>('header');

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<NavConfig | null>(null);
  const [editForm, setEditForm] = useState({ label: '', label_en: '', href: '', icon: '', display_order: 0, is_active: true, open_in_new_tab: false });
  const [dialogLoading, setDialogLoading] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<NavConfig | null>(null);

  useEffect(() => {
    loadItems();
  }, [navType, currentSite]);

  async function loadItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('navigation_configs')
        .select('*')
        .eq('site_code', currentSite)
        .eq('nav_type', navType)
        .is('parent_id', null)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('加载导航配置失败:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingItem(null);
    setEditForm({ label: '', label_en: '', href: '', icon: '', display_order: items.length, is_active: true, open_in_new_tab: false });
    setShowEditDialog(true);
  }

  function openEdit(item: NavConfig) {
    setEditingItem(item);
    setEditForm({
      label: item.label,
      label_en: item.label_en || '',
      href: item.href,
      icon: item.icon || '',
      display_order: item.display_order,
      is_active: item.is_active,
      open_in_new_tab: item.open_in_new_tab,
    });
    setShowEditDialog(true);
  }

  async function handleSave() {
    if (!editForm.label.trim() || !editForm.href.trim()) return;
    setDialogLoading(true);
    try {
      const payload = {
        site_code: currentSite,
        nav_type: navType,
        label: editForm.label.trim(),
        label_en: editForm.label_en.trim() || null,
        href: editForm.href.trim(),
        icon: editForm.icon.trim() || null,
        display_order: editForm.display_order,
        is_active: editForm.is_active,
        open_in_new_tab: editForm.open_in_new_tab,
      };

      if (editingItem) {
        const { error } = await supabase.from('navigation_configs').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('navigation_configs').insert(payload);
        if (error) throw error;
      }

      setShowEditDialog(false);
      loadItems();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return;
    setDialogLoading(true);
    try {
      const { error } = await supabase.from('navigation_configs').delete().eq('id', itemToDelete.id);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">导航配置</h1>
          <p className="text-slate-500 mt-1">管理 {currentSite.toUpperCase()} 站点的导航菜单</p>
        </div>
        <Button onClick={openCreate}>新增导航项</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="当前站点" value={currentSite.toUpperCase()} />
        <StatCard label="导航类型" value={navType === 'header' ? '顶部导航' : navType === 'footer' ? '底部导航' : '侧边栏'} />
        <StatCard label="菜单项数" value={items.length} />
      </div>

      {/* 导航类型选择 */}
      <Card>
        <div className="flex gap-2">
          {[
            { key: 'header', label: '顶部导航' },
            { key: 'footer', label: '底部导航' },
            { key: 'sidebar', label: '侧边栏' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setNavType(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                navType === t.key ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-500 hover:text-slate-900 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState title="暂无导航配置" description="点击上方按钮添加第一个导航项" />
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">排序</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">图标</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">标签</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">链接</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">新窗口</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-sm">{item.display_order}</td>
                    <td className="px-6 py-4 text-xl">{item.icon || '-'}</td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-slate-900 font-medium">{item.label}</span>
                        {item.label_en && <div className="text-xs text-slate-500">{item.label_en}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4"><code className="text-sm text-emerald-400">{item.href}</code></td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{item.open_in_new_tab ? '是' : '否'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-500'}`}>
                        {item.is_active ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>编辑</Button>
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

      {/* 编辑/新建对话框 */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowEditDialog(false)} />
          <div className="relative bg-slate-950 border border-slate-200/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{editingItem ? '编辑导航项' : '新增导航项'}</h3>
            <div className="space-y-4">
              <Input label="标签 *" value={editForm.label} onChange={(e) => setEditForm(f => ({ ...f, label: e.target.value }))} placeholder="导航显示文字" />
              <Input label="英文标签" value={editForm.label_en} onChange={(e) => setEditForm(f => ({ ...f, label_en: e.target.value }))} placeholder="English label" />
              <Input label="链接 *" value={editForm.href} onChange={(e) => setEditForm(f => ({ ...f, href: e.target.value }))} placeholder="/courses" />
              <Input label="图标" value={editForm.icon} onChange={(e) => setEditForm(f => ({ ...f, icon: e.target.value }))} placeholder="Emoji 或图标" />
              <Input label="排序" type="number" value={String(editForm.display_order)} onChange={(e) => setEditForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                  启用
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={editForm.open_in_new_tab} onChange={(e) => setEditForm(f => ({ ...f, open_in_new_tab: e.target.checked }))} className="rounded" />
                  新窗口打开
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowEditDialog(false)}>取消</Button>
              <Button onClick={handleSave} loading={dialogLoading} disabled={!editForm.label.trim() || !editForm.href.trim()}>保存</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="删除导航项"
        message={`确定要删除导航项 "${itemToDelete?.label}" 吗？`}
        confirmText="确认删除"
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteDialog(false); setItemToDelete(null); }}
        loading={dialogLoading}
        danger
      />
    </div>
  );
}
