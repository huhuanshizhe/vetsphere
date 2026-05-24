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
  getSupabaseAdmin: vi.fn(),
  extractAccessToken: vi.fn().mockReturnValue('test-token'),
}));

vi.mock('@/lib/auth-middleware', () => ({
  withAdminAuth: (handler: any) => async (req: NextRequest) => handler(req, { admin: mocks.admin }),
  assertSiteAuthorized: mocks.assertSiteAuthorized,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('@/lib/request-auth', () => ({
  extractAccessToken: mocks.extractAccessToken,
}));

import { GET as OPS_GET } from '../src/app/api/v1/admin/content/ops/route';

function createGetRequest(url: string) {
  const request = new Request(url, {
    method: 'GET',
    headers: {
      authorization: 'Bearer test-token',
    },
  }) as NextRequest & { nextUrl: URL };

  request.nextUrl = new URL(url);
  return request as NextRequest;
}

function createOrderableResult<T>(data: T[]) {
  return {
    order: vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({
        data,
        error: null,
      }),
    })),
  };
}

describe('content ops API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertSiteAuthorized.mockImplementation(() => undefined);
  });

  it('returns summary, review queue, schedule candidates, briefs, and filtered generation runs', async () => {
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'content_records') {
          return {
            select: vi.fn(() => createOrderableResult([
              {
                id: 'content-1',
                content_type: 'procedure',
                canonical_slug: 'tplo',
                workflow_state: 'in_review',
                primary_specialty: 'Orthopedics',
                primary_procedure: 'TPLO',
                publish_priority: 8,
                reviewer_id: 'reviewer-1',
                updated_at: '2026-03-01T00:00:00.000Z',
                published_at: null,
                content_localizations: [
                  {
                    locale: 'en',
                    title: 'TPLO guide',
                    summary: 'Ready for clinical review',
                    opening_answer: 'Short answer',
                    body_markdown: 'A'.repeat(650),
                    references_json: [{ title: 'source' }],
                  },
                ],
                content_site_views: [
                  {
                    id: 'view-1',
                    site_code: 'intl',
                    publish_status: 'draft',
                    slug_override: null,
                    seo_title_override: null,
                    seo_description_override: null,
                    is_featured: false,
                    display_order: 0,
                    route_status: 'active',
                    route_config_json: {},
                    published_at: null,
                  },
                ],
              },
              {
                id: 'content-2',
                content_type: 'resource',
                canonical_slug: 'orthopedic-pre-op-checklist',
                workflow_state: 'published',
                primary_specialty: 'Orthopedics',
                primary_procedure: null,
                publish_priority: 5,
                reviewer_id: 'reviewer-1',
                updated_at: '2026-01-01T00:00:00.000Z',
                published_at: '2026-01-20T00:00:00.000Z',
                content_localizations: [
                  {
                    locale: 'en',
                    title: 'Checklist',
                    summary: 'Published checklist',
                    opening_answer: 'Opening answer',
                    body_markdown: 'A'.repeat(650),
                    references_json: [{ title: 'source' }],
                  },
                ],
                content_site_views: [
                  {
                    id: 'view-2',
                    site_code: 'intl',
                    publish_status: 'published',
                    slug_override: null,
                    seo_title_override: null,
                    seo_description_override: null,
                    is_featured: true,
                    display_order: 1,
                    route_status: 'active',
                    route_config_json: {},
                    published_at: '2026-01-20T00:00:00.000Z',
                  },
                ],
              },
            ])),
          };
        }

        if (table === 'content_briefs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => createOrderableResult([
                {
                  id: 'brief-1',
                  content_id: 'content-1',
                  site_code: 'intl',
                  locale: 'en',
                  title: 'TPLO expansion brief',
                  target_audience: 'Referral clinics',
                  search_intent: 'commercial investigation',
                  primary_angle: 'Training pathway with equipment readiness',
                  status: 'ready',
                  owner_id: 'owner-1',
                  updated_at: '2026-05-20T00:00:00.000Z',
                  created_at: '2026-05-10T00:00:00.000Z',
                },
              ])),
            })),
          };
        }

        if (table === 'content_workflow_events') {
          return {
            select: vi.fn(() => createOrderableResult([
              {
                id: 'event-1',
                content_id: 'content-1',
                event_type: 'submit_review',
                old_state: 'draft',
                new_state: 'in_review',
                notes: 'Ready for expert review',
                payload_json: { siteCode: 'intl' },
                created_at: '2026-05-21T00:00:00.000Z',
              },
            ])),
          };
        }

        if (table === 'content_generation_runs') {
          return {
            select: vi.fn(() => createOrderableResult([
              {
                id: 'run-1',
                content_id: 'content-1',
                task_key: 'content_draft_generator',
                status: 'completed',
                model_name: 'qwen3.5-plus',
                created_at: '2026-05-22T00:00:00.000Z',
                input_json: { siteCode: 'intl' },
              },
              {
                id: 'run-2',
                content_id: 'content-3',
                task_key: 'content_draft_generator',
                status: 'completed',
                model_name: 'qwen3.5-plus',
                created_at: '2026-05-23T00:00:00.000Z',
                input_json: { siteCode: 'cn' },
              },
            ])),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    mocks.getSupabaseAdmin.mockReturnValue(supabaseMock);

    const response = await OPS_GET(
      createGetRequest('http://localhost:3002/api/v1/admin/content/ops?siteCode=intl&locale=en&limit=6'),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      siteCode: 'intl',
      locale: 'en',
      summary: {
        total: 2,
        in_review: 1,
        published: 1,
        ready_to_publish: 1,
        briefs_total: 1,
        briefs_ready: 1,
      },
      reviewQueue: [
        expect.objectContaining({
          id: 'content-1',
          canonical_slug: 'tplo',
          publish_readiness_failures: [],
          locale_count: 1,
        }),
      ],
      scheduleCandidates: [
        expect.objectContaining({
          id: 'content-1',
          canonical_slug: 'tplo',
        }),
      ],
      briefs: [
        expect.objectContaining({
          id: 'brief-1',
          primary_angle: 'Training pathway with equipment readiness',
          status: 'ready',
        }),
      ],
      recentEvents: [
        expect.objectContaining({
          id: 'event-1',
          event_type: 'submit_review',
        }),
      ],
      recentGenerationRuns: [
        expect.objectContaining({
          id: 'run-1',
          task_key: 'content_draft_generator',
        }),
      ],
    });

    expect(mocks.assertSiteAuthorized).toHaveBeenCalledWith(mocks.admin, 'intl');
  });
});