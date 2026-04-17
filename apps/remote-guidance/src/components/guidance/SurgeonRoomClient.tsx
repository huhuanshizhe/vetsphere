'use client';

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAccessTokenSafe } from "@vetsphere/shared/services/supabase";
import { guidanceParticipantRoleLabels } from "@/lib/guidance-display";

type RoomState = {
  token: string;
  server_url: string;
  room_name: string;
  participant_identity: string;
  participant_name: string;
  actor_role: string;
};

type SessionInfo = {
  id: string;
  title: string;
  procedure_name?: string | null;
  patient_species?: string | null;
  hospital_name?: string | null;
  clinical_summary?: string | null;
};

// 视频源类型
type VideoSource = {
  id: string;
  label: string;
  type: 'surgical' | 'overview' | 'endoscope';
  active: boolean;
};

// 主刀医生工具栏 - 视频切换、紧急求助
function SurgeonToolbar({
  videoSources,
  onSwitchSource,
  onEmergencyHelp,
  emergencyActive,
}: {
  videoSources: VideoSource[];
  onSwitchSource: (id: string) => void;
  onEmergencyHelp: () => void;
  emergencyActive: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 视频源切换 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">🎥 视频源:</span>
          {videoSources.map(source => (
            <button
              key={source.id}
              onClick={() => onSwitchSource(source.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                source.active
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {source.label}
            </button>
          ))}
        </div>

        {/* 紧急求助按钮 */}
        <button
          onClick={onEmergencyHelp}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            emergencyActive
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {emergencyActive ? '⚠️ 紧急求助已发送' : '🚨 紧急求助'}
        </button>
      </div>
    </div>
  );
}

// 参与者状态卡片
function ParticipantCard({
  name,
  role,
  connected,
  isExpert,
}: {
  name: string;
  role: string;
  connected: boolean;
  isExpert?: boolean;
}) {
  return (
    <div className={`rounded-[1.3rem] px-4 py-3 ${
      isExpert ? 'bg-teal-50 border border-teal-200' : 'bg-slate-50'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`text-sm font-semibold ${isExpert ? 'text-teal-700' : 'text-slate-900'}`}>
            {name}
          </div>
          <div className="text-xs text-slate-500">
            {guidanceParticipantRoleLabels[role] || role}
          </div>
        </div>
        <span className={`text-lg ${connected ? 'text-teal-600' : 'text-slate-400'}`}>
          {connected ? '●' : '○'}
        </span>
      </div>
    </div>
  );
}

// 连接状态指示
function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
      connected ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {connected ? '● 已连接' : '○ 连接中...'}
    </div>
  );
}

export default function SurgeonRoomClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [activeVideoSource, setActiveVideoSource] = useState('surgical');

  // 视频源列表
  const videoSources: VideoSource[] = useMemo(() => [
    { id: 'surgical', label: '术野', type: 'surgical', active: activeVideoSource === 'surgical' },
    { id: 'overview', label: '全景', type: 'overview', active: activeVideoSource === 'overview' },
    { id: 'endoscope', label: '内窥镜', type: 'endoscope', active: activeVideoSource === 'endoscope' },
  ], [activeVideoSource]);

  // 获取会话信息和房间凭证
  const enterRoom = useCallback(async () => {
    setError(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error("请先在中国站完成登录。");
      }

      // 1. 打开房间
      const roomResponse = await fetch(`/api/guidance/sessions/${sessionId}/room/open`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const roomPayload = await roomResponse.json();
      if (!roomResponse.ok) {
        throw new Error(roomPayload?.message || "打开房间失败。");
      }

      setSessionInfo(roomPayload?.data?.session || null);

      // 2. 获取入房凭证
      const tokenResponse = await fetch(`/api/guidance/sessions/${sessionId}/token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const tokenPayload = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(tokenPayload?.message || "获取入房凭证失败。");
      }

      setRoomState(tokenPayload?.data || null);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "入房失败。");
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void enterRoom();
  }, [enterRoom]);

  // 切换视频源
  const handleSwitchSource = useCallback((sourceId: string) => {
    setActiveVideoSource(sourceId);
    // TODO: 实际切换视频源需要通过LiveKit控制
  }, []);

  // 紧急求助
  const handleEmergencyHelp = useCallback(() => {
    setEmergencyActive(true);
    // TODO: 通过DataChannel发送紧急信号给专家
    setTimeout(() => setEmergencyActive(false), 5000);
  }, []);

  // 断开连接
  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setRoomState(null);
    router.push(`/guidance/${sessionId}`);
  }, [router, sessionId]);

  if (loading && !roomState) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-5 py-8 lg:px-8">
          <section className="guidance-card rounded-[2rem] px-7 py-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">手术室</div>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">
              正在进入手术室...
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              作为主刀医生，您将可以切换视频源、发布视频和音频、发送紧急求助。
            </p>
          </section>
          
          {error && (
            <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-5 py-6 lg:px-8">
        
        {/* 顶部状态栏 */}
        <section className="guidance-card rounded-[1.5rem] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="guidance-pill bg-teal-600 text-white">主刀医生视角</span>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {sessionInfo?.title || "远程指导手术"}
              </h2>
              <div className="mt-1 text-sm text-slate-500">
                {sessionInfo?.procedure_name || "未填写术式"} · {sessionInfo?.patient_species || "未填写物种"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConnectionStatus connected={connected} />
              <button
                onClick={handleDisconnect}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                离开手术室
              </button>
            </div>
          </div>
        </section>

        {/* 主刀医生工具栏 */}
        <SurgeonToolbar
          videoSources={videoSources}
          onSwitchSource={handleSwitchSource}
          onEmergencyHelp={handleEmergencyHelp}
          emergencyActive={emergencyActive}
        />

        {/* 视频房间 */}
        {roomState?.token && roomState?.server_url && (
          <section className="guidance-card overflow-hidden rounded-[2rem]">
            <LiveKitRoom
              token={roomState.token}
              serverUrl={roomState.server_url}
              connect={true}
              video={true}
              audio={true}
              onConnected={() => setConnected(true)}
              onDisconnected={handleDisconnect}
              className="h-[65vh] min-h-[480px]"
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          </section>
        )}

        {/* 当前参与人员 */}
        <section className="guidance-card rounded-[1.5rem] px-5 py-4">
          <div className="text-sm font-medium text-slate-600 mb-3">当前参与人员</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ParticipantCard
              name={roomState?.participant_name || "您"}
              role="surgeon"
              connected={connected}
            />
            {/* TODO: 从LiveKit获取实际参与者列表 */}
          </div>
        </section>

        {/* 快捷操作 */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/guidance/${sessionId}/details`}
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
          >
            查看会话详情
          </Link>
          <Link
            href="/guidance"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
          >
            返回列表
          </Link>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
            <button 
              onClick={() => void enterRoom()}
              className="ml-3 font-semibold text-rose-800 underline"
            >
              重试
            </button>
          </div>
        )}
      </div>
    </main>
  );
}