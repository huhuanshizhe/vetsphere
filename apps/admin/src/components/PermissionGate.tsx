'use client';

import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGateProps {
  /** 所需权限码，如 'doctor_verify.approve' */
  code: string;
  /** 无权限时显示的内容（默认 null = 隐藏） */
  fallback?: React.ReactNode;
  /** 无权限时不隐藏，而是 disable 子元素（适合按钮） */
  mode?: 'hide' | 'disable';
  children: React.ReactNode;
}

/**
 * 按权限码控制子元素显示/禁用。
 *
 * 用法：
 *   <PermissionGate code="doctor_verify.approve">
 *     <button onClick={onApprove}>批准</button>
 *   </PermissionGate>
 *
 *   <PermissionGate code="doctor_verify.approve" mode="disable">
 *     <button onClick={onApprove}>批准</button>
 *   </PermissionGate>
 */
export function PermissionGate({
  code,
  fallback = null,
  mode = 'hide',
  children,
}: PermissionGateProps) {
  const allowed = usePermission(code);
  if (allowed) return <>{children}</>;
  if (mode === 'hide') return <>{fallback}</>;
  // disable: 包一层让子元素不可点
  return (
    <span
      style={{ opacity: 0.45, pointerEvents: 'none', cursor: 'not-allowed' }}
      title="权限不足"
    >
      {children}
    </span>
  );
}
