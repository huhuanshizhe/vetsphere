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

interface AiFeature {
  id: string;
  feature_key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  model_provider?: string;
  model_name?: string;
  config?: Record<string, any>;
  site_code?: string;
  created_at: string;
  updated_at: string;
}

export default function AiFeaturesPage() {
  const supabase = createClient();

  const [features, setFeatures] = useState<AiFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, enabled: 0, disabled: 0 });

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFeature, setEditingFeature] = useState<AiFeature | null>(null);
  const [editForm, setEditForm] = useState({
    feature_key: '', name: '', description: '', is_enabled: true,
    model_provider: '', model_name: '',
  });
  const [dialogLoading, setDialogLoading] = useState(false);

  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [featureToToggle, setFeatureToToggle] = useState<AiFeature | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  async function loadFeatures() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_features')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeatures(data || []);
      setStats({
        total: (data || []).length,
        enabled: (data || []).filter(f => f.is_enabled).length,
        disabled: (data || []).filter(f => !f.is_enabled).length,
      });
    } catch (error) {
      console.error('加载AI功能列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingFeature(null);
    setEditForm({ feature_key: '', name: '', description: '', is_enabled: true, model_provider: '', model_name: '' });
    setShowEditDialog(true);
  }

  function openEdit(feature: AiFeature) {
    setEditingFeature(feature);
    setEditForm({
      feature_key: feature.feature_key,
      name: feature.name,
      description: feature.description || '',
      is_enabled: feature.is_enabled,
      model_provider: feature.model_provider || '',
      model_name: feature.model_name || '',
    });
    setShowEditDialog(true);
  }

  async function handleSave() {
    if (!editForm.feature_key.trim() || !editForm.name.trim()) return;
    setDialogLoading(true);
    try {
      const payload = {
        feature_key: editForm.feature_key.trim(),
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        is_enabled: editForm.is_enabled,
        model_provider: editForm.model_provider.trim() || null,
        model_name: editForm.model_name.trim() || null,
      };

      if (editingFeature) {
        const { error } = await supabase.from('ai_features').update(payload).eq('id', editingFeature.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_features').insert(payload);
        if (error) throw error;
      }

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'ai',
        action: editingFeature ? 'update' : 'create',
        target_type: 'ai_feature',
        target_name: editForm.name,
        changes_summary: `${editingFeature ? '更新' : '创建'}AI功能: ${editForm.name}`,
      });

      setShowEditDialog(false);
      loadFeatures();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleToggle() {
    if (!featureToToggle) return;
    setDialogLoading(true);
    try {
      const newEnabled = !featureToToggle.is_enabled;
      const { error } = await supabase
        .from('ai_features')
        .update({ is_enabled: newEnabled })
        .eq('id', featureToToggle.id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'ai',
        action: newEnabled ? 'enable' : 'disable',
        target_type: 'ai_feature',
        target_id: featureToToggle.id,
        target_name: featureToToggle.name,
        changes_summary: `${newEnabled ? '启用' : '禁用'}AI功能: ${featureToToggle.name}`,
      });

      setShowToggleDialog(false);
      setFeatureToToggle(null);
      loadFeatures();
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      setDialogLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI 功能开关</h1>
          <p className="text-slate-400 mt-1">管理平台 AI 功能的启用和配置</p>
        </div>
        <Button onClick={openCreate}>新增功能</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="总功能数" value={stats.total} />
        <StatCard label="已启用" value={stats.enabled} />
        <StatCard label="已禁用" value={stats.disabled} />
      </div>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : features.length === 0 ? (
          <EmptyState title="暂无 AI 功能" description="点击上方按钮创建第一个 AI 功能" />
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">功能</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Key</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">模型</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {features.map((feature) => (
                  <tr key={feature.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-white font-medium">{feature.name}</span>
                        {feature.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{feature.description}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4"><code className="text-sm text-emerald-400">{feature.feature_key}</code></td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {feature.model_provider ? `${feature.model_provider}/${feature.model_name || ''}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        feature.is_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {feature.is_enabled ? '已启用' : '已禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(feature)}>编辑</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setFeatureToToggle(feature); setShowToggleDialog(true); }}>
                          {feature.is_enabled ? '禁用' : '启用'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>

      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowEditDialog(false)} />
          <div className="relative bg-slate-950 border border-slate-700/50 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">{editingFeature ? '编辑AI功能' : '新增AI功能'}</h3>
            <div className="space-y-4">
              <Input label="Feature Key *" value={editForm.feature_key} onChange={(e) => setEditForm(f => ({ ...f, feature_key: e.target.value }))} placeholder="如：ai_course_summary" disabled={!!editingFeature} />
              <Input label="名称 *" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="如：AI课程摘要生成" />
              <Input label="描述" value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="功能描述" />
              <Input label="模型供应商" value={editForm.model_provider} onChange={(e) => setEditForm(f => ({ ...f, model_provider: e.target.value }))} placeholder="如：gemini, dashscope" />
              <Input label="模型名称" value={editForm.model_name} onChange={(e) => setEditForm(f => ({ ...f, model_name: e.target.value }))} placeholder="如：gemini-1.5-flash" />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowEditDialog(false)}>取消</Button>
              <Button onClick={handleSave} loading={dialogLoading} disabled={!editForm.feature_key.trim() || !editForm.name.trim()}>保存</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showToggleDialog}
        title={featureToToggle?.is_enabled ? '禁用功能' : '启用功能'}
        message={`确定要${featureToToggle?.is_enabled ? '禁用' : '启用'} AI 功能 "${featureToToggle?.name}" 吗？`}
        confirmText="确认"
        onConfirm={handleToggle}
        onCancel={() => { setShowToggleDialog(false); setFeatureToToggle(null); }}
        loading={dialogLoading}
        danger={featureToToggle?.is_enabled}
      />
    </div>
  );
}
