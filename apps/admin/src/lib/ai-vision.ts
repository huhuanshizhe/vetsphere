const MODERN_VISION_MODEL_DEFAULTS = [
  'qwen3.6-plus',
  'qwen3.5-plus',
  'qwen3-vl-plus',
  'qwen3-vl-flash',
  'qwen-vl-max',
  'qwen-vl-plus',
] as const;

function normalizeModelName(value: string | undefined | null): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function stripLatestSuffix(model: string | null): string | null {
  if (!model) {
    return null;
  }

  const stripped = model.replace(/-latest$/i, '').trim();
  return stripped || null;
}

function isLikelyVisionCapableModel(model: string | null): boolean {
  if (!model) {
    return false;
  }

  const normalized = model.toLowerCase();
  return (
    normalized.startsWith('qwen3-vl-') ||
    normalized.startsWith('qwen-vl-') ||
    normalized.startsWith('qwen3.5-omni') ||
    /^qwen3(?:\.\d+)?-(?:plus|flash|max)(?:-|$)/.test(normalized) ||
    /^qwen-(?:plus|flash|max)(?:-|$)/.test(normalized)
  );
}

export function normalizeCompatibleAIBaseUrl(rawBaseUrl: string): string {
  if (!rawBaseUrl) return rawBaseUrl;
  if (rawBaseUrl.includes('/v1')) return rawBaseUrl;
  return rawBaseUrl.endsWith('/') ? `${rawBaseUrl}v1` : `${rawBaseUrl}/v1`;
}

export function getVisionModelCandidates(options?: {
  configuredVisionModel?: string | null;
  fallbackModel?: string | null;
}): string[] {
  const configuredVisionModel = normalizeModelName(options?.configuredVisionModel);
  const fallbackModel = normalizeModelName(options?.fallbackModel);
  const candidates = [
    configuredVisionModel,
    stripLatestSuffix(configuredVisionModel),
    isLikelyVisionCapableModel(fallbackModel) ? fallbackModel : null,
    isLikelyVisionCapableModel(fallbackModel) ? stripLatestSuffix(fallbackModel) : null,
    ...MODERN_VISION_MODEL_DEFAULTS,
  ];

  return candidates.filter((model, index, allModels): model is string => {
    return Boolean(model) && allModels.indexOf(model) === index;
  });
}

export function shouldContinueVisionModelFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();

  return [
    'model is not supported',
    'unsupported model',
    'model_not_found',
    'model not found',
    'does not exist',
    'invalid model',
    'no available channel',
    '无可用渠道',
    'distributor',
    'service unavailable',
    'currently overloaded',
  ].some((fragment) => message.includes(fragment));
}