'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Input,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
} from '@/components/ui';

interface SceneCategory {
  id: string;
  code: string;
  name: string;
  name_en?: string;
  description?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  product_count?: number;
  created_at: string;
}

export default function ShopScenesPage() {
  const supabase = createClient();

  const [scenes, setScenes] = useState<SceneCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0 });

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingScene, setEditingScene] = useState<SceneCategory | null>(null);
  const [editForm, setEditForm] = useState({ code: '', name: '', name_en: '', description: '', icon: '', display_order: 0 });
  const [dialogLoading, setDialogLoading] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState<SceneCategory | null>(null);

  useEffect(() => {
    loadScenes();
  }, []);

  async function loadScenes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scene_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Count products per scene
      const scenesWithCount = await Promise.all((data || []).map(async (scene) => {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('scene_code', scene.code)
          .is('deleted_at', null);
        return { ...scene, product_count: count || 0 };
      }));

      setScenes(scenesWithCount);
      setStats({
        total: scenesWithCount.length,
        active: scenesWithCount.filter(s => s.is_active).length,
      });
    } catch (error) {
      console.error('加载采购场景失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingScene(null);
    setEditForm({ code: '', name: '', name_en: '', description: '', icon: '', display_order: scenes.length });
    setShowEditDialog(true);
  }

  function openEditDialog(scene: SceneCategory) {
    setEditingScene(scene);
    setEditForm({
      code: scene.code,
      name: scene.name,
      name_en: scene.name_en || '',
      description: scene.description || '',
      icon: scene.icon || '',
      display_order: scene.display_order,
    });
    setShowEditDialog(true);
  }

  async function handleSave() {
    if (!editForm.code.trim() || !editForm.name.trim()) return;
    setDialogLoading(true);
    try {
      const payload = {
        code: editForm.code.trim(),
        name: editForm.name.trim(),
        name_en: editForm.name_en.trim() || null,
        description: editForm.description.trim() || null,
        icon: editForm.icon.trim() || null,
        display_order: editForm.display_order,
        is_active: true,
      };

      if (editingScene) {
        const { error } = await supabase.from('scene_categories').update(payload).eq('id', editingScene.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('scene_categories').insert(payload);
        if (error) throw error;
      }

      setShowEditDialog(false);
      loadScenes();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请检查 code 是否重复');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleToggleActive(scene: SceneCategory) {
    try {
      const { error } = await supabase.from('scene_categories').update({ is_active: !scene.is_active }).eq('id', scene.id);
      if (error) throw error;
      loadScenes();
    } catch (error) {
      console.error('操作失败:', error);
    }
  }

  async function handleDelete() {
    if (!sceneToDelete) return;
    setDialogLoading(true);
    try {
      const { error } = await supabase.from('scene_categories').delete().eq('id', sceneToDelete.id);
      if (error) throw error;
      setShowDeleteDialog(false);
      setSceneToDelete(null);
      loadScenes();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，可能有商品正在使用此场景');
    } finally {
      setDialogLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">采购场景</h1>
          <p className="text-slate-400 mt-1">管理商品的采购场景分类</p>
        </div>
        <Button onClick={openCreateDialog}>新增场景</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="总场景数" value={stats.total} />
        <StatCard label="已启用" value={stats.active} />
      </div>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : scenes.length === 0 ? (
          <EmptyState title="暂无采购场景" description="点击上方按钮创建第一个采购场景" />
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">排序</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">图标</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">名称</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">英文名</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">商品数</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {scenes.map((scene) => (
                  <tr key={scene.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-400 text-sm">{scene.display_order}</td>
                    <td className="px-6 py-4 text-xl">{scene.icon || '-'}</td>
                    <td className="px-6 py-4"><code className="text-sm text-emerald-400">{scene.code}</code></td>
                    <td className="px-6 py-4 text-white font-medium">{scene.name}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{scene.name_en || '-'}</td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{scene.product_count}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${scene.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {scene.is_active ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEditDialog(scene)}>编辑</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(scene)}>
                          {scene.is_active ? '禁用' : '启用'}
                        </Button>
                        {(scene.product_count || 0) === 0 && (
                          <Button variant="ghost" size="sm" onClick={() => { setSceneToDelete(scene); setShowDeleteDialog(true); }}>删除</Button>
                        )}
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
          <div className="relative bg-slate-950 border border-slate-700/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">{editingScene ? '编辑采购场景' : '新增采购场景'}</h3>
            <div className="space-y-4">
              <Input label="Code *" value={editForm.code} onChange={(e) => setEditForm(f => ({ ...f, code: e.target.value }))} placeholder="如：surgery_room" disabled={!!editingScene} />
              <Input label="名称 *" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="如：手术室设备" />
              <Input label="英文名" value={editForm.name_en} onChange={(e) => setEditForm(f => ({ ...f, name_en: e.target.value }))} placeholder="如：Surgery Room" />
              <Input label="图标 (Emoji)" value={editForm.icon} onChange={(e) => setEditForm(f => ({ ...f, icon: e.target.value }))} placeholder="如：🏥" />
              <Input label="描述" value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="场景描述" />
              <Input label="排序" type="number" value={String(editForm.display_order)} onChange={(e) => setEditForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowEditDialog(false)}>取消</Button>
              <Button onClick={handleSave} loading={dialogLoading} disabled={!editForm.code.trim() || !editForm.name.trim()}>保存</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="删除采购场景"
        message={`确定要删除采购场景 "${sceneToDelete?.name}" 吗？此操作不可恢复。`}
        confirmText="确认删除"
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteDialog(false); setSceneToDelete(null); }}
        loading={dialogLoading}
        danger
      />
    </div>
  );
}
