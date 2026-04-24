import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { AdminProfile } from '@/lib/auth-middleware';

export interface AuditLogInput {
  module: string;
  action: string;
  targetType?: string;
  targetId?: string | null;
  targetName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  changesSummary?: string;
}

/**
 * 写入管理员操作审计日志（fire-and-forget，不阻塞主流程）。
 * 失败不会抛出，只 console.error。
 */
export function writeAuditLog(
  req: NextRequest,
  admin: AdminProfile,
  input: AuditLogInput
): void {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;
  const userAgent = req.headers.get('user-agent');

  const supabase = getSupabaseAdmin();
  // 异步写入，不 await
  supabase
    .from('admin_audit_logs')
    .insert({
      admin_user_id: admin.id,
      admin_name: admin.fullName || admin.email,
      module: input.module,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ? String(input.targetId) : null,
      target_name: input.targetName ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      changes_summary: input.changesSummary ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[audit] failed to write log:', error.message, input);
      }
    });
}
