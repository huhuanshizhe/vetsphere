import {
  getVisionModelCandidates,
  normalizeCompatibleAIBaseUrl,
  shouldContinueVisionModelFallback,
} from '@/lib/ai-vision';

describe('ai vision helpers', () => {
  it('keeps configured legacy vision model but also falls back to current multimodal defaults', () => {
    const candidates = getVisionModelCandidates({
      configuredVisionModel: 'qwen-vl-max-latest',
      fallbackModel: 'qwen3.5-plus',
    });

    expect(candidates).toContain('qwen-vl-max-latest');
    expect(candidates).toContain('qwen-vl-max');
    expect(candidates).toContain('qwen3.5-plus');
    expect(candidates.indexOf('qwen3.5-plus')).toBeGreaterThan(candidates.indexOf('qwen-vl-max'));
  });

  it('treats distributor and unavailable-channel failures as fallbackable', () => {
    expect(
      shouldContinueVisionModelFallback(
        new Error('503 分组 default 下模型 qwen-vl-max 无可用渠道 (distributor)'),
      ),
    ).toBe(true);

    expect(shouldContinueVisionModelFallback(new Error('Incorrect API key provided'))).toBe(false);
  });

  it('normalizes dashscope compatible base urls', () => {
    expect(normalizeCompatibleAIBaseUrl('https://dashscope.aliyuncs.com/compatible-mode')).toBe(
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
    );
    expect(normalizeCompatibleAIBaseUrl('https://dashscope.aliyuncs.com/compatible-mode/v1')).toBe(
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
    );
  });
});