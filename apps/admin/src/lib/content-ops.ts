import type { AdminContentListItem, AdminContentSiteView } from '@/lib/content-admin';

export type ContentBriefStatus = 'draft' | 'ready' | 'archived';

export interface ContentOpsReviewItem extends AdminContentListItem {
  publish_priority: number;
  reviewer_id: string | null;
  published_at: string | null;
  locale_count: number;
  available_locales: string[];
  publish_readiness_failures: string[];
  days_since_update: number;
  site_view: AdminContentSiteView | null;
}

export interface ContentOpsBriefItem {
  id: string;
  content_id: string | null;
  site_code: string;
  locale: string;
  title: string;
  target_audience: string | null;
  search_intent: string | null;
  primary_angle: string | null;
  status: ContentBriefStatus;
  owner_id: string | null;
  updated_at: string;
  created_at: string;
}

export interface ContentOpsEventItem {
  id: string;
  content_id: string;
  event_type: string;
  old_state: string | null;
  new_state: string | null;
  notes: string | null;
  payload_json: Record<string, unknown>;
  created_at: string;
}

export interface ContentOpsGenerationRunItem {
  id: string;
  content_id: string | null;
  task_key: string;
  status: string;
  model_name: string | null;
  created_at: string;
  input_json: Record<string, unknown>;
}

export interface ContentOpsSummary {
  total: number;
  draft: number;
  in_review: number;
  approved: number;
  scheduled: number;
  published: number;
  archived: number;
  stale: number;
  ready_to_publish: number;
  briefs_total: number;
  briefs_ready: number;
}

export interface ContentOpsResponse {
  siteCode: string;
  locale: string;
  staleThresholdDays: number;
  summary: ContentOpsSummary;
  reviewQueue: ContentOpsReviewItem[];
  freshness: ContentOpsReviewItem[];
  scheduleCandidates: ContentOpsReviewItem[];
  scheduled: ContentOpsReviewItem[];
  briefs: ContentOpsBriefItem[];
  recentEvents: ContentOpsEventItem[];
  recentGenerationRuns: ContentOpsGenerationRunItem[];
}