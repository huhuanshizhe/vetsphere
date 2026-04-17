'use client';

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { guidanceParticipantRoleLabels, guidanceSessionTypeLabels } from "@/lib/guidance-display";

type GuestTokenState = {
  token: string;
  server_url: string;
  room_name: string;
  participant_name: string;
  role: string;
  session_title: string;
};

// 会话信息卡片（简化版，不显示敏感信息）
function SessionInfoCard({
  title,
  procedureName,
  sessionType,
}: {
  title: string;
  procedureName?: string;
  sessionType?: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4">
      <div className="text-sm font-semibold text-slate-600">观察室</div>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
        {procedureName && (
          <span className="rounded-full bg-slate-200 px-3 py-1">{procedureName}</span>
        )}
        {sessionType && (
          <span className="rounded-full bg-slate-200 px-3 py-1">
            {guidanceSessionTypeLabels[sessionType] || sessionType}
          </span>
        )}
      </div>
    </div>
  );
}

// 参与者状态（简化版）
function ParticipantStatusCard({
  name,
  role,
  online,
}: {
  name: string;
  role: string;
  online: boolean;
}) {
  return (
    <div className="rounded-[1.3rem] bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{name}</div>
          <div className="text-xs text-slate-500">
            {guidanceParticipantRoleLabels[role] || role}
          </div>
        </div>
        <span className={`text-lg ${online ? 'text-teal-600' : 'text-slate-400'}`}>
          {online ? '●' : '○'}
        </span>
      </div>
    </div>
  );
}

// 观察员提示
function ObserverNotice() {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-100 px-5 py-4">
      <div className="text-sm text-slate-600">
        <span className="font-semibold text-slate-700">观察员模式：</span>
        您以观察身份参与，可以观看视频但无法发布音频、视频或进行标注。
      </div>
    </div>
  );
}

// 已进行时间
function ElapsedTime({ startTime }: { startTime?: string | null }) {
  const [elapsed, setElapsed] = useState("0分钟");

  useEffect(() => {
    if (!startTime) {
      setElapsed("未开始");
      return;
    }

    const updateElapsed = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();

      if (diffMs < 0) {
        setElapsed("未开始");
        return;
      }

      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 60) {
        setElapsed(`${minutes}分钟`);
      } else {
        const hours = Math.floor(minutes / 60);
        const remainMinutes = minutes % 60;
        setElapsed(`${hours}小时${remainMinutes}分钟`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="rounded-[1.3rem] bg-teal-50 px-4 py-3">
      <div className="text-sm text-teal-600">已进行</div>
      <div className="mt-1 text-lg font-semibold text-teal-700">{elapsed}</div>
    </div>
  );
}

export default function ObserverRoomClient({ inviteToken }: { inviteToken: string }) {
  const router = useRouter();
  const [guestName, setGuestName] = useState("");
  const [roomState, setRoomState] = useState<GuestTokenState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // 获取观察员入房凭证
  const joinRoom = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/guidance/guest/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken,
          guestName: guestName || "观察员",
          role: "observer",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "获取入房凭证失败。");
      }

      setRoomState(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "入房失败。");
    } finally {
      setLoading(false);
    }
  }, [inviteToken, guestName]);

  // 断开连接
  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setRoomState(null);
  }, []);

  // 离开观察室
  const handleLeave = useCallback(() => {
    router.push("/guidance");
  }, [router]);

  // 入房前输入名字页面
  if (!roomState) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-5 py-8 lg:px-8">
          <section className="guidance-card overflow-hidden rounded-[2rem]">
            <div className="grid gap-0 lg:grid-cols-[1fr_0.8fr]">
              <div className="border-b border-slate-200 px-7 py-8 lg:border-b-0 lg:border-r">
                <span className="guidance-pill inline-flex bg-amber-50 text-amber-700">观察员入口</span>
                <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">
                  进入远程指导观察室
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                  您以观察身份参与，只能观看视频，无法发布音频、视频或进行标注。请输入您的显示名称后进入。
                </p>

                <div className="mt-6 grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">显示名称</span>
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="例如：Dr. Maria / 观察员"
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                    />
                  </label>

                  <button
                    onClick={() => void joinRoom()}
                    disabled={loading}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loading ? "正在连接..." : "进入观察室"}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="bg-[linear-gradient(160deg,rgba(13,148,136,0.08),rgba(245,158,11,0.08))] px-7 py-8">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5">
                  <div className="text-sm font-semibold text-slate-500">观察员须知</div>
                  <ol className="mt-4 grid gap-3 text-sm leading-7 text-slate-600">
                    <li>1. 观察员无需登录，只需输入显示名称。</li>
                    <li>2. 可以观看视频，但不能发布音频/视频。</li>
                    <li>3. 可以看到专家标注，但不能自己标注。</li>
                    <li>4. 随时可以离开，不影响手术进行。</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // 观察员视频页面（纯观看）
  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-5 py-6 lg:px-8">
        
        {/* 会话信息 */}
        <SessionInfoCard
          title={roomState.session_title}
          sessionType="live_guidance"
        />

        {/* 观察员提示 */}
        <ObserverNotice />

        {/* 视频房间（无发布权限） */}
        <section className="guidance-card overflow-hidden rounded-[2rem]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
            <div className="text-sm text-slate-500">
              {roomState.participant_name} · {roomState.room_name}
            </div>
            <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              connected ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {connected ? '● 观看中' : '○ 连接中...'}
            </div>
          </div>

          <LiveKitRoom
            token={roomState.token}
            serverUrl={roomState.server_url}
            connect={true}
            video={false}  // 观察员不发布视频
            audio={false}  // 观察员不发布音频
            onConnected={() => setConnected(true)}
            onDisconnected={handleDisconnect}
            className="h-[60vh] min-h-[400px]"
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </section>

        {/* 底部操作 */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleLeave}
            className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700"
          >
            🚪 离开观察室
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
            <button 
              onClick={() => void joinRoom()}
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