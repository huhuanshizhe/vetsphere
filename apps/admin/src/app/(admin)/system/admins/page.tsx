'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminUser, AdminRole, STATUS_COLORS, STATUS_LABELS } from '@/types/admin';
import {
  Card,
  Button,
  Input,
  Select,
  StatusBadge,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const supabase = createClient();
  
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, superAdmin: 0 });
  const [filterRoleId, setFilterRoleId] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 弹窗状态
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [newRoleId, setNewRoleId] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState(false);
  
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [adminToDeactivate, setAdminToDeactivate] = useState<AdminUser | null>(null);

  // 加载角色列表
  useEffect(() => {
    loadRoles();
  }, []);

  // 加载数据
  useEffect(() => {
    loadAdmins();
  }, [filterRoleId, searchKeyword, page]);

  async function loadRoles() {
    const { data } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('is_active', true)
      .order('created_at');
    
    if (data) setRoles(data);
  }

  async function loadAdmins() {
    setLoading(true);
    
    try {
      // 基础查询
      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          is_admin,
          admin_role_id,
          created_at,
          admin_roles (
            id,
            code,
            name
          )
        `, { count: 'exact' })
        .eq('is_admin', true);
      
      // 角色筛选
      if (filterRoleId) {
        query = query.eq('admin_role_id', filterRoleId);
      }
      
      // 关键词搜索
      if (searchKeyword) {
        query = query.or(`full_name.ilike.%${searchKeyword}%,email.ilike.%${searchKeyword}%`);
      }
      
      // 分页
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      // 映射数据
      const mappedAdmins: AdminUser[] = (data || []).map((item: any) => ({
        id: item.id,
        email: item.email,
        full_name: item.full_name,
        avatar_url: item.avatar_url,
        is_admin: item.is_admin,
        admin_role_id: item.admin_role_id,
        admin_role: item.admin_roles,
        created_at: item.created_at,
      }));
      
      setAdmins(mappedAdmins);
      setTotal(count || 0);
      
      // 加载统计
      await loadStats();
    } catch (error) {
      console.error('加载管理员列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    // 总管理员数
    const { count: totalCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true);
    
    // 超级管理员数（code = 'super_admin'）
    const { data: superAdminRole } = await supabase
      .from('admin_roles')
      .select('id')
      .eq('code', 'super_admin')
      .single();
    
    let superAdminCount = 0;
    if (superAdminRole) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', true)
        .eq('admin_role_id', superAdminRole.id);
      superAdminCount = count || 0;
    }
    
    setStats({
      total: totalCount || 0,
      active: totalCount || 0,
      superAdmin: superAdminCount,
    });
  }

  // 分配角色
  async function handleAssignRole() {
    if (!selectedAdmin || !newRoleId) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ admin_role_id: newRoleId })
        .eq('id', selectedAdmin.id);
      
      if (error) throw error;
      
      // 记录审计日志
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: 'assign_role',
        target_type: 'admin_user',
        target_id: selectedAdmin.id,
        target_name: selectedAdmin.full_name,
        changes_summary: `分配角色: ${roles.find(r => r.id === newRoleId)?.name}`,
      });
      
      setShowRoleDialog(false);
      setSelectedAdmin(null);
      setNewRoleId('');
      loadAdmins();
    } catch (error) {
      console.error('分配角色失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 取消管理员权限
  async function handleDeactivateAdmin() {
    if (!adminToDeactivate) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: false, admin_role_id: null })
        .eq('id', adminToDeactivate.id);
      
      if (error) throw error;
      
      // 记录审计日志
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: 'deactivate_admin',
        target_type: 'admin_user',
        target_id: adminToDeactivate.id,
        target_name: adminToDeactivate.full_name,
        changes_summary: '取消管理员权限',
      });
      
      setShowDeactivateDialog(false);
      setAdminToDeactivate(null);
      loadAdmins();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">管理员管理</h1>
          <p className="text-slate-400 mt-1">管理系统管理员账号与角色分配</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="总管理员" value={stats.total} />
        <StatCard label="活跃管理员" value={stats.active} />
        <StatCard label="超级管理员" value={stats.superAdmin} />
      </div>

      {/* 筛选栏 */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索姓名、邮箱..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={filterRoleId}
              onChange={(e) => {
                setFilterRoleId(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部角色' },
                ...roles.map(r => ({ value: r.id, label: r.name })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : admins.length === 0 ? (
          <EmptyState
            title="暂无管理员"
            description="当前筛选条件下没有找到管理员账号"
          />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">管理员</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">邮箱</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">角色</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">添加时间</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                            {admin.avatar_url ? (
                              <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg text-slate-400">
                                {admin.full_name?.[0] || admin.email?.[0] || '?'}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-white">
                            {admin.full_name || '未设置姓名'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{admin.email}</td>
                      <td className="px-6 py-4">
                        {admin.admin_role ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                            {admin.admin_role.name}
                          </span>
                        ) : (
                          <span className="text-slate-500">未分配</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {new Date(admin.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setNewRoleId(admin.admin_role_id || '');
                              setShowRoleDialog(true);
                            }}
                          >
                            分配角色
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdminToDeactivate(admin);
                              setShowDeactivateDialog(true);
                            }}
                          >
                            移除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-700/50">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* 分配角色弹窗 */}
      {showRoleDialog && selectedAdmin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">分配角色</h3>
            <p className="text-slate-400 mb-4">
              为管理员 <span className="text-white">{selectedAdmin.full_name}</span> 分配角色
            </p>
            
            <Select
              label="选择角色"
              value={newRoleId}
              onChange={(e) => setNewRoleId(e.target.value)}
              options={[
                { value: '', label: '请选择角色' },
                ...roles.map(r => ({ value: r.id, label: `${r.name} - ${r.description || ''}` })),
              ]}
            />
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRoleDialog(false);
                  setSelectedAdmin(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleAssignRole}
                loading={dialogLoading}
                disabled={!newRoleId}
              >
                确认分配
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 移除确认弹窗 */}
      <ConfirmDialog
        open={showDeactivateDialog}
        title="取消管理员权限"
        message={`确定要取消 ${adminToDeactivate?.full_name} 的管理员权限吗？此操作将移除其所有后台访问权限。`}
        confirmText="确认移除"
        onConfirm={handleDeactivateAdmin}
        onCancel={() => {
          setShowDeactivateDialog(false);
          setAdminToDeactivate(null);
        }}
        loading={dialogLoading}
        danger
      />
    </div>
  );
}
