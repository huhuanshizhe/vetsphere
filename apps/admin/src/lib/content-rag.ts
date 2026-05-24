import type { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface KnowledgeAssetImportInput {
  sourceType: string;
  title: string;
  rawText: string;
  siteCode?: string;
  locale?: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}

export interface RetrievedKnowledgeChunk {
  id: string;
  assetId: string;
  title: string;
  sourceType: string | null;
  chunkText: string;
  score: number;
  metadata: Record<string, unknown>;
}

interface ContentGenerationOptions {
  supabase: SupabaseClient;
  taskKey: string;
  runType: string;
  query: string;
  instructions?: string;
  siteCode?: string;
  locale?: string;
  contentId?: string | null;
  briefId?: string | null;
  operatorId?: string | null;
  input?: Record<string, unknown>;
  limit?: number;
}

function normalizeAiBaseUrl(rawBaseUrl?: string | null): string | undefined {
  const baseUrl = rawBaseUrl?.trim();
  if (!baseUrl) return undefined;
  if (baseUrl.includes('/v1')) return baseUrl;
  return baseUrl.endsWith('/') ? `${baseUrl}v1` : `${baseUrl}/v1`;
}

function stripCodeFence(value: string): string {
  let text = value.trim();
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  return text.trim();
}

function getQueryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9_\-\u4e00-\u9fff]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function scoreTextMatch(query: string, title: string, chunkText: string): number {
  const queryTerms = getQueryTerms(query);
  if (queryTerms.length === 0) return 0;

  const normalizedTitle = title.toLowerCase();
  const normalizedChunk = chunkText.toLowerCase();

  return queryTerms.reduce((score, term) => {
    let nextScore = score;
    if (normalizedTitle.includes(term)) nextScore += 4;
    if (normalizedChunk.includes(term)) nextScore += 2;
    return nextScore;
  }, 0);
}

function buildChunkMetadata(input: KnowledgeAssetImportInput): Record<string, unknown> {
  return {
    sourceType: input.sourceType,
    sourceId: input.sourceId || null,
    siteCode: input.siteCode || 'intl',
    locale: input.locale || 'en',
    ...(input.metadata || {}),
  };
}

export function splitTextIntoChunks(rawText: string, maxChars = 1200, overlap = 180): string[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    if ((current + '\n\n' + paragraph).length <= maxChars) {
      current = `${current}\n\n${paragraph}`;
      continue;
    }

    chunks.push(current);
    const overlapText = current.slice(Math.max(0, current.length - overlap));
    current = `${overlapText}\n\n${paragraph}`.trim();
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export async function importKnowledgeAsset(
  supabase: SupabaseClient,
  input: KnowledgeAssetImportInput,
): Promise<{ assetId: string; chunkCount: number }> {
  const siteCode = input.siteCode || 'intl';
  const locale = input.locale || 'en';
  const rawText = input.rawText.trim();
  const chunks = splitTextIntoChunks(rawText);

  if (!input.title.trim()) {
    throw new Error('Knowledge asset title is required');
  }
  if (!rawText) {
    throw new Error('Knowledge asset rawText is required');
  }

  const { data: asset, error: assetError } = await supabase
    .from('knowledge_assets')
    .insert({
      source_type: input.sourceType,
      source_id: input.sourceId || null,
      site_code: siteCode,
      locale,
      title: input.title.trim(),
      status: 'ready',
      metadata_json: buildChunkMetadata(input),
      raw_text: rawText,
      source_url: input.sourceUrl || null,
      created_by: input.createdBy || null,
    })
    .select('id')
    .single();

  if (assetError || !asset) {
    throw new Error(assetError?.message || 'Failed to create knowledge asset');
  }

  if (chunks.length > 0) {
    const chunkRows = chunks.map((chunkText, index) => ({
      asset_id: asset.id,
      chunk_index: index,
      chunk_text: chunkText,
      token_count: Math.ceil(chunkText.length / 4),
      site_code: siteCode,
      locale,
      specialty: typeof input.metadata?.specialty === 'string' ? input.metadata.specialty : null,
      procedure: typeof input.metadata?.procedure === 'string' ? input.metadata.procedure : null,
      entity_type: typeof input.metadata?.entityType === 'string' ? input.metadata.entityType : null,
      entity_id: typeof input.metadata?.entityId === 'string' ? input.metadata.entityId : null,
      metadata_json: buildChunkMetadata(input),
    }));

    const { error: chunkError } = await supabase.from('knowledge_chunks').insert(chunkRows);
    if (chunkError) {
      throw new Error(chunkError.message || 'Failed to create knowledge chunks');
    }
  }

  return { assetId: asset.id, chunkCount: chunks.length };
}

export async function retrieveKnowledgeChunks(
  supabase: SupabaseClient,
  options: {
    query: string;
    siteCode?: string;
    locale?: string;
    specialty?: string;
    procedure?: string;
    limit?: number;
  },
): Promise<RetrievedKnowledgeChunk[]> {
  const siteCode = options.siteCode || 'intl';
  const locale = options.locale || 'en';
  const limit = options.limit || 8;

  let query = supabase
    .from('knowledge_chunks')
    .select(
      `
      id,
      asset_id,
      chunk_text,
      metadata_json,
      specialty,
      procedure,
      knowledge_assets!inner(
        title,
        source_type,
        status
      )
    `,
    )
    .eq('site_code', siteCode)
    .eq('locale', locale)
    .limit(200);

  if (options.specialty) {
    query = query.eq('specialty', options.specialty);
  }
  if (options.procedure) {
    query = query.eq('procedure', options.procedure);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to retrieve knowledge chunks');
  }

  const items = (data || [])
    .map((row: any) => {
      const asset = Array.isArray(row.knowledge_assets) ? row.knowledge_assets[0] : row.knowledge_assets;
      if (!asset || asset.status !== 'ready') return null;
      const score = scoreTextMatch(options.query, asset.title || '', row.chunk_text || '');
      if (score <= 0) return null;
      return {
        id: row.id,
        assetId: row.asset_id,
        title: asset.title || 'Untitled Asset',
        sourceType: asset.source_type || null,
        chunkText: row.chunk_text || '',
        score,
        metadata: (row.metadata_json || {}) as Record<string, unknown>,
      } satisfies RetrievedKnowledgeChunk;
    })
    .filter(Boolean) as RetrievedKnowledgeChunk[];

  return items.sort((left, right) => right.score - left.score).slice(0, limit);
}

async function loadTaskTemplate(supabase: SupabaseClient, taskKey: string) {
  const { data } = await supabase
    .from('ai_task_templates')
    .select('task_key, prompt_template, model_provider, model_name, max_tokens, temperature')
    .eq('task_key', taskKey)
    .eq('is_active', true)
    .maybeSingle();

  return data;
}

function buildFallbackOutput(
  taskKey: string,
  query: string,
  instructions: string | undefined,
  chunks: RetrievedKnowledgeChunk[],
) {
  const evidence = chunks.map((chunk) => ({ title: chunk.title, excerpt: chunk.chunkText.slice(0, 240) }));

  if (taskKey === 'content_brief_planner') {
    return {
      angle: query,
      audience: 'Veterinary professionals',
      outline: ['Overview', 'Indications', 'Equipment', 'Training Pathway', 'FAQ'],
      evidence_priorities: evidence,
      internal_links: [],
      risks: instructions ? [instructions] : [],
      warning: 'AI_API_KEY not configured. Returned fallback brief.',
    };
  }

  return {
    title: query,
    summary: chunks[0]?.chunkText.slice(0, 220) || '',
    opening_answer: chunks[0]?.chunkText.slice(0, 260) || '',
    body_markdown: chunks.map((chunk) => `## ${chunk.title}\n\n${chunk.chunkText}`).join('\n\n'),
    faq_json: [],
    references_json: evidence,
    warning: 'AI_API_KEY not configured. Returned fallback content.',
  };
}

function createOpenAIClient(taskTemplate: { model_provider?: string | null } | null) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    baseURL: normalizeAiBaseUrl(process.env.AI_BASE_URL),
    timeout: 180000,
    maxRetries: 2,
  });
}

export async function runContentGenerationTask(options: ContentGenerationOptions) {
  const siteCode = options.siteCode || 'intl';
  const locale = options.locale || 'en';
  const taskTemplate = await loadTaskTemplate(options.supabase, options.taskKey);
  const retrievedChunks = await retrieveKnowledgeChunks(options.supabase, {
    query: options.query,
    siteCode,
    locale,
    limit: options.limit || 8,
  });

  const inputJson = {
    query: options.query,
    instructions: options.instructions || null,
    locale,
    siteCode,
    ...(options.input || {}),
  };

  const { data: runRow, error: runInsertError } = await options.supabase
    .from('content_generation_runs')
    .insert({
      content_id: options.contentId || null,
      brief_id: options.briefId || null,
      task_key: options.taskKey,
      run_type: options.runType,
      model_provider: taskTemplate?.model_provider || 'openai-compatible',
      model_name: taskTemplate?.model_name || process.env.AI_MODEL || 'qwen3.5-plus',
      prompt_version: 'v1',
      input_json: inputJson,
      status: 'running',
      operator_id: options.operatorId || null,
    })
    .select('id')
    .maybeSingle();

  if (runInsertError) {
    throw new Error(runInsertError.message || 'Failed to create generation run');
  }

  const runId = runRow?.id as string | undefined;

  try {
    const openai = createOpenAIClient(taskTemplate);
    let outputJson: Record<string, unknown>;

    if (!openai) {
      outputJson = buildFallbackOutput(options.taskKey, options.query, options.instructions, retrievedChunks);
    } else {
      const evidenceBlock = retrievedChunks
        .map((chunk, index) => `[#${index + 1}] ${chunk.title}\n${chunk.chunkText}`)
        .join('\n\n');

      const systemPrompt =
        taskTemplate?.prompt_template ||
        'You are a veterinary domain writing assistant. Use only the supplied evidence. Return a strict JSON object.';

      const completion = await openai.chat.completions.create({
        model: taskTemplate?.model_name || process.env.AI_MODEL || 'qwen3.5-plus',
        temperature: Number(taskTemplate?.temperature ?? 0.45),
        max_tokens: Number(taskTemplate?.max_tokens ?? 4000),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              `Task: ${options.taskKey}`,
              `Locale: ${locale}`,
              `Site: ${siteCode}`,
              `Query: ${options.query}`,
              options.instructions ? `Instructions: ${options.instructions}` : null,
              'Use only the following internal evidence:',
              evidenceBlock || 'No retrieved evidence was found.',
              'Return only JSON.',
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ],
      });

      const content = completion.choices[0]?.message?.content || '{}';
      outputJson = JSON.parse(stripCodeFence(content)) as Record<string, unknown>;
    }

    if (runId) {
      await options.supabase.from('content_generation_runs').update({
        status: 'completed',
        output_json: outputJson,
      }).eq('id', runId);

      if (retrievedChunks.length > 0) {
        const citationRows = retrievedChunks.map((chunk) => ({
          generation_run_id: runId,
          asset_id: chunk.assetId,
          chunk_id: chunk.id,
          citation_text: chunk.chunkText.slice(0, 500),
          metadata_json: {
            title: chunk.title,
            sourceType: chunk.sourceType,
            score: chunk.score,
          },
        }));

        await options.supabase.from('generation_citations').insert(citationRows);
      }
    }

    return {
      runId: runId || null,
      output: outputJson,
      citations: retrievedChunks,
    };
  } catch (error) {
    if (runId) {
      await options.supabase.from('content_generation_runs').update({
        status: 'failed',
        output_json: {
          error: error instanceof Error ? error.message : 'Unknown generation error',
        },
      }).eq('id', runId);
    }
    throw error;
  }
}