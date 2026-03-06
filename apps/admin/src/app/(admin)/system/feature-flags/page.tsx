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
  Pagination,
} from '@/components/ui';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  rollout_percentage: number;
  target_users?: string[];
  target_roles?: string[];
  start_at?: string;
  end_at?: string;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 20;

export default function FeatureFlagsPage() {
  const supabase = createClient();
  
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, enabled: 0, disabled: 0, partial: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [flagToAction, setFlagToAction] = useState<FeatureFlag | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [flagToEdit, setFlagToEdit] = useState<FeatureFlag | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadFlags();
  }, [filterStatus, searchKeyword, page]);

  async function loadFlags() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('feature_flags')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterStatus === 'enabled') {
        query = query.eq('is_enabled', true).eq('rollout_percentage', 100);
      } else if (filterStatus === 'disabled') {
        query = query.eq('is_enabled', false);
      } else if (filterStatus === 'partial') {
        query = query.eq('is_enabled', true).lt('rollout_percentage', 100);
      }
      
      if (searchKeyword) {
        query = query.or(`key.ilike.%${searchKeyword}%,name.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setFlags(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载功能开关失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [totalRes, enabledRes, disabledRes, partialRes] = await Promise.all([
      supabase.from('feature_flags').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('feature_flags').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_enabled', true).eq('rollout_percentage', 100),
      supabase.from('feature_flags').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_enabled', false),
      supabase.from('feature_flags').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_enabled', true).lt('rollout_percentage', 100),
    ]);
    
    setStats({
      total: totalRes.count || 0,
      enabled: enabledRes.count || 0,
      disabled: disabledRes.count || 0,
      partial: partialRes.count || 0,
    });
  }

  async function handleToggleFlag() {
    if (!flagToAction) return;
    
    setDialogLoading(true);
    try {
      const newEnabled = !flagToAction.is_enabled;
      
      const { error } = await supabase
        .from('feature_flags')
        .update({ 
          is_enabled: newEnabled,
          rollout_percentage: newEnabled ? 100 : 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', flagToAction.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: newEnabled ? 'enable' : 'disable',
        target_type: 'feature_flag',
        target_id: flagToAction.id,
        target_name: flagToAction.name,
        changes_summary: `${newEnabled ? '启用' : '禁用'}功能开关: ${flagToAction.name}`,
      });
      
      setShowActionDialog(false);
      setFlagToAction(null);
      loadFlags();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleSaveFlag() {
    if (!flagToEdit) return;
    
    setDialogLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (flagToEdit.id) {
        const { error } = await supabase
          .from('feature_flags')
          .update({
            name: flagToEdit.name,
            description: flagToEdit.description,
            rollout_percentage: flagToEdit.rollout_percentage,
            start_at: flagToEdit.start_at || null,
            end_at: flagToEdit.end_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', flagToEdit.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feature_flags')
          .insert({
            key: flagToEdit.key,
            name: flagToEdit.name,
            description: flagToEdit.description,
            is_enabled: false,
            rollout_percentage: 0,
          });
        
        if (error) throw error;
      }
      
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: flagToEdit.id ? 'update' : 'create',
        target_type: 'feature_flag',
        target_id: flagToEdit.id || flagToEdit.key,
        target_name: flagToEdit.name,
        changes_summary: `${flagToEdit.id ? '更新' : '创建'}功能开关: ${flagToEdit.name}`,
      });
      
      setShowEditDialog(false);
      setFlagToEdit(null);
      loadFlags();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  function getStatusBadge(flag: FeatureFlag) {
    if (!flag.is_enabled) {
      return { label: '已禁用', color: 'bg-slate-500/20 text-slate-500' };
    }
    if (flag.rollout_percentage < 100) {
      return { label: `灰度 ${flag.rollout_percentage}%`, color: 'bg-amber-500/20 text-amber-400' };
    }
    return { label: '已启用', color: 'bg-emerald-500/20 text-emerald-400' };
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">功能开关</h1>
          <p className="text-slate-500 mt-1">管理功能灰度发布与开关控制</p>
        </div>
        <Button onClick={() => {
          setFlagToEdit({
            id: '',
            key: '',
            name: '',
            description: '',
            is_enabled: false,
            rollout_percentage: 0,
            created_at: '',
            updated_at: '',
          });
          setShowEditDialog(true);
        }}>
          新建开关
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总开关数" value={stats.total} />
        <StatCard label="已启用" value={stats.enabled} />
        <StatCard label="已禁用" value={stats.disabled} />
        <StatCard label="灰度中" value={stats.partial} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索开关名称或键名..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部状态' },
              { value: 'enabled', label: '已启用' },
              { value: 'disabled', label: '已禁用' },
              { value: 'partial', label: '灰度中' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : flags.length === 0 ? (
          <EmptyState title="暂无开关" description="当前筛选条件下没有找到功能开关" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">功能开关</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">键名</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">发布比例</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">有效期</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {flags.map((flag) => {
                    const status = getStatusBadge(flag);
                    return (
                      <tr key={flag.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">{flag.name}</div>
                            {flag.description && (
                              <div className="text-slate-500 text-xs mt-1 line-clamp-1">{flag.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm text-blue-400">{flag.key}</code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  flag.is_enabled ? 'bg-emerald-500' : 'bg-slate-600'
                                }`}
                                style={{ width: `${flag.rollout_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-500">{flag.rollout_percentage}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">
                          {flag.start_at || flag.end_at ? (
                            <div className="text-xs">
                              {flag.start_at && <div>开始: {new Date(flag.start_at).toLocaleDateString('zh-CN')}</div>}
                              {flag.end_at && <div>结束: {new Date(flag.end_at).toLocaleDateString('zh-CN')}</div>}
                            </div>
                          ) : (
                            <span>永久</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant={flag.is_enabled ? 'ghost' : 'primary'}
                              size="sm"
                              onClick={() => { setFlagToAction(flag); setShowActionDialog(true); }}
                            >
                              {flag.is_enabled ? '禁用' : '启用'}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => { setFlagToEdit(flag); setShowEditDialog(true); }}>
                              编辑
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableContainer>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200/50">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={showActionDialog}
        title={flagToAction?.is_enabled ? '禁用功能' : '启用功能'}
        message={`确定要${flagToAction?.is_enabled ? '禁用' : '启用'}功能 "${flagToAction?.name}" 吗？${flagToAction?.is_enabled ? '这将影响所有用户对该功能的访问。' : ''}`}
        confirmText="确认"
        onConfirm={handleToggleFlag}
        onCancel={() => { setShowActionDialog(false); setFlagToAction(null); }}
        loading={dialogLoading}
        danger={flagToAction?.is_enabled}
      />

      {showEditDialog && flagToEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {flagToEdit.id ? '编辑功能开关' : '新建功能开关'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {!flagToEdit.id && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">键名</label>
                  <Input
                    value={flagToEdit.key}
                    onChange={(e) => setFlagToEdit({ ...flagToEdit, key: e.target.value })}
                    placeholder="例如: feature.new_ui"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">名称</label>
                <Input
                  value={flagToEdit.name}
                  onChange={(e) => setFlagToEdit({ ...flagToEdit, name: e.target.value })}
                  placeholder="功能名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">描述</label>
                <Input
                  value={flagToEdit.description || ''}
                  onChange={(e) => setFlagToEdit({ ...flagToEdit, description: e.target.value })}
                  placeholder="功能描述"
                />
              </div>
              {flagToEdit.id && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    发布比例: {flagToEdit.rollout_percentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={flagToEdit.rollout_percentage}
                    onChange={(e) => setFlagToEdit({ ...flagToEdit, rollout_percentage: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowEditDialog(false); setFlagToEdit(null); }}>
                取消
              </Button>
              <Button onClick={handleSaveFlag} disabled={dialogLoading}>
                {dialogLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
