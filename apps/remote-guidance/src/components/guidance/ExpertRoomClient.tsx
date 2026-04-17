'use client';

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useLocalParticipant,
  useDataChannel,
} from "@livekit/components-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

// 标注类型
type AnnotationType = 'line' | 'arrow' | 'text' | 'circle' | 'rectangle';

// 标注数据
type Annotation = {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
};

// 标注工具栏
function AnnotationToolbar({
  activeTool,
  onToolChange,
  color,
  onColorChange,
  onClear,
}: {
  activeTool: AnnotationType;
  onToolChange: (tool: AnnotationType) => void;
  color: string;
  onColorChange: (color: string) => void;
  onClear: () => void;
}) {
  const tools: { type: AnnotationType; icon: string; label: string }[] = [
    { type: 'arrow', icon: '→', label: '箭头' },
    { type: 'line', icon: '━', label: '画线' },
    { type: 'text', icon: 'T', label: '文字' },
    { type: 'circle', icon: '○', label: '圆圈' },
    { type: 'rectangle', icon: '□', label: '矩形' },
  ];

  const colors = ['#FF4444', '#FF8800', '#00CC00', '#0088FF', '#FFFFFF'];

  return (
    <div className="rounded-[1.5rem] border border-teal-200 bg-teal-50 px-5 py-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* 标注工具 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-teal-700">✏️ 标注工具:</span>
          {tools.map(tool => (
            <button
              key={tool.type}
              onClick={() => onToolChange(tool.type)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activeTool === tool.type
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-teal-700 hover:bg-teal-100'
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
          <button
            onClick={onClear}
            className="rounded-full bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-200"
          >
            ✕ 清除
          </button>
        </div>

        {/* 颜色选择 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-teal-700">颜色:</span>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={`w-6 h-6 rounded-full border-2 transition ${
                color === c ? 'border-slate-900 scale-110' : 'border-slate-300'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// 虚拟器械工具栏
function InstrumentToolbar({
  onInstrumentSelect,
  activeInstrument,
}: {
  onInstrumentSelect: (instrument: string) => void;
  activeInstrument: string | null;
}) {
  const instruments: { id: string; icon: string; label: string }[] = [
    { id: 'scalpel', icon: '🔪', label: '手术刀' },
    { id: 'clamp', icon: '🔗', label: '止血钳' },
    { id: 'drill', icon: '⚙️', label: '骨钻' },
    { id: 'needle', icon: '🪡', label: '缝合针' },
    { id: 'suction', icon: '💧', label: '吸引器' },
  ];

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">🏥 虚拟器械:</span>
        {instruments.map(inst => (
          <button
            key={inst.id}
            onClick={() => onInstrumentSelect(inst.id)}
            className={`rounded-full px-3 py-2 text-lg transition ${
              activeInstrument === inst.id
                ? 'bg-teal-100 ring-2 ring-teal-500'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title={inst.label}
          >
            {inst.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// 术前摘要面板
function PreopSummaryPanel({ summary }: { summary: string | null }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
      <div className="text-sm font-semibold text-slate-700 mb-2">📋 术前摘要</div>
      <div className="text-sm text-slate-600 leading-6">
        {summary || "未填写术前摘要。这里会显示病例情况、手术风险点等关键信息。"}
      </div>
    </div>
  );
}

// 专家指导工具栏
function ExpertGuidanceToolbar({
  onCaptureScreenshot,
  onRequestPause,
}: {
  onCaptureScreenshot: () => void;
  onRequestPause: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onCaptureScreenshot}
          className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          📸 截图标记
        </button>
        <button
          onClick={onRequestPause}
          className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
        >
          ⏸️ 请求暂停
        </button>
        <div className="ml-auto text-sm text-slate-500">
          语音指导: 已开启
        </div>
      </div>
    </div>
  );
}

// 连接状态
function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
      connected ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {connected ? '● 已连接' : '○ 连接中...'}
    </div>
  );
}

export default function ExpertRoomClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 标注状态
  const [activeTool, setActiveTool] = useState<AnnotationType>('arrow');
  const [annotationColor, setAnnotationColor] = useState('#FF4444');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeInstrument, setActiveInstrument] = useState<string | null>(null);
  const [instrumentPosition, setInstrumentPosition] = useState<{ x: number; y: number } | null>(null);

  // 视频容器引用（用于标注）
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // 获取会话信息和房间凭证
  const enterRoom = useCallback(async () => {
    setError(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error("请先登录。");
      }

      // 打开房间
      const roomResponse = await fetch(`/api/guidance/sessions/${sessionId}/room/open`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const roomPayload = await roomResponse.json();
      if (!roomResponse.ok) {
        throw new Error(roomPayload?.message || "打开房间失败。");
      }

      setSessionInfo(roomPayload?.data?.session || null);

      // 获取入房凭证
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

  // 清除标注
  const handleClearAnnotations = useCallback(() => {
    setAnnotations([]);
    setActiveInstrument(null);
    setInstrumentPosition(null);
  }, []);

  // 截图标记
  const handleCaptureScreenshot = useCallback(() => {
    // TODO: 实现截图功能，保存到数据库
    console.log('Screenshot captured');
  }, []);

  // 请求暂停
  const handleRequestPause = useCallback(() => {
    // TODO: 通过DataChannel发送暂停请求
    console.log('Pause requested');
  }, []);

  // 断开连接
  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setRoomState(null);
    router.push(`/guidance/${sessionId}`);
  }, [router, sessionId]);

  // 处理视频上的点击（放置标注或器械）
  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoContainerRef.current) return;

    const rect = videoContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeInstrument) {
      // 放置虚拟器械
      setInstrumentPosition({ x, y });
    } else {
      // 添加标注点
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: activeTool,
        x,
        y,
        color: annotationColor,
      };
      setAnnotations(prev => [...prev, newAnnotation]);
    }
  }, [activeTool, annotationColor, activeInstrument]);

  if (loading && !roomState) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-5 py-8 lg:px-8">
          <section className="guidance-card rounded-[2rem] px-7 py-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">专家手术室</div>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">
              正在进入专家指导位置...
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              作为指导专家，您可以实时标注、放置虚拟器械、进行语音指导。
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
              <span className="guidance-pill bg-teal-600 text-white">专家视角</span>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {sessionInfo?.title || "远程指导"}
              </h2>
              <div className="mt-1 text-sm text-slate-500">
                {sessionInfo?.procedure_name || "未填写术式"} · {sessionInfo?.hospital_name || "未填写机构"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConnectionStatus connected={connected} />
              <button
                onClick={handleDisconnect}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                离开指导
              </button>
            </div>
          </div>
        </section>

        {/* 术前摘要 */}
        <PreopSummaryPanel summary={sessionInfo?.clinical_summary ?? null} />

        {/* 标注工具栏 */}
        <AnnotationToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          color={annotationColor}
          onColorChange={setAnnotationColor}
          onClear={handleClearAnnotations}
        />

        {/* 虚拟器械工具栏 */}
        <InstrumentToolbar
          onInstrumentSelect={setActiveInstrument}
          activeInstrument={activeInstrument}
        />

        {/* 视频房间 + 标注层 */}
        {roomState?.token && roomState?.server_url && (
          <section 
            ref={videoContainerRef}
            className="guidance-card overflow-hidden rounded-[2rem] relative cursor-crosshair"
            onClick={handleVideoClick}
          >
            {/* 标注渲染层 */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {annotations.map(ann => (
                <div
                  key={ann.id}
                  className="absolute"
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    color: ann.color,
                  }}
                >
                  {ann.type === 'arrow' && (
                    <svg width="40" height="40" style={{ transform: 'translate(-20px, -20px)' }}>
                      <line x1="0" y1="20" x2="40" y2="20" stroke={ann.color} strokeWidth="3" />
                      <polygon points="40,15 40,25 50,20" fill={ann.color} />
                    </svg>
                  )}
                  {ann.type === 'circle' && (
                    <div 
                      className="w-8 h-8 rounded-full border-3"
                      style={{ borderColor: ann.color, transform: 'translate(-16px, -16px)' }}
                    />
                  )}
                </div>
              ))}
              {/* 虚拟器械 */}
              {activeInstrument && instrumentPosition && (
                <div
                  className="absolute text-2xl"
                  style={{
                    left: `${instrumentPosition.x}%`,
                    top: `${instrumentPosition.y}%`,
                    transform: 'translate(-16px, -16px)',
                  }}
                >
                  {activeInstrument === 'scalpel' && '🔪'}
                  {activeInstrument === 'clamp' && '🔗'}
                  {activeInstrument === 'drill' && '⚙️'}
                  {activeInstrument === 'needle' && '🪡'}
                  {activeInstrument === 'suction' && '💧'}
                </div>
              )}
            </div>

            <LiveKitRoom
              token={roomState.token}
              serverUrl={roomState.server_url}
              connect={true}
              video={true}
              audio={true}
              onConnected={() => setConnected(true)}
              onDisconnected={handleDisconnect}
              className="h-[60vh] min-h-[420px]"
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          </section>
        )}

        {/* 专家指导工具栏 */}
        <ExpertGuidanceToolbar
          onCaptureScreenshot={handleCaptureScreenshot}
          onRequestPause={handleRequestPause}
        />

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