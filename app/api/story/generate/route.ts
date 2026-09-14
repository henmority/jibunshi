import { env } from 'cloudflare:workers';
import { generateText } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';

import { buildStoryInstructions, buildStoryPrompt, STORY_MODEL, STORY_PROMPT_VERSION } from '@/lib/ai/story-prompt';
import { normalizeLifeStoryBundle } from '@/lib/life-story';
import { normalizeWritingSettings, STORY_MAX_OUTPUT_TOKENS } from '@/lib/ai/writing-settings';
import { hasEpisodeContent, reviewStoryOutput, reviewStorySource } from '@/lib/ai/source-review';

type AiBindings = {
  AI?: Ai;
};

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 1_500_000) {
    return Response.json({ error: 'JSONデータが大きすぎます。写真を除いた入力データを使用してください。' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSONデータを読み取れませんでした。' }, { status: 400 });
  }

  if (JSON.stringify(body).length > 1_500_000) return Response.json({ error: 'JSONデータが大きすぎます。' }, { status: 413 });
  const payload = body && typeof body === 'object' ? body as { bundle?: unknown; instruction?: unknown; writingSettings?: unknown } : {};
  const writingSettings = normalizeWritingSettings(payload.writingSettings);
  const bundle = normalizeLifeStoryBundle(payload.bundle);
  if (!bundle?.timeline) {
    return Response.json({ error: '人生年表を含む自分史JSONが必要です。' }, { status: 400 });
  }
  const hasSource = Object.values(bundle.timeline.eventsByAge).some((value) => value.trim()) || bundle.timeline.episodes.some(hasEpisodeContent);
  if (!hasSource) {
    return Response.json({ error: 'AI原稿を作る前に、年表の出来事か深掘りエピソードを入力してください。' }, { status: 400 });
  }

  const binding = (env as unknown as AiBindings).AI;
  if (!binding) {
    return Response.json({ error: 'AI生成の設定がまだ有効になっていません。管理者へお知らせください。' }, { status: 503 });
  }

  try {
    const workersai = createWorkersAI({ binding });
    const result = await generateText({
      model: workersai(STORY_MODEL),
      instructions: buildStoryInstructions(typeof payload.instruction === 'string' ? payload.instruction : '', writingSettings),
      prompt: buildStoryPrompt(bundle),
      maxOutputTokens: STORY_MAX_OUTPUT_TOKENS,
      temperature: writingSettings.temperature,
    });

    if (!result.text.trim()) throw new Error('Empty generation');
    return Response.json({
      text: result.text,
      model: STORY_MODEL,
      promptVersion: STORY_PROMPT_VERSION,
      usage: result.usage,
      writingSettings,
      editorialWarnings: [...reviewStorySource(bundle).warnings, ...reviewStoryOutput(result.text, result.finishReason)],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Story generation failed', error);
    return Response.json({ error: 'AI原稿の作成に失敗しました。少し時間を置いて、もう一度お試しください。' }, { status: 502 });
  }
}
