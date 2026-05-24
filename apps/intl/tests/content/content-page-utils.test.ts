import { describe, expect, it } from 'vitest';

import {
  extractHeadingAnchors,
  normalizeReferenceItems,
  pickRelatedContent,
  slugifyAnchor,
} from '../../src/lib/content-page-utils';

describe('slugifyAnchor', () => {
  it('normalizes heading text into URL-safe anchors', () => {
    expect(slugifyAnchor('TPLO vs. TTA Decision Matrix')).toBe('tplo-vs-tta-decision-matrix');
  });
});

describe('extractHeadingAnchors', () => {
  it('extracts stable heading anchors from markdown and deduplicates repeated titles', () => {
    const markdown = [
      '# Orthopedic Capability Map',
      '',
      '## Equipment Readiness',
      'text',
      '### Case Selection',
      '## Equipment Readiness',
    ].join('\n');

    expect(extractHeadingAnchors(markdown)).toEqual([
      { id: 'orthopedic-capability-map', title: 'Orthopedic Capability Map', depth: 1 },
      { id: 'equipment-readiness', title: 'Equipment Readiness', depth: 2 },
      { id: 'case-selection', title: 'Case Selection', depth: 3 },
      { id: 'equipment-readiness-2', title: 'Equipment Readiness', depth: 2 },
    ]);
  });
});

describe('normalizeReferenceItems', () => {
  it('normalizes mixed reference payloads into displayable cards', () => {
    expect(
      normalizeReferenceItems([
        'Internal planning note',
        {
          title: 'Small Animal Endoscopy Training Positioning Note',
          context: 'Defines the clinical + equipment framing for this page family.',
          sourceType: 'manual_note',
          url: 'https://example.com/reference',
        },
      ]),
    ).toEqual([
      {
        title: 'Reference 1',
        context: 'Internal planning note',
        badge: 'Internal note',
        href: null,
      },
      {
        title: 'Small Animal Endoscopy Training Positioning Note',
        context: 'Defines the clinical + equipment framing for this page family.',
        badge: 'manual note',
        href: 'https://example.com/reference',
      },
    ]);
  });
});

describe('pickRelatedContent', () => {
  it('prioritizes sibling content that matches the same specialty and procedure', () => {
    const current = {
      id: 'current',
      primary_specialty: 'Orthopedics',
      primary_procedure: 'TPLO',
      search_intent: 'commercial investigation',
      display_order: 5,
      is_featured: false,
      published_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    } as any;

    const items = [
      current,
      {
        id: 'best-match',
        primary_specialty: 'Orthopedics',
        primary_procedure: 'TPLO',
        search_intent: 'commercial investigation',
        display_order: 2,
        is_featured: false,
        published_at: '2026-05-20T00:00:00.000Z',
        updated_at: '2026-05-20T00:00:00.000Z',
      },
      {
        id: 'featured-specialty',
        primary_specialty: 'Orthopedics',
        primary_procedure: 'TTA',
        search_intent: 'commercial investigation',
        display_order: 3,
        is_featured: true,
        published_at: '2026-05-18T00:00:00.000Z',
        updated_at: '2026-05-18T00:00:00.000Z',
      },
      {
        id: 'generic',
        primary_specialty: 'Neurosurgery',
        primary_procedure: 'Hemilaminectomy',
        search_intent: 'education',
        display_order: 1,
        is_featured: false,
        published_at: '2026-05-19T00:00:00.000Z',
        updated_at: '2026-05-19T00:00:00.000Z',
      },
    ] as any[];

    expect(pickRelatedContent(items as any, current as any, 2).map((item) => item.id)).toEqual([
      'best-match',
      'featured-specialty',
    ]);
  });
});