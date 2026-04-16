'use client';

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccessTokenSafe } from "@vetsphere/shared/services/supabase";

type RoomState = {
  provider?: string | null;
  room_name?: string | null;
  participant_identity?: string | null;
  participant_name?: string | null;
  token?: string | null;
  server_url?: string | null;
  integration_status?: string | null;
};

type SessionState = {
  title: string;
  status: string;
  rtc_room_name?: string | null;
  rtc_provider?: string | null;
};

export default function GuidanceRoomPrepClient({ sessionId }: { sessionId: string }) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"open" | "token" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectRoom, setConnectRoom] = useState(false);

  async function authorizedFetch(path: string, init?: RequestInit) {
    const token = await getAccessTokenSafe();
    if (!token) {
      throw new Error("未获取到登录态，请先在中国站完成登录。");
    }

    const response = await fetch(path, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      ...init,
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.message || "请求失败。");
    }

    return payload;
  }

  async function loadSession() {
    setLoading(true);
    setError(null);

    try {
      const payload = await authorizedFetch(`/api/guidance/sessions/${sessionId}`);
      setSessionState(payload?.data?.session || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载会话失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSession();
  }, [sessionId]);

  async function openRoom() {
    setBusy("open");
    setMessage(null);
    setError(null);

    try {
      const payload = await authorizedFetch(`/api/guidance/sessions/${sessionId}/room/open`, {
        method: "POST",
      });

      setSessionState(payload?.data?.session || null);
      setRoomState(payload?.data?.room || null);
      setMessage("房间准备完成，下一步只差服务端签发真实 RTC token。");
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "打开房间失败。");
    } finally {
      setBusy(null);
    }
  }

  async function requestToken() {
    setBusy("token");
    setMessage(null);
    setError(null);

    try {
      const payload = await authorizedFetch(`/api/guidance/sessions/${sessionId}/token`, {
        method: "POST",
      });

      setRoomState(payload?.data || null);
      setConnectRoom(true);
      setMessage(payload?.message || "Token 接口已返回房间占位结果。");
    } catch (tokenError) {
      setError(tokenError instanceof Error ? tokenError.message : "申请 token 失败。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-5 py-8 lg:px-8">
        <section className="guidance-card rounded-[2rem] px-7 py-8">
          <span className="guidance-pill inline-flex bg-teal-50 text-teal-700">Room Staging</span>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">
            先把房间准备流程固定住，再把 LiveKit 真正接进来。
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            这一页现在负责会话房间准备、申请 token 占位和接入状态提示。下一步对接 LiveKit 时，只需要把服务端签名和 WebRTC 客户端挂上来。
          </p>
        </section>

        {loading ? (
          <div className="guidance-card h-64 animate-pulse rounded-[2rem]" />
        ) : error && !sessionState ? (
          <section className="guidance-card rounded-[2rem] px-7 py-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">Unavailable</div>
            <h2 className="mt-4 text-3xl font-semibold text-slate-950">房间准备页暂时不可用</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{error}</p>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="border-b border-slate-200 pb-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Current Session</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  {sessionState?.title || "未命名会话"}
                </h2>
              </div>

              <dl className="mt-6 grid gap-4">
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <dt className="text-sm text-slate-500">会话状态</dt>
                  <dd className="mt-2 text-base font-semibold text-slate-900">{sessionState?.status || "未知"}</dd>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <dt className="text-sm text-slate-500">RTC Provider</dt>
                  <dd className="mt-2 text-base font-semibold text-slate-900">{sessionState?.rtc_provider || "livekit"}</dd>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <dt className="text-sm text-slate-500">房间名</dt>
                  <dd className="mt-2 text-base font-semibold text-slate-900">{sessionState?.rtc_room_name || "尚未生成"}</dd>
                </div>
              </dl>
            </div>

            <div className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="border-b border-slate-200 pb-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Actions</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">房间准备动作</h2>
              </div>

              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void openRoom()}
                  className="rounded-[1.4rem] bg-slate-950 px-5 py-4 text-left text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <div>1. 打开房间</div>
                  <div className="mt-2 text-xs font-normal text-slate-300">生成房间名并把会话切到 ready</div>
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void requestToken()}
                  className="rounded-[1.4rem] border border-slate-300 px-5 py-4 text-left text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:opacity-60"
                >
                  <div>2. 请求 RTC token 占位</div>
                  <div className="mt-2 text-xs font-normal text-slate-500">目前会返回 provider/room 信息，下一步接 LiveKit 服务端签名</div>
                </button>
              </div>

              {message ? (
                <div className="mt-4 rounded-[1.25rem] border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                  {message}
                </div>
              ) : null}
              {error ? (
                <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-6 rounded-[1.4rem] border border-dashed border-slate-300 px-5 py-5">
                <div className="text-sm font-semibold text-slate-800">当前 token 返回</div>
                <pre className="mt-3 overflow-auto rounded-[1rem] bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-200">
{JSON.stringify(roomState, null, 2) || "{}"}
                </pre>
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/guidance/${sessionId}`}
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
          >
            返回会话详情
          </Link>
          <Link
            href="/guidance"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
          >
            返回会话列表
          </Link>
        </div>

        {roomState?.token && roomState?.server_url ? (
          <section className="guidance-card overflow-hidden rounded-[2rem] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-3 pt-2">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Live Room</div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {sessionState?.title || "远程指导房间"}
                </h2>
                <div className="mt-2 text-sm text-slate-500">
                  {roomState.participant_name || roomState.participant_identity} · {roomState.room_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConnectRoom((value) => !value)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {connectRoom ? "断开预览" : "连接房间"}
              </button>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950">
              <LiveKitRoom
                token={roomState.token}
                serverUrl={roomState.server_url}
                connect={connectRoom}
                video={true}
                audio={true}
                data-lk-theme="default"
                className="h-[72vh] min-h-[640px]"
                onDisconnected={() => setConnectRoom(false)}
              >
                <VideoConference />
                <RoomAudioRenderer />
              </LiveKitRoom>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
