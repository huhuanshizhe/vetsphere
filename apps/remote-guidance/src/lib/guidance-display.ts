// 新简化状态系统 (V2)
export const guidanceStateV2Labels: Record<string, string> = {
  waiting: "等待中",
  live: "进行中",
  paused: "暂停中",
  ended: "已结束",
  archived: "已归档",
  cancelled: "已取消",
};

// 旧状态标签（兼容）
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

// 旧状态到新状态的映射
export function mapToStateV2(oldStatus: string): string {
  const map: Record<string, string> = {
    draft: "waiting",
    requested: "waiting",
    triaged: "waiting",
    expert_assigned: "waiting",
    scheduled: "waiting",
    ready: "waiting",
    live: "live",
    paused: "paused",
    ended: "ended",
    archived: "archived",
    cancelled: "cancelled",
  };
  return map[oldStatus] || oldStatus;
}

// 获取显示标签（优先使用V2状态）
export function getStateLabel(status: string, stateV2?: string | null): string {
  if (stateV2 && guidanceStateV2Labels[stateV2]) {
    return guidanceStateV2Labels[stateV2];
  }
  // 兼容旧状态
  const mappedState = mapToStateV2(status);
  return guidanceStateV2Labels[mappedState] || guidanceStatusLabels[status] || status;
}

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

// 获取状态颜色样式（支持V2状态）
export function getStatusTone(status: string, stateV2?: string | null): string {
  const effectiveState = stateV2 || mapToStateV2(status);
  
  if (effectiveState === "live") return "bg-teal-600/10 text-teal-700";
  if (effectiveState === "cancelled") return "bg-rose-500/10 text-rose-700";
  if (effectiveState === "ended" || effectiveState === "archived") return "bg-slate-200 text-slate-700";
  if (effectiveState === "waiting" || effectiveState === "paused") return "bg-amber-400/15 text-amber-700";
  return "bg-slate-100 text-slate-700";
}
