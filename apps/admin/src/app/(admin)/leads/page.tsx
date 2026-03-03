'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PurchaseLead, STATUS_COLORS, STATUS_LABELS } from '@/types/admin';
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

export default function LeadsPage() {
  const supabase = createClient();
  
  const [leads, setLeads] = useState<PurchaseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, converted: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 详情弹窗
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<PurchaseLead | null>(null);
  
  // 状态变更弹窗
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [leadToChange, setLeadToChange] = useState<PurchaseLead | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadLeads();
  }, [filterStatus, filterType, searchKeyword, page]);

  async function loadLeads() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('purchase_leads')
        .select('*', { count: 'exact' });
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      
      if (filterType) {
        query = query.eq('lead_type', filterType);
      }
      
      if (searchKeyword) {
        query = query.or(`contact_name.ilike.%${searchKeyword}%,mobile.ilike.%${searchKeyword}%,clinic_name.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setLeads(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载线索列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const { count: totalCount } = await supabase
      .from('purchase_leads')
      .select('*', { count: 'exact', head: true });
    
    const { count: newCount } = await supabase
      .from('purchase_leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new');
    
    const { count: contactedCount } = await supabase
      .from('purchase_leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'contacted');
    
    const { count: convertedCount } = await supabase
      .from('purchase_leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'converted');
    
    setStats({
      total: totalCount || 0,
      new: newCount || 0,
      contacted: contactedCount || 0,
      converted: convertedCount || 0,
    });
  }

  // 变更状态
  async function handleChangeStatus() {
    if (!leadToChange || !newStatus) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('purchase_leads')
        .update({
          status: newStatus,
          notes: statusNote ? `${leadToChange.notes || ''}\n[${new Date().toLocaleString('zh-CN')}] ${statusNote}`.trim() : leadToChange.notes,
        })
        .eq('id', leadToChange.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'lead',
        action: 'update_status',
        target_type: 'purchase_lead',
        target_id: leadToChange.id,
        target_name: leadToChange.contact_name,
        changes_summary: `更新线索状态: ${STATUS_LABELS[leadToChange.status]} -> ${STATUS_LABELS[newStatus]}`,
      });
      
      setShowStatusDialog(false);
      setLeadToChange(null);
      setNewStatus('');
      setStatusNote('');
      loadLeads();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const leadTypeLabels: Record<string, string> = {
    inquiry: '咨询',
    configuration_advice: '配置建议',
    solution_request: '方案需求',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">采购线索</h1>
          <p className="text-slate-400 mt-1">管理用户提交的采购咨询与需求</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总线索数" value={stats.total} />
        <StatCard label="新提交" value={stats.new} />
        <StatCard label="已联系" value={stats.contacted} />
        <StatCard label="已转化" value={stats.converted} />
      </div>

      {/* 筛选栏 */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索联系人、手机号、诊所..."
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
          <div className="w-full md:w-40">
            <Select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部状态' },
                { value: 'new', label: '新提交' },
                { value: 'contacted', label: '已联系' },
                { value: 'quoted', label: '已报价' },
                { value: 'negotiating', label: '洽谈中' },
                { value: 'converted', label: '已转化' },
                { value: 'closed', label: '已关闭' },
              ]}
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部类型' },
                { value: 'inquiry', label: '咨询' },
                { value: 'configuration_advice', label: '配置建议' },
                { value: 'solution_request', label: '方案需求' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 线索列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : leads.length === 0 ? (
          <EmptyState
            title="暂无线索"
            description="当前筛选条件下没有找到采购线索"
          />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">联系人</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">诊所</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">预算</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">提交时间</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-medium text-white">{lead.contact_name}</span>
                          <div className="text-xs text-slate-500 mt-0.5">{lead.mobile}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {lead.clinic_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
                          {leadTypeLabels[lead.lead_type] || lead.lead_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {lead.budget_range || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {new Date(lead.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowDetailDialog(true);
                            }}
                          >
                            详情
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLeadToChange(lead);
                              setNewStatus('');
                              setStatusNote('');
                              setShowStatusDialog(true);
                            }}
                          >
                            跟进
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

      {/* 详情弹窗 */}
      {showDetailDialog && selectedLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">线索详情</h3>
              <StatusBadge status={selectedLead.status} />
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">联系人</label>
                  <p className="text-white mt-1">{selectedLead.contact_name}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">手机号</label>
                  <p className="text-white mt-1">{selectedLead.mobile}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">邮箱</label>
                  <p className="text-white mt-1">{selectedLead.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">诊所名称</label>
                  <p className="text-white mt-1">{selectedLead.clinic_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">线索类型</label>
                  <p className="text-white mt-1">{leadTypeLabels[selectedLead.lead_type] || selectedLead.lead_type}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">预算范围</label>
                  <p className="text-white mt-1">{selectedLead.budget_range || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">来源页面</label>
                  <p className="text-white mt-1">{selectedLead.source_page || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">提交时间</label>
                  <p className="text-white mt-1">
                    {new Date(selectedLead.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              
              {selectedLead.requirement_text && (
                <div>
                  <label className="text-sm text-slate-500">需求描述</label>
                  <p className="text-white mt-1 whitespace-pre-wrap bg-slate-700/50 rounded-lg p-4">
                    {selectedLead.requirement_text}
                  </p>
                </div>
              )}
              
              {selectedLead.notes && (
                <div>
                  <label className="text-sm text-slate-500">跟进记录</label>
                  <p className="text-slate-300 mt-1 whitespace-pre-wrap bg-slate-700/50 rounded-lg p-4 text-sm">
                    {selectedLead.notes}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailDialog(false);
                  setSelectedLead(null);
                }}
              >
                关闭
              </Button>
              <Button
                onClick={() => {
                  setShowDetailDialog(false);
                  setLeadToChange(selectedLead);
                  setNewStatus('');
                  setStatusNote('');
                  setShowStatusDialog(true);
                }}
              >
                跟进
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 状态变更弹窗 */}
      {showStatusDialog && leadToChange && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">跟进线索</h3>
            <p className="text-slate-400 mb-4">
              联系人: <span className="text-white">{leadToChange.contact_name}</span>
            </p>
            
            <div className="space-y-4">
              <Select
                label="更新状态"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                options={[
                  { value: '', label: '保持当前状态' },
                  { value: 'contacted', label: '已联系' },
                  { value: 'quoted', label: '已报价' },
                  { value: 'negotiating', label: '洽谈中' },
                  { value: 'converted', label: '已转化' },
                  { value: 'closed', label: '已关闭' },
                ]}
              />
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  跟进备注
                </label>
                <textarea
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[100px]"
                  placeholder="记录本次跟进内容..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowStatusDialog(false);
                  setLeadToChange(null);
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleChangeStatus}
                loading={dialogLoading}
                disabled={!newStatus && !statusNote}
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
