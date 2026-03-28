'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ToastContainer, useToast } from '@/components/ui';
import { Building, Plus, Edit2, Trash2, Check, X, Copy } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: string;
  region: string;
  swift_code?: string;
  bank_address?: string;
  instructions?: string;
  is_active: boolean;
  created_at: string;
}

const currencies = ['USD', 'CNY', 'JPY', 'THB', 'EUR', 'GBP', 'HKD', 'SGD'];
const regions = ['international', 'china', 'japan', 'thailand', 'southeast_asia', 'europe', 'america'];

export default function BankAccountsPage() {
  const { toasts, removeToast, success, error: toastError, warning } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    bank_name: '',
    account_name: '',
    account_number: '',
    currency: 'USD',
    region: 'international',
    swift_code: '',
    bank_address: '',
    instructions: '',
    is_active: true,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_transfer_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      toastError('获取银行账户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormData({
      bank_name: '',
      account_name: '',
      account_number: '',
      currency: 'USD',
      region: 'international',
      swift_code: '',
      bank_address: '',
      instructions: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      bank_name: account.bank_name,
      account_name: account.account_name,
      account_number: account.account_number,
      currency: account.currency,
      region: account.region,
      swift_code: account.swift_code || '',
      bank_address: account.bank_address || '',
      instructions: account.instructions || '',
      is_active: account.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bank_name || !formData.account_name || !formData.account_number) {
      warning('请填写必填字段');
      return;
    }

    try {
      if (editingAccount) {
        // 更新
        const { error } = await supabase
          .from('bank_transfer_configs')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
        success('银行账户已更新');
      } else {
        // 创建
        const { error } = await supabase
          .from('bank_transfer_configs')
          .insert(formData);

        if (error) throw error;
        success('银行账户已添加');
      }

      setShowModal(false);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to save account:', error);
      toastError('保存失败');
    }
  };

  const toggleActive = async (account: BankAccount) => {
    try {
      const { error } = await supabase
        .from('bank_transfer_configs')
        .update({
          is_active: !account.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      if (error) throw error;
      success(account.is_active ? '账户已停用' : '账户已启用');
      fetchAccounts();
    } catch (error) {
      console.error('Failed to toggle account:', error);
      toastError('操作失败');
    }
  };

  const deleteAccount = async (account: BankAccount) => {
    if (!confirm(`确定要删除 ${account.bank_name} 的账户吗？`)) return;

    try {
      const { error } = await supabase
        .from('bank_transfer_configs')
        .delete()
        .eq('id', account.id);

      if (error) throw error;
      success('账户已删除');
      fetchAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      toastError('删除失败');
    }
  };

  const getCurrencyLabel = (currency: string) => {
    const labels: Record<string, string> = {
      USD: '美元 (USD)',
      CNY: '人民币 (CNY)',
      JPY: '日元 (JPY)',
      THB: '泰铢 (THB)',
      EUR: '欧元 (EUR)',
      GBP: '英镑 (GBP)',
      HKD: '港币 (HKD)',
      SGD: '新加坡元 (SGD)',
    };
    return labels[currency] || currency;
  };

  const getRegionLabel = (region: string) => {
    const labels: Record<string, string> = {
      international: '国际',
      china: '中国',
      japan: '日本',
      thailand: '泰国',
      southeast_asia: '东南亚',
      europe: '欧洲',
      america: '美洲',
    };
    return labels[region] || region;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">银行账户管理</h1>
          <p className="text-gray-600 mt-1">配置银行转账收款账户</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          添加账户
        </button>
      </div>

      {/* 账户列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无银行账户</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-emerald-600 hover:text-emerald-700"
            >
              添加第一个账户
            </button>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className={`bg-white rounded-lg shadow p-4 ${
                !account.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{account.bank_name}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  account.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {account.is_active ? '启用' : '停用'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">账户名</span>
                  <span className="text-gray-900">{account.account_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">账号</span>
                  <span className="font-mono text-gray-900">****{account.account_number.slice(-4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">币种</span>
                  <span className="text-gray-900">{getCurrencyLabel(account.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">区域</span>
                  <span className="text-gray-900">{getRegionLabel(account.region)}</span>
                </div>
                {account.swift_code && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">SWIFT</span>
                    <span className="font-mono text-gray-900">{account.swift_code}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => toggleActive(account)}
                  className={`px-3 py-1 text-sm rounded ${
                    account.is_active
                      ? 'text-orange-600 hover:bg-orange-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {account.is_active ? '停用' : '启用'}
                </button>
                <button
                  onClick={() => openEditModal(account)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  编辑
                </button>
                <button
                  onClick={() => deleteAccount(account)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 创建/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                {editingAccount ? '编辑银行账户' : '添加银行账户'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  银行名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例如：中国银行"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  账户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="账户持有人名称"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  银行账号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="银行账号"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>{getCurrencyLabel(c)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">区域</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {regions.map((r) => (
                      <option key={r} value={r}>{getRegionLabel(r)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT代码</label>
                <input
                  type="text"
                  value={formData.swift_code}
                  onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="国际汇款SWIFT代码"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">银行地址</label>
                <input
                  type="text"
                  value={formData.bank_address}
                  onChange={(e) => setFormData({ ...formData, bank_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="银行地址"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">转账说明</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="转账注意事项和说明"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">启用此账户</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  {editingAccount ? '保存更改' : '添加账户'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}