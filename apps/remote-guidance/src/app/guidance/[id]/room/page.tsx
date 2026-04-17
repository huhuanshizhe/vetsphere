'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessTokenSafe } from "@vetsphere/shared/services/supabase";
import SurgeonRoomClient from "@/components/guidance/SurgeonRoomClient";
import ExpertRoomClient from "@/components/guidance/ExpertRoomClient";

type Props = {
  params: Promise<{ id: string }>;
};

type ActorRole = 'surgeon' | 'assistant' | 'expert' | 'moderator' | 'admin' | 'observer' | null;

// 角色检测加载页面
function RoleDetectingLoader() {
  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-5 py-8 lg:px-8">
        <section className="guidance-card rounded-[2rem] px-7 py-8">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">手术室</div>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">
            正在识别您的角色...
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            系统正在根据您的身份自动加载对应的手术室界面。
          </p>
        </section>
      </div>
    </main>
  );
}

// 角色无权限提示
function NoAccessPage({ sessionId }: { sessionId: string }) {
  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-5 py-8 lg:px-8">
        <section className="guidance-card rounded-[2rem] px-7 py-8">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">无访问权限</div>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">
            您没有权限进入这个手术室
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            当前账号没有参与这个远程指导会话的权限。请联系会话创建者获取邀请。
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href="/guidance"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              返回会话列表
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

// 错误页面
function ErrorPage({ message }: { message: string }) {
  return (
    <main className="guidance-shell">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-5 py-8 lg:px-8">
        <section className="guidance-card rounded-[2rem] px-7 py-8">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">错误</div>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-slate-950">加载失败</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{message}</p>
        </section>
      </div>
    </main>
  );
}

export default function RoleBasedRoomPage({ params }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [actorRole, setActorRole] = useState<ActorRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取角色信息
  useEffect(() => {
    async function detectRole() {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        setSessionId(id);

        const token = await getAccessTokenSafe();
        if (!token) {
          // 没有登录，跳转到登录页
          router.push(`/auth?redirect=/guidance/${id}/room`);
          return;
        }

        // 获取会话详情以确定角色
        const response = await fetch(`/api/guidance/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "获取会话信息失败。");
        }

        const role = payload?.data?.actorRole as ActorRole;
        setActorRole(role);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "角色检测失败。");
        setLoading(false);
      }
    }

    void detectRole();
  }, [params, router]);

  // 根据角色渲染对应组件
  if (loading || !sessionId) {
    return <RoleDetectingLoader />;
  }

  if (error) {
    return <ErrorPage message={error} />;
  }

  // 角色无权限
  if (!actorRole) {
    return <NoAccessPage sessionId={sessionId} />;
  }

  // 根据角色选择组件
  switch (actorRole) {
    case 'surgeon':
    case 'assistant':
      // 主刀和助手使用主刀视角（可切换视频、紧急求助）
      return <SurgeonRoomClient sessionId={sessionId} />;
    
    case 'expert':
    case 'moderator':
    case 'admin':
      // 专家、协调员、管理员使用专家视角（标注工具栏、虚拟器械）
      return <ExpertRoomClient sessionId={sessionId} />;
    
    case 'observer':
      // 观察员通常通过邀请链接进入 /join/[token]
      // 直接访问房间页面时显示无权限
      return <NoAccessPage sessionId={sessionId} />;
    
    default:
      return <NoAccessPage sessionId={sessionId} />;
  }
}