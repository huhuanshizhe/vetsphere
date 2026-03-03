'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminRole, Permission } from '@/types/admin';
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

interface RoleWithPermissions extends AdminRole {
  permissions?: Permission[];
  permission_count?: number;
}

export default function RolesPage() {
  const supabase = createClient();
  
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, system: 0, custom: 0 });
  
  // 编辑弹窗
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  
  // 新建弹窗
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRole, setNewRole] = useState({ code: '', name: '', description: '' });
  
  // 删除确认
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleWithPermissions | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // 加载角色
      const { data: rolesData } = await supabase
        .from('admin_roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at');
      
      // 加载所有权限
      const { data: permissionsData } = await supabase
        .from('permissions')
        .select('*')
        .order('module')
        .order('display_order');
      
      // 加载角色-权限关联
      const { data: rolePermissionsData } = await supabase
        .from('role_permissions')
        .select('role_id, permission_id');
      
      // 组装数据
      const rolesWithPermissions: RoleWithPermissions[] = (rolesData || []).map(role => {
        const rolePermIds = (rolePermissionsData || [])
          .filter(rp => rp.role_id === role.id)
          .map(rp => rp.permission_id);
        
        return {
          ...role,
          permission_count: rolePermIds.length,
          permissions: (permissionsData || []).filter(p => rolePermIds.includes(p.id)),
        };
      });
      
      setRoles(rolesWithPermissions);
      setAllPermissions(permissionsData || []);
      
      // 统计
      const systemCount = rolesWithPermissions.filter(r => r.is_system).length;
      setStats({
        total: rolesWithPermissions.length,
        system: systemCount,
        custom: rolesWithPermissions.length - systemCount,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  // 按模块分组权限
  function getPermissionsByModule() {
    const modules: Record<string, Permission[]> = {};
    allPermissions.forEach(p => {
      if (!modules[p.module]) {
        modules[p.module] = [];
      }
      modules[p.module].push(p);
    });
    return modules;
  }

  const moduleNames: Record<string, string> = {
    doctor_verify: '医生审核',
    user: '用户管理',
    cms: 'CMS内容',
    growth: '成长体系',
    course: '课程管理',
    product: '商品管理',
    route: '路由管理',
    system: '系统设置',
    lead: '线索管理',
    community: '社区管理',
    ai: 'AI功能',
  };

  // 打开编辑弹窗
  function openEditDialog(role: RoleWithPermissions) {
    setEditingRole(role);
    setSelectedPermissions(role.permissions?.map(p => p.id) || []);
    setShowEditDialog(true);
  }

  // 保存权限配置
  async function handleSavePermissions() {
    if (!editingRole) return;
    
    setDialogLoading(true);
    try {
      // 删除原有权限
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', editingRole.id);
      
      // 插入新权限
      if (selectedPermissions.length > 0) {
        const inserts = selectedPermissions.map(permId => ({
          role_id: editingRole.id,
          permission_id: permId,
        }));
        await supabase.from('role_permissions').insert(inserts);
      }
      
      // 记录审计日志
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: 'update_role_permissions',
        target_type: 'admin_role',
        target_id: editingRole.id,
        target_name: editingRole.name,
        changes_summary: `更新权限配置，共 ${selectedPermissions.length} 个权限`,
      });
      
      setShowEditDialog(false);
      setEditingRole(null);
      loadData();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 创建新角色
  async function handleCreateRole() {
    if (!newRole.code || !newRole.name) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('admin_roles')
        .insert({
          code: newRole.code,
          name: newRole.name,
          description: newRole.description,
          is_system: false,
          is_active: true,
        });
      
      if (error) throw error;
      
      // 记录审计日志
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: 'create_role',
        target_type: 'admin_role',
        target_name: newRole.name,
        changes_summary: `创建新角色: ${newRole.name}`,
      });
      
      setShowCreateDialog(false);
      setNewRole({ code: '', name: '', description: '' });
      loadData();
    } catch (error) {
      console.error('创建失败:', error);
      alert('创建失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 删除角色
  async function handleDeleteRole() {
    if (!roleToDelete) return;
    
    setDialogLoading(true);
    try {
      // 先删除关联权限
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleToDelete.id);
      
      // 删除角色
      const { error } = await supabase
        .from('admin_roles')
        .delete()
        .eq('id', roleToDelete.id);
      
      if (error) throw error;
      
      // 记录审计日志
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: 'delete_role',
        target_type: 'admin_role',
        target_name: roleToDelete.name,
        changes_summary: `删除角色: ${roleToDelete.name}`,
      });
      
      setShowDeleteDialog(false);
      setRoleToDelete(null);
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 切换权限选择
  function togglePermission(permId: string) {
    setSelectedPermissions(prev => 
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  }

  // 全选/取消模块权限
  function toggleModulePermissions(modulePermissions: Permission[]) {
    const modulePermIds = modulePermissions.map(p => p.id);
    const allSelected = modulePermIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !modulePermIds.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePermIds])]);
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">角色权限管理</h1>
          <p className="text-slate-400 mt-1">管理系统角色与权限配置</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          新建角色
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="总角色数" value={stats.total} />
        <StatCard label="系统角色" value={stats.system} />
        <StatCard label="自定义角色" value={stats.custom} />
      </div>

      {/* 角色列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : roles.length === 0 ? (
          <EmptyState
            title="暂无角色"
            description="点击上方按钮创建第一个角色"
          />
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">角色名称</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">角色代码</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">描述</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">权限数</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">类型</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">{role.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-slate-400 bg-slate-800 px-2 py-1 rounded">
                        {role.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {role.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white">{role.permission_count || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      {role.is_system ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                          系统
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
                          自定义
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditDialog(role)}
                        >
                          配置权限
                        </Button>
                        {!role.is_system && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRoleToDelete(role);
                              setShowDeleteDialog(true);
                            }}
                          >
                            删除
                          </Button>
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

      {/* 编辑权限弹窗 */}
      {showEditDialog && editingRole && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-white mb-2">
              配置权限 - {editingRole.name}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              已选择 {selectedPermissions.length} 个权限
            </p>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              {Object.entries(getPermissionsByModule()).map(([module, permissions]) => (
                <div key={module} className="border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">
                      {moduleNames[module] || module}
                    </h4>
                    <button
                      className="text-sm text-emerald-400 hover:text-emerald-300"
                      onClick={() => toggleModulePermissions(permissions)}
                    >
                      {permissions.every(p => selectedPermissions.includes(p.id)) ? '取消全选' : '全选'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {permissions.map(perm => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-300">{perm.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingRole(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSavePermissions}
                loading={dialogLoading}
              >
                保存配置
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 新建角色弹窗 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">新建角色</h3>
            
            <div className="space-y-4">
              <Input
                label="角色代码"
                placeholder="如: content_editor"
                value={newRole.code}
                onChange={(e) => setNewRole(prev => ({ ...prev, code: e.target.value }))}
              />
              <Input
                label="角色名称"
                placeholder="如: 内容编辑"
                value={newRole.name}
                onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="描述（可选）"
                placeholder="角色的职责描述"
                value={newRole.description}
                onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewRole({ code: '', name: '', description: '' });
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateRole}
                loading={dialogLoading}
                disabled={!newRole.code || !newRole.name}
              >
                创建
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="删除角色"
        message={`确定要删除角色 "${roleToDelete?.name}" 吗？此操作不可撤销。`}
        confirmText="确认删除"
        onConfirm={handleDeleteRole}
        onCancel={() => {
          setShowDeleteDialog(false);
          setRoleToDelete(null);
        }}
        loading={dialogLoading}
        danger
      />
    </div>
  );
}
