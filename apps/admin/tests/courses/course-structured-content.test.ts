import {
  buildCourseInstructorNames,
  normalizeCourseInstructorRelations,
  summarizeCourseChapters,
} from '@/lib/course-structured-content';

describe('course structured content helpers', () => {
  it('summarizes chapter counts, previewable items and total minutes', () => {
    const summary = summarizeCourseChapters([
      {
        id: 'c-2',
        title: 'Hands-on Wet Lab',
        duration_minutes: 90,
        status: 'draft',
        sort_order: 2,
        is_preview: false,
      },
      {
        id: 'c-1',
        title: 'Introduction',
        duration_minutes: 30,
        status: 'published',
        sort_order: 1,
        is_preview: true,
      },
    ]);

    expect(summary.total).toBe(2);
    expect(summary.published).toBe(1);
    expect(summary.draft).toBe(1);
    expect(summary.previewable).toBe(1);
    expect(summary.totalMinutes).toBe(120);
    expect(summary.latestChapters.map((chapter) => chapter.id)).toEqual(['c-1', 'c-2']);
  });

  it('normalizes and sorts instructor relations by display order', () => {
    const relations = normalizeCourseInstructorRelations([
      {
        id: 'rel-2',
        role: 'guest',
        display_order: 2,
        instructor: { id: 'i-2', name: 'Dr. Guest', title: 'Speaker' },
      },
      {
        id: 'rel-1',
        role: 'instructor',
        display_order: 0,
        instructor: { id: 'i-1', name: 'Dr. Lead', title: 'Chief Instructor' },
      },
    ]);

    expect(relations.map((relation) => relation.instructor.name)).toEqual(['Dr. Lead', 'Dr. Guest']);
    expect(relations[0].role).toBe('instructor');
  });

  it('builds deduplicated instructor name list from relations', () => {
    const names = buildCourseInstructorNames(
      normalizeCourseInstructorRelations([
        {
          role: 'assistant',
          display_order: 1,
          instructor: { id: 'i-1', name: 'Dr. Lead', title: 'Chief Instructor' },
        },
        {
          role: 'guest',
          display_order: 2,
          instructor: { id: 'i-1', name: 'Dr. Lead', title: 'Chief Instructor' },
        },
      ]),
    );

    expect(names).toEqual(['Dr. Lead']);
  });
});