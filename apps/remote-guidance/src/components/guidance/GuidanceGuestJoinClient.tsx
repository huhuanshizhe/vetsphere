'use client';

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import { useState } from "react";

type GuestTokenState = {
  token: string;
  server_url: string;
  room_name: string;
  participant_name: string;
  role: string;
  session_title: string;
};

export default function GuidanceGuestJoinClient({ inviteToken }: { inviteToken: string }) {
  const [guestName, setGuestName] = useState("");
  const [roomState, setRoomState] = useState<GuestTokenState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectRoom, setConnectRoom] = useState(false);

  async function joinRoom() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/guidance/guest/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteToken,
          guestName,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "获取入会凭证失败。");
      }

      setRoomState(payload.data);
      setConnectRoom(true);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "获取入会凭证失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-5 py-8 lg:px-8">
        <section className="guidance-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="border-b border-slate-200 px-7 py-8 lg:border-b-0 lg:border-r">
              <span className="guidance-pill inline-flex bg-amber-50 text-amber-700">Emergency Join</span>
              <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">
                直接进入今晚的远程指导房间。
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                这个链接用于应急跨国指导，不要求你先注册 VetSphere。输入一个展示名称后，系统会为你签发临时 LiveKit 入会凭证。
              </p>

              <div className="mt-6 grid gap-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">显示名称</span>
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="例如：Dr. Maria / Remote Expert"
                    className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                  />
                </label>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void joinRoom()}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {busy ? "正在申请入会凭证..." : "进入远程指导房间"}
                </button>
              </div>

              {error ? (
                <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="bg-[linear-gradient(160deg,rgba(13,148,136,0.08),rgba(245,158,11,0.08))] px-7 py-8">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_40px_rgba(16,32,51,0.08)]">
                <div className="text-sm font-semibold text-slate-500">接入说明</div>
                <ol className="mt-4 grid gap-3 text-sm leading-7 text-slate-600">
                  <li>1. 允许浏览器使用摄像头和麦克风。</li>
                  <li>2. 输入你的显示名称，点击进入。</li>
                  <li>3. 入会后先确认音视频状态，再开始术中沟通。</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {roomState?.token ? (
          <section className="guidance-card overflow-hidden rounded-[2rem] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-3 pt-2">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Live Room</div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {roomState.session_title}
                </h2>
                <div className="mt-2 text-sm text-slate-500">
                  {roomState.participant_name} · {roomState.room_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConnectRoom((value) => !value)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {connectRoom ? "断开连接" : "重新连接"}
              </button>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950">
              <LiveKitRoom
                token={roomState.token}
                serverUrl={roomState.server_url}
                connect={connectRoom}
                audio={true}
                video={true}
                data-lk-theme="default"
                className="h-[72vh] min-h-[640px]"
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
