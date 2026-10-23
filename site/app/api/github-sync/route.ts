import { createSyncPullRequest, previewFileSync, previewSync } from '../../lib/github-sync';

export const runtime = 'edge';

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: '허용되지 않은 요청입니다.' }, 403);
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 1_500_000) return json({ error: '동기화 데이터가 너무 큽니다.' }, 413);
  try {
    const body = await request.json() as { action?: unknown; store?: unknown; expectedBaseSha?: unknown; path?: unknown };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (body.action === 'preview') return json(await previewSync(body.store, token));
    if (body.action === 'preview-file') return json(await previewFileSync(body.store, body.path, body.expectedBaseSha, token));
    if (body.action === 'create-pr') {
      if (!token) return json({ error: 'GitHub PR 인증이 아직 설정되지 않았습니다.', code: 'github_token_missing' }, 503);
      return json(await createSyncPullRequest(body.store, body.expectedBaseSha, token));
    }
    return json({ error: '지원하지 않는 동기화 요청입니다.' }, 400);
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error && typeof error.status === 'number' ? error.status : 500;
    const message = error instanceof Error ? error.message : '동기화 중 오류가 발생했습니다.';
    return json({ error: message }, status);
  }
}
