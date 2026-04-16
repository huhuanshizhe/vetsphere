export const guidanceStatusLabels: Record<string, string> = {
  draft: "草稿",
  requested: "待分诊",
  triaged: "已分诊",
  expert_assigned: "已指派专家",
  scheduled: "已排期",
  ready: "待进入",
  live: "进行中",
  paused: "暂停中",
  ended: "已结束",
  archived: "已归档",
  cancelled: "已取消",
};

export const guidancePriorityLabels: Record<string, string> = {
  routine: "常规",
  urgent: "加急",
  critical: "危急",
};

export const guidanceSessionTypeLabels: Record<string, string> = {
  live_guidance: "术中指导",
  case_discussion: "病例讨论",
  teaching_demo: "教学示教",
};

export const guidanceParticipantRoleLabels: Record<string, string> = {
  surgeon: "术者",
  assistant: "助手",
  expert: "远程专家",
  observer: "观察员",
  moderator: "协调员",
  admin: "管理员",
};

export function formatGuidanceDate(value?: string | null) {
  if (!value) {
    return "待排期";
  }

  try {
    return new Date(value).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function getStatusTone(status: string) {
  if (status === "live") return "bg-teal-600/10 text-teal-700";
  if (status === "cancelled") return "bg-rose-500/10 text-rose-700";
  if (status === "ended" || status === "archived") return "bg-slate-200 text-slate-700";
  if (status === "ready" || status === "scheduled" || status === "expert_assigned") return "bg-amber-400/15 text-amber-700";
  return "bg-slate-100 text-slate-700";
}
