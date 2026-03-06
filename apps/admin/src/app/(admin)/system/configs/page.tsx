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

interface SystemConfig {
  id: string;
  key: string;
  value: any;
  value_type: string;
  category: string;
  description?: string;
  is_public: boolean;
  is_encrypted: boolean;
  updated_at: string;
  updated_by?: string;
}

const PAGE_SIZE = 20;

export default function SystemConfigsPage() {
  const supabase = createClient();
  
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, public: 0, private: 0, categories: 0 });
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [configToEdit, setConfigToEdit] = useState<SystemConfig | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadConfigs();
    loadCategories();
  }, [filterCategory, searchKeyword, page]);

  async function loadCategories() {
    const { data } = await supabase
      .from('system_configs')
      .select('category')
      .is('deleted_at', null);
    
    if (data) {
      const uniqueCategories = [...new Set(data.map(c => c.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
    }
  }

  async function loadConfigs() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('system_configs')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterCategory) {
        query = query.eq('category', filterCategory);
      }
      if (searchKeyword) {
        query = query.or(`key.ilike.%${searchKeyword}%,description.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('category').order('key');
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setConfigs(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载系统配置失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [totalRes, publicRes, privateRes, categoryRes] = await Promise.all([
      supabase.from('system_configs').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('system_configs').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_public', true),
      supabase.from('system_configs').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_public', false),
      supabase.from('system_configs').select('category').is('deleted_at', null),
    ]);
    
    const uniqueCategories = categoryRes.data ? new Set(categoryRes.data.map(c => c.category)).size : 0;
    
    setStats({
      total: totalRes.count || 0,
      public: publicRes.count || 0,
      private: privateRes.count || 0,
      categories: uniqueCategories,
    });
  }

  async function handleSaveConfig() {
    if (!configToEdit) return;
    
    setDialogLoading(true);
    try {
      let parsedValue: any = editValue;
      
      if (configToEdit.value_type === 'number') {
        parsedValue = parseFloat(editValue);
      } else if (configToEdit.value_type === 'boolean') {
        parsedValue = editValue === 'true';
      } else if (configToEdit.value_type === 'json') {
        parsedValue = JSON.parse(editValue);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('system_configs')
        .update({ 
          value: parsedValue,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', configToEdit.id);
      
      if (error) throw error;
      
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'system',
        action: 'update',
        target_type: 'system_config',
        target_id: configToEdit.id,
        target_name: configToEdit.key,
        changes_summary: `更新系统配置: ${configToEdit.key}`,
        details: { old_value: configToEdit.value, new_value: parsedValue },
      });
      
      setShowEditDialog(false);
      setConfigToEdit(null);
      setEditValue('');
      loadConfigs();
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存失败，请检查值格式是否正确');
    } finally {
      setDialogLoading(false);
    }
  }

  function openEditDialog(config: SystemConfig) {
    setConfigToEdit(config);
    if (config.value_type === 'json') {
      setEditValue(JSON.stringify(config.value, null, 2));
    } else {
      setEditValue(String(config.value));
    }
    setShowEditDialog(true);
  }

  function formatValue(config: SystemConfig) {
    if (config.is_encrypted) {
      return '******';
    }
    if (config.value_type === 'json') {
      return JSON.stringify(config.value).slice(0, 50) + (JSON.stringify(config.value).length > 50 ? '...' : '');
    }
    return String(config.value);
  }

  const typeLabels: Record<string, string> = {
    string: '字符串',
    number: '数字',
    boolean: '布尔',
    json: 'JSON',
  };

  const categoryLabels: Record<string, string> = {
    general: '通用设置',
    payment: '支付设置',
    notification: '通知设置',
    security: '安全设置',
    feature: '功能设置',
    seo: 'SEO设置',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">系统配置</h1>
          <p className="text-slate-500 mt-1">管理平台系统配置参数</p>
        </div>
        <Button onClick={() => {
          setConfigToEdit({
            id: '',
            key: '',
            value: '',
            value_type: 'string',
            category: 'general',
            is_public: false,
            is_encrypted: false,
            updated_at: '',
          });
          setEditValue('');
          setShowEditDialog(true);
        }}>
          新建配置
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="配置项数" value={stats.total} />
        <StatCard label="公开配置" value={stats.public} />
        <StatCard label="私有配置" value={stats.private} />
        <StatCard label="配置分类" value={stats.categories} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索配置键名或描述..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部分类' },
              ...categories.map(c => ({ value: c, label: categoryLabels[c] || c })),
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : configs.length === 0 ? (
          <EmptyState title="暂无配置" description="当前筛选条件下没有找到系统配置" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">配置项</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">值</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">分类</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">可见性</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {configs.map((config) => (
                    <tr key={config.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <code className="text-sm text-blue-400">{config.key}</code>
                          {config.description && (
                            <div className="text-slate-500 text-xs mt-1">{config.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm text-slate-600 bg-slate-100/50 px-2 py-1 rounded">
                          {formatValue(config)}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {typeLabels[config.value_type] || config.value_type}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {categoryLabels[config.category] || config.category}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            config.is_public
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-500'
                          }`}>
                            {config.is_public ? '公开' : '私有'}
                          </span>
                          {config.is_encrypted && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                              加密
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => openEditDialog(config)}>
                          编辑
                        </Button>
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

      {showEditDialog && configToEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {configToEdit.id ? '编辑配置' : '新建配置'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {!configToEdit.id && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">配置键名</label>
                    <Input
                      value={configToEdit.key}
                      onChange={(e) => setConfigToEdit({ ...configToEdit, key: e.target.value })}
                      placeholder="例如: site.name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">值类型</label>
                    <Select
                      value={configToEdit.value_type}
                      onChange={(e) => setConfigToEdit({ ...configToEdit, value_type: e.target.value })}
                      options={[
                        { value: 'string', label: '字符串' },
                        { value: 'number', label: '数字' },
                        { value: 'boolean', label: '布尔' },
                        { value: 'json', label: 'JSON' },
                      ]}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  配置值 ({typeLabels[configToEdit.value_type]})
                </label>
                {configToEdit.value_type === 'boolean' ? (
                  <Select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    options={[
                      { value: 'true', label: '是 (true)' },
                      { value: 'false', label: '否 (false)' },
                    ]}
                  />
                ) : configToEdit.value_type === 'json' ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-40 bg-slate-900 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500"
                    placeholder='{"key": "value"}'
                  />
                ) : (
                  <Input
                    type={configToEdit.value_type === 'number' ? 'number' : 'text'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={configToEdit.value_type === 'number' ? '请输入数字' : '请输入值'}
                  />
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowEditDialog(false); setConfigToEdit(null); setEditValue(''); }}>
                取消
              </Button>
              <Button onClick={handleSaveConfig} disabled={dialogLoading}>
                {dialogLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
