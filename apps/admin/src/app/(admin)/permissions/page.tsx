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
  Pagination,
} from '@/components/ui';

interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string;
  module: string;
  created_at: string;
}

const PAGE_SIZE = 30;

const MODULE_LABELS: Record<string, string> = {
  dashboard: '控制台',
  user: '用户管理',
  role: '角色权限',
  course: '课程管理',
  product: '商品管理',
  order: '订单管理',
  doctor_verify: '医生审核',
  community: '社区管理',
  cms: '内容管理',
  growth: '成长体系',
  lead: '采购线索',
  ai: 'AI 配置',
  route: '路由管理',
  system: '系统设置',
  notification: '通知管理',
  site_page: '站点页面',
  clinic_program: '诊所项目',
};

export default function PermissionsPage() {
  const supabase = createClient();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, modules: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterModule, setFilterModule] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modules, setModules] = useState<string[]>([]);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [editForm, setEditForm] = useState({ key: '', name: '', description: '', module: '' });
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [searchKeyword, filterModule, page]);

  async function loadPermissions() {
    setLoading(true);
    try {
      let query = supabase
        .from('permissions')
        .select('*', { count: 'exact' });

      if (filterModule) {
        query = query.eq('module', filterModule);
      }
      if (searchKeyword) {
        query = query.or(`key.ilike.%${searchKeyword}%,name.ilike.%${searchKeyword}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('module').order('key');

      const { data, count, error } = await query;
      if (error) throw error;

      setPermissions(data || []);
      setTotal(count || 0);

      // Get unique modules
      const { data: allPerms } = await supabase.from('permissions').select('module');
      const uniqueModules = [...new Set((allPerms || []).map(p => p.module))].sort();
      setModules(uniqueModules);
      setStats({ total: count || 0, modules: uniqueModules.length });
    } catch (error) {
      console.error('加载权限列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingPerm(null);
    setEditForm({ key: '', name: '', description: '', module: '' });
    setShowEditDialog(true);
  }

  function openEdit(perm: Permission) {
    setEditingPerm(perm);
    setEditForm({ key: perm.key, name: perm.name, description: perm.description || '', module: perm.module });
    setShowEditDialog(true);
  }

  async function handleSave() {
    if (!editForm.key.trim() || !editForm.name.trim() || !editForm.module.trim()) return;
    setDialogLoading(true);
    try {
      const payload = {
        key: editForm.key.trim(),
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        module: editForm.module.trim(),
      };

      if (editingPerm) {
        const { error } = await supabase.from('permissions').update(payload).eq('id', editingPerm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('permissions').insert(payload);
        if (error) throw error;
      }

      setShowEditDialog(false);
      loadPermissions();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请检查 key 是否重复');
    } finally {
      setDialogLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">权限点管理</h1>
          <p className="text-slate-500 mt-1">管理系统权限点定义，供角色分配使用</p>
        </div>
        <Button onClick={openCreate}>新增权限</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="总权限数" value={stats.total} />
        <StatCard label="模块数" value={stats.modules} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索权限 Key 或名称..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
              value={filterModule}
              onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
            >
              <option value="" className="bg-slate-900">全部模块</option>
              {modules.map(m => (
                <option key={m} value={m} className="bg-slate-900">{MODULE_LABELS[m] || m}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : permissions.length === 0 ? (
          <EmptyState title="暂无权限" description="点击上方按钮创建第一个权限点" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">模块</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Key</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">名称</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">描述</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {permissions.map((perm) => (
                    <tr key={perm.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                          {MODULE_LABELS[perm.module] || perm.module}
                        </span>
                      </td>
                      <td className="px-6 py-4"><code className="text-sm text-emerald-400">{perm.key}</code></td>
                      <td className="px-6 py-4 text-slate-900 font-medium text-sm">{perm.name}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{perm.description || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(perm)}>编辑</Button>
                      </td>
                    </tr>
                  ))}
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

      {/* 编辑/新建对话框 */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowEditDialog(false)} />
          <div className="relative bg-slate-950 border border-slate-200/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{editingPerm ? '编辑权限' : '新增权限'}</h3>
            <div className="space-y-4">
              <Input label="Key *" value={editForm.key} onChange={(e) => setEditForm(f => ({ ...f, key: e.target.value }))} placeholder="如：course.edit" disabled={!!editingPerm} />
              <Input label="名称 *" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="如：编辑课程" />
              <Input label="模块 *" value={editForm.module} onChange={(e) => setEditForm(f => ({ ...f, module: e.target.value }))} placeholder="如：course" />
              <Input label="描述" value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="权限点描述" />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowEditDialog(false)}>取消</Button>
              <Button onClick={handleSave} loading={dialogLoading} disabled={!editForm.key.trim() || !editForm.name.trim() || !editForm.module.trim()}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
