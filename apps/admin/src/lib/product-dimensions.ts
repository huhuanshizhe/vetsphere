function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function tryParseJson(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'));

  if (!looksLikeJson) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function normalizeDimensionsForStorage(value: unknown): unknown {
  if (value === undefined || value === null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = tryParseJson(trimmed);
    if (parsed !== null) {
      return parsed;
    }

    return { text: trimmed };
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const text = normalizeString(record.text ?? record.value ?? record.label ?? record.display);
    if (!text) {
      return record;
    }

    return {
      ...record,
      text,
    };
  }

  return null;
}

export function getDimensionsDisplayValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeString(entry))
      .filter(Boolean)
      .join(' / ');
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  const record = value as Record<string, unknown>;
  const text = normalizeString(record.text ?? record.value ?? record.label ?? record.display);
  if (text) {
    return text;
  }

  const length = normalizeString(record.length);
  const width = normalizeString(record.width);
  const height = normalizeString(record.height);
  const unit = normalizeString(record.unit);
  const parts = [length, width, height].filter(Boolean);

  if (parts.length > 0) {
    return `${parts.join(' x ')}${unit ? ` ${unit}` : ''}`;
  }

  try {
    return JSON.stringify(record);
  } catch {
    return '';
  }
}