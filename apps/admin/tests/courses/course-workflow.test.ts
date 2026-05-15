import { summarizeCourseWorkflow } from '@/lib/course-workflow';

describe('summarizeCourseWorkflow', () => {
  it('marks all steps complete for a publish-ready course with service info', () => {
    const summary = summarizeCourseWorkflow({
      title: 'Advanced Vet Dentistry Masterclass',
      description: 'Hands-on dental surgery intensive for senior veterinarians.',
      specialty: 'Dentistry',
      level: 'Advanced',
      format: 'offline',
      publishLanguage: 'en',
      maxCapacity: 24,
      price_usd: 1600,
      teachingLanguages: ['English'],
      imageUrl: 'https://cdn.example.com/course.jpg',
      instructor: {
        name: 'Dr. Chen',
        title: 'Diplomate AVDC',
      },
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      location: {
        country: 'Singapore',
        city: 'Singapore',
        venue: 'VetSphere Lab',
      },
      services: {
        accommodation: 'partial',
      },
    });

    expect(summary.every((step) => step.isComplete)).toBe(true);
  });

  it('blocks advance on required steps when key fields are missing', () => {
    const summary = summarizeCourseWorkflow({
      title: '',
      specialty: '',
      level: '',
      publishLanguage: 'zh',
    });

    const basicStep = summary.find((step) => step.id === 'basic');
    expect(basicStep?.isComplete).toBe(false);
    expect(basicStep?.canAdvance).toBe(false);
    expect(basicStep?.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(['title', 'specialty', 'level', 'maxCapacity', 'price']),
    );
  });

  it('keeps services step non-blocking when service arrangements are still empty', () => {
    const summary = summarizeCourseWorkflow({
      title: 'Soft Tissue Surgery Camp',
      description: 'Core surgery workshop.',
      specialty: 'Surgery',
      level: 'Intermediate',
      format: 'offline',
      publishLanguage: 'en',
      maxCapacity: 18,
      price_usd: 900,
      teachingLanguages: ['English'],
      imageUrl: 'https://cdn.example.com/surgery.jpg',
      instructor: {
        name: 'Dr. Wong',
        title: 'Professor',
      },
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      location: {
        country: 'Thailand',
        city: 'Bangkok',
        venue: 'Clinical Center',
      },
    });

    const servicesStep = summary.find((step) => step.id === 'services');
    expect(servicesStep?.isComplete).toBe(false);
    expect(servicesStep?.canAdvance).toBe(true);
    expect(servicesStep?.issues[0]?.message).toContain('建议补充');
  });
});