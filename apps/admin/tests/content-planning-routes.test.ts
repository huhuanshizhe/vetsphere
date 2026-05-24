import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  admin: {
    id: 'admin-1',
    email: 'admin@example.com',
    authorizedSites: ['cn', 'intl', 'global'],
    permissions: ['*'],
  },
  assertSiteAuthorized: vi.fn(),
  writeAuditLog: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  extractAccessToken: vi.fn().mockReturnValue('test-token'),
}));

vi.mock('@/lib/auth-middleware', () => ({
  withAdminAuth:
    (handler: any) =>
    async (req: NextRequest, routeCtx?: { params?: Promise<Record<string, string>> | Record<string, string> }) => {
      const params = routeCtx?.params ? await Promise.resolve(routeCtx.params) : undefined;
      return handler(req, { admin: mocks.admin, params });
    },
  assertSiteAuthorized: mocks.assertSiteAuthorized,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('@/lib/request-auth', () => ({
  extractAccessToken: mocks.extractAccessToken,
}));

import { POST as CREATE_BRIEF_POST } from '../src/app/api/v1/admin/content/briefs/route';
import { PATCH as UPDATE_BRIEF_PATCH } from '../src/app/api/v1/admin/content/briefs/[id]/route';
import { POST as SCHEDULE_POST } from '../src/app/api/v1/admin/content/[id]/schedule/route';

function createJsonRequest(url: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-token',
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('content planning API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertSiteAuthorized.mockImplementation(() => undefined);
    mocks.writeAuditLog.mockImplementation(() => undefined);
  });

  it('creates a content brief owned by the current admin', async () => {
    let insertPayload: Record<string, unknown> | null = null;

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_briefs') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertPayload = payload;
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'brief-1',
                      content_id: 'content-1',
                      site_code: 'intl',
                      locale: 'en',
                      title: 'TPLO expansion brief',
                      target_audience: 'Referral clinics',
                      search_intent: 'commercial investigation',
                      primary_angle: 'Training pathway',
                      status: 'draft',
                      owner_id: 'admin-1',
                      updated_at: '2026-05-24T00:00:00.000Z',
                      created_at: '2026-05-24T00:00:00.000Z',
                    },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await CREATE_BRIEF_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/briefs', 'POST', {
        siteCode: 'intl',
        locale: 'en',
        title: 'TPLO expansion brief',
        contentId: 'content-1',
        targetAudience: 'Referral clinics',
        searchIntent: 'commercial investigation',
        primaryAngle: 'Training pathway',
        status: 'draft',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      brief: {
        id: 'brief-1',
        owner_id: 'admin-1',
      },
    });
    expect(insertPayload).toMatchObject({
      content_id: 'content-1',
      site_code: 'intl',
      locale: 'en',
      title: 'TPLO expansion brief',
      target_audience: 'Referral clinics',
      search_intent: 'commercial investigation',
      primary_angle: 'Training pathway',
      status: 'draft',
      owner_id: 'admin-1',
    });
    expect(mocks.assertSiteAuthorized).toHaveBeenCalledWith(mocks.admin, 'intl');
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
  });

  it('updates an existing content brief', async () => {
    let updatePayload: Record<string, unknown> | null = null;

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_briefs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'brief-1',
                    site_code: 'intl',
                    title: 'TPLO expansion brief',
                  },
                  error: null,
                }),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
              updatePayload = payload;
              return {
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: 'brief-1',
                        content_id: null,
                        site_code: 'intl',
                        locale: 'en',
                        title: 'Updated brief title',
                        target_audience: null,
                        search_intent: 'commercial investigation',
                        primary_angle: 'Updated angle',
                        status: 'ready',
                        owner_id: 'admin-1',
                        updated_at: '2026-05-24T01:00:00.000Z',
                        created_at: '2026-05-24T00:00:00.000Z',
                      },
                      error: null,
                    }),
                  })),
                })),
              };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await UPDATE_BRIEF_PATCH(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/briefs/brief-1', 'PATCH', {
        title: 'Updated brief title',
        targetAudience: '',
        searchIntent: 'commercial investigation',
        primaryAngle: 'Updated angle',
        status: 'ready',
      }),
      {
        params: Promise.resolve({ id: 'brief-1' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      brief: {
        id: 'brief-1',
        status: 'ready',
      },
    });
    expect(updatePayload).toMatchObject({
      title: 'Updated brief title',
      target_audience: null,
      search_intent: 'commercial investigation',
      primary_angle: 'Updated angle',
      status: 'ready',
    });
    expect(mocks.assertSiteAuthorized).toHaveBeenCalledWith(mocks.admin, 'intl');
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
  });

  it('schedules content and records a workflow event', async () => {
    const updateCalls: Record<string, unknown> = {};

    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'content_records') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    workflow_state: 'approved',
                  },
                  error: null,
                }),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
              updateCalls.contentRecord = payload;
              return {
                eq: vi.fn(async (column: string, value: string) => {
                  updateCalls.contentRecordFilter = { column, value };
                  return { error: null };
                }),
              };
            }),
          };
        }

        if (table === 'content_workflow_events') {
          return {
            insert: vi.fn(async (payload: Record<string, unknown>) => {
              updateCalls.workflowEvent = payload;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await SCHEDULE_POST(
      createJsonRequest('http://localhost:3002/api/v1/admin/content/content-1/schedule', 'POST', {
        siteCode: 'intl',
        notes: 'Schedule for next publishing slot',
      }),
      {
        params: Promise.resolve({ id: 'content-1' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(updateCalls.contentRecord).toMatchObject({
      workflow_state: 'scheduled',
      reviewer_id: 'admin-1',
    });
    expect(updateCalls.contentRecordFilter).toEqual({ column: 'id', value: 'content-1' });
    expect(updateCalls.workflowEvent).toMatchObject({
      content_id: 'content-1',
      event_type: 'schedule',
      actor_id: 'admin-1',
      old_state: 'approved',
      new_state: 'scheduled',
      payload_json: { siteCode: 'intl' },
      notes: 'Schedule for next publishing slot',
    });
    expect(mocks.assertSiteAuthorized).toHaveBeenCalledWith(mocks.admin, 'intl');
    expect(mocks.writeAuditLog).toHaveBeenCalledOnce();
  });
});