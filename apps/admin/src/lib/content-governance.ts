export interface PublishReadinessLocalization {
  title?: string | null;
  summary?: string | null;
  body_markdown?: string | null;
  opening_answer?: string | null;
  references_json?: unknown;
}

export function getPublishReadinessFailures(localization: PublishReadinessLocalization): string[] {
  const failures: string[] = [];

  if (!localization.title?.trim()) {
    failures.push('Missing title');
  }
  if (!localization.summary?.trim()) {
    failures.push('Missing summary');
  }
  if (!localization.opening_answer?.trim()) {
    failures.push('Missing opening answer');
  }
  if ((localization.body_markdown || '').trim().length < 600) {
    failures.push('Body markdown must contain at least 600 characters');
  }
  if (!Array.isArray(localization.references_json) || localization.references_json.length === 0) {
    failures.push('At least one reference is required');
  }

  return failures;
}