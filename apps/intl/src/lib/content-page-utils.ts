import type { IntlPublishedContent } from '@vetsphere/shared/services/content-platform';

export interface HeadingAnchor {
  id: string;
  title: string;
  depth: number;
}

export interface ReferenceItem {
  title: string;
  context: string | null;
  badge: string;
  href: string | null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function slugifyAnchor(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'section';
}

export function extractHeadingAnchors(markdown: string | null): HeadingAnchor[] {
  if (!markdown) {
    return [];
  }

  const seenIds = new Map<string, number>();

  return markdown
    .split('\n')
    .map((line) => line.trim())
    .map((line) => {
      const match = /^(#{1,3})\s+(.+)$/.exec(line);
      if (!match) {
        return null;
      }

      const title = match[2]?.trim();
      if (!title) {
        return null;
      }

      const baseId = slugifyAnchor(title);
      const occurrence = seenIds.get(baseId) || 0;
      seenIds.set(baseId, occurrence + 1);

      return {
        id: occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`,
        title,
        depth: match[1].length,
      } satisfies HeadingAnchor;
    })
    .filter(Boolean) as HeadingAnchor[];
}

export function normalizeReferenceItems(references: unknown[]): ReferenceItem[] {
  return references
    .map((reference, index) => {
      if (!reference) {
        return null;
      }

      if (typeof reference === 'string') {
        return {
          title: `Reference ${index + 1}`,
          context: reference,
          badge: 'Internal note',
          href: null,
        } satisfies ReferenceItem;
      }

      if (typeof reference !== 'object') {
        return {
          title: `Reference ${index + 1}`,
          context: String(reference),
          badge: 'Evidence',
          href: null,
        } satisfies ReferenceItem;
      }

      const record = reference as Record<string, unknown>;
      const badge =
        pickString(record, ['sourceType', 'source_type', 'type', 'source_id', 'label']) ||
        'Evidence';

      return {
        title: pickString(record, ['title', 'name', 'label']) || `Reference ${index + 1}`,
        context: pickString(record, ['context', 'description', 'summary', 'citation_text']),
        badge: badge.replace(/[_-]+/g, ' '),
        href: pickString(record, ['href', 'url', 'source_url', 'link']),
      } satisfies ReferenceItem;
    })
    .filter(Boolean) as ReferenceItem[];
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function pickRelatedContent(
  items: IntlPublishedContent[],
  current: IntlPublishedContent,
  maxItems = 3,
): IntlPublishedContent[] {
  return items
    .filter((item) => item.id !== current.id)
    .map((item) => {
      let score = 0;

      if (item.primary_specialty && item.primary_specialty === current.primary_specialty) {
        score += 5;
      }
      if (item.primary_procedure && item.primary_procedure === current.primary_procedure) {
        score += 4;
      }
      if (item.search_intent && item.search_intent === current.search_intent) {
        score += 2;
      }
      if (item.is_featured) {
        score += 1;
      }

      return { item, score };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.item.display_order !== right.item.display_order) {
        return left.item.display_order - right.item.display_order;
      }
      return toTimestamp(right.item.published_at || right.item.updated_at) - toTimestamp(left.item.published_at || left.item.updated_at);
    })
    .slice(0, maxItems)
    .map((entry) => entry.item);
}