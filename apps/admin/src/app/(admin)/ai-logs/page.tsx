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
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface AILog {
  id: string;
  user_id?: string;
  session_id: string;
  prompt_type: string;
  user_input: string;
  ai_response: string;
  tokens_used: number;
  response_time_ms: number;
  model_version?: string;
  feedback_rating?: number;
  created_at: string;
  user?: { full_name: string; email: string };
}

const PAGE_SIZE = 20;

export default function AILogsPage() {
  const supabase = createClient();
  
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    total: 0, 
    todayCount: 0, 
    avgTokens: 0, 
    avgResponseTime: 0 
  });
  const [filterType, setFilterType] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AILog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filterType, filterDate, searchKeyword, page]);

  async function loadLogs() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('ai_conversation_logs')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `, { count: 'exact' });
      
      if (filterType) {
        query = query.eq('prompt_type', filterType);
      }
      if (filterDate) {
        const date = new Date(filterDate);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        query = query.gte('created_at', date.toISOString()).lt('created_at', nextDate.toISOString());
      }
      if (searchKeyword) {
        query = query.ilike('user_input', `%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      const mappedLogs = (data || []).map((log: any) => ({
        ...log,
        user: log.profiles,
      }));
      
      setLogs(mappedLogs);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载AI日志失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const [totalRes, todayRes, avgRes] = await Promise.all([
      supabase.from('ai_conversation_logs').select('*', { count: 'exact', head: true }),
      supabase.from('ai_conversation_logs').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
      supabase.from('ai_conversation_logs').select('tokens_used, response_time_ms'),
    ]);
    
    let avgTokens = 0;
    let avgResponseTime = 0;
    if (avgRes.data && avgRes.data.length > 0) {
      const totalTokens = avgRes.data.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
      const totalTime = avgRes.data.reduce((sum, log) => sum + (log.response_time_ms || 0), 0);
      avgTokens = Math.round(totalTokens / avgRes.data.length);
      avgResponseTime = Math.round(totalTime / avgRes.data.length);
    }
    
    setStats({
      total: totalRes.count || 0,
      todayCount: todayRes.count || 0,
      avgTokens,
      avgResponseTime,
    });
  }

  const typeLabels: Record<string, string> = {
    diagnosis: '诊断助手',
    education: '学习辅导',
    consultation: '智能咨询',
    general: '通用问答',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI对话日志</h1>
        <p className="text-slate-400 mt-1">监控AI助手使用情况与对话质量</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总对话数" value={stats.total.toLocaleString()} />
        <StatCard label="今日对话" value={stats.todayCount} />
        <StatCard label="平均Token" value={stats.avgTokens} />
        <StatCard label="平均响应(ms)" value={stats.avgResponseTime} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索用户提问内容..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部类型' },
              { value: 'diagnosis', label: '诊断助手' },
              { value: 'education', label: '学习辅导' },
              { value: 'consultation', label: '智能咨询' },
              { value: 'general', label: '通用问答' },
            ]}
          />
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
            className="w-40"
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <EmptyState title="暂无日志" description="当前筛选条件下没有找到AI对话日志" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">时间</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户提问</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">性能</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">评分</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-400 text-sm whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-slate-300">{log.user?.full_name || '匿名'}</div>
                          {log.user?.email && <div className="text-slate-500 text-xs">{log.user.email}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                          {typeLabels[log.prompt_type] || log.prompt_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 text-sm line-clamp-2 max-w-xs">
                          {log.user_input}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-500">
                          <div>{log.tokens_used} tokens</div>
                          <div>{log.response_time_ms}ms</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.feedback_rating ? (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= log.feedback_rating! ? 'text-amber-400' : 'text-slate-600'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => { setSelectedLog(log); setShowDetailDialog(true); }}>
                          详情
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-700/50">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>

      {showDetailDialog && selectedLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">对话详情</h3>
              <button onClick={() => setShowDetailDialog(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-60px)] space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">时间:</span>
                  <span className="text-slate-300 ml-2">{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <div>
                  <span className="text-slate-500">类型:</span>
                  <span className="text-slate-300 ml-2">{typeLabels[selectedLog.prompt_type] || selectedLog.prompt_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">Token消耗:</span>
                  <span className="text-slate-300 ml-2">{selectedLog.tokens_used}</span>
                </div>
                <div>
                  <span className="text-slate-500">响应时间:</span>
                  <span className="text-slate-300 ml-2">{selectedLog.response_time_ms}ms</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">用户提问</h4>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap">
                    {selectedLog.user_input}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">AI回复</h4>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap">
                    {selectedLog.ai_response}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
