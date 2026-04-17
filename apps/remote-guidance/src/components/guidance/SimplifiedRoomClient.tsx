'use client';

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
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
  status: string;
  session_state_v2?: string | null;
};

// 角色特定的工具栏
function RoleToolbar({ role }: { role: string }) {
  if (role === 'observer') {
    return (
      <div className="rounded-[1.5rem] bg-slate-100 px-5 py-4 text-sm text-slate-600">
        观察员模式：您只能观看，无法发布音频或视频
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-600">
          角色: <span className="font-semibold text-slate-900">{guidanceParticipantRoleLabels[role] || role}</span>
        </span>
        {role === 'expert' && (
          <span className="text-teal-600">
            ✏️ 您可以实时标注指导
          </span>
        )}
        {role === 'surgeon' && (
          <span className="text-teal-600">
            🎥 您可以切换视频源
          </span>
        )}
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

export default function SimplifiedRoomClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取会话信息和房间凭证（一键入房）
  const enterRoom = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error("请先在中国站完成登录。");
      }

      // 1. 确保房间已打开
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
      setConnecting(false);
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void enterRoom();
  }, [enterRoom]);

  // 自动连接视频房间
  useEffect(() => {
    if (roomState?.token && roomState?.server_url && !connected) {
      setConnected(true);
      setConnecting(false);
    }
  }, [roomState, connected]);

  // 断开连接处理
  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setRoomState(null);
    router.push(`/guidance/${sessionId}`);
  }, [router, sessionId]);

  if (loading && !roomState) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-5 py-8 lg:px-8">
          <section className="guidance-card rounded-[2rem] px-7 py-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Room Entry</div>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">
              正在进入手术室...
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              系统正在自动打开房间并获取入房凭证，请稍候。
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
              <span className="guidance-pill bg-teal-600/10 text-teal-700">手术室</span>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {sessionInfo?.title || "远程指导"}
              </h2>
              <div className="mt-1 text-sm text-slate-500">
                房间: {roomState?.room_name || "..."}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConnectionStatus connected={connected} />
              <button
                onClick={handleDisconnect}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                离开房间
              </button>
            </div>
          </div>
        </section>

        {/* 角色工具栏 */}
        {roomState?.actor_role && (
          <RoleToolbar role={roomState.actor_role} />
        )}

        {/* 视频房间 */}
        {roomState?.token && roomState?.server_url && (
          <section className="guidance-card overflow-hidden rounded-[2rem]">
            <LiveKitRoom
              token={roomState.token}
              serverUrl={roomState.server_url}
              connect={true}
              video={true}
              audio={true}
              onDisconnected={handleDisconnect}
              className="h-[70vh] min-h-[500px]"
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          </section>
        )}

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