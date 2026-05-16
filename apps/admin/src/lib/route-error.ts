function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function formatRouteErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const record = error as Record<string, unknown>;
  const message = normalizeString(record.message) || fallback;
  const details = normalizeString(record.details);
  const hint = normalizeString(record.hint);
  const code = normalizeString(record.code);

  const extra = [details, hint ? `Hint: ${hint}` : '', code ? `(${code})` : ''].filter(Boolean);

  return extra.length > 0 ? `${message}: ${extra.join(' ')}` : message;
}