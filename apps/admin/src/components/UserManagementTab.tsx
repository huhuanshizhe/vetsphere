'use client';

import React, { useState } from 'react';
import DataTable, { Column } from './DataTable';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UserManagementTabProps {
  users: AdminUser[];
}

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-emerald-900/30 text-emerald-400',
  CourseProvider: 'bg-purple-900/30 text-purple-400',
  ShopSupplier: 'bg-blue-900/30 text-blue-400',
  Doctor: 'bg-white text-slate-500',
};

const UserManagementTab: React.FC<UserManagementTabProps> = ({ users }) => {
  const [roleFilter, setRoleFilter] = useState('All');

  const filteredUsers = roleFilter === 'All' ? users : users.filter(u => u.role === roleFilter);

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: '用户',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs shrink-0">
            {(value || row.email)?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="font-bold text-slate-900 truncate">{value || 'User'}</span>
        </div>
      ),
    },
    { key: 'email', header: '邮箱', render: (v) => <span className="text-slate-500 text-sm">{v}</span>, hideOnMobile: true },
    {
      key: 'role',
      header: '角色',
      render: (v) => (
        <span className={`text-xs font-bold px-2 py-1 rounded ${ROLE_COLORS[v] || 'bg-white text-slate-500'}`}>
          {v}
        </span>
      ),
    },
    { key: 'createdAt', header: '注册日期', render: (v) => <span className="text-slate-500 text-sm">{v || '-'}</span>, hideOnMobile: true },
  ];

  const mobileCard = (user: AdminUser) => (
    <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black shrink-0">
          {(user.name || user.email)?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate">{user.name || 'User'}</p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className={`text-xs font-bold px-2 py-1 rounded ${ROLE_COLORS[user.role] || 'bg-white text-slate-500'}`}>
          {user.role}
        </span>
        <span className="text-xs text-slate-600">{user.createdAt || '-'}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="font-bold text-lg text-slate-900">用户管理</h3>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-600 focus:border-emerald-500 outline-none min-h-[44px]"
        >
          <option value="All">全部角色 ({users.length})</option>
          <option value="Doctor">Doctor ({users.filter(u => u.role === 'Doctor').length})</option>
          <option value="CourseProvider">CourseProvider ({users.filter(u => u.role === 'CourseProvider').length})</option>
          <option value="ShopSupplier">ShopSupplier ({users.filter(u => u.role === 'ShopSupplier').length})</option>
          <option value="Admin">Admin ({users.filter(u => u.role === 'Admin').length})</option>
        </select>
      </div>

      <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        <DataTable columns={columns} data={filteredUsers} keyField="id" mobileCardRenderer={mobileCard} emptyMessage="暂无用户数据" />
      </div>
    </div>
  );
};

export default UserManagementTab;
