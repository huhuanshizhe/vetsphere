import {
  formatCoursePublishIssues,
  validateCoursePublishReadiness,
} from '@/lib/course-publish-validation';

describe('validateCoursePublishReadiness', () => {
  it('accepts a complete camelCase course payload', () => {
    const result = validateCoursePublishReadiness({
      title: 'Small Animal Imaging Bootcamp',
      description: 'Focused training for veterinary imaging workflows.',
      specialty: 'Imaging',
      level: 'Advanced',
      format: 'offline',
      publishLanguage: 'en',
      teachingLanguages: ['English'],
      coverImageUrl: 'https://cdn.example.com/course.jpg',
      instructor: { name: 'Dr. Lin' },
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      location: { city: 'Singapore', venue: 'VetSphere Academy' },
      price: 1200,
    });

    expect(result.canPublish).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('accepts snake_case fields and localized price columns', () => {
    const result = validateCoursePublishReadiness({
      title: 'Equine Surgery Intensive',
      description: 'Hands-on cadaver surgery training.',
      specialty: 'Surgery',
      level: 'Master',
      format: 'offline',
      publish_language: 'zh',
      teaching_languages: ['中文'],
      image_url: 'https://cdn.example.com/equine.jpg',
      instructor_names: ['Dr. Zhao'],
      start_date: '2026-08-08',
      end_date: '2026-08-10',
      location: { city: 'Shanghai', venue: 'Wet Lab Center' },
      price_cny: 6800,
    });

    expect(result.canPublish).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('reports blocking publish issues and formats them', () => {
    const result = validateCoursePublishReadiness({
      title: '  ',
      description: '',
      specialty: null,
      level: '',
      format: 'offline',
      publishLanguage: 'en',
      teachingLanguages: [],
      instructor: {},
      startDate: '2026-09-10',
      endDate: '2026-09-08',
      location: { city: '', venue: '' },
      price: null,
    });

    expect(result.canPublish).toBe(false);
    expect(result.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        'title',
        'description',
        'specialty',
        'level',
        'teachingLanguages',
        'coverImageUrl',
        'instructor.name',
        'endDate',
        'location.city',
        'location.venue',
        'price',
      ]),
    );
    expect(formatCoursePublishIssues(result.issues)).toContain('缺少课程标题');
    expect(formatCoursePublishIssues(result.issues)).toContain('缺少课程售价');
  });
});