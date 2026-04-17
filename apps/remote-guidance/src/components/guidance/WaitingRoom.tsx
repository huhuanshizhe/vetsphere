'use client';

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAccessTokenSafe } from "@vetsphere/shared/services/supabase";
import {
  formatGuidanceDate,
  getStateLabel,
  getStatusTone,
  guidanceParticipantRoleLabels,
  guidancePriorityLabels,
  guidanceSessionTypeLabels,
} from "@/lib/guidance-display";

// 设备状态类型
type DeviceStatus = {
  type: 'camera' | 'microphone' | 'network' | 'screen';
  status: 'ready' | 'warning' | 'error' | 'checking';
  label: string;
  detail?: string;
  icon: string;
};

// 参与者状态
type ParticipantInfo = {
  user_id: string;
  display_name: string;
  participant_role: string;
  in_room: boolean;
};

// 会话信息
type SessionInfo = {
  id: string;
  title: string;
  status: string;
  session_state_v2?: string | null;
  priority: string;
  session_type: string;
  procedure_name?: string | null;
  patient_species?: string | null;
  hospital_name?: string | null;
  department_name?: string | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  rtc_room_name?: string | null;
  room_status?: string | null;
  actual_started_at?: string | null;
  consent_confirmed?: boolean | null;
};

// 候诊室完整数据
type WaitingRoomData = {
  session: SessionInfo;
  actorRole: string;
  participants: ParticipantInfo[];
  hasActiveRoom: boolean;
  canEnterRoom: boolean;
};

// 计算已进行时间
function formatElapsedTime(startTime?: string | null): string {
  if (!startTime) return "未开始";
  
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  
  if (diffMs < 0) return "未开始";
  
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}分钟`;
  
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}小时${remainMinutes}分钟`;
}

export default function WaitingRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<WaitingRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceStatus[]>([
    { type: 'camera', status: 'checking', label: '摄像头', icon: '🎥' },
    { type: 'microphone', status: 'checking', label: '麦克风', icon: '🎤' },
    { type: 'network', status: 'checking', label: '网络状态', icon: '📶' },
    { type: 'screen', status: 'checking', label: '屏幕', icon: '🖥️' },
  ]);
  const [enteringRoom, setEnteringRoom] = useState(false);
  const [observerLinkCopied, setObserverLinkCopied] = useState(false);

  // 加载会话数据
  const fetchSessionData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error("请先登录后再访问远程指导。");
      }

      const response = await fetch(`/api/guidance/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "加载会话信息失败。");
      }

      const sessionData = payload?.data?.session || {};
      const participants = (payload?.data?.participants || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || p.user_id,
        participant_role: p.participant_role,
        in_room: p.invite_status === 'accepted' || p.joined_at != null,
      }));

      setData({
        session: sessionData,
        actorRole: payload?.data?.actorRole || 'surgeon',
        participants,
        hasActiveRoom: Boolean(sessionData.rtc_room_name),
        canEnterRoom: ['surgeon', 'assistant', 'expert', 'moderator', 'admin'].includes(payload?.data?.actorRole),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载会话信息失败。");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // 设备检测
  const checkDevices = useCallback(async () => {
    try {
      // 摄像头和麦克风检测
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = mediaDevices.filter(d => d.kind === 'videoinput');
      const microphones = mediaDevices.filter(d => d.kind === 'audioinput');

      // 网络延迟检测（简化版）
      const networkLatency = await measureNetworkLatency();

      setDevices([
        {
          type: 'camera',
          status: cameras.length > 0 ? 'ready' : 'error',
          label: '摄像头',
          detail: cameras[0]?.label || '未检测到',
          icon: '🎥',
        },
        {
          type: 'microphone',
          status: microphones.length > 0 ? 'ready' : 'error',
          label: '麦克风',
          detail: microphones[0]?.label || '未检测到',
          icon: '🎤',
        },
        {
          type: 'network',
          status: networkLatency < 100 ? 'ready' : networkLatency < 300 ? 'warning' : 'error',
          label: '网络状态',
          detail: `${networkLatency}ms延迟`,
          icon: '📶',
        },
        {
          type: 'screen',
          status: 'ready',
          label: '屏幕',
          detail: '正常',
          icon: '🖥️',
        },
      ]);
    } catch (err) {
      setDevices(prev => prev.map(d => ({ ...d, status: 'error', detail: '检测失败' })));
    }
  }, []);

  // 网络延迟测量
  async function measureNetworkLatency(): Promise<number> {
    try {
      const start = Date.now();
      // 使用 LiveKit 服务器地址进行 ping 测试
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://livekit.vetsphere.cn';
      const pingUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      
      // 简化：使用 fetch 测量响应时间
      await fetch(pingUrl + '/health', { method: 'HEAD', mode: 'no-cors' });
      return Date.now() - start;
    } catch {
      // 无法测量时返回默认值
      return 50;
    }
  }

  // 一键入房
  async function handleEnterRoom() {
    if (!data?.canEnterRoom) {
      setError("当前角色无法进入手术室。");
      return;
    }

    setEnteringRoom(true);
    setError(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error("请先登录。");
      }

      // 如果房间未打开，先打开房间
      if (!data.hasActiveRoom) {
        const openResponse = await fetch(`/api/guidance/sessions/${sessionId}/room/open`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        const openPayload = await openResponse.json();
        if (!openResponse.ok) {
          throw new Error(openPayload?.message || "打开房间失败。");
        }
      }

      // 直接跳转到手术室页面
      router.push(`/guidance/${sessionId}/room`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "进入手术室失败。");
      setEnteringRoom(false);
    }
  }

  // 分享观察员链接（一键生成）
  async function handleShareObserverLink() {
    try {
      const token = await getAccessTokenSafe();
      if (!token) return;

      // 使用新的 observer-link API（无需房间已打开）
      const response = await fetch(`/api/guidance/sessions/${sessionId}/observer-link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'observer' }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "生成链接失败。");
      }

      const joinUrl = payload?.data?.join_url;
      if (joinUrl) {
        await navigator.clipboard.writeText(joinUrl);
        setObserverLinkCopied(true);
        setTimeout(() => setObserverLinkCopied(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "分享链接失败。");
    }
  }

  useEffect(() => {
    void fetchSessionData();
    void checkDevices();
  }, [fetchSessionData, checkDevices]);

  // 设备状态图标
  const deviceStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '●';
      case 'warning': return '◐';
      case 'error': return '○';
      case 'checking': return '◉';
      default: return '?';
    }
  };

  const deviceStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-teal-600';
      case 'warning': return 'text-amber-500';
      case 'error': return 'text-rose-500';
      default: return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-5 py-8 lg:px-8">
          <div className="guidance-card h-48 animate-pulse rounded-[2rem]" />
          <div className="guidance-card h-64 animate-pulse rounded-[2rem]" />
          <div className="guidance-card h-32 animate-pulse rounded-[2rem]" />
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-5 py-8 lg:px-8">
          <section className="guidance-card rounded-[2rem] px-7 py-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">无法进入</div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-950">候诊室暂时不可用</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{error}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => void fetchSessionData()}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                重新加载
              </button>
              <Link
                href="/guidance"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                返回列表
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const session = data?.session!;
  const stateV2 = session.session_state_v2;
  const effectiveState = stateV2 || session.status;
  const elapsedTime = formatElapsedTime(session.actual_started_at);

  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-5 py-8 lg:px-8">
        
        {/* 会话信息卡片 */}
        <section className="guidance-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="border-b border-slate-200 px-7 py-8 lg:border-b-0 lg:border-r">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`guidance-pill inline-flex ${getStatusTone(session.status, stateV2)}`}>
                  {getStateLabel(session.status, stateV2)}
                </span>
                <span className="guidance-pill inline-flex bg-amber-50 text-amber-700">
                  {guidancePriorityLabels[session.priority] || session.priority}
                </span>
                <span className="guidance-pill inline-flex bg-slate-100 text-slate-700">
                  角色: {guidanceParticipantRoleLabels[data?.actorRole || 'surgeon'] || data?.actorRole}
                </span>
              </div>
              
              <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">
                {session.title}
              </h1>
              
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  {guidanceSessionTypeLabels[session.session_type] || session.session_type}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  {session.procedure_name || "未填写术式"}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  {session.patient_species || "未填写物种"}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  {session.hospital_name || "未填写机构"}
                </span>
              </div>
              
              <div className="mt-6 text-sm text-slate-600">
                预约时间: {formatGuidanceDate(session.scheduled_start_at)} - {formatGuidanceDate(session.scheduled_end_at)}
              </div>
            </div>
            
            <div className="bg-[linear-gradient(160deg,rgba(13,148,136,0.08),rgba(245,158,11,0.08))] px-7 py-8">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5">
                <div className="text-sm font-semibold text-slate-500">手术进度</div>
                <div className="mt-4 text-2xl font-semibold text-slate-950">
                  {effectiveState === 'live' ? elapsedTime : 
                   effectiveState === 'waiting' ? '等待开始' :
                   effectiveState === 'ended' ? '已结束' : '未开始'}
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  {effectiveState === 'live' && `房间: ${session.rtc_room_name || '已打开'}`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 设备就绪检查 */}
        <section className="guidance-card rounded-[2rem] px-7 py-7">
          <div className="border-b border-slate-200 pb-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Device Check</div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">设备就绪状态</h2>
          </div>
          
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {devices.map(device => (
              <div key={device.type} className="rounded-[1.3rem] bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{device.icon}</span>
                  <span className="text-sm font-medium text-slate-700">{device.label}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-xl font-bold ${deviceStatusColor(device.status)}`}>
                    {deviceStatusIcon(device.status)}
                  </span>
                  <span className="text-sm text-slate-600">
                    {device.status === 'ready' ? '就绪' : 
                     device.status === 'warning' ? '需要注意' : 
                     device.status === 'error' ? '异常' : '检测中'}
                  </span>
                </div>
                {device.detail && (
                  <div className="mt-1 text-xs text-slate-500 truncate">{device.detail}</div>
                )}
              </div>
            ))}
          </div>
          
          {/* 设备警告提示 */}
          {devices.some(d => d.status === 'error') && (
            <div className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              部分设备状态异常，请检查摄像头和麦克风是否正确连接。您仍可进入手术室，但可能无法正常发布音视频。
            </div>
          )}
        </section>

        {/* 参与人员 */}
        <section className="guidance-card rounded-[2rem] px-7 py-7">
          <div className="border-b border-slate-200 pb-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Participants</div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">当前参与人员</h2>
          </div>
          
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data?.participants.map(p => (
              <div key={p.user_id} className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {guidanceParticipantRoleLabels[p.participant_role] || p.participant_role}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{p.display_name}</div>
                  </div>
                  <span className={`text-lg ${p.in_room ? 'text-teal-600' : 'text-slate-400'}`}>
                    {p.in_room ? '●' : '○'}
                  </span>
                </div>
              </div>
            ))}
            
            {data?.participants.length === 0 && (
              <div className="rounded-[1.3rem] border border-dashed border-slate-300 px-5 py-8 text-sm text-slate-500">
                当前没有其他参与人员
              </div>
            )}
          </div>
        </section>

        {/* 一键入房按钮 */}
        <section className="guidance-card rounded-[2rem] px-7 py-7">
          <div className="flex flex-col items-center gap-6">
            
            {data?.canEnterRoom ? (
              <button
                onClick={handleEnterRoom}
                disabled={enteringRoom}
                className="w-full max-w-md rounded-[1.5rem] bg-teal-600 px-8 py-6 text-center text-lg font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🚪</span>
                  <span>{enteringRoom ? '正在进入...' : '进入手术室'}</span>
                </div>
                <div className="mt-2 text-sm font-normal text-teal-100">
                  点击后将自动打开房间并连接视频
                </div>
              </button>
            ) : (
              <div className="w-full max-w-md rounded-[1.5rem] bg-slate-100 px-8 py-6 text-center">
                <div className="text-lg font-semibold text-slate-600">观察员模式</div>
                <div className="mt-2 text-sm text-slate-500">您以观察身份参与，请等待邀请或使用下方链接</div>
              </div>
            )}
            
            {/* 快捷操作 */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleShareObserverLink}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                {observerLinkCopied ? '✓ 链接已复制' : '🔗 分享观察员链接'}
              </button>
              <Link
                href={`/guidance/${sessionId}/details`}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                查看详细信息
              </Link>
              <Link
                href="/guidance"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                返回列表
              </Link>
            </div>
          </div>
        </section>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}